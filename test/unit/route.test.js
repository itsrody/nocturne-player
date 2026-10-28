import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCipherWorker } from '../../src/background/cipher/worker.js';
import {
  asRouteAsk,
  asRouteBytes,
  ROUTE_ASK,
  ROUTE_BYTES,
  sayRouteAsk,
  sayRouteBytes,
} from '../../src/lib/protocol.js';
import { createSessions } from '../../src/background/book/sessions.js';
import { createBook } from '../../src/background/book/book.js';
import { createReader } from '../../src/background/book/read.js';
import { decide } from '../../src/background/book/seat.js';
import { answerState } from '../../src/background/book/state.js';
import { createRoute } from '../../src/content/video/route.js';
import { isReplayed, replayedHeads } from '../../src/lib/bearers.js';

// The hub, stood to exactly the shape the session room asks of it — the
// same splice `hub.test.js` holds, minus the mouths that never carry a
// routed ask.
const makeHub = (worker = null) => {
  const connectListeners = [];
  const browser = {
    runtime: {
      onConnect: { addListener: (fn) => connectListeners.push(fn) },
      onMessage: { addListener: () => {} },
    },
    tabs: { onRemoved: { addListener: () => {} } },
  };
  const book = createBook();
  const read = createReader(worker, book);
  createSessions({ browser, book, worker, read, decide, answerState });
  return {
    over: (port) => {
      for (const listener of connectListeners) listener(port);
    },
    said: book.said,
  };
};

// A frame’s port, the way the hub’s own tests hold it: words up by
// hand, the hub’s words back into `spoken`.
const makePort = (tabId, frameId) => {
  const messageHandlers = [];
  const port = {
    sender: { tab: { id: tabId }, frameId },
    spoken: [],
    postMessage: (word) => port.spoken.push(word),
    say: (word) => {
      for (const handler of [...messageHandlers]) handler(word);
    },
    disconnect: () => {},
    onMessage: { addListener: (fn) => messageHandlers.push(fn) },
    onDisconnect: { addListener: () => {} },
  };
  return port;
};

test('the routed ask is worded whole, and refused where it half-says', () => {
  assert.deepEqual(
    asRouteAsk(
      sayRouteAsk(3, 'https://site.example/seg.ts', 'GET', [
        { name: 'Range', value: 'bytes=0-' },
        { name: 'Cookie', value: 'a=1' },
      ]),
    ),
    {
      id: 3,
      url: 'https://site.example/seg.ts',
      method: 'GET',
      heads: [
        { name: 'Range', value: 'bytes=0-' },
        { name: 'Cookie', value: 'a=1' },
      ],
    },
  );
  // A method wider than the house speaks sends the whole ask elsewhere.
  assert.equal(
    asRouteAsk({ type: ROUTE_ASK, id: 3, url: 'u', method: 'POST' }),
    null,
  );
  assert.equal(
    asRouteAsk({ type: ROUTE_ASK, id: '3', url: 'u', method: 'GET' }),
    null,
  );
  assert.equal(
    asRouteAsk({ type: ROUTE_ASK, id: 3, url: '', method: 'GET' }),
    null,
  );
  assert.equal(
    asRouteAsk({
      type: ROUTE_ASK,
      id: 3,
      url: 'u',
      method: 'GET',
      heads: 'three',
    }),
    null,
  );
  // A half-said header is not the page’s word either.
  assert.deepEqual(
    asRouteAsk({
      type: ROUTE_ASK,
      id: 3,
      url: 'u',
      method: 'GET',
      heads: [
        { name: '', value: 'v' },
        { name: 'a', value: null },
      ],
    }).heads,
    [],
  );
});

