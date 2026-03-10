/**
 * list-parser.ts
 *
 * Crawls ALL pages of a Bandai brand listing (e.g. /brand/mg/?p=1 ... ?p=57)
 * and extracts basic product info from each card element.
 *
 * Card structure on bandai-hobby.net:
 *   <a href="https://bandai-hobby.net/item/01_XXXX/" class="c-card p-card -landscape">
 *     <div class="p-card__img">
 *       <img src="https://d3bk8pkqsprcvh.cloudfront.net/..." alt="MG 1/100 ...">
 *     </div>
 *   </a>
 *
 * Pagination: links with ?p=N. The highest N found on page 1 = max page.
 */

import type { Page } from 'playwright';
import { SELECTORS } from '../config.js';
import type { BasicProductInfo } from '../types.js';
import { randomDelay, resolveUrl } from '../utils.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Collects basic product info from ALL pages of a brand listing.
 *
 * @param page      Playwright Page instance (will be navigated)
 * @param brandUrl  Base URL, e.g. "https://bandai-hobby.net/brand/mg/"
 * @param options   Delay and page limit settings
 * @returns Array of BasicProductInfo for every product found
 */
export async function collectAllProductsFromAllPages(
  page: Page,
  brandUrl: string,
  options: {
    minDelayMs: number;
    maxDelayMs: number;
    maxPages: number;
    timeout: number;
  },
): Promise<BasicProductInfo[]> {
  // ------ Step 1: Navigate to page 1 ------
  console.log(`  [list] Navigating to ${brandUrl}`);
  await page.goto(brandUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout });
  await page.waitForTimeout(2000);

  // ------ Step 2: Detect max page number from pagination links ------
  const maxPage = await detectMaxPage(page);
  const effectiveMaxPage = options.maxPages > 0
    ? Math.min(maxPage, options.maxPages)
    : maxPage;

  console.log(`  [list] Detected ${maxPage} total pages. Will scrape ${effectiveMaxPage} pages.`);

  // ------ Step 3: Collect products from each page ------
  const allProducts: BasicProductInfo[] = [];

  for (let p = 1; p <= effectiveMaxPage; p++) {
    // Navigate to the page (page 1 is already loaded)
    if (p > 1) {
      await randomDelay(options.minDelayMs, options.maxDelayMs);
      const pageUrl = `${brandUrl}?p=${p}`;
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout });
      await page.waitForTimeout(1500);
    }

    const products = await extractProductCardsFromPage(page, brandUrl);
    allProducts.push(...products);

    console.log(
      `  [list] Page ${p}/${effectiveMaxPage}: found ${products.length} products (cumulative: ${allProducts.length})`,
    );
  }

  // Deduplicate by productUrl (in case of overlap between pages)
  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.productUrl)) return false;
    seen.add(p.productUrl);
    return true;
  });

  if (unique.length !== allProducts.length) {
    console.log(`  [list] Deduplicated: ${allProducts.length} -> ${unique.length} products.`);
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Detects the maximum page number from pagination links on the current page.
 */
async function detectMaxPage(page: Page): Promise<number> {
  return page.evaluate((paginationSelector) => {
    const links = document.querySelectorAll(paginationSelector);
    let max = 1;
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const match = href.match(/[?&]p=(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    return max;
  }, SELECTORS.paginationLink);
}

/**
 * Extracts product info from all card elements on the current page.
 */
async function extractProductCardsFromPage(
  page: Page,
  baseUrl: string,
): Promise<BasicProductInfo[]> {
  const rawProducts = await page.evaluate(
    ({ cardSelector, imageSelector }) => {
      const cards = document.querySelectorAll(cardSelector);
      const results: Array<{ name: string; imageUrl: string; productUrl: string }> = [];

      cards.forEach((card) => {
        const anchor = card as HTMLAnchorElement;
        const img = card.querySelector(imageSelector) as HTMLImageElement | null;

        // Try multiple sources for the product name
        const name =
          img?.alt?.trim() ||
          img?.getAttribute('title')?.trim() ||
          anchor.getAttribute('aria-label')?.trim() ||
          anchor.textContent?.trim() ||
          '';

        // Try multiple sources for the image URL
        const imageUrl =
          img?.getAttribute('data-src') ||
          img?.getAttribute('data-lazy-src') ||
          img?.src ||
          '';

        // Product URL from the anchor href
        const productUrl = anchor.href || '';

        if (name && productUrl) {
          results.push({ name, imageUrl, productUrl });
        }
      });

      return results;
    },
    {
      cardSelector: SELECTORS.productCard,
      imageSelector: SELECTORS.productImage,
    },
  );

  // Resolve relative URLs
  return rawProducts.map((p) => ({
    name: p.name,
    imageUrl: resolveUrl(p.imageUrl, baseUrl),
    productUrl: resolveUrl(p.productUrl, baseUrl),
  }));
}
