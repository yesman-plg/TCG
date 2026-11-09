import { Crosshair } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import MapCanvas from './MapCanvas';
import SearchBox from './SearchBox';

/** Onglet Carte : le réseau en plein écran, recherche flottante et bouton de localisation. */
export default function MapTab() {
  const { stops, routesById, position, requestLocation, nav } = useApp();
  // Recentre sur l'utilisateur dès qu'une position est obtenue ou actualisée.
  const fitKey = position ? position.lat + position.lon : 0;

  return (
    <main className="map-tab">
      <MapCanvas
        stops={stops}
        routesById={routesById}
        onSelectStop={nav.openStop}
        position={position}
        fitKey={fitKey}
        zoomControl
      >
        <button
          type="button"
          className="map-locate-btn"
          onClick={requestLocation}
          aria-label="Centrer sur ma position"
          title="Centrer sur ma position"
        >
          <Crosshair size={22} weight="bold" aria-hidden="true" />
        </button>
      </MapCanvas>
      <div className="map-tab-search">
        <SearchBox floating placeholder="Arrêt, ligne…" />
      </div>
    </main>
  );
}
