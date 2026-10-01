import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTimetableCatalog,
  formatSheetTime,
  normalizeTimeSheet,
  secondsFromTimeInput,
} from '../src/utils/timetable.js';

test('le catalogue conserve les lignes publiques et écarte scolaire et TER', () => {
  const cards = buildTimetableCatalog([
    { id: 'SEM:C10', shortName: 'C10', type: 'CHRONO_PERI', timeSheet: true },
    { id: 'SEM:C2', shortName: 'C2', type: 'CHRONO', timeSheet: true },
    { id: 'C38:T40', shortName: 'T40', type: 'C38_AUTRE', timeSheet: true },
    { id: 'TRA:TA2A', shortName: 'TA2A', type: 'TRA', timeSheet: true },
    { id: 'C38:SC01', shortName: 'SC01', type: 'SCOL', timeSheet: true },
    { id: 'SNC:C1', shortName: 'C1', type: 'SNC', timeSheet: true },
    { id: 'SEM:OFF', shortName: 'OFF', type: 'BUS', timeSheet: false },
  ]);

  const routeIds = cards.flatMap((card) => card.sections.flatMap((section) => section.routes.map((route) => route.id)));
  assert.deepEqual(routeIds, ['SEM:C2', 'SEM:C10', 'C38:T40', 'TRA:TA2A']);
});

test('le catalogue trie les codes de manière naturelle', () => {
  const cards = buildTimetableCatalog([
    { id: 'SEM:C10', shortName: 'C10', type: 'CHRONO', timeSheet: true },
    { id: 'SEM:C2', shortName: 'C2', type: 'CHRONO', timeSheet: true },
    { id: 'SEM:C1', shortName: 'C1', type: 'CHRONO', timeSheet: true },
  ]);

  assert.deepEqual(cards[0].sections[0].routes.map((route) => route.shortName), ['C1', 'C2', 'C10']);
});

test('la fiche horaire normalise les deux sens et ignore les réponses vides', () => {
  const sheet = normalizeTimeSheet({
    0: {
      prevTime: 1_790_847_720_000,
      nextTime: 1_790_849_880_000,
      arrets: [{ stopId: 'SEM:ONE', name: 'Premier', city: 'Grenoble', trips: [42_000, 42_240] }],
    },
    1: {},
  });

  assert.equal(sheet.directions.length, 1);
  assert.equal(sheet.directions[0].id, '0');
  assert.deepEqual(sheet.directions[0].stops[0].times, [42_000, 42_240]);
  assert.deepEqual(normalizeTimeSheet(null), { directions: [] });
});

test('les heures de la fiche utilisent un format horaire stable', () => {
  assert.equal(formatSheetTime(42_300), '11:45');
  assert.equal(formatSheetTime(87_000), '00:10');
  assert.equal(secondsFromTimeInput('11:45'), 42_300);
});
