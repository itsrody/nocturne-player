import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  createVideoWatcher,
  isPlayable,
  pickPrimary,
} from '../../src/content/detect.js';

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
  delete globalThis.document;
  delete globalThis.NodeFilter;
};

// A landscape film at the page’s origin: `left`/`top` seat it relative to
// the seeded viewport, which clamps its visible area at `detect.js`. The
// gate’s visibility reading is the element’s own `checkVisibility`, so the
// stub answers what a plainly rendered film would. The film also keeps
// its own arms: an element listener offers its hand where a document
// capture listener once heard every media event in the page at once.
const film = (left, top, width, height) => ({
  isConnected: true,
  shadowRoot: null,
  localName: 'video',
  videoWidth: width,
  videoHeight: height,
  readyState: 4,
  currentSrc: 'https://film.example/master.m3u8',
  checkVisibility: () => true,
  getBoundingClientRect: () => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
  }),
  hands: {},
  armings: [],
  disarmings: [],
  addEventListener(type, handler) {
    this.hands[type] = handler;
    this.armings.push(type);
  },
  removeEventListener(type) {
    this.disarmings.push(type);
  },
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
  // One playable film is the page’s film at any share: a watch page’s
  // masthead, sidebar and the room below it leave the film the reason the
  // page stands, and the rival arithmetic — the share law’s home — has no
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

test('a film the page has blinded is refused at the gate', () => {
  // The refusal is not the element’s own styles alone: one checkVisibility
  // reading walks the ancestors, and a container opacity-zeroed or a layout
  // collapsed around the film refuses it without the element knowing.
  const blinded = film(0, 0, VIEW.width, VIEW.height);
  blinded.checkVisibility = () => false;
  assert.equal(isPlayable(blinded), false);
});

test('a portrait refusal needs dimensions for its verdict', () => {
  const fresh = film(0, 0, VIEW.width, VIEW.height);
  fresh.videoWidth = 0;
  fresh.videoHeight = 0;
  assert.equal(isPlayable(fresh), true);
});

// A realm trimmed to the wire the arm is hung on: a document step-served
// by a walker (the sweep’s whole-document walk, fresh every sweep, the
// way a real document re-finds what it still holds), the manager’s three
// verbs recorded, and the port’s words captured whole. The document is
// honest about what it does not have — there is no addEventListener on
// it at all, so an arm reaching for a document-wide hearing fails loudly.
const makeWire = (films) => {
  globalThis.NodeFilter = { SHOW_ELEMENT: 1 };
  globalThis.document = {
    hidden: false,
    createTreeWalker: () => {
      const rest = films.slice();
      return {
        nextNode: () => rest.shift() ?? null,
      };
    },
  };
  const ears = [];
  const wire = {
    ears,
    asks: [],
    watches: [],
    said: [],
    dom: {
      onMove: (listener) => {
        ears.push(listener);
        return () => {};
      },
      ask: () => {
        wire.asks.push('escape');
      },
      keepNear: (video) => {
        wire.watches.push(video);
      },
    },
    up: {
      postMessage: (word) => {
        wire.said.push(word);
      },
    },
    sweep: () => {
      for (const listener of [...ears]) listener();
    },
  };
  return wire;
};

test('a film the walk meets is armed on itself, not on the page', () => {
  const main = film(0, 0, 700, 500);
  const wire = makeWire([main]);
  const allow = () => true;
  const watcher = createVideoWatcher(wire.dom, wire.up, () => allow());
  const settled = [];
  watcher.news.on((primary) => settled.push(primary));

  watcher.start();

  assert.deepEqual(main.armings, ['play', 'pause', 'loadedmetadata']);
  assert.deepEqual(wire.watches, [main], 'the approach watch rode along');
  assert.deepEqual(settled, [main], 'the first answer was not waited out');
  assert.deepEqual(wire.said, [], 'the word waits for the frame’s era');

  // The film’s own moment asks the manager — and the document has no
  // capture hearing to ask at all.
  main.hands.play();
  assert.deepEqual(wire.asks, ['escape']);
});

test('the word said carries the count and the want read fresh', () => {
  const main = film(0, 0, 700, 500);
  const wire = makeWire([main]);
  let allow = () => true;
  const watcher = createVideoWatcher(wire.dom, wire.up, () => allow());

  watcher.start();
  watcher.report();
  assert.equal(wire.said[0].want, true);
  assert.equal(wire.said[0].count, 1);

  // A want copied once would have gone stale: the same word asked again
  // after the frame’s mind changed answers differently.
  allow = () => false;
  watcher.report();
  assert.equal(wire.said[1].want, false);
  assert.equal(wire.said[1].count, 1);
});

