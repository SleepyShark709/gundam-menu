# 限定产品子分类系统实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将限定产品从 boolean 分类细化为 5 种分销渠道子类型（P-Bandai / 高达基地 / 活动限定 / SIDE-F / 其他），前端增加药丸标签子过滤和按类型配色 Badge。

**Architecture:** 数据层先行 — 扩展 types、修改 fix-limited.ts 判定逻辑输出 limitedType；然后前端 — 扩展 Badge 组件、修改 ModelCard、新建 LimitedSubFilter 组件、集成到 SeriesListPage。

**Tech Stack:** TypeScript, React, CSS Modules, framer-motion

**Spec:** `docs/superpowers/specs/2026-03-12-limited-subtype-classification-design.md`

---

## File Structure

| 文件 | 职责 | 操作 |
|------|------|------|
| `scripts/src/types.ts` | 爬虫类型定义 | 修改：新增 LimitedType，GundamModel 加 limitedType |
| `scripts/src/fix-limited.ts` | 限定判定后处理脚本 | 修改：重写检测逻辑输出 limitedType |
| `scripts/data/manual-limited-map.json` | 手动覆盖映射 | 修改：扩展格式支持 limitedType |
| `src/types/model.ts` | 前端类型定义 | 修改：新增 LimitedType，GundamModel 加 limitedType |
| `src/types/index.ts` | 类型导出 | 修改：导出 LimitedType |
| `src/styles/variables.css` | CSS 变量 | 修改：新增 Badge 颜色变量 |
| `src/design-system/Badge/index.tsx` | Badge 组件 | 修改：新增 4 个 variant |
| `src/design-system/Badge/styles.module.css` | Badge 样式 | 修改：新增 4 个 variant 样式 |
| `src/components/LimitedSubFilter/index.tsx` | 水平药丸标签组件 | 新建 |
| `src/components/LimitedSubFilter/styles.module.css` | 药丸标签样式 | 新建 |
| `src/components/ModelCard/index.tsx` | 模型卡片 | 修改：Badge 按 limitedType 配色 |
| `src/pages/SeriesListPage/index.tsx` | 系列列表页 | 修改：集成子过滤 |

---

## Chunk 1: 数据层改动

### Task 1: 扩展类型定义

**Files:**
- Modify: `scripts/src/types.ts:9,47-59`
- Modify: `src/types/model.ts:1-17`
- Modify: `src/types/index.ts:1-4`

- [ ] **Step 1: 修改 `scripts/src/types.ts`**

在 `SeriesCode` 类型后面新增 `LimitedType`，并在 `GundamModel` 中添加字段：

```typescript
// 在第 9 行 SeriesCode 之后添加
export type LimitedType = 'pbandai' | 'gbase' | 'event' | 'sidef' | 'other';
```

在 `GundamModel` 接口（第 47-59 行）的 `isLimited: boolean` 之后添加：

```typescript
  limitedType?: LimitedType;  // 限定子类型（通贩不设此字段）
```

- [ ] **Step 2: 修改 `src/types/model.ts`**

在 `SeriesCode` 之后添加 `LimitedType`，在 `GundamModel` 的 `isLimited` 之后添加 `limitedType`：

```typescript
export type SeriesCode = 'hg' | 'rg' | 'mg' | 'pg';

export type LimitedType = 'pbandai' | 'gbase' | 'event' | 'sidef' | 'other';

export interface GundamModel {
  id: string;
  series: SeriesCode;
  number: number;
  name: string;
  nameJa: string;
  nameEn?: string;
  price: number;
  priceTaxFree: number;
  releaseDate: string;
  isLimited: boolean;
  limitedType?: LimitedType;
  imageUrl: string;
  productUrl: string;
  tags?: string[];
}
```

- [ ] **Step 3: 修改 `src/types/index.ts` 导出 LimitedType**

```typescript
export type { SeriesCode, GundamModel, LimitedType } from './model';
export type { SeriesMeta } from './series';
export type { FilterConfig, SortConfig } from './filter';
```

