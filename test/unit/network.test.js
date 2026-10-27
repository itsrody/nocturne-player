import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createWireTap, isMediaShaped } from '../../src/background/network.js';
// The eye's side of the stub browser: the one listener it registers, kept
// to be fired by hand with the details the platform would hand over, and
// the filter and spec recorded beside it — the shape of the listener is
// itself the story told here.
const makeBrowser = () => {
  const taps = [];
  return {
    taps,
    webRequest: {
      onBeforeRequest: {
        addListener: (listener, filter, spec) =>
          taps.push({ listener, filter, spec }),
      },
    },
  };
};

test('an element’s own request needs no URL to speak for it', () => {
  assert.equal(isMediaShaped('media', 'https://cdn.example/x'), true);
  assert.equal(isMediaShaped('media', ''), true, 'media is its own word');
});

test('the streaming libraries’ words are shaped into the corpus', () => {
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/master.m3u8?v=2'),
    true,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/manifest.mpd'),
    true,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/seg-4.m4s'),
    true,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/chunk1.ts'),
    true,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/film.webm'),
    true,
  );
  // A segment whose uniform resource locator carries no extension at all
  // is named by the query's own marks.
  assert.equal(
    isMediaShaped(
      'xmlhttprequest',
      'https://r1---sn.example/videoplayback?p=luck&dur=39.4&c=WEB',
    ),
    true,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/api?mime=video/mp4'),
    true,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/apple?format=m3u8'),
    true,
  );
});

test('the pages’ ordinary chatter is no film’s word', () => {
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://api.example/v1/movies.json'),
    false,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/app.js'),
    false,
  );
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://cdn.example/page.css'),
    false,
  );
  // A path with no extension and no query whose name merely visits.
  assert.equal(
    isMediaShaped('xmlhttprequest', 'https://open.wikipedia/talks'),
    false,
  );
});

test('the types the filter never admits are turned away', () => {
  assert.equal(isMediaShaped('image', 'https://cdn.example/film.mp4'), false);
  assert.equal(
    isMediaShaped('script', 'https://cdn.example/player.m3u8'),
    false,
  );
  assert.equal(
    isMediaShaped('speculative', 'https://cdn.example/a.m3u8'),
    false,
  );
});

test('the tap stands exactly one listener, aimed and unblocking', () => {
  const browser = makeBrowser();
  createWireTap(browser, () => undefined);
  createWireTap(browser, () => undefined);

  assert.equal(browser.taps.length, 2);
  const { filter, spec } = browser.taps[0];
  assert.deepEqual(filter, {
    urls: ['<all_urls>'],
    types: ['media', 'xmlhttprequest'],
  });
  assert.equal(spec, undefined, 'the tap never answers, so never blocks');
});

test('the tap names the frame a media request crossed', () => {
  const browser = makeBrowser();
  const strained = [];
  createWireTap(browser, (tabId, frameId) => strained.push({ tabId, frameId }));

  browser.taps[0].listener({
    tabId: 7,
    frameId: 2,
    type: 'xmlhttprequest',
    url: 'https://cdn.example/master.m3u8',
  });
  assert.deepEqual(strained, [{ tabId: 7, frameId: 2 }]);

  // Nobody's request — the browser's own housekeeping — names no frame.
  browser.taps[0].listener({
    tabId: -1,
    frameId: 0,
    type: 'media',
    url: 'https://elsewhere.example/a.mp4',
  });
  assert.equal(strained.length, 1);
});

test('a stand-in room with no webRequest stands nothing', () => {
  const strained = [];
  // No throwing, no listener: a window without the permission is wired
  // to exactly nothing.

  createWireTap({}, (tabId, frameId) => strained.push({ tabId, frameId }));
  assert.deepEqual(strained, []);
});
