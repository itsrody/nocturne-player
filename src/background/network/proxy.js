// The proxy room. The other ear of the bus: where the eye only observes,
// this one answers — the house’s one declared rewriting verb, spoken
// where the fetching can never be done by the page and the reading is
// already ours.
//
// The one network allowance the house declares, and the one wire it
// may hold:
//
//   nocturne-privacy-allowance: filterresponse
//
// It is earned, not widened, and its narrowness is the whole book:
// only a response to an address the cipher room’s ledger holds *sealed*
// — a segment the viewer’s own player is already fetching on the fetch
// family — is held at the response’s door, its cipher read, unsealed
// and handed on whole. A miss writes the sealed bytes past, the stream
// the page would anyway have played. Every other response — every page,
// every address, every scheme — the room never sees. No relay, no cache
// of content, no third origin, no answer to a word nobody fetched.
//
// Why an edit at the stream and not a takeover: the platform hands the
// answer to the room *in flight* through `filterResponseData`, so the
// page’s own player runs undisturbed — its MSE pipeline, its quality
// ladder, its own error recovery — and the film it reads is simply the
// plaintext the manifest decree said it was allowed to read.
import { createDebug } from '../../lib/debug.js';

const debug = createDebug('proxy');

// The in-flight set: the filters the room holds right now. CBC needs
// the whole cipher before the pad trick can answer it, so every
// intercepted response is buffered whole — the walk’s old discipline
// applies: a small counted budget, never unbounded, counted by the
// filter, never by the byte.
const MAX_FILTERS = 4;

// The parts read from the stream, joined once. One cipher, whole, is
// what CBC is decrypted from — never a half of one.
const cat = (parts) => {
  const whole = new Uint8Array(
    parts.reduce((sum, part) => sum + part.byteLength, 0),
  );
  let at = 0;
  for (const part of parts) {
    whole.set(part, at);
    at += part.byteLength;
  }
  return whole;
};

// The one listener, registered where the response crosses: the decision
// is synchronous and cheap (two map reads and a set), so no request is
// ever held for thinking. `webRequest` is absent where the permission
// is not granted or the platform stubbed out — a stand-in room that has
// nothing to hold is wired to nothing, not to a crash.
export const createProxy = (browser, worker, book) => {
  if (browser?.webRequest?.onHeadersReceived === undefined) return;
  if (browser.webRequest.filterResponseData === undefined) return;

  const inFlight = new Set();

  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      // A request with no tab behind it — service-worker chatter,
      // speculative connections, the browser’s own housekeeping — is no
      // page’s film.
      if (details.tabId < 0) return;
      // A tab the book has never heard of is a stream the house has not
      // read: no ledger word about its manifest, and nothing honest to
      // say about its seals. The coarse gate is the honest one — the
      // book knows every tab a crossing ever warmed.
      if (!book.books.has(details.tabId)) return;
      // The dispatch is the ledger’s alone: an address the cipher room
      // read a decree for, sealed with the whole-segment scheme, and
      // none other. The seal is asked synchronously, at the door — a
      // worker without the verb answers nothing, and nothing is held.
      if (worker?.seals === undefined) return;
      if (!worker.seals(details.url)) return;
      if (inFlight.size >= MAX_FILTERS) return;

      // The words to the stream: every byte read is kept, nothing is
      // let past until the answer is said.
      const filter = browser.webRequest.filterResponseData(details.requestId);
      inFlight.add(details.requestId);
      const parts = [];
      debug('the proxy holds a sealed answer', details.url);
      filter.ondata = (event) => {
        parts.push(new Uint8Array(event.data));
      };
      filter.onerror = () => {
        inFlight.delete(details.requestId);
      };
      filter.onstop = () => {
        // The answer is read whole: the slot goes back to the budget
        // now, whatever the unseal makes of the cipher — the budget
        // counts the buffers, never the arithmetic.
        inFlight.delete(details.requestId);
        const sealed = cat(parts);
        // The unseal’s own hands carry the room’s bearer word, for the
        // key fetch the decree may still owe: the same word every mouth
        // of the house carries.
        Promise.resolve(
          worker.unseal(details.url, sealed, book.said(details.tabId)),
        )
          .then((plain) => {
            // A miss writes the sealed bytes past: the stream the page
            // plays is the stream it would anyway have played. Under the
            // viewer’s switch the miss speaks — a hold says its line at
            // the door; a miss that stayed silent could only ever be
            // guessed at whole.
            filter.write(plain ?? sealed);
            if (plain === null) {
              debug('the unseal answered a miss', details.url);
            }
            filter.disconnect();
          })
          .catch(() => {
            try {
              filter.write(sealed);
              filter.disconnect();
            } catch {
              // A filter the browser has already torn down holds
              // nobody.
            }
          });
      };
    },
    // The types are the whole story: the script-ridden fetch family —
    // the one a streaming library rides its sealed segments on. A media
    // element’s own bytes are never held: an element’s load is the
    // browser’s act, whole and unscripted, and the ledger holds no word
    // about it.
    {
      urls: ['<all_urls>'],
      types: ['xmlhttprequest'],
    },
  );
};
