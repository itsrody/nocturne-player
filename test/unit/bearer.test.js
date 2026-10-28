import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBearer } from '../../src/background/network/bearer.js';
import { bearerWords } from '../../src/lib/bearers.js';
import { createBook } from '../../src/background/book/book.js';

// The policy itself first, in its own words: a bearer word is what the
// page itself said, filtered to the names a mouth may carry — the
// credentials and the site’s own `x-` words — and never the page’s
// forwarding context.
test('the bearer words are the carried names, alone', () => {
  assert.deepEqual(
    bearerWords([
      { name: 'Authorization', value: 'Bearer tok' },
      { name: 'X-Stream-Token', value: 's1' },
      { name: 'cookie', value: 'a=1' },
      { name: 'Referer', value: 'https://site.example/' },
      { name: 'Host', value: 'cdn.example' },
      { name: 'content-length', value: '0' },
      { name: 'x-half', value: null },
      { name: 'x-wrong', value: 7 },
    ]),
    { authorization: 'Bearer tok', 'x-stream-token': 's1' },
  );
  assert.deepEqual(bearerWords([]), {});
  assert.deepEqual(bearerWords(undefined), {});
});

// The send-headers ear the room answers at: the ask thrown at every
// ear, the answer given back — the shape the platform runs.
const makeBrowser = () => {
  const ears = [];
  const browser = {
    ears,
    webRequest: {
      onBeforeSendHeaders: {
        addListener: (listener, filter, spec) =>
          ears.push({ listener, filter, spec }),
      },
    },
    // The ask, thrown at every ear; the last answer said is the ask’s.
    fire: (details) => {
      let answer;
      for (const { listener } of ears) answer = listener(details);
      return answer;
    },
  };
  return browser;
};

// The ledger, stood to the one reading the room asks: which addresses
// are sealed.
const SEALED_URLS = ['https://cdn.example/seg0.mp4'];
const makeWorker = () => ({ seals: (url) => SEALED_URLS.includes(url) });

// The book, stood to the word it said at the manifest ask: the
// credentials carried, the page’s cookie jar not.
const makeBook = () => {
  const book = createBook();
  book.speak(1, [
    { name: 'Authorization', value: 'Bearer tok' },
    { name: 'Cookie', value: 'a=1' },
  ]);
  return book;
};

const ask = (over = {}) => ({
  tabId: 1,
  method: 'GET',
  type: 'xmlhttprequest',
  url: 'https://cdn.example/seg0.mp4',
  requestHeaders: [{ name: 'User-Agent', value: 'the page’s own' }],
  ...over,
});

test('the ask a manifest worded is answered with its own words', () => {
  const browser = makeBrowser();
  const book = makeBook();
  createBearer(browser, makeWorker(), book);

  const answer = browser.fire(
    ask({
      requestHeaders: [
        // A stale word the ask itself said is replaced in place — the
        // ask keeps its shape, its order, its every other word.
        { name: 'x-stream-token', value: 'last-stream' },
        { name: 'User-Agent', value: 'the page’s own' },
      ],
    }),
  );
  assert.deepEqual(answer, {
    requestHeaders: [
      { name: 'x-stream-token', value: 'last-stream' },
      { name: 'User-Agent', value: 'the page’s own' },
      // The credentials, appended where the ask never said its name.
      { name: 'authorization', value: 'Bearer tok' },
    ],
  });

  // And the cookie is never carried: the page’s jar rides its own
  // mouths, whatever the manifest ask bore.
  assert.equal(
    answer.requestHeaders.some((one) => one.name === 'cookie'),
    false,
  );
});

test('the door knows every ask it never answers', () => {
  const browser = makeBrowser();
  createBearer(browser, makeWorker(), makeBook());

  // Nobody’s ask, an address the ledger names no seal for — none
  // answered, the native ask leaves as the page built it.
  assert.equal(browser.fire(ask({ tabId: -1 })), undefined);
  assert.equal(
    browser.fire(ask({ url: 'https://cdn.example/plain.mp4' })),
    undefined,
  );

  // A wordless room: the word is said at a family crossing only, and
  // no family ever crossed this room.
  createBearer(browser, makeWorker(), createBook());
  assert.equal(browser.fire(ask({ tabId: 3 })), undefined);

  // And the ear itself is aimed as the proxy’s was: the fetch family,
  // with the blocking answer the only word this room may say.
  assert.deepEqual(browser.ears[0].filter, {
    urls: ['<all_urls>'],
    types: ['xmlhttprequest'],
  });
  assert.deepEqual(browser.ears[0].spec, ['blocking', 'requestHeaders']);
});

test('a word said but never carried answers nothing', () => {
  const browser = makeBrowser();
  const book = createBook();
  // The manifest ask’s own words held nothing a mouth may carry: no
  // word is laid onto any ask, and the ask leaves untouched.
  book.speak(2, [{ name: 'Cookie', value: 'a=1' }]);
  createBearer(browser, makeWorker(), book);
  assert.equal(browser.fire(ask({ tabId: 2 })), undefined);
});

test('a stand-in room answers nothing, and stands nothing', () => {
  // No webRequest at all, no send-headers ear, no seals verb — all
  // quiet, never a crash, never an answer. Only the third stands an
  // ear, and its worker answers no seals: it answers nothing.
  createBearer({}, makeWorker(), makeBook());
  createBearer({ webRequest: {} }, makeWorker(), makeBook());
  const browser = makeBrowser();
  createBearer(browser, {}, makeBook());
  assert.equal(browser.fire(ask()), undefined);
  assert.equal(browser.ears.length, 1);
});
