/**
 * list-parser.ts
 *
 * Crawls ALL pages of a Bandai brand listing (e.g. /brand/mg/?p=1 ... ?p=57)
 * and extracts basic product info from each card element.
 *
 * Card structure on bandai-hobby.net (new architecture):
 *   <a href="https://bandai-hobby.net/item/01_XXXX/" class="c-card p-card -landscape">
 *     <div class="p-card__img">
 *       <img src="https://d3bk8pkqsprcvh.cloudfront.net/...?Expires=...&Signature=..." alt="...">
 *     </div>
 *     <div class="p-card__explain -landscape">
 *       <div class="p-card__tit">RG 1/144 ...</div>
 *       <div class="p-card__under">
 *         <div class="p-card__price">4,950円(税10%込)</div>
 *         <div class="p-card_date">2026年02月</div>
 *       </div>
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
 * Extracts the pathname from a CloudFront signed URL, stripping the
 * domain and query-string signature parameters.
 *
 * Input:  https://d3bk8pkqsprcvh.cloudfront.net/hobby/jp/product/2025/11/.../xxx.jpg?Expires=...
 * Output: /hobby/jp/product/2025/11/.../xxx.jpg
 *
 * Non-CloudFront URLs are returned as-is.
 */
function extractImagePath(fullUrl: string): string {
  if (!fullUrl) return '';
  try {
    const url = new URL(fullUrl);
    if (url.hostname.includes('cloudfront.net')) {
      return url.pathname;
    }
  } catch {
    // not a valid URL, return as-is
  }
  return fullUrl;
}

/**
 * Extracts product info from all card elements on the current page.
 *
 * New architecture: cards include price and date directly, so we
 * extract them here to avoid unnecessary detail page visits.
 */
async function extractProductCardsFromPage(
  page: Page,
  baseUrl: string,
): Promise<BasicProductInfo[]> {
  const rawProducts = await page.evaluate(
    ({ cardSelector, imageSelector, nameSelector, priceSelector, dateSelector }) => {
      const cards = document.querySelectorAll(cardSelector);
      const results: Array<{
        name: string;
        imageUrl: string;
        productUrl: string;
        priceText: string;
        dateText: string;
      }> = [];

      cards.forEach((card) => {
        const anchor = card as HTMLAnchorElement;
        const img = card.querySelector(imageSelector) as HTMLImageElement | null;

        // Product name: prefer the dedicated title element (new architecture),
        // fall back to img alt / anchor text
        const titleEl = card.querySelector(nameSelector);
        const name =
          titleEl?.textContent?.trim() ||
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

        // Price text (new architecture): e.g. "4,950円(税10%込)"
        const priceEl = card.querySelector(priceSelector);
        const priceText = priceEl?.textContent?.trim() || '';

        // Release date text (new architecture): e.g. "2026年02月"
        const dateEl = card.querySelector(dateSelector);
        const dateText = dateEl?.textContent?.trim() || '';

        if (name && productUrl) {
          results.push({ name, imageUrl, productUrl, priceText, dateText });
        }
      });

      return results;
    },
    {
      cardSelector: SELECTORS.productCard,
      imageSelector: SELECTORS.productImage,
      nameSelector: SELECTORS.listName,
      priceSelector: SELECTORS.listPrice,
      dateSelector: SELECTORS.listDate,
    },
  );

  // Parse and resolve URLs
  return rawProducts.map((p) => {
    const rawImageUrl = resolveUrl(p.imageUrl, baseUrl);

    // Parse price: "4,950円(税10%込)" -> 4950
    let price: number | undefined;
    if (p.priceText) {
      const priceMatch = p.priceText.replace(/,/g, '').match(/(\d+)\s*円/);
      if (priceMatch) {
        price = parseInt(priceMatch[1], 10);
        if (isNaN(price)) price = undefined;
      }
    }

    // Parse release date: "2026年02月" -> "2026-02"
    let releaseDate: string | undefined;
    if (p.dateText) {
      const dateMatch = p.dateText.match(/(\d{4})年\s*(\d{1,2})月/);
      if (dateMatch) {
        releaseDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}`;
      }
    }

    return {
      name: p.name,
      imageUrl: extractImagePath(rawImageUrl),
      productUrl: resolveUrl(p.productUrl, baseUrl),
      ...(price !== undefined && { price }),
      ...(releaseDate !== undefined && { releaseDate }),
    };
  });
}
