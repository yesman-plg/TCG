import { useEffect, useState } from 'react';
import { getStopTimes } from '../api/mobilitesM';

const REFRESH_MS = 15_000; // le réseau republie les positions GPS toutes les ~30s ;
// on interroge un peu plus vite pour récupérer un changement le plus tôt possible

/**
 * Interroge en continu les prochains passages d'un arrêt (toutes lignes confondues).
 * Se met à jour toutes les 15s tant que le composant est monté.
 */
export function useStopTimes(stopCode) {
  const [patterns, setPatterns] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stopCode) return;
    let cancelled = false;
    let timer;

    async function tick() {
      try {
        const data = await getStopTimes(stopCode);
        if (!cancelled) {
          setPatterns(data);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, REFRESH_MS);
      }
    }

    setLoading(true);
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stopCode]);

  return { patterns, error, loading };
}
