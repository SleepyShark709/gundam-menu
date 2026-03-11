import { useState, useCallback, useEffect } from 'react';
import {
  getFavorites,
  toggleFavorite as toggleFavoriteService,
  isFavorite as isFavoriteService,
  migrateFavoritesIfNeeded,
} from '../services/favoriteService';

interface UseFavoritesResult {
  favorites: string[];
  toggleFavorite: (modelId: string) => void;
  isFavorite: (modelId: string) => boolean;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());

  useEffect(() => {
    migrateFavoritesIfNeeded().then(() => {
      setFavorites(getFavorites());
    });
  }, []);

  const toggleFavorite = useCallback((modelId: string) => {
    toggleFavoriteService(modelId);
    setFavorites(getFavorites());
  }, []);

  const isFavorite = useCallback(
    (modelId: string) => isFavoriteService(modelId),
    [],
  );

  return { favorites, toggleFavorite, isFavorite };
}
