import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  findEngines,
  hasPlayerjs,
  isHlsEngine,
  isVideojsPlayer,
  warmEngines,
} from '../../src/content/video/engines.js';
import {
  call,
  findGlobalMatches,
  probe,
} from '../../src/content/video/pageapi.js';

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
// so the plain object stands in for the page’s globals. An engine is what
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

test('a handle hanging on the film\u2019s wrapper is found too', () => {
  installWindow({});
  const engine = hlsEngine();
  const wrapper = { wrappedJSObject: { hls: engine } };
  const video = { wrappedJSObject: {}, parentElement: wrapper };

  const found = findEngines(video);
  assert.equal(found.hls, engine);
});

test('a name nobody owns is still a handle, once the shape says so', () => {
  installWindow({});
  const engine = hlsEngine();
  const video = { wrappedJSObject: { playerInstance: engine } };

  const found = findEngines(video);
  assert.equal(found.hls, engine);
});

test('a video.js player arrives from the constructor\u2019s registry', () => {
  const player = {
    qualityLevels: () => [],
    tech: () => ({}),
  };
  installWindow({ videojs: { players: { mainPlayer: player } } });

  const found = findEngines({});
  assert.equal(found.videojs, player);
});

test('a video.js lookalike without the technology is not believed', () => {
  installWindow({
    noTech: {
      qualityLevels: () => [],
    },
    noList: {
      tech: () => ({}),
    },
  });

  const found = findEngines({});
  assert.equal(found.videojs, undefined);
});

test('a page too big for the sweep says where it stopped', () => {
  const globals = {};
  for (let index = 0; index < 2100; index++) {
    globals[`stranger${index}`] = { junk: index };
  }
  installWindow(globals);

  const cuts = [];
  const found = findGlobalMatches(
    [{ name: 'hls', matches: isHlsEngine }],
    (total) => cuts.push(total),
  );
  assert.deepEqual(cuts, [2100], 'the cut names the page\u2019s size');
  assert.deepEqual(found, {});
});

test('a video.js ladder is the shape the matcher asks for', () => {
  assert.equal(
    isVideojsPlayer({ qualityLevels: () => [], tech: () => {} }),
    true,
  );
  assert.equal(isVideojsPlayer({ qualityLevels: () => [] }), false);
  assert.equal(isVideojsPlayer({ tech: () => {} }), false);
  assert.equal(isVideojsPlayer(null), false);
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
  // order to a site’s player, the sweep says so without a warning.
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

  // A command to a site’s player keeps its witness — the warn is how a
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

// The manager’s arm at the page’s quiet, in a stub realm: the ease is
// called and fired by hand, the count of moves is moved by hand, and
// the word for Playerjs is whatever window says. The stop word is
// carried to the test’s own teardown, so a failed assertion leaves no
// warm answer behind for the next page.
const makeQuiet = () => {
  let turn = 0;
  let resting = null;
  return {
    turn: () => turn,
    atEase: (work) => {
      resting = work;
      return () => {
        resting = null;
      };
    },
    // The quiet hour comes.
    rest: () => {
      const work = resting;
      resting = null;
      work();
    },
    move: () => {
      turn += 1;
    },
  };
};

const askQuietly = () => {
  const quiet = makeQuiet();
  const stop = warmEngines(quiet);
  afterEachStubs.push(stop);
  return quiet;
};

test('the sheet opens on an answer the page’s quiet already made', () => {
  const engine = hlsEngine();
  installWindow({ attachedEngine: engine });
  const quiet = askQuietly();
  quiet.rest();

  // The read of the page’s answer is the warm answer — proof given by a
  // page that now has nothing on it: the consult does not sweep, it
  // keeps the answer the quiet made.
  installWindow({});
  const found = findEngines({});
  assert.equal(found.hls, engine);
});

test('a page that moved on since is answered fresh, never from memory', () => {
  const engine = hlsEngine();
  installWindow({ attachedEngine: engine });
  const quiet = askQuietly();
  quiet.rest();

  quiet.move();
  installWindow({});
  assert.equal(findEngines({}).hls, undefined, 'the move made the page new');

  // The fresh sweep re-stamps: the next open on the quiet page reads it.
  installWindow({ attachedEngine: engine });
  const again = findEngines({});
  assert.equal(again.hls, engine);
  quiet.move();
  const something = {};
  installWindow({ attachedEngine: something });
  assert.equal(findEngines({}).hls, undefined, 'the count is the stamp');
});

test('the page’s word for Playerjs is part of the stamp', () => {
  // The page has engines but has said nothing of Playerjs, so the warm
  // answer is an answer of the no-Playerjs matcher set.
  const engine = hlsEngine();
  installWindow({ attachedEngine: engine });
  const quiet = askQuietly();
  quiet.rest();

  // The page gains its word without a move: the gate decides the
  // matcher set, so the consult must not answer from the old word’s
  // answer — the fresh ask carries the Playerjs matcher and finds the
  // page’s own api-bearing object.
  const playerjsEngine = { api: () => 'the-film' };
  installWindow({ Playerjs: () => {}, thePlayer: playerjsEngine });
  const found = findEngines({});
  assert.equal(found.playerjs, playerjsEngine, 'the new word made it new');
  assert.equal(found.hls, undefined, 'the old word’s answer is not kept');
});
