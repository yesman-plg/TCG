import { useMemo, useState } from 'react';

/**
 * Champ de recherche d'arrêt avec autocomplétion locale (les ~860 arrêts
 * sont déjà chargés en mémoire par useStops, donc la recherche est instantanée).
 */
export default function StopSearch({ stops, onSelect }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || !stops) return [];
    return stops
      .filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
      .slice(0, 15);
  }, [query, stops]);

  return (
    <div className="stop-search">
      <input
        type="text"
        placeholder="Rechercher un arrêt (ex : Victor Hugo)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Rechercher un arrêt"
      />
      {results.length > 0 && (
        <ul className="stop-search-results">
          {results.map((s) => (
            <li key={s.code}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s);
                  setQuery('');
                }}
              >
                <span className="stop-name">{s.name}</span>
                <span className="stop-city">{s.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
