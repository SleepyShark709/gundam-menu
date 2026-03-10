export function formatDate(dateStr: string): string {
  // Expects "YYYY-MM" format
  const [year, month] = dateStr.split('-');
  if (!year || !month) return dateStr;
  return `${year}年${parseInt(month, 10)}月`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
