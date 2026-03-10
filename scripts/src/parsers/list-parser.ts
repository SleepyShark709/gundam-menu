/**
 * list-parser.ts
 *
 * Parses product listing pages from Bandai's gunpla brand pages.
 * Responsible for:
 *   - Locating product card elements in the DOM
 *   - Extracting raw text/attributes from each card
 *   - Handling both grid and list layouts
 *   - Triggering load-more/pagination to get all products
 */

import type { Page } from 'playwright';
import { SELECTORS } from '../config.js';
import type { RawProductData } from '../types.js';
import { scrollToLoadAll } from '../utils.js';

// ---------------------------------------------------------------------------
// Page-level product collection
// ---------------------------------------------------------------------------

/**
 * Collects all product data from a listing page, handling infinite scroll
 * and "load more" button patterns to ensure all items are captured.
 *
 * @param page - Playwright Page instance already navigated to the listing URL
 * @returns Array of raw product data objects
 */
export async function collectAllProducts(page: Page): Promise<RawProductData[]> {
  // Step 1: Try to expand all products via infinite scroll
  await scrollToLoadAll(page, 60, 1500);

  // Step 2: Also attempt to click any visible "load more" buttons
  await clickAllLoadMoreButtons(page);

  // Step 3: Extract product cards from the fully-loaded DOM
  return extractProductCards(page);
}

// ---------------------------------------------------------------------------
// Load-more button handling
// ---------------------------------------------------------------------------

/**
 * Repeatedly clicks "load more" / pagination buttons until none remain
 * or a maximum iteration count is reached.
 */
async function clickAllLoadMoreButtons(page: Page, maxClicks: number = 50): Promise<void> {
  let clicks = 0;

  while (clicks < maxClicks) {
    const loadMoreButton = page.locator(SELECTORS.loadMoreButton).first();
    const isVisible = await loadMoreButton.isVisible().catch(() => false);

    if (!isVisible) {
      break;
    }

    console.log(`  [pagination] Clicking load-more button (click ${clicks + 1})...`);
    await loadMoreButton.click();

    // Wait for new content to load before looking for another button
    await page.waitForTimeout(2000);
    clicks++;
  }

  if (clicks > 0) {
    console.log(`  [pagination] Clicked load-more ${clicks} times.`);
  }
}

// ---------------------------------------------------------------------------
// Card extraction
// ---------------------------------------------------------------------------

/**
 * Extracts product information from all card elements in the current DOM.
 * Falls back to broader selectors if the primary selectors yield no results.
 */
async function extractProductCards(page: Page): Promise<RawProductData[]> {
  // Try multiple card selector strategies
  const cardSelectors = [
    SELECTORS.productCard,
    'article',
    '.product',
    '.item',
    'li[class*="item"]',
    'div[class*="product"]',
    'div[class*="item"]',
  ];

  let cards: RawProductData[] = [];

  for (const selector of cardSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`  [parser] Found ${count} product cards using selector: "${selector}"`);
      cards = await parseCardsWithSelector(page, selector);
      if (cards.length > 0) break;
    }
  }

  if (cards.length === 0) {
    console.warn('  [parser] No product cards found with any known selector. Trying fallback extraction...');
    cards = await fallbackExtraction(page);
  }

  return cards;
}

/**
 * Extracts product data from cards matched by the given CSS selector.
 */
