import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { createConscript } from '../../src/background/conscript.js';
import { STORAGE_KEY } from '../../src/lib/words.js';

// The recruiter's room, stood up to exactly the shape it asks of the
// browser: executeScript records every boot instead of running one, the
// tab answers its own url, and storage answers with the settings handed
// in. The mirror follows storage's changes as the running page does, so
// a test can also write the law the way the popup does. The stub also
// stands in for the `browser` global that the settings law reads —
// the runner takes it back down between tests.
let browser;

afterEach(() => {
  delete globalThis.browser;
});

const makeBrowser = (tabUrl, settings = {}) => {
  const boots = [];
  const gets = [];
  const listeners = new Set();
  return {
    boots,
    gets,
    tabs: {
      executeScript: (tabId, subject) => {
        boots.push({ tabId, subject });
        return Promise.resolve([]);
      },
      get: async (tabId) => {
        gets.push(tabId);
        return { id: tabId, url: tabUrl };
      },
    },
    storage: {
      local: {
        get: async () => ({ [STORAGE_KEY]: settings }),
        set: async () => undefined,
        remove: async () => undefined,
      },
      onChanged: {
        addListener: (fn) => listeners.add(fn),
        removeListener: (fn) => listeners.delete(fn),
        say: (next) =>
          [...listeners].forEach((fn) =>
            fn({ [STORAGE_KEY]: { newValue: next } }),
          ),
      },
    },
  };
};

const ear = (doc, chain = []) => ({
  url: 'https://cdn.example/master.m3u8',
  resource: 'xmlhttprequest',
  doc,
  chain,
});

test('an admitted top film is booted alone and exactly', async () => {
  browser = globalThis.browser = makeBrowser('https://site.example/watch');
  const conscript = createConscript(browser, { standing: () => false });

  const admitted = await conscript.rally(
    7,
    0,
    ear('https://site.example/watch'),
  );
  assert.equal(admitted, true);

  // One boot, into the one frame the wire named, with the match that
  // opens the embeds and the same arrival the manifest's script used.
  assert.deepEqual(browser.boots, [
    {
      tabId: 7,
      subject: {
        file: '/content.js',
        frameId: 0,
        matchAboutBlank: true,
        runAt: 'document_idle',
      },
    },
  ]);
});

test('a disabled host in the chain refuses the whole tab', async () => {
  browser = globalThis.browser = makeBrowser('https://site.example/watch', {
    disabledHosts: ['media.example'],
  });
  const conscript = createConscript(browser, { standing: () => false });

  // The film's own document is the refuser: no boot at all — not even
  // for a relay — and no word back that says admitted.
  const admitted = await conscript.rally(
    7,
    2,
    ear('https://media.example/embed', ['https://site.example/']),
  );
  assert.equal(admitted, false);
  assert.deepEqual(browser.boots, []);
});

test('a framed newcomer sweeps the relations once', async () => {
  browser = globalThis.browser = makeBrowser('https://site.example/watch');
  const conscript = createConscript(browser, { standing: () => false });

  await conscript.rally(
    7,
    2,
    ear('https://media.example/embed', ['https://site.example/']),
  );

  // The film's own frame first, named exactly; then the round that asks
  // after every document of the chain, whose boot flag is what keeps a
  // second sweep from costing a fielded frame more than its parse.
  assert.deepEqual(browser.boots, [
    {
      tabId: 7,
      subject: {
        file: '/content.js',
        frameId: 2,
        matchAboutBlank: true,
        runAt: 'document_idle',
      },
    },
    {
      tabId: 7,
      subject: { file: '/content.js', allFrames: true, runAt: 'document_idle' },
    },
  ]);
});

test('a frame already fielded earns no boot and no round', async () => {
  browser = globalThis.browser = makeBrowser('https://site.example/watch', {
    disabledHosts: [],
  });
  const conscript = createConscript(browser, {
    standing: (tabId, frameId) => tabId === 7 && frameId === 2,
  });

  const admitted = await conscript.rally(
    7,
    2,
    ear('https://media.example/embed', ['https://site.example/']),
  );

  // The stream's own cadence re-crosses the bus every few seconds; the
  // standing answer is what keeps that from re-arming the frame and
  // re-sweeping its relations.
  assert.equal(admitted, true);
  assert.deepEqual(browser.boots, []);
});

test('a top-level load asks the tab for its own name', async () => {
  browser = globalThis.browser = makeBrowser('https://site.example/watch', {
    disabledHosts: ['site.example'],
  });
  const conscript = createConscript(browser, { standing: () => false });

  // A room the envelope does not name for itself — a detail the platform
  // is allowed to leave blank — is consulted at the tab instead: the
  // tab's own url is the same room, and the gate reads the law there.
  const admitted = await conscript.rally(
    7,
    0,
    ear(undefined, ['https://elsewhere.example/']),
  );
  assert.equal(admitted, false);
  assert.deepEqual(browser.gets, [7]);
  assert.deepEqual(browser.boots, []);
});
