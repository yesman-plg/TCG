/** Parse une date au format "DD/MM/YYYY HH:mm" renvoyé par l'API dyn/evt. */
function parseFrenchDateTime(str) {
  const [datePart, timePart] = str.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/** Une perturbation est active si la date du jour est comprise dans [dateDebut, dateFin]. */
export function isActive(disruption, now = new Date()) {
  const start = parseFrenchDateTime(disruption.dateDebut);
  const end = parseFrenchDateTime(disruption.dateFin);
  return now >= start && now <= end;
}

/**
 * Convertit un id de ligne interne ("SEM:C5") vers le format utilisé par le
 * champ `listeLigne` des perturbations ("SEM_C5").
 */
export function toDisruptionLineCode(routeId) {
  return routeId.replace(':', '_');
}

/**
 * Filtre les perturbations actives et concernant une des lignes données
 * (tableau d'ids de ligne au format "SEM:C5").
 */
export function disruptionsForRoutes(disruptions, routeIds) {
  if (!disruptions || !routeIds?.length) return [];
  const codes = new Set(routeIds.map(toDisruptionLineCode));
  const now = new Date();
  return Object.values(disruptions).filter(
    (d) => d.listeLigne && codes.has(d.listeLigne) && d.visibleTC && isActive(d, now)
  );
}
