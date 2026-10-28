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
// segment bytes — never a live object. The manifest’s own reading is
// the room beside this one, pure and free of the network.
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
import { MAX_PLAN_SEGMENTS } from '../../lib/protocol.js';
import { decryptSegment, hexIv, readManifest, sequenceIv } from './manifest.js';

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
