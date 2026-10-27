// The non-DRM cipher work, in the one room that can hold it. A site is
// free to hand its viewers' players a stream the element alone cannot
// read — the HLS standard’s own AES-128, whose key sits in the manifest
// as public data. Nothing here touches a DRM system: no CDM is asked
// for, nothing is circumvented; the manifest’s own key material is
// fetched and applied, exactly as every open-source player does.
//
// The work is split the way the platform forces it to be: the bytes
// cross the network in the background’s room (host permissions make
// the fetch CORS-free, `crypto.subtle` makes it honest), and the
// playback answers to an element in a frame the background cannot
// touch. What crosses the port is always clonable data — plans and
// segment bytes — never a live object.
//
// The one network allowance the house declares, here where the fetching
// happens so the privacy scan reads its own book:
//
//   nocturne-privacy-allowance: fetch
//
// It is earned, not widened: the hands here fetch a manifest, a key and
// the segments of a stream the viewer’s own page was already fetching —
// the same origins, and nowhere else. No beacon, no sensor, no code, no
// account: the word above names the fetch and only the fetch.
//
// The WebCrypto wrinkle this file owns: `subtle.decrypt` insists on
// PKCS#7 padding, and the HLS standard’s AES-128 carries none. The
// standard pad block is therefore spelled in our own hand and its
// cipher added to the tail: one extra block, encrypted with the pad as
// its plaintext and the ciphertext’s own last block as its counter,
// gives `decrypt` a tail that strips to exactly the plaintext.

// The segment bound a plan is said under, mirroring the protocol’s
// own guard: a playlist is promised to the frame whole or not at all.
import { MAX_PLAN_SEGMENTS } from '../lib/protocol.js';

// One line’s attributes, without the quotes the manifest wraps them
// in: METHOD=AES-128,URI="key.example/key",IV=0x0000000000000001.
const asAttributes = (line) => {
  const attributes = {};
  const pattern = /([A-Z0-9-]+)=("[^"]*"|'[^']*'|[^,:]*)/g;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    let value = match[2];
    // 34 is the double quote, 39 the apostrophe: the manifest’s habit of
    // wrapping its own values, stripped once, whole.
    if (value.charCodeAt(0) === 34 || value.charCodeAt(0) === 39) {
      value = value.slice(1, -1);
    }
    attributes[match[1]] = value;
  }
  return attributes;
};

// An address relative to the manifest’s own, resolved once — the
// manifest’s habit is relative names. A URL the address cannot form
// honestly (a malformed line) is no address at all.
const resolve = (uri, base) => {
  try {
    return new URL(uri, base).href;
  } catch {
    return null;
  }
};

