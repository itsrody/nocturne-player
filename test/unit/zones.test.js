import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hitTest, isSide, ZONE } from '../../src/content/gestures/zones.js';

const WIDTH = 800;

const zoneAt = (xRatio) => hitTest(xRatio * WIDTH, WIDTH);

test('three zones span the whole picture, every height alike', () => {
  for (const xRatio of [0, 0.2, 0.39]) {
    assert.equal(zoneAt(xRatio), ZONE.LEFT);
  }
  for (const xRatio of [0.41, 0.5, 0.59]) {
    assert.equal(zoneAt(xRatio), ZONE.MIDDLE);
  }
  for (const xRatio of [0.61, 0.8, 0.99]) {
    assert.equal(zoneAt(xRatio), ZONE.RIGHT);
  }
});

test('the middle is the narrow strip, the sides carry the rest', () => {
  assert.equal(zoneAt(0.39), ZONE.LEFT);
  assert.equal(zoneAt(0.41), ZONE.MIDDLE);
  assert.equal(zoneAt(0.59), ZONE.MIDDLE);
  assert.equal(zoneAt(0.61), ZONE.RIGHT);
});

test('only the sides form runs of taps', () => {
  assert.ok(isSide(ZONE.LEFT));
  assert.ok(isSide(ZONE.RIGHT));
  assert.ok(!isSide(ZONE.MIDDLE));
});
