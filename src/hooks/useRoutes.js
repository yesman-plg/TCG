import { useMemo } from 'react';
import { getAllRoutes } from '../api/mobilitesM';
import { useCachedResource } from './useCachedResource';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h : les lignes changent rarement

/**
 * Charge la liste des lignes du réseau et l'expose aussi sous forme de map
 * (id de ligne -> { shortName, longName, color, textColor, mode }) pour un
 * accès rapide depuis les composants d'affichage.
 */
export function useRoutes() {
  const { data, error } = useCachedResource('tg_routes_cache_v1', CACHE_TTL_MS, getAllRoutes);

  const byId = useMemo(() => {
    if (!data) return null;
    return new Map(data.map((r) => [r.id, r]));
  }, [data]);

  return { routes: data, routesById: byId, error };
}
