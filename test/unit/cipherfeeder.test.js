import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { createCipherFeeder } from '../../src/content/video/cipherfeeder.js';
import { asCipherAsk, sayCipherBytes } from '../../src/lib/protocol.js';

let realm;

// The room the feeder plays in, stood up to exactly what it asks: a
// media source that hands out one buffer and answers `sourceopen` by
// hand, a URL room that remembers the addresses it minted and revoked,
// and a document with its own base under the element’s names. The
// Feeder’s own port listener answers the words the test drives.
beforeEach(() => {
  globalThis.document = { baseURI: 'https://site.example/embed/' };
  const minted = [];
  const revoked = [];

  class SourceBufferStub {
    constructor() {
      this.appended = [];
      this.handlers = {};
      this.ended = false;
    }

    addEventListener(type, handler) {
      this.handlers[type] = handler;
    }

    appendBuffer(data) {
      this.appended.push(new Uint8Array(data));
    }

    endOfStream() {
      this.ended = true;
    }

    // The stub does not fire updateend by itself; the test says when
    // the buffer is through, exactly once per affix.
    land() {
      if (this.handlers.updateend !== undefined) this.handlers.updateend();
    }
  }

  class MediaSourceStub {
    static instances = [];
    static supported = true;
    static isTypeSupported = (mime) =>
      MediaSourceStub.supported && !mime.includes('unplayable');

    constructor() {
      this.handlers = {};
      this.constructor.instances.push(this);
    }

    addEventListener(type, handler) {
      this.handlers[type] = handler;
    }

    addSourceBuffer(mime) {
      this.mimed = mime;
      this.buffer = new SourceBufferStub();
      return this.buffer;
    }

    open() {
      if (this.handlers.sourceopen !== undefined) this.handlers.sourceopen();
    }
  }

  globalThis.MediaSource = MediaSourceStub;
  URL.createObjectURL = () => `blob:https://site.example/${minted.length + 1}`;
  URL.revokeObjectURL = (url) => revoked.push(url);

  const handlers = [];
  realm = {
    minted,
    revoked,
    MediaSource: MediaSourceStub,
    up: {
      asks: [],
      postMessage: (word) => realm.up.asks.push(asCipherAsk(word).url),
      onMessage: {
        addListener: (fn) => {
          handlers.push(fn);
        },
      },
      said: (word) => {
        for (const listener of [...handlers]) listener(word);
      },
    },
  };
});

afterEach(() => {
  delete globalThis.document;
  delete globalThis.MediaSource;
});

// The plan the bus said, and an errored element — four is
// MEDIA_ERR_SRC_NOT_SUPPORTED, what an element says when the stream
// itself was refused, not a momentary network sigh — naming the
// manifest on its own src attribute.
const plan = {
  url: 'https://stream.example/vod/media.m3u8',
  codecs: 'avc1.640028,mp4a.40.2',
  init: 'https://stream.example/vod/init.mp4',
  segments: [
    { url: 'https://stream.example/vod/seg0.mp4', seq: 41 },
    { url: 'https://stream.example/vod/seg1.mp4', seq: 42 },
  ],
};

const errored = (manifest) => ({
  error: { code: 4 },
  getAttribute: (name) => (name === 'src' ? manifest : null),
  src: manifest,
});

const bytes = (one) => new TextEncoder().encode(one).buffer;

// One segment’s whole round trip: the word comes back, the feeder
// appends it, the buffer is through, and the next ask rides.
const feedOne = (source, url, payload) => {
  const asked = realm.up.asks[realm.up.asks.length - 1];
  assert.equal(asked, url);
  realm.up.said(sayCipherBytes(url, payload));
  source.buffer.land();
};

