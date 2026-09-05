import { useCallback, useState } from 'react';

/**
 * Géolocalisation à la demande (pas automatique au chargement, pour ne pas
 * déclencher la demande de permission sans action explicite de l'utilisateur).
 */
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | granted | error
  const [error, setError] = useState(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError(new Error("La géolocalisation n'est pas supportée par ce navigateur."));
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('granted');
      },
      (err) => {
        setError(err);
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { position, status, error, request };
}
