export function formatJPY(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`;
}

export function formatCNY(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function calcTaxFree(price: number): number {
  return Math.round(price / 1.1);
}
