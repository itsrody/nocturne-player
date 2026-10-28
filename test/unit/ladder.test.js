import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  readManifest,
  keepVariant,
} from '../../src/background/cipher/manifest.js';
import {
  AUTO_ID,
  createLadderAdapter,
} from '../../src/content/video/qualityadapters.js';
import {
  hearCrossing,
  hearLadder,
  voiceLadder,
} from '../../src/content/video/ladder.js';

// The master the tests read: three rungs the stream itself names, with a
// resolution a real manifest writes and one row that carries none.
const BASE = 'https://stream.example/vod/master.m3u8';
const masterManifest = () =>
  [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720,CODECS="avc1"',
    '720.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080',
    '1080.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=500000',
    '360.m3u8',
  ].join('\n');

const VARIANTS = [
  {
    index: 0,
    bandwidth: 1000000,
    height: 720,
    codecs: 'avc1',
    url: 'https://stream.example/vod/720.m3u8',
  },
  {
    index: 1,
    bandwidth: 4000000,
    height: 1080,
    codecs: null,
    url: 'https://stream.example/vod/1080.m3u8',
  },
  {
    index: 2,
    bandwidth: 500000,
    height: 0,
    codecs: null,
    url: 'https://stream.example/vod/360.m3u8',
  },
];

test('a master playlist is read to its whole ladder', () => {
  const read = readManifest(masterManifest(), BASE);
  assert.equal(read.isMaster, true);
  // The widest one is still the play answer, chosen the same way the
  // element's own players choose first.
  assert.equal(read.variant.url, 'https://stream.example/vod/1080.m3u8');
  // And the whole list rides with it: every rung the stream named,
  // quoted in the rung's own words.
  assert.deepEqual(read.variants, VARIANTS);
  // A media playlist is no master: it names no ladder at all.
  const media = readManifest('#EXTM3U\n#EXTINF:6.0,\nseg0.mp4\n', BASE);
  assert.notEqual(media, null);
  assert.equal(media.variants, undefined);
});

test('the pin rewords the master to its one variant, and only then', () => {
  const kept = keepVariant(masterManifest(), BASE, VARIANTS[1].url);
  assert.notEqual(kept, null);
  const reworded = kept.split('\n');
  // The chosen pair survives whole — tag and its playlist line.
  assert.ok(
    reworded.some((line) => line.includes('BANDWIDTH=4000000')),
    'the chosen tag is kept',
  );
  // The chosen pair survives whole — tag and playlist line, and the
  // line now says the absolute address the reading resolved it to
  // (the same reading the directed dodoor made).
  assert.ok(
    reworded.some((line) => line.includes('1080.m3u8')),
    'the chosen playlist line is kept',
  );
  // The unchosen pairs are out entire — tag and playlist line alike,
  // in either direction the manifest happened to list them in.
  assert.equal(
    reworded.some((line) => line.includes('BANDWIDTH=1000000')),
    false,
  );
  assert.equal(
    reworded.some((line) => line.includes('720.m3u8')),
    false,
  );
  assert.equal(
    reworded.some((line) => line.includes('360.m3u8')),
    false,
  );
  // What the manifest said around the ladder rides across untouched.
  assert.equal(reworded[0], '#EXTM3U');
  assert.equal(reworded[1], '#EXT-X-VERSION:3');
  // The reworded master is still a master the reader quotes the same way.
  const reRead = readManifest(kept, BASE);
  assert.equal(reRead.isMaster, true);
  assert.equal(reRead.variant.url, VARIANTS[1].url);
  assert.equal(reRead.variants.length, 1);

  // A variant named by nothing changes nothing: the whole original is
  // the honest answer, and the caller serves it unharmed.
  assert.equal(
    keepVariant(masterManifest(), BASE, 'https://elsewhere.example/x.m3u8'),
    null,
  );
  assert.equal(keepVariant('<html>no</html>', BASE, VARIANTS[1].url), null);
});

