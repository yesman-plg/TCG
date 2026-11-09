import { Clock, MapTrifold, Rows, WarningDiamond } from '@phosphor-icons/react';

const TABS = [
  { id: 'home', label: 'Maintenant', Icon: Clock },
  { id: 'map', label: 'Carte', Icon: MapTrifold },
  { id: 'lines', label: 'Lignes', Icon: Rows },
  { id: 'traffic', label: 'Trafic', Icon: WarningDiamond },
];

export default function BottomNav({ tab, onChange, alertCount }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            className={active ? 'nav-item active' : 'nav-item'}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icon size={24} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
            <span>{label}</span>
            {id === 'traffic' && alertCount > 0 && (
              <span className="nav-badge" aria-label={`${alertCount} lignes perturbées`}>
                {alertCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
