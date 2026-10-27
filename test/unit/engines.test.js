import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  findEngines,
  hasPlayerjs,
  isHlsEngine,
} from '../../src/content/video/engines.js';
import { call, probe } from '../../src/content/video/pageapi.js';

const afterEachStubs = [];

beforeEach(() => {
  afterEachStubs.length = 0;
});

afterEach(() => {
  for (const drop of afterEachStubs) drop();
  afterEachStubs.length = 0;
});

// The sweep answers to a window the test hands it: `pageapi` reads
// `window.wrappedJSObject ?? window`, and the stub has no waiver to offer,
// so the plain object stands in for the page's globals. An engine is what
// the shapes ask for: a ladder and a number beside it.
const installWindow = (values) => {
  globalThis.window = values;
  afterEachStubs.push(() => delete globalThis.window);
};

const hlsEngine = () => ({ levels: [1, 2, 3], currentLevel: 0 });

test('a page that has not said Playerjs owes the sweep no calls', () => {
  const asked = [];
  installWindow({
    stranger: {
      api: (name) => {
        asked.push(name);
        return 'not-playerjs';
      },
    },
  });

  const found = findEngines({});
  assert.equal(found.playerjs, undefined);
  assert.deepEqual(asked, []);
});

test('a page that said Playerjs may be asked for the id', () => {
  const asked = [];
  const stranger = {
    api: (name) => {
      asked.push(name);
      return undefined;
    },
  };
  installWindow({ Playerjs: () => {}, stranger });

  const found = findEngines({});
  // The shape still says no — a call with nothing to point at answers
  // nothing — but the question was, at least, allowed.
  assert.equal(found.playerjs, undefined);
  assert.deepEqual(asked, ['id']);
});

test('the page\u2019s word is what hasPlayerjs reads', () => {
  installWindow({ Playerjs: () => {} });
  assert.equal(hasPlayerjs(), true);

  installWindow({ Playerjs: {} });
  assert.equal(hasPlayerjs(), false);
});

test('an engine on the element arrives by its attached name', () => {
  installWindow({});
  const video = { wrappedJSObject: { __hls: hlsEngine() } };
  const found = findEngines(video);

  assert.ok(isHlsEngine(found.hls));
});

test('an engine on the named player object arrives off the host', () => {
  installWindow({});
  const host = { wrappedJSObject: { hlsPlayer: hlsEngine() } };
  const found = findEngines({}, host);

  assert.ok(isHlsEngine(found.hls));
});

test('an element\u2019s own engine outranks the host\u2019s furniture', () => {
  installWindow({});
  const first = hlsEngine();
  const second = hlsEngine();
  const video = { wrappedJSObject: { hls: first } };
  const host = { wrappedJSObject: { hls: second } };
  const found = findEngines(video, host);

  assert.equal(found.hls, first);
});

test('a throwing identification is no console noise', () => {
  let warned = 0;
  const keepWarn = console.warn;
  console.warn = () => {
    warned += 1;
  };
  afterEachStubs.push(() => {
    console.warn = keepWarn;
  });

  // A method that raises on the question is an answer too; unlike a real
  // order to a site's player, the sweep says so without a warning.
  assert.equal(
    probe(
      {
        api: () => {
          throw new Error('no');
        },
      },
      'api',
      'id',
    ),
    null,
  );
  assert.equal(warned, 0);

  // A command to a site's player keeps its witness — the warn is how a
  // sheet that came back empty explains itself.
  assert.equal(
    call(
      {
        api: () => {
          throw new Error('no');
        },
      },
      'api',
    ),
    null,
  );
  assert.equal(warned, 1);
});
