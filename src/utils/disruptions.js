/** Parse une date au format "DD/MM/YYYY HH:mm" renvoyé par l'API dyn/evt. */
function parseFrenchDateTime(str) {
  const [datePart, timePart] = str.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Une perturbation est pertinente tant qu'elle n'est pas terminée (dateFin
 * dépassée) — comme l'app M, qui affiche aussi les perturbations à venir
 * (ex: travaux annoncés dans 2 jours), pas seulement celles en cours à la
 * seconde près. On ignore volontairement dateDebut.
 */
export function isActive(disruption, now = new Date()) {
  const end = parseFrenchDateTime(disruption.dateFin);
  return now <= end;
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

/**
 * Regroupe les perturbations actives par ligne (Map routeId -> perturbations),
 * pour afficher un signalement au niveau de chaque ligne plutôt qu'un bandeau
 * global mélangeant toutes les lignes de l'arrêt.
 */
export function disruptionsByRoute(disruptions, routeIds) {
  const map = new Map();
  if (!disruptions || !routeIds?.length) return map;
  const now = new Date();
  for (const routeId of routeIds) {
    const code = toDisruptionLineCode(routeId);
    const matches = Object.values(disruptions).filter(
      (d) => d.listeLigne === code && d.visibleTC && isActive(d, now)
    );
    if (matches.length > 0) map.set(routeId, matches);
  }
  return map;
}
