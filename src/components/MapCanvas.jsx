import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLinesGeometry } from '../hooks/useLinesGeometry';
import { decodePolyline } from '../utils/polyline';

// Centre par défaut du réseau (repris de la config "zone" de l'app officielle).
const DEFAULT_CENTER = [45.189053, 5.724681];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM_FOR_MARKERS = 15; // trop dézoomé = trop d'arrêts qui polluent la vue d'ensemble
const MAX_MARKERS = 300;

// Épaisseur des tracés proportionnelle au zoom : une largeur fixe devient un
// amas illisible une fois dézoomé.
function weightForZoom(zoom, boost) {
  const base = zoom <= 12 ? 1.5 : zoom >= 17 ? 5 : 1.5 + (zoom - 12) * 0.7;
  return boost ? Math.max(base, 5) : base;
}

function applyLineWeights(polylines, zoom, boost) {
  const weight = weightForZoom(zoom, boost);
  for (const { halo, main } of polylines) {
    halo.setStyle({ weight: weight + 2 });
    main.setStyle({ weight });
  }
}

/**
 * Carte Leaflet partagée par l'onglet Carte et les écrans arrêt / itinéraire /
 * ligne. Tout est piloté par des props :
 *  - stops + onSelectStop : points d'arrêt cliquables (zoom ≥ 15)
 *  - linesMode : 'all' (tous les tracés), 'none', ou highlightRouteId (une seule ligne)
 *  - position : position de l'utilisateur
 *  - focusStop : arrêt mis en évidence (centrage inclus)
 *  - path : tracé pointillé (itinéraire à pied), cadré avec fitKey
 */
export default function MapCanvas({
  stops,
  onSelectStop,
  routesById,
  linesMode = 'all',
  highlightRouteId = null,
  position = null,
  focusStop = null,
  path = null,
  fitKey = 0,
  zoomControl = false,
  className = '',
  children,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const linesLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const polylinesRef = useRef([]);
  const stopsRef = useRef(stops);
  const onSelectRef = useRef(onSelectStop);
  const boostRef = useRef(Boolean(highlightRouteId));
  const zoomControlRef = useRef(zoomControl);
  stopsRef.current = stops;
  onSelectRef.current = onSelectStop;
  boostRef.current = Boolean(highlightRouteId);

  const { lines } = useLinesGeometry();

  // Création unique de la carte.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      zoomControl: false,
    });
    if (zoomControlRef.current) L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.control.attribution({ prefix: false }).addTo(map);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
        maxZoom: 19,
        maxNativeZoom: 19,
      },
    ).addTo(map);

    // Ordre d'ajout = ordre d'empilement : tracés, arrêts, puis surcouche.
    linesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    overlayLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    function updateMarkers() {
      const layer = markersLayerRef.current;
      const currentStops = stopsRef.current;
      layer.clearLayers();
      if (!currentStops || !onSelectRef.current || map.getZoom() < MIN_ZOOM_FOR_MARKERS) return;
      const bounds = map.getBounds();
      let count = 0;
      for (const s of currentStops) {
        if (count >= MAX_MARKERS) break;
        if (!bounds.contains([s.lat, s.lon])) continue;
        const marker = L.circleMarker([s.lat, s.lon], {
          radius: 5,
          weight: 2,
          color: '#5B606B',
          fillColor: '#ffffff',
          fillOpacity: 1,
        });
        marker.bindTooltip(s.name, { direction: 'top', offset: [0, -6] });
        marker.on('click', () => onSelectRef.current?.(s));
        marker.addTo(layer);
        count++;
      }
    }

    map.on('moveend zoomend', updateMarkers);
    map.on('zoomend', () => applyLineWeights(polylinesRef.current, map.getZoom(), boostRef.current));
    updateMarkers();

    // La carte vit dans un conteneur flex : on recalcule sa taille quand il change.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Tracés des lignes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = linesLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    polylinesRef.current = [];
    if (linesMode === 'none' || !lines || !routesById) return;

    const drawn = [];
    const bounds = [];
    for (const line of lines) {
      const routeId = line.code.replace('_', ':');
      if (highlightRouteId && routeId !== highlightRouteId) continue;
      const route = routesById.get(routeId);
      if (!route) continue; // ligne inconnue de /index/routes (obsolète ou hors périmètre)
      const points = decodePolyline(line.shape);
      if (points.length < 2) continue;
      // Liseré sombre sous le tracé : certaines couleurs officielles sont très
      // pâles et se fondent dans le fond de carte clair sans ce contour.
      const halo = L.polyline(points, {
        color: '#1e293b',
        opacity: 0.15,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
      const main = L.polyline(points, {
        color: `#${route.color}`,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
      drawn.push({ halo, main });
      if (highlightRouteId) bounds.push(...points);
    }
    polylinesRef.current = drawn;
    applyLineWeights(drawn, map.getZoom(), Boolean(highlightRouteId));
    if (highlightRouteId && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], animate: false });
    }
  }, [lines, routesById, linesMode, highlightRouteId]);

  // Redessine les arrêts quand la liste se charge.
  useEffect(() => {
    mapRef.current?.fire('moveend');
  }, [stops]);

  // Arrêt mis en évidence, position de l'utilisateur et itinéraire.
  useEffect(() => {
    const map = mapRef.current;
    const layer = overlayLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (path && path.length > 1) {
      L.polyline(path, {
        color: '#2457F5',
        weight: 6,
        opacity: 0.95,
        dashArray: '1 11',
        lineCap: 'round',
      }).addTo(layer);
    }
    if (focusStop) {
      L.circleMarker([focusStop.lat, focusStop.lon], {
        radius: 20,
        weight: 0,
        fillColor: '#2457F5',
        fillOpacity: 0.18,
        interactive: false,
      }).addTo(layer);
      L.circleMarker([focusStop.lat, focusStop.lon], {
        radius: 9,
        weight: 4,
        color: '#ffffff',
        fillColor: '#2457F5',
        fillOpacity: 1,
        interactive: false,
      }).addTo(layer);
    }
    if (position) {
      L.circleMarker([position.lat, position.lon], {
        radius: 16,
        weight: 0,
        fillColor: '#16a34a',
        fillOpacity: 0.18,
        interactive: false,
      }).addTo(layer);
      L.circleMarker([position.lat, position.lon], {
        radius: 7,
        weight: 3,
        color: '#ffffff',
        fillColor: '#16a34a',
        fillOpacity: 1,
        interactive: false,
      }).addTo(layer);
    }
  }, [focusStop, position, path]);

  // Cadrage : itinéraire (si fourni), sinon arrêt, sinon position.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || highlightRouteId) return; // une ligne mise en avant impose son propre cadrage
    if (path && path.length > 1) {
      map.fitBounds(path, { padding: [50, 50], maxZoom: 18, animate: false });
    } else if (focusStop) {
      map.setView([focusStop.lat, focusStop.lon], 16, { animate: false });
    } else if (position) {
      map.setView([position.lat, position.lon], 15);
    }
    // Déclenché par fitKey (et par la disponibilité des données de cadrage) seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, focusStop?.lat, focusStop?.lon, path]);

  return (
    <div className={`map-wrap ${className}`}>
      <div ref={containerRef} className="map-canvas" />
      {children}
    </div>
  );
}
