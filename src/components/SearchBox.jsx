import { useMemo, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import LineBadge from './LineBadge';

const EXCLUDED_TYPES = new Set(['SCOL', 'SNC']);

/**
 * Recherche instantanée d'arrêts et de lignes (les ~860 arrêts sont déjà en
 * mémoire, donc aucune requête). Un arrêt ouvre sa fiche, une ligne sa fiche horaire.
 */
export default function SearchBox({ placeholder = 'Rechercher un arrêt ou une ligne', floating = false }) {
  const { stops, routes, nav } = useApp();
  const [query, setQuery] = useState('');

  const { stopResults, lineResults } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return { stopResults: [], lineResults: [] };
    const lineResults = (routes || [])
      .filter(
        (r) =>
          r.timeSheet &&
          !EXCLUDED_TYPES.has(r.type) &&
          (r.shortName || '').toLowerCase() === q,
      )
      .slice(0, 3);
    const stopResults =
      q.length < 2 || !stops
        ? []
        : stops
            .filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
            .slice(0, 8);
    return { stopResults, lineResults };
  }, [query, stops, routes]);

  const hasResults = stopResults.length > 0 || lineResults.length > 0;

  function reset() {
    setQuery('');
  }

  return (
    <div className={floating ? 'search-box floating' : 'search-box'}>
      <label className="search-field">
        <MagnifyingGlass size={20} aria-hidden="true" />
        <input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un arrêt ou une ligne"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="search-clear" onClick={reset} aria-label="Effacer la recherche">
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        )}
      </label>

      {hasResults && (
        <ul className="search-results">
          {lineResults.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  reset();
                  nav.openLine(r);
                }}
              >
                <LineBadge shortName={r.shortName} color={r.color} textColor={r.textColor} size="sm" />
                <span className="search-result-name">Ligne {r.shortName}</span>
                <span className="search-result-sub">{r.longName}</span>
              </button>
            </li>
          ))}
          {stopResults.map((s) => (
            <li key={s.code}>
              <button
                type="button"
                onClick={() => {
                  reset();
                  nav.openStop(s);
                }}
              >
                <span className="search-result-name">{s.name}</span>
                <span className="search-result-sub">{s.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!hasResults && query.trim().length >= 2 && stops && (
        <p className="search-empty">Aucun arrêt ne correspond à « {query.trim()} ».</p>
      )}
    </div>
  );
}
