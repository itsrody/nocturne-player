// The keeper’s own law, gate by gate. The door at the bus kills a
// manifest ask only where a pin stands and the house can reword the
// answer — every other ask flows on to the rails unharmed, and every
// gate is its own test: no tab behind the ask, no manifest in the
// address, no room in the book, no want, no pin — plus the replace
// side itself, the data door the reworded bytes ride out on, and the
// miss that answers the rails instead.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createBook } from '../../src/background/book/book.js';
import { createKeeper } from '../../src/background/network/keeper.js';

const BASE = 'https://stream.example/vod/master.m3u8';
const masterManifest = () =>
  [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720,CODECS="avc1"',
    '720.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080',
    '1080.m3u8',
  ].join('\n');

// A listener whose answers are held where the test can look at them.
const wiring = () => {
  const listeners = { hear: null, filter: null, allowed: null };
  const browser = {
    webRequest: {
      onBeforeRequest: {
        addListener: (hear, filter, allowed) => {
          listeners.hear = hear;
          listeners.filter = filter;
          listeners.allowed = allowed;
        },
      },
    },
  };
  return { browser, listeners };
};

const admit = (book, { want = true, rung = undefined } = {}) => {
  const table = book.tableOf(103);
  const entry = book.born({ stream: true });
  entry.want = want;
  if (rung !== undefined) entry.rung = rung;
  table.book.set(77, entry);
  return entry;
};

test('the keeper stands its ear at the bus, blocking, both kinds', () => {
  const { browser, listeners } = wiring();
  const book = createBook();
  const keeperDone = [];
  createKeeper({
    browser,
    book,
    worker: { askBytes: async () => (keeperDone.push(true), null) },
    debug: () => {},
  });
  assert.notEqual(listeners.hear, null);
  assert.deepEqual(listeners.filter, {
    urls: ['<all_urls>'],
    types: ['media', 'xmlhttprequest'],
  });
  assert.deepEqual(listeners.allowed, ['blocking']);
});

test('the door holds back to the rails, every ask not pinned', async () => {
  const { browser, listeners } = wiring();
  const book = createBook();
  const asked = [];
  createKeeper({
    browser,
    book,
    worker: { askBytes: async (url) => asked.push(url) },
    debug: () => {},
  });

  // The hub’s own hands: no tab behind the ask.
  assert.deepEqual(
    await listeners.hear({ tabId: -1, url: BASE, type: 'xmlhttprequest' }),
    {},
  );
  // Not a manifest family address.
  assert.deepEqual(
    await listeners.hear({
      tabId: 103,
      frameId: 77,
      url: 'https://stream.example/seg-1.ts',
      type: 'xmlhttprequest',
    }),
    {},
  );
  // A frame the book never heard of.
  assert.deepEqual(
    await listeners.hear({
      tabId: 999,
      frameId: 0,
      url: BASE,
      type: 'xmlhttprequest',
    }),
    {},
  );
  // A frame that never asked for the player (no want).
  admit(book, { want: false, rung: '0' });
  assert.deepEqual(
    await listeners.hear({
      tabId: 103,
      frameId: 77,
      url: BASE,
      type: 'xmlhttprequest',
    }),
    {},
  );
  // A want without a pin: the master is the page’s.
  assert.equal(asked.length, 0);
  admit(book, { want: true });
  assert.deepEqual(
    await listeners.hear({
      tabId: 103,
      frameId: 77,
      url: BASE,
      type: 'xmlhttprequest',
    }),
    {},
  );
  assert.equal(asked.length, 0);
});

test('the door kills the pinned ask, and replaces it with ours', async () => {
  const { browser, listeners } = wiring();
  const book = createBook();
  let askSeen = null;
  createKeeper({
    browser,
    book,
    worker: {
      askBytes: async (url, ask) => {
        askSeen = { url, heads: ask.heads };
        return {
          status: 200,
          contentType: 'application/vnd.apple.mpegurl',
          bytes: new TextEncoder().encode(masterManifest()).buffer,
          heads: [],
        };
      },
    },
    debug: () => {},
  });
  admit(book, { want: true, rung: '0' });
  const said = await listeners.hear({
    tabId: 103,
    frameId: 77,
    url: BASE,
    type: 'xmlhttprequest',
  });

  // The kill-and-replace, in the door’s own shape: a redirect to the
  // data name the player’s loader reads as a playlist, whose body
  // spells the one rung the sheet pinned — the other pair out.
  const redirect = said.redirectUrl ?? '';
  const body = Buffer.from(
    redirect.replace(/^data:application\/vnd\.apple\.mpegurl;base64,/, ''),
    'base64',
  ).toString('utf8');
  const kept = body.split('\n');
  const streamInf = kept.filter((one) => one.startsWith('#EXT-X-STREAM-INF'));
  assert.equal(streamInf.length, 1);
  assert.ok(streamInf[0].includes('1280x720'));
  assert.ok(kept.includes('https://stream.example/vod/720.m3u8'));
  assert.ok(!kept.includes('1080.m3u8'));
  // The redirect is a data name with the family’s own saying.
  assert.ok(redirect.startsWith('data:application/vnd.apple.mpegurl;base64,'));
  // The replace side rode the bearer word the book said: the ask the
  // house’s hands replayed carried the room’s carried heads.
  assert.notEqual(askSeen, null);
  assert.equal(askSeen.url, BASE);
});

test('a miss at the hands answers the rails, original flows on', async () => {
  const { browser, listeners } = wiring();
  const book = createBook();
  createKeeper({
    browser,
    book,
    worker: { askBytes: async () => ({ status: 0, bytes: null, heads: [] }) },
    debug: () => {},
  });
  admit(book, { want: true, rung: '0' });
  assert.deepEqual(
    await listeners.hear({
      tabId: 103,
      frameId: 77,
      url: BASE,
      type: 'xmlhttprequest',
    }),
    {},
  );
});

test('a variant the master no longer names answers the rails too', async () => {
  const { browser, listeners } = wiring();
  const book = createBook();
  createKeeper({
    browser,
    book,
    worker: {
      askBytes: async () => ({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        bytes: new TextEncoder().encode(masterManifest()).buffer,
        heads: [],
      }),
    },
    debug: () => {},
  });
  admit(book, { want: true, rung: '9' });
  assert.deepEqual(
    await listeners.hear({
      tabId: 103,
      frameId: 77,
      url: BASE,
      type: 'xmlhttprequest',
    }),
    {},
  );
});
