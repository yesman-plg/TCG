import { useMemo, useState } from 'react';
import { Star, X, Warning, CaretDown } from '@phosphor-icons/react';
import { useStopTimes } from '../hooks/useStopTimes';
import { useNow } from '../hooks/useNow';
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

function lineBadgeStyle(route) {
  return route ? { background: `#${route.color}`, color: `#${route.textColor}` } : undefined;
}

/**
 * Affiche les prochains passages pour un arrêt, avec rafraîchissement
 * automatique (voir useStopTimes), les vrais badges de ligne (numéro + couleur
 * officielle) et les infos trafic actives sur ces lignes.
 *
 * - `routeFilter` : si fourni (id de ligne "SEM:C1"), n'affiche que cette ligne
 *   (utilisé pour les favoris, qui sont liés à une ligne précise).
 * - `hideHeader` : masque le nom d'arrêt / bouton favori / bouton fermer,
 *   pour un affichage compact quand un composant parent gère déjà l'en-tête
 *   (voir FavoriteRow).
 * - `isFavorite(code, routeId)` / `onToggleFavorite(entry)` : quand un arrêt a
 *   plusieurs lignes, cliquer sur l'étoile ouvre un petit sélecteur pour
 *   choisir la/les ligne(s) à suivre plutôt que de tout mettre en favori d'un coup.
 *
 * Les gros arrêts (ex : pôles d'échange) peuvent être desservis par des dizaines
 * de lignes, y compris des cars interurbains à plusieurs heures d'intervalle :
 * on trie par premier passage à venir et on limite l'affichage par défaut.
 */
export default function DepartureBoard({
  stop,
  isFavorite,
  onToggleFavorite,
  onClose,
  routeFilter,
  hideHeader = false,
}) {
  const { patterns, error, loading } = useStopTimes(stop.code);
  // Recalcule les décomptes ("3 min"...) toutes les 5s même sans nouvelle
  // donnée réseau, pour qu'ils ne restent pas figés entre deux rafraîchissements.
  useNow(5000);
  const { routesById } = useRoutes();
  const { disruptions } = useDisruptions();
  const [showAll, setShowAll] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  // Liste des lignes distinctes desservant l'arrêt (pour le sélecteur de favori).
  const distinctRoutes = useMemo(() => {
    if (!sortedPatterns) return [];
    const seen = new Map();
    for (const p of sortedPatterns) {
      const routeId = routeIdFromPatternId(p.pattern.id);
      if (seen.has(routeId)) continue;
      const route = routesById?.get(routeId);
      seen.set(routeId, {
        routeId,
        shortName: route?.shortName || p.pattern.shortDesc || '?',
        color: route?.color,
        textColor: route?.textColor,
      });
    }
    return [...seen.values()];
  }, [sortedPatterns, routesById]);

  const filteredPatterns = useMemo(() => {
    if (!sortedPatterns || !routeFilter) return sortedPatterns;
    return sortedPatterns.filter((p) => routeIdFromPatternId(p.pattern.id) === routeFilter);
  }, [sortedPatterns, routeFilter]);

  const visiblePatterns = showAll
    ? filteredPatterns
    : filteredPatterns?.slice(0, VISIBLE_PATTERNS_DEFAULT);
  const hiddenCount = filteredPatterns
    ? filteredPatterns.length - (visiblePatterns?.length ?? 0)
    : 0;

  const stopDisruptions = useMemo(() => {
    if (!filteredPatterns || !disruptions) return [];
    const routeIds = [...new Set(filteredPatterns.map((p) => routeIdFromPatternId(p.pattern.id)))];
    return disruptionsForRoutes(disruptions, routeIds);
  }, [filteredPatterns, disruptions]);

  const anyFavorited = !hideHeader && distinctRoutes.some((r) => isFavorite?.(stop.code, r.routeId));

  function favoriteEntryFor(route) {
    return {
      code: stop.code,
      name: stop.name,
      city: stop.city,
      routeId: route.routeId,
      routeShortName: route.shortName,
      routeColor: route.color,
      routeTextColor: route.textColor,
    };
  }

  function handleStarClick() {
    if (distinctRoutes.length <= 1) {
      if (distinctRoutes[0]) onToggleFavorite?.(favoriteEntryFor(distinctRoutes[0]));
      return;
    }
    setPickerOpen((open) => !open);
  }

  return (
    <div className="departure-board">
      {!hideHeader && (
        <div className="departure-board-header">
          <div>
            <h3>{stop.name}</h3>
            <p className="stop-city">{stop.city}</p>
          </div>
          <div className="departure-board-actions">
            <button
              type="button"
              className={anyFavorited ? 'fav-btn active' : 'fav-btn'}
              onClick={handleStarClick}
              disabled={distinctRoutes.length === 0}
              aria-pressed={anyFavorited}
              aria-expanded={pickerOpen}
              aria-label={anyFavorited ? 'Gérer les lignes favorites' : 'Ajouter aux favoris'}
              title={anyFavorited ? 'Gérer les lignes favorites' : 'Ajouter aux favoris'}
            >
              <Star size={20} weight={anyFavorited ? 'fill' : 'regular'} aria-hidden="true" />
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
      )}

      {!hideHeader && pickerOpen && distinctRoutes.length > 1 && (
        <div className="route-picker">
          <p className="route-picker-title">Quelle(s) ligne(s) suivre à cet arrêt ?</p>
          <ul className="route-picker-list">
            {distinctRoutes.map((r) => {
              const fav = isFavorite?.(stop.code, r.routeId);
              return (
                <li key={r.routeId}>
                  <button
                    type="button"
                    className={fav ? 'route-picker-item active' : 'route-picker-item'}
                    onClick={() => onToggleFavorite?.(favoriteEntryFor(r))}
                    aria-pressed={fav}
                  >
                    <span className="line-badge" style={lineBadgeStyle(r)}>
                      {r.shortName}
                    </span>
                    <Star size={14} weight={fav ? 'fill' : 'regular'} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

      {filteredPatterns && filteredPatterns.length === 0 && (
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
                  <span className="line-badge" style={lineBadgeStyle(route)}>
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
