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
  assert.ok(reworded.includes('1080.m3u8'));
  // The unchosen pairs are out entire — tag and playlist line alike,
  // in either direction the manifest happened to list them in.
  assert.equal(
    reworded.some((line) => line.includes('BANDWIDTH=1000000')),
    false,
  );
  assert.equal(reworded.includes('720.m3u8'), false);
  assert.equal(reworded.includes('360.m3u8'), false);
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
// the room the tests share is left as it was found.
test('the stream’s own ladder answers where no object was found', () => {
  const spoken = [];
  voiceLadder((id) => spoken.push(id));
  try {
    hearLadder(BASE, VARIANTS);
    const video = { currentSrc: BASE, src: '' };
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

    // A rung pinned is spoken up as the variant's index; auto is spoken
    // as the pin lifted.
    assert.equal(adapter.select('2'), true);
    assert.deepEqual(spoken, ['2']);
    assert.equal(adapter.select(AUTO_ID), true);
    assert.deepEqual(spoken, ['2', null]);
    // An id the master never offered is refused, and says nothing.
    assert.equal(adapter.select('9'), false);
    assert.deepEqual(spoken, ['2', null]);

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
