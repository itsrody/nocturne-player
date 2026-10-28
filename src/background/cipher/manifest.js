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
// The MPD (DASH) read, the ladder’s side alone. A DASH manifest is an
// XML document: AdaptationSets group the stream’s media kinds, and the
// video sets carry the Representations — the rungs the picture is
// encoded at, each with its id, its bandwidth, its pixel height, its
// codec string. The m3u8 family is the *other* half of the grammar:
// what a Representation reads as a rung, a STREAM-INF reads as a
// variant, and the sheet does not care which cursor names it. The pin
// is an honest limit told, not fought: rewording an m3u8’s pairs is
// worded text the player re-reads; an MPD is a document whose
// playback the site’s own engine drives, and a rung of it is not
// offered in the words the pin speaks.
const asXmlAttrs = (tag) => {
  const attributes = {};
  const pattern = /([A-Za-z:]+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(tag)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
};

export const readMpd = (text, base) => {
  // Not an MPD after all — a document that merely starts like one,
  // an RSS feed, a manifest-oracle lie. The m3u8 read is the first
  // guess, and this return tells it so.
  if (/<\s*MPD[\s>]/i.test(text) === false) return null;
  const variants = [];
  // The sets, walked as documents: a video stream rides AdaptationSets
  // that say so — by their contentType, by the mimeType of the
  // Representations they carry. A set that says nothing is not
  // guessed about, and a set that says audio is left to the audio
  // row’s own arm.
  const sets =
    text.match(/<AdaptationSet\b[^>]*>[\s\S]*?<\/AdaptationSet>/g) ?? [];
  const carryVideo = (set) => {
    const head = asXmlAttrs(set.match(/<AdaptationSet\b[^>]*>/)?.[0] ?? '');
    if (/^video\//.test(head.mimeType ?? '') || head.contentType === 'video') {
      return true;
    }
    return /mimeType="video\//.test(set);
  };
  for (const set of sets) {
    if (!carryVideo(set)) continue;
    for (const tag of set.match(/<Representation\b[^>]*>/g) ?? []) {
      const attributes = asXmlAttrs(tag);
      const height = Number(attributes.height) || 0;
      const bandwidth = Number(attributes.bandwidth) || 0;
      if (height === 0 && bandwidth === 0) continue;
      variants.push({
        index: variants.length,
        bandwidth,
        height,
        codecs: attributes.codecs ?? null,
        // A Representation’s own media address is a template the
        // house does not expand here — the pinned master’s own
        // address stands where a playlist line would, spelled and
        // harmless: the rung is quoted, not fetched.
        url: base,
      });
    }
  }
  // Only a picture ladder the document truly named is an answer: an
  // MPD of audio alone, or of a DASH-shaped-but-pathological text, is
  // no read the house can honestly quote.
  if (variants.length === 0) return null;
  // The read’s shape says what it is: no master to reword, no variant
  // to follow, and the rungs are the whole of what was read.
  return { isMaster: false, mpd: true, cipher: null, variants };
};

export const readManifest = (text, base) => {
  // DASH speaks its own format — an MPD document the m3u8 grammar is
  // entirely foreign to — and the read must not call it nothing. The
  // ladder side of the house reads it here; the seal side (Segment
  // expansion for playback) is an arm beyond, and the answer names
  // what it is so no caller mistakes an MPD for a master it cannot
  // reword.
  if (/<\s*MPD[\s>]/i.test(text)) return readMpd(text, base);

  const lines = text.split(/\r?\n/);
  if (!lines.some((line) => line.trim() === '#EXTM3U')) return null;

  // The master pass: STREAM-INF lines name variants by bandwidth, and
  // the line after each names the variant’s own playlist. The widest
  // one wins — the same choice the element’s own players make first —
  // and the whole list rides with it: the ladder is the stream’s own
  // truth, and the sheet’s answer for the players whose ladder object
  // the DOM cannot reach. Each variant names the height its
  // RESOLUTION encoded (the attribute is `w×h`), the bandwidth it was
  // asked at, its codecs, and the address its own playlist sits at.
  let best = null;
  const variants = [];
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
    const height = attributes.RESOLUTION?.match(/(\d+)\s*$/)?.[1];
    const one = {
      index: variants.length,
      bandwidth: Number(attributes.BANDWIDTH) || 0,
      height: height !== undefined ? Number(height) : 0,
      codecs: attributes.CODECS ?? null,
      url: next,
    };
    variants.push(one);
    if (best === null || one.bandwidth > best.bandwidth) {
      best = one;
    }
  }
  if (best !== null) return { isMaster: true, variant: best, variants };

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

// The pin’s own hand, pure like the read: a master playlist reworded
// to name its one chosen variant — every other STREAM-INF pair taken
// out whole, everything else the manifest said (the header, the
// independent-segments word, any interleave) carried across untouched.
// The player whose master this is loads a ladder of one and plays
// exactly the variant the viewer tagged: no engine access needed, the
// manifest is simply the truth the ABR reads. A variant named by
// nothing, a text with no master shape, lies by returning the whole
// original — the caller serves it unharmed.
export const keepVariant = (text, base, keepUrl) => {
  const lines = text.split(/\r?\n/);
  const kept = [];
  let changed = false;
  let keptA = false;
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at];
    const trimmed = line.trim();
    if (!trimmed.startsWith('#EXT-X-STREAM-INF')) {
      kept.push(line);
      continue;
    }
    // The variant’s own playlist is the first plain line after the
    // tag; the address is resolved against the manifest’s own base —
    // the same reading `readManifest` does, so a pin made by one
    // reader lands on the variant the other one met.
    let uriAt = -1;
    for (let after = at + 1; after < lines.length; after += 1) {
      const candidate = lines[after].trim();
      if (candidate === '' || candidate.startsWith('#')) continue;
      uriAt = after;
      break;
    }
    if (uriAt === -1) {
      kept.push(line);
      continue;
    }
    const variant = resolve(lines[uriAt].trim(), base);
    if (variant !== keepUrl) {
      // The unchosen pair goes whole — tag and its playlist line.
      at = uriAt;
      changed = true;
      continue;
    }
    // The rung the pin said landed: a reword that kept nothing at
    // all would be a master of no variants — the stream the player
    // cannot even start. That is not the pin’s word, and the whole
    // original is the honest answer. The kept line is said in its
    // absolute form: a master replays at its own address as often as
    // not — a data door, a shim’s re-spelling — and a rung that
    // resolves against the address it rides *because* it rode there
    // is a rung that breaks the moment its carrier changes. Absolute
    // is where the reading already put it; the page asks for it by
    // that address the moment it was resolved.
    keptA = true;
    lines[uriAt] = variant;
    kept.push(line);
  }
  return changed && keptA ? kept.join('\n') : null;
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
