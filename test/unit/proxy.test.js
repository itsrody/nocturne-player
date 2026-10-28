import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createProxy } from '../../src/background/network/proxy.js';

// The address one stream’s manifest sealed, as the ledger would say it.
const SEALED_URLS = ['https://cdn.example/seg0.mp4'];

// The bytes of one crossing: the sealed answer as the wire carries it,
// and the plaintext the unseal promises the page. Two plain buffers,
// built here, so the room’s honesty is the test’s arithmetic.
const plain = new Uint8Array(8).fill(9);
const sealed = new Uint8Array(16).fill(1);

// The book stood to the one reading the room asks of it: which tabs a
// crossing has ever warmed.
const makeBook = () => ({ books: new Map([[1, {}]]) });

// The browser, stood up to the two verbs the proxy asks of it: the
// response-crossed listener with its filter, and the streaming filter
// itself — a stream with a hand for its words and a close.
const makeBrowser = () => {
  const ears = [];
  const held = new Map();
  const browser = {
    ears,
    held,
    webRequest: {
      onHeadersReceived: {
        addListener: (listener, filter) => ears.push({ listener, filter }),
      },
      // A filter held for one request id: the page’s reader receives
      // exactly what the room writes.
      filterResponseData: (requestId) => {
        const filter = {
          id: requestId,
          stream: [],
          disconnected: false,
          ondata: null,
          onstop: null,
          onerror: null,
          write: (bytes) => filter.stream.push(new Uint8Array(bytes)),
          disconnect: () => {
            filter.disconnected = true;
          },
        };
        held.set(requestId, filter);
        return filter;
      },
    },
    // A crossing, fired at every ear the way the platform fires it.
    fire: (details) => {
      for (const { listener } of ears) listener(details);
    },
  };
  return browser;
};

// The cipher room, stood to the two verbs the proxy asks: which
// addresses are sealed, and the answer the unseal promises — a miss
// answers null, never an error.
const makeWorker = (answer = plain) => ({
  seals: (url) => SEALED_URLS.includes(url),
  unseal: async () => answer,
});

const crossing = (over = {}) => ({
  tabId: 1,
  requestId: 'r1',
  type: 'xmlhttprequest',
  url: 'https://cdn.example/seg0.mp4',
  ...over,
});

const waiting = async () => {
  for (let at = 0; at < 6; at += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
};

test('a sealed answer is unsealed on its way past', async () => {
  const browser = makeBrowser();
  createProxy(browser, makeWorker(), makeBook());

  browser.fire(crossing());
  const filter = browser.held.get('r1');
  assert.notEqual(filter, undefined, 'the response was held at the door');

  // The words to the stream: nothing is written until the cipher is
  // read whole and the answer said.
  filter.ondata({ data: sealed.slice().buffer });
  assert.deepEqual(filter.stream, []);
  filter.onstop();
  await waiting();
  assert.deepEqual(filter.stream, [plain]);
  assert.equal(filter.disconnected, true, 'the answer is said once, whole');
});

test('a miss writes the sealed answer past', async () => {
  const browser = makeBrowser();
  createProxy(browser, makeWorker(null), makeBook());

  browser.fire(crossing());
  const filter = browser.held.get('r1');
  filter.ondata({ data: sealed.slice().buffer });
  filter.onstop();
  await waiting();
  assert.deepEqual(filter.stream, [sealed]);
  assert.equal(filter.disconnected, true);
});

test('the door knows every word it never holds', () => {
  const browser = makeBrowser();
  createProxy(browser, makeWorker(), makeBook());

  // A tab the book has never heard of, an address the ledger names no
  // seal for, a room with no tab behind it — none are held, and the
  // room never sees their responses.
  browser.fire(crossing({ tabId: 2 }));
  browser.fire(crossing({ url: 'https://cdn.example/plain.mp4' }));
  browser.fire(crossing({ tabId: -1 }));
  assert.equal(browser.held.size, 0);

  // And the ear itself is aimed at the fetch family only: a media
  // element’s own bytes are the platform’s business, not the room’s.
  assert.deepEqual(browser.ears[0].filter, {
    urls: ['<all_urls>'],
    types: ['xmlhttprequest'],
  });
});

test('the budget counts the buffers, and a slot is paid back', async () => {
  const browser = makeBrowser();
  createProxy(browser, makeWorker(), makeBook());

  for (let at = 1; at <= 5; at += 1) {
    browser.fire(crossing({ requestId: `r${at}` }));
  }
  assert.equal(browser.held.size, 4, 'a small counted budget, never unbounded');

  // One cipher read whole: the slot goes back, the next crossing is
  // held.
  browser.held.get('r1').onstop();
  await waiting();
  browser.fire(crossing({ requestId: 'r6' }));
  assert.notEqual(browser.held.get('r6'), undefined);
});

test('a stand-in room holds nothing, and stands nothing', () => {
  // No webRequest at all — the permission not granted — and a room
  // without the filter’s own verb: never a crash, never an ear.
  createProxy({}, makeWorker(), makeBook());
  createProxy(
    { webRequest: { onHeadersReceived: { addListener: () => {} } } },
    makeWorker(),
    makeBook(),
  );
});
