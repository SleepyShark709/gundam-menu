/**
 * Utility functions: random delay, retry logic, price/date parsing,
 * robots.txt compliance, file I/O.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

/**
 * Executes an async operation with retry logic and exponential backoff.
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

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ---------------------------------------------------------------------------
// Price parsing
// ---------------------------------------------------------------------------

/**
 * Parses a raw price string into an integer JPY amount (tax-inclusive).
 * Examples: "4,620 円(税10%込)" -> 4620, "7,150円" -> 7150
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
 * Japan consumption tax is 10%.
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
 * Returns "" if no date can be extracted.
 */
export function parseReleaseDate(dateText: string): string {
  if (!dateText) return '';

  for (const pattern of RELEASE_DATE_PATTERNS) {
    const match = dateText.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  return '';
}

// ---------------------------------------------------------------------------
// Limited edition detection
// ---------------------------------------------------------------------------

/**
 * Returns true if any of the provided text strings contains a limited-edition keyword.
 */
export function detectLimited(texts: string[]): boolean {
  const combined = texts.join(' ');
  return LIMITED_KEYWORDS.some((kw) => combined.includes(kw));
}

// ---------------------------------------------------------------------------
// Robots.txt compliance
// ---------------------------------------------------------------------------

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
          crawlDelay = delay * 1000;
        }
      }
    }
  }

  const isDisallowed = disallowedPaths.some((p) => targetPath.startsWith(p));
  const isExplicitlyAllowed = allowedPaths.some((p) => targetPath.startsWith(p));
  const allowed = !isDisallowed || isExplicitlyAllowed;

  return { allowed, crawlDelay };
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a zero-padded sequential ID. e.g. series="mg", number=42 -> "mg-042"
 */
export function generateId(series: string, number: number): string {
  return `${series}-${String(number).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  [file] Written: ${filePath}`);
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a potentially relative URL to an absolute URL.
 */
export function resolveUrl(rawUrl: string, pageUrl: string): string {
  if (!rawUrl) return '';

  try {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    if (rawUrl.startsWith('//')) {
      return `https:${rawUrl}`;
    }
    const base = new URL(pageUrl);
    return new URL(rawUrl, base).toString();
  } catch {
    return rawUrl;
  }
}
