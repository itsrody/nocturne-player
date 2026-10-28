import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFrameHub } from '../../src/background/hub.js';
import {
  CIPHER,
  CIPHER_BYTES,
  CIPHER_PLAN,
  DOSSIER,
  STATE_QUERY,
  STRAIN,
  VERDICT,
  askCipherSegment,
  sayLine,
} from '../../src/lib/protocol.js';
// The browser, stood up to exactly the shape the hub asks of it: three
// event bags (connect, message, tabs going away), and a port with the
// envelope the runtime hands over. Deliveries are synchronous — no
// MessagePort pair is minted here, because a real entanglement is a task
// loop of its own and every word this book speaks is answered by hand.
const makeBrowser = () => {
  const bags = {
    connect: [],
    message: [],
    removed: [],
  };
  const browser = {
    runtime: {
      onConnect: { addListener: (fn) => bags.connect.push(fn) },
      onMessage: { addListener: (fn) => bags.message.push(fn) },
    },
    tabs: {
      onRemoved: { addListener: (fn) => bags.removed.push(fn) },
    },
    fire: {
      // A frame’s port arriving; the envelope the browser attests.
      connect: (port) => {
        for (const listener of bags.connect) listener(port);
      },
      /** A runtime word, with its sender’s envelope beside it. */
      message: async (word, sender = {}) => {
        const answers = [];
        for (const listener of bags.message) {
          answers.push(await listener(word, sender));
        }
        return answers;
      },
      /** A tab ceasing to be. */
      removed: (tabId) => {
        for (const listener of bags.removed) listener(tabId);
      },
    },
  };
  return browser;
};

// A frame’s port: the words it speaks go up by hand, the hub’s words come
// back into `spoken`, and the two deaths it can die are named apart —
// `leave` is the frame’s document being torn down (the disconnect event),
// while `drop` is the hub showing an unvouched caller the door.
const makePort = (tabId, frameId) => {
  const messageHandlers = [];
  const disconnectHandlers = [];
  const port = {
    sender: { tab: { id: tabId }, frameId },
    name: 'nocturneSeat',
    spoken: [],
    dropped: false,
    postMessage: (word) => port.spoken.push(word),
    say: (word) => {
      for (const handler of [...messageHandlers]) handler(word);
    },
    leave: () => {
      for (const handler of [...disconnectHandlers]) handler();
    },
    disconnect: () => {
      port.dropped = true;
    },
    onMessage: { addListener: (fn) => messageHandlers.push(fn) },
    onDisconnect: { addListener: (fn) => disconnectHandlers.push(fn) },
  };
  return port;
};

test('the first want takes the seat and the second waits', () => {
  const browser = makeBrowser();
  createFrameHub(browser);

  const one = makePort(1, 1);
  const two = makePort(1, 2);
  browser.fire.connect(one);
  browser.fire.connect(two);

  one.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.deepEqual(one.spoken, [{ type: VERDICT, granted: true }]);
  assert.deepEqual(two.spoken, []);

  two.say({ type: 'nocturneReport', want: true, count: 0 });
  assert.deepEqual(two.spoken, [], 'the seat stays with the older ask');

  // Releasing the seat hands it to the one that waited — and the loser is
  // told so, for a frame that held the seat keeps believing it until a
  // verdict says otherwise.
  one.say({ type: 'nocturneReport', want: false, count: 1 });
  assert.deepEqual(one.spoken, [
    { type: VERDICT, granted: true },
    { type: VERDICT, granted: false },
  ]);
  assert.deepEqual(two.spoken, [{ type: VERDICT, granted: true }]);
});

test('a port’s death frees the seat without a clock', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  const one = makePort(1, 1);
  const two = makePort(1, 2);
  browser.fire.connect(one);
  browser.fire.connect(two);
  one.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.deepEqual(one.spoken, [{ type: VERDICT, granted: true }]);

  // The frame’s document is torn down — a navigation, an iframe lifted
  // out, a tab closed — and the disconnect is the whole ceremony: the
  // entry is gone from the book, no forgetting window to wait out.
  one.leave();
  assert.equal(hub.books.get(1).book.has(1), false);

  two.say({ type: 'nocturneReport', want: true, count: 0 });
  assert.deepEqual(two.spoken, [{ type: VERDICT, granted: true }]);
});

