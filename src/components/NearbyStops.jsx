import { useMemo } from 'react';
import { MapPin, ArrowsClockwise, Warning } from '@phosphor-icons/react';
import { useGeolocation } from '../hooks/useGeolocation';
import { distanceMeters, formatDistance } from '../utils/geo';

const MAX_RESULTS = 6;

/**
 * Bouton "Autour de moi" : demande la position une fois cliqué, puis affiche
 * les arrêts les plus proches triés par distance.
 */
export default function NearbyStops({ stops, onSelect }) {
  const { position, status, error, denied, request } = useGeolocation();

  const nearest = useMemo(() => {
    if (!position || !stops) return [];
    return stops
      .map((s) => ({ ...s, distance: distanceMeters(position.lat, position.lon, s.lat, s.lon) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS);
  }, [position, stops]);

  if (status === 'idle') {
    return (
      <button type="button" className="nearby-btn" onClick={request} disabled={!stops}>
        <MapPin size={18} weight="fill" aria-hidden="true" />
        Arrêts près de moi
      </button>
    );
  }

  if (status === 'loading') {
    return <p className="muted">Localisation en cours…</p>;
  }

  if (status === 'error') {
    return (
      <div className="geo-error" role="alert">
        <p className="error">
          <Warning size={18} aria-hidden="true" />
          <span>Localisation impossible : {error?.message}</span>
        </p>
        {denied && (
          <p className="muted geo-help">
            TCG est installée comme app web (sans barre d’adresse), donc la
            permission se change dans les réglages d’Android, pas dans un menu
            de l’app : Paramètres → Applis → TCG → Autorisations → Position →
            Autoriser (ou appui long sur l’icône TCG → icône ⓘ → Autorisations).
            Vérifiez aussi que la localisation du téléphone est activée.
          </p>
        )}
        <button type="button" className="retry-link" onClick={request}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="nearby-list">
      <div className="nearby-header">
        <h2>Arrêts près de moi</h2>
        <button type="button" className="retry-link" onClick={request}>
          <ArrowsClockwise size={14} aria-hidden="true" />
          Actualiser
        </button>
      </div>
      <ul className="nearby-results">
        {nearest.map((s) => (
          <li key={s.code}>
            <button type="button" onClick={() => onSelect(s)}>
              <span className="stop-name">{s.name}</span>
              <span className="stop-distance">{formatDistance(s.distance)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
