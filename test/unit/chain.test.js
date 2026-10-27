import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chainHosts } from '../../src/lib/chain.js';

// The chain of hosts is lib/chain.js's own law now — the background's
// gate and a frame's decision both read it — so its record lives beside
// the file it tests.
test('the chain of origins is the host list, nearest first', () => {
  assert.deepEqual(
    chainHosts({
      host: 'film.example',
      ancestorOrigins: {
        length: 3,
        0: 'https://embed.example',
        1: 'https://top.example',
        2: 'null',
      },
    }),
    ['film.example', 'embed.example', 'top.example'],
  );

  // A guest with no name says nothing for itself; the named ancestors
  // decide, and the opaque word 'null' is not a URL and carries no host.
  assert.deepEqual(
    chainHosts({
      host: '',
      ancestorOrigins: { length: 2, 0: 'https://top.example', 1: 'null' },
    }),
    ['top.example'],
  );

  // A page's own chain repeats nobody.
  assert.deepEqual(
    chainHosts({
      host: 'top.example',
      ancestorOrigins: { length: 1, 0: 'https://top.example' },
    }),
    ['top.example'],
  );
});
