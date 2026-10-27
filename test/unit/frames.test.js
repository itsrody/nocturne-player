import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chainHosts,
  createClaimant,
  createJudge,
  mintTicket,
} from '../../src/content/frames.js';
import { SLOT_TAG, createSlotKeeper } from '../../src/content/slot.js';

// A window trimmed to what the two ends of the protocol do with it: listen
// for messages and deliver them. Deliveries are made by hand instead of by
// the event loop of a real browser.
const makeWindow = () => {
  const handlers = [];
  const arrived = [];
  const home = {
    handlers,
    arrived,
    // A window with no children, until a test gives it a family: the judge
    // credits a claim only to a window it finds in its own tree.
    frames: [],
    addEventListener: (type, handler) => {
      if (type === 'message') handlers.push(handler);
    },
    deliver: (source, data) => {
      arrived.push({ source, data });
      for (const handler of [...handlers]) handler({ source, data });
    },
  };
  // Posts landing on a window carry the window they were posted through as
  // their source.
  home.postMessage = (data) => home.deliver(home.receivesAs ?? home, data);
  return home;
};

// A frame's view of the top window: a door whose posts arrive carrying the
// frame's own name, since that is what a browser's window proxy does.
const joinsThe = (top) => {
  const home = makeWindow();
  const proxy = {
    postMessage: (data) => top.deliver(home, data),
  };
  home.top = proxy;
  home.receivesAs = proxy;
  // The tree answers for itself: the judge locates a claimant in the
  // frames of its own document, so the claimant's window is registered
  // with the top it is claimed against.
  top.frames.push(home);
  return home;
};

const seatOf = (home, ticket) => {
  const seated = [];
  const claimant = createClaimant(home, ticket, (granted) =>
    seated.push(granted),
  );
  return { claimant, seated };
};
test('the first claim takes the seat and the second waits', () => {
  const top = makeWindow();
  createJudge(top, { ownWant: () => false });

  const one = seatOf(joinsThe(top), mintTicket());
  const two = seatOf(joinsThe(top), mintTicket());

  one.claimant.setWant(true);
  assert.deepEqual(one.seated, [true]);

  two.claimant.setWant(true);
  assert.deepEqual(two.seated, []);

  // Releasing the seat hands it to the one that waited.
  one.claimant.setWant(false);
  assert.deepEqual(two.seated, [true]);

  one.claimant.setWant(false);
  two.claimant.setWant(false);
});

test('a claim gone quiet loses the seat to a fresh one', () => {
  let moment = 0;
  const top = makeWindow();
  createJudge(top, { ownWant: () => false, now: () => moment });

  const stale = seatOf(joinsThe(top), mintTicket());
  const fresh = seatOf(joinsThe(top), mintTicket());

  stale.claimant.setWant(true);
  assert.deepEqual(stale.seated, [true]);

  // The frame that held the seat went quiet: past the window the judge
  // forgets it by, the next claim that arrives takes the seat over.
  moment += 12000;
  fresh.claimant.setWant(true);
  assert.deepEqual(fresh.seated, [true]);

  stale.claimant.setWant(false);
  fresh.claimant.setWant(false);
});

test(`the top frame's own film outranks the framed ones`, () => {
  let topWants = false;
  const top = makeWindow();
  createJudge(top, { ownWant: () => topWants });

  const framed = seatOf(joinsThe(top), mintTicket());

  framed.claimant.setWant(true);
  assert.deepEqual(framed.seated, [true]);

  // The page's own video appears while the seat is out: the page put it
  // there to be seen, so the seat is not the frame's any more.
  topWants = true;
  framed.claimant.setWant(false);
  framed.claimant.setWant(true);
  assert.deepEqual(framed.seated, [true, false]);

  framed.claimant.setWant(false);
});

test('a verdict is only taken from the judge and only for our ticket', () => {
  const top = makeWindow();
  const stranger = makeWindow();

  const framed = joinsThe(top);
  const ticket = mintTicket();
  const granted = [];
  const claimant = createClaimant(framed, ticket, (seated) =>
    granted.push(seated),
  );
  claimant.setWant(true);
  // Nobody hears the claim here (the top window has no judge), so there is
  // nothing to believe yet.
  assert.deepEqual(granted, []);

  // A ticket that is not ours says nothing to us, whoever sends it.
  framed.deliver(framed.top, { nocturneClaim: 'forged', granted: true });
  assert.deepEqual(granted, []);

  // The judge, by our own ticket, can seat us.
  framed.deliver(framed.top, { nocturneClaim: ticket, granted: true });
  assert.deepEqual(granted, [true]);

  // A message from anywhere but the judge is not a verdict: a stranger
  // cannot take the seat away by talking like one.
  framed.deliver(stranger, { nocturneClaim: ticket, granted: false });
  assert.deepEqual(granted, [true]);

  // The judge alone may take the seat back, and by our own ticket.
  framed.deliver(framed.top, { nocturneClaim: ticket, granted: false });
  assert.deepEqual(granted, [true, false]);

  claimant.setWant(false);
});