test('the routed answer is worded whole, and refused where it', () => {
  assert.deepEqual(
    asRouteBytes(
      sayRouteBytes(3, 'https://s.example/seg.ts', 200, 'video/mp4', null),
    ),
    {
      id: 3,
      url: 'https://s.example/seg.ts',
      status: 200,
      contentType: 'video/mp4',
      bytes: null,
    },
  );
  // The status a response cannot bear is nobody’s answer.
  assert.equal(
    asRouteBytes({
      type: ROUTE_BYTES,
      id: 3,
      url: 'u',
      status: 999,
      bytes: null,
    }),
    null,
  );
  assert.equal(
    asRouteBytes({
      type: ROUTE_BYTES,
      id: 3,
      url: 'u',
      status: 3.5,
      bytes: null,
    }),
    null,
  );
  assert.equal(
    asRouteBytes({
      type: ROUTE_BYTES,
      id: 3,
      url: 'u',
      status: 200,
      bytes: 'four',
    }),
    null,
  );
  assert.equal(
    asRouteBytes({
      type: ROUTE_ASK,
      id: 3,
      url: 'u',
      status: 200,
      bytes: null,
    }),
    null,
  );
});

test('the hub answers a routed ask only where a film carries', async () => {
  const answered = [];
  const worker = {
    // The hand’s stub: the ask the hub carries comes back as a real
    // answer, recorded so the test sees the exact sentence the frame
    // built.
    askBytes: async (url, ask) => {
      answered.push({ url, ask });
      return {
        status: 200,
        contentType: 'video/mp4',
        bytes: new ArrayBuffer(4),
      };
    },
  };
  const hub = makeHub(worker);

  const port = makePort(1, 1);
  hub.over(port);

  // Before the want: the shim could be armed by nothing the page shows,
  // but the law is told at the hub’s side too — a routed ask from a
  // frame the walk never confirmed founds nothing here.
  port.say(sayRouteAsk(1, 'https://site.example/seg.ts', 'GET', []));
  assert.deepEqual(port.spoken, [], 'no film, no routed ask carried');
  assert.deepEqual(answered, []);

  // The film confirmed: the want carries, and the ask is spoken by the
  // background’s hands, answered with clonable bytes beside the status.
  port.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.deepEqual(port.spoken, [{ type: 'nocturneVerdict', granted: true }]);

  port.say(
    sayRouteAsk(2, 'https://site.example/seg.ts', 'GET', [
      { name: 'range', value: 'bytes=0-' },
    ]),
  );
  // The hand’s ask arrives on the hub’s own microtask — the promise the
  // session room wraps it in — so the answer’s word is read after the
  // beat, not before it.
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.deepEqual(answered, [
    {
      url: 'https://site.example/seg.ts',
      ask: {
        id: 2,
        url: 'https://site.example/seg.ts',
        method: 'GET',
        heads: [{ name: 'range', value: 'bytes=0-' }],
      },
    },
  ]);
  // The answer, worded by the protocol’s own guard and read field by
  // field — the bytes are a buffer the port carried, and the test’s own
  // buffers are compared by shape, never by identity.
  const first = asRouteBytes(port.spoken[1]);
  assert.deepEqual(
    {
      id: first?.id,
      url: first?.url,
      status: first?.status,
      contentType: first?.contentType,
      typed: first?.bytes instanceof ArrayBuffer,
    },
    {
      id: 2,
      url: 'https://site.example/seg.ts',
      status: 200,
      contentType: 'video/mp4',
      typed: true,
    },
  );

  // The want gone: the ask is refused again — a film the page let go of
  // is no film for the house’s hands. The report’s own verdict still
  // says its piece (the seat’s news answers whatever the want said);
  // the ask after it is answered nothing.
  port.say({ type: 'nocturneReport', want: false, count: 0 });
  port.say(sayRouteAsk(3, 'https://site.example/seg.ts', 'GET', []));
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.equal(port.spoken.length, 3, 'no film, no second answer');
  assert.equal(
    asRouteBytes(port.spoken[2]) !== null,
    false,
    'the third word is the verdict, not an answer',
  );
  assert.deepEqual(
    { granted: port.spoken[2]?.granted, type: port.spoken[2]?.type },
    { granted: false, type: 'nocturneVerdict' },
  );
});

