import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createTimerSlot,
  formatClock,
  formatOffset,
} from '../../src/lib/time.js';

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

// The slot is watched through a ledger where an armed moment waits to be
// called by hand — the test plays the clock, so no timer can escape into
// the runner's own event loop.
const makeClock = () => {
  let issued = 0;
  const dropped = [];
  let pending = null;
  return {
    arm: (_fire, ms) => {
      issued += 1;
      pending = _fire;
      return { id: issued, ms };
    },
    drop: (held) => {
      dropped.push(held);
      // A dropped hold is a moment that will no longer happen.
      pending = null;
    },
    // The moment the slot is waiting for, made to happen.
    fire: () => {
      const who = pending;
      pending = null;
      who();
    },
    dropped,
    /** How many times an arm was asked for. */
    issued: () => issued,
  };
};

test('a rearm replaces what the slot held, one drop at a time', () => {
  const clock = makeClock();
  const slot = createTimerSlot(() => {}, { arm: clock.arm, drop: clock.drop });

  slot.set(400);
  slot.set(400);
  assert.equal(clock.issued(), 2);
  assert.equal(clock.dropped.length, 1);
  assert.equal(slot.isOn(), true);
});

test('a clear takes the moment away and leaves the slot honest', () => {
  const clock = makeClock();
  const slot = createTimerSlot(() => {}, { arm: clock.arm, drop: clock.drop });

  slot.set(250);
  slot.clear();
  assert.equal(slot.isOn(), false);
  slot.clear();
  assert.equal(clock.dropped.length, 1);
  assert.equal(clock.issued(), 1);
});

test('the moment empties the slot before its work is read', () => {
  const clock = makeClock();
  let said = 0;
  const slot = createTimerSlot(
    () => {
      said += 1;
      assert.equal(slot.isOn(), false);
    },
    { arm: clock.arm, drop: clock.drop },
  );

  slot.set(1200);
  assert.equal(slot.isOn(), true);
  clock.fire();
  assert.equal(said, 1);
  assert.equal(slot.isOn(), false);
});
