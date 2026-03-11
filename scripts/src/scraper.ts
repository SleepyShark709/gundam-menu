/**
 * scraper.ts -- Main entry point for the Bandai Gunpla scraper.
 *
 * Two-phase approach:
 *   Phase 1 (fast):  Iterate through ALL listing pages to collect product
 *                    names, images, URLs, prices, and dates. ~223 pages total.
 *                    New architecture: listing pages include price and date
 *                    directly, so most products get complete data here.
 *   Phase 2 (conditional): Visit detail pages ONLY for products missing price
 *                    (e.g. some P-Bandai items). Skippable with --skip-details.
 *
 * Usage:
 *   pnpm scrape                          # All series, with details
 *   pnpm scrape --series=mg              # Single series
 *   pnpm scrape --series=hg,rg           # Multiple series
 *   pnpm scrape --skip-details           # Fast mode: listing pages only
 *   pnpm scrape --max-pages=5            # Limit pages per series (testing)
 *   pnpm scrape --resume                 # Skip already-scraped products
 *
 * Outputs:
 *   public/data/hg.json
 *   public/data/rg.json
 *   public/data/mg.json
 *   public/data/pg.json
 *   public/data/series-meta.json
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
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
  BasicProductInfo,
  DetailPageData,
  SeriesMeta,
  ScrapeResult,
  ScrapeError,
  ScraperConfig,
} from './types.js';
import {
  randomDelay,
  withRetry,
  getRandomUserAgent,
  calcTaxFreePrice,
  detectLimited,
  checkRobotsTxt,
  generateId,
  writeJsonFile,
  readJsonFile,
} from './utils.js';
import { collectAllProductsFromAllPages } from './parsers/list-parser.js';
import { scrapeDetailPage } from './parsers/detail-parser.js';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // gundam-search/
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CLIArgs {
  series: SeriesCode[];
  skipDetails: boolean;
  maxPages: number;
  resume: boolean;
}

function parseCLIArgs(): CLIArgs {
  const args = process.argv.slice(2);

  // --series=mg,rg
  const seriesArg = args.find((a) => a.startsWith('--series='));
  let series: SeriesCode[] = DEFAULT_SCRAPER_CONFIG.series;
  if (seriesArg) {
    const valid: SeriesCode[] = ['hg', 'rg', 'mg', 'pg'];
    const raw = seriesArg.replace('--series=', '').split(',').map((s) => s.trim());
    series = raw.filter((s): s is SeriesCode => valid.includes(s as SeriesCode));
    if (series.length === 0) {
      console.error(`Invalid --series value: "${seriesArg}". Use one or more of: hg, rg, mg, pg`);
      process.exit(1);
    }
  }

  // --skip-details
  const skipDetails = args.includes('--skip-details');

  // --max-pages=N
  const maxPagesArg = args.find((a) => a.startsWith('--max-pages='));
  const maxPages = maxPagesArg ? parseInt(maxPagesArg.replace('--max-pages=', ''), 10) : 0;

  // --resume
  const resume = args.includes('--resume');

  return { series, skipDetails, maxPages, resume };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cliArgs = parseCLIArgs();

  const config: ScraperConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    series: cliArgs.series,
    skipDetails: cliArgs.skipDetails,
    maxPages: cliArgs.maxPages,
    resume: cliArgs.resume,
    outputDir: OUTPUT_DIR,
  };

  console.log('=== Bandai Gunpla Scraper ===');
  console.log(`Target series: ${config.series.join(', ')}`);
  console.log(`Skip details: ${config.skipDetails}`);
  console.log(`Max pages per series: ${config.maxPages || 'unlimited'}`);
  console.log(`Resume mode: ${config.resume}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');

  // ------ Robots.txt check ------
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
    config.minDelayMs = Math.max(config.minDelayMs, robotsPolicy.crawlDelay);
  }
  console.log('');

  // ------ Launch browser ------
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
    for (const series of config.series) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[${series.toUpperCase()}] Starting scrape...`);
      console.log(`${'='.repeat(60)}`);

      const result = await scrapeSeries(browser, series, config);
      allResults.push(result);

      // Persist series JSON immediately
      const outputPath = path.join(OUTPUT_DIR, `${series}.json`);
      await writeJsonFile(outputPath, result.models);
      console.log(
        `[${series.toUpperCase()}] Saved ${result.models.length} models to ${outputPath}`,
      );

      if (result.errors.length > 0) {
        console.warn(
          `[${series.toUpperCase()}] ${result.errors.length} errors encountered.`,
        );
      }

      // Delay between series
      if (config.series.indexOf(series) < config.series.length - 1) {
        console.log('\n[delay] Pausing between series...');
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

async function scrapeSeries(
  browser: Browser,
  series: SeriesCode,
  config: ScraperConfig,
): Promise<ScrapeResult> {
  const errors: ScrapeError[] = [];
  const brandUrl = SERIES_URLS[series];

  // Create browser context for this series
  const context = await createBrowserContext(browser);

  try {
    // ====== PHASE 1: Collect all product URLs from listing pages ======
    console.log(`\n[${series.toUpperCase()}] Phase 1: Collecting product URLs from listing pages...`);

    const page = await context.newPage();
    page.setDefaultTimeout(config.timeout);
    page.setDefaultNavigationTimeout(config.timeout);

    let basicProducts: BasicProductInfo[] = [];

    try {
      basicProducts = await withRetry(
        () =>
          collectAllProductsFromAllPages(page, brandUrl, {
            minDelayMs: config.minDelayMs,
            maxDelayMs: config.maxDelayMs,
            maxPages: config.maxPages,
            timeout: config.timeout,
          }),
        config.maxRetries,
        `list:${series}`,
        errors,
      );
    } catch (err) {
      console.error(
        `[${series.toUpperCase()}] Phase 1 failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      basicProducts = [];
    }

    await page.close();

    console.log(
      `[${series.toUpperCase()}] Phase 1 complete: ${basicProducts.length} products found.`,
    );

    // ====== PHASE 2: Enrich with detail page data (only for products missing data) ======
    let detailMap: Map<string, DetailPageData>;

    // Determine which products still need detail page visits.
    // New architecture: listing pages now include price and date, so most
    // products already have complete data. We only visit detail pages for:
    //   1. Products missing price (e.g. P-Bandai products that show no price on listing)
    //   2. Products where --skip-details is NOT set
    const productsNeedingDetails = basicProducts.filter(
      (p) => p.price === undefined || p.price === 0,
    );

    const withListingData = basicProducts.length - productsNeedingDetails.length;
    console.log(
      `[${series.toUpperCase()}] Listing data: ${withListingData}/${basicProducts.length} products have price from listing page.`,
    );

    if (config.skipDetails || productsNeedingDetails.length === 0) {
      if (config.skipDetails) {
        console.log(`[${series.toUpperCase()}] Phase 2: SKIPPED (--skip-details)`);
      } else {
        console.log(`[${series.toUpperCase()}] Phase 2: SKIPPED (all products have listing data)`);
      }
      detailMap = new Map();
    } else {
      console.log(
        `\n[${series.toUpperCase()}] Phase 2: Scraping ${productsNeedingDetails.length} detail pages (products missing price)...`,
      );

      // Load existing data for resume mode
      let existingModels: GundamModel[] = [];
      if (config.resume) {
        const existingPath = path.join(OUTPUT_DIR, `${series}.json`);
        existingModels = (await readJsonFile<GundamModel[]>(existingPath)) ?? [];
        console.log(
          `[${series.toUpperCase()}] Resume: loaded ${existingModels.length} existing models.`,
        );
      }

      detailMap = await scrapeAllDetailPages(
        context,
        productsNeedingDetails,
        existingModels,
        series,
        config,
        errors,
      );

      console.log(
        `[${series.toUpperCase()}] Phase 2 complete: ${detailMap.size} detail pages scraped.`,
      );
    }

    // ====== Combine and normalize ======
    const models = buildGundamModels(basicProducts, detailMap, series);

    return {
      series,
      models,
      scrapedAt: new Date().toISOString(),
      totalCount: models.length,
      errors,
    };
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Detail page scraping (batch)
// ---------------------------------------------------------------------------

/**
 * Scrapes detail pages for all products, with concurrency control,
 * progress reporting, and incremental saves.
 */
