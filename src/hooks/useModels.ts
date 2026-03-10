import { useState, useEffect } from 'react';
import type { SeriesCode, GundamModel } from '../types';
import { fetchModels } from '../services/modelService';

interface UseModelsResult {
  models: GundamModel[];
  loading: boolean;
  error: Error | null;
}

export function useModels(seriesCode: SeriesCode): UseModelsResult {
  const [models, setModels] = useState<GundamModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchModels(seriesCode)
      .then((data) => {
        if (!cancelled) {
          setModels(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seriesCode]);

  return { models, loading, error };
}