test('the top frame’s own film outranks the framed ones', () => {
  const browser = makeBrowser();
  createFrameHub(browser);

  const top = makePort(1, 0);
  const framed = makePort(1, 1);
  browser.fire.connect(top);
  browser.fire.connect(framed);
  top.say({ type: 'nocturneReport', want: true, count: 1 });
  framed.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.deepEqual(framed.spoken, [], 'the page’s own film holds the page');

  // The page’s film is gone: the framed ask is the only one in force, and
  // it takes the seat the page was holding. The top itself is never sent
  // a word — it believes `granted` on its own.
  top.say({ type: 'nocturneReport', want: false, count: 0 });
  assert.deepEqual(framed.spoken, [{ type: VERDICT, granted: true }]);
  assert.deepEqual(top.spoken, []);
});

test('count-only frames count but hold no seat', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  const counter = makePort(1, 1);
  const wanter = makePort(1, 2);
  browser.fire.connect(counter);
  browser.fire.connect(wanter);

  // Two films, no seat asked: the count belongs in the book (the popup
  // reads it), but the verdict loop owes this frame nothing — only a
  // frame that wants the seat can hold it.
  counter.say({ type: 'nocturneReport', want: false, count: 2 });
  counter.say({ type: 'nocturneReport', want: false, count: 2 });
  assert.deepEqual(counter.spoken, []);

  wanter.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.deepEqual(wanter.spoken, [{ type: VERDICT, granted: true }]);
  const book = hub.books.get(1).book;
  assert.equal(book.get(1).count, 2);
  assert.equal(book.get(1).seat, null);
});

test('the hub answers the count with one voice, its own', async () => {
  const browser = makeBrowser();
  createFrameHub(browser);

  const top = makePort(1, 0);
  const framed = makePort(1, 1);
  browser.fire.connect(top);
  browser.fire.connect(framed);
  top.say({ type: 'nocturneReport', want: false, count: 2 });
  framed.say({ type: 'nocturneReport', want: true, count: 1 });

  // One ask, one answer for the whole tab — the top’s films and every
  // frame’s hearsay, summed from the hot book with no round trip.
  const [answer] = await browser.fire.message(
    { type: STATE_QUERY, tabId: 1 },
    {},
  );
  assert.deepEqual(answer, { videoCount: 3, streams: 0 });

  // A frame asking here is answered nothing: the hub alone speaks for
  // the book, and the speaker’s envelope is how the two callers apart.
  const [refused] = await browser.fire.message(
    { type: STATE_QUERY, tabId: 1 },
    { tab: { id: 1 } },
  );
  assert.equal(refused, false);

  // A tab of nobodies answers zero — the book is the record, not a guess.
  const [empty] = await browser.fire.message(
    { type: STATE_QUERY, tabId: 2 },
    {},
  );
  assert.deepEqual(empty, { videoCount: 0, streams: 0 });
});

test('a tab going away leaves nothing in the book', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  const staying = makePort(1, 1);
  const passing = makePort(2, 1);
  browser.fire.connect(staying);
  browser.fire.connect(passing);
  staying.say({ type: 'nocturneReport', want: true, count: 1 });
  passing.say({ type: 'nocturneReport', want: true, count: 1 });
  assert.equal(hub.books.get(2).book.size, 1);

  browser.fire.removed(2);
  assert.equal(hub.books.has(2), false);
  assert.equal(hub.books.has(1), true);
});

test('a channel without a vouched sender is shown the door', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  // An extension page’s own connect — the popup, the options — has no
  // tab on its envelope.
  const pageless = makePort(7, 1);
  pageless.sender = {};
  browser.fire.connect(pageless);
  assert.equal(pageless.dropped, true);
  assert.equal(hub.books.size, 0);

  // And a frame number the browser did not attest is trusted just as
  // little.
  const frameless = makePort(7, 1);
  frameless.sender = { tab: { id: 7 } };
  browser.fire.connect(frameless);
  assert.equal(frameless.dropped, true);
  assert.equal(hub.books.size, 0, 'nobody else reached the book');
});

