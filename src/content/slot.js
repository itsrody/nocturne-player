import { SLOT_TAG } from '../lib/words.js';
import { createGuardBudget } from './ground.js';

const HOLD_GRACE_MS = 12000;

// The origin each word is worth naming. A document's own location lists its
// enclosing origins nearest-first — the parent the chain's first entry, the
// top of the tree the chain's last — and both rails read their target from
// there, so the words on the wire are aimed at the one window that owns
// them instead of broadcast to every listener. The read never leaves this
// document; the fallback '*' is for a realm that has no list to read (and
// for the opaque 'null', which names no window). The receiving ends keep
// their own checks one way or the other.
export const targetOf = (loc, fromTheTop = false) => {
  const chain = loc?.ancestorOrigins;
  if (chain === undefined || chain === null) return '*';
  const index = fromTheTop ? chain.length - 1 : 0;
  const origin = chain[index];
  const named =
    typeof origin === 'string' && origin !== '' && origin !== 'null';
  return named ? origin : '*';
};

// The one verb for putting a word on the rails: aimed, at the address its
// caller chose, and stonewalled only in the way the rails know — a word a
// gone wall cannot carry has no consequence the next beat cannot repair.
// Every sender on both ends of this protocol posts through here, so the
// story of a window that went away with its page is told once. The answer
// says whether the word left at all, for the one sender that trades on it:
// the judge forgets a claim whose claimant cannot be told.
export const postWord = (win, origin, word) => {
  try {
    win.postMessage(word, origin);
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

export const createSlotKeeper = (home, doc) => {
  const held = new Map();

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
    const pause = () => close(ticket);
    let expiry = setTimeout(pause, HOLD_GRACE_MS);

    return {
      fresh: () => {
        clearTimeout(expiry);
        expiry = setTimeout(pause, HOLD_GRACE_MS);
      },
      restore: () => {
        clearTimeout(expiry);
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
    if (data === null || typeof data !== 'object') return;
    const ticket = data[SLOT_TAG];
    if (typeof ticket !== 'string' || ticket === '') return;
    const element = slotOf(doc, event.source);
    if (element === null) return;

    // One hop up, each document for the one below it — every document
    // except this tree's top has a parent to pass the word to, and the
    // word carries the parent's own name, read from this document's
    // location like every other aimed word on the rails.
    if (home.top !== home) {
      postWord(home.parent, targetOf(home.location), data);
    }

    if (data.open) {
      open(ticket, element);
    } else {
      close(ticket);
    }
  });
};
