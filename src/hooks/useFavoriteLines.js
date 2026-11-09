import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tg_favorite_lines_v1';

/** Lignes suivies (ids "SEM:B"), indépendamment des arrêts favoris. */
export function useFavoriteLines() {
  const [lineIds, setLineIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lineIds));
    } catch {
      // stockage indisponible : on garde l'état en mémoire
    }
  }, [lineIds]);

  const isFavoriteLine = useCallback((id) => lineIds.includes(id), [lineIds]);
  const toggleFavoriteLine = useCallback((id) => {
    setLineIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return { favoriteLineIds: lineIds, isFavoriteLine, toggleFavoriteLine };
}
