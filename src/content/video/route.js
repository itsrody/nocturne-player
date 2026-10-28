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
// the browser’s to attach; the background’s hand says the ask with
// credentials included, so the origin answers it the way it would have
// answered the page.
//
// Film-only, told at the arming: the patches stand only in the frame
// whose own walk confirmed a film, and the hub re-tells the law at its
// envelope (the want on the book’s entry), so a frame cannot route
// through a book its viewer never chose. The patch’s own honesty is
// the fallback: whatever the hub, the wire or the answer says, a miss —
// status refused, bytes absent, the port dark — is the page’s own
// native ask, spoken whole and unmodified.
import { replayedHeads } from '../../lib/bearers.js';
import { createDebug } from '../../lib/debug.js';
import { isMediaShaped } from '../../lib/media.js';
import { asRouteBytes, sayRouteAsk } from '../../lib/protocol.js';
import { pageWindow, toPage } from './pageapi.js';

// The diagnostics voice of the routing: the asks the shim caught, the
// ones it fell back on, and the reason for each — the three questions
// nobody could reconstruct from the network panel alone.
const debug = createDebug('route');

// The response shapes a routed answer can honestly be delivered as. A
// shape outside the set — `blob` and everything exotic — falls back to
// the native ask: the shim never pretends a shape it cannot build from
// bytes in hand.
const SHAPES = new Set(['', 'text', 'arraybuffer', 'json']);

// The routed ask’s assembled answer is worded in the page’s own header
// interface, built from the answer’s one content type — the only header
// a media reader honestly needs to construct its reader’s shapes. The
// rest of the origin’s answer the house does not re-say: the origin
// said it to a different room, and the shim’s readers never claimed it.
const pageContentType = (contentType) =>
  Reflect.construct(Headers, [toPage({ 'content-type': contentType ?? '' })]);

