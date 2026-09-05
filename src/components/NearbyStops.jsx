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
  const { position, status, error, request } = useGeolocation();

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
      <p className="error">
        <Warning size={18} aria-hidden="true" />
        Localisation impossible ({error?.message || 'permission refusée'}).{' '}
        <button type="button" className="retry-link" onClick={request}>
          Réessayer
        </button>
      </p>
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
