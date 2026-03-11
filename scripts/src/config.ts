/**
 * Configuration: URLs, selectors, and scraper defaults for Bandai gunpla pages.
 *
 * All CSS selectors are calibrated to the actual DOM structure of
 * bandai-hobby.net as of 2026-03.
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
// CSS selectors -- matched to actual bandai-hobby.net markup
// ---------------------------------------------------------------------------

export const SELECTORS = {
  // ---- Listing page ----

  /** Product card: the <a> wrapping each product on the brand listing page. */
  productCard: 'a.c-card.p-card, a.p-card',

  /** Product image within a card. Alt = product name, src = thumbnail. */
  productImage: '.p-card__img img',

  /** Product name within a card (new architecture). */
  listName: '.p-card__tit',

  /** Product price within a card (new architecture). e.g. "4,950円(税10%込)" */
  listPrice: '.p-card__price',

  /** Product release date within a card (new architecture). Note: single underscore. e.g. "2026年02月" */
  listDate: '.p-card_date',

  /** Pagination links (e.g. ?p=2, ?p=3 ... ?p=142). */
  paginationLink: 'a[href*="?p="]',

  // ---- Detail page ----

  /** Product name heading on the detail page. */
  detailName: 'h1',

  /** Label titles (dt) in the product info table on the detail page. */
  detailLabel: 'dt.pg-products__labelTit',

  /** Label values (dd) in the product info table on the detail page. */
  detailValue: 'dd.pg-products__labelTxt',
} as const;

// ---------------------------------------------------------------------------
// CloudFront image hosting
// ---------------------------------------------------------------------------

export const CLOUDFRONT_HOST = 'https://d3bk8pkqsprcvh.cloudfront.net';
export const IMAGE_SIGN_API = 'https://assets-signedurl.bandai-hobby.net/get-signed-url';

// ---------------------------------------------------------------------------
// Text patterns for parsing
// ---------------------------------------------------------------------------

/** Regex to extract numeric price from strings like "4,620 円(税10%込)" */
export const PRICE_PATTERN = /[\d,]+/;

/**
 * Ordered regexes to extract release date.
 * Each must capture (year, month) as groups 1 and 2.
 */
export const RELEASE_DATE_PATTERNS = [
  /(\d{4})年\s*(\d{1,2})月/,   // Japanese: 2024年3月
  /(\d{4})\/(\d{1,2})/,        // Slash-separated: 2024/03
  /(\d{4})-(\d{1,2})/,         // ISO-like: 2024-03
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
  minDelayMs: 1000,   // 1 second minimum between page loads
  maxDelayMs: 3000,   // 3 seconds maximum between page loads
  outputDir: '../public/data',
  headless: true,
  timeout: 20000,     // 20 seconds per page load
  maxPages: 0,        // 0 = unlimited
  skipDetails: false,
  resume: false,
  detailConcurrency: 3,
};

// ---------------------------------------------------------------------------
// User-Agent strings -- rotate randomly to reduce fingerprinting
// ---------------------------------------------------------------------------

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

// ---------------------------------------------------------------------------
// Series name mappings (for series-meta.json)
// ---------------------------------------------------------------------------

export const SERIES_META: Record<SeriesCode, { name: string; shortName: string; scale: string }> = {
  hg: { name: 'High Grade',    shortName: 'HG', scale: '1/144' },
  rg: { name: 'Real Grade',    shortName: 'RG', scale: '1/144' },
  mg: { name: 'Master Grade',  shortName: 'MG', scale: '1/100' },
  pg: { name: 'Perfect Grade', shortName: 'PG', scale: '1/60'  },
};
