// One duty, one file: the whole slot story, both ends of the one machine
// the runtime cannot carry. Everything that ever spoke on the runtime's
// wire — detection's verdicts, the book of seats, the counts, even the
// recruitment of the frames themselves — lives in the background's rooms
// now, and its words are built and checked in lib/protocol.js. Widening
// the room is not of that world: it means widening an element in every
// document of the chain, page-owned DOM one hop at a time, and each hop
// crosses out of every room the extension owns into a document the
// platform walls off. So the climb rides the page's own wire —
// `postMessage`, aimed by origin, one hop up at a time — and both ends of
// that wire stand here:
//
// - the **keepers** (`createSlotKeeper`) — one per document, every
//   document including the top. They grow the box of whichever child
//   window speaks a well-formed slot word, pass the word up to their own
//   parent, and hand the width back when the word goes quiet or the
//   hold's grace expires.
// - the **rider** (`createSlotRider`) — one per framed film document. It
//   mints the ticket that names its hold, aims every ask one hop up, and
//   keeps the ask fresh on a beat well inside the keeper's grace, so a
//   frame killed mid-open pays nothing and the width repairs itself.
//   Only a rider for a framed document exists: the top's room is the
//   viewport itself, and there is no window above it to ask.
//
// The frames never wire the two halves by hand; `createSlot` is the one
// entrance, standing the keeper everywhere and the rider beside it only
// where an ask makes sense, and answering with one verb: `slot(open)`.
import { asSlot, saySlot } from '../lib/protocol.js';
import { createTimerSlot } from '../lib/time.js';
import { createGuardBudget } from './ground.js';

// The hold's grace, and the beat the rider feeds it with. A keeper holds
// a widened element only as long as its grace is fed, and the rider feeds
// it well inside that (three beats to the hold): a session frame killed
// mid-open cannot say its goodbye on the page wire, so the ask going
// quiet is still the width paying itself back.
const HOLD_GRACE_MS = 12000;
const REACH_MS = 4000;

// The origin each word is worth naming. A document's own location lists
// its enclosing origins nearest-first — the parent the chain's first
// entry, the top of the tree the chain's last — and both ends read their
// target from there, so the words on the wire are aimed at the one window
// that owns them instead of broadcast to every listener. The read never
// leaves the document it reads; the fallback '*' is for a realm that has
// no list to read (and for the opaque 'null', which names no window).
const targetOf = (loc, fromTheTop = false) => {
  const chain = loc?.ancestorOrigins;
  if (chain === undefined || chain === null) return '*';
  const index = fromTheTop ? chain.length - 1 : 0;
  const origin = chain[index];
  const named =
    typeof origin === 'string' && origin !== '' && origin !== 'null';
  return named ? origin : '*';
};

// The one verb for putting a word on the rails: aimed at the address its
// caller chose, and stonewalled only in the way the rails know — a word a
// gone wall cannot carry has no consequence the heartbeats behind it can
// not repair. The false answer is for the one caller that trades on it.
const postWord = (win, origin, word, transfer = []) => {
  try {
    win.postMessage(word, origin, transfer);
    return true;
  } catch {
    // A wall that went away with the page.
    return false;
  }
};

const TOP_Z = '2147483647';

// A document asked to make room for the session below it measures the room
// in its own viewport, and one reading answers the whole chain: fixed
// positioning anchors to this document's viewport, which — for every
// document below the top one — is the iframe above it, already grown wide
// by its own page's hand.
const WIDE = {
  position: 'fixed',
  inset: '0',
  width: '100%',
  height: '100%',
  background: '#000',
  'z-index': TOP_Z,
};

const isWide = (element) => {
  for (const [name, value] of Object.entries(WIDE)) {
    if (element.style.getPropertyValue(name) !== value) return false;
  }
  return true;
};

// The element that hosts which window: the only way to find it is to ask
// every candidate for the child window it is the box of. The read is a
// reference, which crosses the walls a document read never could, so the
// hunt is honest about a child of any origin.
const slotOf = (doc, source) => {
  if (source === null) return null;
  for (const element of doc.querySelectorAll('iframe, embed, object')) {
    if (element.contentWindow === source) return element;
  }
  return null;
};

// Where this reader stands in the tree. Only the importers outside the
// slot story need it: the seat's one rule that the top frame believes
// its own about being the page's chosen film is read from the same
// truth.
export const isTopFrame = () => window.top === window;

