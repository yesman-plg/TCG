import { toDate } from '../api/mobilitesM';

/** Formate un passage en "HH:MM" (heure locale). */
export function formatTime(serviceDay, secondsSinceMidnight) {
  const d = toDate(serviceDay, secondsSinceMidnight);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Minutes restantes avant un passage, arrondies, jamais négatives. */
export function minutesUntil(serviceDay, secondsSinceMidnight) {
  const d = toDate(serviceDay, secondsSinceMidnight);
  const diffMs = d.getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60000));
}
