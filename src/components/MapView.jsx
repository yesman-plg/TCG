import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from '@phosphor-icons/react';
import { useGeolocation } from '../hooks/useGeolocation';

// Centre par défaut du réseau (repris de la config "zone" de l'app officielle).
const DEFAULT_CENTER = [45.189053, 5.724681];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM_FOR_MARKERS = 13; // trop dézoomé = trop d'arrêts, on masque plutôt que de tout afficher
const MAX_MARKERS = 300;

/**
 * Carte interactive du réseau (fond OpenStreetMap) : affiche les arrêts
 * visibles dans la zone actuelle sous forme de points cliquables. On ne
 * rend que les arrêts dans le cadre visible (recalculé au déplacement/zoom)
 * plutôt que les ~860 arrêts d'un coup, pour rester fluide.
 */
export default function MapView({ stops, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const stopsRef = useRef(stops);
  const onSelectRef = useRef(onSelect);
  stopsRef.current = stops;
  onSelectRef.current = onSelect;

  const { position, request } = useGeolocation();
  const userMarkerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

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
          radius: 6,
          weight: 2,
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
