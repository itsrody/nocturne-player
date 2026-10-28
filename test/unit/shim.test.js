// The shim, driven. The fake page realm — a `window` whose `wrappedJSObject`
// the pageapi’s own helper reads, X-ray stubs standing for exportFunction
// and cloneInto, and a page whose `fetch` binding and XML HTTP brand are
// plain objects the shim can be laid on — is where every path of the
// routing arglies itself: held ask, miss, refusal, the brand’s own door,
// the abort, and the disarm that restores the natives whole.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asRouteAsk, sayRouteBytes } from '../../src/lib/protocol.js';
import { createRoute } from '../../src/content/video/route.js';

// --- The fake page realm. ---

// exportFunction, as the machinery sees it: the function crosses whole
// (Node has no compartments to speak of), with the last call recorded.
const exportsSeen = [];
globalThis.exportFunction = (fn) => {
  exportsSeen.push(fn);
  return fn;
};
globalThis.cloneInto = (value) => value;

// A fake port: words up recorded, replies handed straight into the
// listener the shim stood at its birth — the same synchronous shape
// the hub’s own tests hold, missing only the task loop.
const makeUp = () => {
  const listeners = [];
  const spoken = [];
  return {
    spoken,
    onMessage: { addListener: (fn) => listeners.push(fn) },
    postMessage: (word) => spoken.push(word),
    // The hub’s answer, said by hand.
    answer: (word) => {
      for (const listener of [...listeners]) listener(word);
    },
  };
};

// The last said routed ask, parsed by the word’s own guard — the reply
// always comes back through that door in the tests.
const lastAsk = (up) => asRouteAsk(up.spoken.at(-1));

const makePage = (options = {}) => {
  const nativeCalls = [];
  const native = (input, init) => {
    nativeCalls.push({ input, init });
    return 'NATIVE';
  };

  // The brand, as a page would have it — a plain constructor whose
  // prototype the shim borrows from (a class’s own prototype refuses to
  // be replaced, and the stand-in test needs exactly that replacement).
  class FakeHeaders {
    constructor(entries) {
      this.pairs = Object.entries(entries ?? {});
    }
    get(name) {
      const found = this.pairs.find(
        ([one]) => one.toLowerCase() === String(name).toLowerCase(),
      );
      return found?.[1] ?? null;
    }
  }
  class FakeResponse {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status;
      this.headers = init?.headers;
    }
  }
  class FakeEvent {
    constructor(type) {
      this.type = type;
    }
  }
  const FakeXHR = function () {
    this.responseType = options.responseType ?? '';
  };
  FakeXHR.prototype.open = function (method, url) {
    this.openedMethod = method;
    this.openedUrl = url;
  };
  FakeXHR.prototype.setRequestHeader = function (name, value) {
    const prior = this.written ?? [];
    this.written = [...prior, { name, value }];
  };
  FakeXHR.prototype.send = function (...handed) {
    const prior = this.nativeSends ?? [];
    this.nativeSends = [...prior, ...handed];
  };
  FakeXHR.prototype.abort = function () {
    const prior = this.abortedNatively ?? [];
    this.abortedNatively = [...prior, true];
  };
  FakeXHR.prototype.dispatchEvent = function (event) {
    const prior = this.dispatched ?? [];
    this.dispatched = [...prior, event.type];
    return true;
  };

  const page = {
    fetch: native,
    Response: FakeResponse,
    Headers: FakeHeaders,
    Event: FakeEvent,
    XMLHttpRequest: options.noBrand ? undefined : FakeXHR,
  };
  if (options.brandMissingMethods === true) {
    // A brand the room cannot borrow from (the stand-in shape): no
    // prototype methods at all.
    FakeXHR.prototype = {};
  }
  if (options.brandFrozenLayout === true) {
    // A brand whose shape refuses to have its words redefined.
    Object.freeze(FakeXHR.prototype);
  }
  if (options.frozenFetch === true) {
    // A window whose ask door refuses to have the shim laid on it.
    Object.defineProperty(globalThis.window, 'wrappedJSObject', {
      value: new Proxy(page, {
        set: (target, name, value) => {
          if (name === 'fetch') return false;
          target[name] = value;
          return true;
        },
      }),
    });
  } else {
    globalThis.window = { wrappedJSObject: page };
    globalThis.page = page;
  }
  page.nativeCalls = nativeCalls;
  return page;
};

