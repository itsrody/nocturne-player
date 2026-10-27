// The seat has moved to the background's own room. Every frame connects to
// the background page once, and the words on that channel are as good as the
// browser itself is: `sender.tab` and `sender.frameId` are attested by the
// platform, and a page cannot spell a runtime message at all. The machinery
// the page wire demanded — the ticket minted to say who a claim answered to,
// the judge in the top frame, the walk over its tree to credit a claim to
// somebody's child, the pair of ports a frame carried up, the beat whose
// walk told life from silence — all of it answered the same fact: postMessage
// crosses windows the pages own. The runtime does not, so none of it ships
// here any more.
//
// What stays in a frame is only what a frame alone can do, because it alone
// has the document: the sweep that finds films, the badge, and the session.
// One page-side duty keeps its wire even now — the slot. Widening the room
// means widening an element in every document of the chain, page-owned DOM
// one hop at a time, and that work lives in slot.js's keeper. This file
// carries the frame's half of it: the rider that asks its own parent for
// room and keeps the ask fresh on the slow beat the keeper's hold expects.
//
// The counting goes on through the same runtime port: a frame reports what
// it found and what it wants, and the hub — where the book of frames lives —
// answers the seat and the counts.
import { SLOT_TAG } from '../lib/words.js';
import { createTimerSlot } from '../lib/time.js';
import { postWord, targetOf } from './slot.js';

// The beat the slot ask keeps. The keeper on the receiving documents holds
// a widened element only as long as its grace (twelve seconds) is fed, and
// this rider feeds it well inside that: a session frame killed mid-open
// cannot say its goodbye on the page wire, so the ask going quiet is still
// the width paying itself back — three beats of grace, then the room.
const REACH_MS = 4000;

// The one record a frame is trusted on the runtime for: a name by which this
// frame's words are consistent with themselves — the hub keys its book on
// the browser-attested frameId now, but the slot words on the page wire
// still need this to tell one hold from another across the chain.
export const mintTicket = () =>
  `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;

export const isTopFrame = () => window.top === window;

// The decision about a framed film is the embedding pages', plural: every
// named origin between the film and the eye names itself, because a page's
// settings speak for the page the viewer is actually looking at. The chain
// is read from this document's own location — ancestorOrigins answers for
// the same-origin and the cross-origin case alike, carries the whole
// nesting depth, and shipped in Firefox 148, under the floor of 158: it is
// always there. No window beyond this one is ever touched, so the old
// throw-and-guess path (top.location.host, then document.referrer, whose
// truth depended on the framer's referrer policy) departs.
//
// A guest's own seat often carries no name — about:srcdoc and sandboxed
// frames have an empty or opaque host — so an empty one offers nothing and
// the decision the nearest named ancestor above it made is what counts.
export const chainHosts = (loc) => {
  const seen = new Set();
  const hosts = [];
  const offer = (host) => {
    if (typeof host !== 'string' || host === '' || seen.has(host)) return;
    seen.add(host);
    hosts.push(host);
  };

  offer(loc.host);
  const chain = loc.ancestorOrigins;
  if (chain !== undefined) {
    for (let index = 0; index < chain.length; index++) {
      let host;
      try {
        host = new URL(chain[index]).host;
      } catch {
        // An opaque origin's word is "null" — not a URL, and telling the
        // truth it carries: this guest names itself nobody.
        host = '';
      }
      offer(host);
    }
  }
  return hosts;
};

// A frame's half of the slot story: the ask for room, aimed one hop up —
// every document above it widens the box of the child that spoke to it and
// passes the word along, so a chain of strangers carries it as well as a
// family of same-origin frames. The word rides the page wire because the
// element to widen is the page's own DOM; no runtime channel could reach
// into a stranger's document to grow its iframe.
export const createSlotRider = (home, ticket) => {
  const say = (open) => {
    postWord(home.parent, targetOf(home.location), {
      [SLOT_TAG]: ticket,
      open,
    });
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
  // hold it answers lives there — the runtime's own death notice, the port
  // disconnect, is the hub's story, and the width is nobody else's.
  home.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    beat.clear();
    say(false);
  });

  const end = () => slot(false);
  return { slot, end };
};
