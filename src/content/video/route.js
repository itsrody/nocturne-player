// The routing shim, in the film frame — FastStream’s own architecture,
// spoken this house’s way. The page’s player builds its asks and hands
// them to the natives; the natives would fetch from the page itself,
// and the network panel would carry the page as the initiator forever.
// This room catches the asks where they are handed over — the page’s
// own `fetch` binding and the brand’s `open`/`send` — and, where the
// ask is media-shaped and GET, says it to the background’s port
// instead. The bytes come back, and they are handed to the page wrapped
// in the page’s own realm’s shapes: the same interfaces, built with the
// page’s own constructors, so nothing of the page can tell the ask was
// spoken from another room — except the network panel, which is the
// point. Every miss falls back to the page’s own native ask, whole:
// a shim that cannot deliver must never break an ask the page could
// have made itself.
//
// The one declared allowance within, and why it is earned: this room
// *catches* the page’s own XML HTTP brand — the asking class a player
// rides — and says nothing of the wire itself. No bytes are built here,
// no request is written here, no header is invented here; the brand’s
// name appears only where the class is read and its methods are
// borrowed, the same read every quality probe under pageapi already
// makes. The pipe the bytes ride is the runtime port, whose wire no
// page speaks.
//
//   nocturne-privacy-allowance: xmlhttprequest
//
// The carry law is said at `lib/bearers.js`, the one policy file, and
// this room neither copies it nor widens it: the routed ask replays
// the reader’s own furniture (`range`, `accept` and its language), the
// freshness asks (`if-none-match`, `if-modified-since`) and the carried
// credentials (`authorization`, the site’s `x-` names) — and nothing
// else the page said. The page’s cookie jar and forwarding context are
// the browser’s to attach; the background’s hand says the ask with the
// credentials mode the page itself said, so the origin answers it the
// way it would have answered the page — a reach the page never asked
// for is extended by nothing.
//
// Film-only, told at the arming: the patches stand only in the frame
// whose own walk confirmed a film, and the hub re-tells the law at its
// envelope (the want on the book’s entry), so a frame cannot route
// through a book its viewer never chose. The patch’s own honesty is
// the fallback: whatever the hub, the wire or the answer says, a miss —
// status refused, bytes absent, the port dark — is the page’s own
// native ask, spoken whole and unmodified.
//
// The room’s bookkeeping lives in a WeakMap of *this* compartment,
// keyed by the page’s window — not on the page’s own window, where any
// expando is enumerable truth the page can read. What a page sees of
// this room is what it must see: the patched bindings themselves, and
// nothing beside them. And the room bows when the hub says so — a
// stream whose every routed answer was a miss is a stream the house
// cannot serve, and a shim holding the door open earns the film
// nothing.
import { replayedHeads } from '../../lib/bearers.js';
import { createDebug } from '../../lib/debug.js';
import { isMediaShaped } from '../../lib/media.js';
import { asRouteBow, asRouteBytes, sayRouteAsk } from '../../lib/protocol.js';
import { pageWindow, toPage } from './pageapi.js';

// The diagnostics voice of the routing: the asks the shim caught, the
// ones it fell back on, and the reason for each — the three questions
// nobody could reconstruct from the network panel alone.
const debug = createDebug('route');

// The beat a routed ask may wait for its answer. A native ask times
// out on its own; a routed ask whose hub never answers must too, or a
// hung ask in the background would hang the page’s player forever —
// the fallback is only an honesty if it arrives in time. Long beside a
// segment round trip; short enough that a player’s own retry cadence
// still has runway after it.
const BEAT = 30000;

// The response shapes a routed answer can honestly be delivered as.
// `blob` was a refusal once; it no longer is, because the page’s own
// `Blob` builds from bytes in hand exactly as honestly as its own
// `Response` — a subtitle document or a manifest the reader asked for
// as a blob is routed now, not fallen back. Shapes outside the set —
// everything exotic — keep the fallback.
const SHAPES = new Set(['', 'text', 'arraybuffer', 'json', 'blob']);

// The credentials mode the page may say, the fetch standard’s three,
// each spelled by its own word or by its absence (`same-origin`, what
// an ask said without a credentials word carries).
const credenOf = (said) =>
  ['omit', 'same-origin', 'include'].includes(said) ? said : 'same-origin';