// The adapter test needs the storage room wired to a capture, not to the
// field agent: the voice is recorded, and taken down after the tests so
// the room the tests share is left as it was found. The element is
// enough of the shape the kick needs: a source, a position, a paused
// flag, and a registry of the restore listeners select holds while the
// re-source is in the air.
const listeningVideo = (currentSrc) => {
  const listeners = {};
  return {
    listeners,
    video: {
      currentSrc,
      src: '',
      currentTime: 40,
      paused: false,
      addEventListener: (name, handler) => {
        (listeners[name] ??= []).push(handler);
      },
      removeEventListener: (name, handler) => {
        const list = listeners[name] ?? [];
        const at = list.indexOf(handler);
        if (at >= 0) list.splice(at, 1);
      },
      load: () => {
        listeners.loaded = (listeners.loaded ?? 0) + 1;
      },
      play: () => Promise.resolve(),
    },
  };
};
test('the stream’s own ladder answers where no object was found', () => {
  const spoken = [];
  voiceLadder((id) => spoken.push(id));
  try {
    hearLadder(BASE, VARIANTS);
    const { video, listeners } = listeningVideo(BASE);
    const adapter = createLadderAdapter(video);
    assert.notEqual(adapter, null);
    assert.equal(adapter.name, 'stream');
    assert.equal(adapter.hasAuto, true);
    // Best first, the chips' order; a rung with no resolution is named
    // by its bitrate in kilobits, the words a manifest speaks.
    assert.deepEqual(adapter.list(), [
      { id: '1', label: '1080p' },
      { id: '0', label: '720p' },
      { id: '2', label: '500k' },
    ]);
    // The current rung is honestly unknown — the player below is a box
    // the house cannot ask what it chose.
    assert.equal(adapter.current(), null);
    assert.equal(adapter.diagnose(), '3 variants on the master');

    // A rung pinned is spoken up as the variant's index — and the element
    // is kicked to re-source, because the pin lands at the next master
    // ask and a closed-over player never re-asks on its own.
    assert.equal(adapter.select('2'), true);
    assert.deepEqual(spoken, ['2']);
    assert.equal(listeners.loaded, 1);
    // The restore listeners are standing while the re-source is in the
    // air; the metadata landing carries the position and the playing
    // state across, the same bargain the <source> adapter strikes.
    assert.equal(listeners.loadedmetadata.length, 1);
    assert.equal(listeners.error.length, 1);
    video.currentTime = 10;
    listeners.loadedmetadata[0]({ type: 'loadedmetadata' });
    assert.equal(video.currentTime, 40);
    assert.equal(listeners.loadedmetadata.length, 0);
    assert.equal(listeners.error.length, 0);
    // Auto is spoken as the pin lifted — spoken first, then kicked, the
    // pinless master the hub will hand back on the re-ask. A plain
    // element is kicked in place, with no restore machinery to stand.
    assert.equal(adapter.select(AUTO_ID), true);
    assert.deepEqual(spoken, ['2', null]);
    assert.equal(listeners.loaded, 2);
    assert.equal(listeners.loadedmetadata.length, 0);
    assert.equal(listeners.error.length, 0);
    // An id the master never offered is refused, says nothing, kicks
    // nothing, and leaves no restore listener holding the element.
    assert.equal(adapter.select('9'), false);
    assert.deepEqual(spoken, ['2', null]);
    assert.equal(listeners.loaded, 2);
    assert.equal(listeners.loadedmetadata.length, 0);
    assert.equal(listeners.error.length, 0);

    // The meeting is the frame's, not the element's: a stranger's
    // element in a frame whose ladder was heard still meets the
    // ladder — a frame speaks for one film — so a `blob:` element and
    // an unrelated currentSrc both arrive at the same rungs.
    const strangest = createLadderAdapter({
      currentSrc: 'blob:https://site.example/x',
      src: '',
    });
    assert.notEqual(strangest, null);
    assert.equal(strangest.list().length, 3);
  } finally {
    voiceLadder(() => {});
  }
});

