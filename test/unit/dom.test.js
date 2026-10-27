import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { createDomManager } from '../../src/content/dom.js';

// The quiet realm’s hands: `makeObserved` below fixes them on the test
// global so the eyes' hours can be run and counted by name.
/* global runRest, restCount */

// A realm trimmed to the two eyes and the two hearings the manager
// stands: a MutationObserver and an IntersectionObserver remembered by
// their constructions, and a document and window that keep what they
// were told to hear so tests can say the words by hand.
const makeObserved = () => {
  const records = [];
  globalThis.MutationObserver = class {
    constructor(listener) {
      this.listener = listener;
      this.observations = [];
      this.disconnects = 0;
      records.push(this);
    }
    observe(target, options) {
      this.observations.push({ target, options });
    }
    disconnect() {
      this.disconnects += 1;
      this.observations.length = 0;
    }
  };
  globalThis.IntersectionObserver = class {
    constructor(listener, options) {
      this.listener = listener;
      this.options = options;
      this.observed = [];
      this.disconnects = 0;
      records.push(this);
    }
    observe(element) {
      this.observed.push(element);
    }
    unobserve(element) {
      this.observed = this.observed.filter((each) => each !== element);
    }
    disconnect() {
      this.disconnects += 1;
      this.observed.length = 0;
    }
  };
  // The quiet is a ledger too: every work rests with an id, and its
  // hour is run (or cancelled) by hand.
  let rests = 0;
  const held = new Map();
  globalThis.requestIdleCallback = (work, options) => {
    rests += 1;
    held.set(rests, { work, options });
    return rests;
  };
  globalThis.cancelIdleCallback = (id) => {
    held.delete(id);
  };
  globalThis.runRest = (id) => {
    const rest = held.get(id);
    if (rest === undefined) return false;
    held.delete(id);
    rest.work();
    return true;
  };
  globalThis.restCount = () => held.size;
  return records;
};

const clearObserved = () => {
  delete globalThis.MutationObserver;
  delete globalThis.IntersectionObserver;
  delete globalThis.requestIdleCallback;
  delete globalThis.cancelIdleCallback;
};

const makeStreet = () => {
  const listeners = new Map();
  const street = {
    addEventListener: (type, handler) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener: (type, handler) => {
      const held = listeners.get(type) ?? [];
      const at = held.indexOf(handler);
      if (at !== -1) held.splice(at, 1);
    },
    say: (type) => {
      if (!listeners.has(type)) return;
      for (const handler of [...listeners.get(type)]) handler();
    },
    hears: (type) => (listeners.get(type) ?? []).length,
  };
  return street;
};

const makeDoc = () => {
  const street = makeStreet();
  return { ...street, hidden: false, documentElement: {} };
};

const makeHome = () => makeStreet();

// The beat answered off a ledger rather than a clock: an arm holds the
// one work it was given (five asks are one arm), and the test fires it
// by hand.
const makeClock = () => {
  let pending = null;
  return {
    arm: (fire) => {
      pending = fire;
      return 'armed';
    },
    drop: () => {
      pending = null;
    },
    fire: () => {
      if (pending === null) return;
      const fire = pending;
      pending = null;
      fire();
    },
    get pending() {
      return pending;
    },
  };
};

const film = () => ({ isConnected: true });

afterEach(clearObserved);

test('the eye opens for the first ear and closes behind the last', () => {
  const record = makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);
  const heard = [];
  assert.equal(record.length, 0, 'no eye before an ear');

  const off = manager.onMove(() => heard.push('a move'));
  assert.equal(record.length, 1);
  assert.deepEqual(record[0].observations, [
    {
      target: doc.documentElement,
      options: { childList: true, subtree: true },
    },
  ]);
  assert.equal(doc.hears('visibilitychange'), 1);
  assert.equal(home.hears('resize'), 1);

  off();
  assert.equal(record[0].disconnects, 1, 'the eye stands down');
  assert.equal(doc.hears('visibilitychange'), 0);
  assert.equal(home.hears('resize'), 0);
  assert.equal(clock.pending, null, 'no beat outlives the last ear');
});

test('a burst of asks is one beat', () => {
  makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);
  const heard = [];
  manager.onMove(() => heard.push('a move'));

  manager.ask();
  manager.ask();
  manager.ask();
  manager.ask();
  assert.notEqual(clock.pending, null, 'the burst is one arm');
  assert.equal(heard.length, 0);

  clock.fire();
  assert.equal(heard.length, 1, 'the burst is one hearing');
  assert.equal(clock.pending, null, 'the slot is empty after its work');
});

