import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createClaimant,
  createJudge,
  mintTicket,
} from '../../src/content/frames.js';

// A window trimmed to what the two ends of the protocol do with it: listen
// for messages and deliver them. Deliveries are made by hand instead of by
// the event loop of a real browser.
const makeWindow = () => {
  const handlers = [];
  const arrived = [];
  const home = {
    handlers,
    arrived,
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
