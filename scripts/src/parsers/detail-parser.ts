/**
 * detail-parser.ts
 *
 * Visits individual product detail pages on bandai-hobby.net and extracts:
 *   - Price (from dt/dd pairs containing "円")
 *   - Release date (from dt/dd pairs containing year/month pattern)
 *   - Limited edition flag (body text contains limited-edition keywords)
 *
 * Detail page structure:
 *   <dl>
 *     <dt class="pg-products__labelTit">価格</dt>
 *     <dd class="pg-products__labelTxt">7,150 円(税10%込)</dd>
 *     <dt class="pg-products__labelTit">発売日</dt>
 *     <dd class="pg-products__labelTxt">2025年11月22日 (土)</dd>
 *   </dl>
 */

import type { Page } from 'playwright';
import { SELECTORS } from '../config.js';
import type { DetailPageData } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Navigates to a product detail page and extracts price, date, and limited flag.
 *
 * @param page       Playwright Page instance
 * @param productUrl Full URL of the product detail page
 * @param timeout    Navigation timeout in ms
 * @returns Extracted detail data
 */
export async function scrapeDetailPage(
  page: Page,
  productUrl: string,
  timeout: number,
): Promise<DetailPageData> {
  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForTimeout(1000);

  return page.evaluate(
    ({ labelSelector, valueSelector, limitedKeywords }) => {
      let price = 0;
      let releaseDate = '';
      let isLimited = false;

      // ------ Extract price and date from dt/dd label pairs ------
      const labels = document.querySelectorAll(labelSelector);
      labels.forEach((dt) => {
        const dd = dt.nextElementSibling;
        if (!dd) return;

        const labelText = dt.textContent?.trim() || '';
        const valueText = dd.textContent?.trim() || '';

        // Price: look for "円" in the value text
        if (
          (labelText.includes('価格') || labelText.includes('希望小売価格')) &&
          valueText.includes('円')
        ) {
          const m = valueText.replace(/,/g, '').match(/(\d+)\s*円/);
          if (m) price = parseInt(m[1], 10);
        }

        // Release date: look for YYYY年MM月 pattern
        if (
          labelText.includes('発売') ||
          labelText.includes('発売日') ||
          labelText.includes('日')
        ) {
          const m = valueText.match(/(\d{4})年\s*(\d{1,2})月/);
          if (m) {
            releaseDate = `${m[1]}-${m[2].padStart(2, '0')}`;
          }
        }
      });

      // ------ Fallback: scan all dd elements for price/date if not found ------
      if (price === 0 || releaseDate === '') {
        const allDds = document.querySelectorAll(valueSelector);
        allDds.forEach((dd) => {
          const text = dd.textContent?.trim() || '';

          if (price === 0 && text.includes('円')) {
            const m = text.replace(/,/g, '').match(/(\d+)\s*円/);
            if (m) price = parseInt(m[1], 10);
          }

          if (releaseDate === '') {
            const m = text.match(/(\d{4})年\s*(\d{1,2})月/);
            if (m) {
              releaseDate = `${m[1]}-${m[2].padStart(2, '0')}`;
            }
          }
        });
      }

      // ------ Limited edition detection ------
      const bodyText = document.body.textContent || '';
      isLimited = limitedKeywords.some((kw: string) => bodyText.includes(kw));

      return { price, releaseDate, isLimited };
    },
    {
      labelSelector: SELECTORS.detailLabel,
      valueSelector: SELECTORS.detailValue,
      limitedKeywords: ['限定', 'P-Bandai', 'プレミアムバンダイ'],
    },
  );
}
