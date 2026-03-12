# 限定产品子分类系统设计

## 概述

将限定产品从简单的 `isLimited: boolean` 二值分类，细化为 5 种分销渠道子类型，并在前端提供子过滤和按类型配色的 Badge。

## 背景

万代官网（bandai-hobby.net）使用 5 种销售渠道分类：

| 分类 | 日文 | URL参数 |
|------|------|---------|
| 一般贩卖（通贩） | 一般店頭販売 | `general=1` |
| P-Bandai 限定 | プレミアムバンダイ限定 | `online=1` |
| Gundam Base 限定 | ガンダムベース限定 | `gbase=1` |
| 活动限定 | イベント限定 | `event=1` |
| GUNDAM SIDE-F 限定 | GUNDAM SIDE-F | `gsidef=1` |

当前项目仅使用 `isLimited: boolean` 做二值分类，无法区分限定的具体来源。

## 数据模型

### 新增类型

```typescript
type LimitedType = 'pbandai' | 'gbase' | 'event' | 'sidef' | 'other';
```

### GundamModel 变更

```typescript
interface GundamModel {
  // 现有字段全部保留
  isLimited: boolean;         // 保留，向后兼容
  limitedType?: LimitedType;  // 新增，限定子类型（通贩产品不设此字段）
}
```

前端对旧数据（不含 `limitedType`）的 fallback：当 `isLimited === true` 但 `limitedType` 缺失时，视为 `'other'`。

## 判定口径（fix-limited.ts）

采用 first-match-wins 策略，按以下优先级顺序逐条匹配，命中即停止。特异性高的规则必须排在泛化规则之前。

| 优先级 | 规则 | isLimited | limitedType |
|--------|------|-----------|-------------|
| 0 | 手动覆盖映射 | 映射中指定 | 映射中指定 |
| 1 | URL 含 `p-bandai.jp` | `true` | `pbandai` |
| 2 | URL 含 `gundam-base.net` | `true` | `gbase` |
| 3 | 名称含 `SIDE-F限定` 或 `SIDE-F` | `true` | `sidef` |
| 4 | 名称含 `ベース限定` 或 `ガンダムベース` | `true` | `gbase` |
| 5 | 名称含 `イベント限定` 或 `イベント` | `true` | `event` |
| 6 | 名称含 `限定`（泛化匹配，排在 3/4/5 之后） | `true` | `other` |
| 7 | 名称含特殊涂装关键词（見下表） | `true` | `other` |
| 8 | 名称含特殊版本/联动关键词（見下表） | `true` | `other` |
| 9 | 以上均不匹配 | `false` | 不设 |

### 规则 7 — 特殊涂装关键词

`クリアカラー`、`カラークリア`、`メッキ`、`メタリック`、`チタニウム`、`スペシャルコーティング`、`コーティング`、`パールグロス`、`グロスインジェクション`、`トランザムクリア`、`トランザム Ver`、`コントラストカラー`

注意：这些关键词仅能确定产品为限定品，但无法确定具体渠道（可能是 P-Bandai 也可能是 Gundam Base），因此统一归为 `other`。如果产品已被 URL 规则（优先级 1-2）或名称中的渠道关键词（优先级 3-5）命中，则不会到达此规则。

### 规则 8 — 特殊版本/联动关键词

`プレミアム(?!バンダイ)`、`メモリアルセット`、`記念セット`、`Ver.GFT`、`Ver.TWC`、`Ver.GCP`、`初音ミク`、`RX-93ff`、`MSN-04FF`

### 手动覆盖映射格式变更

```json
{
  "overrides": {
    "https://bandai-hobby.net/item/01_3893/": { "isLimited": true, "limitedType": "gbase" }
  }
}
```

规则：
- `isLimited: true` 时 `limitedType` 必填，不指定则默认 `other`
- `isLimited: false` 时忽略 `limitedType`
- 现有 10 条旧格式覆盖规则（`url: true`）迁移：保留 `isLimited: true`，`limitedType` 默认 `other`，后续人工校正

## 前端设计

### 1. 水平药丸标签组件（LimitedSubFilter）

- **位置**：限定 Tab 激活后，在 CategoryTabs 和 SortSelector 之间
- **显示/隐藏**：切到通贩 Tab 时隐藏，切回限定 Tab 时 slide-down 动画展开
- **状态记忆**：切换 Tab 时记住上次子分类选择
- **默认选中**："全部"
- **药丸内容**：`全部 (35)` `P-Bandai (22)` `高达基地 (8)` `活动限定 (3)` `SIDE-F (1)` `其他 (1)`
- **计数规则**：显示当前系列该子类型的总数（不受搜索/排序/其他筛选影响），确保用户对总量有预期
- **药丸样式**：
  - 选中态：蓝底白字（`#0071e3`）
  - 未选中：浅灰底黑字（`rgba(0,0,0,0.06)`）
- **布局**：左对齐，可横向滚动，隐藏滚动条。手机屏幕上 6 个选项大多可一行显示
- **数量为 0 的标签**：仍然显示但灰色不可点击，如 `SIDE-F (0)`

### 2. Badge 按类型配色（ModelCard）

扩展现有 Badge 组件，新增 5 个 variant，颜色定义为 CSS 变量以保持设计系统一致性。

| limitedType | variant 名 | 标签文字 | 背景色 CSS 变量 | 默认值 |
|-------------|-----------|---------|----------------|--------|
| `pbandai` | `pbandai` | P-Bandai | `--color-badge-pbandai` | `#0071e3` 蓝 |
| `gbase` | `gbase` | 高达基地 | `--color-badge-gbase` | `#ff9500` 橙 |
| `event` | `event` | 活动限定 | `--color-badge-event` | `#af52de` 紫 |
| `sidef` | `sidef` | SIDE-F | `--color-badge-sidef` | `#30b0c7` 青 |
| `other` | `danger` | 限定 | 保持现有 | `#ff3b30` 红 |

当 `isLimited === true` 但 `limitedType` 缺失时，fallback 使用 `danger` variant 显示「限定」。

### 3. 筛选逻辑（SeriesListPage）

- 新增 state：`limitedSubFilter: 'all' | LimitedType`
- 过滤链路：`limitedModels → 按 limitedSubFilter 过滤 → 搜索/排序/其他筛选`

## 文件变动

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/types/model.ts` | 修改 | 新增 `LimitedType`，GundamModel 加 `limitedType` |
| `src/components/LimitedSubFilter/index.tsx` | 新建 | 水平药丸标签组件 |
| `src/components/LimitedSubFilter/styles.module.css` | 新建 | 组件样式 |
| `src/components/ModelCard/index.tsx` | 修改 | Badge 根据 limitedType 显示不同文字和颜色 |
| `src/design-system/Badge/index.tsx` | 修改 | 新增 pbandai/gbase/event/sidef variant |
| `src/design-system/Badge/styles.module.css` | 修改 | 新增 variant 颜色样式 |
| `src/pages/SeriesListPage/index.tsx` | 修改 | 集成 LimitedSubFilter，新增筛选逻辑 |
| `scripts/src/types.ts` | 修改 | 新增 LimitedType |
| `scripts/src/fix-limited.ts` | 修改 | 判定逻辑改为输出 limitedType |
| `scripts/data/manual-limited-map.json` | 修改 | 格式扩展支持 limitedType |

## 数据迁移

- 运行更新后的 `fix-limited.ts` 即可为所有现有产品生成 `limitedType` 字段
- 该脚本在每次 scrape 后都应运行（现有流程不变）
- 前端对旧数据有 fallback（`isLimited && !limitedType` → 视为 `other`）
