// The shim, driven. The fake page realm — a `window` whose `wrappedJSObject`
// the pageapi’s own helper reads, X-ray stubs standing for exportFunction
// and cloneInto, and a page whose `fetch` binding and XML HTTP brand are
// plain objects the shim can be laid on — is where every path of the
// routing says itself: held ask, miss, refusal, the brand’s own door,
// the moments, the credentials the page said, the beat, and the
// stand-down that restores the natives whole.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  asRouteAsk,
  sayRouteBow,
  sayRouteBytes,
} from '../../src/lib/protocol.js';
import { createRoute } from '../../src/content/video/route.js';

// --- The fake page realm. ---

// exportFunction, as the machinery sees it: the function crosses whole
// (Node has no compartments to speak of), with the calls recorded.
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
    // The hub’s word, said by hand.
    answer: (word) => {
      for (const listener of [...listeners]) listener(word);
    },
  };
};

// The last said routed ask, parsed by the word’s own guard — the reply
// always comes back through that door in the tests.
const lastAsk = (up) => asRouteAsk(up.spoken.at(-1));

// along, an iterator the page made.
const makePage = (options = {}) => {
  const nativeCalls = [];
  const native = (input, init) => {
    nativeCalls.push({ input, init });
    return 'NATIVE';
  };

  class FakeHeaders {
    constructor(source) {
      this.pairs = Array.isArray(source)
        ? source.map((one) => [one[0], one[1]])
        : Object.entries(source ?? {});
    }
    get(name) {
      const found = this.pairs.find(
        ([one]) => one.toLowerCase() === String(name).toLowerCase(),
      );
      return found?.[1] ?? null;
    }
    entries() {
      const pairs = this.pairs;
      let at = 0;
      return {
        [Symbol.iterator]() {
          return this;
        },
        next: () =>
          at < pairs.length
            ? { done: false, value: pairs[at++] }
            : { done: true, value: undefined },
      };
    }
  }
  class FakeResponse {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status;
      this.headers = init?.headers;
    }
  }
  class FakeProgressEvent {
    constructor(type, init) {
      this.type = type;
      this.loaded = init?.loaded;
      this.total = init?.total;
      this.lengthComputable = init?.lengthComputable;
    }
  }
  class FakeBlob {
    constructor(parts, init) {
      this.type = init?.type;
      this.size = (parts ?? []).reduce(
        (count, one) => count + (one.byteLength ?? 0),
        0,
      );
      this.parts = parts;
    }
  }
  const FakeURL = function (address) {
    this.href = address;
  };
  FakeURL.prototype.toString = function () {
    return this.href;
  };
  FakeURL.prototype[Symbol.toStringTag] = 'URL';
  const FakeRequest = function (address, init = {}) {
    this.url = address;
    this.method = init.method ?? 'GET';
    this.credentials = init.credentials ?? 'same-origin';
    this.headers = init.headers ?? new FakeHeaders({});
  };
  FakeRequest.prototype[Symbol.toStringTag] = 'Request';

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
    this.dispatched = [...prior, event];
    return true;
  };

  const page = {
    fetch: native,
    Response: FakeResponse,
    Headers: FakeHeaders,
    ProgressEvent: FakeProgressEvent,
    Blob: FakeBlob,
    Request: FakeRequest,
    Event: FakeProgressEvent,
    URL: FakeURL,
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
    globalThis.page = page;
    page.nativeCalls = nativeCalls;
    return page;
  }
  globalThis.window = { wrappedJSObject: page };
  globalThis.page = page;
  page.nativeCalls = nativeCalls;
  return page;
};

const standDown = () => {
  delete globalThis.window;
  delete globalThis.page;
};

