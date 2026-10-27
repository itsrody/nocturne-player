import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDebug } from '../../src/lib/debug.js';

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