- [ ] **Step 4: 确认 TypeScript 编译通过**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add scripts/src/types.ts src/types/model.ts src/types/index.ts
git commit -m "feat: 新增 LimitedType 类型定义"
```

---

### Task 2: 更新手动覆盖映射格式

**Files:**
- Modify: `scripts/data/manual-limited-map.json`

- [ ] **Step 1: 更新 `manual-limited-map.json` 格式**

将现有 `url: true` 格式迁移为 `url: { isLimited: true, limitedType: "other" }`：

```json
{
  "_comment": "手动标注限定产品。格式：productUrl -> { isLimited, limitedType }。",
  "overrides": {
    "https://bandai-hobby.net/item/01_3893/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_2531/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_3307/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_5532/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_6994/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_7047/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_1290/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_2066/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_5394/": { "isLimited": true, "limitedType": "other" },
    "https://bandai-hobby.net/item/01_6854/": { "isLimited": true, "limitedType": "other" }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add scripts/data/manual-limited-map.json
git commit -m "feat: 更新手动覆盖映射格式，支持 limitedType"
```

---

### Task 3: 重写 fix-limited.ts 判定逻辑

**Files:**
- Modify: `scripts/src/fix-limited.ts`

- [ ] **Step 1: 更新类型导入和接口定义**

修改文件顶部的类型部分（约第 35-56 行），使用新的 LimitedType 和更新 LimitedResult：

```typescript
import type { LimitedType } from './types.js';

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
  limitedType?: LimitedType;
  imageUrl: string;
  productUrl: string;
  _limitedSource?: string;
  _limitedMethod?: string;
}

interface LimitedResult {
  isLimited: boolean;
  limitedType?: LimitedType;
  source: string;
}
```

- [ ] **Step 2: 重写关键词规则为按 limitedType 分组**

替换现有的 `NAME_KEYWORD_RULES` 数组（第 70-106 行）。新规则严格按 first-match-wins 顺序排列，特异性高的在前。

**注意：** 旧代码中 `/限定/` 排在 `/ベース限定/` 之前，导致后者永远不会被匹配（bug）。新规则修复了此问题，将特异性高的渠道规则放在泛化 `限定` 之前。这会改变部分产品的分类来源标记。

```typescript
/**
 * Name keyword rules grouped by limitedType.
 * Order matters -- first match wins.
 * Specific channel identifiers (SIDE-F, Gundam Base, Event, P-Bandai) must
 * come BEFORE the generic "限定" catch-all.
 */
const NAME_KEYWORD_RULES: Array<[RegExp, LimitedType, string]> = [
  // --- Channel-specific (highest specificity) ---
  [/SIDE-F限定|SIDE-F/, 'sidef', 'SIDE-F'],
  [/ベース限定|ガンダムベース/, 'gbase', 'ガンダムベース'],
  [/イベント限定/, 'event', 'イベント限定'],
  [/プレミアムバンダイ限定|P-Bandai/, 'pbandai', 'P-Bandai(名称)'],

  // --- Generic "限定" catch-all (after specific channels) ---
  [/限定/, 'other', '限定'],

  // --- Special coating / finishes ---
  [/クリアカラー/, 'other', 'クリアカラー'],
  [/カラークリア/, 'other', 'カラークリア'],
  [/メッキ/, 'other', 'メッキ'],
  [/メタリック/, 'other', 'メタリック'],
  [/チタニウム/, 'other', 'チタニウム'],
  [/スペシャルコーティング/, 'other', 'スペシャルコーティング'],
  [/コーティング/, 'other', 'コーティング'],
  [/パールグロス/, 'other', 'パールグロス'],
  [/グロスインジェクション/, 'other', 'グロスインジェクション'],
  [/トランザムクリア/, 'other', 'トランザムクリア'],
  [/トランザム[\s　]*\]|トランザム\s*Ver/, 'other', 'トランザム'],
  [/コントラストカラー/, 'other', 'コントラストカラー'],

  // --- Premium (exclude standalone "プレミアムバンダイ") ---
  [/プレミアム(?!バンダイ)/, 'other', 'プレミアム'],

  // --- Sets / memorial ---
  [/メモリアルセット/, 'other', 'メモリアルセット'],
  [/記念セット/, 'other', '記念セット'],

  // --- Special versions ---
  [/Ver\.GFT/, 'other', 'Ver.GFT'],
  [/Ver\.TWC/, 'other', 'Ver.TWC'],
  [/Ver\.GCP/, 'other', 'Ver.GCP'],

  // --- Collaboration / special MS ---
  [/初音ミク/, 'other', '初音ミク'],
  [/RX-93ff/, 'other', 'RX-93ff'],
  [/MSN-04FF/, 'other', 'MSN-04FF'],
];
```

- [ ] **Step 3: 更新手动覆盖加载逻辑**

修改 `loadManualOverrides` 和 `manualOverrides` 的类型，支持新格式（兼容旧格式）：

```typescript
interface ManualOverride {
  isLimited: boolean;
  limitedType?: LimitedType;
}