async function parseCardsWithSelector(page: Page, cardSelector: string): Promise<RawProductData[]> {
  return page.evaluate(
    ({ cardSel, sels, limitedKw }) => {
      const results: Array<{
        name: string;
        nameEn?: string;
        priceText: string;
        releaseDateText: string;
        imageUrl: string;
        productUrl: string;
        isLimited: boolean;
        tags: string[];
      }> = [];

      const cards = document.querySelectorAll(cardSel);

      cards.forEach((card) => {
        // ---------- Product name ----------
        const nameEl = card.querySelector(sels.productName);
        const name = nameEl?.textContent?.trim() ?? '';
        if (!name) return; // Skip cards without a name

        // ---------- English name (often a subtitle or second heading) ----------
        const allHeadings = card.querySelectorAll('h1, h2, h3, h4, .subtitle, [class*="name-en"]');
        let nameEn: string | undefined;
        if (allHeadings.length > 1) {
          const secondHeading = allHeadings[1]?.textContent?.trim();
          if (secondHeading && secondHeading !== name) {
            nameEn = secondHeading;
          }
        }

        // ---------- Price ----------
        const priceEl = card.querySelector(sels.productPrice);
        const priceText = priceEl?.textContent?.trim() ?? '';

        // ---------- Release date ----------
        const dateEl = card.querySelector(sels.productReleaseDate);
        let releaseDateText = dateEl?.textContent?.trim() ?? '';

        // Some pages embed the date in a data attribute
        if (!releaseDateText) {
          const dateAttr =
            card.getAttribute('data-release') ??
            card.getAttribute('data-date') ??
            card.getAttribute('data-release-date');
          releaseDateText = dateAttr ?? '';
        }

        // ---------- Image URL ----------
        const imgEl = card.querySelector(sels.productImage) as HTMLImageElement | null;
        const imageUrl =
          imgEl?.getAttribute('data-src') ??
          imgEl?.getAttribute('data-lazy-src') ??
          imgEl?.getAttribute('src') ??
          '';

        // ---------- Product detail URL ----------
        const linkEl = card.querySelector(sels.productLink) as HTMLAnchorElement | null;
        const productUrl = linkEl?.href ?? '';

        // ---------- Limited edition detection ----------
        const badgeEl = card.querySelector(sels.limitedBadge);
        const badgeText = badgeEl?.textContent?.trim() ?? '';
        const cardText = card.textContent ?? '';
        const isLimited = limitedKw.some((kw: string) => cardText.includes(kw) || badgeText.includes(kw));

        // ---------- Tags ----------
        const tagEls = card.querySelectorAll(sels.productTags);
        const tags: string[] = [];
        tagEls.forEach((tagEl) => {
          const tagText = tagEl.textContent?.trim();
          if (tagText && !tags.includes(tagText)) {
            tags.push(tagText);
          }
        });

        results.push({
          name,
          nameEn,
          priceText,
          releaseDateText,
          imageUrl,
          productUrl,
          isLimited,
          tags,
        });
      });

      return results;
    },
    {
      cardSel: cardSelector,
      sels: {
        productName: SELECTORS.productName,
        productPrice: SELECTORS.productPrice,
        productReleaseDate: SELECTORS.productReleaseDate,
        productImage: SELECTORS.productImage,
        productLink: SELECTORS.productLink,
        limitedBadge: SELECTORS.limitedBadge,
        productTags: SELECTORS.productTags,
      },
      limitedKw: ['P-Bandai', 'p-bandai', 'Limited', 'limited', '限定', 'プレミアムバンダイ', '魂ウェブ商店'],
    },
  );
}

/**
 * Fallback extraction: scans all anchor elements with images and attempts
 * to reconstruct product data from their surrounding context.
 * Used when no known card-level selectors match.
 */
async function fallbackExtraction(page: Page): Promise<RawProductData[]> {
  return page.evaluate(() => {
    const results: Array<{
      name: string;
      priceText: string;
      releaseDateText: string;
      imageUrl: string;
      productUrl: string;
      isLimited: boolean;
      tags: string[];
    }> = [];

    // Look for anchors that wrap or are near images — these are likely product links
    const anchors = document.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>;

    anchors.forEach((anchor) => {
      const img = anchor.querySelector('img') as HTMLImageElement | null;
      if (!img) return;

      // Must have a reasonable image src
      const imageUrl =
        img.getAttribute('data-src') ??
        img.getAttribute('data-lazy-src') ??
        img.getAttribute('src') ??
        '';
      if (!imageUrl || imageUrl.startsWith('data:')) return;

      const productUrl = anchor.href;
      if (!productUrl || productUrl === window.location.href) return;

      // Walk up the DOM to find the closest container with useful text
      const container = anchor.closest('li, article, div[class], section') ?? anchor.parentElement;
      const containerText = container?.textContent?.trim() ?? anchor.textContent?.trim() ?? '';

      // Extract alt text or aria-label as product name
      const name =
        img.getAttribute('alt')?.trim() ??
        anchor.getAttribute('aria-label')?.trim() ??
        anchor.textContent?.trim() ??
        '';
      if (!name) return;

      // Attempt to find price in container text
      const priceMatch = containerText.match(/[\d,]+\s*円/);
      const priceText = priceMatch ? priceMatch[0] : '';

      // Attempt to find date in container text
      const dateMatch = containerText.match(/\d{4}年\s*\d{1,2}月|\d{4}\/\d{1,2}/);
      const releaseDateText = dateMatch ? dateMatch[0] : '';

      const isLimited = ['限定', 'Limited', 'P-Bandai', '魂ウェブ'].some((kw) =>
        containerText.includes(kw),
      );

      results.push({
        name,
        priceText,
        releaseDateText,
        imageUrl,
        productUrl,
        isLimited,
        tags: [],
      });
    });

    return results;
  });
}

// ---------------------------------------------------------------------------
// URL resolution helper
// ---------------------------------------------------------------------------

/**
 * Resolves a potentially relative image URL to an absolute URL.
 * Bandai CDN URLs are returned as-is; relative paths are resolved
 * against the page's base URL.
 */
export function resolveImageUrl(rawUrl: string, pageUrl: string): string {
  if (!rawUrl) return '';

  try {
    // Already absolute
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }

    // Protocol-relative
    if (rawUrl.startsWith('//')) {
      return `https:${rawUrl}`;
    }

    // Relative — resolve against page URL
    const base = new URL(pageUrl);
    return new URL(rawUrl, base).toString();
  } catch {
    return rawUrl;
  }
}
