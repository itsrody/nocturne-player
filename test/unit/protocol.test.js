import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  asDossier,
  asReport,
  asSlot,
  asStateQuery,
  asStrain,
  asVerdict,
  askState,
  sayDossier,
  sayReport,
  saySlot,
  sayStrain,
  sayVerdict,
  SLOT_TAG,
} from '../../src/lib/protocol.js';

test('a frame’s report is said and heard as itself', () => {
  assert.deepEqual(asReport(sayReport(true, 2)), { want: true, count: 2 });
  assert.deepEqual(asReport(sayReport(false, 0)), { want: false, count: 0 });
  // A count left out is admitted, carried as nothing to say about it.
  assert.deepEqual(asReport(sayReport(false, null)), {
    want: false,
    count: null,
  });
});

test('a report half-heard is refused whole', () => {
  assert.equal(asReport(null), null);
  assert.equal(asReport('nocturneReport'), null);
  assert.equal(
    asReport({ type: 'nocturneVerdict', want: true, count: 1 }),
    null,
  );
  // A want that is not a boolean is not the frame's word.
  assert.equal(asReport({ type: 'nocturneReport', want: 1, count: 1 }), null);
  // A count that cannot be a film count is refused, want and all.
  assert.equal(
    asReport({ type: 'nocturneReport', want: true, count: -1 }),
    null,
  );
  assert.equal(
    asReport({ type: 'nocturneReport', want: true, count: 'two' }),
    null,
  );
});

test('the seat’s news is believed only as a boolean', () => {
  assert.deepEqual(asVerdict(sayVerdict(true)), { granted: true });
  assert.deepEqual(asVerdict(sayVerdict(false)), { granted: false });
  assert.equal(asVerdict(sayStrain()), null);
  assert.equal(asVerdict({ type: 'nocturneVerdict' }), null);
});

test('the knock is heard empty and refused shaped', () => {
  assert.deepEqual(asStrain(sayStrain()), {});
  assert.equal(asStrain(sayVerdict(true)), null);
  assert.equal(asStrain(null), null);
});

test('the dossier carries the ear whole and copies its chain', () => {
  const chain = ['https://top.example/', 'https://mid.example/'];
  const said = sayDossier({
    url: 'https://cdn.example/master.m3u8',
    resource: 'xmlhttprequest',
    doc: 'https://mid.example/embed',
    chain,
  });
  assert.deepEqual(said, {
    type: 'nocturneDossier',
    url: 'https://cdn.example/master.m3u8',
    resource: 'xmlhttprequest',
    doc: 'https://mid.example/embed',
    chain: ['https://top.example/', 'https://mid.example/'],
  });
  // The word travels alone: the ear's own list is not the word's.
  chain.push('https://latecomer.example/');
  assert.equal(said.chain.length, 2);

  const heard = asDossier(said);
  // The hearing drops the type tag — the word it answers to was already
  // heard — and keeps everything else, on a copy.
  assert.deepEqual(heard, {
    url: 'https://cdn.example/master.m3u8',
    resource: 'xmlhttprequest',
    doc: 'https://mid.example/embed',
    chain: ['https://top.example/', 'https://mid.example/'],
  });
  heard.chain.length = 0;
  assert.equal(said.chain.length, 2, 'the listener holds a copy too');
});

test('a dossier that names no film is not a dossier', () => {
  assert.equal(asDossier({ type: 'nocturneDossier', chain: [] }), null);
  assert.equal(
    asDossier({ type: 'nocturneDossier', url: 'https://a.example/x.m3u8' }),
    null,
    'the chain must be a real array',
  );
  assert.ok(
    asDossier({
      type: 'nocturneDossier',
      url: 'https://a.example/x.m3u8',
      chain: ['https://top.example/', 7],
    }).chain,
    'woolly entries are dropped, the word is not',
  );
});

test('the popup’s question carries its tab or carries nothing', () => {
  assert.deepEqual(asStateQuery(askState(3)), { tabId: 3 });
  assert.equal(asStateQuery({ type: 'query-state' }), null);
  assert.equal(asStateQuery({ type: 'query-state', tabId: 'mine' }), null);
});

test('the page wire’s slot word is believed only well-formed', () => {
  assert.deepEqual(asSlot(saySlot('ticket', true)), {
    ticket: 'ticket',
    open: true,
  });
  assert.deepEqual(asSlot(saySlot('ticket', false)), {
    ticket: 'ticket',
    open: false,
  });
  // The admission gate, not the word's whole description: extra fields a
  // future wire carries ride in as they came.
  assert.deepEqual(asSlot({ [SLOT_TAG]: 'ticket', open: true, another: 'a' }), {
    ticket: 'ticket',
    open: true,
  });
  assert.equal(asSlot({ open: true }), null, 'no tag, no word');
  assert.equal(asSlot({ [SLOT_TAG]: '', open: true }), null);
  assert.equal(asSlot({ [SLOT_TAG]: 'ticket', open: 'yes' }), null);
  assert.equal(asSlot('nocturneSlot'), null);
});
