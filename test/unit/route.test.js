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
import { sequenceIv } from '../../src/background/cipher/manifest.js';

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
    speak: book.speak,
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
      creden: 'same-origin',
      heads: [
        { name: 'Range', value: 'bytes=0-' },
        { name: 'Cookie', value: 'a=1' },
      ],
    },
  );
  // The credentials mode the page said rides whole; a mode that lies
  // is not the page’s word.
  assert.equal(
    asRouteAsk(
      sayRouteAsk(3, 'https://site.example/seg.ts', 'GET', [], 'include'),
    ).creden,
    'include',
  );
  assert.equal(
    asRouteAsk({
      type: ROUTE_ASK,
      id: 3,
      url: 'u',
      method: 'GET',
      creden: 'all',
    }),
    null,
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
      heads: [],
    },
  );
  // The answer’s own furniture rides where both names and values say
  // something, and a half-word of it stays home.
  assert.deepEqual(
    asRouteBytes(
      sayRouteBytes(3, 'https://s.example/seg.ts', 206, 'video/mp4', null, [
        { name: 'Content-Range', value: 'bytes 0-3/4' },
        { name: 'x-junk', value: '' },
      ]),
    ),
    {
      id: 3,
      url: 'https://s.example/seg.ts',
      status: 206,
      contentType: 'video/mp4',
      bytes: null,
      heads: [{ name: 'Content-Range', value: 'bytes 0-3/4' }],
    },
  );
  assert.equal(
    asRouteBytes({
      type: ROUTE_BYTES,
      id: 3,
      url: 'u',
      status: 200,
      bytes: null,
      heads: 3,
    }),
    null,
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
  // but the law is told at the hub’s side too — and a refusal is
  // answered, the honest miss spoken straight back, so the shim’s
  // fallback takes it the same beat instead of hanging a whole ask on
  // a frame the house will never speak for.
  port.say(sayRouteAsk(1, 'https://site.example/seg.ts', 'GET', []));
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.deepEqual(asRouteBytes(port.spoken[0]), {
    id: 1,
    url: 'https://site.example/seg.ts',
    status: 0,
    contentType: null,
    bytes: null,
    heads: [],
  });
  assert.deepEqual(answered, []);

  // The film confirmed: the want carries, and the ask is spoken by the
  // background’s hands, answered with clonable bytes beside the status.
  port.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.deepEqual(port.spoken[1], { type: 'nocturneVerdict', granted: true });

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
        creden: 'same-origin',
        heads: [{ name: 'range', value: 'bytes=0-' }],
      },
    },
  ]);
  // The answer, worded by the protocol’s own guard and read field by
  // field — the bytes are a buffer the port carried, and the test’s own
  // buffers are compared by shape, never by identity.
  const first = asRouteBytes(port.spoken[2]);
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
  // the routed ask after it is never spoken to the worker, only the
  // miss that frees the shim’s fallback at once.
  port.say({ type: 'nocturneReport', want: false, count: 0 });
  port.say(sayRouteAsk(3, 'https://site.example/seg.ts', 'GET', []));
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.equal(port.spoken.length, 5, 'no film, but the refusal answers');
  // The refusal is answered with the honest miss — the shim’s
  // fallback takes it the same beat, never a hung ask while the want
  // is gone.
  assert.deepEqual(asRouteBytes(port.spoken[4]), {
    id: 3,
    url: 'https://site.example/seg.ts',
    status: 0,
    contentType: null,
    bytes: null,
    heads: [],
  });
});

test('the stand-down is said after a long miss streak', async () => {
  const worker = {
    askBytes: async () => ({
      status: 0,
      contentType: null,
      bytes: null,
      heads: [],
    }),
  };
  const hub = makeHub(worker);
  const port = makePort(2, 0);
  hub.over(port);
  port.say({ type: 'nocturneReport', want: true, count: 1 });
  for (let id = 1; id <= 7; id += 1) {
    port.say(sayRouteAsk(id, 'https://site.example/seg.ts', 'GET', []));
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    assert.equal(
      port.spoken.some((word) => word?.type === 'nocturneRouteBow'),
      false,
      'seven misses, no bow yet',
    );
  }
  port.say(sayRouteAsk(8, 'https://site.example/seg.ts', 'GET', []));
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.equal(
    port.spoken.some((word) => word?.type === 'nocturneRouteBow'),
    true,
    'the streak rang the bell',
  );
});

