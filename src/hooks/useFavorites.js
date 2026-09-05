import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tg_favorites_v1';

/**
 * Gère la liste des arrêts favoris de l'utilisateur, persistée en localStorage.
 * Un favori est un objet { code, name, city } (voir useStops pour la forme d'un arrêt).
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (code) => favorites.some((f) => f.code === code),
    [favorites]
  );

  const addFavorite = useCallback((stop) => {
    setFavorites((prev) => (prev.some((f) => f.code === stop.code) ? prev : [...prev, stop]));
  }, []);

  const removeFavorite = useCallback((code) => {
    setFavorites((prev) => prev.filter((f) => f.code !== code));
  }, []);

  const toggleFavorite = useCallback(
    (stop) => {
      if (isFavorite(stop.code)) removeFavorite(stop.code);
      else addFavorite(stop);
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  return { favorites, isFavorite, addFavorite, removeFavorite, toggleFavorite };
}
