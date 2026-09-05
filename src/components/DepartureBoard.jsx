import { useMemo, useState } from 'react';
import { useStopTimes } from '../hooks/useStopTimes';
import { formatTime, minutesUntil } from '../utils/time';

const VISIBLE_PATTERNS_DEFAULT = 8;

/**
 * Affiche les prochains passages (toutes lignes) pour un arrêt, avec
 * rafraîchissement automatique (voir useStopTimes).
 *
 * Les gros arrêts (ex : pôles d'échange) peuvent être desservis par des dizaines
 * de lignes, y compris des cars interurbains à plusieurs heures d'intervalle :
 * on trie par premier passage à venir et on limite l'affichage par défaut.
 */
export default function DepartureBoard({ stop, isFavorite, onToggleFavorite, onClose }) {
  const { patterns, error, loading } = useStopTimes(stop.code);
  const [showAll, setShowAll] = useState(false);

  const sortedPatterns = useMemo(() => {
    if (!patterns) return null;
    return [...patterns].sort((a, b) => {
      const nextA = a.times[0]?.realtimeArrival ?? Infinity;
      const nextB = b.times[0]?.realtimeArrival ?? Infinity;
      return nextA - nextB;
    });
  }, [patterns]);

  const visiblePatterns = showAll
    ? sortedPatterns
    : sortedPatterns?.slice(0, VISIBLE_PATTERNS_DEFAULT);
  const hiddenCount = sortedPatterns ? sortedPatterns.length - (visiblePatterns?.length ?? 0) : 0;

  return (
    <div className="departure-board">
      <div className="departure-board-header">
        <div>
          <h3>{stop.name}</h3>
          <p className="stop-city">{stop.city}</p>
        </div>
        <div className="departure-board-actions">
          <button
            type="button"
            className={isFavorite ? 'fav-btn active' : 'fav-btn'}
            onClick={onToggleFavorite}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          {onClose && (
            <button type="button" className="close-btn" onClick={onClose} title="Fermer">
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && <p className="muted">Chargement des horaires…</p>}
      {error && <p className="error">Impossible de charger les horaires pour cet arrêt.</p>}

      {patterns && patterns.length === 0 && (
        <p className="muted">Aucun passage prévu pour le moment.</p>
      )}

      {visiblePatterns && visiblePatterns.length > 0 && (
        <ul className="pattern-list">
          {visiblePatterns.map((p, idx) => (
            <li key={`${p.pattern.id}-${idx}`} className="pattern-item">
              <div className="pattern-label">
                <span className="line-badge">{p.pattern.shortDesc || p.pattern.desc}</span>
                <span className="pattern-dest">→ {p.pattern.desc}</span>
              </div>
              <ul className="times-list">
                {p.times.slice(0, 4).map((t, i) => (
                  <li key={i} className={t.realtime ? 'time realtime' : 'time'}>
                    <span className="time-minutes">
                      {minutesUntil(t.serviceDay, t.realtimeArrival) <= 1
                        ? 'imminent'
                        : `${minutesUntil(t.serviceDay, t.realtimeArrival)} min`}
                    </span>
                    <span className="time-clock">
                      {formatTime(t.serviceDay, t.realtimeArrival)}
                    </span>
                    {t.arrivalDelay > 60 && (
                      <span className="delay">+{Math.round(t.arrivalDelay / 60)} min</span>
                    )}
                    {t.occupancy && <span className="occupancy">{t.occupancy}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button type="button" className="show-more-btn" onClick={() => setShowAll(true)}>
          Afficher {hiddenCount} ligne{hiddenCount > 1 ? 's' : ''} de plus
        </button>
      )}
    </div>
  );
}
