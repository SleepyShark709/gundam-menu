/**
 * Configuration: URLs, selectors, and scraper defaults for Bandai gunpla pages
 */

import type { SeriesCode, ScraperConfig } from './types.js';

// ---------------------------------------------------------------------------
// URL configuration
// ---------------------------------------------------------------------------

export const BASE_URL = 'https://bandai-hobby.net';
export const ROBOTS_URL = `${BASE_URL}/robots.txt`;

export const SERIES_URLS: Record<SeriesCode, string> = {
  hg: `${BASE_URL}/brand/hg/`,
  rg: `${BASE_URL}/brand/rg/`,
  mg: `${BASE_URL}/brand/mg/`,
  pg: `${BASE_URL}/brand/pg/`,
};

// ---------------------------------------------------------------------------
// CSS selectors — update these if the site structure changes
// ---------------------------------------------------------------------------

export const SELECTORS = {
  /**
   * The outer container holding all product cards on the listing page.
   * We look for both grid and list layouts.
   */
  productGrid: '.product-list, .item-list, [class*="product-grid"], [class*="item-list"]',

  /**
   * Individual product card element within the grid.
   */
  productCard: '.product-item, .item-card, [class*="product-card"], [class*="item-card"], li.item',

  /**
   * Product name element inside a card.
   */
  productName: '.product-name, .item-name, [class*="product-title"], h2, h3, .name',

  /**
   * Price element inside a card. Bandai typically shows "¥X,XXX (税込)".
   */
  productPrice: '.price, .item-price, [class*="price"]',

  /**
   * Release date element inside a card.
   */
  productReleaseDate: '.release-date, .date, [class*="release"], [class*="date"]',

  /**
   * Product thumbnail image inside a card.
   */
  productImage: 'img[src], img[data-src], img[data-lazy-src]',

  /**
   * Anchor tag linking to the product detail page.
   */
  productLink: 'a[href]',

  /**
   * Badge or label indicating limited edition / P-Bandai exclusives.
   */
  limitedBadge:
    '.limited, .p-bandai, [class*="limited"], [class*="exclusive"], ' +
    '[class*="pbandai"], .badge-limited, .badge-special',

  /**
   * "Load more" or pagination button to fetch additional products.
   */
  loadMoreButton:
    'button[class*="more"], a[class*="more"], .load-more, .btn-more, ' +
    '[data-action="load-more"], .pager-next, a[rel="next"]',

  /**
   * Pagination: next-page link.
   */
  paginationNext: 'a[rel="next"], .pagination .next, .pager-next a',

  /**
   * Tag / category labels on product cards.
   */
  productTags: '.tag, .badge, [class*="tag"], [class*="badge"]',
} as const;

// ---------------------------------------------------------------------------
// Text patterns for parsing
// ---------------------------------------------------------------------------

/** Regex to extract numeric price from strings like "4,620円（税込）" or "¥4,620" */
export const PRICE_PATTERN = /[\d,]+/;

/**
 * Regex to extract release date.
 * Handles:
 *   - "2024年3月" → "2024-03"
 *   - "2024年3月予定" → "2024-03"
 *   - "2024/03"
 *   - "March 2024"
 */
export const RELEASE_DATE_PATTERNS = [
  /(\d{4})年\s*(\d{1,2})月/,          // Japanese: 2024年3月
  /(\d{4})\/(\d{1,2})/,              // Slash-separated: 2024/03
  /(\d{4})-(\d{1,2})/,              // ISO-like: 2024-03
];

/** Keywords indicating a product is a limited / P-Bandai exclusive */
export const LIMITED_KEYWORDS = [
  'P-Bandai',
  'p-bandai',
  'pbandai',
  'Limited',
  'limited',
  '限定',
  'プレミアムバンダイ',
  '魂ウェブ商店',
  'PREMIUM',
  'premium',
];

// ---------------------------------------------------------------------------
// Default scraper configuration
// ---------------------------------------------------------------------------

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  series: ['hg', 'rg', 'mg', 'pg'],
  maxRetries: 3,
  minDelayMs: 2000,  // 2 seconds minimum between requests
  maxDelayMs: 5000,  // 5 seconds maximum between requests
  outputDir: '../public/data',
  headless: true,
  timeout: 30000,    // 30 seconds page load timeout
};

// ---------------------------------------------------------------------------
// User-Agent strings — rotate randomly to reduce fingerprinting
// ---------------------------------------------------------------------------

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

// ---------------------------------------------------------------------------
// Series name mappings (for series-meta.json updates)
// ---------------------------------------------------------------------------

export const SERIES_META: Record<SeriesCode, { name: string; shortName: string; scale: string }> = {
  hg: { name: 'High Grade',    shortName: 'HG', scale: '1/144' },
  rg: { name: 'Real Grade',    shortName: 'RG', scale: '1/144' },
  mg: { name: 'Master Grade',  shortName: 'MG', scale: '1/100' },
  pg: { name: 'Perfect Grade', shortName: 'PG', scale: '1/60'  },
};