async function scrapeAllDetailPages(
  context: BrowserContext,
  products: BasicProductInfo[],
  existingModels: GundamModel[],
  series: SeriesCode,
  config: ScraperConfig,
  errors: ScrapeError[],
): Promise<Map<string, DetailPageData>> {
  const detailMap = new Map<string, DetailPageData>();

  // Build set of already-scraped URLs for resume mode
  const existingUrls = new Set(existingModels.map((m) => m.productUrl));

  // Filter products that need detail scraping
  const productsToScrape = config.resume
    ? products.filter((p) => !existingUrls.has(p.productUrl))
    : products;

  // Populate detailMap with existing data for resumed products
  if (config.resume) {
    for (const model of existingModels) {
      detailMap.set(model.productUrl, {
        price: model.price,
        releaseDate: model.releaseDate,
        isLimited: model.isLimited,
      });
    }
    console.log(
      `[${series.toUpperCase()}] Resume: ${existingUrls.size} already scraped, ${productsToScrape.length} remaining.`,
    );
  }

  if (productsToScrape.length === 0) {
    return detailMap;
  }

  // Open a dedicated page for detail scraping
  const detailPage = await context.newPage();
  detailPage.setDefaultTimeout(config.timeout);
  detailPage.setDefaultNavigationTimeout(config.timeout);

  const total = productsToScrape.length;
  let completed = 0;
  let failed = 0;

  // Save progress every N products
  const saveInterval = 50;

  try {
    for (const product of productsToScrape) {
      // Delay between detail page visits
      if (completed > 0) {
        await randomDelay(
          Math.max(1000, config.minDelayMs),
          Math.max(2000, config.maxDelayMs),
        );
      }

      try {
        const detail = await withRetry(
          () => scrapeDetailPage(detailPage, product.productUrl, config.timeout),
          2, // fewer retries for individual detail pages
          `detail:${product.productUrl}`,
          errors,
        );

        detailMap.set(product.productUrl, detail);
      } catch {
        failed++;
        // Store empty detail data so we don't block on this product
        detailMap.set(product.productUrl, {
          price: 0,
          releaseDate: '',
          isLimited: detectLimited([product.name]),
        });
      }

      completed++;

      // Progress reporting
      if (completed % 10 === 0 || completed === total) {
        const pct = Math.round((completed / total) * 100);
        console.log(
          `  [detail] Progress: ${completed}/${total} (${pct}%) | Failed: ${failed}`,
        );
      }

      // Incremental save
      if (completed % saveInterval === 0) {
        const partialModels = buildGundamModels(
          // Use all products that have detail data so far
          [...detailMap.keys()].map((url) => {
            const prod = products.find((p) => p.productUrl === url);
            return prod ?? { name: '', imageUrl: '', productUrl: url };
          }).filter((p) => p.name),
          detailMap,
          series,
        );
        const outputPath = path.join(OUTPUT_DIR, `${series}.json`);
        await writeJsonFile(outputPath, partialModels);
        console.log(`  [save] Incremental save: ${partialModels.length} models.`);
      }
    }
  } finally {
    await detailPage.close();
  }

  return detailMap;
}