test('a move on an unseen page sits out until the page is seen again', () => {
  makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);
  const heard = [];
  manager.onMove(() => heard.push('a move'));

  doc.hidden = true;
  manager.ask();
  assert.equal(clock.pending, null, 'the hidden page owes no beat');

  doc.hidden = false;
  doc.say('visibilitychange');
  assert.notEqual(clock.pending, null, 'the seen page re-arms the beat');
  clock.fire();
  assert.equal(heard.length, 1);

  // A beat that comes due while the page has gone dark again is sat out
  // too, and only the seeing re-arms it.
  manager.ask();
  doc.hidden = true;
  clock.fire();
  assert.equal(heard.length, 1, 'the dark beat was never heard');
  doc.hidden = false;
  doc.say('visibilitychange');
  clock.fire();
  assert.equal(heard.length, 2);
});

test('a film drawing near is a move, and asking twice is one watch', () => {
  const record = makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);
  const heard = [];
  manager.onMove(() => heard.push('a move'));

  const main = film();
  manager.keepNear(main);
  manager.keepNear(main);
  assert.equal(record.length, 2, 'the eye and the approach eye');
  assert.deepEqual(
    record[1].options,
    { scrollMargin: '25%' },
    'the margin past the screen is the native one',
  );
  assert.deepEqual(record[1].observed, [main], 'one watch for two asks');

  record[1].listener();
  assert.notEqual(clock.pending, null, 'the crossing asked for a beat');
  clock.fire();
  assert.equal(heard.length, 1);
});

test('an element the page has forgotten is swept off the beat', () => {
  const record = makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);
  manager.onMove(() => {});

  const gone = film();
  manager.keepNear(gone);
  assert.deepEqual(record[1].observed, [gone]);

  gone.isConnected = false;
  manager.ask();
  clock.fire();
  assert.deepEqual(
    record[1].observed,
    [],
    'the forgotten watch is not carried',
  );
  assert.equal(record[1].disconnects, 0, 'the eye stands for whoever is left');
});

test('the last ear leaving stands the approach eye down too', () => {
  const record = makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);
  const off = manager.onMove(() => {});

  manager.keepNear(film());
  off();
  assert.equal(record[1].disconnects, 1, 'the approach eye went with it');
});

test('the page’s quiet does the work once, however many hands ask', () => {
  makeObserved();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc);
  const done = [];
  const work = () => done.push('the quiet ran');

  const firstOff = manager.atEase(work);
  manager.atEase(work);
  assert.equal(restCount(), 1, 'the second hand asked one rest, not two');
  assert.equal(runRest(1), true, 'the work rests with an hour');
  assert.deepEqual(done, ['the quiet ran']);

  // After the hour, the asking is a new rest: once per asking.
  manager.atEase(work);
  assert.equal(restCount(), 1);
  runRest(2);
  assert.deepEqual(done, ['the quiet ran', 'the quiet ran']);

  // The hour never reached: the live hand’s word takes the work off,
  // and a word made stale by a newer asking is silent — it must not
  // take someone else’s rest down.
  manager.atEase(work);
  firstOff();
  assert.equal(restCount(), 1, 'a stale word takes nobody’s rest down');
  manager.atEase(work)(); // the live word, said and spent at once
  assert.equal(restCount(), 0, 'the rest was cancelled, not left');
  assert.equal(done.length, 2);
});

test('the count of moves stamps the page’s answers', () => {
  makeObserved();
  const clock = makeClock();
  const doc = makeDoc();
  const home = makeHome();
  const manager = createDomManager(home, doc, clock);

  manager.onMove(() => {});
  assert.equal(
    manager.turn(),
    1,
    'the story’s resumption is its own move counted',
  );

  manager.ask();
  clock.fire();
  assert.equal(manager.turn(), 2, 'one move said, one count');

  // A dark page says no beats: the moves it makes are counted when it
  // is seen again, as one.
  doc.hidden = true;
  manager.ask();
  clock.fire();
  assert.equal(manager.turn(), 2, 'the darkness added nothing');
  doc.hidden = false;
  doc.say('visibilitychange');
  clock.fire();
  assert.equal(manager.turn(), 3, 'the seeing is one move again');
});
