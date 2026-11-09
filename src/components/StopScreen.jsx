import { useMemo, useState } from 'react';
import { ArrowRight, CaretDown, CaretRight, Star, Warning } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { useStopTimes } from '../hooks/useStopTimes';
import { useNow } from '../hooks/useNow';
import { disruptionsByRoute } from '../utils/disruptions';
import { distanceMeters, formatDistance } from '../utils/geo';
import { estimateWalkMinutes } from '../utils/walk';
import { distinctRoutesOf, routeIdFromPatternId, sortPatterns } from '../utils/departures';
import { formatTime, minutesUntil } from '../utils/time';
import AlertList from './AlertList';
import LineBadge from './LineBadge';
import MapCanvas from './MapCanvas';
import Modal from './Modal';
import ScreenShell from './ScreenShell';

const VISIBLE_DEFAULT = 8;

function minutesText(minutes) {
  return minutes <= 1 ? '<1' : String(minutes);
}

/** Fiche d'un arrêt : carte, actions, filtres par ligne et prochains passages. */
export default function StopScreen({ stop }) {
  const {
    stops, routesById, disruptions, isFavorite, toggleFavorite, position, nav,
  } = useApp();
  const { patterns, error, loading } = useStopTimes(stop.code);
  useNow(5000);
  const [filter, setFilter] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [alertRouteId, setAlertRouteId] = useState(null);

  const sorted = useMemo(() => sortPatterns(patterns, routesById), [patterns, routesById]);
  const routes = useMemo(() => distinctRoutesOf(sorted, routesById), [sorted, routesById]);
  const filtered = useMemo(
    () => (sorted && filter ? sorted.filter((p) => routeIdFromPatternId(p.pattern.id) === filter) : sorted),
    [sorted, filter],
  );
  const visible = showAll ? filtered : filtered?.slice(0, VISIBLE_DEFAULT);
  const hiddenCount = filtered ? filtered.length - (visible?.length ?? 0) : 0;

  const alertsByRoute = useMemo(() => {
    if (!disruptions || routes.length === 0) return new Map();
    return disruptionsByRoute(disruptions, routes.map((r) => r.routeId));
  }, [disruptions, routes]);
  const alertedRoutes = routes.filter((r) => alertsByRoute.has(r.routeId));
  const alertList = alertRouteId ? alertsByRoute.get(alertRouteId) : null;

  const anyFavorited = routes.some((r) => isFavorite(stop.code, r.routeId));
  const hasCoords = Number.isFinite(stop.lat) && Number.isFinite(stop.lon);
  const walkMinutes =
    position && hasCoords ? estimateWalkMinutes(distanceMeters(position.lat, position.lon, stop.lat, stop.lon)) : null;
  const walkDistance =
    position && hasCoords ? formatDistance(distanceMeters(position.lat, position.lon, stop.lat, stop.lon)) : null;

  function favoriteEntry(route) {
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

  function handleStar() {
    if (routes.length === 1) toggleFavorite(favoriteEntry(routes[0]));
    else setPickerOpen((open) => !open);
  }

  const map = (
    <MapCanvas
      stops={stops}
      routesById={routesById}
      onSelectStop={nav.openStop}
      position={position}
      focusStop={hasCoords ? stop : null}
    />
  );

  return (
    <ScreenShell map={map} onBack={nav.back} label={`Arrêt ${stop.name}`}>
      <div className="stop-head">
        <div>
          <h1>{stop.name}</h1>
          <p className="stop-meta">
            <span className="dot" aria-hidden="true" />
            Temps réel{stop.city ? ` · ${stop.city}` : ''}
            {walkMinutes != null && ` · ${walkMinutes} min à pied`}
          </p>
        </div>
        <button
          type="button"
          className={anyFavorited ? 'star-btn boxed active' : 'star-btn boxed'}
          onClick={handleStar}
          disabled={routes.length === 0}
          aria-pressed={anyFavorited}
          aria-expanded={routes.length > 1 ? pickerOpen : undefined}
          aria-label={anyFavorited ? 'Gérer les lignes favorites' : 'Ajouter aux favoris'}
        >
          <Star size={22} weight={anyFavorited ? 'fill' : 'regular'} aria-hidden="true" />
        </button>
      </div>

      {pickerOpen && routes.length > 1 && (
        <div className="route-picker">
          <p>Quelle(s) ligne(s) suivre à cet arrêt ?</p>
          <ul>
            {routes.map((r) => {
              const fav = isFavorite(stop.code, r.routeId);
              return (
                <li key={r.routeId}>
                  <button
                    type="button"
                    className={fav ? 'chip active' : 'chip'}
                    aria-pressed={fav}
                    onClick={() => toggleFavorite(favoriteEntry(r))}
                  >
                    <LineBadge shortName={r.shortName} color={r.color} textColor={r.textColor} size="xs" />
                    <Star size={14} weight={fav ? 'fill' : 'regular'} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="action-row">
        {hasCoords && (
          <button type="button" className="btn btn-primary" onClick={() => nav.openWalk(stop)}>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
            Y aller{walkDistance ? ` · ${walkDistance}` : ''}
          </button>
        )}
      </div>

      {alertedRoutes.length > 0 && (
        <button type="button" className="alert-banner" onClick={() => setAlertRouteId(alertedRoutes[0].routeId)}>
          <Warning size={18} weight="fill" aria-hidden="true" />
          <span>
            <strong>
              {alertedRoutes.map((r) => r.shortName).join(', ')} · perturbation
              {alertedRoutes.length > 1 ? 's' : ''}
            </strong>{' '}
            sur cet arrêt
          </span>
          <CaretRight size={14} weight="bold" aria-hidden="true" />
        </button>
      )}

      {routes.length > 1 && (
        <div className="chip-row" role="group" aria-label="Filtrer par ligne">
          <button type="button" className={filter === null ? 'chip active' : 'chip'} aria-pressed={filter === null} onClick={() => setFilter(null)}>
            Toutes
          </button>
          {routes.map((r) => (
            <button
              key={r.routeId}
              type="button"
              className={filter === r.routeId ? 'chip active' : 'chip'}
              aria-pressed={filter === r.routeId}
              onClick={() => setFilter(filter === r.routeId ? null : r.routeId)}
            >
              <LineBadge shortName={r.shortName} color={r.color} textColor={r.textColor} size="xs" />
            </button>
          ))}
        </div>
      )}

      {loading && !patterns && <p className="muted">Chargement des horaires…</p>}
      {error && !patterns && <p className="error">Impossible de charger les horaires pour cet arrêt.</p>}
      {filtered && filtered.length === 0 && <p className="muted">Aucun passage prévu pour le moment.</p>}

      {visible && visible.length > 0 && (
        <ul className="departure-list">
          {visible.map((p, idx) => {
            const routeId = routeIdFromPatternId(p.pattern.id);
            const route = routesById?.get(routeId);
            const first = p.times[0];
            if (!first) return null;
            const minutes = minutesUntil(first.serviceDay, first.realtimeArrival);
            const delayMin = first.realtime ? Math.round((first.arrivalDelay || 0) / 60) : 0;
            const delayed = delayMin >= 2;
            const later = p.times.slice(1, 4).map((t) => minutesUntil(t.serviceDay, t.realtimeArrival));
            return (
              <li key={`${p.pattern.id}-${idx}`}>
                <button
                  type="button"
                  className="departure-row"
                  onClick={() => route && nav.openLine(route, stop)}
                  disabled={!route?.timeSheet}
                >
                  <LineBadge
                    shortName={route?.shortName || p.pattern.shortDesc}
                    color={route?.color}
                    textColor={route?.textColor}
                    size="lg"
                    alert={alertsByRoute.has(routeId)}
                  />
                  <span className="departure-text">
                    <span className="departure-dest">{p.pattern.desc}</span>
                    <span className={delayed ? 'departure-sub warn' : 'departure-sub'}>
                      {delayed ? `+${delayMin} min de retard` : first.realtime ? 'À l’heure' : `Horaire théorique · ${formatTime(first.serviceDay, first.realtimeArrival)}`}
                      {first.occupancy ? ` · ${first.occupancy}` : ''}
                    </span>
                  </span>
                  <span className="departure-time">
                    <span className={delayed ? 'departure-min warn' : idx === 0 ? 'departure-min next' : 'departure-min'}>
                      {minutesText(minutes)}
                      <small>min</small>
                    </span>
                    {later.length > 0 && <span className="departure-later">puis {later.join(' · ')}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button type="button" className="btn btn-outline wide" onClick={() => setShowAll(true)}>
          Afficher {hiddenCount} ligne{hiddenCount > 1 ? 's' : ''} de plus
          <CaretDown size={14} aria-hidden="true" />
        </button>
      )}

      {alertList && (
        <Modal
          title={`Alertes — ligne ${routesById?.get(alertRouteId)?.shortName || ''}`}
          onClose={() => setAlertRouteId(null)}
        >
          <AlertList alerts={alertList} />
        </Modal>
      )}
    </ScreenShell>
  );
}
