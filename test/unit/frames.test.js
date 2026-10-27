import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSlotRider } from '../../src/content/frames.js';
import { chainHosts } from '../../src/lib/chain.js';
import { createSlotKeeper } from '../../src/content/slot.js';
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
