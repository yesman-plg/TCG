import assert from 'node:assert/strict';
import test from 'node:test';
import { catchAdvice, describeStep, estimateWalkMinutes, parseWalkPlan } from '../src/utils/walk.js';

test("l'estimation de marche ne descend jamais sous 1 minute", () => {
  assert.equal(estimateWalkMinutes(5), 1);
  assert.equal(estimateWalkMinutes(120), 2);
  assert.equal(estimateWalkMinutes(1000), 16);
  assert.equal(estimateWalkMinutes(NaN), null);
});

test('une étape OTP devient une consigne en français', () => {
  assert.deepEqual(
    describeStep({ relativeDirection: 'RIGHT', streetName: 'boulevard Gambetta', distance: 79.6 }),
    { text: 'Tourner à droite, boulevard Gambetta', icon: 'right', distance: 80 },
  );
  assert.equal(describeStep({ relativeDirection: 'CONTINUE', streetName: 'sidewalk' }).text, 'Continuer tout droit');
});

test('parseWalkPlan extrait durée, distance, tracé et étapes', () => {
  const plan = parseWalkPlan({
    plan: {
      itineraries: [
        {
          duration: 150,
          legs: [
            {
              mode: 'WALK',
              distance: 118.4,
              legGeometry: { points: '_p~iF~ps|U_ulLnnqC' },
              steps: [{ relativeDirection: 'DEPART', streetName: 'rue Lakanal', distance: 118 }],
            },
          ],
        },
      ],
    },
  });
  assert.equal(plan.minutes, 3);
  assert.equal(plan.distance, 118);
  assert.equal(plan.path.length, 2);
  assert.equal(plan.steps[0].icon, 'start');
});

test('parseWalkPlan renvoie null sans itinéraire', () => {
  assert.equal(parseWalkPlan(null), null);
  assert.equal(parseWalkPlan({ plan: { itineraries: [] } }), null);
});

test("catchAdvice dit si l'on a le temps d'atteindre l'arrêt", () => {
  assert.deepEqual(catchAdvice(2, [4, 11]), { status: 'ok', first: 4, margin: 2 });
  assert.equal(catchAdvice(4, [4, 11]).status, 'tight');
  assert.deepEqual(catchAdvice(5, [3, 11]), { status: 'missed', first: 3, catchable: 11 });
  assert.deepEqual(catchAdvice(20, [3, 11]), { status: 'missed', first: 3, catchable: null });
  assert.equal(catchAdvice(2, []).status, 'none');
});
