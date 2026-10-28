// The pre-buffer’s own law, gate by gate: playlists ride through and
// are read, fragments the shelf holds are answered from memory, the
// look-ahead is ordered the moment an order is placed and walks only
// what the playlist named, a run of parallel orders stays within its
// concurrency, and the shelf forgets exactly as fast as it must. The
// engine loader is a fake class here, every order recorded and
// completed by hand — no runner touches the vendored room or the page
// world. Assertions ask *which addresses were ordered and how often*,
// never which line placed them: the shelf may order its look-ahead
// before the ask it rode on, and the law holds either way.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createPrebufLoader, parsePlaylist } from '../../src/vendor/prebuf.mjs';

// The LoadStats shape the vendored room answers with — every field the
// shelf’s stats either fills or ignores.
const makeStats = (length) => ({
  aborted: false,
  loaded: length,
  retry: 0,
  total: length,
  chunkCount: 0,
  bwEstimate: 0,
  loading: { start: 0, first: 0, end: 0 },
  parsing: { start: 0, end: 0 },
  buffering: { start: 0, first: 0, end: 0 },
});

// A stand-in loader class: every order is recorded onto `orders` and
// completed — or cancelled — by the test, in call order.
const fakeHls = () => {
  const orders = [];
  class FakeLoader {
    constructor(config) {
      this.config = config;
      this.destroyed = false;
      this.aborted = false;
    }
    load(context, config, callbacks) {
      const order = {
        url: context.url,
        type: context.type,
        config,
        callbacks,
        loader: this,
      };
      order.finish = (data = new ArrayBuffer(1024)) => {
        const length = typeof data === 'string' ? data.length : data.byteLength;
        callbacks.onSuccess?.(
          { url: context.url, data, code: 200 },
          makeStats(length),
          context,
          null,
        );
      };
      order.refuse = () => {
        callbacks.onError?.(
          { code: 404, text: 'no' },
          context,
          null,
          makeStats(0),
        );
      };
      orders.push(order);
      return order;
    }
    abort() {
      this.aborted = true;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  return { DefaultConfig: { loader: FakeLoader }, orders };
};

// Five fragments of one playlist — enough for a whole window of
// look-ahead behind any one of them.
const PLAYLIST_URL = 'https://cdn.example/hls/720/playlist.m3u8';
const FRAG_URLS = [
  'https://cdn.example/hls/720/seg-0.ts',
  'https://cdn.example/hls/720/seg-1.ts',
  'https://cdn.example/hls/720/seg-2.ts',
  'https://cdn.example/hls/720/seg-3.ts',
  'https://cdn.example/hls/720/seg-4.ts',
];
const PLAYLIST_TEXT = `${[
  '#EXTM3U',
  '#EXT-X-TARGETDURATION:4',
  ...FRAG_URLS.map((one) => `#EXTINF:4.0,\n${one}`),
  '#EXT-X-ENDLIST',
].join('\n')}\n`;

const fragmentContext = (url) => ({
  type: 'media-fragment',
  frag: null,
  part: null,
  responseType: 'arraybuffer',
  url,
  headers: {},
  rangeStart: 0,
  rangeEnd: 0,
});

// How many orders the engine loader saw for an address — the shelf’s
// own look-ahead or the pass-through read, no distinction.
const ordersFor = (hls, url) =>
  hls.orders.filter((one) => one.url === url).length;

// The playlist read every fragment test starts from.
const play = (loader, hls) => {
  loader.load(
    { type: 'level', url: PLAYLIST_URL, responseType: 'text' },
    {},
    { onSuccess: () => {} },
  );
  hls.orders[0].finish(PLAYLIST_TEXT);
};

test('the parser reads what it can walk, and refuses the rest', () => {
  // Absolutization is hls.js’s own road: relative to the playlist’s
  // directory.
  assert.deepEqual(
    parsePlaylist(PLAYLIST_TEXT, PLAYLIST_URL).map((one) => one.url),
    FRAG_URLS,
  );
  // An init segment rides the inventory but never the look-ahead.
  const mapped = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4.0,\nseg-0.ts\n';
  const frags = parsePlaylist(mapped, PLAYLIST_URL);
  assert.equal(frags[0].init, true);
  assert.equal(frags[1].init, false);
  // A byte range is read off the line, with its window.
  const ranged = [
    '#EXTM3U',
    '#EXTINF:4.0,',
    'seg-0.ts',
    '#EXT-X-BYTERANGE:100@200',
    '#EXTINF:4.0,',
    'seg-1.ts',
  ].join('\n');
  assert.deepEqual(
    parsePlaylist(ranged, PLAYLIST_URL)
      .slice(1)
      .map((one) => [one.rangeStart, one.rangeEnd]),
    [[200, 300]],
  );
  // A bare length would chain off the unknown: no byte window named.
  const bareRange = [
    '#EXTM3U',
    '#EXT-X-BYTERANGE:100',
    '#EXTINF:4.0,',
    'seg-0.ts',
    '#EXTINF:4.0,',
    'seg-1.ts',
  ].join('\n');
  const bare = parsePlaylist(bareRange, PLAYLIST_URL);
  assert.deepEqual(
    bare.map((one) => [one.rangeStart, one.rangeEnd]),
    [
      [0, 0],
      [0, 0],
    ],
  );
  // A delta playlist hides fragments the walk would have to guess at.
  assert.equal(
    parsePlaylist(
      `${PLAYLIST_TEXT}#EXT-X-SKIP:SKIPPED-SEGMENTS=3\n`,
      PLAYLIST_URL,
    ),
    null,
  );
  // And whatever else it is, it is not a playlist.
  assert.equal(parsePlaylist('<html></html>', PLAYLIST_URL), null);
  assert.equal(parsePlaylist(null, PLAYLIST_URL), null);
});

