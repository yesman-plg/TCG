import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStops } from './hooks/useStops';
import { useRoutes } from './hooks/useRoutes';
import { useDisruptions } from './hooks/useDisruptions';
import { useFavorites } from './hooks/useFavorites';
import { useFavoriteLines } from './hooks/useFavoriteLines';
import { useGeolocation } from './hooks/useGeolocation';
import { activeDisruptionsByLine } from './utils/disruptions';
import { classifyDisruption } from './utils/traffic';
import { distanceMeters } from './utils/geo';
import { AppContext } from './context/AppContext';
import BottomNav from './components/BottomNav';
import HomeTab from './components/HomeTab';
import MapTab from './components/MapTab';
import LinesTab from './components/LinesTab';
import TrafficTab from './components/TrafficTab';
import StopScreen from './components/StopScreen';
import WalkScreen from './components/WalkScreen';
import LineScreen from './components/LineScreen';
import './App.css';

// Seules les lignes urbaines "SEM" ont des arrêts recherchables dans l'app :
// on s'y limite pour le compteur de perturbations.
const APP_AGENCY = 'SEM';
const NEAREST_COUNT = 8;

export default function App() {
  const { stops, error: stopsError } = useStops();
  const { routes, routesById } = useRoutes();
  const { disruptions } = useDisruptions();
  const favoritesApi = useFavorites();
  const favoriteLinesApi = useFavoriteLines();
  const { position, status: geoStatus, error: geoError, request: requestLocation } = useGeolocation();

  const [tab, setTab] = useState('home');
  // Pile d'écrans ouverts par-dessus l'onglet courant (arrêt, itinéraire, ligne).
  const [stack, setStack] = useState([]);
  const stackRef = useRef(stack);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  // Si la permission est déjà accordée, on se géolocalise sans rien demander.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        if (!cancelled && result.state === 'granted') requestLocation();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [requestLocation]);

  // Le bouton retour du navigateur / du téléphone ferme l'écran du dessus.
  useEffect(() => {
    function onPopState() {
      setStack((s) => (s.length > 0 ? s.slice(0, -1) : s));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const push = useCallback((screen) => {
    window.history.pushState({ screen: screen.type }, '');
    setStack((s) => [...s, screen]);
  }, []);

  const nav = useMemo(
    () => ({
      openStop: (stop) => push({ type: 'stop', stop }),
      openWalk: (stop) => push({ type: 'walk', stop }),
      openLine: (route, stop = null) => push({ type: 'line', route, stop }),
      back: () => window.history.back(),
      // Depuis l'itinéraire : si la fiche de l'arrêt est juste dessous, on y revient
      // simplement ; sinon (« Y aller » lancé depuis l'accueil) on la met à la place.
      replaceWithStop: (stop) => {
        const below = stackRef.current.at(-2);
        if (below?.type === 'stop' && below.stop.code === stop.code) {
          window.history.back();
        } else {
          setStack((s) => [...s.slice(0, -1), { type: 'stop', stop }]);
        }
      },
    }),
    [push],
  );

  const nearestStops = useMemo(() => {
    if (!position || !stops) return [];
    return stops
      .map((s) => ({ ...s, distance: distanceMeters(position.lat, position.lon, s.lat, s.lon) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEAREST_COUNT);
  }, [position, stops]);

  // Lignes urbaines avec une perturbation en cours (badge de l'onglet Trafic, état des lignes).
  const disruptedLineIds = useMemo(() => {
    if (!disruptions || !routesById) return [];
    const now = new Date();
    const ids = [];
    for (const [id, alerts] of activeDisruptionsByLine(disruptions)) {
      if (!id.startsWith(`${APP_AGENCY}:`) || !routesById.has(id)) continue;
      // Les perturbations annoncées pour plus tard ne comptent pas comme « en cours ».
      if (alerts.some((a) => classifyDisruption(a, now).status === 'ongoing')) ids.push(id);
    }
    return ids;
  }, [disruptions, routesById]);

  const context = useMemo(
    () => ({
      stops,
      stopsError,
      routes,
      routesById,
      disruptions,
      disruptedLineIds,
      ...favoritesApi,
      ...favoriteLinesApi,
      position,
      geoStatus,
      geoError,
      requestLocation,
      nearestStops,
      nav,
    }),
    [
      stops, stopsError, routes, routesById, disruptions, disruptedLineIds,
      favoritesApi, favoriteLinesApi, position, geoStatus, geoError,
      requestLocation, nearestStops, nav,
    ],
  );

  const top = stack.at(-1);

  return (
    <AppContext.Provider value={context}>
      <div className="app">
        {tab === 'home' && <HomeTab />}
        {tab === 'map' && <MapTab />}
        {tab === 'lines' && <LinesTab />}
        {tab === 'traffic' && <TrafficTab />}

        <BottomNav tab={tab} onChange={setTab} alertCount={disruptedLineIds.length} />

        {top?.type === 'stop' && <StopScreen key={`stop-${top.stop.code}`} stop={top.stop} />}
        {top?.type === 'walk' && <WalkScreen key={`walk-${top.stop.code}`} stop={top.stop} />}
        {top?.type === 'line' && (
          <LineScreen key={`line-${top.route.id}`} route={top.route} stop={top.stop} />
        )}
      </div>
    </AppContext.Provider>
  );
}
