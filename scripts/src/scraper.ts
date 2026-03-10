/**
 * scraper.ts — Main entry point
 *
 * Usage:
 *   pnpm scrape                   # Scrape all series (hg, rg, mg, pg)
 *   pnpm scrape --series=mg       # Scrape a single series
 *   pnpm scrape --series=hg,rg    # Scrape multiple series
 *
 * Outputs:
 *   public/data/hg.json
 *   public/data/rg.json
 *   public/data/mg.json
 *   public/data/pg.json
 *   public/data/series-meta.json  (updated totalCount & coverImage)
 */

import { chromium, type Browser, type Page } from 'playwright';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  DEFAULT_SCRAPER_CONFIG,
  SERIES_URLS,
  SERIES_META,
} from './config.js';
import type {
  SeriesCode,
  GundamModel,
  SeriesMeta,
  ScrapeResult,
  RawProductData,
  ScraperConfig,
} from './types.js';
import {
  randomDelay,
  withRetry,
  getRandomUserAgent,
  parsePrice,
  calcTaxFreePrice,
  parseReleaseDate,
  detectLimited,
  checkRobotsTxt,
  generateId,
  writeJsonFile,
  readJsonFile,
} from './utils.js';
import { collectAllProducts, resolveImageUrl } from './parsers/list-parser.js';

