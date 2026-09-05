import { useState } from 'react';
import { Tram, Warning } from '@phosphor-icons/react';
import { useStops } from './hooks/useStops';
import { useFavorites } from './hooks/useFavorites';
import StopSearch from './components/StopSearch';
import NearbyStops from './components/NearbyStops';
import DepartureBoard from './components/DepartureBoard';
import './App.css';

export default function App() {
  const { stops, error: stopsError } = useStops();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [selectedStop, setSelectedStop] = useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header-icon" aria-hidden="true">
          <Tram size={24} weight="fill" />
        </span>
        <div>
          <h1>TCG</h1>
          <p className="muted">Horaires TAG temps réel — réseau M (Grenoble-Alpes Métropole)</p>
        </div>
      </header>

      <main>
        {stopsError && (
          <p className="error">
            <Warning size={18} aria-hidden="true" />
            Impossible de charger la liste des arrêts. Vérifie ta connexion et recharge la page.
          </p>
        )}

        <section className="search-section">
          <StopSearch stops={stops} onSelect={setSelectedStop} />
        </section>

        {!selectedStop && (
          <section className="nearby-section">
            <NearbyStops stops={stops} onSelect={setSelectedStop} />
          </section>
        )}

        {selectedStop && (
          <section className="selected-section">
            <DepartureBoard
              stop={selectedStop}
              isFavorite={isFavorite(selectedStop.code)}
              onToggleFavorite={() => toggleFavorite(selectedStop)}
              onClose={() => setSelectedStop(null)}
            />
          </section>
        )}

        <section className="favorites-section">
          <h2>Mes arrêts favoris</h2>
          {favorites.length === 0 && (
            <p className="muted">
              Aucun favori pour l'instant. Cherche un arrêt ci-dessus et clique sur ★ pour l'ajouter.
            </p>
          )}
          <div className="favorites-grid">
            {favorites.map((stop) => (
              <DepartureBoard
                key={stop.code}
                stop={stop}
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(stop)}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p className="muted">
          Données : Mobilités M / SMMAG (mobilites-m.fr) — licence ODbL. Projet personnel non
          affilié à l'exploitant du réseau.
        </p>
      </footer>
    </div>
  );
}
