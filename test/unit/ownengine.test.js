// The own engine’s own law, gate by gate: an errored, planless
// element the house can name the stream for — that is the takeover’s
// whole claim; every other element is answered honestly to nobody.
// The spawn seam is injected, so no runner here touches the runtime,
// the page world, or the vendored loader.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createOwnEngine } from '../../src/content/video/ownengine.js';
import { hearLadder } from '../../src/content/video/ladder.js';

const BASE = 'https://stream.example/vod/master.m3u8';

// The document the element’s own naming resolves against — a stub,
// since the runner is no page; the repair arm reads the base the page
// keeps.
globalThis.document = { baseURI: 'https://site.example/embed/' };

// The element the walk hands the arm: errored on demand, with its own
// naming, and the measures the fatal failure would need.
const element = (src) => ({
  getAttribute: (name) => (name === 'src' ? src : null),
  src,
  error: null,
});

// Every waiting beat is the same settle: the takeover is async, and
// the law says what landed after the beat.
const settle = (ms = 10) =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

// The `owns` check, read from the page’s expando, the one fact the
// feeder composes with.
const ownsOf = (video) => video.nocturneHls !== undefined;

test('an errored, planless element: takeover, once, by address', async () => {
  const spawned = [];
  const own = createOwnEngine({
    spawn: async (video, address, original) => {
      spawned.push({ video, address, original });
      video.nocturneHls = {};
      return {};
    },
  });
  const video = element(BASE);
  video.error = { code: 4 };
  own.repair(video, false);
  await settle();
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].address, BASE);
  // The original said down before the takeover is the page’s own
  // naming — what a fatal failure puts back.
  assert.equal(spawned[0].original, BASE);
  // The house hangs the engine under its own key the sweep asks
  // first, and the one-attempt law: a second repair asks nothing.
  assert.equal(ownsOf(video), true);
  own.repair(video, false);
  await settle();
  assert.equal(spawned.length, 1);
});

test('playing, sealed, unnameable: nobody’s film to take', async () => {
  const spawned = [];
  const own = createOwnEngine({
    spawn: async (video, address) => spawned.push(address),
  });
  // Not errored: the element is one the page is reading fine.
  const playing = element(BASE);
  own.repair(playing, false);
  // Sealed: a plan said by the bus makes the element the feeder’s.
  const sealed = element(BASE);
  sealed.error = { code: 4 };
  own.repair(sealed, true);
  // An errored element whose stream the frame cannot name: no
  // address the house fuels from, and none invented.
  const stranger = {
    getAttribute: () => null,
    src: 'blob:https://site.example/1',
    error: { code: 4 },
  };
  own.repair(stranger, false);
  await settle();
  assert.equal(spawned.length, 0);
});

test('a blob element rides the ladder key to its master', async () => {
  const spawned = [];
  const own = createOwnEngine({
    spawn: async (video, address) => {
      spawned.push(address);
      video.nocturneHls = {};
      return {};
    },
  });
  hearLadder(BASE, [
    {
      index: 0,
      bandwidth: 1000000,
      height: 720,
      codecs: null,
      url: 'https://stream.example/vod/720.m3u8',
    },
    {
      index: 1,
      bandwidth: 4000000,
      height: 1080,
      codecs: null,
      url: 'https://stream.example/vod/1080.m3u8',
    },
  ]);
  const video = element('blob:https://site.example/2');
  video.error = { code: 4 };
  own.repair(video, false);
  await settle();
  assert.deepEqual(spawned, [BASE]);
});

test('a null spawn is said honestly; the walk re-asks', async () => {
  let seed = 0;
  const own = createOwnEngine({
    spawn: async (video) => {
      seed += 1;
      if (seed === 1) return null;
      video.nocturneHls = {};
      return {};
    },
  });
  const video = element(BASE);
  video.error = { code: 4 };
  own.repair(video, false);
  await settle();
  // The refusal said nothing; the element unchanged, the walk’s next
  // beat re-asks — the second spawn answers the truth.
  assert.equal(ownsOf(video), false);
  own.repair(video, false);
  await settle();
  assert.equal(ownsOf(video), true);
});