// ---------------------------------------------------------------------------
// Resolve output directory relative to this file (scripts/src → project root)
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // gundam-search/
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseCLIArgs(): { series: SeriesCode[] } {
  const args = process.argv.slice(2);
  const seriesArg = args.find((a) => a.startsWith('--series='));

  if (seriesArg) {
    const rawSeries = seriesArg.replace('--series=', '').split(',').map((s) => s.trim());
    const valid: SeriesCode[] = ['hg', 'rg', 'mg', 'pg'];
    const series = rawSeries.filter((s): s is SeriesCode => valid.includes(s as SeriesCode));

    if (series.length === 0) {
      console.error(`Invalid --series value: "${seriesArg}". Use one or more of: hg, rg, mg, pg`);
      process.exit(1);
    }

    return { series };
  }

  return { series: DEFAULT_SCRAPER_CONFIG.series };
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { series: seriesToScrape } = parseCLIArgs();

  console.log('=== Bandai Gunpla Scraper ===');
  console.log(`Target series: ${seriesToScrape.join(', ')}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');

  // Check robots.txt before starting
  console.log('[robots.txt] Checking scraping policy...');
  const robotsPolicy = await checkRobotsTxt(
    'https://bandai-hobby.net/robots.txt',
    '/brand/',
  );
  if (!robotsPolicy.allowed) {
    console.error('[robots.txt] Scraping /brand/ is disallowed by robots.txt. Aborting.');
    process.exit(1);
  }
  console.log('[robots.txt] Scraping is permitted.');
  if (robotsPolicy.crawlDelay) {
    console.log(`[robots.txt] Crawl-delay: ${robotsPolicy.crawlDelay}ms`);
  }
  console.log('');

  // Override delay with robots.txt crawl-delay if it's longer than our default
  const config: ScraperConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    series: seriesToScrape,
    minDelayMs: Math.max(DEFAULT_SCRAPER_CONFIG.minDelayMs, robotsPolicy.crawlDelay ?? 0),
    outputDir: OUTPUT_DIR,
  };

  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const allResults: ScrapeResult[] = [];

  try {
    for (const series of seriesToScrape) {
      console.log(`\n[${series.toUpperCase()}] Starting scrape...`);

      const result = await scrapeSeries(browser, series, config);
      allResults.push(result);

      // Persist series JSON immediately
      const outputPath = path.join(OUTPUT_DIR, `${series}.json`);
      await writeJsonFile(outputPath, result.models);
      console.log(`[${series.toUpperCase()}] Saved ${result.models.length} models to ${outputPath}`);

      if (result.errors.length > 0) {
        console.warn(`[${series.toUpperCase()}] ${result.errors.length} errors encountered.`);
      }

      // Delay between series scrapes
      if (seriesToScrape.indexOf(series) < seriesToScrape.length - 1) {
        await randomDelay(config.minDelayMs, config.maxDelayMs);
      }
    }

    // Update series-meta.json
    await updateSeriesMeta(allResults);
    console.log('\n[meta] series-meta.json updated.');

  } finally {
    await browser.close();
    console.log('\n=== Scraping complete ===');
    printSummary(allResults);
  }
}

// ---------------------------------------------------------------------------
// Series scraper
// ---------------------------------------------------------------------------

/**
 * Scrapes all products for a single gunpla series.
 */
async function scrapeSeries(
  browser: Browser,
  series: SeriesCode,
  config: ScraperConfig,
): Promise<ScrapeResult> {
  const errors: ScrapeResult['errors'] = [];
  const url = SERIES_URLS[series];

  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1440, height: 900 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
    },
  });

  // Block unnecessary resource types to speed up scraping
  await context.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['font', 'media', 'websocket'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  let rawProducts: RawProductData[] = [];

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(config.timeout);
    page.setDefaultNavigationTimeout(config.timeout);

    rawProducts = await withRetry(
      () => navigateAndCollect(page, url, config),
      config.maxRetries,
      `scrape:${series}:${url}`,
      errors,
    );

    await page.close();
  } finally {
    await context.close();
  }

  // Normalize raw products into GundamModel objects
  const models = normalizeProducts(rawProducts, series, url);

  return {
    series,
    models,
    scrapedAt: new Date().toISOString(),
    totalCount: models.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Navigation + collection
// ---------------------------------------------------------------------------

/**
 * Navigates to the series listing page and collects all product cards.
 */
async function navigateAndCollect(
  page: Page,
  url: string,
  config: ScraperConfig,
): Promise<RawProductData[]> {
  console.log(`  [nav] Navigating to ${url}...`);

  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: config.timeout,
  });

  // Wait a moment for any JS-rendered content to appear
  await page.waitForTimeout(2000);

  console.log('  [nav] Page loaded. Collecting products...');
  const products = await collectAllProducts(page);
  console.log(`  [nav] Collected ${products.length} raw product entries.`);

  // Resolve relative image URLs against the page URL
  return products.map((p) => ({
    ...p,
    imageUrl: resolveImageUrl(p.imageUrl, url),
    productUrl: p.productUrl.startsWith('http') ? p.productUrl : resolveImageUrl(p.productUrl, url),
  }));
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Converts raw product data into normalized GundamModel objects.
 * - Parses prices and dates
 * - Filters out invalid entries
 * - Sorts by release date
 * - Assigns sequential IDs
 */
function normalizeProducts(
  rawProducts: RawProductData[],
  series: SeriesCode,
  baseUrl: string,
): GundamModel[] {
  const valid: Array<GundamModel & { _releaseDate: string }> = [];

  for (const raw of rawProducts) {
    // Skip entries without a name or product URL
    if (!raw.name.trim()) continue;

    const price = parsePrice(raw.priceText);
    const priceTaxFree = calcTaxFreePrice(price);
    const releaseDate = parseReleaseDate(raw.releaseDateText);

    // Ensure product URL is absolute
    let productUrl = raw.productUrl;
    if (productUrl && !productUrl.startsWith('http')) {
      try {
        productUrl = new URL(productUrl, baseUrl).toString();
      } catch {
        productUrl = baseUrl;
      }
    }

    valid.push({
      // Temporary placeholder ID — will be overwritten after sorting
      id: '',
      series,
      number: 0,
      name: raw.name.trim(),
      nameEn: raw.nameEn?.trim() || undefined,
      price,
      priceTaxFree,
      releaseDate,
      isLimited: raw.isLimited || detectLimited([raw.name, ...(raw.tags ?? [])]),
      imageUrl: raw.imageUrl,
      productUrl,
      tags: raw.tags?.length ? raw.tags : undefined,
      _releaseDate: releaseDate,
    });
  }

  // Sort by release date ascending (unknown dates "0000-00" sort first)
  valid.sort((a, b) => {
    if (a._releaseDate === b._releaseDate) return a.name.localeCompare(b.name, 'ja');
    return a._releaseDate.localeCompare(b._releaseDate);
  });

  // Assign sequential numbers and IDs
  return valid.map((model, index) => {
    const number = index + 1;
    const { _releaseDate: _rd, ...rest } = model;
    return {
      ...rest,
      id: generateId(series, number),
      number,
    };
  });
}

// ---------------------------------------------------------------------------
// series-meta.json updater
// ---------------------------------------------------------------------------

/**
 * Reads the existing series-meta.json, updates entries for scraped series,
 * and writes the file back.
 */
async function updateSeriesMeta(results: ScrapeResult[]): Promise<void> {
  const metaPath = path.join(OUTPUT_DIR, 'series-meta.json');

  // Load existing meta (may be empty or have stale data)
  const existingMeta = (await readJsonFile<SeriesMeta[]>(metaPath)) ?? [];

  // Build a map from existing entries for easy lookup
  const metaMap = new Map<SeriesCode, SeriesMeta>(
    existingMeta.map((m) => [m.code, m]),
  );

  // Populate all four series — update only what was scraped
  const allSeries: SeriesCode[] = ['hg', 'rg', 'mg', 'pg'];

  const updatedMeta: SeriesMeta[] = allSeries.map((code) => {
    const base = metaMap.get(code) ?? {
      code,
      ...SERIES_META[code],
      coverImage: '',
      totalCount: 0,
    };

    const result = results.find((r) => r.series === code);
    if (!result) return base; // Not scraped this run — keep existing data

    // Use the first model's image as the cover image
    const coverImage = result.models[0]?.imageUrl ?? base.coverImage;

    return {
      ...base,
      coverImage,
      totalCount: result.totalCount,
    };
  });

  await writeJsonFile(metaPath, updatedMeta);
}

// ---------------------------------------------------------------------------
// Summary output
// ---------------------------------------------------------------------------

function printSummary(results: ScrapeResult[]): void {
  console.log('\n--- Summary ---');
  for (const r of results) {
    const errorCount = r.errors.length;
    const status = errorCount === 0 ? 'OK' : `${errorCount} error(s)`;
    console.log(
      `  ${r.series.toUpperCase().padEnd(4)} | ${String(r.totalCount).padStart(4)} models | ${status}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error('[fatal]', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
