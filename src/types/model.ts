export type SeriesCode = 'hg' | 'rg' | 'mg' | 'pg';

export interface GundamModel {
  id: string;
  series: SeriesCode;
  number: number;
  name: string;
  nameEn?: string;
  price: number;
  priceTaxFree: number;
  releaseDate: string;
  isLimited: boolean;
  imageUrl: string;
  productUrl: string;
  tags?: string[];
}