test('the held ask is carried in the page’s own shapes', async () => {
  const page = makePage();
  const up = makeUp();
  const route = createRoute(up);
  const before = page.fetch;
  route.arm();

  const held = page.fetch('https://cdn.example/video.ts');
  const ask = lastAsk(up);
  assert.equal(ask.url, 'https://cdn.example/video.ts');
  assert.equal(ask.method, 'GET');
  assert.equal(ask.creden, 'same-origin', 'no credentials said, same-origin');
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
  assert.notEqual(page.fetch, before, 'the shim stands as the ask door');
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

test('a page-made URL ask is routed by tag, not by realm', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  // An `instanceof` against our own URL would fail this ask — the tag
  // read is the cross-realm’s way of knowing what the page handed over.
  const asked = page.fetch(new page.URL('https://cdn.example/video.ts'));
  const ask = lastAsk(up);
  assert.equal(ask.url, 'https://cdn.example/video.ts');
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(4)),
  );
  await asked;
  assert.equal(page.nativeCalls.length, 0);
  standDown();
});

test('a page-made Request ask is read and routed whole', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  const request = new page.Request('https://cdn.example/video.ts', {
    method: 'GET',
    credentials: 'include',
    headers: new page.Headers({ range: 'bytes=0-' }),
  });
  const held = page.fetch(request);
  const ask = lastAsk(up);
  assert.equal(ask.url, 'https://cdn.example/video.ts');
  assert.equal(ask.method, 'GET');
  assert.equal(ask.creden, 'include', 'the request’s own credentials word');
  assert.deepEqual(ask.heads, [{ name: 'range', value: 'bytes=0-' }]);
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(4)),
  );
  await held;
  assert.equal(page.nativeCalls.length, 0);
  standDown();
});

test('the credentials the page said are the credentials replayed', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  // A fetch said with its own no, and one said with its own yes.
  page.fetch('https://cdn.example/video.ts', { credentials: 'omit' });
  assert.equal(lastAsk(up).creden, 'omit');
  page.fetch('https://cdn.example/video.ts', { credentials: 'include' });
  assert.equal(lastAsk(up).creden, 'include');

  // The brand’s own word for it: `withCredentials`, read at send.
  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.withCredentials = true;
  instance.send();
  assert.equal(lastAsk(up).creden, 'include');
  // And the third instance says nothing — same-origin stands in.
  const quiet = new page.XMLHttpRequest();
  quiet.open('GET', 'https://cdn.example/seg2.ts');
  quiet.send();
  assert.equal(lastAsk(up).creden, 'same-origin');
  standDown();
});

test('the brand’s door: spoken, laid, answered on the instance', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up).arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.setRequestHeader('Range', 'bytes=0-');
  instance.setRequestHeader('Cookie', 'a=1');
  instance.send();

  // `loadstart` came with the send — the moment the native ask opens
  // its mouth, ours says it at the same moment.
  assert.equal(instance.dispatched[0].type, 'loadstart');

  // The routed ask said to the hub: the URL seen, only the carried name rode.
  const ask = lastAsk(up);
  assert.equal(ask.url, 'https://cdn.example/seg1.ts');
  assert.equal(ask.method, 'GET');
  assert.deepEqual(
    ask.heads,
    [{ name: 'Range', value: 'bytes=0-' }],
    'the jar was never forged',
  );

  // The answer, said with its own furniture (the length the bytes are),
  // on the same instance the page is listening to.
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'video/mp2t', new ArrayBuffer(6), [
      { name: 'content-length', value: '6' },
    ]),
  );
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(instance.readyState, 4);
  assert.equal(instance.status, 200);
  assert.equal(instance.responseURL, 'https://cdn.example/seg1.ts');
  assert.equal(
    instance.getAllResponseHeaders(),
    'content-length: 6\r\ncontent-type: video/mp2t\r\n',
  );
  assert.equal(instance.getResponseHeader('Content-Type'), 'video/mp2t');
  assert.equal(instance.getResponseHeader('X-Custom'), null);
  assert.ok(instance.responseText.length !== undefined, 'a text shape');
  const types = instance.dispatched.map((one) => one.type);
  assert.deepEqual(types, [
    'loadstart',
    'readystatechange',
    'readystatechange',
    'progress',
    'readystatechange',
    'load',
    'loadend',
  ]);
  const progress = instance.dispatched.find((one) => one.type === 'progress');
  assert.equal(progress.loaded, 6, 'the commentary hooks read their bytes');
  assert.equal(progress.total, 6);
  assert.equal(progress.lengthComputable, true);
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
  createRoute(up).arm();

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

