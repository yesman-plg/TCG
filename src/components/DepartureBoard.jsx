import { useMemo, useState } from 'react';
import { Star, X, Warning, CaretDown } from '@phosphor-icons/react';
import { useStopTimes } from '../hooks/useStopTimes';
import { useRoutes } from '../hooks/useRoutes';
import { useDisruptions } from '../hooks/useDisruptions';
import { disruptionsForRoutes } from '../utils/disruptions';
import { minutesUntil } from '../utils/time';
import { naturalCompare, categoryRank } from '../utils/sort';

const VISIBLE_PATTERNS_DEFAULT = 8;

/** Extrait l'id de ligne ("SEM:C5") depuis l'id de pattern OTP ("SEM:C5:1:12345"). */
function routeIdFromPatternId(patternId) {
  const parts = patternId.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Affiche les prochains passages (toutes lignes) pour un arrêt, avec
 * rafraîchissement automatique (voir useStopTimes), les vrais badges de ligne
 * (numéro + couleur officielle) et les infos trafic actives sur ces lignes.
 *
 * Les gros arrêts (ex : pôles d'échange) peuvent être desservis par des dizaines
 * de lignes, y compris des cars interurbains à plusieurs heures d'intervalle :
 * on trie par premier passage à venir et on limite l'affichage par défaut.
 */
export default function DepartureBoard({ stop, isFavorite, onToggleFavorite, onClose }) {
  const { patterns, error, loading } = useStopTimes(stop.code);
  const { routesById } = useRoutes();
  const { disruptions } = useDisruptions();
  const [showAll, setShowAll] = useState(false);

  const sortedPatterns = useMemo(() => {
    if (!patterns) return null;
    return [...patterns].sort((a, b) => {
      const routeA = routesById?.get(routeIdFromPatternId(a.pattern.id));
      const routeB = routesById?.get(routeIdFromPatternId(b.pattern.id));
      const nameA = routeA?.shortName || a.pattern.shortDesc || '';
      const nameB = routeB?.shortName || b.pattern.shortDesc || '';

      // 1. Trams, puis bus Chrono (C1, C2…), puis le reste (au lieu d'un ordre
      //    "premier passage" qui éparpille les lignes n'importe comment).
      const categoryCompare = categoryRank(routeA?.mode, nameA) - categoryRank(routeB?.mode, nameB);
      if (categoryCompare !== 0) return categoryCompare;

      // 2. Regroupe par numéro/lettre de ligne, dans l'ordre naturel
      //    (A, B, C… puis C1, C2… C10, pas l'ordre alphabétique brut).
      const nameCompare = naturalCompare(nameA, nameB);
      if (nameCompare !== 0) return nameCompare;

      // 3. À ligne égale (les deux sens), le sens avec le passage le plus proche en premier.
      const nextA = a.times[0]?.realtimeArrival ?? Infinity;
      const nextB = b.times[0]?.realtimeArrival ?? Infinity;
      return nextA - nextB;
    });
  }, [patterns, routesById]);

  const visiblePatterns = showAll
    ? sortedPatterns
    : sortedPatterns?.slice(0, VISIBLE_PATTERNS_DEFAULT);
  const hiddenCount = sortedPatterns ? sortedPatterns.length - (visiblePatterns?.length ?? 0) : 0;

  const stopDisruptions = useMemo(() => {
    if (!patterns || !disruptions) return [];
    const routeIds = [...new Set(patterns.map((p) => routeIdFromPatternId(p.pattern.id)))];
    return disruptionsForRoutes(disruptions, routeIds);
  }, [patterns, disruptions]);

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
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Star size={20} weight={isFavorite ? 'fill' : 'regular'} aria-hidden="true" />
          </button>
          {onClose && (
            <button
              type="button"
              className="close-btn"
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {stopDisruptions.length > 0 && (
        <ul className="disruption-list">
          {stopDisruptions.map((d) => (
            <li key={d.code} className="disruption-item">
              <Warning size={16} weight="fill" className="disruption-icon" aria-hidden="true" />
              <span>{d.titre}</span>
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="muted">Chargement des horaires…</p>}
      {error && <p className="error">Impossible de charger les horaires pour cet arrêt.</p>}

      {patterns && patterns.length === 0 && (
        <p className="muted">Aucun passage prévu pour le moment.</p>
      )}

      {visiblePatterns && visiblePatterns.length > 0 && (
        <ul className="pattern-list">
          {visiblePatterns.map((p, idx) => {
            const routeId = routeIdFromPatternId(p.pattern.id);
            const route = routesById?.get(routeId);
            return (
              <li key={`${p.pattern.id}-${idx}`} className="pattern-item">
                <div className="pattern-label">
                  <span
                    className="line-badge"
                    style={
                      route
                        ? { background: `#${route.color}`, color: `#${route.textColor}` }
                        : undefined
                    }
                  >
                    {route?.shortName || p.pattern.shortDesc || '?'}
                  </span>
                  <span className="pattern-dest">→ {p.pattern.desc}</span>
                </div>
                <ul className="times-list">
                  {p.times.slice(0, 4).map((t, i) => {
                    const delayed = t.realtime && t.arrivalDelay > 60;
                    return (
                      <li
                        key={i}
                        className={`time${t.realtime ? ' realtime' : ''}${delayed ? ' delayed' : ''}`}
                      >
                        <span className="time-minutes">
                          {minutesUntil(t.serviceDay, t.realtimeArrival) <= 1
                            ? 'imminent'
                            : `${minutesUntil(t.serviceDay, t.realtimeArrival)} min`}
                        </span>
                        {t.occupancy && <span className="occupancy">{t.occupancy}</span>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button type="button" className="show-more-btn" onClick={() => setShowAll(true)}>
          Afficher {hiddenCount} ligne{hiddenCount > 1 ? 's' : ''} de plus
          <CaretDown size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
