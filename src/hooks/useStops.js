import { getAllStops } from '../api/mobilitesM';
import { useCachedResource } from './useCachedResource';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h : la liste des arrêts change rarement

/**
 * Charge la liste complète des arrêts du réseau, en cache 24h dans localStorage
 * pour éviter de retélécharger ~860 arrêts à chaque visite.
 */
export function useStops() {
  const { data, error } = useCachedResource('tg_stops_cache_v1', CACHE_TTL_MS, getAllStops);
  return { stops: data, error };
}
