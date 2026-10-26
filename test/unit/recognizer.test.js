import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { createRecognizer } from '../../src/content/gestures/recognizer.js';
import { SWIPE } from '../../src/content/gestures/swipe.js';

const WIDTH = 800;
const HEIGHT = 360;

const createSurface = () => {
  const listeners = new Map();
  return {
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
    setPointerCapture: () => {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
    }),
    fire: (type, xRatio, yRatio) =>
      listeners.get(type)({
        pointerId: 1,
        clientX: xRatio * WIDTH,
        clientY: yRatio * HEIGHT,
      }),
  };
};

const setUp = (options = {}) => {
  const surface = createSurface();
  const events = [];
  const record = (name) => (detail) => events.push({ name, ...detail });
  createRecognizer(
    surface,
    {
      tap: record('tap'),
      multiTap: record('multiTap'),
      holdStart: record('holdStart'),
      holdEnd: record('holdEnd'),
      dragStart: record('dragStart'),
      dragMove: record('dragMove'),
      dragEnd: record('dragEnd'),
      dismissStart: record('dismissStart'),
      dismissMove: record('dismissMove'),
      dismissEnd: record('dismissEnd'),
      swipe: record('swipe'),
    },
    { canSwipe: options.canSwipe },
  );
  const tapAt = (xRatio, yRatio) => {
    surface.fire('pointerdown', xRatio, yRatio);
    surface.fire('pointerup', xRatio, yRatio);
  };
  return { surface, events, tapAt };
};

beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
});

test('a lone tap acts where it lands, a side included', () => {
  const { events, tapAt } = setUp();
  tapAt(0.8, 0.4);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [['tap', 'right']],
  );
  mock.timers.reset();
});

test('a tap in the middle acts at once, so a second tap can pause', () => {
  const { events, tapAt } = setUp();
  tapAt(0.5, 0.4);
  tapAt(0.5, 0.4);
  assert.deepEqual(
    events.map((event) => event.name),
    ['tap', 'tap'],
  );
  mock.timers.reset();
});

test('a double-tap that is not very quick still seeks, never toggles', () => {
  const { events, tapAt } = setUp();
  tapAt(0.8, 0.4);
  mock.timers.tick(280);
  tapAt(0.84, 0.46);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [
      ['tap', 'right'],
      ['multiTap', 'right'],
    ],
  );
  mock.timers.reset();
});

test('a second tap that strays onto the middle still seeks', () => {
  const { events, tapAt } = setUp();
  tapAt(0.7, 0.4);
  mock.timers.tick(200);
  tapAt(0.55, 0.4);
  mock.timers.tick(1000);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [
      ['tap', 'right'],
      ['multiTap', 'right'],
    ],
  );
  mock.timers.reset();
});

test('a tap on the other side starts its own run instead of joining', () => {
  const { events, tapAt } = setUp();
  tapAt(0.7, 0.4);
  mock.timers.tick(200);
  tapAt(0.2, 0.4);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [
      ['tap', 'right'],
      ['tap', 'left'],
    ],
  );
  mock.timers.reset();
});

test('holding a side reports the start and the end of the hold', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.8, 0.4);
  mock.timers.tick(400);
  surface.fire('pointerup', 0.8, 0.4);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [
      ['holdStart', 'right'],
      ['holdEnd', 'right'],
    ],
  );
  mock.timers.reset();
});

test('a hold begins anywhere on the picture, the middle included', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.5, 0.4);
  mock.timers.tick(400);
  surface.fire('pointerup', 0.5, 0.4);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [
      ['holdStart', 'middle'],
      ['holdEnd', 'middle'],
    ],
  );
  mock.timers.reset();
});

test('a drifting tap stays a tap, wherever it started', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.5, 0.4);
  surface.fire('pointermove', 0.52, 0.4);
  surface.fire('pointerup', 0.52, 0.4);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [['tap', 'middle']],
  );
  mock.timers.reset();
});

test('a drifting tap over the strip stays a tap too', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.5, 0.8);
  surface.fire('pointermove', 0.52, 0.8);
  surface.fire('pointerup', 0.52, 0.8);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [['tap', 'middle']],
  );
  mock.timers.reset();
});