test('the meeting runs through the frame’s own crossings, blob and all', () => {
  // The mixer’s habit: the element’s src is a name the player minted,
  // and the master’s own address was spoken only at the ask — which
  // the routing’s door saw. The ladder is met there.
  hearLadder(BASE, VARIANTS);
  hearCrossing(BASE);
  const blobVideo = {
    currentSrc: 'blob:https://site.example/8f61',
    src: 'blob:https://site.example/8f61',
  };
  const adapter = createLadderAdapter(blobVideo);
  assert.notEqual(adapter, null);
  assert.equal(adapter.list().length, 3);

  // A crossing met is met frame-wide: the ring is the one film this
  // document plays, not a per-element registry — the single-film frame
  // is the shape this walk was cut for, and a second element playing
  // the same frame’s film is exactly that, the same film.
});

test('a pin on a closed-over engine replays the frame, note and all', () => {
  // The fixture ground: a sessionStorage stub (the note’s own room) and
  // a setTimeout chip stubbed to capture the scheduled reload instead of
  // paying it — the runner is no frame, and the assert wants to know the
  // reload was *said*, not sit through one. `load` is counted on the
  // element, exactly because the blob path must never call it.
  const bag = new Map();
  const sessionStub = {
    setItem: (key, value) => bag.set(key, value),
    getItem: (key) => (bag.has(key) ? bag.get(key) : null),
    removeItem: (key) => bag.delete(key),
  };
  const ownedSession = Reflect.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage',
  );
  const owedTimers = [];
  const ownTimers = Reflect.getOwnPropertyDescriptor(globalThis, 'setTimeout');
  Reflect.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: sessionStub,
  });
  Reflect.defineProperty(globalThis, 'setTimeout', {
    configurable: true,
    value: (handler) => owedTimers.push(handler),
  });
  try {
    hearLadder(BASE, VARIANTS);
    const video = {
      currentSrc: 'blob:https://site.example/9d02',
      src: '',
      currentTime: 40,
      paused: false,
      load: () => {
        video.loads = (video.loads ?? 0) + 1;
      },
    };
    const spoken = [];
    voiceLadder((rung) => spoken.push(rung));
    const adapter = createLadderAdapter(video);
    assert.notEqual(adapter, null);

    // A pinned rung on a blob element: the pin is spoken, the position
    // is said down into the frame’s own store, a reload is scheduled —
    // and `load()` is never called, for a spent `MediaSource` is what
    // a `load()` would hang the film on.
    assert.equal(adapter.select('2'), true);
    assert.deepEqual(spoken, ['2']);
    assert.equal(video.loads, undefined);
    assert.equal(JSON.parse(bag.get('nocturne:replay')).at, 40);
    assert.equal(owedTimers.length, 1);

    // The scheduled reload, paid: the frame’s own reload, nothing more.
    let reloaded = false;
    const ownLocation = Reflect.getOwnPropertyDescriptor(
      globalThis,
      'location',
    );
    Reflect.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { reload: () => (reloaded = true) },
    });
    try {
      owedTimers.pop()();
      assert.equal(reloaded, true);
    } finally {
      if (ownLocation) {
        Reflect.defineProperty(globalThis, 'location', ownLocation);
      } else {
        Reflect.deleteProperty(globalThis, 'location');
      }
    }

    // The unpin replays the same way — the pinless ladder back on the
    // fresh engine.
    assert.equal(adapter.select(AUTO_ID), true);
    assert.deepEqual(spoken, ['2', null]);
    assert.equal(bag.has('nocturne:replay'), true);
    assert.equal(owedTimers.length, 1);
  } finally {
    voiceLadder(() => {});
    if (owedTimers.length > 0) {
      // Leftover scheduled reloads die before they ever run.
      owedTimers.pop();
    }
    if (ownedSession) {
      Reflect.defineProperty(globalThis, 'sessionStorage', ownedSession);
    } else {
      Reflect.deleteProperty(globalThis, 'sessionStorage');
    }
    if (ownTimers) {
      Reflect.defineProperty(globalThis, 'setTimeout', ownTimers);
    } else {
      Reflect.deleteProperty(globalThis, 'setTimeout');
    }
  }
});
