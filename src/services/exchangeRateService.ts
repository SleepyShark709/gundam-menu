const STORAGE_KEY = 'gundam-exchange-rate';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_RATE = 0.05; // 1 JPY ≈ 0.05 CNY

interface CachedRate {
  rate: number;
  timestamp: number;
}

interface ErApiResponse {
  rates: Record<string, number>;
}

function readCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedRate;
  } catch {
    return null;
  }
}

function writeCache(rate: number): void {
  const entry: CachedRate = { rate, timestamp: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage unavailable – ignore
  }
}

function isCacheValid(entry: CachedRate): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

export async function getExchangeRate(_target: 'CNY'): Promise<number> {
  const cached = readCache();
  if (cached && isCacheValid(cached)) return cached.rate;

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/JPY');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ErApiResponse;
    const rate = data.rates['CNY'];
    if (typeof rate !== 'number' || isNaN(rate)) throw new Error('Invalid rate');
    writeCache(rate);
    return rate;
  } catch {
    // Return stale cache if available, otherwise fallback
    if (cached) return cached.rate;
    return FALLBACK_RATE;
  }
}
