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
// account: the word above names the fetch and only the fetch. And the
// hands are never bare: every fetch here carries the stream’s bearer
// word — the credentials and the site’s own `x-` names the page itself
// said at the manifest ask (`src/lib/bearers.js` is the one policy) —
// because a stream whose key answers a bare hand is a stream the house
// could never read at all. Nothing is invented, nothing is widened to
// another origin; a stream no word is said for is fetched as it always
// was, bare-handed too.
import { bearerWords } from '../../lib/bearers.js';
import { MAX_PLAN_SEGMENTS } from '../../lib/protocol.js';
import {
  decryptSegment,
  hexIv,
  readManifest,
  sealKeyOf,
  sequenceIv,
} from './manifest.js';

// A bound on the ledger’s own size, for the same reason any book keeps
// one: a persistent background page lives for the browser’s lifetime,
// and streams a lifetime loads should not outlive their parts
// uncounted. The oldest recorded address is the first forgotten.
const LEDGER_MAX = 8192;

// The worker: one key per generation fetched once and imported once,
// a ledger of where each segment sits and what seals it, and the two
// verbs the hub routes to it — read the manifest, fetch and unseal
// one segment. Fetches are made with the browser’s own hands, which
// the host permission makes CORS-free for exactly the origins the
// user’s own player already visits. Nothing here throws at the hub:
// a failed fetch is a miss, and a miss is an answer.
// The fetch init the word builds: the carried words as headers, and
// nothing at all where no word stands — a stream fetched as it always
// was. The same words every mouth of the house carries, one policy.
const initOf = (heads) => {
  const said = bearerWords(heads);
  return Object.keys(said).length === 0 ? undefined : { headers: said };
};

export const createCipherWorker = () => {
  const keyCache = new Map();
  const ledger = new Map();

  const fetchKey = async (uri, heads) => {
    const onHand = keyCache.get(uri);
    if (onHand !== undefined) return onHand.key;
    const answer = await fetch(uri, initOf(heads));
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
  // stream’s own seal-facts, keyed by the segment’s address — in its
  // canonical word, the spelling every ask is heard by — and the
  // read replaces its own stream’s generation: the newest manifest is
  // the stream’s only truth, so the addresses the read leaves behind —
  // a token the next ask expired — are forgotten together, and no other
  // stream’s word is hurried. The plan is only said when the frame
  // could honestly play it — AES-128, an fmp4 init map, and a playlist
  // that ends.
  const finish = (manifest, manifestUrl) => {
    if (
      manifest === null ||
      manifest.cipher === null ||
      manifest.isMaster === true
    ) {
      return null;
    }
    for (const [address, seal] of ledger) {
      if (seal.stream === manifestUrl) ledger.delete(address);
    }
    for (const one of manifest.segments) {
      if (one.url !== null) {
        ledger.set(sealKeyOf(one.url), { ...one, stream: manifestUrl });
      }
    }
    // The ledger’s own bound: the oldest address recorded is the first
    // forgotten when the bound is met — a map remembers its order, so
    // the forgetting never must.
    while (ledger.size > LEDGER_MAX) {
      const oldest = ledger.keys().next().value;
      ledger.delete(oldest);
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
  const readCipher = async (manifestUrl, heads) => {
    try {
      const answer = await fetch(manifestUrl, initOf(heads));
      if (!answer.ok) return null;
      let manifest = readManifest(await answer.text(), manifestUrl);
      if (manifest?.isMaster === true) {
        const variant = manifest.variant;
        if (variant.url === null) return null;
        const inner = await fetch(variant.url, initOf(heads));
        if (!inner.ok) return null;
        manifest = readManifest(await inner.text(), variant.url);
        if (manifest !== null) manifest.codecs = variant.codecs;
      }
      return finish(manifest, manifestUrl);
    } catch {
      return null;
    }
  };

  // The unseal, of bytes already on hand: the ledger’s decree, the
  // key’s own answer (fetched once, cached since), and the standard’s
  // own counter. An address that is not sealed comes back byte for
  // byte — the coins are the stream’s, and the room is honest about
  // what it did not do.
  const unseal = async (url, received, heads) => {
    const data =
      received instanceof Uint8Array ? received : new Uint8Array(received);
    const seal = ledger.get(sealKeyOf(url));
    if (seal === undefined || seal.keyUri === null) return data.buffer;
    const key = await fetchKey(seal.keyUri, heads);
    if (key === null) return null;
    const iv = seal.keyIv !== null ? hexIv(seal.keyIv) : sequenceIv(seal.seq);
    if (iv === null) return null;
    return decryptSegment(keyCache.get(seal.keyUri).raw, data, iv);
  };

  // One segment, sealed or not as its own decree says. The init
  // segment (the map) is normally plain, but it is asked through the
  // same door all the same: a miss is a miss either way.
  const giveSegment = async (url, heads) => {
    let bytes;
    try {
      const answer = await fetch(url, initOf(heads));
      if (!answer.ok) return null;
      bytes = new Uint8Array(await answer.arrayBuffer());
    } catch {
      return null;
    }
    return unseal(url, bytes, heads);
  };

  // The seal check, asked synchronously at the proxy’s door: an
  // address the ledger holds sealed with the whole-segment scheme, and
  // none other. A cleartext address, an unknown one, a sample-aes
  // stream’s business — all are no seal, no filter, no word.
  const seals = (url) => {
    const seal = ledger.get(sealKeyOf(url));
    return seal !== undefined && seal.method === 'AES-128';
  };

  // The routed ask’s hand: the page’s own ask, made by the background’s
  // hands — the shim in the film frame caught the ask the player built,
  // and this is where it is finally spoken. The init is the ask’s own
  // sentence: the method the word said (the guard upstream admits GET
  // and nothing wider), the header pairs the carry law filtered at the
  // saying side, and the credentials mode the page itself said — the
  // ask is crossed compartments here, but the house extends the page’s
  // cookie reach by nothing: an ask the page said without its own
  // credentials word carries no third-party cookie from this side
  // either (the default is `same-origin`, what the native ask would
  // have carried). A status the origin refused, and a fetch that threw,
  // answer with the honest miss: a null byte beside the real status,
  // never an error at the hub. Beside the miss, the origin’s own answer
  // furniture is read and replayed — the length the bytes truly are and
  // the range row a byte-range reader reads — nothing more: the origin
  // said the rest of its answer to the ask itself, not to the page.
  const askBytes = async (url, ask) => {
    const heads = {};
    for (const one of ask.heads) {
      heads[one.name] = one.value;
    }
    const creden = ['omit', 'same-origin', 'include'].includes(ask.creden)
      ? ask.creden
      : 'same-origin';
    try {
      const answer = await fetch(url, {
        method: 'GET',
        headers: Object.keys(heads).length === 0 ? undefined : heads,
        credentials: creden,
      });
      const readAnswer = (name) => answer.headers.get(name);
      const said = [
        ['content-length', readAnswer('content-length')],
        ['content-range', readAnswer('content-range')],
      ].filter(([, value]) => typeof value === 'string');
      const bytes = answer.ok ? await answer.arrayBuffer() : null;
      return {
        status: answer.status,
        contentType: answer.headers.get('content-type'),
        bytes,
        heads: said.map(([name, value]) => ({ name, value })),
      };
    } catch {
      return { status: 0, contentType: null, bytes: null, heads: [] };
    }
  };

  return { readCipher, giveSegment, seals, unseal, askBytes };
};
