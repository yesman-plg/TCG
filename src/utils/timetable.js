import { naturalCompare } from './sort.js';

const EXCLUDED_TYPES = new Set(['SCOL', 'SNC']);

const CATALOG_CARDS = [
  {
    id: 'mreso',
    title: 'M réso',
    description: 'Tram et bus du réseau grenoblois',
    icon: 'urban',
    sections: [
      { id: 'tram', title: 'Lignes de tram', type: 'TRAM', shape: 'round' },
      { id: 'relay', title: 'Bus Relais Tram', type: 'NAVETTE', shape: 'relay' },
      { id: 'chrono', title: 'Lignes Chrono', type: 'CHRONO', shape: 'round' },
      { id: 'chrono-peri', title: 'Lignes Chrono périurbaines', type: 'CHRONO_PERI', shape: 'round' },
      { id: 'proximo', title: 'Lignes Proximo', type: 'PROXIMO' },
      { id: 'flexo', title: 'Lignes Flexo', type: 'FLEXO' },
      { id: 'nature', title: 'Lignes Destinations Nature', type: 'NATURE' },
    ],
  },
  {
    id: 'cars-region',
    title: 'Cars Région',
    description: 'Lignes interurbaines de l’Isère',
    icon: 'region',
    sections: [
      { id: 'express', title: 'Lignes Express', type: 'C38_STRUCT' },
      { id: 'regular', title: 'Lignes régulières', type: 'C38_AUTRE' },
    ],
  },
  {
    id: 'transaltitude',
    title: 'Transaltitude',
    description: 'Liaisons vers les stations de montagne',
    icon: 'mountain',
    sections: [{ id: 'transaltitude-lines', title: 'Lignes Transaltitude', type: 'TRA' }],
  },
  {
    id: 'covoit',
    title: "M covoit' Lignes+",
    description: 'Lignes de covoiturage du Grésivaudan, du Vercors et du Voironnais',
    icon: 'car',
    sections: [{ id: 'covoit-lines', title: 'Lignes+', type: 'MCO' }],
  },
  {
    id: 'other-services',
    title: 'Autres services',
    description: 'Téléphérique et funiculaire',
    icon: 'cable',
    sections: [{ id: 'other-services-lines', title: 'Lignes', types: ['BUL', 'FUN'] }],
  },
];

function isPublicTimetableRoute(route) {
  return Boolean(route?.id && route?.timeSheet && !EXCLUDED_TYPES.has(route.type));
}

function sortRoutes(routes) {
  return [...routes].sort((a, b) => {
    const nameCompare = naturalCompare(a.shortName || '', b.shortName || '');
    return nameCompare !== 0 ? nameCompare : naturalCompare(a.id || '', b.id || '');
  });
}

/**
 * Transforme le catalogue brut Mobilités M en cartes affichables. Les types
 * scolaires et TER restent volontairement hors du périmètre, comme dans M.
 */
export function buildTimetableCatalog(routes) {
  const uniqueRoutes = new Map();
  for (const route of routes || []) {
    if (isPublicTimetableRoute(route)) uniqueRoutes.set(route.id, route);
  }

  const remaining = new Map(uniqueRoutes);
  const cards = CATALOG_CARDS.map((card) => {
    const sections = card.sections
      .map((section) => {
        const types = section.types || [section.type];
        const sectionRoutes = sortRoutes(
          [...remaining.values()].filter((route) => types.includes(route.type)),
        );
        for (const route of sectionRoutes) remaining.delete(route.id);
        return { ...section, routes: sectionRoutes };
      })
      .filter((section) => section.routes.length > 0);
    return { ...card, sections };
  }).filter((card) => card.sections.length > 0);

  const uncategorizedRoutes = sortRoutes([...remaining.values()]);
  if (uncategorizedRoutes.length > 0) {
    cards.push({
      id: 'uncategorized',
      title: 'Autres lignes',
      description: 'Autres lignes publiques disposant d’une fiche horaire',
      icon: 'other',
      sections: [{ id: 'uncategorized-lines', title: 'Lignes', routes: uncategorizedRoutes }],
    });
  }

  return cards;
}

function normalizeDirection(directionId, value) {
  if (!Array.isArray(value?.arrets) || value.arrets.length === 0) return null;

  return {
    id: String(directionId),
    previousAt: Number.isFinite(value.prevTime) ? value.prevTime : null,
    nextAt: Number.isFinite(value.nextTime) ? value.nextTime : null,
    stops: value.arrets.map((stop) => ({
      id: stop.stopId || stop.parentStation?.code || `${stop.name}-${stop.city}`,
      name: stop.name || stop.stopName || 'Arrêt inconnu',
      city: stop.city || '',
      times: Array.isArray(stop.trips) ? stop.trips.filter(Number.isFinite) : [],
    })),
  };
}

/** Convertit la réponse /ficheHoraires/json en directions stables pour l’UI. */
export function normalizeTimeSheet(payload) {
  if (!payload || typeof payload !== 'object') return { directions: [] };

  const directions = Object.entries(payload)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([directionId, value]) => normalizeDirection(directionId, value))
    .filter(Boolean);

  return { directions };
}

export function formatSheetTime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const secondsInDay = 24 * 60 * 60;
  const normalized = ((Math.floor(seconds) % secondsInDay) + secondsInDay) % secondsInDay;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function secondsFromTimeInput(time) {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 3600 + minutes * 60;
}
