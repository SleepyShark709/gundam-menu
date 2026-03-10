const STORAGE_KEY = 'gundam-favorites';

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable – ignore
  }
}

export function getFavorites(): string[] {
  return readFavorites();
}

export function addFavorite(modelId: string): void {
  const ids = readFavorites();
  if (!ids.includes(modelId)) {
    writeFavorites([...ids, modelId]);
  }
}

export function removeFavorite(modelId: string): void {
  const ids = readFavorites();
  writeFavorites(ids.filter((id) => id !== modelId));
}

export function isFavorite(modelId: string): boolean {
  return readFavorites().includes(modelId);
}

export function toggleFavorite(modelId: string): boolean {
  if (isFavorite(modelId)) {
    removeFavorite(modelId);
    return false;
  } else {
    addFavorite(modelId);
    return true;
  }
}
