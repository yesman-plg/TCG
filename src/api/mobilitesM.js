// Client pour l'API publique de Mobilités M (SMMAG / Grenoble-Alpes Métropole)
// Backend réel : instance OpenTripPlanner exposée sur data.mobilites-m.fr
// Pas de clé API requise ; l'API attend juste un header Origin, envoyé automatiquement
// par le navigateur pour toute requête fetch/XHR depuis notre site.
//
// Fair-use : l'API renvoie "contact us for massive usage" en cas d'abus détecté.
// Usage personnel/perso normal (quelques requêtes par minute) : aucun souci.

const BASE = 'https://data.mobilites-m.fr/api';

// Bbox englobant large l'aire grenobloise (Métro + Voironnais + Grésivaudan).
// Utilisée une seule fois pour récupérer tous les arrêts du réseau.
const NETWORK_BBOX = { xmin: 5.4, ymin: 44.95, xmax: 6.05, ymax: 45.43 };

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status}) : ${url}`);
  }
  return res.json();
}

/**
 * Récupère tous les arrêts (clusters) du réseau.
 * Retourne un tableau de { id, code, name, city, lat, lon }.
 * `code` est l'identifiant à utiliser pour interroger les horaires (stoptimes).
 */
export async function getAllStops() {
  const params = new URLSearchParams({
    xmin: NETWORK_BBOX.xmin,
    ymin: NETWORK_BBOX.ymin,
    xmax: NETWORK_BBOX.xmax,
    ymax: NETWORK_BBOX.ymax,
    types: 'clusters',
    epci: 'All',
  });
  const data = await getJson(`${BASE}/points/json?${params}`);
  return data.features.map((f) => ({
    id: f.properties.id,
    code: f.properties.code,
    name: f.properties.name,
    city: f.properties.city,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }));
}

/**
 * Récupère la liste des lignes du réseau (id, nom court/long, couleur, mode).
 */
export async function getAllRoutes() {
  return getJson(`${BASE}/routers/default/index/routes`);
}

/**
 * Récupère le tracé géométrique des lignes principales du réseau (trams,
 * Chrono, Chrono périurbain), pour affichage sur la carte. Retourne un
 * tableau de { code, shape } — `code` au format "SEM_A" (convertir en id de
 * ligne avec code.replace('_', ':')), `shape` la polyligne encodée à décoder
 * avec utils/polyline.js.
 */
export async function getLinesGeometry() {
  const params = new URLSearchParams({
    types: 'ligne',
    sousReseaux: 'TRAM,CHRONO,CHRONO_PERI,C38_STRUCT',
  });
  const data = await getJson(`${BASE}/lines/poly?${params}`);
  return data.features.map((f) => ({
    code: f.properties.CODE,
    shape: f.properties.shape[0],
  }));
}

/**
 * Récupère les prochains passages (temps réel) pour un arrêt donné, toutes lignes confondues.
 * `stopCode` = le champ `code` renvoyé par getAllStops() (ex: "SEM:GENLP").
 *
 * Retourne un tableau "patterns", chacun avec sa ligne (pattern.desc, pattern.shortDesc)
 * et ses passages (times[]), avec scheduledArrival/realtimeArrival en secondes depuis minuit,
 * arrivalDelay en secondes, realtime (bool), occupancy (texte).
 */
export async function getStopTimes(stopCode) {
  return getJson(`${BASE}/routers/default/index/clusters/${encodeURIComponent(stopCode)}/stoptimes`);
}

/**
 * Récupère les perturbations/événements en cours sur le réseau.
 */
export async function getDisruptions() {
  return getJson(`${BASE}/dyn/evt/json`);
}

/**
 * Convertit un couple (serviceDay en epoch secondes, offset en secondes depuis minuit)
 * en objet Date exploitable en JS.
 */
export function toDate(serviceDay, secondsSinceMidnight) {
  return new Date((serviceDay + secondsSinceMidnight) * 1000);
}
