import { Bus, CableCar, CarProfile, Mountains, Tram, Van } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useRoutes } from '../hooks/useRoutes';
import { buildTimetableCatalog } from '../utils/timetable';

const ICONS = {
  urban: Tram,
  region: Bus,
  mountain: Mountains,
  car: CarProfile,
  cable: CableCar,
  other: Van,
};

const SECTION_VEHICLES = {
  tram: '/vehicles/tram.webp',
  chrono: '/vehicles/chrono.webp',
  'chrono-peri': '/vehicles/chrono.webp',
  proximo: '/vehicles/proximo.webp',
  flexo: '/vehicles/flexo.webp',
  nature: '/vehicles/flexo.webp',
};

function routeStyle(route) {
  return route.color ? { background: `#${route.color}`, color: `#${route.textColor || 'FFFFFF'}` } : undefined;
}

function RouteButton({ route, shape, onSelect }) {
  return (
    <button
      type="button"
      className={`timetable-route${shape === 'round' || shape === 'relay' ? ' timetable-route-round' : ''}${shape === 'relay' ? ' timetable-route-relay' : ''}`}
      style={routeStyle(route)}
      onClick={() => onSelect(route)}
      aria-label={`Voir la fiche horaire de la ligne ${route.shortName}, ${route.longName}`}
      title={route.longName}
    >
      {shape === 'relay' ? (
        <><span>{route.shortName}</span><span className="timetable-route-relay-label">Bus</span></>
      ) : route.shortName}
    </button>
  );
}

function CatalogCard({ card, onSelect }) {
  const Icon = ICONS[card.icon] || Bus;
  const cardVehicle = card.id === 'cars-region' ? '/vehicles/cars_region.webp' : null;
  return (
    <article className="timetable-catalog-card">
      <header className="timetable-catalog-card-header">
        <div>
          <h2>{card.title}</h2>
          <p>{card.description}</p>
        </div>
        {cardVehicle ? (
          <img className="timetable-card-vehicle" src={cardVehicle} alt="" />
        ) : card.id !== 'mreso' ? (
          <Icon size={34} weight="duotone" aria-hidden="true" />
        ) : null}
      </header>

      {card.sections.map((section) => (
        <section className="timetable-catalog-section" key={section.id} aria-labelledby={section.id}>
          <div className="timetable-catalog-section-header">
            <h3 id={section.id}>{section.title}</h3>
            {SECTION_VEHICLES[section.id] && (
              <img className="timetable-section-vehicle" src={SECTION_VEHICLES[section.id]} alt="" />
            )}
          </div>
          <div className={`timetable-route-grid${card.id === 'cars-region' || card.id === 'transaltitude' ? ' timetable-route-grid-wide' : ''}`}>
            {section.routes.map((route) => (
              <RouteButton key={route.id} route={route} shape={section.shape} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}

export default function TimetablesTab({ onSelect }) {
  const { routes, error } = useRoutes();
  const catalog = useMemo(() => buildTimetableCatalog(routes), [routes]);

  if (error) {
    return <p className="error">Impossible de charger le catalogue des lignes. Vérifie ta connexion et recharge la page.</p>;
  }

  if (!routes) {
    return <p className="muted">Chargement des lignes et de leurs fiches horaires…</p>;
  }

  return (
    <div className="timetable-catalog">
      <div className="timetable-catalog-intro">
        <h2>Fiches horaires</h2>
        <p className="muted">Choisis une ligne pour consulter ses horaires théoriques par arrêt.</p>
      </div>
      {catalog.map((card) => <CatalogCard card={card} key={card.id} onSelect={onSelect} />)}
    </div>
  );
}
