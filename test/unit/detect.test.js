import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { isPlayable, pickPrimary } from '../../src/content/detect.js';

const VIEW = { width: 800, height: 600 };

const stubRealm = () => {
  globalThis.window = { innerWidth: VIEW.width, innerHeight: VIEW.height };
  globalThis.getComputedStyle = () => ({
    visibility: 'visible',
    display: 'block',
    opacity: '1',
  });
};

const clearRealm = () => {
  delete globalThis.window;
  delete globalThis.getComputedStyle;
};

// A landscape film at the page's origin: `left`/`top` seat it relative to
// the seeded viewport, which clamps its visible area at `detect.js`.
const film = (left, top, width, height) => ({
  isConnected: true,
  videoWidth: width,
  videoHeight: height,
  readyState: 4,
  currentSrc: 'https://film.example/master.m3u8',
  getBoundingClientRect: () => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
  }),
});

beforeEach(stubRealm);
afterEach(clearRealm);

test('a film that owns the screen wins without a rival', () => {
  const main = film(0, 0, 700, 500);
  assert.equal(pickPrimary([main]), main);
});

test('a main film beats a row of previews', () => {
  const main = film(0, 0, VIEW.width, 400);
  const previews = [
    film(0, 0, 300, 160),
    film(0, 0, 300, 160),
    film(0, 0, 300, 160),
  ];
  assert.equal(pickPrimary([main, ...previews]), main);
});

test('an over-dominance runner-up costs the page its film', () => {
  const first = film(0, 0, 500, 400);
  const second = film(0, 0, 480, 380);
  assert.equal(pickPrimary([first, second]), null);
});

test('a lone film under half the screen is still the page’s film', () => {
  // One playable film is the page's film at any share: a watch page's
  // masthead, sidebar and the room below it leave the film the reason the
  // page stands, and the rival arithmetic — the share law's home — has no
  // rival to speak among.
  const small = film(0, 0, 400, 300);
  assert.equal(pickPrimary([small]), small);
});

test('with rivals, a best under half the screen is no main film', () => {
  // The share law lives among rivals: two to one over the runner-up but
  // still a quarter of the screen is a row that leads, not a page that
  // belongs to one film.
  const leading = film(0, 0, 400, 300);
  const trailing = film(0, 0, 300, 160);
  assert.equal(pickPrimary([leading, trailing]), null);
});

test('a two-film tie elects nothing', () => {
  const first = film(0, 0, 500, 350);
  const second = film(0, 0, 500, 350);
  assert.equal(pickPrimary([first, second]), null);
});

test('a portrait film is refused at the gate', () => {
  const clip = film(0, 0, VIEW.width, VIEW.height);
  clip.videoWidth = 720;
  clip.videoHeight = 1280;
  assert.equal(isPlayable(clip), false);
});

test('a portrait refusal needs dimensions for its verdict', () => {
  const fresh = film(0, 0, VIEW.width, VIEW.height);
  fresh.videoWidth = 0;
  fresh.videoHeight = 0;
  assert.equal(isPlayable(fresh), true);
});
