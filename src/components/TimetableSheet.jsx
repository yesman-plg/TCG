import { ArrowLeft, ArrowRight, ArrowsLeftRight, CaretLeft, CaretRight, Circle, Warning } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useTimeSheet } from '../hooks/useTimeSheet';
import { formatSheetTime, secondsFromTimeInput } from '../utils/timetable';

function asDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function asTimeInput(value) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function timestampFromInputs(date, time) {
  const parsed = new Date(`${date}T${time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
}

function routeStyle(route) {
  return route.color ? { background: `#${route.color}`, color: `#${route.textColor || 'FFFFFF'}` } : undefined;
}

function endpointLabel(stop) {
  if (!stop) return 'Terminus inconnu';
  return [stop.city, stop.name].filter(Boolean).join(' ');
}

function closestFutureTimeIndex(times, requestedSeconds) {
  const index = times.findIndex((value) => value >= requestedSeconds);
  return index === -1 ? 0 : index;
}

export default function TimetableSheet({ route, onBack }) {
  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState(() => asDateInput(now));
  const [time, setTime] = useState(() => asTimeInput(now));
  const [activeDirectionId, setActiveDirectionId] = useState('0');
  const requestedAt = useMemo(() => timestampFromInputs(date, time), [date, time]);
  const { sheet, error, loading, retry } = useTimeSheet(route.id, requestedAt);

  const activeDirection = sheet?.directions.find((direction) => direction.id === activeDirectionId)
    || sheet?.directions[0]
    || null;
  const requestedSeconds = secondsFromTimeInput(time);

  function changePage(timestamp) {
    if (!Number.isFinite(timestamp)) return;
    const nextDate = new Date(timestamp);
    setDate(asDateInput(nextDate));
    setTime(asTimeInput(nextDate));
  }

  function switchDirection() {
    const directions = sheet?.directions || [];
    if (directions.length < 2) return;
    const activeIndex = directions.findIndex((direction) => direction.id === activeDirection?.id);
    const nextDirection = directions[(activeIndex + 1) % directions.length];
    setActiveDirectionId(nextDirection.id);
  }

  return (
    <section className="timetable-sheet" aria-busy={loading}>
      <header className="timetable-sheet-header">
        <button type="button" className="timetable-back-button" onClick={onBack} aria-label="Retour aux lignes">
          <ArrowLeft size={22} weight="bold" aria-hidden="true" />
        </button>
        <span className="timetable-sheet-badge" style={routeStyle(route)} aria-hidden="true">{route.shortName}</span>
        <div>
          <h2>Fiche horaire</h2>
        </div>
      </header>

      {activeDirection && (
        <section className="timetable-route-summary" aria-label="Sens de circulation">
          <strong className="timetable-route-endpoint timetable-route-origin">
            {endpointLabel(activeDirection.stops[0])}
          </strong>
          {sheet.directions.length > 1 ? (
            <button
              type="button"
              className="timetable-direction-switch"
              onClick={switchDirection}
              aria-label="Changer de sens"
            >
              <ArrowsLeftRight size={21} weight="bold" aria-hidden="true" />
            </button>
          ) : <span aria-hidden="true" />}
          <strong className="timetable-route-endpoint timetable-route-destination">
            {endpointLabel(activeDirection.stops.at(-1))}
          </strong>
          <div className="timetable-route-track" aria-hidden="true">
            <Circle size={18} weight="fill" />
            <span />
            <ArrowRight size={20} weight="bold" />
            <Circle size={18} weight="bold" />
          </div>
        </section>
      )}

      <div className="timetable-inputs" aria-label="Moment de consultation">
        <label>
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          <span>Heure</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
      </div>

      {loading && !sheet && <p className="muted timetable-status">Chargement de la fiche horaire…</p>}
      {loading && sheet && <p className="visually-hidden" role="status">Mise à jour des horaires…</p>}

      {error && (
        <div className="timetable-request-error" role="alert">
          <Warning size={20} weight="fill" aria-hidden="true" />
          <p>Impossible de charger cette fiche horaire.</p>
          <button type="button" onClick={retry}>Réessayer</button>
        </div>
      )}

      {!loading && !error && sheet?.directions.length === 0 && (
        <p className="muted timetable-status">Aucune circulation n’est prévue pour cette ligne à cette date et cette heure.</p>
      )}

      {activeDirection && (
        <>
          <div className="timetable-page-controls" aria-label="Navigation dans les horaires">
            <button
              type="button"
              onClick={() => changePage(activeDirection.previousAt)}
              disabled={loading || !activeDirection.previousAt}
              aria-label="Voir les horaires précédents"
            >
              <CaretLeft size={24} weight="bold" aria-hidden="true" />
              <span>Précédent</span>
            </button>
            <button
              type="button"
              onClick={() => changePage(activeDirection.nextAt)}
              disabled={loading || !activeDirection.nextAt}
              aria-label="Voir les horaires suivants"
            >
              <span>Suivant</span>
              <CaretRight size={24} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <div className="timetable-stop-list timetable-journey-list" aria-label="Horaires par arrêt">
            {activeDirection.stops.map((stop, stopIndex) => {
              const nextTimeIndex = closestFutureTimeIndex(stop.times, requestedSeconds);
              return (
                <div className="timetable-stop-row" key={`${stop.id}-${stopIndex}`}>
                  <div className="timetable-stop-marker" aria-hidden="true">
                    <Circle size={20} weight={stopIndex === 0 ? 'fill' : 'bold'} />
                  </div>
                  <div className="timetable-stop-name">
                    {stop.city && <span>{stop.city}</span>}
                    <strong>{stop.name}</strong>
                  </div>
                  <div className="timetable-stop-times">
                    {stop.times.slice(0, 4).map((scheduledTime, timeIndex) => (
                      <time
                        dateTime={formatSheetTime(scheduledTime)}
                        className={timeIndex === nextTimeIndex ? 'next' : ''}
                        key={`${scheduledTime}-${timeIndex}`}
                      >
                        {formatSheetTime(scheduledTime)}
                      </time>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