let manualOverrides: Record<string, ManualOverride> = {};

async function loadManualOverrides(): Promise<void> {
  try {
    const raw = await fs.readFile(MANUAL_MAP_PATH, 'utf-8');
    const data = JSON.parse(raw) as { overrides: Record<string, boolean | ManualOverride> };
    const rawOverrides = data.overrides ?? {};
    manualOverrides = {};
    for (const [url, value] of Object.entries(rawOverrides)) {
      if (typeof value === 'boolean') {
        // Legacy format: url -> true/false
        manualOverrides[url] = { isLimited: value, limitedType: value ? 'other' : undefined };
      } else {
        manualOverrides[url] = value;
      }
    }
    const count = Object.keys(manualOverrides).length;
    if (count > 0) {
      console.log(`已加载手动映射表: ${count} 条覆盖规则`);
    }
  } catch {
    manualOverrides = {};
  }
}
```

- [ ] **Step 4: 重写 detectLimited 函数**

```typescript
function detectLimited(product: GundamModel): LimitedResult {
  const { productUrl } = product;
  const nameForMatch = product.nameJa || product.name;

  // Rule 0: Manual override (highest priority)
  if (productUrl in manualOverrides) {
    const override = manualOverrides[productUrl];
    return {
      isLimited: override.isLimited,
      limitedType: override.isLimited ? (override.limitedType ?? 'other') : undefined,
      source: override.isLimited ? `手动标注:限定(${override.limitedType ?? 'other'})` : '手动标注:通贩',
    };
  }

  // Rule 1: P-Bandai domain
  if (productUrl.includes('p-bandai.jp')) {
    return { isLimited: true, limitedType: 'pbandai', source: 'URL域名:P-Bandai' };
  }

  // Rule 2: Gundam Base domain
  if (productUrl.includes('gundam-base.net')) {
    return { isLimited: true, limitedType: 'gbase', source: 'URL域名:GundamBase' };
  }

  // Rule 3-8: Name keywords (first-match-wins, specific before generic)
  for (const [pattern, limitedType, label] of NAME_KEYWORD_RULES) {
    if (pattern.test(nameForMatch)) {
      return { isLimited: true, limitedType, source: `名称关键词:${label}` };
    }
  }

  // Rule 9: Default -- not limited
  return { isLimited: false, source: '' };
}
```

- [ ] **Step 5: 更新 processSeries 中的模型输出**

在 `processSeries` 函数中，`regularModels` 和 `limitedModels` 的 map 回调需要输出 `limitedType`。

修改 `regularModels` 的 map（约第 208-221 行）：

```typescript
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
      limitedType: undefined,
      _limitedSource: '',
      _limitedMethod: 'method_a',
    };
  });
```

修改 `limitedModels` 的 map（约第 224-237 行）：

```typescript
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
      limitedType: c.limitedType,
      _limitedSource: c.source,
      _limitedMethod: 'method_a',
    };
  });
