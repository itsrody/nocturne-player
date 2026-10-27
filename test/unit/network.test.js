import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createWireTap,
  isMediaShaped,
  sayEngineShape,
} from '../../src/background/network.js';
// The eye’s side of the stub browser: the one listener it registers, kept
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
  // is named by the query’s own marks.
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

test('the crossing names the family the manifest speaks for', () => {
  // The manifest formats speak in the sweep’s own words: hls for the
  // m3u8 family, dash for a mpeg-dash manifest, mss for the
  // smooth-streaming one — a format word, not a promise.
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/master.m3u8?v=2'),
    'hls',
  );
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/a.m3u'),
    'hls',
  );
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/manifest.mpd'),
    'dash',
  );
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/manifest.isml'),
    'mss',
  );
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/apple?format=m3u8'),
    'hls',
    'the query’s mark names the family the extension hid',
  );
});

test('a crossing that names no family is honestly nameless', () => {
  // A segment file is a format both libraries speak, an element’s own
  // load is no script’s act, and a plain video url on the fetch family
  // is a page buffering it itself — none of them say which engine.
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/chunk1.ts'),
    null,
  );
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/seg-4.m4s'),
    null,
  );
  assert.equal(
    sayEngineShape('media', 'https://cdn.example/master.m3u8'),
    null,
    'the element’s own load names no engine',
  );
  assert.equal(
    sayEngineShape('xmlhttprequest', 'https://cdn.example/api?mime=video/mp4'),
    null,
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
  createWireTap(browser, (tabId, frameId, earPiece) =>
    strained.push({ tabId, frameId, ...earPiece }),
  );

  browser.taps[0].listener({
    tabId: 7,
    frameId: 2,
    type: 'xmlhttprequest',
    url: 'https://cdn.example/master.m3u8',
    documentUrl: 'https://site.example/watch',
    frameAncestors: ['https://site.example/'],
  });
  // The ear rides with the name: where the bytes came from, what spoke
  // for them, the document that owns the frame, and every origin above
  // it — the dossier’s raw material, straight from the platform.
  assert.deepEqual(strained, [
    {
      tabId: 7,
      frameId: 2,
      url: 'https://cdn.example/master.m3u8',
      resource: 'xmlhttprequest',
      doc: 'https://site.example/watch',
      chain: ['https://site.example/'],
      // The family the crossing names rides the ear too: the sweep’s
      // narrowing begins at the bus.
      shape: 'hls',
    },
  ]);

  // A frameless room on the envelope is named as best the wire allows:
  // no documentUrl, no chain — the fields stay undefined and empty, and
  // the context is honestly none.
  browser.taps[0].listener({
    tabId: 9,
    frameId: 0,
    type: 'media',
    url: 'https://cdn.example/hero.mp4',
  });
  assert.deepEqual(strained[1], {
    tabId: 9,
    frameId: 0,
    url: 'https://cdn.example/hero.mp4',
    resource: 'media',
    doc: undefined,
    chain: [],
    // The element’s own load is a browser act: no family is named.
    shape: null,
  });

  // Nobody’s request — the browser’s own housekeeping — names no frame.
  browser.taps[0].listener({
    tabId: -1,
    frameId: 0,
    type: 'media',
    url: 'https://elsewhere.example/a.mp4',
  });
  assert.equal(strained.length, 2);
});

test('a stand-in room with no webRequest stands nothing', () => {
  const strained = [];
  // No throwing, no listener: a window without the permission is wired
  // to exactly nothing.

  createWireTap({}, (tabId, frameId) => strained.push({ tabId, frameId }));
  assert.deepEqual(strained, []);
});
