// The replay note's own law: said down before the reload, claimed once
// after it — and the storage is the frame's own `sessionStorage`, which
// the test stands up as a stub, since the runner is no browser.
import test from 'node:test';
import assert from 'node:assert/strict';

const { noteReplay, claimReplay } =
  await import('../../src/content/video/resume.js');

// The stub store: set/get/remove over an object, as a same-document
// sessionStorage behaves — surviving reload is *the frame's* meaning
// of the store, which a same-page test needs no machinery for.
const store = () => {
  const bag = new Map();
  return {
    stub: {
      setItem: (key, value) => bag.set(key, value),
      getItem: (key) => (bag.has(key) ? bag.get(key) : null),
      removeItem: (key) => bag.delete(key),
    },
    bag,
  };
};

test('a note said down is claimed back once, and only once', () => {
  const { stub } = store();
  const own = Reflect.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Reflect.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: stub,
  });
  try {
    assert.equal(claimReplay(), null);
    noteReplay({ currentTime: 40 });
    const at = claimReplay();
    assert.equal(at, 40);
    // The claim is spent — a second claim reads nothing.
    assert.equal(claimReplay(), null);
  } finally {
    if (own) Reflect.defineProperty(globalThis, 'sessionStorage', own);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('a stale note reads as nothing, and its claim is spent', () => {
  const { stub, bag } = store();
  const own = Reflect.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Reflect.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: stub,
  });
  try {
    noteReplay({ currentTime: 40 });
    // The note's own record is rewound past its lifetime — what a
    // reload never paid left behind.
    const [, raw] = bag.entries().next().value;
    const note = JSON.parse(raw);
    bag.set(
      'nocturne:replay',
      JSON.stringify({ ...note, when: note.when - 60_000 }),
    );
    assert.equal(claimReplay(), null);
    assert.equal(globalThis.sessionStorage.getItem('nocturne:replay'), null);
  } finally {
    if (own) Reflect.defineProperty(globalThis, 'sessionStorage', own);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('a note half-written by a dying frame reads as nothing', () => {
  const { stub } = store();
  const own = Reflect.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Reflect.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: stub,
  });
  try {
    stub.setItem('nocturne:replay', '{not a note');
    assert.equal(claimReplay(), null);
  } finally {
    if (own) Reflect.defineProperty(globalThis, 'sessionStorage', own);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