```

- [ ] **Step 6: 更新统计输出，显示 limitedType 分布**

在 `main` 函数的统计输出部分（约第 305-322 行），在打印 sources 之后，增加 limitedType 分布统计。修改 `SeriesStats` 接口：

```typescript
interface SeriesStats {
  series: SeriesCode;
  total: number;
  regular: number;
  limited: number;
  sources: Record<string, number>;
  typeDistribution: Record<string, number>;
}
```

在 `processSeries` 的统计收集部分（约第 246-249 行），增加 typeDistribution：

```typescript
  const typeDistribution: Record<string, number> = {};
  for (const c of limiteds) {
    const lt = c.limitedType ?? 'other';
    typeDistribution[lt] = (typeDistribution[lt] || 0) + 1;
  }
```

并在返回值中包含 `typeDistribution`。

在 `main` 的打印循环中（约第 310-322 行），增加打印：

```typescript
    if (Object.keys(stats.typeDistribution).length > 0) {
      console.log('  限定类型分布:');
      const sortedTypes = Object.entries(stats.typeDistribution).sort((a, b) => b[1] - a[1]);
      for (const [type, count] of sortedTypes) {
        console.log(`    ${type}: ${count}`);
      }
    }
```

- [ ] **Step 7: 运行脚本验证**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm tsx scripts/src/fix-limited.ts`
Expected: 脚本成功运行，输出中显示各系列的限定类型分布（pbandai、gbase、other 等）

- [ ] **Step 8: 检查输出数据**

Run: `python3 -c "import json; data=json.load(open('public/data/rg.json')); limited=[d for d in data if d.get('isLimited')]; types={}; [types.update({d.get('limitedType','none'):types.get(d.get('limitedType','none'),0)+1}) for d in limited]; print(types)"`
Expected: 输出包含 `pbandai`、`gbase`、`other` 等类型的计数

- [ ] **Step 9: 提交**

```bash
git add scripts/src/fix-limited.ts scripts/data/manual-limited-map.json public/data/
git commit -m "feat: fix-limited.ts 输出 limitedType 子分类"
```

---

## Chunk 2: 前端改动

### Task 4: 扩展 Badge 组件

**前提条件：** Chunk 1（Tasks 1-3）必须先完成，`LimitedType` 已在 `src/types/index.ts` 中导出。

**Files:**
- Modify: `src/styles/variables.css`
- Modify: `src/design-system/Badge/index.tsx`
- Modify: `src/design-system/Badge/styles.module.css`

- [ ] **Step 1: 在 `src/styles/variables.css` 中添加 Badge 颜色变量**

在 `--color-accent-success` 之后添加：

```css
  --color-badge-pbandai: #0071e3;
  --color-badge-gbase: #ff9500;
  --color-badge-event: #af52de;
  --color-badge-sidef: #30b0c7;
```

- [ ] **Step 2: 修改 Badge 组件支持新 variant**

修改 `src/design-system/Badge/index.tsx`：

```typescript
import type { ReactNode } from 'react';
import styles from './styles.module.css';

type BadgeVariant = 'default' | 'danger' | 'pbandai' | 'gbase' | 'event' | 'sidef';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export type { BadgeVariant };

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className ?? ''].join(' ')}>
      {children}
    </span>
  );
}
```

- [ ] **Step 3: 添加新 variant 样式**

在 `src/design-system/Badge/styles.module.css` 的 `.danger` 之后追加：

```css
.pbandai {
  background: rgba(0, 113, 227, 0.15);
  color: var(--color-badge-pbandai);
  border: 1px solid rgba(0, 113, 227, 0.3);
}

.gbase {
  background: rgba(255, 149, 0, 0.15);
  color: var(--color-badge-gbase);
  border: 1px solid rgba(255, 149, 0, 0.3);
}

.event {
  background: rgba(175, 82, 222, 0.15);
  color: var(--color-badge-event);
  border: 1px solid rgba(175, 82, 222, 0.3);
}

.sidef {
  background: rgba(48, 176, 199, 0.15);
  color: var(--color-badge-sidef);
  border: 1px solid rgba(48, 176, 199, 0.3);
}
```