test('an errored element on the manifest is fed in order', () => {
  const feeder = createCipherFeeder(realm.up, () => plan);
  const film = errored(plan.url);

  feeder.repair(film);

  // The element was handed the minted source whole: its src is the blob
  // now, and no ask has gone out — the takeover waits for the room to
  // say it opened, because the fragment room answers for the stream
  // time, not the playback.
  assert.equal(film.src, 'blob:https://site.example/1');
  assert.equal(realm.up.asks.length, 0);

  // The room opens: one buffer in the mime the plan named, and the
  // header asked first — it is what the stream is, and a segment
  // appended before it is noise. The minted room stands behind one
  // film: a whole stream keeps the address it was fed from.
  const source = realm.MediaSource.instances[0];
  source.open();
  assert.equal(source.mimed, 'video/mp4; codecs="avc1.640028,mp4a.40.2"');
  assert.deepEqual(realm.up.asks, [plan.init]);

  feedOne(source, plan.init, bytes('init'));
  feedOne(source, plan.segments[0].url, bytes('seg0'));
  feedOne(source, plan.segments[1].url, bytes('seg1'));

  assert.deepEqual(
    source.buffer.appended.map((one) => new TextDecoder().decode(one)),
    ['init', 'seg0', 'seg1'],
    'one ask in flight at a time, header and then play order',
  );

  // The queue is out: the stream is ended in the room’s own tongue, and
  // the element is introduced to no more of it.
  assert.equal(source.buffer.ended, true);
  assert.equal(realm.up.asks.length, 3);
  assert.equal(realm.revoked.length, 0, 'a whole film keeps its room');
});

test('a film the feeder has no plan for is none of its business', () => {
  const feeder = createCipherFeeder(realm.up, () => null);
  const film = errored(plan.url);
  feeder.repair(film);
  assert.equal(film.src, plan.url, 'the element was left as the site made it');
  assert.equal(realm.up.asks.length, 0);

  // A healthy element owns nothing for the feeder to hold: the error is
  // the whole reason to reach for it.
  const healthy = errored(plan.url);
  healthy.error = null;
  const other = createCipherFeeder(realm.up, () => plan);
  other.repair(healthy);
  assert.equal(healthy.src, plan.url);
  assert.equal(realm.up.asks.length, 0);
});

test('an element on another stream is none of the plan’s business', () => {
  const feeder = createCipherFeeder(realm.up, () => plan);
  const stranger = errored('https://stream.example/live/media.m3u8');
  feeder.repair(stranger);
  assert.equal(stranger.src, 'https://stream.example/live/media.m3u8');
  assert.equal(realm.up.asks.length, 0);
});

test('the room’s answer about the mime is believed', () => {
  realm.MediaSource.supported = false;
  const feeder = createCipherFeeder(realm.up, () => plan);
  const film = errored(plan.url);
  feeder.repair(film);
  assert.equal(film.src, plan.url, 'a room that plays nothing plays nothing');
  assert.equal(realm.up.asks.length, 0);
});

test('a miss restores the element, once, and asks no more', () => {
  const feeder = createCipherFeeder(realm.up, () => plan);
  const film = errored(plan.url);
  feeder.repair(film);

  const source = realm.MediaSource.instances[0];
  source.open();
  assert.deepEqual(realm.up.asks, [plan.init]);

  // The miss: the element goes back to the site’s own source, the
  // minted room’s address is revoked, and the words the hub still says
  // to the dead chain are heard by nobody.
  realm.up.said(sayCipherBytes(plan.init, null));
  assert.equal(film.src, plan.url, 'back on the site’s own source');
  assert.deepEqual(realm.revoked, ['blob:https://site.example/1']);
  assert.equal(realm.up.asks.length, 1);
  realm.up.said(sayCipherBytes(plan.init, bytes('late')));
  assert.equal(realm.up.asks.length, 1, 'nothing is asked of a dead chain');

  // And the second repair is the first refusal’s echo: one attempt per
  // element is the whole deal, so no film sits half-fed under a
  // takeover that already gave up on it.
  feeder.repair(film);
  assert.equal(film.src, plan.url);
  assert.equal(realm.up.asks.length, 1);
});