test('blob’s shape is the page’s own Blob, built from the bytes', async () => {
  const page = makePage({ responseType: 'blob' });
  const up = makeUp();
  createRoute(up).arm();

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.send();
  const ask = lastAsk(up);
  up.answer(
    sayRouteBytes(ask.id, ask.url, 200, 'text/vtt', new ArrayBuffer(12)),
  );
  await Promise.resolve();
  await Promise.resolve();

  assert.ok(instance.response instanceof page.Blob, 'the reader’s shape');
  assert.equal(instance.response.type, 'text/vtt');
  assert.equal(instance.response.size, 12);
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
    instance.dispatched.filter((one) => one.type === 'load').length,
    0,
    'nobody claimed the origin’s answer',
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
  assert.equal(
    instance.dispatched,
    undefined,
    'no loadstart of the house’s was said',
  );
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
  assert.equal(
    instance.dispatched.filter((one) => one.type === 'load').length,
    0,
    'no load of the house’s was fired',
  );
  assert.equal(
    instance.nativeSends,
    undefined,
    'no fallback spoke either — the dead ask was dropped',
  );
  standDown();
});

test('a brand whose shape refuses the four words disarms whole', () => {
  // The arm, refused by the brand’s frozen shape, restores the ask
  // door and stands for nothing — entirely, never half.
  const page = makePage({ brandFrozenLayout: true });
  const up = makeUp();
  const before = page.fetch;
  createRoute(up).arm();
  assert.equal(page.fetch, before, 'the refusal took the door away whole');
  standDown();
});

test('a hollow brand takes the whole room down, the four-and-none word', () => {
  const page = makePage({ brandMissingMethods: true });
  const up = makeUp();
  const before = page.fetch;
  createRoute(up).arm();
  // A brand present but borrowing nothing disarms the room entirely —
  // the ask door restored, the room standing for nothing at all. A
  // half-spoken room is the one shape this file refuses to be.
  assert.equal(page.fetch, before, 'the ask door is the page’s own');
  standDown();
});

test('the arm is once per document, whatever the page re-decides', () => {
  const page = makePage();
  const up = makeUp();
  const route = createRoute(up);
  route.arm();
  const patched = page.fetch;
  // The second arm reads the lived room and lays nothing new — the
  // same patched door, not a shim wrapped in itself.
  route.arm();
  route.arm();
  assert.equal(page.fetch, patched);
  assert.equal(up.spoken.length, 0);
  standDown();
});

test('the beat is the miss a hub that never answers turns into', async () => {
  const page = makePage();
  const up = makeUp();
  createRoute(up, 5).arm();

  const asked = page.fetch('https://cdn.example/video.ts');
  assert.equal(up.spoken.length, 1, 'the ask was said');
  // The beat outlived: the ask becomes the honest miss — the page’s
  // own ask, spoken whole.
  await new Promise((resolve) => {
    setTimeout(resolve, 30);
  });
  assert.equal(await asked, 'NATIVE');
  // A late answer for a forgotten ask is heard and dropped whole.
  up.answer(
    sayRouteBytes(0, 'https://cdn.example/video.ts', 200, 'video/mp2t', null),
  );
  standDown();
});

test('the stand-down: the hub’s word restores the natives whole', async () => {
  const page = makePage();
  const up = makeUp();
  const route = createRoute(up);
  const native = page.fetch;
  route.arm();
  assert.notEqual(page.fetch, native, 'the door is the shim’s before the bow');

  // The ask door is the shim’s; then the hub says the word.
  page.fetch('https://cdn.example/video.ts');
  assert.equal(up.spoken.length, 1);
  up.answer(sayRouteBow());

  // The door is the page’s own again, and the brand’s four words
  // were never laid over in the first place to be re-laid wrongly:
  // a brand ask after the bow goes nowhere but the brand’s own send.
  assert.equal(page.fetch, native, 'after the bow, the page’s own door');
  assert.equal(up.spoken.length, 1, 'the bow did not say an ask');

  const instance = new page.XMLHttpRequest();
  instance.open('GET', 'https://cdn.example/seg1.ts');
  instance.send();
  assert.equal(up.spoken.length, 1, 'no routed ask after the bow');
  assert.deepEqual(instance.nativeSends, [], 'the brand said its own ask');
  standDown();
});
