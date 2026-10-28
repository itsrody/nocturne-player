// nocturne-privacy-allowance: fetch
// The pre-buffer — FastStream’s one big beside-its-own-player idea, cut
// to the house’s own hatch. The engine hls.js runs reads its fragments
// one at a time, so a slow per-connection site caps playback at a
// single stream’s speed however long a buffer is asked for. This shelf
// breaks that ceiling: as each order is filled, the loader quietly
// orders the next few fragments behind it in parallel — four orders at
// a time — and holds what it fills on a bounded shelf in the page’s
// own memory. When the engine then asks for a fragment the shelf
// already holds, the answer is instant, served from memory; what the
// shelf does not hold, the raw engine fetches as it always would.
// The arithmetic is FastStream’s whole idea — parallel orders, one
// shelf, nothing the engine asks for that the shelf cannot answer or
// fetch — with none of its own parser’s weight: the engine hls.js
// itself already parses and demuxes, and this room only adds speed.
//
// The shelf rides the engine’s own loader contract: hls.js hands every
// load — playlists, fragments, keys — through one pluggable class, and
// the class here is that class, wrapped. Playlists always pass through
// untouched (they must be read fresh — the keeper may have rewritten
// them, a live stream rolls its window); their response *is* read, and
// its fragment list goes into the inventory the look-ahead walks, the
// freshest playlist’s being the live inventory. Fragments are the
// shelf’s own: a hit answers straight out of memory with the stats
// shape hls.js reads as any other; a miss passes through to the raw
// engine and is shelved on the way back.
//
// The look-ahead never invents an address: it walks forward from the
// fragment the engine actually served, along the inventory that
// playlist gave — which is what keeps the room honest even where a
// live stream rolls its window between queries, or where a delta
// playlist (`#EXT-X-SKIP`) names fewer fragments than it carries: the
// walk over a list it cannot see whole stops there, and the engine’s
// own reads ride the raw loader as always. When the inventory is
// replaced — a level switch, a fresh roll — the parallel orders of the
// old list are cancelled, so nothing is spent on fragments the
// playhead has left behind.
//
// The allowance line at the head covers this room’s one verb: the
// look-ahead orders are page-side fetches that carry only addresses
// the playlist being played named, in the neighbourhood of what the
// engine already asks for — nothing else is fetched, and nothing is
// sent anywhere.
const WINDOW_DEFAULT = 6;
const CONCURRENCY_DEFAULT = 4;
const BUDGET_DEFAULT = 64 * 1024 * 1024;

// A byte range spelled as the playlist names it — `<length>[@<start>]`.
// A length without a start chains off the fragment before it, which
// only holds if the whole ranged run is cached in order; the shelf
// refuses that chain and answers a null start, and the fragment rides
// as a pass-through.
const parseRangeLine = (line) => {
  const spec = line.slice(line.indexOf(':') + 1);
  const [length, offset] = spec.split('@');
  if (!/^\d+$/.test(length.trim())) return null;
  return typeof offset === 'string' && /^\d+$/.test(offset.trim())
    ? { length: Number(length), start: Number(offset) }
    : { length: Number(length), start: null };
};

// The absolute resolve of a playlist-relative naming: the playlist’s
// directory is the base, and `new URL` does the walking.
const dirOf = (url) => {
  const at = typeof url === 'string' ? url.lastIndexOf('/') : -1;
  return at >= 0 ? url.slice(0, at + 1) : url;
};

const absolute = (url, base) => {
  try {
    return new URL(url, base).href;
  } catch {
    // A naming that resolves to nothing is one the shelf forgets; the
    // engine simply passes through it.
    return null;
  }
};

export const parsePlaylist = (text, playlistUrl) => {
  if (typeof text !== 'string' || !text.startsWith('#EXTM3U')) return null;
  const base = dirOf(playlistUrl);
  const frags = [];
  let pending = null; // a byte range waiting on the next url line
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#EXTINF')) continue;
    if (trimmed.startsWith('#EXT-X-BYTERANGE')) {
      pending = parseRangeLine(trimmed);
      continue;
    }
    if (trimmed.startsWith('#EXT-X-SKIP')) {
      // A delta playlist names fewer fragments than it carries: the
      // walk refuses to guess into the hidden part, and the shelf gets
      // no inventory from it at all.
      return null;
    }
    if (trimmed.startsWith('#EXT-X-MAP')) {
      // An `#EXT-X-MAP` names an init segment whose read the engine
      // asks for on its own road; it is recorded (the shelf can cache
      // what it asks for) but never becomes a look-ahead order itself.
      const said = /URI="([^"]+)"/.exec(trimmed)?.[1];
      if (typeof said === 'string') {
        const url = absolute(said, base);
        if (url !== null) {
          frags.push({ url, rangeStart: 0, rangeEnd: 0, init: true });
        }
      }
      continue;
    }
    if (trimmed.startsWith('#')) continue;
    // A plain line is a fragment url — the ordered lifeblood of the
    // look-ahead, absolutized the road hls.js itself absolutizes: the
    // playlist’s directory, `new URL` for the walking. A byte window
    // with a bare length chains off the unknown, so it rides as a
    // pass-through, windowless.
    let start = 0;
    let end = 0;
    if (pending !== null && pending.start !== null) {
      start = pending.start;
      end = start + pending.length;
    }
    pending = null;
    const url = absolute(trimmed, base);
    if (url !== null) {
      frags.push({ url, rangeStart: start, rangeEnd: end, init: false });
    }
  }
  return frags.length > 0 ? frags : null;
};

