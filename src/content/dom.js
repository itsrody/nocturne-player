// One duty, one file: the frame’s story of the page it stands in. What a
// move of the page is has one hearing here — a burst of mutations, a
// resize, the tab seen again, a film drawing nearer, the network’s knock
// about bytes already crossing the bus — all of it is the same ask,
// answered once, on one beat, by whoever asked to hear moves at all. The
// discipline is the whole cost of the module:
//
// - the **eye** is stood when the first listener reaches the manager and
//   stands down behind the last — a frame with nothing to hear from the
//   page pays nothing for it, and no consumer ever wires its own
//   document-level observer again;
// - the **beat** is one for a burst: however many asks arrive while the
//   beat is pending, the listeners hear one passage, so a storm of knocks
//   is never a storm of walks;
// - the **approach eye** is a second, smaller eye, for elements the story
//   is told to keep watch on — an element drawing nearer the viewport is
//   a move too, and a scroll that goes nowhere near costs nothing;
// - a move on an **unseen page** is no move at all: rect and style reads
//   are forced layout a hidden document paints nothing for, so the beat
//   sits out, and the tab seen again re-arms it;
// - the **ease** is the page's own quiet, native `requestIdleCallback`:
//   work handed in runs when the page rests (a page that never rests
//   still meets it, at the timeout), once per asking — so a survey that
//   is wanted later is made while the viewer is not waiting; and
// - the **turn** is the page's own count of the moves it has said. An
//   answer made of the page is stamped with the count it was made at,
//   and whoever keeps one consults the stamp before believing it — a
//   page that has moved on since is never answered from a memory.
import { createSignal } from '../lib/signals.js';
import { createTimerSlot } from '../lib/time.js';

// The beat the page is heard on — the sweep’s old own tempo, carried by
// the manager now, because every ask is a move and the beat is where
// moves are answered.
const BEAT_MS = 250;

// The margin the approach eye watches past the viewport. The option
// shipped in Firefox 141 and the extension's floor is 158, so the option
// is always understood — and the coarse scroll listener an older page
// once paid for instead has nothing left to stand in for.
const APPROACH_MARGIN = '25%';

// The meeting the quiet is asked to keep: `requestIdleCallback` answers
// when the page rests, but a page that never rests must still meet the
// call, or the pre-made answer is never made. Shipped in Firefox 55,
// well under the floor of 158.
const EASE_TIMEOUT_MS = 4000;

