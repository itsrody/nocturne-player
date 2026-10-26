import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMediaBridge } from '../../src/content/video/mediasession.js';

// The bridge reads shared globals at call time, so the test can hand it a
// system of its own: a media session that remembers what it was told, and a
// document that declares nothing but the film's name.
const installSystem = () => {
  const session = {
    playbackState: '',
    metadata: null,
    actions: {},
    setActionHandler: (name, handler) => {
      if (handler === null) delete session.actions[name];
      else session.actions[name] = handler;
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
    listeners: {},
    addEventListener: (type, handler) => {
      element.listeners[type] = handler;
    },
    removeEventListener: () => {},
    play: async () => {
      element.paused = false;
      element.listeners.play?.();
    },
    pause: () => {
      element.paused = true;
      element.listeners.pause?.();
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
