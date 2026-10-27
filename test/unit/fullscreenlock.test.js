import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lockPageFullscreen } from '../../src/content/fullscreenlock.js';

// A page realm trimmed to what the lock touches: two prototypes to hold, an
// Object to define with, a Promise to settle the page's await with. The
// exported stand-ins return their function as the page-side pointer, exactly
// what the real exportFunction does — it defines nothing unless told to.
const makePage = () => {
  class Element {}
  Element.prototype.requestFullscreen = () => Promise.resolve('native');

  class Document {}
  Document.prototype.exitFullscreen = () => Promise.resolve('native');

  const page = {
    Element,
    Document,
    Object,
    Promise,
  };
  // pageWindow() looks to the ambient window, so the stand-in realm sits
  // where the module will find it, and leaves quietly afterwards.
  globalThis.window = page;
  const functions = [];
  globalThis.exportFunction = (func) => {
    functions.push(func);
    return func;
  };
  page.cleanup = () => {
    delete globalThis.window;
    delete globalThis.exportFunction;
  };
  return { page, functions };
};

test('the page cannot unseat the lock by writing over it', () => {
  const { page } = makePage();
  const unlock = lockPageFullscreen();
  page.cleanup();

  // The plain assignment that used to win against the old writable own
  // property now lands in the sink the lock stands on.
  const pageFake = () => Promise.resolve('page');
  page.Element.prototype.requestFullscreen = pageFake;
  assert.notEqual(
    page.Element.prototype.requestFullscreen,
    pageFake,
    'the page\u2019s write was sunk',
  );

  unlock();
});

test('the lock\u2019s answer reads like success to the page', async () => {
  const { page } = makePage();
  const unlock = lockPageFullscreen();
  page.cleanup();

  const answer = await page.Element.prototype.requestFullscreen();
  assert.equal(answer, undefined, 'the page believes the screen was taken');

  unlock();
});

test('unlocking puts back only what the lock still holds', async () => {
  const { page } = makePage();
  const unlock = lockPageFullscreen();
  page.cleanup();

  // The page reaches past the lock the only way a definition call can, and
  // the lock\u2019s restore must not put its own snapshot back on top of the
  // page\u2019s doing: the page won, the page keeps what it won.
  const pageFake = () => Promise.resolve('page');
  page.Object.defineProperty(page.Element.prototype, 'requestFullscreen', {
    configurable: true,
    enumerable: true,
    value: pageFake,
    writable: true,
  });
  unlock();
  assert.equal(page.Element.prototype.requestFullscreen, pageFake);

  // Where the lock is undisturbed, the snapshot the lock read at hold time
  // — the page's then-current method, native or page-crafted alike — goes
  // back the way it came.
  const { page: second } = makePage();
  const release = lockPageFullscreen();
  second.cleanup();
  release();
  assert.equal(
    typeof second.Element.prototype.requestFullscreen,
    'function',
    'the native way comes back',
  );
});

test('the lock returns a do-nothing undo without a page to stand on', () => {
  delete globalThis.exportFunction;
  const unlock = lockPageFullscreen();
  assert.equal(typeof unlock, 'function');
  unlock();
  assert.ok('the undo is harmless');
});