- [ ] **Step 4: 确认编译通过**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/styles/variables.css src/design-system/Badge/
git commit -m "feat: Badge 组件新增 pbandai/gbase/event/sidef variant"
```

---

### Task 5: 修改 ModelCard Badge 按类型配色

**Files:**
- Modify: `src/components/ModelCard/index.tsx`

- [ ] **Step 1: 添加 limitedType 到 Badge 的映射**

在 `ModelCard` 组件文件中，导入相关类型，并在组件函数外部添加映射常量：

```typescript
import type { GundamModel, LimitedType } from '../../types';
import type { BadgeVariant } from '../../design-system/Badge';
```

在组件函数外部添加：

```typescript
const LIMITED_BADGE_CONFIG: Record<LimitedType, { label: string; variant: BadgeVariant }> = {
  pbandai: { label: 'P-Bandai', variant: 'pbandai' },
  gbase:   { label: '高达基地', variant: 'gbase' },
  event:   { label: '活动限定', variant: 'event' },
  sidef:   { label: 'SIDE-F', variant: 'sidef' },
  other:   { label: '限定', variant: 'danger' },
};
```

- [ ] **Step 2: 修改 Badge 渲染逻辑**

将 ModelCard 中的 Badge 渲染（约第 97-101 行）从：

```tsx
{model.isLimited && (
  <div className={styles.limitedBadge}>
    <Badge variant="danger">限定</Badge>
  </div>
)}
```

修改为：

```tsx
{model.isLimited && (
  <div className={styles.limitedBadge}>
    <Badge variant={LIMITED_BADGE_CONFIG[model.limitedType ?? 'other'].variant}>
      {LIMITED_BADGE_CONFIG[model.limitedType ?? 'other'].label}
    </Badge>
  </div>
)}
```

- [ ] **Step 3: 确认编译通过**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/components/ModelCard/index.tsx
git commit -m "feat: ModelCard Badge 按 limitedType 显示不同文字和颜色"
```

---

### Task 6: 新建 LimitedSubFilter 组件

**Files:**
- Create: `src/components/LimitedSubFilter/index.tsx`
- Create: `src/components/LimitedSubFilter/styles.module.css`

- [ ] **Step 1: 创建组件文件 `src/components/LimitedSubFilter/index.tsx`**

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import type { LimitedType, GundamModel } from '../../types';
import styles from './styles.module.css';

export type LimitedSubFilterValue = 'all' | LimitedType;

interface LimitedSubFilterProps {
  value: LimitedSubFilterValue;
  onChange: (value: LimitedSubFilterValue) => void;
  models: GundamModel[];
  visible: boolean;
}

const SUB_FILTERS: { key: LimitedSubFilterValue; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pbandai', label: 'P-Bandai' },
  { key: 'gbase', label: '高达基地' },
  { key: 'event', label: '活动限定' },
  { key: 'sidef', label: 'SIDE-F' },
  { key: 'other', label: '其他' },
];

function getCountByType(models: GundamModel[]): Record<LimitedSubFilterValue, number> {
  const counts: Record<string, number> = { all: models.length };
  for (const m of models) {
    const type = m.limitedType ?? 'other';
    counts[type] = (counts[type] || 0) + 1;
  }
  // Ensure all keys exist
  for (const f of SUB_FILTERS) {
    if (!(f.key in counts)) counts[f.key] = 0;
  }
  return counts as Record<LimitedSubFilterValue, number>;
}

