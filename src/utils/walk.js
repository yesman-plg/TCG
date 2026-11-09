import { decodePolyline } from './polyline.js';

// Vitesse de marche moyenne (≈ 4,8 km/h) et détour moyen entre un trajet à
// vol d'oiseau et un vrai cheminement piéton.
const WALK_METERS_PER_MINUTE = 80;
const DETOUR_FACTOR = 1.25;

/** Durée de marche estimée (minutes, ≥ 1) à partir d'une distance à vol d'oiseau. */
export function estimateWalkMinutes(straightLineMeters) {
  if (!Number.isFinite(straightLineMeters)) return null;
  return Math.max(1, Math.round((straightLineMeters * DETOUR_FACTOR) / WALK_METERS_PER_MINUTE));
}

const DIRECTION_LABELS = {
  DEPART: 'Partir',
  CONTINUE: 'Continuer tout droit',
  LEFT: 'Tourner à gauche',
  RIGHT: 'Tourner à droite',
  SLIGHTLY_LEFT: 'Légèrement à gauche',
  SLIGHTLY_RIGHT: 'Légèrement à droite',
  HARD_LEFT: 'Tourner franchement à gauche',
  HARD_RIGHT: 'Tourner franchement à droite',
  UTURN_LEFT: 'Faire demi-tour',
  UTURN_RIGHT: 'Faire demi-tour',
  CIRCLE_CLOCKWISE: 'Prendre le rond-point',
  CIRCLE_COUNTERCLOCKWISE: 'Prendre le rond-point',
  ELEVATOR: "Prendre l'ascenseur",
};

// Icône à afficher pour chaque consigne ("straight" | "left" | "right" | "uturn" | "start").
const DIRECTION_ICONS = {
  DEPART: 'start',
  CONTINUE: 'straight',
  LEFT: 'left',
  HARD_LEFT: 'left',
  SLIGHTLY_LEFT: 'left',
  RIGHT: 'right',
  HARD_RIGHT: 'right',
  SLIGHTLY_RIGHT: 'right',
  UTURN_LEFT: 'uturn',
  UTURN_RIGHT: 'uturn',
};

/** Transforme une étape OTP en consigne lisible ("Tourner à droite, rue X"). */
export function describeStep(step) {
  const base = DIRECTION_LABELS[step?.relativeDirection] || 'Continuer';
  const street = step?.streetName && !/^(path|sidewalk|footway|crossing|steps|service road)$/i.test(step.streetName)
    && !/^(chemin|trottoir|passage)/i.test(step.streetName)
    ? step.streetName
    : '';
  return {
    text: street ? `${base}, ${street}` : base,
    icon: DIRECTION_ICONS[step?.relativeDirection] || 'straight',
    distance: Number.isFinite(step?.distance) ? Math.round(step.distance) : null,
  };
}

/**
 * Normalise la réponse /plan (OpenTripPlanner, mode=WALK) en un itinéraire à
 * pied utilisable par l'UI. Retourne null si aucun itinéraire n'est fourni.
 */
export function parseWalkPlan(payload) {
  const itinerary = payload?.plan?.itineraries?.[0];
  if (!itinerary) return null;
  const legs = (itinerary.legs || []).filter((leg) => leg.mode === 'WALK');
  if (legs.length === 0) return null;

  const path = [];
  const steps = [];
  let distance = 0;
  for (const leg of legs) {
    if (leg.legGeometry?.points) path.push(...decodePolyline(leg.legGeometry.points));
    for (const step of leg.steps || []) steps.push(describeStep(step));
    distance += Number.isFinite(leg.distance) ? leg.distance : 0;
  }

  const durationSeconds = Number.isFinite(itinerary.duration)
    ? itinerary.duration
    : legs.reduce((total, leg) => total + (leg.duration || 0), 0);

  return {
    minutes: Math.max(1, Math.round(durationSeconds / 60)),
    distance: Math.round(distance),
    path,
    steps,
  };
}

/**
 * Compare la durée de marche aux prochains passages (en minutes) pour dire
 * si l'on a le temps d'atteindre l'arrêt.
 *  - ok     : un passage laisse au moins 1 min de marge
 *  - tight  : on arrive pile (marge < 1 min)
 *  - missed : le prochain sera raté, on cite le suivant atteignable
 *  - none   : aucun passage connu
 */
export function catchAdvice(walkMinutes, departureMinutes) {
  const list = [...(departureMinutes || [])].filter(Number.isFinite).sort((a, b) => a - b);
  if (list.length === 0 || !Number.isFinite(walkMinutes)) return { status: 'none' };

  const first = list[0];
  const catchable = list.find((m) => m >= walkMinutes);
  if (catchable === undefined) return { status: 'missed', first, catchable: null };
  if (catchable === first) {
    return catchable - walkMinutes >= 1
      ? { status: 'ok', first, margin: catchable - walkMinutes }
      : { status: 'tight', first, margin: catchable - walkMinutes };
  }
  return { status: 'missed', first, catchable };
}
