import { useEffect, useState } from 'react';
import { getAllStops } from '../api/mobilitesM';

const CACHE_KEY = 'tg_stops_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h : la liste des arrêts change rarement

/**
 * Charge la liste complète des arrêts du réseau, en la mettant en cache dans
 * localStorage pendant 24h pour éviter de retélécharger ~860 arrêts à chaque visite.
 */
export function useStops() {
  const [stops, setStops] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = readCache();
        if (cached) {
          setStops(cached);
          return;
        }
        const fresh = await getAllStops();
        if (!cancelled) {
          setStops(fresh);
          writeCache(fresh);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stops, error };
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // localStorage plein ou indisponible : tant pis, on retéléchargera la prochaine fois
  }
}