// The stats hls.js reads after every load — the vendored room’s own
// LoadStats shape, filled for a serve that never touched the wire.
// Every field the playback arithmetic subtracts must be a number, or
// the engine reads a hole.
const cachedStats = (length) => {
  const now = performance.now();
  return {
    aborted: false,
    loaded: length,
    retry: 0,
    total: length,
    chunkCount: 0,
    bwEstimate: 0,
    loading: { start: now, first: now, end: now },
    parsing: { start: 0, end: 0 },
    buffering: { start: 0, first: 0, end: 0 },
  };
};

// The request’s shelf key: the address, and the byte window the engine
// asked for when it did — two reads of one address with two windows
// are two fragments, not one entry.
const keyOf = (url, rangeStart, rangeEnd) =>
  `${url}|${rangeStart || 0}-${rangeEnd || 0}`;

const readUrl = (context) =>
  typeof context?.url === 'string' && context.url !== '' ? context.url : '';

export const createPrebufLoader = (Hls, options = {}) => {
  const lookAhead = options.window ?? WINDOW_DEFAULT;
  const concurrency = options.concurrency ?? CONCURRENCY_DEFAULT;
  const budget = options.budget ?? BUDGET_DEFAULT;
  // The raw engine loader: every order the shelf itself places — a
  // miss between it and the playlist, or a look-ahead order — rides
  // one instance of this, so the engine’s own transport, headers, and
  // retry policy are the road either way.
  const EngineLoader = Hls?.DefaultConfig?.loader;
  if (typeof EngineLoader !== 'function') return null;

  // ── the shelf ─────────────────────────────────────────────────────
  const entries = new Map(); // key → { data, bytes, index }
  let bytes = 0;
  // The inventory the look-ahead walks: the fragment list of the
  // playlist freshly parsed — a level switch or a live roll replaces
  // it, and the old list’s parallel orders go with it.
  let inventory = null;

  const store = (key, data, index) => {
    if (!(data instanceof ArrayBuffer) || data.byteLength === 0) return false;
    bytes += data.byteLength;
    entries.set(key, { data, bytes: data.byteLength, index });
    // Eviction is to the front: the fragment furthest behind the
    // playhead is the one the engine cannot want next, so its bytes
    // leave first and the shelf stays bounded.
    while (bytes > budget && entries.size > 1) {
      let evict = null;
      let leftmost = Infinity;
      for (const [key, entry] of entries) {
        if (entry.index < leftmost) {
          leftmost = entry.index;
          evict = key;
        }
      }
      bytes -= entries.get(evict).bytes;
      entries.delete(evict);
    }
    return true;
  };

  // ── the parallel orders ────────────────────────────────────────────
  const queue = []; // waiting orders, nearest the playhead first
  const runningBy = new Map(); // key → the in-flight EngineLoader
  // The load policy the last fragment order rode: look-ahead orders
  // ask with the engine’s own timeouts and policy, never a private one.
  let engineLoadConfig = null;

  const makeContext = (order) => ({
    // The vendored room’s own fragment-context shape; only the url
    // changes from order to order.
    type: 'media-fragment',
    frag: null,
    part: null,
    responseType: 'arraybuffer',
    url: order.url,
    headers: {},
    rangeStart: 0,
    rangeEnd: 0,
  });

  // The parallel orders run at most `concurrency` at a time.
  const pump = () => {
    while (runningBy.size < concurrency && queue.length > 0) {
      const order = queue.shift();
      if (engineLoadConfig === null) {
        queue.unshift(order);
        return;
      }
      const loader = new EngineLoader(engineLoadConfig);
      runningBy.set(order.key, loader);
      loader.load(
        makeContext(order),
        { ...engineLoadConfig },
        {
          onSuccess: (response) => {
            runningBy.delete(order.key);
            if (response?.data instanceof ArrayBuffer) {
              store(order.key, response.data, order.index);
            }
            pump();
          },
          // A refused or timed-out order is simply not shelved: the
          // engine will ask for it on its own road if the playhead
          // reaches it, and that read decides again.
          onError: () => {
            runningBy.delete(order.key);
            pump();
          },
          onTimeout: () => {
            runningBy.delete(order.key);
            pump();
          },
        },
      );
    }
  };

  // The look-ahead, fired from a served fragment: find the fragment’s
  // shelf position in the live inventory and order the window after
  // it. A served fragment the inventory does not name — a rolled live
  // window, a fresh playlist still in flight — orders nothing; the
  // next refresh gives the shelf a list it can walk again. What it
  // orders is only ever *further inside the same list*, which is the
  // truth the room is built on.
  const ahead = (url) => {
    if (inventory === null) return;
    const at = inventory.index.get(url);
    if (at === undefined) return;
    for (let step = 1; step <= lookAhead; step++) {
      const target = inventory.frags[at + step];
      // Init segments and byte-windowed fragments are never look-ahead
      // orders: the engine’s own reads of those stay its own — and
      // where a byte window begins, the walk stops, for the chain of
      // ranged fragments behind it is not guessable from here.
      if (target === undefined || target.init || target.rangeStart > 0) break;
      const key = keyOf(target.url, 0, 0);
      if (
        entries.has(key) ||
        runningBy.has(key) ||
        queue.some((order) => order.key === key)
      ) {
        continue;
      }
      queue.push({ key, url: target.url, index: at + step });
    }
    pump();
  };

  // The inventory replaced — a level switch is the only replacement
  // that counts: a *same* playlist url parsed fresh (hls.js re-reads
  // its playlist every refresh tick) lists the same stream’s
  // fragments, and the orders in flight stay good; a different url is
  // a different fragment list, and its predecessor’s parallel orders
  // would fill nothing the playhead wants — they are cancelled where
  // they stand, so nothing is spent behind.
  const inventoryIs = (url, next) => {
    const switched = inventory !== null && inventory.playlistUrl !== url;
    inventory = next;
    if (!switched) return;
    for (const loader of runningBy.values()) {
      try {
        loader.destroy();
      } catch {
        // An order already unwound is not owed a burial.
      }
    }
    runningBy.clear();
    queue.length = 0;
  };

  class PrebufLoader {
    constructor(config) {
      this.config = config ?? {};
      this.engine = null;
    }

    load(context, config, callbacks) {
      const url = readUrl(context);
      if (context?.type === 'media-fragment') {
        // The policy the fragment orders ride: the look-ahead keeps
        // asking exactly as hls.js asked this one.
        engineLoadConfig = { ...config };
        const key = keyOf(url, context.rangeStart, context.rangeEnd);
        const held = entries.get(key);
        if (held !== undefined) {
          // An instant serve, out of the shelf’s own memory.
          ahead(url);
          callbacks.onSuccess(
            { url, data: held.data, code: 200 },
            cachedStats(held.bytes),
            context,
            null,
          );
          return;
        }
        // The pass-through engine loader, a fresh instance per load:
        // hls.js never reuses a loader instance between loads, and the
        // shelf will not gamble on the vendored room’s habits. The
        // look-ahead fires *now*, as the order is placed — its
        // neighbour fragments read in parallel with this one — which
        // is the whole arithmetic of the room; had it waited for this
        // read to land, the parallelism would always start one event
        // behind itself.
        ahead(url);
        const loader = new EngineLoader(this.config);
        this.engine = loader;
        loader.load(context, config, {
          ...callbacks,
          onSuccess: (response, stats, loaded, networkDetails) => {
            const data = response?.data;
            if (data instanceof ArrayBuffer && data.byteLength > 0) {
              // Shelved before the engine is told — the next ask finds
              // the answer ready. The shelf position rides the live
              // inventory: a fragment it does not name (an init
              // segment, a post-roll read) parks at Infinity, first
              // out of the shelf when it must shrink.
              const at = inventory?.index.get(url);
              store(key, data, at === undefined ? Infinity : at);
            }
            callbacks.onSuccess(response, stats, loaded, networkDetails);
          },
        });
        return;
      }
      // A playlist: passed through untouched — read fresh, whatever
      // the keeper did or a live roll wants — but its response is
      // read here, for the list is what the look-ahead walks.
      const loader = new EngineLoader(this.config);
      this.engine = loader;
      loader.load(context, config, {
        ...callbacks,
        onSuccess: (response, stats, loaded, networkDetails) => {
          const frags = parsePlaylist(response?.data, response?.url || url);
          if (frags !== null) {
            inventoryIs(url, {
              playlistUrl: url,
              frags,
              index: new Map(frags.map((one, at) => [one.url, at])),
            });
          }
          callbacks.onSuccess(response, stats, loaded, networkDetails);
        },
      });
    }

    abort() {
      this.engine?.abort?.();
    }

    destroy() {
      try {
        this.engine?.destroy?.();
      } catch {
        // An order the engine killed first is not owed a second.
      }
      this.engine = null;
    }

    // The hatch’s own fatal seam: when it buries the engine it buries
    // the shelf’s orders and empties the shelf with them, so nothing
    // keeps fetching against an engine that no longer exists.
    static dispose() {
      for (const loader of runningBy.values()) {
        try {
          loader.destroy();
        } catch {
          // An order already unwound is not owed a burial.
        }
      }
      runningBy.clear();
      queue.length = 0;
      entries.clear();
      bytes = 0;
      inventory = null;
      engineLoadConfig = null;
    }
  }

  return PrebufLoader;
};
