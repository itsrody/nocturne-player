// The manifest’s reading, pure. Everything in this file parses, counts
// and unseals — no fetching, no caching, no clock: a function of the
// text it is handed and nothing else. The worker beside it is the one
// that holds the network’s hands; the tests read every part of this
// room whole.

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

// The seal’s canonical word: the same address, said the ledger’s way,
// so an ask spelled by another hand — the page’s own loader, the
// manifest’s other resolutions — is heard for what it says. The
// fragment goes, the scheme and host go small, the default port goes
// unnamed, the empty query goes, and the hex of every percent-escape
// is said the standard’s own way (uppercase). A word the URL cannot
// honestly form stands as itself — the exact spelling, no canonical
// word invented for it.
export const sealKeyOf = (url) => {
  let spoken;
  try {
    spoken = new URL(url);
  } catch {
    return url;
  }
  const path = spoken.pathname.replace(
    /%([0-9a-fA-F]{2})/g,
    (_, hex) => `%${hex.toUpperCase()}`,
  );
  const search = spoken.search.replace(
    /%([0-9a-fA-F]{2})/g,
    (_, hex) => `%${hex.toUpperCase()}`,
  );
  return `${spoken.origin}${path}${search}`;
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

// The WebCrypto wrinkle this file owns: `subtle.decrypt` insists on
// PKCS#7 padding, and the HLS standard’s AES-128 carries none. The
// standard pad block is therefore spelled in our own hand and its
// cipher added to the tail: one extra block, encrypted with the pad as
// its plaintext and the ciphertext’s own last block as its counter,
// gives `decrypt` a tail that strips to exactly the plaintext.
//
// One segment’s read: WebCrypto’s CBC is the workhorse communications
// here, and the pad trick is what makes it speak the HLS standard’s
// unpadded dialect. The key arrives raw and is imported fresh — the
// worker’s cache holds the CryptoKey between asks, not this helper.
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
