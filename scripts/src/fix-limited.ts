/**
 * fix-limited.ts -- Post-processing script to fix isLimited field.
 *
 * Problem: The scraper marks ALL products as isLimited: true because
 * detail-parser.ts scans document.body.textContent, which always contains
 * navigation text like "限定" or "P-Bandai".
 *
 * Solution (Method A): Determine isLimited from URL domain + product name keywords.
 *
 * Usage:
 *   pnpm tsx scripts/src/fix-limited.ts
 *
 * Outputs:
 *   Overwrites public/data/{hg,rg,mg,pg}.json in-place.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const MANUAL_MAP_PATH = path.join(ROOT_DIR, 'scripts', 'data', 'manual-limited-map.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeriesCode = 'hg' | 'rg' | 'mg' | 'pg';

interface GundamModel {
  id: string;
  series: SeriesCode;
  number: number;
  name: string;
  nameJa?: string;
  price: number;
  priceTaxFree: number;
  releaseDate: string;
  isLimited: boolean;
  imageUrl: string;
  productUrl: string;
  _limitedSource?: string;
  _limitedMethod?: string;
}

interface LimitedResult {
  isLimited: boolean;
  source: string;
}

// ---------------------------------------------------------------------------
// Keyword patterns for name-based detection (Rule 3)
// ---------------------------------------------------------------------------

/**
 * Name keyword rules. Each entry is a [regex, label] pair.
 * Order matters -- first match wins.
 *
 * Note on "プレミアム": We match it but exclude standalone "プレミアムバンダイ"
 * (which is just the P-Bandai brand name, not a product characteristic).
 * The regex uses a negative lookahead to handle this.
 */
const NAME_KEYWORD_RULES: Array<[RegExp, string]> = [
  // --- Exclusion-limited terms ---
  [/限定/, '限定'],
  [/ベース限定/, 'ベース限定'],
  [/SIDE-F限定/, 'SIDE-F限定'],

  // --- Clear / coating / metallic finishes ---
  [/クリアカラー/, 'クリアカラー'],
  [/カラークリア/, 'カラークリア'],
  [/メッキ/, 'メッキ'],
  [/メタリック/, 'メタリック'],
  [/チタニウム/, 'チタニウム'],
  [/スペシャルコーティング/, 'スペシャルコーティング'],
  [/コーティング/, 'コーティング'],
  [/パールグロス/, 'パールグロス'],
  [/グロスインジェクション/, 'グロスインジェクション'],
  [/トランザムクリア/, 'トランザムクリア'],
  [/トランザム[\s　]*\]|トランザム\s*Ver/, 'トランザム'],
  [/コントラストカラー/, 'コントラストカラー'],

  // --- Premium (exclude standalone "プレミアムバンダイ") ---
  [/プレミアム(?!バンダイ)/, 'プレミアム'],

  // --- Sets / memorial ---
  [/メモリアルセット/, 'メモリアルセット'],
  [/記念セット/, '記念セット'],

  // --- Special versions ---
  [/Ver\.GFT/, 'Ver.GFT'],
  [/Ver\.TWC/, 'Ver.TWC'],
  [/Ver\.GCP/, 'Ver.GCP'],

  // --- Collaboration / special MS ---
  [/初音ミク/, '初音ミク'],
  [/RX-93ff/, 'RX-93ff'],
  [/MSN-04FF/, 'MSN-04FF'],
];

// ---------------------------------------------------------------------------
// Manual override map (loaded once)
// ---------------------------------------------------------------------------

let manualOverrides: Record<string, boolean> = {};

async function loadManualOverrides(): Promise<void> {
  try {
    const raw = await fs.readFile(MANUAL_MAP_PATH, 'utf-8');
    const data = JSON.parse(raw) as { overrides: Record<string, boolean> };
    manualOverrides = data.overrides ?? {};
    const count = Object.keys(manualOverrides).length;
    if (count > 0) {
      console.log(`已加载手动映射表: ${count} 条覆盖规则`);
    }
  } catch {
    manualOverrides = {};
  }
}

// ---------------------------------------------------------------------------
// Core detection logic
// ---------------------------------------------------------------------------

/**
 * Determine whether a product is limited based on:
 *   0. Manual override map (highest priority)
 *   1. URL domain
 *   2. Name keywords
 *   3. Default: not limited
 */
function detectLimited(product: GundamModel): LimitedResult {
  const { productUrl } = product;
  // Use Japanese name for keyword matching (name may already be translated to Chinese)
  const nameForMatch = product.nameJa || product.name;

  // Rule 0: Manual override (highest priority)
  if (productUrl in manualOverrides) {
    const isLimited = manualOverrides[productUrl];
    return { isLimited, source: isLimited ? '手动标注:限定' : '手动标注:通贩' };
  }

  // Rule 1: P-Bandai domain
  if (productUrl.includes('p-bandai.jp')) {
    return { isLimited: true, source: 'URL域名:P-Bandai' };
  }

  // Rule 2: Gundam Base domain
  if (productUrl.includes('gundam-base.net')) {
    return { isLimited: true, source: 'URL域名:GundamBase' };
  }

  // Rule 3: Name keywords (match against Japanese name)
  for (const [pattern, label] of NAME_KEYWORD_RULES) {
    if (pattern.test(nameForMatch)) {
      return { isLimited: true, source: `名称关键词:${label}` };
    }
  }

  // Rule 4: Default -- not limited
  return { isLimited: false, source: '' };
}

