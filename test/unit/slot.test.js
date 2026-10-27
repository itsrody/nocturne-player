import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createSlot,
  createSlotKeeper,
  createSlotRider,
} from '../../src/content/slot.js';
import { SLOT_TAG } from '../../src/lib/protocol.js';
// A window trimmed to what these two sides of the slot protocol do with
// it: listen for messages and deliver them. Deliveries are made by hand
// instead of by the event loop of a real browser, and the target a post
// was aimed at is kept in the record — the rails aim their words, and the
// tests say where.
const makeWindow = () => {
  const handlers = [];
  const arrived = [];
  const home = {
    handlers,
    arrived,
    // A realm without a chain to read: words out of such a window fall
    // back to the '*' the rails answer for.
    location: { ancestorOrigins: [] },
    addEventListener: (type, handler) => {
      if (type === 'message') handlers.push(handler);
    },
    deliver: (source, data, target) => {
      arrived.push({ source, data, target });
      for (const handler of [...handlers]) {
        handler({ source, data, origin: target });
      }
    },
  };
  return home;
};

test('a session asks up for the room, and says when the room is free', () => {
  const parent = makeWindow();
  const framed = makeWindow();
  framed.parent = { postMessage: (data) => parent.deliver(framed, data) };

  const rider = createSlotRider(framed, 'ticket');
  rider.slot(true);

  const words = parent.arrived.map((post) => post.data);
  assert.equal(words[0][SLOT_TAG], 'ticket');
  assert.equal(words[0].open, true);

  rider.slot(false);
  const last = parent.arrived.at(-1).data;
  assert.equal(last[SLOT_TAG], 'ticket');
  assert.equal(last.open, false);
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

  const rider = createSlotRider(framed, 'ticket');
  rider.slot(true);
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
  const stray = createSlotRider(wanderer, 'stray');
  stray.slot(true);
  assert.equal(posted.at(-1).target, '*');

  rider.slot(false);
  stray.slot(false);
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

test('one entrance, one verb, the whole chain speaking', () => {
  globalThis.MutationObserver = class {
    constructor() {
      this.observed = null;
    }
    observe() {
      this.observed = true;
    }
    disconnect() {
      this.observed = null;
    }
  };

  // The host document and its child frame, wired the way a real page is:
  // the child's window is the box the host grows. Both ends stand up by
  // the same entrance, and neither ever sees a ticket.
  const host = makeWindow();
  host.top = host;
  const posted = [];
  host.parent = { postMessage: () => posted.push('the top said a word') };
  const child = makeWindow();
  child.parent = { postMessage: (data) => host.deliver(child, data) };
  const written = [];
  const iframe = {
    contentWindow: child,
    style: {
      setProperty: (name, value) => written.push(`${name}:${value}`),
      getPropertyValue: () => 'width:300px',
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

  const above = createSlot(host, doc);
  const room = createSlot(child, doc);

  // The top's verb means nothing and says nothing.
  above.slot(true);
  assert.deepEqual(posted, []);

  // The child's verb mints its own ticket, says it up one hop, and the
  // keeper a hop above grows the box for a word it cannot name in
  // advance.
  room.slot(true);
  const stoodBy = written.length;
  assert.equal(written[0], 'position:fixed');

  // And the same verb says closed, paying the page's own width back —
  // restoring what it kept, not writing fresh.
  room.slot(false);
  assert.equal(written.length, stoodBy, 'the close restored, not rewrote');
  assert.equal(iframe.width, 'width:300px');
  assert.deepEqual(posted, []);
});
