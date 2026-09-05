import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from '@phosphor-icons/react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRoutes } from '../hooks/useRoutes';
import { useLinesGeometry } from '../hooks/useLinesGeometry';
import { decodePolyline } from '../utils/polyline';

// Centre par défaut du réseau (repris de la config "zone" de l'app officielle).
const DEFAULT_CENTER = [45.189053, 5.724681];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM_FOR_MARKERS = 15; // trop dézoomé = trop d'arrêts qui polluent la vue d'ensemble des lignes
const MAX_MARKERS = 300;

/**
 * Carte interactive du réseau (fond épuré, façon "Positron", plutôt que le
 * rendu OSM standard très chargé en couleurs/labels) : affiche les arrêts
 * visibles dans la zone actuelle sous forme de points cliquables. On ne
 * rend que les arrêts dans le cadre visible (recalculé au déplacement/zoom)
 * plutôt que les ~860 arrêts d'un coup, pour rester fluide.
 */
export default function MapView({ stops, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const linesLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const stopsRef = useRef(stops);
  const onSelectRef = useRef(onSelect);
  stopsRef.current = stops;
  onSelectRef.current = onSelect;

  const { position, request } = useGeolocation();
  const userMarkerRef = useRef(null);
  const { routesById } = useRoutes();
  const { lines } = useLinesGeometry();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          '&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, FAO, NOAA, USGS',
        maxZoom: 19,
        maxNativeZoom: 16, // le fournisseur ne détaille pas au-delà : Leaflet agrandit les tuiles z16
      }
    ).addTo(map);

    // Ordre d'ajout = ordre d'empilement : les tracés d'abord, les arrêts
    // par-dessus (comme sur la carte de l'app M).
    const linesLayer = L.layerGroup().addTo(map);
    linesLayerRef.current = linesLayer;
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    function updateMarkers() {
      const currentStops = stopsRef.current;
      markersLayer.clearLayers();
      if (!currentStops || map.getZoom() < MIN_ZOOM_FOR_MARKERS) return;

      const bounds = map.getBounds();
      let count = 0;
      for (const s of currentStops) {
        if (count >= MAX_MARKERS) break;
        if (!bounds.contains([s.lat, s.lon])) continue;
        const marker = L.circleMarker([s.lat, s.lon], {
          radius: 4,
          weight: 1.5,
          color: '#ffffff',
          fillColor: '#2563eb',
          fillOpacity: 1,
        });
        marker.bindTooltip(s.name, { direction: 'top', offset: [0, -6] });
        marker.on('click', () => onSelectRef.current(s));
        marker.addTo(markersLayer);
        count++;
      }
    }

    map.on('moveend zoomend', updateMarkers);
    updateMarkers();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Dessine le tracé de chaque ligne avec sa couleur officielle, dès que le
  // tracé et les infos de ligne (couleur) sont chargés.
  useEffect(() => {
    if (!mapRef.current || !linesLayerRef.current || !lines || !routesById) return;
    const layer = linesLayerRef.current;
    layer.clearLayers();
    for (const line of lines) {
      const routeId = line.code.replace('_', ':');
      const route = routesById.get(routeId);
      const points = decodePolyline(line.shape);
      if (points.length < 2) continue;
      L.polyline(points, {
        color: route ? `#${route.color}` : '#94a3b8',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
    }
  }, [lines, routesById]);

  // Les arrêts se chargent après le montage de la carte (fetch async) :
  // on redéclenche un calcul des marqueurs une fois disponibles.
  useEffect(() => {
    if (mapRef.current) mapRef.current.fire('moveend');
  }, [stops]);

  // Marqueur "ma position" + recentrage quand la géoloc est obtenue.
  useEffect(() => {
    if (!position || !mapRef.current) return;
    const map = mapRef.current;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = L.circleMarker([position.lat, position.lon], {
      radius: 7,
      weight: 3,
      color: '#ffffff',
      fillColor: '#dc2626',
      fillOpacity: 1,
    }).addTo(map);
    map.setView([position.lat, position.lon], 15);
  }, [position]);

  return (
    <div className="map-view-wrap">
      <div ref={containerRef} className="map-view" />
      <button
        type="button"
        className="map-locate-btn"
        onClick={request}
        title="Centrer sur ma position"
        aria-label="Centrer sur ma position"
      >
        <MapPin size={20} weight="fill" aria-hidden="true" />
      </button>
    </div>
  );
}