test('the background’s hand speaks the page’s ask, and misses', async () => {
  const initSeen = [];

  const stubAnswer = {
    ok: true,
    status: 206,
    headers: { get: (name) => (name === 'content-type' ? 'video/mp4' : null) },
    arrayBuffer: async () => new ArrayBuffer(4),
  };
  globalThis.fetch = async (url, init) => {
    initSeen.push({ url, init });
    return stubAnswer;
  };
  const worker = createCipherWorker();
  const green = await worker.askBytes('https://site.example/seg.ts', {
    url: 'https://site.example/seg.ts',
    method: 'GET',
    heads: [{ name: 'range', value: 'bytes=0-' }],
  });
  assert.deepEqual(initSeen, [
    {
      url: 'https://site.example/seg.ts',
      init: {
        method: 'GET',
        headers: { range: 'bytes=0-' },
        credentials: 'include',
      },
    },
  ]);
  assert.deepEqual(green, {
    status: 206,
    contentType: 'video/mp4',
    bytes: new ArrayBuffer(4),
  });

  // The origin refusing, and the wire dark, are both the honest miss: a
  // real status beside no bytes, the shape the shim’s fallback reads.
  globalThis.fetch = async () => ({
    ...stubAnswer,
    ok: false,
    arrayBuffer: undefined,
  });
  const refused = await worker.askBytes('https://site.example/seg.ts', {
    heads: [],
  });
  assert.deepEqual(refused, {
    status: 206,
    contentType: 'video/mp4',
    bytes: null,
  });

  globalThis.fetch = async () => {
    throw new Error('the wire is dark');
  };
  const dark = await worker.askBytes('https://site.example/seg.ts', {
    heads: [],
  });
  assert.deepEqual(dark, { status: 0, contentType: null, bytes: null });
});

test('the shim stands for nothing where no frame room stands', () => {
  // In this tests’ own room there is no window — the arming is asked and
  // answers a quiet no, and the port listener is still stood at birth
  // (a reply answered late is heard, whatever the arming said).
  let said = 0;
  const listeners = [];
  const up = {
    onMessage: { addListener: (fn) => listeners.push(fn) },
    postMessage: () => {
      said += 1;
    },
  };
  const route = createRoute(up);
  route.arm();
  assert.deepEqual(listeners.length, 1);
  assert.equal(said, 0);
});

test('the replay law: the furniture carried, the jar never forged', () => {
  // The reader’s own furniture and the bearer’s carried credentials
  // replay; the cookie jar, the forwarding context and the browser’s
  // own attachments never do.
  const pairs = [
    { name: 'Range', value: 'bytes=0-' },
    { name: 'Accept', value: '*/*' },
    { name: 'accept-language', value: 'en' },
    { name: 'If-None-Match', value: '"e1"' },
    { name: 'if-modified-since', value: 'yesterday' },
    { name: 'authorization', value: 'Bearer tok' },
    { name: 'X-Stream-Token', value: 's1' },
    { name: 'Cookie', value: 'a=1' },
    { name: 'Origin', value: 'https://site.example' },
    { name: 'Referer', value: 'https://site.example/' },
    { name: 'Host', value: 'site.example' },
    { name: 'User-Agent', value: 'mine' },
  ];
  assert.deepEqual(replayedHeads(pairs), [
    { name: 'Range', value: 'bytes=0-' },
    { name: 'Accept', value: '*/*' },
    { name: 'accept-language', value: 'en' },
    { name: 'If-None-Match', value: '"e1"' },
    { name: 'if-modified-since', value: 'yesterday' },
    { name: 'authorization', value: 'Bearer tok' },
    { name: 'X-Stream-Token', value: 's1' },
  ]);
  assert.equal(isReplayed('x-forwarded-for'), true);
  assert.equal(isReplayed('xauth'), false, 'an `x-` name, not a carried one');
  assert.equal(isReplayed(undefined), false);
});
