/**
 * detail-parser.ts
 *
 * Parses individual product detail pages to enrich data not available
 * on the listing page (e.g., English product names, detailed tags, etc.).
 *
 * This module is optional — the main scraper will use it only when
 * critical fields cannot be extracted from the listing page alone.
 */

import type { Page } from 'playwright';
import type { RawProductData } from '../types.js';

// ---------------------------------------------------------------------------
// Detail selectors
// ---------------------------------------------------------------------------

const DETAIL_SELECTORS = {
  /** Product name in Japanese */
  nameJa: 'h1, .product-name, [class*="title"], [itemprop="name"]',

  /** Product name in English (often a subtitle or alt language block) */
  nameEn: '.product-name-en, [lang="en"] h1, [class*="name-en"], .subtitle-en',

  /** Primary product image (high-res) */
  mainImage:
    '.product-image img, .main-image img, [class*="main-img"] img, ' +
    '[itemprop="image"], #main-image img',

  /** Price (tax-inclusive) */
  price: '[class*="price"], .price, [itemprop="price"], .product-price',

  /** Release date */
  releaseDate:
    '.release-date, [class*="release"], [class*="date"], ' +
    'dt:contains("発売日") + dd, th:contains("発売日") + td',

  /** Category/grade breadcrumb */
  breadcrumb: '.breadcrumb, [aria-label="breadcrumb"], [class*="breadcrumb"]',

  /** Product specification table rows */
  specTable: 'table.spec tr, .spec-table tr, [class*="spec"] tr',

  /** Limited/exclusive badge */
  limitedBadge: '.limited, .p-bandai, [class*="limited"], [class*="exclusive"]',

  /** Product tags or category labels */
  tags: '.tag, .category, [class*="tag"], [class*="category"]',
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enriches a raw product record with additional data from its detail page.
 * The input `partial` must have at least `productUrl` set.
 *
 * Only fields that are missing or clearly invalid in `partial` are overwritten.
 *
 * @param page - Playwright Page (caller is responsible for navigation)
 * @param partial - Partially filled raw product data from the listing page
 * @returns Enriched raw product data
 */
export async function enrichFromDetailPage(
  page: Page,
  partial: Partial<RawProductData> & { productUrl: string },
): Promise<RawProductData> {
  const detail = await extractDetailData(page, partial.productUrl);

  return {
    name: partial.name || detail.name,
    nameEn: partial.nameEn || detail.nameEn,
    priceText: isValidPrice(partial.priceText) ? partial.priceText! : detail.priceText,
    releaseDateText: isValidDate(partial.releaseDateText)
      ? partial.releaseDateText!
      : detail.releaseDateText,
    imageUrl: partial.imageUrl || detail.imageUrl,
    productUrl: partial.productUrl,
    isLimited: partial.isLimited || detail.isLimited,
    tags: mergeArrays(partial.tags, detail.tags),
  };
}

// ---------------------------------------------------------------------------
// Internal extraction
// ---------------------------------------------------------------------------

/**
 * Extracts all available product data from the current detail page.
 */
async function extractDetailData(
  page: Page,
  _pageUrl: string,
): Promise<RawProductData> {
  return page.evaluate(({ sels }) => {
    // ---- Helper: first non-empty text match ----
    function firstText(...selectors: string[]): string {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          const text = el?.textContent?.trim();
          if (text) return text;
        } catch {
          // Ignore invalid selectors
        }
      }
      return '';
    }

    // ---- Helper: first image src ----
    function firstImageSrc(...selectors: string[]): string {
      for (const sel of selectors) {
        try {
          const img = document.querySelector(sel) as HTMLImageElement | null;
          const src =
            img?.getAttribute('data-src') ??
            img?.getAttribute('data-lazy-src') ??
            img?.getAttribute('src');
          if (src && !src.startsWith('data:')) return src;
        } catch {
          // Ignore invalid selectors
        }
      }
      return '';
    }

    // ---- Name ----
    const name = firstText(
      sels.nameJa,
      'h1',
      '[class*="title"]',
      '[itemprop="name"]',
    );

    // ---- English name ----
    const nameEn = firstText(sels.nameEn) || undefined;

    // ---- Price ----
    let priceText = firstText(sels.price);
    // Bandai sometimes stores price in a data attribute
    if (!priceText) {
      const priceEl = document.querySelector('[data-price]');
      priceText = priceEl?.getAttribute('data-price') ?? '';
    }

    // ---- Release date ----
    let releaseDateText = firstText(sels.releaseDate);

    // Parse spec table for release date if not found above
    if (!releaseDateText) {
      const rows = document.querySelectorAll(sels.specTable);
      rows.forEach((row) => {
        const th = row.querySelector('th, dt, td:first-child');
        const td = row.querySelector('td:last-child, dd');
        if (th?.textContent?.includes('発売') && td) {
          releaseDateText = td.textContent?.trim() ?? '';
        }
      });
    }

    // ---- Main image ----
    const imageUrl = firstImageSrc(
      sels.mainImage,
      '.product-image img',
      'meta[property="og:image"]',
    ) || (() => {
      const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      return ogImg?.getAttribute('content') ?? '';
    })();

    // ---- Limited detection ----
    const badgeText = firstText(sels.limitedBadge);
    const pageText = document.body.textContent ?? '';
    const limitedKeywords = ['P-Bandai', 'Limited', '限定', 'プレミアムバンダイ', '魂ウェブ'];
    const isLimited = limitedKeywords.some((kw) => badgeText.includes(kw) || pageText.includes(kw));

    // ---- Tags ----
    const tags: string[] = [];
    try {
      const tagEls = document.querySelectorAll(sels.tags);
      tagEls.forEach((el) => {
        const tag = el.textContent?.trim();
        if (tag && !tags.includes(tag) && tag.length < 50) {
          tags.push(tag);
        }
      });
    } catch {
      // Ignore selector errors
    }

    return {
      name,
      nameEn,
      priceText,
      releaseDateText,
      imageUrl,
      productUrl: window.location.href,
      isLimited,
      tags,
    };
  }, { sels: DETAIL_SELECTORS });
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidPrice(priceText: string | undefined): boolean {
  if (!priceText) return false;
  return /\d/.test(priceText); // Must contain at least one digit
}

function isValidDate(dateText: string | undefined): boolean {
  if (!dateText) return false;
  return /\d{4}/.test(dateText); // Must contain a 4-digit year
}

function mergeArrays<T>(a: T[] | undefined, b: T[] | undefined): T[] {
  if (!a?.length) return b ?? [];
  if (!b?.length) return a;
  return [...new Set([...a, ...b])];
}
