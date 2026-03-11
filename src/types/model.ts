export type SeriesCode = 'hg' | 'rg' | 'mg' | 'pg';

export interface GundamModel {
  id: string;
  series: SeriesCode;
  number: number;
  name: string;        // 中文名（主显示名）
  nameJa: string;      // 日文原名
  nameEn?: string;     // 英文名（可选）
  price: number;
  priceTaxFree: number;
  releaseDate: string;
  isLimited: boolean;
  imageUrl: string;
  productUrl: string;
  tags?: string[];
}
