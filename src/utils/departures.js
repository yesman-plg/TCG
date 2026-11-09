import { naturalCompare, categoryRank } from './sort.js';

/** Extrait l'id de ligne ("SEM:C5") depuis l'id de pattern OTP ("SEM:C5:1:12345"). */
export function routeIdFromPatternId(patternId) {
  const parts = patternId.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Trie les patterns d'un arrêt : trams, puis Chrono, puis le reste ; par
 * numéro de ligne en ordre naturel ; à ligne égale, le sens au passage le
 * plus proche d'abord.
 */
export function sortPatterns(patterns, routesById) {
  if (!patterns) return null;
  return [...patterns].sort((a, b) => {
    const routeA = routesById?.get(routeIdFromPatternId(a.pattern.id));
    const routeB = routesById?.get(routeIdFromPatternId(b.pattern.id));
    const nameA = routeA?.shortName || a.pattern.shortDesc || '';
    const nameB = routeB?.shortName || b.pattern.shortDesc || '';
    const category = categoryRank(routeA?.mode, nameA) - categoryRank(routeB?.mode, nameB);
    if (category !== 0) return category;
    const byName = naturalCompare(nameA, nameB);
    if (byName !== 0) return byName;
    return (a.times[0]?.realtimeArrival ?? Infinity) - (b.times[0]?.realtimeArrival ?? Infinity);
  });
}

/** Lignes distinctes d'une liste de patterns (pour filtres et sélecteur de favori). */
export function distinctRoutesOf(patterns, routesById) {
  const seen = new Map();
  for (const p of patterns || []) {
    const routeId = routeIdFromPatternId(p.pattern.id);
    if (seen.has(routeId)) continue;
    const route = routesById?.get(routeId);
    seen.set(routeId, {
      routeId,
      shortName: route?.shortName || p.pattern.shortDesc || '?',
      color: route?.color,
      textColor: route?.textColor,
    });
  }
  return [...seen.values()];
}

/** Convertit un passage OTP en minutes restantes (temps réel). */
function minutesOf(time) {
  const at = (time.serviceDay + time.realtimeArrival) * 1000;
  return Math.max(0, Math.round((at - Date.now()) / 60000));
}

/**
 * Prochains passages d'un arrêt à plat, triés par minutes croissantes :
 * [{ minutes, routeId, destination, realtime, delaySeconds }]. `routeIds`
 * (tableau) restreint aux lignes voulues.
 */
export function upcomingDepartures(patterns, routeIds = null) {
  const out = [];
  for (const p of patterns || []) {
    const routeId = routeIdFromPatternId(p.pattern.id);
    if (routeIds && !routeIds.includes(routeId)) continue;
    for (const t of p.times) {
      out.push({
        minutes: minutesOf(t),
        routeId,
        destination: p.pattern.desc,
        realtime: Boolean(t.realtime),
        delaySeconds: t.arrivalDelay || 0,
      });
    }
  }
  return out.sort((a, b) => a.minutes - b.minutes);
}

export { minutesOf as minutesOfTime };