test('a media strain founds a ghost seat', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  // An about:blank or srcdoc embed runs no content script — there is no
  // port, no envelope, no word of its own — but the eye at the bus sees
  // the request the element made, attested to its frameId all the same.
  hub.strain(1, 3);
  const ghost = hub.books.get(1).book.get(3);
  assert.equal(ghost.port, null);
  assert.equal(ghost.stream, true);
  assert.equal(ghost.want, false);
  assert.equal(ghost.count, 0);

  // The strain is warm by the stream’s own continuation, not by a clock:
  // every later crossing finds the seat already warm and says nothing
  // new.
  hub.strain(1, 3);
  assert.equal(hub.books.get(1).book.get(3).stream, true);
});

test('a ghost’s context is adopted by whoever comes home', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  hub.strain(1, 3);
  const ghost = makePort(1, 3);
  browser.fire.connect(ghost);
  const entry = hub.books.get(1).book.get(3);
  assert.equal(entry.port, ghost);

  // The frame’s document has a script standing now, and it kept the
  // warmth the wire wrote for its seat — the context is the frame’s, not
  // any document’s, so the popup’s context line reads the same frame it
  // read before the port ever stood.
  assert.equal(entry.stream, true);

  // The adoption alone says no wake word: the new document reports its
  // own state at boot already, and a stream that re-crosses the bus
  // would find the seat warm — the knock is for entries born cold.
  assert.deepEqual(ghost.spoken, []);
});

test('the strain knocks a cold frame’s sweep awake, once per entry', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  const one = makePort(1, 1);
  browser.fire.connect(one);
  hub.strain(1, 1);
  assert.deepEqual(one.spoken, [{ type: STRAIN }]);

  // A stream in play re-crosses the bus every few seconds; the entry is
  // already warm, so the continuing cadence pays the port nothing.
  hub.strain(1, 1);
  hub.strain(1, 1);
  assert.equal(one.spoken.length, 1);
});

test('the popup hears the context line beyond the count', async () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  // Two ghost streams the DOM cannot confirm, and one counted frame
  // that also runs a stream of its own — the counted frame’s context is
  // already spoken by its count, so it repeats no line.
  hub.strain(1, 2);
  hub.strain(1, 3);
  const counted = makePort(1, 1);
  browser.fire.connect(counted);
  counted.say({ type: 'nocturneReport', want: false, count: 2 });
  hub.strain(1, 1);

  const [answer] = await browser.fire.message(
    { type: STATE_QUERY, tabId: 1 },
    {},
  );
  assert.deepEqual(answer, { videoCount: 2, streams: 2 });
});

const wireEar = {
  url: 'https://cdn.example/master.m3u8',
  resource: 'xmlhttprequest',
  doc: 'https://site.example/watch',
  chain: ['https://site.example/'],
  // The crossing’s manifest names a family the sweep believes in.
  shape: 'hls',
};

test('the dossier rides the port once, despite the roads', async () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  // The wire first: the strain lands before any port exists, so the
  // entry is founded already carrying its dossier — and the freshly
  // conscripted frame that connects hears it on arrival, unprompted.
  hub.strain(1, 1, wireEar);
  const one = makePort(1, 1);
  browser.fire.connect(one);
  assert.deepEqual(one.spoken, [
    {
      type: DOSSIER,
      url: 'https://cdn.example/master.m3u8',
      resource: 'xmlhttprequest',
      doc: 'https://site.example/watch',
      chain: ['https://site.example/'],
      shape: 'hls',
    },
  ]);

  // The cadence catches up with the word: a later strain finds the
  // dossier told and adds nothing.
  hub.strain(1, 1, wireEar);
  assert.equal(one.spoken.length, 1);
});