test('a horizontal drag anywhere scrubs once it has engaged', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.4, 0.4);
  surface.fire('pointermove', 0.45, 0.4);
  surface.fire('pointermove', 0.5, 0.4);
  surface.fire('pointerup', 0.5, 0.4);
  assert.deepEqual(
    events.map((event) => event.name),
    ['dragStart', 'dragMove', 'dragMove', 'dragEnd'],
  );
  assert.equal(events[0].zone, 'middle');
  mock.timers.reset();
});

test('a tap past the strip names the spot the finger settled on', () => {
  const { surface, events } = setUp();
  surface.fire('pointerdown', 0.7, 0.8);
  // The press's own first landing can carry the tolerance's drift; where
  // the finger rests when the tap completes is what was aimed at.
  surface.fire('pointermove', 0.72, 0.8);
  surface.fire('pointerup', 0.72, 0.8);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [['tap', 'right']],
  );
  const [tap] = events;
  assert.equal(tap.x, 0.72 * 800);
  assert.equal(tap.clientX, 0.72 * 800);
  assert.equal(tap.clientY, 0.8 * 360);
  mock.timers.reset();
});

test('a hold begins on the strip too — everywhere is everywhere now', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.5, 0.8);
  mock.timers.tick(400);
  surface.fire('pointerup', 0.5, 0.8);
  mock.timers.tick(400);
  assert.deepEqual(
    events.map((event) => [event.name, event.zone]),
    [
      ['holdStart', 'middle'],
      ['holdEnd', 'middle'],
    ],
  );
  mock.timers.reset();
});

test('a downward drag hands the player over to be pulled away', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.5, 0.3);
  surface.fire('pointermove', 0.5, 0.5);
  surface.fire('pointermove', 0.5, 0.7);
  surface.fire('pointerup', 0.5, 0.7);
  const dismissal = events.filter((event) => event.name.startsWith('dismiss'));
  assert.equal(dismissal[0].name, 'dismissStart');
  assert.ok(Math.abs(dismissal[1].progress - 0.4) < 0.001, 'drag progress');
  const end = dismissal[dismissal.length - 1];
  assert.equal(end.name, 'dismissEnd');
  assert.ok(Math.abs(end.progress - 0.4) < 0.001, 'end progress');
  assert.equal(events.includes('swipe'), false);
  mock.timers.reset();
});

test('a downward drag dismisses even where the page is a feed', () => {
  const { events, surface } = setUp({ canSwipe: () => true });
  surface.fire('pointerdown', 0.5, 0.3);
  surface.fire('pointermove', 0.5, 0.6);
  surface.fire('pointerup', 0.5, 0.6);
  assert.equal(
    events.some((event) => event.name === 'swipe'),
    false,
  );
  assert.equal(
    events.some((event) => event.name === 'dismissStart'),
    true,
  );
  mock.timers.reset();
});

test('a downward pull at the strip still pulls the player away', () => {
  const { events, surface } = setUp();
  surface.fire('pointerdown', 0.5, 0.8);
  surface.fire('pointermove', 0.5, 0.9);
  surface.fire('pointerup', 0.5, 0.9);
  assert.equal(
    events.some((event) => event.name.startsWith('drag')),
    false,
  );
  assert.deepEqual(
    events.map((event) => event.name),
    ['dismissStart', 'dismissEnd'],
  );
  assert.ok(Math.abs(events.at(-1).progress - 0.1) < 0.001, 'progress');
  mock.timers.reset();
});
test('an upward flick still steps a feed to the next video', () => {
  const { events, surface } = setUp({ canSwipe: () => true });
  surface.fire('pointerdown', 0.5, 0.5);
  surface.fire('pointermove', 0.5, 0.3);
  surface.fire('pointerup', 0.5, 0.25);
  assert.deepEqual(
    events.map((event) => event.name),
    ['swipe'],
  );
  assert.equal(events[0].direction, SWIPE.NEXT);
  mock.timers.reset();
});
