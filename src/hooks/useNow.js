import { useEffect, useState } from 'react';

/**
 * Force un re-render périodique sans requête réseau, pour que les décomptes
 * ("3 min", "imminent"...) se mettent à jour en continu entre deux
 * rafraîchissements des données (voir useStopTimes), au lieu de rester figés
 * jusqu'au prochain fetch.
 */
export function useNow(intervalMs = 5000) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