test('a dossier earned as a ghost is told to whoever comes home', () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  // The wordless first crossing warms the seat; the next crossing that
  // spoke carries the dossier, held by the ghost.
  hub.strain(1, 3);
  hub.strain(1, 3, wireEar);

  const ghost = makePort(1, 3);
  browser.fire.connect(ghost);
  assert.equal(ghost.spoken.length, 1, 'the context arrives with the seat');
  assert.deepEqual(ghost.spoken[0].type, DOSSIER);

  // A document born again comes home through the wire’s own cadence: the
  // stream picked up in the remade document crosses the bus first, the
  // seat is warmed and told anew, and the re-conscripted port hears the
  // dossier on arrival — one word per generation, not per frame
  // lifetime.
  ghost.leave();
  assert.equal(hub.standing(1, 3), false);
  hub.strain(1, 3, wireEar);
  const again = makePort(1, 3);
  browser.fire.connect(again);
  assert.equal(again.spoken.length, 1);
  assert.deepEqual(again.spoken[0].type, DOSSIER);
});

test('standing answers only where a port is alive', async () => {
  const browser = makeBrowser();
  const hub = createFrameHub(browser);

  // The wire warmed a ghost: no port, so nothing for the recruiter to
  // skip. The boot must land despite the warmth.
  hub.strain(1, 1, wireEar);
  assert.equal(hub.standing(1, 1), false);
  assert.equal(hub.standing(1, 4), false);
  assert.equal(hub.standing(9, 1), false);

  const one = makePort(1, 1);
  browser.fire.connect(one);
  assert.equal(hub.standing(1, 1), true);

  // And the death is the standing’s end — the recruiter asks nothing of
  // a frame the hub has already said goodbye to.
  one.leave();
  assert.equal(hub.standing(1, 1), false);
});