// ---------------------------------------------------------------------------
// Build final GundamModel array
// ---------------------------------------------------------------------------

function buildGundamModels(
  basicProducts: BasicProductInfo[],
  detailMap: Map<string, DetailPageData>,
  series: SeriesCode,
): GundamModel[] {
  const models: Array<GundamModel & { _sortDate: string }> = [];

  for (const product of basicProducts) {
    if (!product.name.trim()) continue;

    const detail = detailMap.get(product.productUrl);

    // Priority: detail page data > listing page data > default
    // New architecture: listing pages often have price and date, making
    // detail page visits unnecessary for most products.
    const price = detail?.price || product.price || 0;
    const releaseDate = detail?.releaseDate || product.releaseDate || '';
    const isLimited =
      detail?.isLimited ?? detectLimited([product.name]);

    models.push({
      id: '',
      series,
      number: 0,
      name: product.name,
      nameJa: product.name, // Scraped from Japanese site; same as name until translated
      price,
      priceTaxFree: calcTaxFreePrice(price),
      releaseDate,
      isLimited,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
      _sortDate: releaseDate || '9999-99', // unknown dates sort last
    });
  }

  // Sort by release date ascending, then by name
  models.sort((a, b) => {
    if (a._sortDate !== b._sortDate) {
      return a._sortDate.localeCompare(b._sortDate);
    }
    return a.name.localeCompare(b.name, 'ja');
  });

  // Assign sequential numbers and IDs; strip internal sort key
  return models.map((model, index) => {
    const number = index + 1;
    const { _sortDate: _unused, ...rest } = model;
    return {
      ...rest,
      id: generateId(series, number),
      number,
    };
  });
}

// ---------------------------------------------------------------------------
// Browser context factory
// ---------------------------------------------------------------------------

async function createBrowserContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport: { width: 1440, height: 900 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      DNT: '1',
    },
  });

  // Block heavy resources to speed up navigation
  await context.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['font', 'media', 'websocket'].includes(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  return context;
}

// ---------------------------------------------------------------------------
// series-meta.json updater
// ---------------------------------------------------------------------------

async function updateSeriesMeta(results: ScrapeResult[]): Promise<void> {
  const metaPath = path.join(OUTPUT_DIR, 'series-meta.json');
  const existingMeta = (await readJsonFile<SeriesMeta[]>(metaPath)) ?? [];
  const metaMap = new Map<SeriesCode, SeriesMeta>(
    existingMeta.map((m) => [m.code, m]),
  );

  const allSeries: SeriesCode[] = ['hg', 'rg', 'mg', 'pg'];

  const updatedMeta: SeriesMeta[] = allSeries.map((code) => {
    const base = metaMap.get(code) ?? {
      code,
      ...SERIES_META[code],
      coverImage: '',
      totalCount: 0,
    };

    const result = results.find((r) => r.series === code);
    if (!result) return base;

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
    const withPrice = r.models.filter((m) => m.price > 0).length;
    const withDate = r.models.filter((m) => m.releaseDate !== '').length;
    const status = errorCount === 0 ? 'OK' : `${errorCount} error(s)`;
    console.log(
      `  ${r.series.toUpperCase().padEnd(4)} | ` +
        `${String(r.totalCount).padStart(5)} models | ` +
        `${String(withPrice).padStart(5)} with price | ` +
        `${String(withDate).padStart(5)} with date | ` +
        status,
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
