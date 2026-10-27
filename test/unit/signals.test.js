import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSignal } from '../../src/lib/signals.js';

test('every listener present hears, in registration order', () => {
  const said = [];
  const moment = createSignal();

  moment.on((detail) => said.push(`first ${detail}`));
  moment.on((detail) => said.push(`second ${detail}`));
  moment.emit('word');

  assert.deepEqual(said, ['first word', 'second word']);
});

test('a moment said to nobody is simply lost, not an error', () => {
  const moment = createSignal();
  moment.emit('word');
  assert.ok(true);
});

test('a listener taken off before the moment hears nothing', () => {
  const moment = createSignal();
  const said = [];

  const stop = moment.on((detail) => said.push(detail));
  stop();
  stop(); // A second taking-off is a quiet nothing.
  moment.emit('word');

  assert.deepEqual(said, []);
});

test('registering while the moment runs waits for the next one', () => {
  const moment = createSignal();
  const said = [];

  moment.on(() => {
    said.push('first');
    // The late half of a cycle, arriving while the moment it wants to hear
    // is being said: it must not hear this saying, or a moment could chase
    // its own tail.
    moment.on((detail) => said.push(`late ${detail}`));
  });
  moment.emit('word');
  moment.emit('again');

  // The first listener stands for every moment; the late one hears the
  // 'again' but never the 'word' that was still being said.
  assert.deepEqual(said, ['first', 'first', 'late again']);
});
