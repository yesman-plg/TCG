import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsDownUp, CaretLeft, CaretRight, Star, Warning } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { useStopTimes } from '../hooks/useStopTimes';
import { useTimeSheet } from '../hooks/useTimeSheet';
import { useNow } from '../hooks/useNow';
import { upcomingDepartures } from '../utils/departures';
import { formatSheetTime, secondsFromTimeInput } from '../utils/timetable';
import LineBadge from './LineBadge';
import MapCanvas from './MapCanvas';
import ScreenShell from './ScreenShell';

function asDateInput(value) {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

function asTimeInput(value) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function timestampFromInputs(date, time) {
  const parsed = new Date(`${date}T${time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
}

function nextIndex(times, requestedSeconds) {
  return times.findIndex((value) => value >= requestedSeconds);
}

function sameStop(sheetStop, stop) {
  if (!stop) return false;
  const a = sheetStop.name.toLowerCase();
  const b = stop.name.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Fiche d'une ligne : parcours des arrêts avec prochain passage, et grille
 * horaire complète (date, heure, sens). `stop` met en avant l'arrêt d'où l'on vient.
 */
export default function LineScreen({ route, stop }) {
  const { stops, routesById, isFavoriteLine, toggleFavoriteLine, nav } = useApp();
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState('journey');
  const [date, setDate] = useState(() => asDateInput(now));
  const [time, setTime] = useState(() => asTimeInput(now));
  const [directionId, setDirectionId] = useState(null);
  const requestedAt = useMemo(() => timestampFromInputs(date, time), [date, time]);
  const requestedSeconds = secondsFromTimeInput(time);
  const { sheet, error, loading, retry } = useTimeSheet(route.id, requestedAt);
  const focusRef = useRef(null);
  useNow(10_000);

  const hasCoords = stop && Number.isFinite(stop.lat) && Number.isFinite(stop.lon);
  const live = useStopTimes(stop?.code);
  const liveNext = useMemo(
    () => (stop ? upcomingDepartures(live.patterns, [route.id])[0] : null),
    [live.patterns, route.id, stop],
  );

  const directions = sheet?.directions || [];
  const active =
    directions.find((d) => d.id === directionId) ||
    directions.find((d) => d.stops.some((s) => sameStop(s, stop))) ||
    directions[0] ||
    null;

  function switchDirection() {
    if (directions.length < 2) return;
    const index = directions.findIndex((d) => d.id === active?.id);
    setDirectionId(directions[(index + 1) % directions.length].id);
  }

  function changePage(timestamp) {
    if (!Number.isFinite(timestamp)) return;
    const next = new Date(timestamp);
    setDate(asDateInput(next));
    setTime(asTimeInput(next));
  }

  // Met l'arrêt d'origine en vue dans le parcours.
  useEffect(() => {
    if (tab === 'journey' && focusRef.current) {
      focusRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [tab, active?.id, sheet]);

  const origin = active?.stops[0]?.name;
  const destination = active?.stops.at(-1)?.name;
  const starred = isFavoriteLine(route.id);

  const map = (
    <MapCanvas
      routesById={routesById}
      stops={stops}
      highlightRouteId={route.id}
      focusStop={hasCoords ? stop : null}
    />
  );

  return (
    <ScreenShell map={map} onBack={nav.back} label={`Ligne ${route.shortName}`}>
      <div className="line-head">
        <LineBadge shortName={route.shortName} color={route.color} textColor={route.textColor} size="xl" />
        <div className="line-head-text">
          <h1>{route.longName || `Ligne ${route.shortName}`}</h1>
          {origin && destination && (
            <p>
              {origin} → {destination}
            </p>
          )}
        </div>
        <button
          type="button"
          className={starred ? 'star-btn boxed active' : 'star-btn boxed'}
          onClick={() => toggleFavoriteLine(route.id)}
          aria-pressed={starred}
          aria-label={starred ? `Retirer la ligne ${route.shortName} des favoris` : `Suivre la ligne ${route.shortName}`}
        >
          <Star size={22} weight={starred ? 'fill' : 'regular'} aria-hidden="true" />
        </button>
      </div>

      <div className="segmented" role="tablist" aria-label="Affichage">
        <button type="button" role="tab" aria-selected={tab === 'journey'} className={tab === 'journey' ? 'active' : ''} onClick={() => setTab('journey')}>
          Parcours
        </button>
        <button type="button" role="tab" aria-selected={tab === 'grid'} className={tab === 'grid' ? 'active' : ''} onClick={() => setTab('grid')}>
          Horaires
        </button>
      </div>

      {directions.length > 1 && (
        <button type="button" className="btn btn-outline wide" onClick={switchDirection}>
          <ArrowsDownUp size={18} aria-hidden="true" />
          Changer de sens
        </button>
      )}

      {loading && !sheet && <p className="muted">Chargement de la fiche horaire…</p>}
      {error && (
        <div className="request-error" role="alert">
          <Warning size={20} weight="fill" aria-hidden="true" />
          <p>Impossible de charger cette fiche horaire.</p>
          <button type="button" className="btn btn-outline" onClick={retry}>Réessayer</button>
        </div>
      )}
      {!loading && !error && sheet && directions.length === 0 && (
        <p className="muted">Aucune circulation n’est prévue pour cette ligne à cette date et cette heure.</p>
      )}

      {tab === 'journey' && active && (
        <ol className="journey" aria-label="Arrêts de la ligne">
          {active.stops.map((s, i) => {
            const idx = nextIndex(s.times, requestedSeconds);
            const focused = sameStop(s, stop);
            const text = idx === -1 ? '—' : formatSheetTime(s.times[idx]);
            const last = i === active.stops.length - 1;
            return (
              <li
                key={`${s.id}-${i}`}
                ref={focused ? focusRef : null}
                className={focused ? 'journey-stop focused' : 'journey-stop'}
              >
                <span className={i === 0 || last ? 'journey-dot terminus' : 'journey-dot'} aria-hidden="true" />
                <span className="journey-name">
                  {s.name}
                  {focused && <small> · votre arrêt</small>}
                </span>
                {focused && liveNext ? (
                  <span className="journey-time live">
                    {liveNext.minutes <= 1 ? '<1' : liveNext.minutes} min
                  </span>
                ) : (
                  <span className="journey-time">{i === 0 ? `Départ ${text}` : last ? `Arrivée ${text}` : text}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {tab === 'grid' && (
        <>
          <div className="timetable-inputs">
            <label>
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              <span>Heure</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>

          {active && (
            <>
              <div className="page-controls">
                <button type="button" className="btn btn-outline" onClick={() => changePage(active.previousAt)} disabled={loading || !active.previousAt}>
                  <CaretLeft size={18} weight="bold" aria-hidden="true" /> Précédents
                </button>
                <button type="button" className="btn btn-outline" onClick={() => changePage(active.nextAt)} disabled={loading || !active.nextAt}>
                  Suivants <CaretRight size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
              <ul className="grid-list">
                {active.stops.map((s, i) => {
                  const idx = nextIndex(s.times, requestedSeconds);
                  return (
                    <li key={`${s.id}-${i}`} className={sameStop(s, stop) ? 'grid-row focused' : 'grid-row'}>
                      <span className="grid-name">
                        {s.city && <small>{s.city}</small>}
                        {s.name}
                      </span>
                      <span className="grid-times">
                        {s.times.slice(0, 4).map((t, k) => (
                          <time key={`${t}-${k}`} dateTime={formatSheetTime(t)} className={k === (idx === -1 ? 0 : idx) ? 'next' : ''}>
                            {formatSheetTime(t)}
                          </time>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </ScreenShell>
  );
}
