import { useState } from 'react';
import { CaretDown, Star } from '@phosphor-icons/react';
import DepartureBoard from './DepartureBoard';

function lineBadgeStyle(route) {
  return route.routeColor
    ? { background: `#${route.routeColor}`, color: `#${route.routeTextColor}` }
    : undefined;
}

/**
 * Une ligne compacte dans l'onglet Favoris : un arrêt = une seule ligne
 * dépliable, même s'il a plusieurs lignes favorites à cet arrêt (regroupées
 * par `code`, voir App.jsx). Se déplie pour montrer les horaires de chaque
 * ligne favorite de cet arrêt.
 */
export default function FavoriteRow({ group, onRemoveRoute }) {
  const [expanded, setExpanded] = useState(false);
  const singleRoute = group.routes.length === 1 ? group.routes[0] : null;

  return (
    <div className="favorite-row">
      <div className="favorite-row-header">
        <button
          type="button"
          className="favorite-row-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {singleRoute?.routeShortName && (
            <span className="line-badge" style={lineBadgeStyle(singleRoute)}>
              {singleRoute.routeShortName}
            </span>
          )}
          <span className="favorite-row-name">{group.name}</span>
          <span className="favorite-row-city">{group.city}</span>
          <CaretDown size={16} className={expanded ? 'caret rotated' : 'caret'} aria-hidden="true" />
        </button>
        {singleRoute && (
          <button
            type="button"
            className="fav-btn active"
            onClick={() => onRemoveRoute(singleRoute.routeId)}
            aria-label="Retirer des favoris"
            title="Retirer des favoris"
          >
            <Star size={18} weight="fill" aria-hidden="true" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="favorite-row-body">
          {!singleRoute && (
            <ul className="route-picker-list favorite-route-chips">
              {group.routes.map((r) => (
                <li key={r.routeId}>
                  <button
                    type="button"
                    className="route-picker-item active"
                    onClick={() => onRemoveRoute(r.routeId)}
                    title="Retirer cette ligne des favoris"
                  >
                    <span className="line-badge" style={lineBadgeStyle(r)}>
                      {r.routeShortName}
                    </span>
                    <Star size={14} weight="fill" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {group.routes.map((r) => (
            <DepartureBoard key={r.routeId} stop={group} routeFilter={r.routeId} hideHeader />
          ))}
        </div>
      )}
    </div>
  );
}
