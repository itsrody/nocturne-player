import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createQuality } from '../../src/content/video/quality.js';
import {
  createSourceAdapter,
  createYouTubeAdapter,
} from '../../src/content/video/qualityadapters.js';

// A player that is asked for a rung, takes it, and then goes back to reporting
// whatever its own auto has drifted to — the shape of the problem the sheet has
// to hide from the viewer.
const driftingPlayer = () => {
  const state = { asked: [] };
  const adapter = {
    name: 'test',
    hasAuto: false,
    list: () => [
      { id: '1080p', label: '1080p' },
      { id: '480p', label: '480p' },
    ],
    current: () => 'Auto',
    select: (id) => {
      state.asked.push(id);
      return true;
    },
  };
  return { state, create: () => adapter };
};

const VIDEO = { videoWidth: 0, videoHeight: 0 };

test('the chip shows the choice, not what the player drifted to', () => {
  const player = driftingPlayer();
  const quality = createQuality(VIDEO, null, [player.create]);
  quality.refresh();
  assert.equal(quality.getCurrent(), 'Auto');
  assert.equal(quality.select('1080p'), true);
  assert.equal(quality.getCurrent(), '1080p');
});

test('the choice survives the ladder being looked up again', () => {
  const player = driftingPlayer();
  const quality = createQuality(VIDEO, null, [player.create]);
  quality.refresh();
  quality.select('480p');
  quality.refresh();
  assert.equal(quality.getCurrent(), '480p');
});

test('a choice the player no longer offers is forgotten', () => {
  let listed = [
    { id: '1080p', label: '1080p' },
    { id: '480p', label: '480p' },
  ];
  const adapter = {
    name: 'test',
    hasAuto: false,
    list: () => listed,
    current: () => 'Auto',
    select: () => true,
  };
  const quality = createQuality(VIDEO, null, [() => adapter]);
  quality.refresh();
  quality.select('1080p');
  listed = [
    { id: '720p', label: '720p' },
    { id: '480p', label: '480p' },
  ];
  quality.refresh();
  assert.equal(quality.getCurrent(), 'Auto');
});

test('a refused choice is not remembered', () => {
  const adapter = {
    name: 'test',
    hasAuto: false,
    list: () => [
      { id: '1080p', label: '1080p' },
      { id: '480p', label: '480p' },
    ],
    current: () => 'Auto',
    select: () => false,
  };
  const quality = createQuality(VIDEO, null, [() => adapter]);
  quality.refresh();
  assert.equal(quality.select('1080p'), false);
  assert.equal(quality.getCurrent(), 'Auto');
});

test('an adapter that throws leaves the sheet with nothing to offer', () => {
  const quality = createQuality(VIDEO, null, [
    () => {
      throw new Error('the page said no');
    },
  ]);
  assert.deepEqual(quality.refresh(), []);
  assert.equal(quality.getCurrent(), null);
  assert.equal(quality.isSwitchable(), false);
});

// A stand-in for the media element that keeps a registry of its listeners,
// so a test can fire an off-ramp by hand and see who is still attached. The
// element is enough of the shape the source adapter reads: two or more
// <source> children, a currentSrc, a position, a paused flag.
const listeningVideo = (sources, currentSrc) => {
  const listeners = {};
  const video = {
    videoWidth: 0,
    videoHeight: 0,
    paused: true,
    currentTime: 10,
    currentSrc,
    querySelectorAll: () => sources,
    addEventListener: (name, handler) => {
      (listeners[name] ??= []).push(handler);
    },
    removeEventListener: (name, handler) => {
      const list = listeners[name] ?? [];
      const at = list.indexOf(handler);
      if (at >= 0) list.splice(at, 1);
    },
    load: () => {},
    play: () => {},
  };
  return { listeners, video };
};

const makeSource = (src) => ({
  src,
  dataset: {},
  getAttribute: () => null,
});

test('a landed switch carries the position across, once', () => {
  const { listeners, video } = listeningVideo(
    [makeSource('a'), makeSource('b')],
    'a',
  );
  const quality = createQuality(video, null, [createSourceAdapter]);
  quality.refresh();
  assert.equal(quality.select('1'), true);

  // Both off-ramps are held while the load is in the air.
  assert.equal(listeners.loadedmetadata.length, 1);
  assert.equal(listeners.error.length, 1);

  const oldTime = video.currentTime;
  video.currentTime = 0;
  video.currentSrc = 'b';
  listeners.loadedmetadata[0]({ type: 'loadedmetadata' });
  assert.equal(video.currentTime, oldTime);

  // And having landed, the listener is gone for good.
  assert.equal(listeners.loadedmetadata.length, 0);
  assert.equal(listeners.error.length, 0);
});

test('a dead switch strands nobody behind it', () => {
  const { listeners, video } = listeningVideo(
    [makeSource('a'), makeSource('b'), makeSource('c')],
    'a',
  );
  const quality = createQuality(video, null, [createSourceAdapter]);
  quality.refresh();
  quality.select('1');

  // The load fails. The restore stands down rather than leaking.
  for (const handler of [...listeners.error]) handler({ type: 'error' });
  assert.equal(listeners.loadedmetadata.length, 0);
  assert.equal(listeners.error.length, 0);

  // ...and a later rung's successful load cannot fire the stale position
  // and playing state of the failed one at it: nothing is listening.
  video.currentTime = 0;
  video.currentSrc = 'c';
  for (const handler of [...listeners.loadedmetadata]) {
    handler({ type: 'loadedmetadata' });
  }
  assert.equal(video.currentTime, 0);
});

const host = (player) => ({
  getAvailableQualityLevels: () => ['hd720', 'hd1080'],
  ...player,
});

test('a player that cannot answer for the rung is not promised', () => {
  // No setters at all: the chip must say the site would not honor it.
  const quality = createQuality(VIDEO, host({}), [createYouTubeAdapter]);
  quality.refresh();
  assert.equal(quality.isSwitchable(), true);
  assert.equal(quality.select('hd1080'), false);
});

test('the page\u2019s own chips speak before the synthesized ones', () => {
  const quality = createQuality(
    VIDEO,
    host({
      setPlaybackQualityRange: () => {},
      setPlaybackQuality: () => {},
      // Shape-checked at the adapter: a rung with an honest string both
      // sides is taken, anything less is ignored and falls through.
      getAvailableQualityData: () => [
        { quality: 'hd1080', qualityLabel: '1080p Premium' },
        { quality: 'hd720', qualityLabel: '720p60' },
        { quality: 'hd1440' },
        'garbage',
        null,
      ],
    }),
    [createYouTubeAdapter],
  );
  quality.refresh();
  const labels = quality.getOptions().map((option) => option.label);
  assert.deepEqual(labels, ['Auto', '720p60', '1080p Premium']);
});

test('a player without a data call keeps the synthesized labels', () => {
  const quality = createQuality(
    VIDEO,
    host({
      setPlaybackQualityRange: () => {},
      setPlaybackQuality: () => {},
    }),
    [createYouTubeAdapter],
  );
  quality.refresh();
  const labels = quality.getOptions().map((option) => option.label);
  assert.deepEqual(labels, ['Auto', '720p', '1080p']);
});
