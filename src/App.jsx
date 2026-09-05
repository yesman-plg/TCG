import { useState } from 'react';
import { Tram, Warning, Star, MagnifyingGlass } from '@phosphor-icons/react';
import { useStops } from './hooks/useStops';
import { useFavorites } from './hooks/useFavorites';
import StopSearch from './components/StopSearch';
import NearbyStops from './components/NearbyStops';
import DepartureBoard from './components/DepartureBoard';
import FavoriteRow from './components/FavoriteRow';
import './App.css';

export default function App() {
  const { stops, error: stopsError } = useStops();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const [selectedStop, setSelectedStop] = useState(null);
  const [tab, setTab] = useState('search');

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

      <nav className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'search'}
          className={tab === 'search' ? 'tab active' : 'tab'}
          onClick={() => setTab('search')}
        >
          <MagnifyingGlass size={16} aria-hidden="true" />
          Rechercher
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'favorites'}
          className={tab === 'favorites' ? 'tab active' : 'tab'}
          onClick={() => setTab('favorites')}
        >
          <Star size={16} aria-hidden="true" />
          Mes favoris
        </button>
      </nav>

      <main>
        {stopsError && (
          <p className="error">
            <Warning size={18} aria-hidden="true" />
            Impossible de charger la liste des arrêts. Vérifie ta connexion et recharge la page.
          </p>
        )}

        {tab === 'search' && (
          <>
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
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onClose={() => setSelectedStop(null)}
                />
              </section>
            )}
          </>
        )}

        {tab === 'favorites' && (
          <section className="favorites-section">
            {favorites.length === 0 ? (
              <p className="muted">
                Aucun favori pour l'instant. Va dans "Rechercher", choisis un arrêt et clique sur
                ★ pour l'ajouter.
              </p>
            ) : (
              <div className="favorites-list">
                {favorites.map((f) => (
                  <FavoriteRow
                    key={`${f.code}::${f.routeId}`}
                    favorite={f}
                    onRemove={() => removeFavorite(f.code, f.routeId)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
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