// The tests’ own nearly-page: window is none, standing for nothing.
const standDown = () => {
  delete globalThis.window;
  delete globalThis.page;
};

test('the held ask is carried in the page’s own shapes', async () => {
  const page = makePage();
  const up = makeUp();
  const route = createRoute(up);
  route.arm();

  const held = page.fetch('https://cdn.example/video.ts');
  const ask = lastAsk(up);
  assert.equal(ask.url, 'https://cdn.example/video.ts');
  assert.equal(ask.method, 'GET');
  assert.deepEqual(ask.heads, [], 'no init, no carried words');

  // The hub’s answer, said by hand: bytes for the ask the shim said.
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(4)),
  );
  const response = await held;
  assert.ok(response instanceof page.Response, 'the page’s own Response');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'video/mp2t');
  assert.equal(response.body.byteLength, 4);
  // The native ask was never owed.
  assert.equal(page.nativeCalls.length, 0);
  standDown();
});

test('a miss speaks the page’s own ask, whole', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  const asked = page.fetch('https://cdn.example/video.ts', {
    headers: { range: 'bytes=0-' },
  });
  const ask = lastAsk(up);
  assert.deepEqual(ask.heads, [{ name: 'range', value: 'bytes=0-' }]);
  up.answer(sayRouteBytes(ask.id, ask.url, 0, null, null));

  const answered = await asked;
  assert.equal(answered, 'NATIVE', 'the native ask took it');
  assert.deepEqual(page.nativeCalls, [
    {
      input: 'https://cdn.example/video.ts',
      init: { headers: { range: 'bytes=0-' } },
    },
  ]);
  standDown();
});

test('a non-media ask is the page’s own, before the port is owed', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  assert.equal(await page.fetch('https://site.example/page.html'), 'NATIVE');
  assert.equal(up.spoken.length, 0, 'no routed ask was said');
  // A POST is nobody’s routed ask either, whatever it carries.
  assert.equal(
    await page.fetch('https://cdn.example/video.ts', { method: 'POST' }),
    'NATIVE',
  );
  assert.equal(up.spoken.length, 0, 'still no routed ask');
  standDown();
});

test('the brand’s door: spoken, laid, answered on the instance', async () => {
  const page = makePage();
  const up = makeUp();
  const route = createRoute(up);
  route.arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.setRequestHeader('Range', 'bytes=0-');
  instance.setRequestHeader('Cookie', 'a=1');
  instance.send();

  // The routed ask said to the hub: the URL seen, only the carried name rode.
  const ask = lastAsk(up);
  assert.equal(ask.url, 'https://cdn.example/seg1.ts');
  assert.equal(ask.method, 'GET');
  assert.deepEqual(
    ask.heads,
    [{ name: 'Range', value: 'bytes=0-' }],
    'the jar was never forged',
  );

  // The answer on the same instance the page is listening to.
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(6)),
  );
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(instance.readyState, 4);
  assert.equal(instance.status, 200);
  assert.equal(instance.responseURL, 'https://cdn.example/seg1.ts');
  assert.equal(
    instance.getAllResponseHeaders(),
    'content-type: video/mp2t\r\n',
  );
  assert.equal(
    instance.getResponseHeader('Content-Type'),
    'video/mp2t',
    'the name the reader asks by, answered',
  );
  assert.equal(instance.getResponseHeader('X-Custom'), null);
  assert.equal(
    instance.responseText,
    new TextDecoder().decode(new ArrayBuffer(6)),
  );
  assert.deepEqual(instance.dispatched, [
    'readystatechange',
    'load',
    'loadend',
  ]);
  assert.equal(
    instance.nativeSends,
    undefined,
    'the native ask was never spoken',
  );
  standDown();
});

