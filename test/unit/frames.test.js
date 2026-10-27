import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chainHosts,
  createClaimant,
  createJudge,
  mintTicket,
} from '../../src/content/frames.js';
import { createSlotKeeper } from '../../src/content/slot.js';
import { CLAIM_TAG, SLOT_TAG } from '../../src/lib/words.js';
// A window trimmed to what the two ends of the protocol do with it: listen
// for messages and deliver them. Deliveries are made by hand instead of by
// the event loop of a real browser, and the target a post was aimed at is
// kept in the record — the rails aim their words now, and the tests say
// where.
const makeWindow = () => {
  const handlers = [];
  const partings = [];
  const arrived = [];
  const home = {
    handlers,
    partings,
    arrived,
    // A window with no children, until a test gives it a family: the judge
    // credits a claim only to a window it finds in its own tree.
    frames: [],
    // A realm without a chain to read: words out of such a window fall
    // back to the '*' the rails answer for.
    location: { ancestorOrigins: [] },
    addEventListener: (type, handler) => {
      if (type === 'message') handlers.push(handler);
      else partings.push([type, handler]);
    },
    // The document's own going away — the goodbye's word — is fired by
    // hand, the way a browser fires pagehide when an element leaves.
    fire: (type, event) => {
      for (const [kind, handler] of [...partings]) {
        if (kind === type) handler(event);
      }
    },
    deliver: (source, data, target, transfer) => {
      arrived.push({ source, data, target, transfer });
      for (const handler of [...handlers]) {
        handler({ source, data, origin: target, ports: transfer });
      }
    },
  };
  // Posts landing on a window carry the window they were posted through as
  // their source, the target they were aimed at, and — when a word carries
  // a pair's end to its far side — the ports it handed over.
  home.postMessage = (data, target, transfer) =>
    home.deliver(home.receivesAs ?? home, data, target, transfer);
  return home;
};

