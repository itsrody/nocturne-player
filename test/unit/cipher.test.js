import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCipherWorker } from '../../src/background/cipher/worker.js';
import {
  decryptSegment,
  hexIv,
  readManifest,
  sequenceIv,
} from '../../src/background/cipher/manifest.js';

// The stream the tests read: one manifest, one key, one fmp4 film — with
// the addresses resolved the way a real manifest resolves them, relative
// to the manifest’s own.
const BASE = 'https://stream.example/vod/media.m3u8';
const KEY_URL = 'https://stream.example/vod/door.key';
const INIT_URL = 'https://stream.example/vod/init.mp4';
const SEGMENT_URL = 'https://stream.example/vod/seg0.mp4';
const SECOND_URL = 'https://stream.example/vod/seg1.mp4';

const mediaManifest = ({ iv = true, sequence = true, end = true } = {}) => {
  const withIv = [
    '#EXT-X-KEY:METHOD=AES-128,URI="door.key"',
    'IV=0x00000000000000000000000000000002',
  ].join(',');
  const bare = '#EXT-X-KEY:METHOD=AES-128,URI="door.key"';
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    iv ? withIv : bare,
    '#EXT-X-MAP:URI="init.mp4"',
  ];
  if (sequence) lines.push('#EXT-X-MEDIA-SEQUENCE:41');
  lines.push('#EXTINF:6.0,', 'seg0.mp4', '#EXTINF:6.0,', 'seg1.mp4');
  if (end) lines.push('#EXT-X-ENDLIST');
  return lines.join('\n');
};

test('a media manifest is read to its whole truth', () => {
  const read = readManifest(mediaManifest(), BASE);
  assert.equal(read.isMaster, false);
  assert.equal(read.cipher, 'aes-128');
  assert.equal(read.init, INIT_URL);
  assert.equal(read.ended, true);
  assert.deepEqual(
    read.segments.map((one) => ({ url: one.url, seq: one.seq })),
    [
      { url: SEGMENT_URL, seq: 41 },
      { url: SECOND_URL, seq: 42 },
    ],
  );
  // The key decree rides each segment, resolved against the manifest’s
  // own address; the IV of the manifest rides as its own word.
  assert.equal(read.segments[0].keyUri, KEY_URL);
  assert.equal(read.segments[0].keyIv, '0x00000000000000000000000000000002');
});

test('the last decree speaks for the stream, and the seals per segment', () => {
  const text = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="door.key"',
    'seg0.mp4',
    '#EXT-X-KEY:METHOD=NONE',
    'seg1.mp4',
    '#EXT-X-ENDLIST',
  ].join('\n');
  const read = readManifest(text, BASE);
  assert.equal(read.segments[0].keyUri, KEY_URL);
  assert.equal(read.segments[1].keyUri, null);
  assert.equal(read.segments[0].keyIv, null, 'no IV of its own, none named');
  // The manifest’s cipher word is the last decree’s own: a stream whose
  // tail unseals itself is read as unsealed, and no plan is promised
  // over a stream whose seals change mid-way — the per-segment ledger
  // keeps the seals anyway, and the ask answers for each honestly.
  assert.equal(read.cipher, null);
});

test('a master playlist answers with its widest variant, one hop', () => {
  const text = [
    '#EXTM3U',
    '#EXT-X-STREAM-INF:BANDWIDTH=800000,CODECS="avc1.640028"',
    'media-low.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=2500000,CODECS="avc1.640028,mp4a.40.2"',
    'media-high.wide.m3u8',
  ].join('\n');
  const read = readManifest(text, BASE);
  assert.equal(read.isMaster, true);
  assert.equal(
    read.variant.url,
    'https://stream.example/vod/media-high.wide.m3u8',
  );
  assert.equal(read.variant.bandwidth, 2500000);
  assert.equal(read.variant.codecs, 'avc1.640028,mp4a.40.2');
  // And the reading a variant is offered to is the media pass itself.
  const inner = readManifest(mediaManifest(), BASE);
  assert.equal(inner.isMaster, false);
});

test('the streams that name no playable decree are named honestly', () => {
  // A plain, unencrypted playlist is no cipher stream at all.
  const plain = readManifest(
    ['#EXTM3U', '#EXTINF:6.0,', 'seg0.mp4', '#EXT-X-ENDLIST'].join('\n'),
    BASE,
  );
  assert.equal(plain.cipher, null);

  // SAMPLE-AES is named for what it is, not refused as unknown: the
  // dictionary says it is known, and the plan is another batch’s work.
  const sample = readManifest(
    [
      '#EXTM3U',
      '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="door.key"',
      '#EXT-X-MAP:URI="init.mp4"',
      '#EXTINF:6.0,',
      'seg0.mp4',
      '#EXT-X-ENDLIST',
    ].join('\n'),
    BASE,
  );
  assert.equal(sample.cipher, 'sample-aes');

  // And a not-manifest is nothing at all.
  assert.equal(readManifest('<html><body>denied</body></html>', BASE), null);
  assert.equal(readManifest('#EXTM3U\n', BASE), null);
});

