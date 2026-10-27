// Two films on one screen — the page's own and one inside an iframe — each
// used to mount a badge: every frame was blind to the others. One badge is
// the one the viewer can aim at, so the frames take turns through the top
// frame: the one window every frame can already write to, however deep the
// nesting and however much the page between them would rather not be read.
//
// A frame that wants the screen posts a claim, tagged with a ticket it drew
// at boot, and repeats the claim until there is news; the top frame keeps
// the claims it hears, forgets the ones gone quiet, and seats at most one
// frame at a time — itself first, then the oldest claim still alive. A
// verdict tells each claimant whether the seat is its own.
//
// Everything in flight here passes through windows the pages own, so a page
// could hear the words and forge a verdict. What such a forgery buys is a
// badge drawn or withheld — which a page could bring about with a style rule
// on its own content all the same. The ticket filters out everything the
// protocol did not itself put on the wire.
import { SLOT_TAG, targetOf } from './slot.js';

const TAG = 'nocturneClaim';
const RENEW_MS = 2000;
const STALE_MS = 6000;

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

// One end of the protocol: lives in every frame but the top one, and learns
// whether the seat is its own. The same rail carries the frame's living
// film count, so the top frame can answer for the whole page with one
// voice, and the request to widen the frame's slot on the page while a
// session is open.
export const createClaimant = (home, ticket, onVerdict, opts = {}) => {
  const getCount = opts.getCount ?? (() => 0);
  let want = false;
  let slotOpen = false;
  let renewTimer = null;

  // The words the rail carries: what this frame asks for, how many films
  // live in it, and — while the session below is open — the slot word
  // again. Each re-issue keeps the rewrites fresh one hop at a time and
  // pays the width back within beats if the session frame dies before it
  // can say its goodbyes.
  const say = () => {
    try {
      home.top.postMessage(
        { [TAG]: ticket, want, count: getCount() },
        targetOf(home.location, true),
      );
    } catch {
      // A window that went away with the page. A claim that cannot be sent
      // has no consequence the next claim cannot repair.
    }
    if (slotOpen) {
      try {
        home.parent.postMessage(
          { [SLOT_TAG]: ticket, open: true },
          targetOf(home.location),
        );
      } catch {
        // The word cannot get out; the holds below expire on their own.
      }
    }
  };

  // The next beat, when the frame still has something to keep alive on the
  // rail.
  const renew = () => {
    renewTimer = null;
    say();
    if (want || slotOpen || getCount() > 0) {
      renewTimer = setTimeout(renew, RENEW_MS);
    }
  };

  // The words now, and the heart's verdict after them: a frame with
  // something to say keeps beating — a claim in force, films to count, a
  // slot held open — and one with nothing left to say stops, so a page of
  // quiet frames pays the rail nothing.
  const tell = () => {
    say();
    if (want || slotOpen || getCount() > 0) {
      if (renewTimer === null) {
        renewTimer = setTimeout(renew, RENEW_MS);
      }
    } else if (renewTimer !== null) {
      clearTimeout(renewTimer);
      renewTimer = null;
    }
  };

  // The heart stops for whoever asked, the way a frame's death would — in
  // the page it is nobody, in the tests it is the way a test leaves the
  // rail behind without leaving its beat on the event loop.
  const end = () => {
    if (renewTimer !== null) {
      clearTimeout(renewTimer);
      renewTimer = null;
    }
  };

  // A session in this frame wants the page to give its seat room: the
  // request climbs one hop at a time, each document widening the element
  // that hosts the one below before passing the word along, so a chain of
  // strangers carries it as well as a family of same-origin frames. The
  // answer comes back as it went: what was widened is widened by each
  // document's own hand, and un-widened the same way.
  const slot = (open) => {
    slotOpen = open;
    tell();
    try {
      home.parent.postMessage(
        { [SLOT_TAG]: ticket, open },
        targetOf(home.location),
      );
    } catch {
      // A wall that went away with the page. Nothing to hold open then.
    }
  };

  const setWant = (next) => {
    if (next === want) return;
    want = next;
    if (renewTimer !== null) {
      clearTimeout(renewTimer);
      renewTimer = null;
    }
    tell();
  };

  home.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    // Verdicts name the ticket they answer to, and come from the judge
    // alone. A claim the page makes up with our words does not carry (or
    // cannot answer for) a ticket it was not given.
    if (data[TAG] !== ticket) return;
    if (event.source !== home.top) return;
    onVerdict(Boolean(data.granted));
  });

  return { setWant, tell, slot, end };
};