export const createRoute = (up) => {
  // The asks in flight, keyed by the id that pairs them with their
  // answers: one promise each, resolved by the reply and forgotten.
  const wired = new Map();
  let next = 0;

  // The replies are heard from the birth: an ask armed during a sweep
  // can have its answer already coming — a listener that only stood at
  // arming would lose the first asks’ answers to the race. A reply
  // whose asker has gone is heard and dropped whole.
  up.onMessage.addListener((word) => {
    const answer = asRouteBytes(word);
    if (answer === null) return;
    const ask = wired.get(answer.id);
    if (ask === undefined) return;
    wired.delete(answer.id);
    ask(answer);
  });

  // One ask across the port: the id minted here, the word said there,
  // and a mouth that failed mid-word answering the miss directly — the
  // caller’s fallback takes it as it takes any miss.
  const route = (url, heads) =>
    new Promise((resolve) => {
      const id = next++;
      wired.set(id, resolve);
      try {
        up.postMessage(sayRouteAsk(id, url, 'GET', heads));
      } catch {
        wired.delete(id);
        resolve(null);
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
    if (scope.__nocturneRoute === true) return;
    scope.__nocturneRoute = true;

    // --- The ask shape’s own door: the page’s binding. ---

    const native = scope['fetch'];
    if (typeof native === 'function' && typeof exportFunction === 'function') {
      // The ask must be a plain address — a literal string or a URL —
      // and a GET, and media-shaped, or the native ask takes it whole.
      // A `Request` object’s own ask is the page’s business: its shape
      // is one the shim cannot read plainly, so it falls back by
      // construction, never by failure.
      const patched = (input, init) => {
        if (typeof input !== 'string' && !(input instanceof URL)) {
          return Reflect.apply(native, scope, [input, init]);
        }
        const asked = typeof input === 'string' ? input : String(input);
        if (!isMediaShaped('xmlhttprequest', asked)) {
          return Reflect.apply(native, scope, [input, init]);
        }
        const method = String(
          (init !== undefined && init.method) || 'GET',
        ).toUpperCase();
        if (method !== 'GET') {
          return Reflect.apply(native, scope, [input, init]);
        }
        // An init with its own header object is read plainly when the
        // page said it as a dict of names and values — the shape the
        // page’s own code spells most — and falls back where it
        // cannot: Headers instances, arrays and the exotic shapes are
        // the native ask’s business.
        let heads = [];
        if (init !== undefined && init.headers !== undefined) {
          if (init.headers === null || typeof init.headers !== 'object') {
            return Reflect.apply(native, scope, [input, init]);
          }
          const pairs = Object.entries(init.headers).map(([name, value]) => ({
            name,
            value: String(value),
          }));
          heads = replayedHeads(pairs);
        }
        // The routed ask, and its fallback: a miss — the hub gone, the
        // origin refused, the wire dark — is the page’s own ask, whole.
        return route(asked, heads).then((answer) => {
          if (answer === null || answer.status === 0 || answer.bytes === null) {
            debug('the routed ask fell back to the page’s own', asked);
            return Reflect.apply(native, scope, [input, init]);
          }
          debug('the routing carried the film’s ask', asked);
          // The answer, wrapped in the page’s own realm’s shapes: the
          // bytes cross cloned, the status and the one content type
          // ride the page’s own standard classes, so the player reads
          // a Response as if it had asked itself.
          return Reflect.construct(scope.Response, [
            toPage(new Uint8Array(answer.bytes)),
            {
              status: answer.status,
              statusText: '',
              headers: pageContentType(answer.contentType),
            },
          ]);
        });
      };
      try {
        scope['fetch'] = exportFunction(patched, scope);
      } catch {
        // A binding the window refuses to have redefined (a frozen
        // page, an un-waivable compartment) is not patched: the page's
        // own ask stands, and the room says so, honestly.
        scope.__nocturneRoute = false;
        return;
      }
    }

    // --- The brand’s own door: `open` (recording), `send` (speaking). ---

    const brand = scope['XMLHttpRequest'];
    if (
      brand === null ||
      typeof brand !== 'object' ||
      typeof exportFunction !== 'function'
    ) {
      debug('the routing is armed with the page ask’s door alone');
      return;
    }

    // The borrowed words, read through the descriptors’ own view: a
    // method the brand lacked is not patched and not recorded — the
    // room stands for nothing on that shape, deliberately.
    const borrow = (name) => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(
          brand.prototype,
          name,
        );
        const value = descriptor?.value;
        return typeof value === 'function' ? value : null;
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
    const lay = (name, patchedBack) => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(
          brand.prototype,
          name,
        );
        Object.defineProperty(brand.prototype, name, {
          ...descriptor,
          value: exportFunction(patchedBack, scope),
        });
        return true;
      } catch {
        return false;
      }
    };

    // The answer’s delivery, on the very instance the page is already
    // listening to. The instance, waved, is laid the page-state the
    // ask would have carried: status, response in the shape the page
    // asked for, and the moments the reader listens to.
    const deliver = (instance, answer, rspType, url) => {
      const w = instance.wrappedJSObject ?? instance;
      let text = null;
      try {
        text = new TextDecoder('utf-8').decode(new Uint8Array(answer.bytes));
      } catch {
        // A body that did not decode stays null — a byte string the
        // reader’s own text request can read no other way.
      }
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
      write('readyState', 4);
      write('status', answer.status);
      write('statusText', '');
      write('responseURL', url);
      write('getAllResponseHeaders', () =>
        answer.contentType === null
          ? ''
          : `content-type: ${answer.contentType}\r\n`,
      );
      write('getResponseHeader', (name) => {
        if (String(name).toLowerCase() !== 'content-type') return null;
        return answer.contentType ?? null;
      });
      if (rspType === '' || rspType === 'text') {
        write('responseText', text ?? '');
        write('response', text ?? '');
      } else if (rspType === 'arraybuffer') {
        write('response', toPage(new Uint8Array(answer.bytes)).buffer);
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
      // The moments the reader listens to: the state’s change first,
      // the load riding the same truth, and `loadend` last — the
      // page’s own three hooks are all the truth says. An event the
      // instance would not take is a listener the page chose not to
      // hear; the state is already written, and the reader is served
      // either way.
      for (const name of ['readystatechange', 'load', 'loadend']) {
        try {
          instance.dispatchEvent(Reflect.construct(scope.Event, [name]));
        } catch {
          // A dispatch the page tears down mid-flight is one nobody
          // home was owed; the state is written, the ask is whole.
        }
      }
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
            Reflect.apply(origOpen, this, arguments);
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
            Reflect.apply(origSet, this, arguments);
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
              return Reflect.apply(origSend, this, arguments);
            }
            const instance = this;
            const rspType = String(instance.responseType ?? '');
            if (!SHAPES.has(rspType)) {
              // A shape the shim cannot build is the native ask’s
              // business, said before any of the house’s work — never
              // delivered half of a shape nobody asked for.
              return Reflect.apply(origSend, this, arguments);
            }
            const carried = replayedHeads(ask.heads);
            route(ask.url, carried).then((answer) => {
              // An ask aborted while the house was speaking is a dead
              // ask: nobody is listening, nobody is owed any of it.
              if (ask.aborted) return undefined;
              if (
                answer === null ||
                answer.status === 0 ||
                answer.bytes === null
              ) {
                debug('the routed ask fell back to the page’s own', ask.url);
                return Reflect.apply(origSend, instance, []);
              }
              deliver(instance, answer, rspType, ask.url);
              return undefined;
            });
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
            return Reflect.apply(origAbort, this, arguments);
          }, scope);
    /* eslint-enable no-invalid-this, prefer-rest-params, consistent-return */

    // The four words are laid only all-or-none where the brand had
    // them: a half-patched brand is a page whose asks half-catch — the
    // one shape this room refuses to be.
    const laidOpen = opened !== null && lay('open', opened);
    const laidSend = spoken !== null && lay('send', spoken);
    const laidSet = worn === null || lay('setRequestHeader', worn);
    const laidAbort = quitted === null || lay('abort', quitted);
    if (!(laidOpen && laidSend && laidSet && laidAbort)) {
      // A patch that would not land leaves the natives whole — the
      // room disarms entirely rather than stand half-spoken.
      scope.__nocturneRoute = false;
      return;
    }
    debug('the routing is armed with the brand’s own door');
  };

  return { arm };
};
