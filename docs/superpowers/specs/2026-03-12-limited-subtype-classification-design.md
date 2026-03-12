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

## 判定口径（fix-limited.ts）

优先级从高到低：

| 优先级 | 规则 | limitedType |
|--------|------|-------------|
| 0 | 手动覆盖映射（扩展为支持 limitedType） | 映射中指定 |
| 1 | URL 含 `p-bandai.jp` | `pbandai` |
| 2 | URL 含 `gundam-base.net` | `gbase` |
| 3 | 名称含 `SIDE-F限定` / `SIDE-F` | `sidef` |
| 4 | 名称含 `ベース限定` / `ガンダムベース` | `gbase` |
| 5 | 名称含 `限定` + 其他限定关键词 | 根据上下文判断，无法确定则 `other` |
| 6 | 名称含特殊涂装关键词（クリアカラー、メッキ、コーティング、チタニウム等） | `pbandai` |
| 7 | 默认 | 通贩，不设 limitedType |

### 手动覆盖映射格式变更

```json
{
  "overrides": {
    "https://bandai-hobby.net/item/01_3893/": { "isLimited": true, "limitedType": "gbase" }
  }
}
```

## 前端设计

### 1. 水平药丸标签组件（LimitedSubFilter）

- **位置**：限定 Tab 激活后，在 CategoryTabs 和 SortSelector 之间
- **显示/隐藏**：切到通贩 Tab 时隐藏，切回限定 Tab 时 slide-down 动画展开
- **状态记忆**：切换 Tab 时记住上次子分类选择
- **默认选中**："全部"
- **药丸样式**：
  - 选中态：蓝底白字（`#0071e3`）
  - 未选中：浅灰底黑字（`rgba(0,0,0,0.06)`）
- **数量显示**：每个药丸后显示数量，如 `P-Bandai (22)`
- **布局**：可横向滚动，隐藏滚动条

### 2. Badge 按类型配色（ModelCard）

| limitedType | 标签文字 | 背景色 |
|-------------|---------|--------|
| `pbandai` | P-Bandai | `#0071e3` 蓝 |
| `gbase` | 高达基地 | `#ff9500` 橙 |
| `event` | 活动限定 | `#af52de` 紫 |
| `sidef` | SIDE-F | `#30b0c7` 青 |
| `other` | 限定 | `#ff3b30` 红 |

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
| `src/pages/SeriesListPage/index.tsx` | 修改 | 集成 LimitedSubFilter，新增筛选逻辑 |
| `scripts/src/types.ts` | 修改 | 新增 LimitedType |
| `scripts/src/fix-limited.ts` | 修改 | 判定逻辑改为输出 limitedType |
| `scripts/data/manual-limited-map.json` | 修改 | 格式扩展支持 limitedType |