// A frame's view of the top window: a door whose posts arrive carrying the
// frame's own name, since that is what a browser's window proxy does.
const joinsThe = (top, chain = ['https://top.example']) => {
  const home = makeWindow();
  const proxy = {
    postMessage: (data, target, transfer) =>
      top.deliver(home, data, target, transfer),
  };
  home.top = proxy;
  home.receivesAs = proxy;
  // The enclosing page names itself — the one entry of a one-deep tree —
  // and that name is the address the frame's words are aimed at.
  home.location = { ancestorOrigins: chain };
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

// A pair's word is a task of its own: the entanglement delivers between
// turns of the event loop, so a test that wants the rail's answer waits
// out a few ticks before it reads.
const settled = async () => {
  for (let tick = 0; tick < 10; tick += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};
test('the first claim takes the seat and the second waits', async () => {
  const top = makeWindow();
  createJudge(top, { ownWant: () => false });

  const one = seatOf(joinsThe(top), mintTicket());
  const two = seatOf(joinsThe(top), mintTicket());

  one.claimant.setWant(true);
  await settled();
  assert.deepEqual(one.seated, [true]);

  two.claimant.setWant(true);
  await settled();
  assert.deepEqual(two.seated, []);

  // Releasing the seat hands it to the one that waited.
  one.claimant.setWant(false);
  await settled();
  assert.deepEqual(two.seated, [true]);

  one.claimant.setWant(false);
  two.claimant.setWant(false);
  one.claimant.end();
  two.claimant.end();
});

test('a claim gone quiet loses the seat to a fresh one', async () => {
  let moment = 0;
  const top = makeWindow();
  createJudge(top, { ownWant: () => false, now: () => moment });

  const stale = seatOf(joinsThe(top), mintTicket());
  const fresh = seatOf(joinsThe(top), mintTicket());

  stale.claimant.setWant(true);
  await settled();
  assert.deepEqual(stale.seated, [true]);

  // The frame that held the seat went quiet: past the window the judge
  // forgets it by, the next claim that arrives takes the seat over.
  moment += 12000;
  fresh.claimant.setWant(true);
  await settled();
  assert.deepEqual(fresh.seated, [true]);

  stale.claimant.setWant(false);
  fresh.claimant.setWant(false);
  stale.claimant.end();
  fresh.claimant.end();
});

test(`the top frame's own film outranks the framed ones`, async () => {
  let topWants = false;
  const top = makeWindow();
  createJudge(top, { ownWant: () => topWants });

  const framed = seatOf(joinsThe(top), mintTicket());

  framed.claimant.setWant(true);
  await settled();
  assert.deepEqual(framed.seated, [true]);

  // The page's own video appears while the seat is out: the page put it
  // there to be seen, so the seat is not the frame's any more.
  topWants = true;
  framed.claimant.setWant(false);
  framed.claimant.setWant(true);
  await settled();
  assert.deepEqual(framed.seated, [true, false]);

  framed.claimant.setWant(false);
  framed.claimant.end();
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
  claimant.end();
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

test('a claim from nobody\u2019s child is an answerless door', () => {
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

test('every word on the rails names the window it belongs to', () => {
  const top = makeWindow();
  createJudge(top, { ownWant: () => false });

  // Two hops up: the chain reads nearest first, so the parent's name is
  // its first entry and the top's its last.
  const framed = joinsThe(top, [
    'https://parent.example',
    'https://top.example',
  ]);

  // A claim beats at the top, by the top's name — not a broadcast.
  const broadcast = seatOf(framed, 'ticket-one');
  broadcast.claimant.setWant(true);
  const claim = top.arrived[0];
  assert.equal(claim.data.nocturneClaim, 'ticket-one');
  assert.equal(claim.target, 'https://top.example');
  broadcast.claimant.setWant(false);
  broadcast.claimant.end();

  // And the verdict goes back the same way: named to the origin the claim
  // arrived from — the address carried on the claimant's own words.
  const answered = seatOf(framed, 'ticket-two');
  top.deliver(
    framed,
    { nocturneClaim: 'ticket-two', want: true },
    'https://parent.example',
  );
  assert.deepEqual(answered.seated, [true]);
  const verdict = framed.arrived.at(-1);
  assert.equal(verdict.data.granted, true);
  assert.equal(verdict.target, 'https://parent.example');

  answered.claimant.end();
});

test('the slot word climbs by the name of the window it climbs to', () => {
  const parent = makeWindow();
  const framed = makeWindow();
  framed.location = { ancestorOrigins: ['https://parent.example'] };
  const posted = [];
  framed.parent = {
    postMessage: (data, target) => {
      posted.push({ data, target });
      parent.deliver(framed, data, target);
    },
  };

  const claimant = createClaimant(framed, 'ticket', () => undefined);
  claimant.slot(true);
  assert.equal(posted[0].target, 'https://parent.example');
  assert.equal(posted[0].data[SLOT_TAG], 'ticket');

  // A realm without a chain to read falls back to the unaimed word, and
  // the rail still moves.
  const wanderer = makeWindow();
  wanderer.parent = {
    postMessage: (data, target) => {
      posted.push({ data, target });
    },
  };
  const stray = createClaimant(wanderer, 'stray', () => undefined);
  stray.slot(true);
  assert.equal(posted.at(-1).target, '*');

  claimant.end();
  stray.end();
});

test('the relay aims the word it passes up at the parent', () => {
  globalThis.MutationObserver = class {
    constructor() {
      this.observed = null;
    }
    observe() {
      this.observed = true;
    }
    disconnect() {
      this.observed = false;
    }
  };

  const child = {};
  const iframe = {
    contentWindow: child,
    style: {
      setProperty: () => {},
      getPropertyValue: () => 'fixed',
    },
    getAttribute: () => 'width:300px',
    setAttribute() {},
    removeAttribute() {},
  };
  const doc = { querySelectorAll: () => [iframe] };

  const host = makeWindow();
  host.location = { ancestorOrigins: ['https://above.example'] };
  const passed = [];
  host.parent = {
    postMessage: (data, target) => {
      passed.push({ data, target });
    },
  };

  createSlotKeeper(host, doc);
  host.deliver(child, { [SLOT_TAG]: 'ticket', open: true, another: 'a' });
  assert.equal(passed.length, 1);
  assert.equal(passed[0].data.another, 'a', 'the relayed word is whole');
  assert.equal(passed[0].target, 'https://above.example');
});

test('the pair adopts, and the words ride it home', async () => {
  const top = makeWindow();
  const judge = createJudge(top, { ownWant: () => false });

  const framed = joinsThe(top);
  const ticket = mintTicket();
  const seated = [];
  let films = 4;
  const claimant = createClaimant(
    framed,
    ticket,
    (granted) => seated.push(granted),
    { getCount: () => films },
  );

  claimant.setWant(true);
  assert.deepEqual(seated, [], 'nothing is believed before the word returns');
  await settled();
  // The verdict came back over the pair the claim minted — once, and from
  // the judge's own taking of the far end.
  assert.deepEqual(seated, [true]);
  assert.equal(
    top.arrived.length,
    1,
    'the adopted frame says no further word on the wire',
  );

  // An adopted voice says its count on the charged end, and the judge's
  // one answer for the page hears it without a belt to wait for.
  films = 2;
  claimant.tell();
  await settled();
  assert.equal(judge.totalCount(), 2);
  assert.equal(top.arrived.length, 1, 'the count rode the pair, not the wire');

  claimant.end();
});

test('a farewell on the pair frees the seat as the words say', async () => {
  const top = makeWindow();
  createJudge(top, { ownWant: () => false });

  const staleHome = joinsThe(top);
  const stale = seatOf(staleHome, mintTicket());
  stale.claimant.setWant(true);
  await settled();
  assert.deepEqual(stale.seated, [true]);

  // The document goes away the way a browser makes it go away, and the
  // goodbye rides the pair — the death the seat's own book hears at once.
  // The next claim takes the seat at the same moment, with no passage of
  // the forgetting window between the two lives of the seat.
  staleHome.fire('pagehide', { persisted: false });

  const fresh = seatOf(joinsThe(top), mintTicket());
  fresh.claimant.setWant(true);
  await settled();
  assert.deepEqual(fresh.seated, [true]);

  fresh.claimant.end();
});

test('a farewell on the ramp answers where the tree still does', async () => {
  const top = makeWindow();
  createJudge(top, { ownWant: () => false });

  const ticket = mintTicket();
  const home = joinsThe(top);
  const stale = seatOf(home, ticket);
  stale.claimant.setWant(true);
  await settled();
  assert.deepEqual(stale.seated, [true]);

  // The goodbye rides the same wire the claim came up, aimed the same
  // way, and the tree vouches for the door it arrives by: the claim dies
  // where it stands, and the seat is free before the next frame speaks.
  top.deliver(
    home,
    { [CLAIM_TAG]: ticket, farewell: true },
    'https://top.example',
  );

  const fresh = seatOf(joinsThe(top), mintTicket());
  fresh.claimant.setWant(true);
  await settled();
  assert.deepEqual(fresh.seated, [true]);

  stale.claimant.end();
  fresh.claimant.end();
});