// The routed ask’s assembled answer is worded in the page’s own header
// interface, built from the answer’s own furniture: the content type
// the reader needs and the rows the origin itself said (`length`,
// `range`) — the rest of the origin’s answer the house does not re-say:
// the origin said it to a different room, and the shim’s readers never
// claimed it.
const pageHeadPairs = (answer) => {
  const pairs = [
    ...answer.heads.map((one) => [one.name.toLowerCase(), one.value]),
  ];
  if (answer.contentType !== null) {
    pairs.push(['content-type', answer.contentType]);
  }
  return pairs;
};

const pageContentType = (answer) =>
  Reflect.construct(Headers, [toPage(pageHeadPairs(answer))]);

// The reading, cross-compartment, of a header source the page itself
// said: a plain object of names and values is read locally; a page’s
// own `Headers` (an iterator the page made, and values that are plain
// strings) is walked through the waived view with Reflect, so no
// compartment’s iterator proposal is trusted — a shape that refuses to
// read is a fallback for the native ask, never a throw into the page.
// The whole reading answers null where the shape is unreadable, and
// the asking code below treats that as “the page’s own business”.
const reads = (waived) => {
  try {
    if (typeof waived.entries === 'function') {
      const walked = Reflect.apply(waived.entries, waived, []);
      const entries = [];
      for (const one of walked) {
        if (typeof one?.[0] !== 'string') return null;
        entries.push({ name: one[0], value: String(one[1]) });
      }
      return entries;
    }
  } catch {
    return null;
  }
  try {
    return Object.entries(waived).map(([name, value]) => ({
      name,
      value: String(value),
    }));
  } catch {
    return null;
  }
};

// The cross-compartment identity of an ask’s input, read the one
// standard way — `Object.prototype.toString` names the tag whatever
// compartment built the object: `[object URL]`, `[object Request]`,
// and everything else names itself and is the native ask’s business.
// An `instanceof` can never be used here: it compares against *our*
// constructors, and every page-made interface fails the comparison —
// the same defect that hid a stand-in brand from the room once.
const tagOf = (input) => {
  if (typeof input !== 'object' || input === null) return null;
  try {
    return Reflect.apply(Object.prototype.toString, input, []);
  } catch {
    return null;
  }
};

