import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGuardBudget } from '../../src/content/ground.js';

test('a guard spends its repairs against the budget, then stands aside', () => {
  const alarmed = [];
  const budget = createGuardBudget(() => alarmed.push('once'));

  // Bounded, so a budget that would never answer cannot hang the runner.
  let kept = 0;
  while (kept < 1000 && budget()) kept += 1;
  assert.equal(kept, 240);

  assert.equal(budget(), false);
  assert.equal(budget(), false);
  assert.deepEqual(alarmed, ['once']);
});

test('an alarm is sounded once, however many calls come after it', () => {
  let alarms = 0;
  const budget = createGuardBudget(() => {
    alarms += 1;
  });

  for (let spent = 0; spent < 1000 && budget(); spent++);
  assert.equal(alarms, 1);
  budget();
  budget();
  assert.equal(alarms, 1);
});
