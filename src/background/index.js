// The background page: the whole machine’s room, now that no page speaks
// first. A persistent background on Firefox MV2 outlives every tab and
// never goes away under the extension, so the machine it hosts keeps for
// the browser’s lifetime of any tab that touches it — no start to await,
// nothing to tear down, and no boot order the pages could postpone
// behind.
//
// Three ears and hands, wired in one direction of dependence. The two
// ears of the network: the eye that only observes — what spoke for the
// bytes, where they came from, and the words the page itself said on
// the ask — and the two mouths that answer, both replaying the one
// word the book said: the proxy, holding a sealed segment’s response
// at the door and handing back the plaintext the manifest’s own
// decree names, and the bearer, laying the stream’s carryable words
// onto the page’s own asks. The recruiter says whether the viewer’s
// law admits the tab at all (a disabled host boots nothing and founds
// no ghost either) and boots the field agent into the frame the
// browser named — plus one sweep of the relations when the film turns
// out to be framed — and only the admitted word is written into the
// book under the key the browser attested.
import { createBook } from './book/book.js';
import { decide } from './book/seat.js';
import { createSessions } from './book/sessions.js';
import { createStrain } from './book/strain.js';
import { createReader } from './book/read.js';
import { answerState } from './book/state.js';
import { createConscript } from './conscript.js';
import { createCipherWorker } from './cipher/worker.js';
import { createWireTap } from './network/eye.js';
import { createProxy } from './network/proxy.js';
import { createBearer } from './network/bearer.js';
import { LEGACY_OPENINGS_KEY } from '../lib/words.js';

// The book’s wiring, spliced in by hand: the rooms ask the book and are
// asked by the words they carry. The cipher’s room rides the book like
// the book itself does — the sessions are the only mouth the frames
// speak through, so the worker’s two verbs — read a manifest, give one
// segment — answer through them, never the pages'.
const worker = createCipherWorker();
const book = createBook();
const read = createReader(worker, book);
const strain = createStrain({ book, read });
createSessions({ browser, book, worker, read, decide, answerState });
const conscript = createConscript(browser, { standing: book.standing });

// The proxy room stands beside the eye, *behind* the router now: a
// routed ask never crosses its door (the background’s own fetch arrives
// with no tab behind it), so its dispatch answers only the asks that
// escaped the shim — the stand-down’s page-native asks after a long
// miss streak, every fallback, and the asks made before the field
// agent was booted into the frame. Its role is the unseal floor behind
// the routing, and its dispatch is unchanged: the ledger seals, the
// book gates. The bearer room stands on the ask’s side of the same
// escaped asks: the word the manifest ask bore is laid onto the asks
// the page forgot it on — the routed asks carry their replay from the
// hub itself, the escaped asks have no hub hearing and this mouth is
// the only one they have.
createProxy(browser, worker, book);
createBearer(browser, worker, book);

createWireTap(browser, (tabId, frameId, ear) => {
  // The stream’s bearer word, said where the crossing names a family —
  // the manifest ask, which is where real streams say their
  // credentials — and carried by the wiring alone: the book holds it
  // per tab, and every mouth (the worker’s hands, the proxy’s unseal,
  // the bearer’s answer) reads it back from the book.
  if (ear.heads !== undefined && ear.shape !== null) {
    book.speak(tabId, ear.heads);
  }
  conscript.rally(tabId, frameId, ear).then((admitted) => {
    if (admitted) strain(tabId, frameId, ear);
  });
});

// The player no longer learns openings, but releases before this one kept
// what they heard in the extension’s own storage. The background removes
// the dead key once per background birth: a device that ever carried the
// learned openings ends up without them, quietly, by the time the viewer
// notices anything — and no page code now runs to sweep it, since no page
// code runs anywhere unless the wire conscripted it.
browser.storage.local.remove(LEGACY_OPENINGS_KEY).catch(() => {});
