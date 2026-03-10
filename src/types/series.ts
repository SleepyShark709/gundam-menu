import type { SeriesCode } from './model';

export interface SeriesMeta {
  code: SeriesCode;
  name: string;
  shortName: string;
  scale: string;
  coverImage: string;
  totalCount: number;
}
