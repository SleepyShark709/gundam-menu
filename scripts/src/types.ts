/**
 * Scraper-specific types for Bandai gunpla product scraping
 */

export type SeriesCode = 'hg' | 'rg' | 'mg' | 'pg';

/**
 * Parsed raw product data from the listing page before normalization
 */
export interface RawProductData {
  name: string;
  nameEn?: string;
  priceText: string;       // Raw price string from page, e.g. "4,620円（税込）"
  releaseDateText: string; // Raw release date text, e.g. "2024年3月"
  imageUrl: string;
  productUrl: string;
  isLimited: boolean;
  tags?: string[];
}

/**
 * Fully normalized gundam model data conforming to app data model
 */
export interface GundamModel {
  id: string;             // e.g. "mg-001"
  series: SeriesCode;
  number: number;
  name: string;
  nameEn?: string;
  price: number;          // JPY with tax (integer)
  priceTaxFree: number;   // price / 1.1, rounded to integer
  releaseDate: string;    // "YYYY-MM"
  isLimited: boolean;
  imageUrl: string;
  productUrl: string;
  tags?: string[];
}

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
}

/**
 * Robots.txt parsing result
 */
export interface RobotsPolicy {
  allowed: boolean;
  crawlDelay?: number;
}