test('the look-ahead orders forward the moment one is placed', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 3, concurrency: 4 });
  const loader = new Loader({});
  play(loader, hls);
  const before = hls.orders.length;
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  // The miss itself plus the three fragments after it — ordered at
  // once, without waiting for the read to land.
  assert.equal(hls.orders.length, before + 4);
  for (const step of [2, 3, 4]) {
    assert.ok(
      hls.orders.some(
        (one) => one.url === FRAG_URLS[step] && one.type === 'media-fragment',
      ),
      `the fragment ${step} behind the playhead was ordered`,
    );
  }
  // And nothing behind the served fragment was ordered: its shelf
  // position is not walked backwards.
  assert.equal(ordersFor(hls, FRAG_URLS[0]), 0);
});

test('a held fragment is served from memory, never re-ordered', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 1, concurrency: 4 });
  const loader = new Loader({});
  play(loader, hls);
  // The first read: a miss; the shelf keeps its answer on the way back.
  let first = null;
  loader.load(
    fragmentContext(FRAG_URLS[1]),
    {},
    {
      onSuccess: (response) => {
        first = response;
      },
    },
  );
  // Both the read and its look-ahead land; the shelf holds two.
  hls.orders.slice(1).forEach((one) => one.finish(new ArrayBuffer(2048)));
  assert.ok(first !== null, 'the read was answered');
  // The second read of the same address: served whole — same bytes,
  // no repeat order, stats a load would carry.
  const repeats = ordersFor(hls, FRAG_URLS[1]);
  let stats = null;
  loader.load(
    fragmentContext(FRAG_URLS[1]),
    {},
    {
      onSuccess: (response, loadStats) => {
        stats = loadStats;
        assert.equal(response.data, first.data);
      },
    },
  );
  assert.equal(ordersFor(hls, FRAG_URLS[1]), repeats);
  assert.equal(stats.loaded, 2048);
  assert.ok(Number.isFinite(stats.loading.end));
});

test('the walk stops where the playlist cannot be seen whole', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 3 });
  const loader = new Loader({});
  play(loader, hls);
  // A fragment the live inventory does not name — a rolled window —
  // gets its own read and orders nothing after it.
  const before = hls.orders.length;
  const unseen = 'https://cdn.example/hls/720/seg-99.ts';
  loader.load(fragmentContext(unseen), {}, { onSuccess: () => {} });
  assert.equal(hls.orders.length, before + 1);
  assert.equal(ordersFor(hls, unseen), 1);
});

test('a delta playlist leaves the last whole list walking', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 2 });
  const loader = new Loader({});
  play(loader, hls);
  // The same playlist read again, now a delta: the cancel is not owed
  // (a same-url parse is one list re-read, not a switch), the refusal
  // keeps the shelf walking its last whole list — those addresses were
  // named by the stream itself, and none is invented.
  assert.ok(hls.orders[0].callbacks.onSuccess !== undefined);
  const again = hls.orders.find((one) => one.url === PLAYLIST_URL);
  again.finish(`${PLAYLIST_TEXT}#EXT-X-SKIP:SKIPPED-SEGMENTS=2`);
  // A fragment ask still orders its neighbourhood from the last whole
  // list.
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  assert.equal(ordersFor(hls, FRAG_URLS[3]), 1);
});

