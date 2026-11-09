import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyDisruption, formatRemaining, parseEventDate } from '../src/utils/traffic.js';

test('parseEventDate lit le format DD/MM/YYYY HH:mm', () => {
  const d = parseEventDate('09/11/2026 20:00');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getHours(), 20);
  assert.equal(parseEventDate('n’importe quoi'), null);
  assert.equal(parseEventDate(undefined), null);
});

test('formatRemaining formate minutes, heures et jours', () => {
  assert.equal(formatRemaining(12 * 60000), 'encore 12 min');
  assert.equal(formatRemaining(78 * 60000), 'encore 1 h 18');
  assert.equal(formatRemaining(120 * 60000), 'encore 2 h');
  assert.equal(formatRemaining(3 * 24 * 3600000), 'encore 3 j');
});

test('classifyDisruption distingue en cours et à venir', () => {
  const now = new Date(2026, 10, 9, 18, 42);
  const ongoing = classifyDisruption({ dateDebut: '09/11/2026 14:00', dateFin: '09/11/2026 20:00' }, now);
  assert.equal(ongoing.status, 'ongoing');
  assert.equal(ongoing.remainingLabel, 'encore 1 h 18');
  assert.ok(ongoing.progress > 0.7 && ongoing.progress < 0.8);

  const upcoming = classifyDisruption({ dateDebut: '10/11/2026 22:00', dateFin: '11/11/2026 05:00' }, now);
  assert.equal(upcoming.status, 'upcoming');
  assert.equal(upcoming.progress, null);
  assert.match(upcoming.periodLabel, /^demain · 22:00 à 05:00$/);
});
