/**
 * Utility functions: random delay, retry logic, price/date parsing, robots.txt
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Page } from 'playwright';
import {
  PRICE_PATTERN,
  RELEASE_DATE_PATTERNS,
  LIMITED_KEYWORDS,
  USER_AGENTS,
} from './config.js';
import type { RobotsPolicy, ScrapeError } from './types.js';

// ---------------------------------------------------------------------------
// Delay helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Promise that resolves after a random delay between minMs and maxMs.
 * Used to avoid hammering the target server and triggering anti-bot measures.
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log(`  [delay] Waiting ${delay}ms before next request...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

/**
 * Executes an async operation with retry logic.
 * Applies an exponential backoff between attempts.
 *
 * @param operation - The async function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param operationName - Human-readable name for logging
 * @param errors - Optional array to accumulate ScrapeError entries
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'operation',
  errors?: ScrapeError[],
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const scrapeError: ScrapeError = {
        url: operationName,
        message: lastError.message,
        attempt,
        timestamp: new Date().toISOString(),
      };

      if (errors) {
        errors.push(scrapeError);
      }

      if (attempt <= maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        console.warn(
          `  [retry] ${operationName} failed (attempt ${attempt}/${maxRetries + 1}): ${lastError.message}. ` +
            `Retrying in ${backoffMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        console.error(
          `  [error] ${operationName} failed after ${maxRetries + 1} attempts: ${lastError.message}`,
        );
      }
    }
  }

  throw lastError ?? new Error(`${operationName} failed after ${maxRetries + 1} attempts`);
}

// ---------------------------------------------------------------------------
// User-Agent rotation
// ---------------------------------------------------------------------------

/**
 * Returns a random User-Agent string from the configured pool.
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ---------------------------------------------------------------------------
// Price parsing
// ---------------------------------------------------------------------------

/**
 * Parses a raw price string into an integer JPY amount (tax-inclusive).
 * Examples:
 *   "4,620円（税込）" → 4620
 *   "¥4,620"         → 4620
 *   "4620"           → 4620
 *
 * Returns 0 if parsing fails.
 */
export function parsePrice(priceText: string): number {
  if (!priceText) return 0;

  const normalized = priceText.replace(/[^\d,]/g, '');
  const match = normalized.match(PRICE_PATTERN);
  if (!match) return 0;

  const numericStr = match[0].replace(/,/g, '');
  const value = parseInt(numericStr, 10);
  return isNaN(value) ? 0 : value;
}

/**
 * Calculates the tax-free price from a tax-inclusive JPY price.
 * Japan consumption tax rate is 10% (as of 2019).
 * Result is rounded to the nearest integer.
 */
export function calcTaxFreePrice(priceWithTax: number): number {
  if (priceWithTax <= 0) return 0;
  return Math.round(priceWithTax / 1.1);
}

// ---------------------------------------------------------------------------
// Release date parsing
// ---------------------------------------------------------------------------

/**
 * Parses a raw release date string into "YYYY-MM" format.
 * Handles Japanese date strings like "2024年3月", slash/dash-separated dates.
 *
 * Returns "0000-00" if no date can be extracted (sorts to the top/bottom
 * as appropriate; callers should filter these out).
 */
export function parseReleaseDate(dateText: string): string {
  if (!dateText) return '0000-00';

  for (const pattern of RELEASE_DATE_PATTERNS) {
    const match = dateText.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  return '0000-00';
}

// ---------------------------------------------------------------------------
// Limited edition detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the product name, tags, or badge text suggests a limited
 * or P-Bandai exclusive item.
 */
export function detectLimited(texts: string[]): boolean {
  const combined = texts.join(' ');
  return LIMITED_KEYWORDS.some((kw) => combined.includes(kw));
}

// ---------------------------------------------------------------------------
// Robots.txt compliance
// ---------------------------------------------------------------------------

/**
 * Fetches and parses robots.txt to determine whether scraping is permitted
 * for the given user-agent and path prefix.
 *
 * This is a best-effort parser that handles common directives:
 *   User-agent, Disallow, Allow, Crawl-delay
 */
export async function checkRobotsTxt(
  robotsUrl: string,
  targetPath: string,
  userAgent: string = '*',
): Promise<RobotsPolicy> {
  try {
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Cannot fetch robots.txt → assume allowed (per convention)
      console.warn(`  [robots] Could not fetch ${robotsUrl}: HTTP ${response.status}. Assuming allowed.`);
      return { allowed: true };
    }

    const text = await response.text();
    return parseRobotsForPath(text, targetPath);
  } catch (err) {
    console.warn(`  [robots] Failed to fetch robots.txt: ${String(err)}. Assuming allowed.`);
    return { allowed: true };
  }
}

/**
 * Parses robots.txt content and determines if the given path is allowed.
 * Considers rules for "*" (all agents) only (simplified implementation).
 */
export function parseRobotsForPath(
  robotsContent: string,
  targetPath: string,
): RobotsPolicy {
  const lines = robotsContent.split('\n').map((l) => l.trim());

  let inRelevantBlock = false;
  let crawlDelay: number | undefined;
  const disallowedPaths: string[] = [];
  const allowedPaths: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line === '') {
      if (line === '' && inRelevantBlock) {
        // End of block — stop processing this agent's section
        // (but continue to look for Crawl-delay in subsequent global sections)
        inRelevantBlock = false;
      }
      continue;
    }

    const [key, ...rest] = line.split(':');
    const directive = key.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (directive === 'user-agent') {
      inRelevantBlock = value === '*';
    } else if (inRelevantBlock) {
      if (directive === 'disallow' && value) {
        disallowedPaths.push(value);
      } else if (directive === 'allow' && value) {
        allowedPaths.push(value);
      } else if (directive === 'crawl-delay') {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          crawlDelay = delay * 1000; // Convert seconds → ms
        }
      }
    }
  }

  // Determine allowed status: specific Allow rules take precedence over Disallow
  const isDisallowed = disallowedPaths.some((p) => targetPath.startsWith(p));
  const isExplicitlyAllowed = allowedPaths.some((p) => targetPath.startsWith(p));

  const allowed = !isDisallowed || isExplicitlyAllowed;

  return { allowed, crawlDelay };
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a zero-padded sequential ID for a series.
 * e.g. series="mg", number=42 → "mg-042"
 */
export function generateId(series: string, number: number): string {
  return `${series}-${String(number).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Infinite scroll helper
// ---------------------------------------------------------------------------

/**
 * Scrolls a page to the bottom repeatedly until no new content loads,
 * or until the maximum scroll attempts is reached.
 *
 * Returns the number of scroll iterations performed.
 */
export async function scrollToLoadAll(
  page: Page,
  maxScrolls: number = 50,
  waitBetweenScrollsMs: number = 1500,
): Promise<number> {
  let scrollCount = 0;
  let previousHeight = 0;

  while (scrollCount < maxScrolls) {
    const currentHeight: number = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight && scrollCount > 0) {
      console.log(`  [scroll] Page height stabilized at ${currentHeight}px after ${scrollCount} scrolls.`);
      break;
    }

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(waitBetweenScrollsMs);
    scrollCount++;

    console.log(`  [scroll] Scroll ${scrollCount}: height=${currentHeight}px`);
  }

  return scrollCount;
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

/**
 * Writes JSON data to a file, creating parent directories as needed.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  [file] Written: ${filePath}`);
}

/**
 * Reads a JSON file and parses it. Returns null if the file does not exist.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