// Where a window sits in our own tree, or null when it is nobody's child.
// The walk reads nothing but references — the frames list and the
// WindowProxies inside it are handed out across origins, and a document's
// content never is — so a page built of strangers is climbed all the same.
// The answer is how deep the child sits, one hop deeper with every wall.
const locate = (source, from, depth) => {
  const frames = from.frames;
  if (typeof frames !== 'object' || frames === null) return null;
  for (let index = 0; index < frames.length; index++) {
    if (frames[index] === source) return depth + 1;
    const below = locate(source, frames[index], depth + 1);
    if (below !== null) return below;
  }
  return null;
};

// The count a claim carries: a number is taken as the film count it says
// it is, anything else keeps what the claim already said. The count rides
// the same wind as the claim, so a stale claim's count goes stale with it.
const readCount = (data, previous) => {
  if (typeof data.count === 'number' && Number.isFinite(data.count)) {
    return Math.max(0, Math.floor(data.count));
  }
  return previous === undefined ? 0 : previous.count;
};

// The other end: lives in the top frame, hears the claims and seats one
// claimant at a time.
export const createJudge = (home, { ownWant = null, now = Date.now } = {}) => {
  // Ticket first in, seated first: the map keeps insertion order, and a
  // claimant that stays alive keeps its place even while renewing.
  const claims = new Map();

  const decide = () => {
    const at = now();
    for (const [ticket, claim] of claims) {
      if (claim.want && at - claim.renewedAt <= STALE_MS) continue;
      // A claim leaving the race — withdrawn, or gone quiet beyond its
      // window — still owes the claimant the news that the seat left it,
      // because a claimant that was seated keeps believing it is until a
      // verdict says otherwise. A claimant that cannot be told is one that
      // is gone, and its claim can go with it.
      if (claim.granted) {
        try {
          claim.source.postMessage(
            { [TAG]: ticket, granted: false },
            claim.origin,
          );
        } catch {
          // The claimant is closing behind our back; it will not need news.
        }
      }
      claims.delete(ticket);
    }
    // The top frame's own film outranks any framed one: the page put it
    // there to be seen as the page. The seat clears when every claimant has
    // gone quiet.
    const supreme = ownWant !== null && Boolean(ownWant());
    const waiting = claims.keys().next().value ?? null;
    const winner = supreme ? null : waiting;

    for (const [ticket, claim] of claims) {
      const seated = ticket === winner;
      if (claim.granted === seated) continue;
      claim.granted = seated;
      try {
        claim.source.postMessage(
          { [TAG]: ticket, granted: seated },
          claim.origin,
        );
      } catch {
        // The claimant is closing behind our back; it will not need news.
        claims.delete(ticket);
      }
    }
  };

  home.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    const ticket = data[TAG];
    if (typeof ticket !== 'string' || ticket === '') return;
    // A claim is credited only to a window that is one of ours: a claimant
    // has to live in the frame tree below this document, and the walk that
    // finds it reads nothing but references. Anything else is a window
    // that can spell our words but is not one of our pages' frames — it is
    // answered the way a door is answered: nobody is home.
    const depth = locate(event.source, home, 0);
    if (depth === null) return;
    const previous = claims.get(ticket);
    claims.set(ticket, {
      source: event.source,
      // The origin the claim arrived from is the only address the answers
      // are worth naming: a window that can spell our words but is nobody's
      // child was already refused above, so this is the belt on a held
      // claim — the verdicts go back to the exact window they answer, and
      // nowhere else on the wire.
      origin:
        typeof event.origin === 'string' && event.origin !== ''
          ? event.origin
          : '*',
      want: Boolean(data.want),
      count: readCount(data, previous),
      renewedAt: now(),
      granted: previous === undefined ? false : previous.granted,
      depth,
    });
    decide();
  });

  // One voice for the page's films: the sum of what every lively frame
  // keeps telling the judge, the top frame's own films among them through
  // its own answer rather than through the registry. A claim past its
  // window has stopped beating and says nothing.
  const totalCount = () => {
    const at = now();
    let total = 0;
    for (const claim of claims.values()) {
      if (at - claim.renewedAt <= STALE_MS) total += claim.count;
    }
    return total;
  };

  return { decide, totalCount };
};
