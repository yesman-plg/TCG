import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tg_favorites_v2';

// Un favori est lié à un arrêt ET à une ligne précise (routeId), pas juste à
// l'arrêt : un même arrêt peut être desservi par plusieurs lignes, et on ne
// veut suivre que celles choisies par l'utilisateur.
// Forme : { code, name, city, routeId, routeShortName, routeColor, routeTextColor }

function sameFavorite(f, code, routeId) {
  return f.code === code && f.routeId === routeId;
}

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
    (code, routeId) => favorites.some((f) => sameFavorite(f, code, routeId)),
    [favorites]
  );

  const addFavorite = useCallback((entry) => {
    setFavorites((prev) =>
      prev.some((f) => sameFavorite(f, entry.code, entry.routeId)) ? prev : [...prev, entry]
    );
  }, []);

  const removeFavorite = useCallback((code, routeId) => {
    setFavorites((prev) => prev.filter((f) => !sameFavorite(f, code, routeId)));
  }, []);

  const toggleFavorite = useCallback(
    (entry) => {
      if (isFavorite(entry.code, entry.routeId)) removeFavorite(entry.code, entry.routeId);
      else addFavorite(entry);
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  return { favorites, isFavorite, addFavorite, removeFavorite, toggleFavorite };
}