test('arrayBuffer’s shape is laid as the reader asked it', async () => {
  const page = makePage({ responseType: 'arraybuffer' });
  const up = makeUp();
  const route = createRoute(up);
  route.arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.send();
  const ask = lastAsk(up);
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(8)),
  );
  await Promise.resolve();
  await Promise.resolve();

  assert.ok(instance.response instanceof ArrayBuffer, 'the reader’s shape');
  assert.equal(instance.response.byteLength, 8);
  assert.equal(instance.responseText, undefined, 'no text beside the shape');
  standDown();
});

test('a brand miss falls back to the native ask, then and there', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.send();
  const ask = lastAsk(up);
  up.answer(sayRouteBytes(ask.id, ask.url, 403, null, null));
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(instance.nativeSends, [], 'the brand spoke its own ask');
  assert.equal(
    instance.dispatched,
    undefined,
    'nobody was told what nobody owed',
  );
  standDown();
});

test('a non-media brand ask is the brand’s own, spoken whole', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://site.example/page.html');
  instance.send('payload');
  assert.equal(up.spoken.length, 0, 'no routed ask');
  assert.deepEqual(instance.nativeSends, ['payload'], 'the brand said its own');
  // A POST through the brand is the brand’s own, too.
  const second = new page.XMLHttpRequest();
  second.open('POST', 'https://cdn.example/video.ts');
  second.send();
  assert.equal(up.spoken.length, 0, 'still no routed ask');
  assert.deepEqual(second.nativeSends, []);
  standDown();
});

test('an aborted ask is a dead ask, whatever the answer says', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.send();
  const ask = lastAsk(up);
  instance.abort();

  // The answer arrives after the abort: nobody is listening, and the
  // ask is not resurrected by the hub’s word.
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(4)),
  );
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(instance.dispatched, undefined, 'no hooks were fired');
  assert.equal(
    instance.nativeSends,
    undefined,
    'no fallback spoke either — the dead ask was dropped',
  );
  standDown();
});

test('a brand whose shape refuses the four words disarms whole', () => {
  // The first arm lays what it can; the second reads the false flag,
  // and re-arms from the page’s own natives — never wrapping itself in
  // itself.
  const page = makePage({ brandFrozenLayout: true });
  const up = makeUp();
  const route = createRoute(up);
  route.arm();
  assert.equal(page.__nocturneRoute, false, 'the room stood down');
  assert.equal(
    page.fetch,
    page.nativeCalls ? page.__nocturneNative : null,
    'the ask door is the page’s own again',
  );

  // A re-arm reads the true natives, never the shim’s own words.
  route.arm();
  assert.equal(page.fetch, page.__nocturneNative);
  standDown();
});

test('a hollow brand takes the whole room down, the four-and-none word', () => {
  // A brand present but borrowing nothing disarms the room entirely —
  // the ask door restored, the room standing for nothing at all. A
  // half-spoken room is the one shape this file refuses to be.
  const page = makePage({
    brandFrozenLayout: false,
    brandMissingMethods: true,
  });
  const up = makeUp();
  createRoute(up).arm();
  assert.equal(page.__nocturneRoute, false, 'the room stood down whole');
  assert.equal(
    page.fetch,
    page.__nocturneNative,
    'the ask door is the page’s own',
  );
  standDown();
});

test('the arm is once per document, whatever the page re-decides', () => {
  makePage();
  const up = makeUp();
  const route = createRoute(up);
  route.arm();
  // The second arm reads the true flag and pays nothing — the same
  // number of spoken asks whatever the sweeps do afterwards.
  route.arm();
  route.arm();
  assert.equal(up.spoken.length, 0);
  standDown();
});