test('the page answers for its films in one voice', () => {
  let moment = 0;
  const top = makeWindow();
  const judge = createJudge(top, { ownWant: () => false, now: () => moment });

  const one = joinsThe(top);
  const claimOne = createClaimant(one, mintTicket(), () => undefined, {
    getCount: () => 2,
  });
  claimOne.setWant(true);
  assert.equal(judge.totalCount(), 2);

  // A second frame reporting a film of its own adds its hearsay; a seat is
  // one thing, a count is another.
  const two = joinsThe(top);
  const claimTwo = createClaimant(two, mintTicket(), () => undefined, {
    getCount: () => 1,
  });
  claimTwo.setWant(true);
  assert.equal(judge.totalCount(), 3);

  // A claim past its window has stopped beating and says nothing.
  moment += 12000;
  judge.decide();
  assert.equal(judge.totalCount(), 0);

  claimOne.end();
  claimTwo.end();
});

test('a claim from nobody\\u2019s child is an answerless door', () => {
  const top = makeWindow();
  const judge = createJudge(top, { ownWant: () => false });

  // A window the top does not host — a page opened by the viewer, say —
  // can spell our words, but the judge finds no frame for it and nothing
  // is seated and nothing is counted.
  const stranger = makeWindow();
  const granted = [];
  const claimant = createClaimant(stranger, mintTicket(), (next) =>
    granted.push(next),
  );
  claimant.setWant(true);
  assert.deepEqual(granted, []);
  assert.equal(judge.totalCount(), 0);

  claimant.end();
});

test('the chain of origins is the host list, nearest first', () => {
  assert.deepEqual(
    chainHosts({
      host: 'film.example',
      ancestorOrigins: {
        length: 3,
        0: 'https://embed.example',
        1: 'https://top.example',
        2: 'null',
      },
    }),
    ['film.example', 'embed.example', 'top.example'],
  );

  // A guest with no name says nothing for itself; the named ancestors
  // decide, and the opaque word 'null' is not a URL and carries no host.
  assert.deepEqual(
    chainHosts({
      host: '',
      ancestorOrigins: { length: 2, 0: 'https://top.example', 1: 'null' },
    }),
    ['top.example'],
  );

  // A page's own chain repeats nobody.
  assert.deepEqual(
    chainHosts({
      host: 'top.example',
      ancestorOrigins: { length: 1, 0: 'https://top.example' },
    }),
    ['top.example'],
  );
});

test('a session asks up for the room, and says when the room is free', () => {
  const parent = makeWindow();
  const framed = makeWindow();
  framed.parent = { postMessage: (data) => parent.deliver(framed, data) };

  const claimant = createClaimant(framed, 'ticket', () => undefined);
  claimant.slot(true);

  const words = parent.arrived.map((post) => post.data);
  assert.equal(words[0][SLOT_TAG], 'ticket');
  assert.equal(words[0].open, true);

  claimant.slot(false);
  const last = parent.arrived.at(-1).data;
  assert.equal(last[SLOT_TAG], 'ticket');
  assert.equal(last.open, false);

  claimant.end();
});

test('the child of the house is what gets the width', () => {
  // The rewrites stand behind the slot the way the video style's guard
  // does; the stand-in only has to exist for the room to be held.
  globalThis.MutationObserver = class {
    constructor() {
      this.observed = null;
    }
    observe(element, options) {
      this.observed = { element, options };
    }
    disconnect() {
      this.observed = null;
    }
  };

  const child = {};
  const written = [];
  const iframe = {
    contentWindow: child,
    style: {
      setProperty: (name, value, weight) =>
        written.push({ name, value, weight }),
    },
    getAttribute: () => 'width:300px',
    setAttribute(name, value) {
      this.width = value;
    },
    removeAttribute() {
      this.width = '';
    },
  };
  const doc = { querySelectorAll: () => [iframe] };

  // A framing document with a parent above it: the word this node hears
  // from its child is widened here and passed on from here.
  const upper = makeWindow();
  const host = makeWindow();
  host.parent = { postMessage: (data) => upper.deliver(host, data) };

  createSlotKeeper(host, doc);
  host.deliver(child, { [SLOT_TAG]: 'ticket', open: true });

  assert.deepEqual(written[0], {
    name: 'position',
    value: 'fixed',
    weight: 'important',
  });
  assert.deepEqual(written[1], {
    name: 'inset',
    value: '0',
    weight: 'important',
  });
  assert.equal(upper.arrived.length, 1, 'the word went up a hop');

  // And the page gets its own slot back, in the words it gave it.
  host.deliver(child, { [SLOT_TAG]: 'ticket', open: false });
  assert.equal(iframe.width, 'width:300px');
});