// `home` is the window the resize is heard from; `doc` is the document
// the eye watches and the hidden verdict is read from. The clock’s knobs
// are the timer slot’s own: tests visit a ledger, production a real
// clock, and the manager is written as if the two were the same thing.
export const createDomManager = (
  home,
  doc,
  { arm = setTimeout, drop = clearTimeout } = {},
) => {
  // The moment a move is said at, and the only thing a consumer hears.
  const moved = createSignal();

  // The elements the approach eye keeps under watch, until the page
  // itself forgets them — the sweeping of the forgotten is the beat’s
  // own work, so nobody’s bookkeeping ever has to say goodbye.
  const kept = new Set();

  // How many ears stand, the count of moves said, and the two eyes —
  // none of which exist before the first ear does.
  let ears = 0;
  let turn = 0;
  let eye = null;
  let approacher = null;

  // The quiet: the works handed in here are the page's own resting
  // duties, keyed by the work itself so a second hand asking for the
  // same work is one rest, not two.
  const rests = new Map();

  // The beat: the slot empties itself the moment the work runs, so the
  // work asking for a next beat is a fresh arm, never a rearm of the one
  // in flight.
  const beat = createTimerSlot(onBeat, { arm, drop });

  function onBeat() {
    // A move scheduled while the page was visible can come due while it
    // is hidden; the reads the listeners' walks make are forced layout
    // on a document that paints nothing. The beat sits out, and the tab
    // being seen again is what re-arms it.
    if (doc.hidden) return;
    // The beat is the page saying a move: one count for every beat,
    // stamped by every answer the page's quiet made.
    turn += 1;
    for (const element of kept) {
      if (element.isConnected) continue;
      // An element the page has let go of is one it has forgotten: the
      // watch is dropped with it, which is what keeps this set from
      // growing without end across a long visit.
      approacher.unobserve(element);
      kept.delete(element);
    }
    moved.emit();
  }

  // One verb for every origin of motion. A move with no ear is nothing
  // to carry, a move on an unseen page is nothing to serve, and a move
  // while the beat is pending is one move already under way.
  function ask() {
    if (ears === 0) return;
    if (doc.hidden) return;
    if (beat.isOn()) return;
    beat.set(BEAT_MS);
  }

  function onVisibility() {
    // The beat that sat out while the page was hidden takes its arm
    // here: the walk the hidden page deferred is the seen page’s first
    // business.
    if (!doc.hidden) ask();
  }

  // The eye stands when the first ear stands: the document’s own
  // MutationObserver, the visibility hearing, and the resize are one
  // arrangement, and no ear of the page changes it.
  function standUp() {
    if (eye !== null) return;
    // The story's resumption is its own move. Changes the sitting eye
    // could not see are committed the moment it stands, so the count
    // jumps once here: every answer made before knows it was made for
    // an eye that was sleeping, and a stamp that reads `turn` after this
    // bumps is the new page's truth, not the sleeper's.
    turn += 1;
    eye = new MutationObserver(ask);
    eye.observe(doc.documentElement, {
      childList: true,
      subtree: true,
    });
    doc.addEventListener('visibilitychange', onVisibility);
    home.addEventListener('resize', ask);
  }

  function standDown() {
    if (eye !== null) {
      eye.disconnect();
      eye = null;
      doc.removeEventListener('visibilitychange', onVisibility);
      home.removeEventListener('resize', ask);
    }
    beat.clear();
    if (approacher !== null) {
      approacher.disconnect();
      approacher = null;
    }
    kept.clear();
  }

  return {
    // The ear of the page’s story. The ear’s leaving, if it was the
    // last, is the story standing itself down — the eye, the approach
    // eye and the beat all go with it, at no hand’s word.
    onMove: (listener) => {
      const off = moved.on(listener);
      ears += 1;
      standUp();
      return () => {
        off();
        ears -= 1;
        if (ears === 0) standDown();
      };
    },

    // Keep an element on the approach watch: its drawing nearer is a
    // move, asked for by the eye, and its forgetting is the beat’s work.
    // Asking twice for the same element is one watch — observing the
    // same element again is a cost with no gain.
    keepNear: (element) => {
      if (kept.has(element)) return;
      if (approacher === null) {
        approacher = new IntersectionObserver(ask, {
          scrollMargin: APPROACH_MARGIN,
        });
      }
      kept.add(element);
      approacher.observe(element);
    },

    // The one ask, for the moments outside the eye's own hearing: a
    // media event the listener knows first, the network's knock from the
    // background. It answers like any other move — one beat, for a burst
    // of asks one beat still.
    ask,

    // The page's quiet. The work handed in runs when the browser's own
    // idle moment reaches it — once per asking, and a work already
    // resting is one rest however many hands ask for it again. The word
    // back cancels the rest if it has not yet run, and is silent after
    // it has.
    atEase: (work) => {
      const resting = rests.get(work);
      const held =
        resting !== undefined
          ? resting
          : requestIdleCallback(
              () => {
                rests.delete(work);
                work();
              },
              { timeout: EASE_TIMEOUT_MS },
            );
      rests.set(work, held);
      return () => {
        if (rests.get(work) !== held) return;
        cancelIdleCallback(held);
        rests.delete(work);
      };
    },

    // The page's count of the moves it has said. An answer made of the
    // page is stamped with this, and the stamp is the difference between
    // an answer that is the page's and one that is its memory's.
    turn: () => turn,
  };
};