test('the streak is a streak: one hit resets it', async () => {
  const worker = {
    askBytes: async (url, ask) =>
      ask.id % 5 === 0
        ? { status: 200, contentType: 'video/mp4', bytes: new ArrayBuffer(2) }
        : { status: 0, contentType: null, bytes: null, heads: [] },
  };
  const hub = makeHub(worker);
  const port = makePort(3, 0);
  hub.over(port);
  port.say({ type: 'nocturneReport', want: true, count: 1 });
  for (let id = 1; id <= 24; id += 1) {
    port.say(sayRouteAsk(id, 'https://site.example/seg.ts', 'GET', []));
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    assert.equal(
      port.spoken.some((word) => word?.type === 'nocturneRouteBow'),
      false,
      'every fifth ask carries the streak back to nothing',
    );
  }
});

test('a want refused after a streak speaks nothing', async () => {
  // The miss streak counts only where the ask is carried at all: a
  // frame whose film went away is refused before the count, and no
  // stand-down ever rides its port for that.
  const worker = {
    askBytes: async () => ({
      status: 0,
      contentType: null,
      bytes: null,
      heads: [],
    }),
  };
  const hub = makeHub(worker);
  const port = makePort(2, 1);
  hub.over(port);
  port.say({ type: 'nocturneReport', want: false, count: 0 });
  for (let id = 1; id <= 20; id += 1) {
    port.say(sayRouteAsk(id, 'https://site.example/seg.ts', 'GET', []));
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
  assert.equal(
    port.spoken.some((word) => word?.type === 'nocturneRouteBow'),
    false,
  );
});

// The origin’s answer the tests’ own stub says, one `get` read all
// three rooms ask by name.
const stubHeader = (name) => {
  if (name === 'content-type') return 'video/mp4';
  if (name === 'content-length') return '4';
  if (name === 'content-range') return 'bytes 0-3/4';
  return null;
};

test('the background’s hand speaks the page’s ask, and misses', async () => {
  const stubAnswer = {
    ok: true,
    status: 206,
    headers: { get: stubHeader },
    arrayBuffer: async () => new ArrayBuffer(4),
  };
  const asked = [];
  globalThis.fetch = async (url, init) => {
    asked.push({ url, init });
    return {
      ok: true,
      status: 206,
      headers: { get: stubHeader },
      arrayBuffer: async () => new ArrayBuffer(4),
    };
  };
  const worker = createCipherWorker();
  const green = await worker.askBytes('https://site.example/seg.ts', {
    url: 'https://site.example/seg.ts',
    method: 'GET',
    heads: [{ name: 'range', value: 'bytes=0-' }],
    creden: 'same-origin',
  });
  assert.deepEqual(asked, [
    {
      url: 'https://site.example/seg.ts',
      init: {
        method: 'GET',
        headers: { range: 'bytes=0-' },
        credentials: 'same-origin',
      },
    },
  ]);
  assert.deepEqual(green, {
    status: 206,
    contentType: 'video/mp4',
    bytes: new ArrayBuffer(4),
    heads: [
      { name: 'content-length', value: '4' },
      { name: 'content-range', value: 'bytes 0-3/4' },
    ],
  });

  // The credentials the page said are the credentials the hand says —
  // `include` when the page asked with it, `omit` when the page said
  // its own no, and never a wider reach than the page itself chose.
  let shared = null;
  globalThis.fetch = async (url, init) => {
    shared = { url, init };
    return stubAnswer;
  };
  await worker.askBytes('https://cdn.example/seg.ts', {
    heads: [{ name: 'range', value: 'bytes=0-' }],
    creden: 'include',
  });
  assert.equal(shared.init.credentials, 'include');
  await worker.askBytes('https://cdn.example/seg.ts', {
    heads: [{ name: 'range', value: 'bytes=0-' }],
    creden: 'omit',
  });
  assert.equal(shared.init.credentials, 'omit');

  // The origin refusing, and the wire dark, are both the honest miss: a
  // real status beside no bytes, the shape the shim’s fallback reads.
  globalThis.fetch = async () => ({
    ...stubAnswer,
    ok: false,
    arrayBuffer: undefined,
  });
  const refused = await worker.askBytes('https://site.example/seg.ts', {
    heads: [],
    creden: 'same-origin',
  });
  assert.deepEqual(refused, {
    status: 206,
    contentType: 'video/mp4',
    bytes: null,
    heads: [
      { name: 'content-length', value: '4' },
      { name: 'content-range', value: 'bytes 0-3/4' },
    ],
  });

  globalThis.fetch = async () => {
    throw new Error('the wire is dark');
  };
  const dark = await worker.askBytes('https://site.example/seg.ts', {
    heads: [],
    creden: 'same-origin',
  });
  assert.deepEqual(dark, {
    status: 0,
    contentType: null,
    bytes: null,
    heads: [],
  });
});

test('the routed ask answers the room’s carried word where the', async () => {
  // The weakness the bearer room answers on the page’s own asks — the
  // manifest said the credentials, the segments’ asks forgot them —
  // is answered at the hub’s hearing too: the ask’s own words win,
  // the room’s carried word fills.
  const answered = [];
  const worker = {
    askBytes: async (url, ask) => {
      answered.push(ask.heads);
      return {
        status: 200,
        contentType: 'video/mp4',
        bytes: new ArrayBuffer(2),
        heads: [],
      };
    },
  };
  const hub = makeHub(worker);
  const port = makePort(4, 0);
  hub.over(port);
  port.say({ type: 'nocturneReport', want: true, count: 1 });
  // The room’s word, said where the manifest ask carried it. The file’s
  // own policy normalizes the carried names to the lower spelling the
  // HTTP standard reads them by — and the jar never rides.
  hub.speak(4, [
    { name: 'Authorization', value: 'Bearer tok' },
    { name: 'Cookie', value: 'never' },
  ]);

  port.say(sayRouteAsk(1, 'https://site.example/seg.ts', 'GET', []));
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.deepEqual(answered[0], [
    { name: 'authorization', value: 'Bearer tok' },
  ]);
  // An ask that said its own carried word keeps it exactly as said —
  // the room’s word never replaces the ask’s own sentence.
  port.say(
    sayRouteAsk(2, 'https://cdn.example/seg.ts', 'GET', [
      { name: 'range', value: 'bytes=0-' },
      { name: 'authorization', value: 'Bearer mine' },
    ]),
  );
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.deepEqual(answered[1], [
    { name: 'range', value: 'bytes=0-' },
    { name: 'authorization', value: 'Bearer mine' },
  ]);
});

test('the key door stays honest past its own bound', async () => {
  // Sixty-six keys told: the cache’s bound forgets the oldest, and a
  // forgotten key is a refetch to the decree’s own address — the
  // decryption never learns the difference. The stream is a real one
  // in miniature: a key decree per segment, each sealed with its own
  // key at its own sequence’s IV, the pad-trick shape the worker
  // decrypts.
  const keys = new Map();
  const wires = new Map();
  for (let seq = 0; seq < 66; seq += 1) {
    const rawKey = new Uint8Array(16).fill(seq);
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, [
      'encrypt',
    ]);
    const sealed = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: sequenceIv(seq) },
      key,
      new Uint8Array(32).fill(seq),
    );
    const wire = new Uint8Array(sealed.byteLength - 16);
    wire.set(new Uint8Array(sealed).subarray(0, wire.length));
    keys.set(
      `https://site.example/key${seq}/key${seq}.key`,
      rawKey.slice().buffer,
    );
    wires.set(`https://site.example/seg${seq}.ts`, wire.slice().buffer);
  }
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-MEDIA-SEQUENCE:0'];
  for (let seq = 0; seq < 66; seq += 1) {
    lines.push(
      `#EXT-X-KEY:METHOD=AES-128,URI="key${seq}/key${seq}.key"`,
      '#EXTINF:6.0,',
      `seg${seq}.ts`,
    );
  }
  lines.push('#EXT-X-ENDLIST');
  const manifest = lines.join('\n');
  let keyFetches = 0;
  globalThis.fetch = (url) => {
    if (keys.has(url)) {
      keyFetches += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: async () => keys.get(url),
      });
    }
    if (wires.has(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: async () => wires.get(url),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      text: async () => manifest,
    });
  };
  const worker = createCipherWorker();
  // The read seals the march of sixty-six addresses, each its own key.
  const read = await worker.readCipher(
    'https://site.example/play.m3u8',
    undefined,
  );
  assert.notEqual(read, null);
  // Each segment unsealed against its own key: 66 imports, the cache
  // holding its latest 64 after the bound trims the oldest.
  for (let seq = 0; seq < 66; seq += 1) {
    const bytes = await worker.giveSegment(
      `https://site.example/seg${seq}.ts`,
      {},
    );
    assert.notEqual(bytes, null, seq);
    assert.deepEqual(new Uint8Array(bytes), new Uint8Array(32).fill(seq));
  }
  const firstCount = keyFetches;
  assert.equal(firstCount, 66, 'every key imported once');
  // A segment whose key was evicted is decrypted again — the refetch
  // path, honest after the bound.
  const again = await worker.giveSegment('https://site.example/seg0.ts', {});
  assert.notEqual(again, null);
  assert.equal(keyFetches, firstCount + 1);
  delete globalThis.fetch;
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
