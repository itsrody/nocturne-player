import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDebug, hearLines } from '../../src/lib/debug.js';

// A settings bus trimmed to what the logger stands on: the answer to the
// first read, and the push that comes when the switch moves.
const makeSettings = () => {
  const handlers = [];
  globalThis.browser = {
    storage: {
      local: { get: async () => ({}), set: async () => {} },
      onChanged: {
        addListener: (listener) => handlers.push(listener),
        removeListener: () => {},
      },
    },
  };
  const flip = (debugMode) => {
    for (const listener of [...handlers]) {
      listener({ nocturne: { newValue: { debugMode } } }, 'local');
    }
  };
  return flip;
};

test('the line arrives only for whoever asks, and while they ask', async () => {
  const flip = makeSettings();
  const lines = [];
  const original = console.info;
  console.info = (...parts) => lines.push(parts.join(' '));

  const debug = createDebug('test');
  debug('nothing yet, the switch was never on');
  assert.deepEqual(lines, [], 'the default keeps the console silent');

  flip(true);
  debug('the page holds no film of its own');
  assert.equal(lines.at(-1).includes('[test]'), true);
  assert.equal(lines.at(-1).includes('the page holds no film'), true);

  // A detail rides the same line, never a second one.
  debug('the film is settled', '3 playable in all');
  assert.equal(lines.at(-1).includes('3 playable in all'), true);
  assert.equal(lines.length, 2, 'one line per word');

  flip(false);
  debug('nobody hears this');
  assert.equal(lines.length, 2, 'the switch is off again');

  console.info = original;
  delete globalThis.browser;
});

test('the standing sink hears every line the console says', async () => {
  const flip = makeSettings();
  const heard = [];
  const original = console.info;
  console.info = () => {};

  // One sink, one standing word: the returned answer stands it down.
  const off = hearLines((text) => heard.push(text));
  try {
    const debug = createDebug('aes');

    flip(true);
    debug('the plan arrived', '3 segments');
    assert.deepEqual(heard, ['Nocturne: [aes] the plan arrived — 3 segments']);

    // The switch off, the sink hears nothing — the listener is never
    // reached, so no word crosses at all.
    flip(false);
    debug('nobody hears this');
    assert.equal(heard.length, 1);

    // And stood down, the sink is gone: the word returns to the console
    // alone.
    off();
    flip(true);
    debug('the sink stood down');
    assert.equal(heard.length, 1);
  } finally {
    console.info = original;
    delete globalThis.browser;
  }
});
