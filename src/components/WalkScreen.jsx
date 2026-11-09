import { useEffect, useMemo, useState } from 'react';
import {
  ArrowBendUpLeft, ArrowBendUpRight, ArrowUp, ArrowUUpLeft, Crosshair, MapPin, PersonSimpleWalk, Warning,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { useStopTimes } from '../hooks/useStopTimes';
import { useWalkRoute } from '../hooks/useWalkRoute';
import { useNow } from '../hooks/useNow';
import { distanceMeters, formatDistance } from '../utils/geo';
import { catchAdvice, estimateWalkMinutes } from '../utils/walk';
import { upcomingDepartures } from '../utils/departures';
import LineBadge from './LineBadge';
import MapCanvas from './MapCanvas';
import ScreenShell from './ScreenShell';

const STEP_ICONS = {
  start: PersonSimpleWalk,
  straight: ArrowUp,
  left: ArrowBendUpLeft,
  right: ArrowBendUpRight,
  uturn: ArrowUUpLeft,
};

const MAX_STEPS = 8;

function Advice({ advice, walkMinutes, first, routesById }) {
  if (advice.status === 'none') return null;
  const route = first ? routesById?.get(first.routeId) : null;
  let tone = 'ok';
  let body;
  if (advice.status === 'ok') {
    body = (
      <>
        <strong>Vous l’aurez.</strong> Prochain passage dans {advice.first} min, vous arrivez{' '}
        {advice.margin} min avant.
      </>
    );
  } else if (advice.status === 'tight') {
    tone = 'warn';
    body = (
      <>
        <strong>Ça va être juste.</strong> Prochain passage dans {advice.first} min, pour {walkMinutes} min de marche.
      </>
    );
  } else {
    tone = 'warn';
    body = advice.catchable != null ? (
      <>
        <strong>Vous risquez de rater le prochain</strong> (dans {advice.first} min). Le suivant atteignable
        passe dans {advice.catchable} min.
      </>
    ) : (
      <>
        <strong>Aucun passage atteignable</strong> dans l’immédiat : marche de {walkMinutes} min.
      </>
    );
  }
  return (
    <div className={`advice ${tone}`}>
      {route && <LineBadge shortName={route.shortName} color={route.color} textColor={route.textColor} size="lg" />}
      <p>{body}</p>
    </div>
  );
}

/** Itinéraire à pied jusqu'à un arrêt, avec verdict "vous l'aurez / juste / raté". */
export default function WalkScreen({ stop }) {
  const { stops, routesById, position, geoStatus, geoError, requestLocation, nav } = useApp();
  const [fitKey, setFitKey] = useState(0);
  useNow(15_000);

  // Arriver ici via « Y aller » est une demande explicite : on localise si besoin.
  useEffect(() => {
    if (!position && geoStatus === 'idle') requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { route, loading: routeLoading } = useWalkRoute(position, stop);
  const { patterns } = useStopTimes(stop.code);

  const straight = position ? distanceMeters(position.lat, position.lon, stop.lat, stop.lon) : null;
  const walkMinutes = route?.minutes ?? estimateWalkMinutes(straight);
  const distance = route?.distance ?? straight;
  const arrival = walkMinutes != null ? new Date(Date.now() + walkMinutes * 60000) : null;

  const path = useMemo(() => {
    if (route?.path?.length > 1) return route.path;
    if (position) {
      return [[position.lat, position.lon], [stop.lat, stop.lon]];
    }
    return null;
  }, [route, position, stop.lat, stop.lon]);

  const departures = useMemo(() => upcomingDepartures(patterns), [patterns]);
  const advice = catchAdvice(walkMinutes, departures.map((d) => d.minutes));
  const adviceDeparture = departures.find((d) => d.minutes >= (walkMinutes ?? 0)) || departures[0];

  const map = (
    <MapCanvas
      stops={stops}
      routesById={routesById}
      linesMode="none"
      position={position}
      focusStop={stop}
      path={path}
      fitKey={fitKey}
    />
  );

  return (
    <ScreenShell map={map} onBack={nav.back} label={`Itinéraire à pied vers ${stop.name}`}>
      {!position && geoStatus !== 'error' && (
        <div className="walk-state">
          <MapPin size={28} weight="fill" aria-hidden="true" />
          <p>Localisation en cours…</p>
        </div>
      )}

      {!position && geoStatus === 'error' && (
        <div className="walk-state">
          <Warning size={28} weight="fill" aria-hidden="true" />
          <p>
            Impossible de vous localiser ({geoError?.message || 'permission refusée'}). Autorisez la
            localisation pour calculer l’itinéraire.
          </p>
          <button type="button" className="btn btn-primary" onClick={requestLocation}>
            Réessayer
          </button>
        </div>
      )}

      {position && (
        <>
          <div className="walk-summary">
            <div>
              <span className="walk-duration">{walkMinutes ?? '…'} min</span>
              <span className="walk-distance">
                à pied{distance != null ? ` · ${formatDistance(distance)}` : ''}
              </span>
            </div>
            {arrival && (
              <span className="walk-arrival">
                arrivée {arrival.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <p className="walk-dest">
            Vers <strong>{stop.name}</strong>
            {stop.city ? `, ${stop.city}` : ''}
          </p>

          <Advice advice={advice} walkMinutes={walkMinutes} first={adviceDeparture} routesById={routesById} />

          {route?.steps?.length > 0 ? (
            <ol className="steps">
              {route.steps.slice(0, MAX_STEPS).map((step, i) => {
                const Icon = STEP_ICONS[step.icon] || ArrowUp;
                return (
                  <li key={i}>
                    <span className="step-icon">
                      <Icon size={16} weight="bold" aria-hidden="true" />
                    </span>
                    <span className="step-text">{step.text}</span>
                    {step.distance != null && <small>{step.distance} m</small>}
                  </li>
                );
              })}
              <li>
                <span className="step-icon done">
                  <MapPin size={16} weight="fill" aria-hidden="true" />
                </span>
                <span className="step-text">Arrêt {stop.name}</span>
                <small>arrivée</small>
              </li>
            </ol>
          ) : (
            !routeLoading && (
              <p className="hint">
                Itinéraire détaillé indisponible : durée estimée à vol d’oiseau.
              </p>
            )
          )}
        </>
      )}

      <div className="action-row sticky">
        <button type="button" className="btn btn-primary grow" onClick={() => nav.replaceWithStop(stop)}>
          Voir les départs
        </button>
        <button
          type="button"
          className="round-btn"
          onClick={() => setFitKey((k) => k + 1)}
          aria-label="Recentrer la carte"
        >
          <Crosshair size={22} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </ScreenShell>
  );
}
