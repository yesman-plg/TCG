import { useMemo, useState } from 'react';
import { ArrowRight, Crosshair, MapPin, Star, Trash, Warning } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { useNow } from '../hooks/useNow';
import { useStopTimes } from '../hooks/useStopTimes';
import { distanceMeters, formatDistance } from '../utils/geo';
import { estimateWalkMinutes } from '../utils/walk';
import { upcomingDepartures } from '../utils/departures';
import LineBadge from './LineBadge';
import Modal from './Modal';
import SearchBox from './SearchBox';

function greeting(date) {
  const h = date.getHours();
  return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir';
}

function minutesLabel(minutes) {
  if (minutes === undefined) return '…';
  return minutes <= 1 ? '<1' : String(minutes);
}

/** Prochain départ en grand : favori le plus proche, sinon l'arrêt le plus proche. */
function Hero({ candidate }) {
  const { routesById, nav } = useApp();
  const { patterns, error, loading } = useStopTimes(candidate.stop.code);
  useNow(5000);

  const departures = useMemo(
    () => upcomingDepartures(patterns, candidate.routeIds),
    [patterns, candidate.routeIds],
  );
  const next = departures[0];
  const route = next ? routesById?.get(next.routeId) : null;
  const following = next
    ? departures.filter((d) => d.routeId === next.routeId && d.destination === next.destination).slice(1, 3)
    : [];
  const delayMin = next ? Math.round(next.delaySeconds / 60) : 0;

  return (
    <section className="hero" aria-label="Prochain départ">
      <button type="button" className="hero-body" onClick={() => nav.openStop(candidate.stop)}>
        <span className="hero-top">
          <span>
            VOTRE PROCHAIN DÉPART
          </span>
          {next && (
            <span className={next.realtime ? 'hero-live' : 'hero-live theoretical'}>
              <span className="dot" aria-hidden="true" />
              {next.realtime ? 'Temps réel' : 'Théorique'}
            </span>
          )}
        </span>
        {loading && !next && <span className="muted">Chargement…</span>}
        {error && !next && <span className="muted">Passages indisponibles pour le moment.</span>}
        {!loading && !error && !next && <span className="muted">Aucun passage prévu prochainement.</span>}
        {next && (
          <>
            <span className="hero-time">
              <span className="hero-minutes">
                <strong>{minutesLabel(next.minutes)}</strong>
                <span>min</span>
              </span>
              {following.length > 0 && (
                <span className="hero-following">
                  puis {following.map((d) => d.minutes).join(' · ')} min
                </span>
              )}
            </span>
            <span className="hero-line">
              <LineBadge shortName={route?.shortName} color={route?.color} textColor={route?.textColor} size="lg" />
              <span>
                <span className="hero-dest">{next.destination}</span>
                <span className="hero-sub">
                  depuis {candidate.stop.name}
                  {candidate.distance != null && ` · ${formatDistance(candidate.distance)}`}
                  {delayMin >= 2 ? ` · +${delayMin} min de retard` : next.realtime ? ' · à l’heure' : ''}
                </span>
              </span>
            </span>
          </>
        )}
      </button>
    </section>
  );
}

function HeroEmpty() {
  const { geoStatus, requestLocation } = useApp();
  return (
    <section className="hero hero-empty" aria-label="Prochain départ">
      <p className="hero-empty-title">Votre prochain départ s’affichera ici</p>
      <p className="muted">
        Ajoutez un arrêt en favori, ou autorisez la localisation pour voir les passages les plus proches.
      </p>
      {geoStatus !== 'loading' && (
        <button type="button" className="btn btn-primary" onClick={requestLocation}>
          <Crosshair size={18} weight="bold" aria-hidden="true" />
          Autour de moi
        </button>
      )}
      {geoStatus === 'loading' && <p className="muted">Localisation en cours…</p>}
    </section>
  );
}

/** Minutes avant le prochain passage d'un arrêt (pour favoris et proximité). */
function useNextMinutes(code, routeIds) {
  const { patterns, error } = useStopTimes(code);
  useNow(5000);
  const first = upcomingDepartures(patterns, routeIds)[0];
  return { minutes: first?.minutes, loaded: patterns !== null, error };
}

function FavoriteCard({ group, stop }) {
  const { nav } = useApp();
  const routeIds = group.routes.map((r) => r.routeId);
  const { minutes, loaded, error } = useNextMinutes(group.code, routeIds);
  return (
    <button type="button" className="fav-card" onClick={() => nav.openStop(stop)}>
      <span className="fav-card-name">{group.name}</span>
      <span className="fav-card-lines">
        {group.routes.map((r) => (
          <LineBadge key={r.routeId} shortName={r.routeShortName} color={r.routeColor} textColor={r.routeTextColor} size="sm" />
        ))}
      </span>
      <span className="fav-card-time">
        {error ? '–' : loaded ? minutesLabel(minutes ?? undefined) : '…'}
        {!error && loaded && minutes !== undefined && <small>min</small>}
      </span>
    </button>
  );
}

