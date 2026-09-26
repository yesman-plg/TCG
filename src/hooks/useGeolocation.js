import { useCallback, useEffect, useRef, useState } from 'react';

// Codes de GeolocationPositionError (constantes dupliquées pour éviter de
// dépendre de l'objet global, absent dans certains environnements).
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function describeError(err) {
  switch (err?.code) {
    case PERMISSION_DENIED:
      return 'Accès à la position refusé.';
    case POSITION_UNAVAILABLE:
      return 'Position indisponible (GPS désactivé ?).';
    case TIMEOUT:
      return 'La localisation a pris trop de temps.';
    default:
      return err?.message || 'Erreur inconnue.';
  }
}

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Géolocalisation à la demande (pas automatique au chargement, pour ne pas
 * déclencher la demande de permission sans action explicite de l'utilisateur).
 *
 * - Messages d'erreur en français (le message natif est en anglais :
 *   « User denied Geolocation »).
 * - `denied` indique un refus de permission : relancer la demande ne fait
 *   rien tant que l'utilisateur n'a pas réautorisé le site / l'app.
 * - Si la permission redevient accordée (réglages système), l'état d'erreur
 *   est levé et la position redemandée automatiquement.
 * - Repli sur une précision réduite si le GPS ne répond pas à temps.
 */
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | granted | error
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);
  const pendingRef = useRef(false);

  const request = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setDenied(false);
      setError(new Error("La géolocalisation n'est pas supportée par ce navigateur."));
      return;
    }
    if (pendingRef.current) return;
    pendingRef.current = true;
    setStatus('loading');
    try {
      let pos;
      try {
        pos = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      } catch (err) {
        if (err?.code === PERMISSION_DENIED) throw err;
        // GPS lent ou indisponible : on se contente du réseau / Wi-Fi.
        pos = await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
      }
      setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setError(null);
      setDenied(false);
      setStatus('granted');
    } catch (err) {
      setDenied(err?.code === PERMISSION_DENIED);
      setError(new Error(describeError(err)));
      setStatus('error');
    } finally {
      pendingRef.current = false;
    }
  }, []);

  // Suit les changements de permission (ex. réautorisation dans les réglages
  // Android puis retour dans l'app) quand le navigateur le permet.
  const wantedRef = useRef(false);
  useEffect(() => {
    if (status !== 'idle') wantedRef.current = true;
  }, [status]);

  useEffect(() => {
    let perm;
    let cancelled = false;
    const onChange = () => {
      if (!perm || !wantedRef.current) return;
      if (perm.state === 'granted') request();
    };
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (cancelled) return;
        perm = p;
        p.addEventListener?.('change', onChange);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      perm?.removeEventListener?.('change', onChange);
    };
  }, [request]);

  return { position, status, error, denied, request };
}
