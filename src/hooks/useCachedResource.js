import { useEffect, useState } from 'react';

/**
 * Charge une ressource distante en la mettant en cache dans localStorage
 * pendant `ttlMs`, pour éviter de la retélécharger à chaque visite.
 * Factorisé depuis useStops pour être réutilisé par useRoutes, useDisruptions, etc.
 */
export function useCachedResource(cacheKey, ttlMs, fetcher) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = readCache(cacheKey, ttlMs);
        if (cached) {
          setData(cached);
          return;
        }
        const fresh = await fetcher();
        if (!cancelled) {
          setData(fresh);
          writeCache(cacheKey, fresh);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { data, error };
}

function readCache(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // localStorage plein ou indisponible : tant pis, on retéléchargera la prochaine fois
  }
}