// The one record a hold asks its claimant to carry: a name by which this
// frame's words are consistent with themselves — a hold either holds for
// a ticket or does not, whatever window pattern the page reshuffles, and
// one claimant's death cannot be mistaken for another's plea. Internal
// to the machine: a rider is born with its ticket already said, and no
// hand outside the story ever needs it.
const mintTicket = () =>
  `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;

// The keeper: every document's receiving end. The words are heard through
// the protocol's guard — a half-formed word is refused whole — and the
// relay up carries the word exactly as heard, whole.
export const createSlotKeeper = (home, doc) => {
  const held = new Map();

  // A slot word rides the claimant's own heartbeat, so the hunt for the box
  // of the window posting it used to walk the whole document every two
  // seconds to re-answer a question it had answered a beat ago. What each
  // window's box is is remembered instead, and the hunt re-runs only when
  // the remembering runs dry: elements a site has torn out of the document
  // are swept the moment any word arrives, and an element that is no longer
  // the very box of its window — a site that repointed it — sends the hunt
  // looking fresh. The score of steady beats while a session plays is zero
  // walks, in every document of the chain at once.
  const boxes = new Map();

  const boxOf = (source) => {
    for (const [win, box] of boxes) {
      if (!box.isConnected) boxes.delete(win);
    }
    const remembered = boxes.get(source);
    if (remembered !== undefined && remembered.contentWindow === source) {
      return remembered;
    }
    const found = slotOf(doc, source);
    if (found !== null) boxes.set(source, found);
    return found;
  };

  const close = (ticket) => {
    const hold = held.get(ticket);
    if (hold === undefined) return;
    hold.restore();
    held.delete(ticket);
  };

  // The style the page gave the slot is kept whole, one undo per hold. The
  // site is free to fight, and the same bounded answer the session's video
  // style gets is the one here too: rewrites only when the wide style has
  // genuinely been taken away, a budget of them, then aside — never a chase
  // after our own pen.
  const buildHold = (ticket, element) => {
    const original = element.getAttribute('style');
    let guard = null;
    const budget = createGuardBudget(() => {
      if (guard) guard.disconnect();
      guard = null;
      console.warn('Nocturne: the site keeps rewriting the slot, leaving it');
    });
    guard = new MutationObserver(() => {
      if (isWide(element)) return;
      if (!budget()) return;
      for (const [name, value] of Object.entries(WIDE)) {
        element.style.setProperty(name, value, 'important');
      }
    });

    for (const [name, value] of Object.entries(WIDE)) {
      element.style.setProperty(name, value, 'important');
    }
    guard.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'width', 'height'],
    });

    // A hold expires when the beat under it stops: a session frame killed
    // mid-open cannot say its goodbyes, so the width pays itself back
    // rather than squatting on the page for good. The beat is the slot
    // word itself, renewed on the claimant's own heartbeat.
    const expiry = createTimerSlot(() => close(ticket));

    return {
      fresh: () => {
        expiry.set(HOLD_GRACE_MS);
      },
      restore: () => {
        expiry.clear();
        if (guard) guard.disconnect();
        if (original === null) element.removeAttribute('style');
        else element.setAttribute('style', original);
      },
    };
  };

  const open = (ticket, element) => {
    // A repeated word is a heartbeat, not a new ask: the hold answers
    // within the grace it already carries.
    const standing = held.get(ticket);
    if (standing !== undefined) {
      standing.fresh();
      return;
    }
    held.set(ticket, buildHold(ticket, element));
  };

  home.addEventListener('message', (event) => {
    const data = event.data;
    // The word is heard shaped — spelled, ticketed, open as a boolean —
    // and refused whole otherwise. What is relayed up is the word exactly
    // as heard: a keeper adds nothing and rewrites nothing; the extra
    // fields a future wire carries travel as they came.
    const heard = asSlot(data);
    if (heard === null) return;
    const element = boxOf(event.source);
    if (element === null) return;

    // One hop up, each document for the one below it — every document
    // except this tree's top has a parent to pass the word to, and the
    // word carries the parent's own name, read from this document's
    // location like every other aimed word on the rails.
    if (home.top !== home) {
      postWord(home.parent, targetOf(home.location), data);
    }

    if (heard.open) {
      open(heard.ticket, element);
    } else {
      close(heard.ticket);
    }
  });
};

// The rider: a framed film document's asking half. The ask aims one hop
// up — every document above it widens the box of the child that spoke to
// it and passes the word along, so a chain of strangers carries it as
// well as a family of same-origin frames. Kept exported for the tests,
// which stand the two ends against each other by hand; the frames reach
// it only through createSlot, and the ticket is minted inside.
export const createSlotRider = (home, ticket) => {
  const say = (open) => {
    postWord(home.parent, targetOf(home.location), saySlot(ticket, open));
  };

  // The ask is kept fresh while the session holds: the beat feeds the
  // keeper's hold, and stops the moment the ask dies — a closed session
  // never needs a clock to tell it what it no longer wants.
  const beat = createTimerSlot(() => say(true));

  const slot = (open) => {
    if (open) {
      say(true);
      beat.set(REACH_MS);
    } else {
      beat.clear();
      // The width is paid back eagerly: a shell that closed its player
      // should not leave a grace for the page to wait out.
      say(false);
    }
  };

  // A document going away pays its width back while it is still leaving:
  // the goodbye is said on the page wire, aimed one hop up, because the
  // hold it answers lives there — the runtime's own death notice, the
  // port disconnect, is the hub's story, and the width is nobody else's.
  // The holder's own answer is the one verb only: open, riding the
  // heartbeat, and closed — every closure the frame cannot speak through
  // is the keepers' own grace to handle.
  home.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    beat.clear();
    say(false);
  });

  return { slot };
};

// The one entrance a frame is offered. The keeper is stood up in every
// document — the top's included, since a film may be framed by it — and
// the rider only where there is a parent to ask; the answer is the frame
// end's whole surface: one verb, meaning nothing at the top.
export const createSlot = (home, doc) => {
  createSlotKeeper(home, doc);
  if (home.top === home) {
    // The top keeps no ask: its room is the viewport itself, and there
    // is no window above it to ask.
    return { slot: () => {} };
  }
  return { slot: createSlotRider(home, mintTicket()).slot };
};