// The manifest read in one pass: the variant list if it is a master,
// the play order if it is a media playlist. What comes back is the
// stream’s own truth — which cipher it carries, where the init segment
// (if it is fmp4) sits, where each segment sits, what key each one is
// sealed with, and whether it ever ends.
export const readManifest = (text, base) => {
  const lines = text.split(/\r?\n/);
  if (!lines.some((line) => line.trim() === '#EXTM3U')) return null;

  // The master pass: STREAM-INF lines name variants by bandwidth, and
  // the line after each names the variant’s own playlist. The widest
  // one wins — the same choice the element’s own players make first.
  let best = null;
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const attributes = asAttributes(line);
    let next = null;
    for (let after = at + 1; after < lines.length; after += 1) {
      const candidate = lines[after].trim();
      if (candidate === '' || candidate.startsWith('#')) continue;
      next = resolve(candidate, base);
      break;
    }
    if (next === null) continue;
    const bandwidth = Number(attributes.BANDWIDTH) || 0;
    if (best === null || bandwidth > best.bandwidth) {
      best = {
        bandwidth,
        url: next,
        codecs: attributes.CODECS ?? null,
      };
    }
  }
  if (best !== null) return { isMaster: true, variant: best };

  // The media pass: the key decree carries until the next one, the map
  // names the init segment, and every plain line is a segment in play
  // order, counted from the playlist’s own media sequence number.
  let method = 'NONE';
  let keyUri = null;
  let keyIv = null;
  let map = null;
  let sequence = 0;
  let ended = false;
  const segments = [];
  const keys = [];
  for (const line of lines) {
    const at = line.trim();
    if (at === '') continue;
    if (at.startsWith('#EXT-X-KEY')) {
      const attributes = asAttributes(at);
      method = attributes.METHOD ?? 'NONE';
      keyUri =
        attributes.URI !== undefined ? resolve(attributes.URI, base) : null;
      keyIv = attributes.IV ?? null;
      keys.push({ method, keyUri, keyIv });
    } else if (at.startsWith('#EXT-X-MAP')) {
      const attributes = asAttributes(at);
      map = attributes.URI !== undefined ? resolve(attributes.URI, base) : null;
    } else if (at.startsWith('#EXT-X-MEDIA-SEQUENCE')) {
      sequence = Number(at.split(':')[1]) || 0;
    } else if (at.startsWith('#EXT-X-ENDLIST')) {
      ended = true;
    } else if (at.startsWith('#')) {
      continue;
    } else {
      const url = resolve(at, base);
      if (url === null) continue;
      // A key decree speaks only for the segments under it: METHOD=NONE
      // seals nothing, and a segment before any decree seals nothing.
      segments.push({
        url,
        seq: sequence,
        method,
        keyUri: method === 'NONE' ? null : keyUri,
        keyIv,
      });
      sequence += 1;
    }
  }
  if (segments.length === 0) return null;
  // The cipher word is the stream’s own last decree, named only when the
  // scheme is one the house knows and plays or knows and has not yet
  // played: a NAME the manifest spoke that the corpus never said refuses
  // the word entire — no guessing that an unknown method is a known one.
  let cipher = null;
  if (method === 'AES-128') cipher = 'aes-128';
  if (method === 'SAMPLE-AES') cipher = 'sample-aes';
  return {
    isMaster: false,
    cipher,
    init: map,
    ended,
    segments,
    keys,
  };
};

// The cipher’s default answer for a segment whose key decree named no
// IV of its own: the sequence number, as a 128-bit big-endian counter.
// Both counters are exported because the unit tests read them whole —
// they are the derivation the worker’s defaults trust.
export const sequenceIv = (seq) => {
  const bytes = new Uint8Array(16);
  let rest = BigInt(seq);
  for (let at = 15; at >= 0 && rest > 0n; at -= 1) {
    bytes[at] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return bytes;
};

export const hexIv = (hex) => {
  const bare =
    hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (bare.length !== 32) return null;
  const bytes = new Uint8Array(16);
  for (let at = 0; at < 16; at += 1) {
    const digit = Number.parseInt(bare.slice(at * 2, at * 2 + 2), 16);
    if (Number.isNaN(digit)) return null;
    bytes[at] = digit;
  }
  return bytes;
};

// The full pad block, the standard’s own: one block of 0x10 bytes.
const PAD = new Uint8Array(16).fill(16);

// One segment’s read: WebCrypto’s CBC is the workhorse communications
// here, and the pad trick above is what makes it speak the HLS
// standard’s unpadded dialect. The key arrives raw and is imported
// fresh — the worker’s cache holds the CryptoKey between asks, not
// this helper.
export const decryptSegment = async (rawKey, data, iv) => {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, [
    'encrypt',
    'decrypt',
  ]);
  const ciphertext = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (ciphertext.byteLength < 32 || ciphertext.byteLength % 16 !== 0) {
    return null;
  }
  // The pad block’s own cipher, spelled off the ciphertext’s tail: the
  // counter is the block already on the wire.
  const tail = ciphertext.subarray(ciphertext.byteLength - 16);
  const padCipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: tail },
    key,
    PAD,
  );
  const block = new Uint8Array(ciphertext.byteLength + 16);
  block.set(ciphertext, 0);
  block.set(new Uint8Array(padCipher).subarray(0, 16), ciphertext.byteLength);
  try {
    return await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, block);
  } catch {
    return null;
  }
};

