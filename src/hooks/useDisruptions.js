import { getDisruptions } from '../api/mobilitesM';
import { useCachedResource } from './useCachedResource';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min : les infos trafic évoluent plus vite que les lignes

/**
 * Charge la liste des perturbations/infos trafic en cours sur le réseau
 * (travaux, restrictions, incidents). Voir src/utils/disruptions.js pour le
 * filtrage par ligne et par date de validité.
 */
export function useDisruptions() {
  const { data, error } = useCachedResource('tg_disruptions_cache_v1', CACHE_TTL_MS, getDisruptions);
  return { disruptions: data, error };
}