test('a count the book already carries is not said again', () => {
  const main = film(0, 0, 700, 500);
  const wire = makeWire([main]);
  const watcher = createVideoWatcher(wire.dom, wire.up, () => true);
  const settled = [];
  watcher.news.on((primary) => settled.push(primary));

  watcher.start();
  wire.sweep();
  assert.deepEqual(
    settled,
    [main],
    'a sweep that settles nothing is no news and no era',
  );
  assert.equal(
    main.armings.length,
    3,
    'the film met again is one film armed, not re-armed',
  );
});

test('a refused film keeps its arms until the page forgets it', () => {
  // A film with no metadata is refused — and rightly still armed, because
  // the metadata landing inside it is exactly the moment it becomes
  // playable. The forgetting is the arms' only payback.
  const late = film(0, 0, 700, 500);
  late.readyState = 0;
  late.currentSrc = '';
  const wire = makeWire([late]);
  const watcher = createVideoWatcher(wire.dom, wire.up, () => true);
  const settled = [];
  watcher.news.on((primary) => settled.push(primary));

  watcher.start();
  assert.deepEqual(late.armings, ['play', 'pause', 'loadedmetadata']);
  assert.deepEqual(settled, []);
  assert.equal(watcher.getCount(), 0);

  late.hands.loadedmetadata();
  late.readyState = 4;
  late.armings.length = 0;
  wire.sweep();
  assert.deepEqual(late.armings, [], 'met again is one film armed, not two');
  assert.deepEqual(settled, [late], 'the film’s own words brought it in');
  assert.equal(watcher.getCount(), 1);

  // The page lets the film go: the arms are paid back on the same beat
  // that drops the film from the ledger, and the word out of the frame
  // says the zero plainly — silence would let the book carry a ghost.
  late.isConnected = false;
  wire.sweep();
  assert.deepEqual(late.disarmings, ['play', 'pause', 'loadedmetadata']);
  assert.equal(watcher.getCount(), 0);
  assert.equal(watcher.getPrimary(), null);
  watcher.report();
  assert.equal(wire.said[0].count, 0);
  assert.equal(wire.said[0].want, false, 'no film in hand, no want');
});

test('the watch’s knock asks for a sweep only while it stands', () => {
  const main = film(0, 0, 700, 500);
  const wire = makeWire([main]);
  const watcher = createVideoWatcher(wire.dom, wire.up, () => true);
  watcher.start();

  watcher.poke();
  assert.equal(wire.asks.length, 1, 'the network’s knock opened one ask');

  watcher.stop();
  assert.deepEqual(wire.said, [], 'standing down does not speak for itself');
  watcher.poke();
  assert.equal(
    wire.asks.length,
    1,
    'a film the site has switched off is not owed the walk',
  );
  assert.deepEqual(
    main.disarmings,
    ['play', 'pause', 'loadedmetadata'],
    'stopping pays every arm back',
  );
});

test('the repair arm is asked before the judgement', () => {
  // A page with its own small film and one being fed: the fed film is
  // the bigger, so the beat after the metadata lands elects it.
  const main = film(0, 0, 300, 160);
  // An element the element itself gave up on: the error is not the
  // sweep’s refusal — it is exactly the stream a feeder might be able
  // to answer for — but a film being fed is eroded until the metadata
  // lands, so the judgement that would take it now refuses it now.
  const eroded = film(0, 0, 700, 500);
  eroded.error = { code: 4 };
  eroded.readyState = 0;
  eroded.currentSrc = '';
  const wire = makeWire([main, eroded]);
  const asked = [];
  const repair = (video) => asked.push(video);
  const watcher = createVideoWatcher(wire.dom, wire.up, () => true, repair);

  watcher.start();
  assert.deepEqual(
    asked,
    [main, eroded],
    'both films, in the order the walk met them',
  );
  assert.equal(watcher.getCount(), 1, 'the eroded film is refused for now');

  // The feeder made the metadata land: the film is elected on the next
  // beat like any film the walk has just met — with no special word for
  // the way its bytes are being carried.
  eroded.readyState = 4;
  eroded.currentSrc = 'blob:https://site.example/fed';
  wire.sweep();
  assert.equal(watcher.getCount(), 2);
  assert.equal(watcher.getPrimary(), eroded);

  // And a watcher made without the arm judges as it always did: the
  // feeder is nobody’s business but its caller’s.
  const plainWire = makeWire([main]);
  const plain = createVideoWatcher(plainWire.dom, plainWire.up, () => true);
  plain.start();
  assert.equal(plain.getCount(), 1);
});
