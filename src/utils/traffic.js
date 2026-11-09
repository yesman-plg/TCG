/** Parse une date "DD/MM/YYYY HH:mm" renvoyée par l'API dyn/evt (null si invalide). */
export function parseEventDate(str) {
  if (typeof str !== 'string') return null;
  const [datePart, timePart] = str.split(' ');
  const [day, month, year] = (datePart || '').split('/').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  if (![day, month, year].every(Number.isFinite)) return null;
  const date = new Date(year, month - 1, day, hours || 0, minutes || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatClock(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(date, now) {
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, now)) return "aujourd'hui";
  if (sameDay(date, tomorrow)) return 'demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "encore 1 h 18" / "encore 12 min" / "encore 2 j". */
export function formatRemaining(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `encore ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `encore ${hours} h ${String(rest).padStart(2, '0')}` : `encore ${hours} h`;
  }
  return `encore ${Math.round(hours / 24)} j`;
}

/**
 * Qualifie une perturbation par rapport à `now` :
 *  - status "ongoing" (dateDebut passée) ou "upcoming"
 *  - progress (0..1) pour une perturbation en cours dont on connaît les bornes
 *  - remainingLabel et periodLabel prêts à afficher
 */
export function classifyDisruption(disruption, now = new Date()) {
  const start = parseEventDate(disruption.dateDebut);
  const end = parseEventDate(disruption.dateFin);
  const ongoing = !start || start <= now;

  let progress = null;
  if (ongoing && start && end && end > start) {
    progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  }

  let periodLabel = '';
  if (ongoing) {
    periodLabel = end ? `Jusqu'à ${formatClock(end)}, ${formatDay(end, now)}` : 'En cours';
    if (end && end.toDateString() === now.toDateString()) periodLabel = `Jusqu'à ${formatClock(end)}`;
  } else if (start && end) {
    periodLabel = `${formatDay(start, now)} · ${formatClock(start)} à ${formatClock(end)}`;
  } else if (start) {
    periodLabel = `À partir de ${formatDay(start, now)} ${formatClock(start)}`;
  }

  return {
    status: ongoing ? 'ongoing' : 'upcoming',
    progress,
    remainingLabel: ongoing && end ? formatRemaining(end - now) : '',
    periodLabel,
  };
}
