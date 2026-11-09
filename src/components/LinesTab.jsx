import { useMemo, useState } from 'react';
import { MagnifyingGlass, Star } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { buildTimetableCatalog } from '../utils/timetable';
import LineBadge from './LineBadge';

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'tram', label: 'Tram', sections: ['tram', 'relay'] },
  { id: 'chrono', label: 'Chrono', sections: ['chrono', 'chrono-peri'] },
  { id: 'proximo', label: 'Proximo', sections: ['proximo'] },
  { id: 'flexo', label: 'Flexo', sections: ['flexo'] },
  { id: 'cars', label: 'Cars', sections: ['express', 'regular', 'transaltitude-lines'] },
];

function matches(route, q) {
  if (!q) return true;
  return (
    (route.shortName || '').toLowerCase().includes(q) ||
    (route.longName || '').toLowerCase().includes(q)
  );
}

function LineRow({ route, alerted, starred, onOpen, onToggleStar }) {
  return (
    <li className="line-row">
      <button type="button" className="line-row-main" onClick={() => onOpen(route)}>
        <LineBadge shortName={route.shortName} color={route.color} textColor={route.textColor} size="lg" />
        <span className="line-row-text">
          <span className="line-row-name">{route.longName || `Ligne ${route.shortName}`}</span>
          {alerted ? (
            <span className="line-row-sub warn">Perturbation en cours</span>
          ) : (
            <span className="line-row-sub">Fiche horaire</span>
          )}
        </span>
        <span
          className={alerted ? 'status-dot warn' : 'status-dot'}
          role="img"
          aria-label={alerted ? 'Perturbée' : 'Aucune perturbation signalée'}
        />
      </button>
      <button
        type="button"
        className={starred ? 'star-btn active' : 'star-btn'}
        onClick={() => onToggleStar(route.id)}
        aria-pressed={starred}
        aria-label={starred ? `Retirer la ligne ${route.shortName} des favoris` : `Suivre la ligne ${route.shortName}`}
      >
        <Star size={22} weight={starred ? 'fill' : 'regular'} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Onglet Lignes : catalogue filtrable, avec état de perturbation et lignes suivies. */
export default function LinesTab() {
  const { routes, disruptedLineIds, favoriteLineIds, isFavoriteLine, toggleFavoriteLine, nav } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const catalog = useMemo(() => buildTimetableCatalog(routes), [routes]);
  const sections = useMemo(
    () => catalog.flatMap((card) => card.sections.map((s) => ({ ...s, cardTitle: card.title }))),
    [catalog],
  );
  const alertedSet = useMemo(() => new Set(disruptedLineIds), [disruptedLineIds]);
  const q = query.trim().toLowerCase();

  const active = FILTERS.find((f) => f.id === filter);
  const visibleSections = sections
    .filter((s) => filter === 'all' || active?.sections?.includes(s.id))
    .map((s) => ({ ...s, routes: s.routes.filter((r) => matches(r, q)) }))
    .filter((s) => s.routes.length > 0);

  const routeById = new Map(sections.flatMap((s) => s.routes).map((r) => [r.id, r]));
  const starred = favoriteLineIds.map((id) => routeById.get(id)).filter(Boolean).filter((r) => matches(r, q));

  const rowProps = {
    onOpen: (route) => nav.openLine(route),
    onToggleStar: toggleFavoriteLine,
  };

  return (
    <main className="tab-screen">
      <h1 className="page-title">Lignes</h1>

      <label className="search-field slim">
        <MagnifyingGlass size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder="Numéro, nom ou terminus"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filtrer les lignes"
        />
      </label>

      <div className="chip-row" role="group" aria-label="Type de ligne">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? 'chip active' : 'chip'}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!routes && <p className="muted">Chargement des lignes…</p>}

      {starred.length > 0 && filter === 'all' && (
        <section aria-label="Mes lignes">
          <h2 className="eyebrow">MES LIGNES</h2>
          <ul className="card-list">
            {starred.map((r) => (
              <LineRow key={r.id} route={r} alerted={alertedSet.has(r.id)} starred {...rowProps} />
            ))}
          </ul>
        </section>
      )}

      {visibleSections.map((s) => (
        <section key={s.id} aria-label={s.title}>
          <h2 className="eyebrow">{s.title.toUpperCase()}</h2>
          <ul className="card-list">
            {s.routes.map((r) => (
              <LineRow
                key={r.id}
                route={r}
                alerted={alertedSet.has(r.id)}
                starred={isFavoriteLine(r.id)}
                {...rowProps}
              />
            ))}
          </ul>
        </section>
      ))}

      {routes && visibleSections.length === 0 && <p className="muted">Aucune ligne ne correspond.</p>}
    </main>
  );
}