export default function LimitedSubFilter({
  value,
  onChange,
  models,
  visible,
}: LimitedSubFilterProps) {
  const counts = getCountByType(models);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.container}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        >
          <div className={styles.scrollArea}>
            {SUB_FILTERS.map((filter) => {
              const count = counts[filter.key];
              const isActive = value === filter.key;
              const isDisabled = count === 0 && filter.key !== 'all';

              return (
                <button
                  key={filter.key}
                  className={[
                    styles.pill,
                    isActive ? styles.pillActive : '',
                    isDisabled ? styles.pillDisabled : '',
                  ].join(' ')}
                  onClick={() => !isDisabled && onChange(filter.key)}
                  disabled={isDisabled}
                  type="button"
                >
                  {filter.label}
                  <span className={styles.pillCount}>({count})</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: 创建样式文件 `src/components/LimitedSubFilter/styles.module.css`**

```css
.container {
  overflow: hidden;
  flex-shrink: 0;
  padding: 0 var(--spacing-md);
}

.scrollArea {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.scrollArea::-webkit-scrollbar {
  display: none;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 100px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.pill:active {
  opacity: 0.7;
}

.pillActive {
  background: #0071e3;
  color: #fff;
}

.pillDisabled {
  opacity: 0.35;
  cursor: default;
}

.pillDisabled:active {
  opacity: 0.35;
}

.pillCount {
  font-weight: 400;
}
```

- [ ] **Step 3: 确认编译通过**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/components/LimitedSubFilter/
git commit -m "feat: 新建 LimitedSubFilter 水平药丸标签组件"
```

---

### Task 7: 集成到 SeriesListPage

**Files:**
- Modify: `src/pages/SeriesListPage/index.tsx`

- [ ] **Step 1: 添加导入**

在文件顶部的导入区域添加：

```typescript
import LimitedSubFilter from '../../components/LimitedSubFilter';
import type { LimitedSubFilterValue } from '../../components/LimitedSubFilter';
```

- [ ] **Step 2: 添加 limitedSubFilter state**

在 `const [activeTab, setActiveTab] = useState<TabType>('regular');` 之后添加：

```typescript
  // Limited sub-filter
  const [limitedSubFilter, setLimitedSubFilter] = useState<LimitedSubFilterValue>('all');
```

- [ ] **Step 3: 修改 processedModels 逻辑**

修改 `processedModels` 的 useMemo（约第 126-131 行），在 tabModels 选取后增加子过滤：

```typescript
  const processedModels = useMemo(() => {
    const tabModels = activeTab === 'regular' ? regularModels : limitedModels;
    // Apply limited sub-filter
    const subFiltered = activeTab === 'limited' && limitedSubFilter !== 'all'
      ? tabModels.filter(m => (m.limitedType ?? 'other') === limitedSubFilter)
      : tabModels;
    const filtered = filterModels(subFiltered, filterConfig);
    const sortConfig = parseSortValue(sortValue);
    return sortModels(filtered, sortConfig);
  }, [activeTab, regularModels, limitedModels, limitedSubFilter, filterConfig, sortValue]);
```

- [ ] **Step 4: 在 JSX 中插入 LimitedSubFilter 组件**

在 CategoryTabs 和 SortSelector 之间（约第 170-184 行），在 `</CategoryTabs>` 之后插入：

```tsx
        {/* Limited sub-filter */}
        <LimitedSubFilter
          value={limitedSubFilter}
          onChange={setLimitedSubFilter}
          models={limitedModels}
          visible={activeTab === 'limited'}
        />
```

- [ ] **Step 5: 确认编译通过**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: 启动开发服务器验证**

Run: `cd /Users/shark_kuaishou/personal-project/gundam-search && pnpm dev`

手动验证：
1. 打开浏览器访问开发服务器
2. 进入任意系列（如 RG）
3. 点击"限定"Tab，确认药丸标签出现且带 slide-down 动画
4. 点击不同的药丸标签，确认筛选正常
5. 切到"通贩"Tab，确认药丸标签消失
6. 切回"限定"Tab，确认记住上次选择
7. 确认 Badge 颜色按类型显示正确

- [ ] **Step 7: 提交**

```bash
git add src/pages/SeriesListPage/index.tsx
git commit -m "feat: SeriesListPage 集成 LimitedSubFilter 子过滤"
```
