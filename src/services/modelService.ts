import type { SeriesCode, SeriesMeta, GundamModel, FilterConfig, SortConfig } from '../types';

const seriesMetaCache: SeriesMeta[] | null = null;
const modelsCache = new Map<SeriesCode, GundamModel[]>();

export async function fetchSeriesMeta(): Promise<SeriesMeta[]> {
  if (seriesMetaCache !== null) return seriesMetaCache;
  const res = await fetch('/data/series-meta.json');
  if (!res.ok) throw new Error(`Failed to fetch series-meta: ${res.status}`);
  return res.json() as Promise<SeriesMeta[]>;
}

export async function fetchModels(seriesCode: SeriesCode): Promise<GundamModel[]> {
  const cached = modelsCache.get(seriesCode);
  if (cached !== undefined) return cached;
  const res = await fetch(`/data/${seriesCode}.json`);
  if (!res.ok) throw new Error(`Failed to fetch models for ${seriesCode}: ${res.status}`);
  const data = (await res.json()) as GundamModel[];
  modelsCache.set(seriesCode, data);
  return data;
}

export function filterModels(models: GundamModel[], filter: FilterConfig): GundamModel[] {
  return models.filter((model) => {
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      const nameMatch =
        model.name.toLowerCase().includes(kw) ||
        (model.nameJa?.toLowerCase().includes(kw) ?? false) ||
        (model.nameEn?.toLowerCase().includes(kw) ?? false) ||
        (model.tags?.some((t) => t.toLowerCase().includes(kw)) ?? false);
      if (!nameMatch) return false;
    }

    // isLimited filter removed - handled by Tab UI

    if (filter.releaseDateFrom) {
      if (model.releaseDate < filter.releaseDateFrom) return false;
    }

    if (filter.releaseDateTo) {
      if (model.releaseDate > filter.releaseDateTo) return false;
    }

    if (filter.numberFrom !== undefined) {
      if (model.number < filter.numberFrom) return false;
    }

    if (filter.numberTo !== undefined) {
      if (model.number > filter.numberTo) return false;
    }

    return true;
  });
}

export function sortModels(models: GundamModel[], sort: SortConfig): GundamModel[] {
  const sorted = [...models];
  sorted.sort((a, b) => {
    let comparison = 0;
    if (sort.field === 'price') {
      comparison = a.price - b.price;
    } else if (sort.field === 'releaseDate') {
      comparison = a.releaseDate.localeCompare(b.releaseDate);
    } else if (sort.field === 'number') {
      comparison = a.number - b.number;
    }
    return sort.order === 'asc' ? comparison : -comparison;
  });
  return sorted;
}