// The worker: one key per generation fetched once and imported once,
// a ledger of where each segment sits and what seals it, and the two
// verbs the hub routes to it — read the manifest, fetch and unseal
// one segment. Fetches are made with the browser’s own hands, which
// the host permission makes CORS-free for exactly the origins the
// user’s own player already visits. Nothing here throws at the hub:
// a failed fetch is a miss, and a miss is an answer.
export const createCipherWorker = () => {
  const keyCache = new Map();
  const ledger = new Map();

  const fetchKey = async (uri) => {
    const onHand = keyCache.get(uri);
    if (onHand !== undefined) return onHand.key;
    const answer = await fetch(uri);
    if (!answer.ok) return null;
    const raw = new Uint8Array(await answer.arrayBuffer());
    if (raw.byteLength !== 16) return null;
    const key = await crypto.subtle.importKey('raw', raw, 'AES-CBC', false, [
      'encrypt',
      'decrypt',
    ]);
    keyCache.set(uri, { raw, key });
    return key;
  };

  // The plan built from the manifest read. The ledger holds the
  // stream’s own seal-facts, keyed by the segment’s address; the plan
  // is only said when the frame could honestly play it — AES-128, an
  // fmp4 init map, and a playlist that ends.
  const finish = (manifest, manifestUrl) => {
    if (
      manifest === null ||
      manifest.cipher === null ||
      manifest.isMaster === true
    ) {
      return null;
    }
    for (const one of manifest.segments) {
      if (one.url !== null) ledger.set(one.url, one);
    }
    const playable =
      manifest.cipher === 'aes-128' &&
      manifest.init !== null &&
      manifest.ended &&
      manifest.segments.length <= MAX_PLAN_SEGMENTS;
    return {
      cipher: manifest.cipher,
      plan: playable
        ? {
            url: manifestUrl,
            codecs: manifest.codecs ?? null,
            init: manifest.init,
            segments: manifest.segments.map((one) => ({
              url: one.url,
              seq: one.seq,
            })),
          }
        : null,
    };
  };

  // The read itself. A fetch that throws (the network fell over, the
  // origin refused the background’s hands) is the same miss a failed
  // fetch already is: null answers, and the caller has no catch to
  // wrap anything in.
  const readCipher = async (manifestUrl) => {
    try {
      const answer = await fetch(manifestUrl);
      if (!answer.ok) return null;
      let manifest = readManifest(await answer.text(), manifestUrl);
      if (manifest?.isMaster === true) {
        const variant = manifest.variant;
        if (variant.url === null) return null;
        const inner = await fetch(variant.url);
        if (!inner.ok) return null;
        manifest = readManifest(await inner.text(), variant.url);
        if (manifest !== null) manifest.codecs = variant.codecs;
      }
      return finish(manifest, manifestUrl);
    } catch {
      return null;
    }
  };

  // One segment, sealed or not as its own decree says. The init
  // segment (the map) is normally plain, but it is asked through the
  // same door all the same: a miss is a miss either way.
  const giveSegment = async (url) => {
    const seal = ledger.get(url);
    let bytes;
    try {
      const answer = await fetch(url);
      if (!answer.ok) return null;
      bytes = new Uint8Array(await answer.arrayBuffer());
    } catch {
      return null;
    }
    if (seal === undefined || seal.keyUri === null) return bytes.buffer;
    const key = await fetchKey(seal.keyUri);
    if (key === null) return null;
    const iv = seal.keyIv !== null ? hexIv(seal.keyIv) : sequenceIv(seal.seq);
    if (iv === null) return null;
    return decryptSegment(keyCache.get(seal.keyUri).raw, bytes, iv);
  };

  return { readCipher, giveSegment };
};
