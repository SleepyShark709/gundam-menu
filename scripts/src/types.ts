/**
 * Scraper-specific types for Bandai gunpla product scraping.
 *
 * Two-phase data model:
 *   1. BasicProductInfo  -- collected from listing pages (fast, name + image + URL)
 *   2. GundamModel       -- fully enriched with price/date from detail pages
 */

export type SeriesCode = 'hg' | 'rg' | 'mg' | 'pg';

// ---------------------------------------------------------------------------
// Phase 1: Listing page data
// ---------------------------------------------------------------------------

/**
 * Minimal product info extracted from a brand listing page card.
 * Available without visiting the detail page.
 */
export interface BasicProductInfo {
  name: string;
  imageUrl: string;
  productUrl: string;
}

// ---------------------------------------------------------------------------
// Phase 2: Detail page enrichment
// ---------------------------------------------------------------------------

/**
 * Data extracted from a single product detail page.
 */
export interface DetailPageData {
  price: number;          // JPY with tax, e.g. 4620
  releaseDate: string;    // "YYYY-MM" or ""
  isLimited: boolean;
}

// ---------------------------------------------------------------------------
// Final output model
// ---------------------------------------------------------------------------

/**
 * Fully normalized gundam model data conforming to app data model.
 */
export interface GundamModel {
  id: string;             // e.g. "mg-001"
  series: SeriesCode;
  number: number;
  name: string;
  price: number;          // JPY with tax (integer)
  priceTaxFree: number;   // price / 1.1, rounded to integer
  releaseDate: string;    // "YYYY-MM" or ""
  isLimited: boolean;
  imageUrl: string;
  productUrl: string;
}

// ---------------------------------------------------------------------------
// Scraping infrastructure types
// ---------------------------------------------------------------------------

/**
 * Series metadata entry for series-meta.json
 */
export interface SeriesMeta {
  code: SeriesCode;
  name: string;
  shortName: string;
  scale: string;
  coverImage: string;
  totalCount: number;
}

/**
 * Scraping result for a single series
 */
export interface ScrapeResult {
  series: SeriesCode;
  models: GundamModel[];
  scrapedAt: string;
  totalCount: number;
  errors: ScrapeError[];
}

/**
 * Represents a scraping error for diagnostics
 */
export interface ScrapeError {
  url: string;
  message: string;
  attempt: number;
  timestamp: string;
}

/**
 * Configuration for a scraping session
 */
export interface ScraperConfig {
  series: SeriesCode[];
  maxRetries: number;
  minDelayMs: number;
  maxDelayMs: number;
  outputDir: string;
  headless: boolean;
  timeout: number;
  /** Maximum pages to scrape per series (0 = unlimited). For testing. */
  maxPages: number;
  /** If true, skip detail page visits -- only collect listing data. */
  skipDetails: boolean;
  /** If true, resume from existing JSON (skip products already scraped). */
  resume: boolean;
  /** Concurrency for detail page scraping (number of parallel pages). */
  detailConcurrency: number;
}

/**
 * Robots.txt parsing result
 */
export interface RobotsPolicy {
  allowed: boolean;
  crawlDelay?: number;
}