// ---------------------------------------------------------------------------
// Processing pipeline
// ---------------------------------------------------------------------------

interface SeriesStats {
  series: SeriesCode;
  total: number;
  regular: number;
  limited: number;
  sources: Record<string, number>;
}

/**
 * Process a single series: apply detection rules, re-number IDs, write output.
 * Also returns an old-ID -> new-ID migration map for favorites migration.
 */
async function processSeries(
  series: SeriesCode,
): Promise<{ stats: SeriesStats; migrationMap: Record<string, string> }> {
  const filePath = path.join(DATA_DIR, `${series}.json`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const products: GundamModel[] = JSON.parse(raw);

  // Classify each product
  const classified = products.map((product) => {
    const result = detectLimited(product);
    return { product, ...result };
  });

  // Separate into regular vs limited (preserving original order)
  const regulars = classified.filter((c) => !c.isLimited);
  const limiteds = classified.filter((c) => c.isLimited);

  // Build migration map: oldId -> newId
  const migrationMap: Record<string, string> = {};

  // Re-number: regular products get {series}-{NNN}
  const regularModels: GundamModel[] = regulars.map((c, idx) => {
    const newId = `${series}-${String(idx + 1).padStart(3, '0')}`;
    if (c.product.id !== newId) {
      migrationMap[c.product.id] = newId;
    }
    return {
      ...c.product,
      id: newId,
      number: idx + 1,
      isLimited: false,
      _limitedSource: '',
      _limitedMethod: 'method_a',
    };
  });

  // Re-number: limited products get {series}-l-{NNN}
  const limitedModels: GundamModel[] = limiteds.map((c, idx) => {
    const newId = `${series}-l-${String(idx + 1).padStart(3, '0')}`;
    if (c.product.id !== newId) {
      migrationMap[c.product.id] = newId;
    }
    return {
      ...c.product,
      id: newId,
      number: idx + 1,
      isLimited: true,
      _limitedSource: c.source,
      _limitedMethod: 'method_a',
    };
  });

  // Combine: regular first, then limited
  const output = [...regularModels, ...limitedModels];

  // Write back
  await fs.writeFile(filePath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  // Collect stats
  const sources: Record<string, number> = {};
  for (const c of limiteds) {
    sources[c.source] = (sources[c.source] || 0) + 1;
  }

  return {
    stats: {
      series,
      total: products.length,
      regular: regulars.length,
      limited: limiteds.length,
      sources,
    },
    migrationMap,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ALL_SERIES: SeriesCode[] = ['hg', 'rg', 'mg', 'pg'];

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('fix-limited.ts -- 方案A: URL + 名称关键词判定');
  console.log('='.repeat(60));
  console.log();

  await loadManualOverrides();

  const allStats: SeriesStats[] = [];
  const allMigrationMap: Record<string, string> = {};

  for (const series of ALL_SERIES) {
    const { stats, migrationMap } = await processSeries(series);
    allStats.push(stats);
    Object.assign(allMigrationMap, migrationMap);
  }

  // Write migration map for favorites migration (used by favoriteService.ts)
  const migrationPath = path.join(DATA_DIR, 'id-migration.json');
  await fs.writeFile(
    migrationPath,
    JSON.stringify(allMigrationMap, null, 2) + '\n',
    'utf-8',
  );
  console.log(`ID 迁移映射已写入: ${migrationPath}`);
  console.log(`  共 ${Object.keys(allMigrationMap).length} 条映射`);
  console.log();

  // Print summary
  console.log('-'.repeat(60));
  console.log('统计汇总');
  console.log('-'.repeat(60));

  let totalRegular = 0;
  let totalLimited = 0;

  for (const stats of allStats) {
    totalRegular += stats.regular;
    totalLimited += stats.limited;

    console.log();
    console.log(`[${stats.series.toUpperCase()}] 总计: ${stats.total}`);
    console.log(`  通贩: ${stats.regular}`);
    console.log(`  限定: ${stats.limited}`);

    if (Object.keys(stats.sources).length > 0) {
      console.log('  判定来源:');
      // Sort sources by count descending
      const sorted = Object.entries(stats.sources).sort((a, b) => b[1] - a[1]);
      for (const [source, count] of sorted) {
        console.log(`    ${source}: ${count}`);
      }
    }
  }

  console.log();
  console.log('-'.repeat(60));
  console.log(`全系列合计: 通贩 ${totalRegular}, 限定 ${totalLimited}, 总计 ${totalRegular + totalLimited}`);
  console.log('-'.repeat(60));
  console.log();
  console.log('已覆盖写入 public/data/{hg,rg,mg,pg}.json');
  console.log('已生成 public/data/id-migration.json');
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});