test('the counters the cipher is counted by are the manifest’s own', () => {
  // The default answer: the sequence number, as a 128-bit big-endian
  // counter. Forty-one sits in the last byte, nothing anywhere else.
  assert.deepEqual(Array.from(sequenceIv(41)), [
    ...new Uint8Array(15).fill(0),
    41,
  ]);
  // A number too wide for one byte spills leftward, honestly.
  assert.equal(sequenceIv(256)[14], 1);
  assert.equal(sequenceIv(256)[15], 0);

  // The manifest’s own answer: the IV attribute, hex read as bytes.
  assert.deepEqual(Array.from(hexIv('0x00000000000000000000000000000002')), [
    ...new Uint8Array(15).fill(0),
    2,
  ]);
  assert.equal(hexIv('0x00'), null, 'not sixteen bytes, no answer');
  assert.equal(hexIv('0xzz000000000000000000000000000002'), null);
});

test('the pad trick strips the standard’s padding exactly', async () => {
  // The ciphertext on the wire is an unpadded CBC of the plaintext.
  // WebCrypto always pads, so the wire’s own ciphertext is minted here
  // by encrypting the (block-aligned) plaintext and dropping the pad
  // block’s cipher that WebCrypto appended to it.
  const rawKey = new Uint8Array(16).map((_, at) => (at * 17 + 3) % 256);
  const iv = new Uint8Array(16).fill(9);
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, [
    'encrypt',
    'decrypt',
  ]);
  const plaintext = new Uint8Array(32);
  for (let at = 0; at < plaintext.length; at += 1) {
    plaintext[at] = (at * 41 + 7) % 256;
  }
  const padded = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    plaintext,
  );
  const wire = new Uint8Array(padded.byteLength - 16);
  wire.set(new Uint8Array(padded).subarray(0, wire.length));

  const read = await decryptSegment(rawKey, wire, iv);
  assert.ok(read instanceof ArrayBuffer, 'the answer is clonable bytes');
  assert.deepEqual(new Uint8Array(read), plaintext);

  // A segment that is not the standard’s own shape — torn mid-block, or
  // a single block short of two — is no segment: an honest miss, not an
  // error.
  assert.equal(await decryptSegment(rawKey, wire.subarray(0, 20), iv), null);
  assert.equal(await decryptSegment(rawKey, wire.subarray(0, 16), iv), null);
});

// A fetch stood up to the hands the worker asks through; a miss is an
// answer shaped like one (`ok: false`), and a network failure throws the
// way the real one does.
const serve = (answers) => (url) => {
  const answer = answers.get(url);
  if (answer === undefined) return Promise.resolve({ ok: false });
  if (answer instanceof Error) return Promise.reject(answer);
  if (typeof answer === 'string') {
    return Promise.resolve({ ok: true, text: async () => answer });
  }
  return Promise.resolve({
    ok: true,
    text: async () => '',
    arrayBuffer: async () => answer.slice(0),
  });
};

