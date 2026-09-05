import { getLinesGeometry } from '../api/mobilitesM';
import { useCachedResource } from './useCachedResource';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h : le tracé des lignes change rarement

/** Charge le tracé géométrique des lignes principales, en cache 24h. */
export function useLinesGeometry() {
  const { data, error } = useCachedResource('tg_lines_geometry_cache_v1', CACHE_TTL_MS, getLinesGeometry);
  return { lines: data, error };
}