// The cipher’s words cross the port only after the worker’s own awaits
// have run: the settles here wait out a few turns of the task queue so
// the answer is in the book before the assertion looks at it.
const settle = async () => {
  for (let at = 0; at < 6; at += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
};

// A worker stood up to the two verbs the hub routes: what it read is
// recorded, and what it hands back for a segment is an honest buffer.
const makeWorker = (answer = null) => {
  const worker = {
    reads: [],
    readCipher: async (url) => {
      worker.reads.push(url);
      return answer;
    },
    giveSegment: async () => new TextEncoder().encode('fed').buffer,
  };
  return worker;
};

test('a manifest crossing is read, its word told once per entry', async () => {
  const answer = {
    cipher: 'aes-128',
    plan: {
      url: 'https://cdn.example/master.m3u8',
      codecs: 'avc1.640028,mp4a.40.2',
      init: 'https://cdn.example/init.mp4',
      segments: [{ url: 'https://cdn.example/seg0.mp4', seq: 41 }],
    },
  };
  const browser = makeBrowser();
  const worker = makeWorker(answer);
  const hub = createFrameHub(browser, worker);

  const one = makePort(1, 1);
  browser.fire.connect(one);

  // The crossing: an hls-shaped ear names a manifest, the hub reads it
  // with the worker’s hands, and the frame hears the cipher and — only
  // when the stream is one the frame can honestly play — the plan. The
  // port stood before the strain, so the entry earns its dossier and
  // its knock on the same word’s way through.
  hub.strain(1, 1, wireEar);
  await settle();
  assert.deepEqual(worker.reads, ['https://cdn.example/master.m3u8']);
  assert.deepEqual(one.spoken, [
    {
      type: DOSSIER,
      url: 'https://cdn.example/master.m3u8',
      resource: 'xmlhttprequest',
      doc: 'https://site.example/watch',
      chain: ['https://site.example/'],
      shape: 'hls',
    },
    { type: STRAIN },
    { type: CIPHER, cipher: 'aes-128', url: 'https://cdn.example/master.m3u8' },
    {
      type: CIPHER_PLAN,
      url: 'https://cdn.example/master.m3u8',
      codecs: 'avc1.640028,mp4a.40.2',
      init: 'https://cdn.example/init.mp4',
      segments: [{ url: 'https://cdn.example/seg0.mp4', seq: 41 }],
    },
  ]);

  // A stream in play re-crosses the bus every few seconds: one read one
  // tell per entry, the continuing cadence pays nothing.
  hub.strain(1, 1, wireEar);
  await settle();
  assert.equal(worker.reads.length, 1);
  assert.equal(one.spoken.length, 4);

  // A crossing that named another family is never read at all.
  hub.strain(1, 2, { ...wireEar, shape: 'dash' });
  await settle();
  assert.equal(worker.reads.length, 1);

  // A worker the hub was never given (the tests', or an old caller’s)
  // reads nothing and says nothing.
  const second = makePort(1, 9);
  browser.fire.connect(second);
  createFrameHub(browser).strain(1, 9, wireEar);
  await settle();
  assert.deepEqual(second.spoken, []);
});

test('a ghost’s manifest is read when a hand comes home', async () => {
  const browser = makeBrowser();
  const worker = makeWorker({ cipher: 'sample-aes', plan: null });
  const hub = createFrameHub(browser, worker);

  // The wordless seat: a ghost the wire warmed but nobody lives in — no
  // port, so nothing to say the word to, and the read is owed nobody.
  hub.strain(1, 3, wireEar);
  await settle();
  assert.deepEqual(worker.reads, []);

  // The hand comes home: the read runs off the word the seat was warmed
  // with (not a fresh fetch the wire owes again), and the frame hears
  // the cipher — a sample-aes stream named honestly, with no plan said.
  const ghost = makePort(1, 3);
  browser.fire.connect(ghost);
  await settle();
  assert.deepEqual(worker.reads, ['https://cdn.example/master.m3u8']);
  assert.deepEqual(ghost.spoken[0].type, DOSSIER);
  assert.deepEqual(ghost.spoken[1], {
    type: CIPHER,
    cipher: 'sample-aes',
    url: 'https://cdn.example/master.m3u8',
  });

  // The seat the document held is dead: a document born again re-enters
  // at the back, cipher word untold — the word is per generation, so
  // the remade document hears it again on arrival.
  ghost.leave();
  hub.strain(1, 3, wireEar);
  const again = makePort(1, 3);
  browser.fire.connect(again);
  await settle();
  assert.deepEqual(
    again.spoken.map((word) => word.type),
    [DOSSIER, CIPHER],
  );
});

test('a segment ask is answered with bytes, or with a miss', async () => {
  const browser = makeBrowser();
  const worker = makeWorker();
  createFrameHub(browser, worker);

  const one = makePort(1, 1);
  browser.fire.connect(one);

  one.say(askCipherSegment('https://cdn.example/seg0.mp4'));
  await settle();
  assert.deepEqual(one.spoken, [
    {
      type: CIPHER_BYTES,
      url: 'https://cdn.example/seg0.mp4',
      bytes: new TextEncoder().encode('fed').buffer,
    },
  ]);

  // A worker that cannot answer — it falls — answers with an honest
  // null: the ask is never an error at the caller. It rides its own
  // browser and its own port: two hubs never share a wire.
  const falling = {
    giveSegment: async () => {
      throw new Error('the wire buckled');
    },
  };
  const other = makeBrowser();
  createFrameHub(other, falling);
  const two = makePort(1, 2);
  other.fire.connect(two);
  two.say(askCipherSegment('https://cdn.example/seg0.mp4'));
  await settle();
  assert.deepEqual(two.spoken, [
    {
      type: CIPHER_BYTES,
      url: 'https://cdn.example/seg0.mp4',
      bytes: null,
    },
  ]);

  // A word that is not an ask routes nowhere: the report’s own grammar
  // still holds, and no answer is owed to a word the hub never asked.
  one.say({ type: 'nocturneCipherBytes', url: '', bytes: null });
  assert.equal(one.spoken.length, 1);
});

test('a frame’s line is printed in the background’s own console', () => {
  const browser = makeBrowser();
  createFrameHub(browser);
  const printed = [];
  const original = console.info;
  console.info = (...parts) => printed.push(parts.join(' '));

  try {
    const one = makePort(1, 7);
    browser.fire.connect(one);

    // The line rides up whole and is stamped with the frame’s own
    // coordinates at its head — every frame’s words, one scroll.
    one.say(sayLine('Nocturne: [aes] the plan arrived, 3 segments'));
    assert.equal(
      printed.at(-1),
      'Nocturne: [tab 1 frame 7] Nocturne: [aes] the plan arrived, 3 segments',
    );

    // The line takes no books and says nothing back: the hub is no
    // recorder, only a room with a console.
    const before = printed.length;
    one.say({ type: 'nocturneLine' });
    one.say(null);
    assert.equal(printed.length, before, 'the malformed is refused, not said');
  } finally {
    console.info = original;
  }
});
