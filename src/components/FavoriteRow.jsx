import { useState } from 'react';
import { CaretDown, Star } from '@phosphor-icons/react';
import DepartureBoard from './DepartureBoard';

/**
 * Une ligne compacte "nom de l'arrêt + ligne" dans l'onglet Favoris.
 * Cliquer dessus déroule les prochains passages pour cette ligne précise.
 */
export default function FavoriteRow({ favorite, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="favorite-row">
      <div className="favorite-row-header">
        <button
          type="button"
          className="favorite-row-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {favorite.routeShortName && (
            <span
              className="line-badge"
              style={
                favorite.routeColor
                  ? { background: `#${favorite.routeColor}`, color: `#${favorite.routeTextColor}` }
                  : undefined
              }
            >
              {favorite.routeShortName}
            </span>
          )}
          <span className="favorite-row-name">{favorite.name}</span>
          <span className="favorite-row-city">{favorite.city}</span>
          <CaretDown size={16} className={expanded ? 'caret rotated' : 'caret'} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fav-btn active"
          onClick={() => onRemove(favorite)}
          aria-label="Retirer des favoris"
          title="Retirer des favoris"
        >
          <Star size={18} weight="fill" aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div className="favorite-row-body">
          <DepartureBoard stop={favorite} routeFilter={favorite.routeId} hideHeader />
        </div>
      )}
    </div>
  );
}
