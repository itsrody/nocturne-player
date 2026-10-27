import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMediaBridge } from '../../src/content/video/mediasession.js';

// The bridge reads shared globals at call time, so the test can hand it a
// system of its own: a media session that remembers what it was told —
// handlers, metadata, playback state, the position state its timeline is
// drawn from — and a document that declares nothing but the film's name.
const installSystem = () => {
  const session = {
    playbackState: '',
    metadata: null,
    positionState: undefined,
    actions: {},
    setActionHandler: (name, handler) => {
      if (handler === null) delete session.actions[name];
      else session.actions[name] = handler;
    },
    setPositionState: (state) => {
      session.positionState = state;
    },
  };
  const document = {
    title: 'The Film',
    querySelector: () => null,
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: { mediaSession: session },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: document,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'MediaMetadata', {
    value: class {
      constructor(seed) {
        Object.assign(this, seed);
      }
    },
    configurable: true,
  });

  return session;
};

const makeElement = () => {
  const element = {
    title: '',
    paused: true,
    duration: 1200,
    currentTime: 0,
    playbackRate: 1,
    listeners: {},
    // Listener lists, not a single slot: the bridge hangs two handlers on
    // play and pause — the state word and the timeline — and a real
    // element would fire them both.
    addEventListener: (type, handler) => {
      (element.listeners[type] ??= []).push(handler);
    },
    removeEventListener: (type, handler) => {
      const list = element.listeners[type];
      if (list !== undefined) {
        element.listeners[type] = list.filter((one) => one !== handler);
      }
    },
    play: async () => {
      element.paused = false;
      for (const handler of element.listeners.play ?? []) handler();
    },
    pause: () => {
      element.paused = true;
      for (const handler of element.listeners.pause ?? []) handler();
    },
  };
  return element;
};

test('the system receives a handler for every control it speaks', () => {
  const session = installSystem();
  createMediaBridge(makeElement(), { onExit: () => {} });

  for (const action of [
    'play',
    'pause',
    'stop',
    'seekforward',
    'seekbackward',
    'seekto',
  ]) {
    assert.equal(typeof session.actions[action], 'function', action);
  }
});

test('the metadata is whatever the page declares', () => {
  const session = installSystem();
  createMediaBridge(makeElement(), { onExit: () => {} });

  assert.equal(session.metadata.title, 'The Film');
  assert.equal(session.metadata.artwork, undefined);
});

test('a seek steps forward ten seconds by default, and holds a limit', () => {
  const session = installSystem();
  const element = makeElement();
  element.duration = Number.NaN;
  element.currentTime = 1195;
  createMediaBridge(element, { onExit: () => {} });

  session.actions.seekforward();
  assert.equal(element.currentTime, 1195 + 10);

  session.actions.seekto({ seekTime: 30 });
  assert.equal(element.currentTime, 30);

  session.actions.seekbackward({ seekOffset: 60 });
  assert.equal(element.currentTime, 0);
});

test('stop hands the way out; release clears every handler', () => {
  const session = installSystem();
  let exited = false;
  const bridge = createMediaBridge(makeElement(), {
    onExit: () => {
      exited = true;
    },
  });

  session.actions.stop();
  assert.equal(exited, true);

  bridge.release();
  assert.deepEqual(session.actions, {});
});

test('the playback state follows the element on its own', async () => {
  const session = installSystem();
  const element = makeElement();
  createMediaBridge(element, { onExit: () => {} });

  await element.play();
  assert.equal(session.playbackState, 'playing');

  element.pause();
  assert.equal(session.playbackState, 'paused');
});

test('the timeline speaks each of the film\u2019s moments', () => {
  const session = installSystem();
  const element = makeElement();
  element.paused = false;
  element.currentTime = 40;
  createMediaBridge(element, { onExit: () => {} });

  // Creation pushed once; the moments the film's rules change redraw it.
  for (const handler of element.listeners.seeked) handler();
  assert.deepEqual(session.positionState, {
    duration: 1200,
    playbackRate: 1,
    position: 40,
  });

  element.playbackRate = 2;
  for (const handler of element.listeners.ratechange) handler();
  assert.deepEqual(session.positionState, {
    duration: 1200,
    playbackRate: 2,
    position: 40,
  });

  // A stream still live has no length to hang a timeline on, and the
  // platform refuses one of Infinity outright.
  element.duration = Number.POSITIVE_INFINITY;
  for (const handler of element.listeners.durationchange) handler();
  assert.equal(session.positionState, undefined);
});

test('a paused film freezes its timeline at rate zero', () => {
  const session = installSystem();
  const element = makeElement();
  element.currentTime = 30;
  createMediaBridge(element, { onExit: () => {} });

  for (const handler of element.listeners.pause) handler();
  assert.deepEqual(session.positionState, {
    duration: 1200,
    playbackRate: 0,
    position: 30,
  });
});

test('a fast seek snaps, a written seek lands exactly', () => {
  const session = installSystem();
  const element = makeElement();
  let fast = 0;
  element.fastSeek = (time) => {
    fast += 1;
    element.currentTime = time;
  };
  createMediaBridge(element, { onExit: () => {} });

  session.actions.seekto({ seekTime: 30, fastSeek: true });
  assert.equal(fast, 1);
  assert.equal(element.currentTime, 30);

  session.actions.seekto({ seekTime: 60 });
  assert.equal(fast, 1);
  assert.equal(element.currentTime, 60);
});

test('a zero offset is no offset, and the ten seconds stand in', () => {
  const session = installSystem();
  const element = makeElement();
  element.currentTime = 100;
  createMediaBridge(element, { onExit: () => {} });

  session.actions.seekforward({ seekOffset: 0 });
  assert.equal(element.currentTime, 110);
});

test('a page that names its own film is not spoken over', () => {
  const session = installSystem();
  const own = new globalThis.MediaMetadata({ title: 'The Page\u2019s Own' });
  session.metadata = own;
  const bridge = createMediaBridge(makeElement(), { onExit: () => {} });

  assert.equal(session.metadata, own);

  bridge.release();
  assert.equal(session.metadata, own);
});

test('release pays the system its own picture back', () => {
  const session = installSystem();
  const element = makeElement();
  element.currentTime = 3;
  const bridge = createMediaBridge(element, { onExit: () => {} });

  // The page declared nothing, so the furniture's name went up.
  assert.equal(session.metadata.title, 'The Film');
  assert.deepEqual(session.positionState, {
    duration: 1200,
    playbackRate: 0,
    position: 3,
  });

  bridge.release();
  assert.deepEqual(session.actions, {});
  assert.equal(session.metadata, null);
  assert.equal(session.positionState, undefined);
  assert.equal(session.playbackState, 'paused');
});
