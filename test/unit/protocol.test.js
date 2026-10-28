import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  asCipher,
  asCipherAsk,
  asCipherBytes,
  asCipherPlan,
  asDossier,
  asLine,
  asReport,
  asSlot,
  asStateQuery,
  asStrain,
  asVerdict,
  askCipherSegment,
  askState,
  MAX_PLAN_SEGMENTS,
  sayCipher,
  sayCipherBytes,
  sayCipherPlan,
  sayDossier,
  sayLine,
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
  // A want that is not a boolean is not the frame’s word.
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
    shape: null,
  });
  // The word travels alone: the ear’s own list is not the word’s.
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
    shape: null,
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

test('the dossier’s shape rides only as a family word', () => {
  const said = sayDossier({
    url: 'https://cdn.example/master.m3u8',
    chain: ['https://top.example/'],
    shape: 'hls',
  });
  assert.equal(said.shape, 'hls');
  assert.equal(asDossier(said).shape, 'hls');

  // A string the corpus never said is nobody’s family: the word holds,
  // the hint does not — asDossier is the admission gate, not enough of
  // a description to refuse a good dossier for one stray field.
  const stranger = sayDossier({
    url: 'https://cdn.example/manifest.mpd',
    chain: [],
    shape: 'playerjs',
  });
  assert.equal(asDossier(stranger).shape, null);
  assert.equal(asDossier(stranger).url, 'https://cdn.example/manifest.mpd');

  // And a dossier without a shape is without one, honestly.
  const bare = sayDossier({ url: 'https://cdn.example/a.mp4', chain: [] });
  assert.equal(bare.shape, null);
  assert.equal(asDossier(bare).shape, null);
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
  // The admission gate, not the word’s whole description: extra fields a
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

test('the cipher’s voice is said and heard as its own word', () => {
  const said = sayCipher('aes-128', 'https://f.example/vod/media.m3u8');
  assert.deepEqual(said, {
    type: 'nocturneCipher',
    cipher: 'aes-128',
    url: 'https://f.example/vod/media.m3u8',
  });
  assert.deepEqual(asCipher(said), {
    cipher: 'aes-128',
    url: 'https://f.example/vod/media.m3u8',
  });
  // Only the schemes the extension knows, and only a manifest that was
  // actually seen: anything else is nobody’s cipher — the builder says
  // what it is handed, and the guard refuses it.
  assert.equal(
    sayCipher('widevine', 'https://f.example/a.m3u8').cipher,
    'widevine',
  );
  assert.equal(asCipher(null), null);
  assert.equal(asCipher({ type: 'nocturneCipher' }), null);
  assert.equal(
    asCipher({ type: 'nocturneCipher', cipher: 'aes-128' }),
    null,
    'no manifest named, no word',
  );
  assert.equal(
    asCipher({
      type: 'nocturneCipher',
      cipher: 'cleartext',
      url: 'https://f.example/a.m3u8',
    }),
    null,
    'a scheme the corpus never said is nobody’s cipher',
  );

  // And the ask rides one address: the ask is refused without it.
  assert.deepEqual(asCipherAsk(askCipherSegment('https://f.example/s0.mp4')), {
    url: 'https://f.example/s0.mp4',
  });
  assert.equal(asCipherAsk({ type: 'nocturneCipherAsk' }), null);

  // The answer: bytes, or an honest null. Anything else — a string, a
  // bare object, a word with no address — is refused whole.
  const bytes = new ArrayBuffer(8);
  assert.deepEqual(
    asCipherBytes(sayCipherBytes('https://f.example/s0.mp4', bytes)),
    {
      url: 'https://f.example/s0.mp4',
      bytes,
    },
  );
  assert.deepEqual(
    asCipherBytes(sayCipherBytes('https://f.example/s0.mp4', null)),
    { url: 'https://f.example/s0.mp4', bytes: null },
  );
  assert.equal(
    asCipherBytes(sayCipherBytes('https://f.example/s0.mp4', { length: 8 })),
    null,
  );
});

test('the plan is believed whole and trimmed at its bound', () => {
  const plan = {
    url: 'https://f.example/vod/media.m3u8',
    codecs: 'avc1.640028,mp4a.40.2',
    init: 'https://f.example/vod/init.mp4',
    segments: [
      { url: 'https://f.example/vod/seg0.mp4', seq: 41 },
      { url: 'https://f.example/vod/seg1.mp4', seq: 42 },
    ],
  };
  assert.deepEqual(asCipherPlan(sayCipherPlan(plan)), plan);
  // A stream with codecs left unsaid — the manifest named none — is
  // still a plan; the mime is built around what the manifest kept.
  assert.deepEqual(
    asCipherPlan(
      sayCipherPlan({
        ...plan,
        codecs: null,
        init: null,
        segments: [plan.segments[0]],
      }),
    ),
    { url: plan.url, codecs: null, init: null, segments: [plan.segments[0]] },
  );

  // A playlist that outgrows the bound is trimmed, because a promise
  // that cannot be kept whole is no promise at all.
  const many = [];
  for (let at = 0; at < MAX_PLAN_SEGMENTS + 5; at += 1) {
    many.push({ url: `https://f.example/vod/s${at}.mp4`, seq: at });
  }
  assert.equal(
    asCipherPlan(sayCipherPlan({ ...plan, segments: many })).segments.length,
    MAX_PLAN_SEGMENTS,
  );

  // And the refusals: no manifest, no segments, no sequence — all
  // refused, the whole word with them.
  assert.equal(asCipherPlan(null), null);
  assert.equal(asCipherPlan({ type: 'nocturnePlan' }), null);
  assert.equal(
    asCipherPlan(sayCipherPlan({ ...plan, segments: [] })),
    null,
    'no segments, no plan',
  );
  assert.equal(
    asCipherPlan(sayCipherPlan({ ...plan, init: 42 })),
    null,
    'an init that is not an address is no init',
  );
  assert.equal(
    asCipherPlan(
      sayCipherPlan({
        ...plan,
        segments: [{ url: 'https://f.example/vod/x.mp4', seq: -1 }],
      }),
    ),
    null,
    'a sequence that cannot be is no segment',
  );
});

test('a frame’s line rides up whole, and is refused shaped', () => {
  // The word carries the console’s text as it was said: the hub stamps
  // its own frame coordinates at the head, so the line itself holds
  // nothing but the sentence the frame’s console spoke.
  const said = sayLine('Nocturne: [aes] the plan arrived, 3 segments');
  assert.deepEqual(said, {
    type: 'nocturneLine',
    text: 'Nocturne: [aes] the plan arrived, 3 segments',
  });
  assert.deepEqual(asLine(said), {
    text: 'Nocturne: [aes] the plan arrived, 3 segments',
  });
  // And the refusals: no text, an empty one, a word of another type,
  // and no word at all — a line is a line only when it is one.
  assert.equal(asLine(null), null);
  assert.equal(asLine('nocturneLine'), null);
  assert.equal(asLine({ type: 'nocturneReport', want: true, count: 1 }), null);
  assert.equal(asLine({ type: 'nocturneLine' }), null, 'no text, no line');
  assert.equal(
    asLine({ type: 'nocturneLine', text: '' }),
    null,
    'an empty line says nothing',
  );
  assert.equal(
    asLine({ type: 'nocturneLine', text: 42 }),
    null,
    'a line that is not a sentence is no line',
  );
});
