import { useEffect, useState } from 'react';
import { getWalkPlan } from '../api/mobilitesM';
import { parseWalkPlan } from '../utils/walk';

/**
 * Itinéraire à pied entre la position de l'utilisateur et un arrêt.
 * `route` vaut null tant que rien n'est chargé ou si le calcul échoue : l'UI
 * se rabat alors sur une estimation à vol d'oiseau (voir WalkScreen).
 */
export function useWalkRoute(from, to) {
  const [state, setState] = useState({ route: null, loading: false, error: null });
  const fromLat = from?.lat;
  const fromLon = from?.lon;
  const toLat = to?.lat;
  const toLon = to?.lon;

  useEffect(() => {
    if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return undefined;
    let cancelled = false;
    setState({ route: null, loading: true, error: null });
    getWalkPlan({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon })
      .then((data) => {
        if (!cancelled) setState({ route: parseWalkPlan(data), loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ route: null, loading: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLon, toLat, toLon]);

  return state;
}
