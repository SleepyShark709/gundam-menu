import { useState, useEffect, useCallback } from 'react';
import { getExchangeRate } from '../services/exchangeRateService';

interface UseExchangeRateResult {
  rate: number | null;
  loading: boolean;
  convertToYuan: (jpyPrice: number) => string;
}

export function useExchangeRate(): UseExchangeRateResult {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getExchangeRate('CNY')
      .then((r) => {
        if (!cancelled) {
          setRate(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRate(0.05);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const convertToYuan = useCallback(
    (jpyPrice: number): string => {
      const effectiveRate = rate ?? 0.05;
      const cny = jpyPrice * effectiveRate;
      return cny.toFixed(2);
    },
    [rate],
  );

  return { rate, loading, convertToYuan };
}