test('the worker reads a manifest and gives its segments back', async () => {
  // The stream’s own truth: a key fetched once, a plaintext built the
  // same way the pad-trick test builds its — through WebCrypto’s own
  // padded encrypt, its pad-block cipher dropped for the wire.
  const rawKey = new Uint8Array(16).map((_, at) => (at * 13 + 5) % 256);
  const plaintext = new Uint8Array(48);
  for (let at = 0; at < plaintext.length; at += 1) {
    plaintext[at] = (at * 29 + 11) % 256;
  }
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, [
    'encrypt',
  ]);
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: sequenceIv(41) },
    key,
    plaintext,
  );
  const wireSegment = new Uint8Array(sealed.byteLength - 16);
  wireSegment.set(new Uint8Array(sealed).subarray(0, wireSegment.length));
  const initBytes = new Uint8Array(24).fill(7);

  globalThis.fetch = serve(
    new Map([
      [BASE, mediaManifest({ iv: false, sequence: true, end: true })],
      [KEY_URL, rawKey.slice().buffer],
      [INIT_URL, initBytes.slice().buffer],
      [SEGMENT_URL, wireSegment.slice().buffer],
    ]),
  );

  const worker = createCipherWorker();
  const answer = await worker.readCipher(BASE);
  assert.equal(answer.cipher, 'aes-128');
  assert.notEqual(answer.plan, null);
  assert.equal(answer.plan.url, BASE);
  assert.equal(answer.plan.init, INIT_URL);
  assert.deepEqual(
    answer.plan.segments.map((one) => ({ url: one.url, seq: one.seq })),
    [
      { url: SEGMENT_URL, seq: 41 },
      { url: SECOND_URL, seq: 42 },
    ],
  );

  // The init segment rides the same door and comes back its own honest
  // bytes; the sealed segment comes back whole.
  const init = await worker.giveSegment(INIT_URL);
  assert.deepEqual(new Uint8Array(init), initBytes);
  const read = await worker.giveSegment(SEGMENT_URL);
  assert.deepEqual(new Uint8Array(read), plaintext);

  // The key was fetched once: with the segment still served and the key
  // address now refusing, the ask decrypts from the cache — a second key
  // fetch would answer with a miss and the segment would come back
  // nothing at all.
  globalThis.fetch = serve(
    new Map([[SEGMENT_URL, wireSegment.slice().buffer]]),
  );
  const again = await worker.giveSegment(SEGMENT_URL);
  assert.deepEqual(new Uint8Array(again), plaintext);

  // And a segment whose fetch fails is a miss, never an error.
  globalThis.fetch = serve(
    new Map([[SEGMENT_URL, new Error('the network fell over')]]),
  );
  assert.equal(await worker.giveSegment(SEGMENT_URL), null);
  delete globalThis.fetch;
});

test('the unseal answers the proxy’s ask by the same ledger', async () => {
  // The proxy’s two verbs over one stream: an address the ledger holds
  // sealed names itself at the door, and the bytes on hand are
  // unsealed through the ledger’s own decree, the key fetched once
  // and cached since.
  const rawKey = new Uint8Array(16).map((_, at) => (at * 19 + 2) % 256);
  const plaintext = new Uint8Array(32);
  for (let at = 0; at < plaintext.length; at += 1) {
    plaintext[at] = (at * 53 + 1) % 256;
  }
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, [
    'encrypt',
  ]);
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: sequenceIv(41) },
    key,
    plaintext,
  );
  const wire = new Uint8Array(sealed.byteLength - 16);
  wire.set(new Uint8Array(sealed).subarray(0, wire.length));
  const plainInit = new Uint8Array(24).fill(5);

  globalThis.fetch = serve(
    new Map([
      [BASE, mediaManifest({ iv: false, sequence: true, end: true })],
      [KEY_URL, rawKey.slice().buffer],
      [SEGMENT_URL, wire.slice().buffer],
    ]),
  );
  const worker = createCipherWorker();
  await worker.readCipher(BASE);

  // The seal at the door: the whole-segment addresses name themselves,
  // the plain init and every stranger address are no seal at all.
  assert.equal(worker.seals(SEGMENT_URL), true);
  assert.equal(worker.seals(SECOND_URL), true);
  assert.equal(worker.seals(INIT_URL), false, 'the init is plain');
  assert.equal(worker.seals('https://elsewhere.example/seg.mp4'), false);

  // The unseal, of bytes on hand: the plaintext, as the pad trick says.
  const plain = await worker.unseal(SEGMENT_URL, wire);
  assert.deepEqual(new Uint8Array(plain), plaintext);

  // An address the ledger never read passes byte for byte: the room is
  // honest about what it did not do.
  const untouched = await worker.unseal(INIT_URL, plainInit);
  assert.deepEqual(new Uint8Array(untouched), plainInit);

  // The key was fetched once: with every door now refusing, the ask
  // still unseals from the cache — a second key fetch would answer a
  // miss and the element one nothing at all.
  globalThis.fetch = serve(new Map([]));
  const again = await worker.unseal(SEGMENT_URL, wire);
  assert.deepEqual(new Uint8Array(again), plaintext);
  delete globalThis.fetch;
});