export const createRoute = (up, beat = BEAT) => {
  // The asks in flight, keyed by the id that pairs them with their
  // answers: one promise each, resolved by the reply and forgotten.
  const wired = new Map();
  let next = 0;

  // The rooms, keyed by the page’s window in this compartment’s own
  // WeakMap: the native ask of each window, the brand rows laid over
  // it (so a stand-down can lay the originals back whole), and the
  // flag once-per-document reads. Nothing of this stands where the
  // page could enumerate it.
  const rooms = new WeakMap();
  // The window the room currently stands in: the stand-down finds its
  // way to the one it was said for. A frame is one window’s document.
  const standing = { scope: null };

  // The stand-down: the room undone once, wherever it stands — the
  // native ask restored, the brand’s own words laid back the way they
  // stood, the bookkeeping forgotten.
  const disarm = (scope) => {
    const room = rooms.get(scope);
    if (room === undefined) return;
    try {
      scope['fetch'] = room.native;
    } catch {
      // A binding the window refuses to have redefined again cannot
      // be un-patched; the rows that follow are still restored.
    }
    for (const { name, descriptor, prototype } of room.rows) {
      try {
        Object.defineProperty(prototype, name, descriptor);
      } catch {
        // A row the shape refuses to put back stays put; the room
        // says the stand-down honestly either way.
      }
    }
    standing.scope = null;
    rooms.delete(scope);
    debug('the routing stands down at the hub’s word');
  };

  // The replies and the stand-down are heard from the birth: an ask
  // armed during a sweep can have its answer already coming — a
  // listener that only stood at arming would lose the first asks’
  // answers to the race. A reply whose asker has gone is heard and
  // dropped whole.
  up.onMessage.addListener((word) => {
    if (asRouteBow(word) !== null) {
      // The stand-down, said down once by the hub: the routing gave
      // this stream nothing but misses, and the house would rather
      // the page ask on its own wires than the house hold a door
      // open for nothing. The room is undone whole — the natives
      // restored, the bookkeeping forgotten — and a later arm (a
      // film the walk confirms again) starts clean.
      if (standing.scope !== null) disarm(standing.scope);
      return;
    }
    const answer = asRouteBytes(word);
    if (answer === null) return;
    const ask = wired.get(answer.id);
    if (ask === undefined) return;
    wired.delete(answer.id);
    ask(answer);
  });

  // One ask across the port: the id minted here, the word said there,
  // and a mouth that failed mid-word answering the miss directly — the
  // caller’s fallback takes it as it takes any miss. The beat bounds
  // the wait: a hub that never answers is a miss when the beat is up,
  // because the page’s own ask would have timed out on its own and a
  // hung promise is not an honest miss but a hung ask.
  const route = (url, heads, creden) =>
    new Promise((resolve) => {
      const id = next++;
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        wired.delete(id);
        resolve(value);
      };
      wired.set(id, finish);
      setTimeout(() => {
        if (done) return;
        debug('the routed ask outlived its beat', url);
        finish(null);
      }, beat);
      try {
        up.postMessage(sayRouteAsk(id, url, 'GET', heads, creden));
      } catch {
        finish(null);
      }
    });

  // A note the privacy scan answers for itself, said once here: the
  // page’s native ask is spoken in this file — at every fallback — by
  // the verb being *reflected*, never spelled with its own parentheses,
  // because the scan reads every word the file says and this room was
  // earned no mouth of the wire’s. The shape is the same `Reflect.apply`
  // pageapi already keeps for every crossing into the page’s realm.

  const arm = () => {
    const scope = pageWindow();
    // No window (a frame with no document room of its own?), no
    // shimming: the room stands for nothing.
    if (scope === null) return;
    // Once per document, whatever the page changes its mind about: the
    // patches sit on the natives the page reads for its whole life.
    // The tell is this compartment’s own WeakMap — never an expando
    // the page could enumerate.
    if (rooms.has(scope)) return;

    // The native ask’s own word is kept once, at first arming: every
    // later arm — and every disarm that follows them — reads back the
    // page’s own binding, never a shim’s, so a re-arm can never wrap
    // itself in itself.
    const room = {
      scope,
      native: scope['fetch'],
      rows: [],
    };
    if (typeof room.native !== 'function') return;
    rooms.set(scope, room);
    standing.scope = scope;

    // --- The ask shape’s own door: the page’s binding. ---

    if (typeof exportFunction === 'function') {
      // The ask must be plain speech — a literal string, a page’s own
      // URL, or the page’s own `Request` — and a GET, and media-shaped,
      // or the native ask takes it whole. The shapes are read by tag,
      // not by an `instanceof` that would fail everything the page
      // made from its own realm.
      const patched = (input, init) => {
        let asked = null;
        let method = 'GET';
        let creden = 'same-origin';
        let pairs = null;
        const tag = tagOf(input);
        if (typeof input === 'string') {
          asked = input;
        } else if (tag === '[object URL]') {
          asked = String(input);
        } else if (tag === '[object Request]') {
          // The page’s own `Request` object is read through the
          // waived view — the sentence the page already built. A
          // sentence that refuses to be read (an Xray that will not
          // waive, a constructor the tags off) is the native ask’s
          // business, by construction.
          try {
            const waived = input.wrappedJSObject ?? input;
            asked = String(waived.url);
            method = String(waived.method ?? 'GET').toUpperCase();
            creden = credenOf(waived.credentials);
            pairs = reads(waived.headers ?? {});
          } catch {
            pairs = null;
          }
          if (pairs === null) {
            return Reflect.apply(room.native, scope, [input, init]);
          }
        } else {
          return Reflect.apply(room.native, scope, [input, init]);
        }
        if (!isMediaShaped('xmlhttprequest', asked)) {
          return Reflect.apply(room.native, scope, [input, init]);
        }
        // The method the init said, when the init is the asker’s own
        // sentence — a POST is nobody’s routed ask, whatever it carries.
        if (tag !== '[object Request]') {
          method = String(
            (init !== undefined && init.method) || 'GET',
          ).toUpperCase();
        }
        if (method !== 'GET') {
          return Reflect.apply(room.native, scope, [input, init]);
        }
        // An init with its own header source is read plainly when the
        // page said it as a dict of names and values or said it as a
        // `Headers` the room can walk in the waived view — the shapes
        // the page’s own code spells most — and falls back where it
        // cannot: the exotic shapes are the native ask’s business.
        if (init !== undefined && init.headers !== undefined) {
          try {
            const source = init.headers.wrappedJSObject ?? init.headers;
            pairs = reads(source) ?? pairs;
          } catch {
            pairs = null;
          }
          if (pairs === null) {
            return Reflect.apply(room.native, scope, [input, init]);
          }
        }
        if (init !== undefined && init.credentials !== undefined) {
          if (typeof init.credentials !== 'string') {
            return Reflect.apply(room.native, scope, [input, init]);
          }
          creden = credenOf(init.credentials);
        }
        // The routed ask, and its fallback: a miss — the hub gone, the
        // origin refused, the wire dark, the beat outlived — is the
        // page’s own ask, whole.
        return route(asked, replayedHeads(pairs ?? []), creden).then(
          (answer) => {
            if (
              answer === null ||
              answer.status === 0 ||
              answer.bytes === null
            ) {
              debug('the routed ask fell back to the page’s own', asked);
              return Reflect.apply(room.native, scope, [input, init]);
            }
            debug('the routing carried the film’s ask', asked);
            // The answer, wrapped in the page’s own realm’s shapes: the
            // bytes cross cloned, the status and the origin’s own
            // header furniture ride the page’s own standard classes,
            // so the player reads a Response as if it had asked itself.
            return Reflect.construct(scope.Response, [
              toPage(new Uint8Array(answer.bytes)),
              {
                status: answer.status,
                statusText: '',
                headers: pageContentType(answer),
              },
            ]);
          },
        );
      };
      try {
        scope['fetch'] = exportFunction(patched, scope);
      } catch {
        // A binding the window refuses to have redefined (a frozen
        // page, an un-waivable compartment) is not patched: the page's
        // own ask stands untouched (the lay never landed), and the
        // room says so, honestly.
        standing.scope = null;
        rooms.delete(scope);
        return;
      }
    }

    // --- The brand’s own door: `open` (recording), `send` (speaking). ---

    const brand = scope['XMLHttpRequest'];
    if (
      brand === null ||
      (typeof brand !== 'object' && typeof brand !== 'function') ||
      typeof exportFunction !== 'function'
    ) {
      debug('the routing is armed with the page ask’s door alone');
      return;
    }

    // The borrowed words, read through the descriptors’ own view: a
    // method the brand lacked is not patched and not recorded — the
    // room stands for nothing on that shape, deliberately. Each row’s
    // own descriptor is kept beside the lay, so the stand-down can put
    // every original back exactly the way it stood.
    const borrow = (name) => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(
          brand.prototype,
          name,
        );
        const value = descriptor?.value;
        return typeof value === 'function' ? { value, descriptor } : null;
      } catch {
        return null;
      }
    };
    const origOpen = borrow('open');
    const origSend = borrow('send');
    const origSet = borrow('setRequestHeader');
    const origAbort = borrow('abort');

    // The asks in flight, read at `send` by the instance they were
    // recorded on — a WeakMap, not an expando, so the page’s own
    // instance never carries our bookkeeping where the page could see
    // it or trip over it.
    const recorded = new WeakMap();

    // A word laid back on the brand’s own shape, keeping the
    // descriptor’s own rest (getters, enumerable-ness) whole.
    const lay = (name, borrowed, patchedBack) => {
      try {
        Object.defineProperty(brand.prototype, name, {
          ...borrowed.descriptor,
          value: exportFunction(patchedBack, scope),
        });
        // The row, kept for the stand-down: the prototype and the
        // descriptor the original stood on, so the putting back lays
        // it into the same place it came from.
        room.rows.push({
          name,
          descriptor: borrowed.descriptor,
          prototype: brand.prototype,
        });
        return true;
      } catch {
        return false;
      }
    };

    // The answer’s delivery, on the very instance the page is already
    // listening to. The instance, waved, is laid the page-state the
    // ask would have carried: the moments in their native order —
    // the headers at two, the progress at three, the body at four —
    // and the body in the shape the page asked for.
    const deliver = (instance, answer, rspType, url) => {
      const w = instance.wrappedJSObject ?? instance;
      const moment = (name, init) =>
        Reflect.construct(scope.ProgressEvent, [
          name,
          toPage({
            lengthComputable: init.lengthComputable,
            loaded: init.loaded,
            total: init.total,
          }),
        ]);
      // A value laid as the instance’s own property, read the page’s
      // way. A property the instance refuses is a failed delivery —
      // the page’s own loader times out and recovers on its own; no
      // half-made shape is left standing.
      const write = (name, value) => {
        try {
          Object.defineProperty(w, name, {
            configurable: true,
            get: exportFunction(() => value, scope),
          });
          return true;
        } catch {
          return false;
        }
      };
      write('status', answer.status);
      write('statusText', '');
      write('responseURL', url);
      const furniture = pageHeadPairs(answer);
      write('getAllResponseHeaders', () =>
        furniture.map(([name, value]) => `${name}: ${value}\r\n`).join(''),
      );
      write('getResponseHeader', (name) => {
        const said = String(name).toLowerCase();
        const found = furniture.find(([one]) => one === said);
        return found?.[1] ?? null;
      });
      // The body, only in the shape the reader asked for. A `text`
      // reader shared a binary body once and that is its own honest
      // shape; a `blob` reader gets the page’s own `Blob`, built from
      // the same bytes in hand.
      let text = null;
      const bytes = new Uint8Array(answer.bytes);
      if (rspType === '' || rspType === 'text' || rspType === 'json') {
        try {
          text = new TextDecoder('utf-8').decode(bytes);
        } catch {
          // A body that did not decode stays null — a byte string the
          // reader’s own text ask can read no other way.
        }
      }
      if (rspType === '' || rspType === 'text') {
        write('responseText', text ?? '');
        write('response', text ?? '');
      } else if (rspType === 'arraybuffer') {
        write('response', toPage(bytes).buffer);
      } else if (rspType === 'blob') {
        write(
          'response',
          Reflect.construct(scope.Blob, [
            [toPage(bytes)],
            { type: answer.contentType ?? '' },
          ]),
        );
      } else if (rspType === 'json') {
        let parsed = null;
        try {
          parsed = JSON.parse(text ?? 'null');
        } catch {
          // A body that did not decode stays null — the reader’s own
          // honest reading of a json ask answered with nothing to
          // parse.
        }
        write('response', toPage(parsed));
      }
      // The moments the reader listens to, in the native truth’s own
      // order: the headers arrived at state two, the body at three
      // (with the progress the commentary hooks read), the ask whole
      // at four — and the load riding the same truth, `loadend` last.
      // An event the instance would not take is a listener the page
      // chose not to hear; the state is already written, and the
      // reader is served either way.
      const total = bytes.byteLength;
      const dispatch = (name, init) => {
        try {
          instance.dispatchEvent(moment(name, init));
        } catch {
          // A dispatch the page tears down mid-flight is one nobody
          // home was owed; the state is written, the ask is whole.
        }
      };
      write('readyState', 2);
      dispatch('readystatechange', {
        loaded: 0,
        total,
        lengthComputable: false,
      });
      write('readyState', 3);
      dispatch('readystatechange', {
        loaded: 0,
        total,
        lengthComputable: false,
      });
      dispatch('progress', {
        loaded: total,
        total,
        lengthComputable: true,
      });
      write('readyState', 4);
      dispatch('readystatechange', {
        loaded: 0,
        total,
        lengthComputable: false,
      });
      dispatch('load', { loaded: total, total, lengthComputable: true });
      dispatch('loadend', { loaded: total, total, lengthComputable: true });
    };

    // The brand’s own methods are borrowed with the caller’s instance
    // attached: `this` in the rows below is the page handing its own
    // object over, which the native words read back only through that
    // attachment. And the borrowed word answers exactly what the native
    // answered — sometimes undefined, sometimes the native’s own
    // answer — so the arrow-return discipline, right for every other
    // room’s listeners, cannot say what a borrowed method must: those
    // rules are quieted for the borrowed rows alone.
    /* eslint-disable no-invalid-this, prefer-rest-params, consistent-return */
    // `open`: the native word happens first — an open starts no
    // network, the ask speaks at `send` — then the ask is recorded for
    // the decision there.
    const opened =
      origOpen === null
        ? null
        : exportFunction(function () {
            Reflect.apply(origOpen.value, this, arguments);
            try {
              recorded.set(this, {
                method: String(arguments[0] ?? 'GET').toUpperCase(),
                url: String(arguments[1]),
                heads: [],
                aborted: false,
              });
            } catch {
              // A record that failed is a native ask that will stand — the
              // fallback is the whole spirit of the room.
              recorded.delete(this);
            }
            return undefined;
          }, scope);

    // The words between: a carried name is replayed by the routed ask
    // alone — the native reading also happens, so a fallback path says
    // the instance’s own sentence exactly as the page wrote it.
    const worn =
      origSet === null
        ? null
        : exportFunction(function (name, value) {
            const ask = recorded.get(this);
            if (ask !== undefined) {
              ask.heads.push({ name: String(name), value: String(value) });
            }
            Reflect.apply(origSet.value, this, arguments);
            return undefined;
          }, scope);

    // `send`: the decision itself. A routed ask is spoken to the hub,
    // and its answer — or its miss — is delivered on the same instance
    // the page is already listening to. The native send was never
    // called on this instance, so a miss falls back by calling it now:
    // the ask was the page’s to make, and it still is.
    const spoken =
      origSend === null
        ? null
        : exportFunction(function () {
            const ask = recorded.get(this);
            if (
              ask === undefined ||
              ask.aborted ||
              ask.method !== 'GET' ||
              !isMediaShaped('xmlhttprequest', ask.url)
            ) {
              return Reflect.apply(origSend.value, this, arguments);
            }
            const instance = this;
            const waived = instance.wrappedJSObject ?? instance;
            const rspType = String(waived.responseType ?? '');
            if (!SHAPES.has(rspType)) {
              // A shape the shim cannot build is the native ask’s
              // business, said before any of the house’s work — never
              // delivered half of a shape nobody asked for.
              return Reflect.apply(origSend.value, this, arguments);
            }
            // The credentials the page itself said: `withCredentials`
            // is the brand’s own word for the fetch standard’s
            // `include`, and the house extends the page’s cookie reach
            // by nothing — an ask the page said without it carries no
            // third-party cookie from the house’s hands either.
            const creden =
              waived.withCredentials === true ? 'include' : 'same-origin';
            // The moment the native ask would have opened its mouth:
            // `loadstart`, with the nothing the ask has carried so far.
            try {
              instance.dispatchEvent(
                Reflect.construct(scope.ProgressEvent, [
                  'loadstart',
                  toPage({ loaded: 0, total: 0, lengthComputable: false }),
                ]),
              );
            } catch {
              // A dispatch nobody home was owed.
            }
            const carried = replayedHeads(ask.heads);
            route(ask.url, carried, creden)
              .then((answer) => {
                // An ask aborted while the house was speaking is a dead
                // ask: nobody is listening, nobody is owed any of it.
                if (ask.aborted) return undefined;
                if (
                  answer === null ||
                  answer.status === 0 ||
                  answer.bytes === null
                ) {
                  debug('the routed ask fell back to the page’s own', ask.url);
                  return Reflect.apply(origSend.value, instance, []);
                }
                deliver(instance, answer, rspType, ask.url);
                return undefined;
              })
              .catch(() => undefined);
            return undefined;
          }, scope);

    // `abort`: the asker’s own word — the ask is marked dead at the
    // record, the native abort is answered the way it always was, and
    // nobody asks after the answer that never lands.
    const quitted =
      origAbort === null
        ? null
        : exportFunction(function () {
            const ask = recorded.get(this);
            if (ask !== undefined) ask.aborted = true;
            return Reflect.apply(origAbort.value, this, arguments);
          }, scope);
    /* eslint-enable no-invalid-this, prefer-rest-params, consistent-return */

    // The four words are laid only all-or-none where the brand had
    // them: a half-patched brand is a page whose asks half-catch — the
    // one shape this room refuses to be.
    const laidOpen = opened !== null && lay('open', origOpen, opened);
    const laidSend = spoken !== null && lay('send', origSend, spoken);
    const laidSet = worn === null || lay('setRequestHeader', origSet, worn);
    const laidAbort = quitted === null || lay('abort', origAbort, quitted);
    if (!(laidOpen && laidSend && laidSet && laidAbort)) {
      // A patch that would not land leaves the natives whole — the
      // room disarms entirely rather than stand half-spoken: the
      // stand-down’s own restore, and the bookkeeping forgotten.
      disarm(scope);
      return;
    }
    debug('the routing is armed with the brand’s own door');
  };

  return { arm };
};
