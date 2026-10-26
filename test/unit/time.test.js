import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatClock, formatOffset } from '../../src/lib/time.js';

test('formatClock omits hours for short durations', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(9), '0:09');
  assert.equal(formatClock(1433), '23:53');
  assert.equal(formatClock(3599), '59:59');
});

test('formatClock includes hours once past an hour', () => {
  assert.equal(formatClock(3600), '1:00:00');
  assert.equal(formatClock(5672), '1:34:32');
  assert.equal(formatClock(36000), '10:00:00');
});

test('formatClock truncates rather than rounds', () => {
  assert.equal(formatClock(59.9), '0:59');
});

test('formatClock clamps negatives and rejects non-finite input', () => {
  assert.equal(formatClock(-5), '0:00');
  assert.equal(formatClock(NaN), '--:--');
  assert.equal(formatClock(Infinity), '--:--');
  assert.equal(formatClock(undefined), '--:--');
});

test('formatOffset always carries a sign', () => {
  assert.equal(formatOffset(0), '+0:00');
  assert.equal(formatOffset(90), '+1:30');
  assert.equal(formatOffset(-90), '-1:30');
});