function ManageFavorites({ onClose }) {
  const { favorites, removeFavorite } = useApp();
  return (
    <Modal title="Gérer mes favoris" onClose={onClose}>
      {favorites.length === 0 ? (
        <p className="muted">Aucun favori.</p>
      ) : (
        <ul className="manage-list">
          {favorites.map((f) => (
            <li key={`${f.code}-${f.routeId}`}>
              <LineBadge shortName={f.routeShortName} color={f.routeColor} textColor={f.routeTextColor} size="sm" />
              <span className="manage-name">
                {f.name}
                <small>{f.city}</small>
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => removeFavorite(f.code, f.routeId)}
                aria-label={`Retirer ${f.name}, ligne ${f.routeShortName}, des favoris`}
              >
                <Trash size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function NearbyRow({ stop, primary }) {
  const { nav } = useApp();
  const { minutes, loaded, error } = useNextMinutes(stop.code, null);
  const walk = estimateWalkMinutes(stop.distance);
  return (
    <li className="nearby-row">
      <button type="button" className="nearby-info" onClick={() => nav.openStop(stop)}>
        <span className="nearby-name">{stop.name}</span>
        <span className="nearby-sub">
          <strong>
            {error ? '–' : loaded && minutes !== undefined ? `${minutes <= 1 ? '<1' : minutes} min` : loaded ? 'Aucun passage' : '…'}
          </strong>
          {' · '}
          {formatDistance(stop.distance)} · {walk} min à pied
        </span>
      </button>
      <button
        type="button"
        className={primary ? 'btn btn-go primary' : 'btn btn-go'}
        onClick={() => nav.openWalk(stop)}
        aria-label={`Y aller : itinéraire à pied vers ${stop.name}`}
      >
        <ArrowRight size={16} weight="bold" aria-hidden="true" />
        Y aller
      </button>
    </li>
  );
}

export default function HomeTab() {
  const {
    stops, stopsError, favorites, position, nearestStops, geoStatus, geoError, requestLocation,
  } = useApp();
  const [managing, setManaging] = useState(false);
  const now = new Date();
  useNow(30_000);

  const stopByCode = useMemo(() => new Map((stops || []).map((s) => [s.code, s])), [stops]);

  const favoriteGroups = useMemo(() => {
    const groups = new Map();
    for (const f of favorites) {
      if (!groups.has(f.code)) groups.set(f.code, { code: f.code, name: f.name, city: f.city, routes: [] });
      groups.get(f.code).routes.push(f);
    }
    return [...groups.values()].map((g) => {
      const stop = stopByCode.get(g.code) || { code: g.code, name: g.name, city: g.city };
      const distance =
        position && Number.isFinite(stop.lat)
          ? distanceMeters(position.lat, position.lon, stop.lat, stop.lon)
          : null;
      return { ...g, stop, distance };
    });
  }, [favorites, stopByCode, position]);

  // Candidat du "prochain départ" : le favori le plus proche (ou le premier
  // sans position), à défaut l'arrêt le plus proche.
  const candidate = useMemo(() => {
    if (favoriteGroups.length > 0) {
      const sorted = [...favoriteGroups].sort(
        (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
      );
      const g = sorted[0];
      return { stop: g.stop, routeIds: g.routes.map((r) => r.routeId), distance: g.distance };
    }
    if (nearestStops[0]) {
      return { stop: nearestStops[0], routeIds: null, distance: nearestStops[0].distance };
    }
    return null;
  }, [favoriteGroups, nearestStops]);

  return (
    <main className="tab-screen home">
      <header className="home-header">
        <div>
          <p className="home-hello">
            {greeting(now)}, il est {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <h1>Où allez-vous ?</h1>
        </div>
        <button
          type="button"
          className="round-btn"
          onClick={requestLocation}
          aria-label="Actualiser ma position"
          title="Actualiser ma position"
        >
          <Crosshair size={20} weight="bold" aria-hidden="true" />
        </button>
      </header>

      {stopsError && (
        <p className="error">
          <Warning size={18} aria-hidden="true" />
          Impossible de charger la liste des arrêts. Vérifie ta connexion et recharge la page.
        </p>
      )}

      <SearchBox />

      {candidate ? <Hero key={candidate.stop.code} candidate={candidate} /> : <HeroEmpty />}

      {favoriteGroups.length > 0 && (
        <section aria-label="Favoris">
          <div className="section-head">
            <h2>Favoris</h2>
            <button type="button" className="link-btn" onClick={() => setManaging(true)}>
              Gérer
            </button>
          </div>
          <div className="fav-scroll">
            {favoriteGroups.map((g) => (
              <FavoriteCard key={g.code} group={g} stop={g.stop} />
            ))}
          </div>
        </section>
      )}

      {favoriteGroups.length === 0 && (
        <p className="hint">
          <Star size={16} weight="fill" aria-hidden="true" />
          Ouvrez un arrêt et touchez l’étoile pour le retrouver ici.
        </p>
      )}

      <section aria-label="À proximité">
        <h2>À proximité</h2>
        {geoStatus === 'idle' && (
          <button type="button" className="btn btn-outline wide" onClick={requestLocation} disabled={!stops}>
            <MapPin size={18} weight="fill" aria-hidden="true" />
            Voir les arrêts près de moi
          </button>
        )}
        {geoStatus === 'loading' && <p className="muted">Localisation en cours…</p>}
        {geoStatus === 'error' && (
          <p className="error">
            <Warning size={18} aria-hidden="true" />
            Localisation impossible ({geoError?.message || 'permission refusée'}).{' '}
            <button type="button" className="link-btn" onClick={requestLocation}>
              Réessayer
            </button>
          </p>
        )}
        {geoStatus === 'granted' && (
          <ul className="card-list">
            {nearestStops.slice(0, 3).map((s, i) => (
              <NearbyRow key={s.code} stop={s} primary={i === 0} />
            ))}
          </ul>
        )}
      </section>

      {managing && <ManageFavorites onClose={() => setManaging(false)} />}
    </main>
  );
}