test('the hands carry the stream’s word on every door', async () => {
  // A worded stream, read the whole way: the manifest ask, the
  // segment ask, and the key fetch the decree owes — each one fetched
  // with the words the page itself said at the manifest ask, and none
  // of them invented beyond the policy’s carried names.
  const rawKey = new Uint8Array(16).map((_, at) => (at * 17 + 3) % 256);
  const plaintext = new Uint8Array(32);
  for (let at = 0; at < plaintext.length; at += 1) {
    plaintext[at] = (at * 71 + 2) % 256;
  }
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, [
    'encrypt',
  ]);
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: sequenceIv(41) },
    key,
    plaintext,
  );
  const wire = new Uint8Array(sealed.byteLength - 16);
  wire.set(new Uint8Array(sealed).subarray(0, wire.length));
  const SAID = { authorization: 'Bearer tok' };

  const answers = new Map([
    [BASE, mediaManifest({ iv: false, sequence: true, end: true })],
    [KEY_URL, rawKey.slice().buffer],
    [SEGMENT_URL, wire.slice().buffer],
  ]);
  const asks = [];
  globalThis.fetch = (url, init) => {
    asks.push({ url: String(url), said: init?.headers ?? null });
    const one = answers.get(String(url));
    if (one === undefined) return Promise.resolve({ ok: false });
    if (typeof one === 'string') {
      return Promise.resolve({ ok: true, text: async () => one });
    }
    return Promise.resolve({
      ok: true,
      text: async () => '',
      arrayBuffer: async () => one.slice(0),
    });
  };

  const worker = createCipherWorker();
  await worker.readCipher(BASE, SAID);
  const answer = await worker.giveSegment(SEGMENT_URL, SAID);
  assert.deepEqual(new Uint8Array(answer), plaintext);

  // The word rode every door: the manifest, the segment, the key.
  assert.deepEqual(asks, [
    { url: BASE, said: SAID },
    { url: SEGMENT_URL, said: SAID },
    { url: KEY_URL, said: SAID },
  ]);
  delete globalThis.fetch;
});

test('a plan is said only for a stream the frame can play', async () => {
  // The word’s whole point: the plan is a promise the frame’s own
  // playback room can keep. The TS transport cannot be fed (Firefox’s
  // media source has no support for mp2t), a live playlist never ends,
  // a playlist too long to promise whole is live in spirit, and a
  // cipher that is not the whole-segment kind is heard but not planned.
  const tooLong = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="door.key"',
    '#EXT-X-MAP:URI="init.mp4"',
    '#EXT-X-ENDLIST',
  ];
  for (let at = 0; at < 4097; at += 1) tooLong.push('seg.mp4');
  const answers = new Map([
    [
      'https://s.example/ts.m3u8',
      [
        '#EXTM3U',
        '#EXT-X-KEY:METHOD=AES-128,URI="door.key"',
        '#EXTINF:6.0,',
        'seg0.ts',
        '#EXT-X-ENDLIST',
      ].join('\n'),
    ],
    [
      'https://s.example/live.m3u8',
      [
        '#EXTM3U',
        '#EXT-X-KEY:METHOD=AES-128,URI="door.key"',
        '#EXT-X-MAP:URI="init.mp4"',
        '#EXTINF:6.0,',
        'seg0.mp4',
      ].join('\n'),
    ],
    [
      'https://s.example/sample.m3u8',
      [
        '#EXTM3U',
        '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="door.key"',
        '#EXT-X-MAP:URI="init.mp4"',
        '#EXT-X-MEDIA-SEQUENCE:41',
        '#EXTINF:6.0,',
        'seg0.mp4',
        '#EXT-X-ENDLIST',
      ].join('\n'),
    ],
    ['https://s.example/whole.m3u8', mediaManifest({ iv: false })],
    ['https://s.example/toolong.m3u8', tooLong.join('\n')],
  ]);
  answers.delete(undefined);
  globalThis.fetch = serve(answers);

  const worker = createCipherWorker();
  const read = (url) => worker.readCipher(url);
  const declined = await read('https://s.example/ts.m3u8');
  assert.equal(declined.cipher, 'aes-128');
  assert.equal(declined.plan, null, 'the transport is declined');
  const endless = await read('https://s.example/live.m3u8');
  assert.equal(endless.plan, null, 'a live playlist is no plan');
  const sample = await read('https://s.example/sample.m3u8');
  assert.equal(sample.cipher, 'sample-aes');
  assert.equal(sample.plan, null, 'sample-aes is heard but not played');
  const promised = await read('https://s.example/whole.m3u8');
  assert.notEqual(promised.plan, null, 'the fmp4 VOD is planned');
  const long = await read('https://s.example/toolong.m3u8');
  assert.equal(long.plan, null, 'a playlist too long to promise whole');
  delete globalThis.fetch;
});

test('the worker never throws its misses at the hub', async () => {
  const rawKey = new Uint8Array(16).fill(3);
  globalThis.fetch = serve(
    new Map([
      [BASE, new Error('the network fell over')],
      [KEY_URL, rawKey.slice().buffer],
    ]),
  );
  const worker = createCipherWorker();
  assert.equal(await worker.readCipher(BASE), null, 'a dead manifest is null');
  assert.equal(
    await worker.readCipher('https://stream.example/nothing'),
    null,
    'a failed fetch is a miss',
  );
  assert.equal(
    await worker.giveSegment(SEGMENT_URL),
    null,
    'a segment asked of a dead wire is a miss too',
  );
  delete globalThis.fetch;
});