test('the look-ahead stays within its concurrency', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 3, concurrency: 1 });
  const loader = new Loader({});
  play(loader, hls);
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  // One shelf order runs at a time: only the first neighbour is on the
  // wire, the rest wait in the queue.
  assert.equal(ordersFor(hls, FRAG_URLS[2]), 1);
  assert.equal(ordersFor(hls, FRAG_URLS[3]), 0);
  assert.equal(ordersFor(hls, FRAG_URLS[4]), 0);
  // When it lands, the next order leaves the queue.
  hls.orders
    .find((one) => one.url === FRAG_URLS[2])
    .finish(new ArrayBuffer(512));
  assert.equal(ordersFor(hls, FRAG_URLS[3]), 1);
  assert.equal(ordersFor(hls, FRAG_URLS[4]), 0);
  hls.orders
    .find((one) => one.url === FRAG_URLS[3])
    .finish(new ArrayBuffer(512));
  assert.equal(ordersFor(hls, FRAG_URLS[4]), 1);
});

test('the budget evicts the furthest-behind fragment first', () => {
  const hls = fakeHls();
  // A shelf that holds but two fragment reads at a time.
  const Loader = createPrebufLoader(hls, { window: 2, budget: 2048 });
  const loader = new Loader({});
  play(loader, hls);
  // The head fragment served; its window behind it completed. Three
  // reads of 1024 over a 2048 budget: the fragment furthest behind the
  // playhead — seg-0, the one just served — leaves first.
  loader.load(fragmentContext(FRAG_URLS[0]), {}, { onSuccess: () => {} });
  hls.orders.slice(1).forEach((one) => one.finish(new ArrayBuffer(1024)));
  // The first neighbour is still on the shelf: its second read asks
  // for no order.
  assert.equal(ordersFor(hls, FRAG_URLS[1]), 1);
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  assert.equal(ordersFor(hls, FRAG_URLS[1]), 1);
  // The head’s own read was what left: it rides again.
  assert.equal(ordersFor(hls, FRAG_URLS[0]), 1);
  loader.load(fragmentContext(FRAG_URLS[0]), {}, { onSuccess: () => {} });
  assert.equal(ordersFor(hls, FRAG_URLS[0]), 2);
});

test('a level switch cancels the old playlist’s orders', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 2, concurrency: 4 });
  const loader = new Loader({});
  play(loader, hls);
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  // A shelf order in flight, unfinished — then the level switches and
  // a new playlist is read: its rider is cancelled where it stands.
  const rider = hls.orders.find((one) => one.url === FRAG_URLS[2]).loader;
  const second = 'https://cdn.example/hls/1080/level.m3u8';
  loader.load(
    { type: 'level', url: second, responseType: 'text' },
    {},
    {
      onSuccess: () => {},
    },
  );
  const newRider = hls.orders[hls.orders.length - 1];
  newRider.finish(
    `${'#EXTM3U\n#EXTINF:4.0,\n'}https://cdn.example/hls/1080/seg-0.ts\n`,
  );
  assert.equal(rider.destroyed, true);
});

test('abort and destroy ride through to the order the engine asked for', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 1 });
  const loader = new Loader({});
  play(loader, hls);
  // A pass-through read in flight: the wrapper’s abort is the inner
  // order’s abort, the wrapper’s destroy its inner destroy.
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  const rider = hls.orders.find((one) => one.url === FRAG_URLS[1]).loader;
  loader.abort();
  loader.destroy();
  assert.equal(rider.aborted, true);
  assert.equal(rider.destroyed, true);
});

test('the dispose seam empties the shelf and stops nothing it owns', () => {
  const hls = fakeHls();
  const Loader = createPrebufLoader(hls, { window: 2 });
  const loader = new Loader({});
  play(loader, hls);
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  hls.orders.slice(1).forEach((one) => one.finish(new ArrayBuffer(1024)));
  assert.equal(ordersFor(hls, FRAG_URLS[1]), 1);
  Loader.dispose();
  // An engine asking again after the burial: the shelf holds nothing,
  // and the read rides through.
  loader.load(fragmentContext(FRAG_URLS[1]), {}, { onSuccess: () => {} });
  assert.equal(ordersFor(hls, FRAG_URLS[1]), 2);
});
