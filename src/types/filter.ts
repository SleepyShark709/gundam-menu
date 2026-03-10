export interface FilterConfig {
  keyword?: string;
  isLimited?: boolean | null;
  releaseDateFrom?: string;
  releaseDateTo?: string;
  numberFrom?: number;
  numberTo?: number;
}

export interface SortConfig {
  field: 'price' | 'releaseDate' | 'number';
  order: 'asc' | 'desc';
}
