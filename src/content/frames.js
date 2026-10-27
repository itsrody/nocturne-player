// Two films on one screen — the page's own and one inside an iframe — each
// used to mount a badge: every frame was blind to the others. One badge is
// the one the viewer can aim at, so the frames take turns through the top
// frame: the one window every frame can already write to, however deep the
// nesting and however much the page between them would rather not be read.
//
// A frame that wants the screen mints a pair of ports and carries one end
// to the top frame with its first claim. From then on the words ride the
// pair; the aimed wire keeps only the ramp — the first claim, and the same
// word for whoever never managed to hand an end over. The judge hears the
// claims, seats at most one frame at a time — itself first, then the
// oldest claim still alive — and a verdict tells each claimant whether the
// seat is its own.
//
// Both mouths are honest about what they can promise. The ramp is a window
// the pages own, so a claim on it is credited only to a window the judge's
// own tree hosts — a claim from nobody's child is an answerless door. The
// pair is a capability, and a capability that travels through those same
// windows: a page that catches its end in flight can take the claimant's
// voice with it and hold or withhold the seat — what a seat forgery bought
// in words — and the belt re-claims the seat within a settled beat, so the
// machine heals by its own rhythm whatever word the page spells.
//
// Nothing in flight any more is a keep-alive by silence. Death is spoken:
// a pagehide says the goodbye, and the goodbye pays the slot's width back
// on its way out. The belt keeps its slow walk only for the one case the
// goodbye cannot answer — a document that died without the chance to part
// (the platform gives no death notice for a pair; the close event sits at
// Mozilla's standards-positions issue #914) — and the belt walks below the
// judge's forgetting window, so a claim in force outlives its own quiet.
import { CLAIM_TAG, SLOT_TAG } from '../lib/words.js';
import { createTimerSlot } from '../lib/time.js';
import { postWord, targetOf } from './slot.js';

// The ramp beats at the wire's own rhythm; once the pair stands, the belt
// settles under it — four seconds against the judge's six — because from
// there the words owe the wire nothing but what they say themselves.
const RENEW_MS = 2000;
const BELT_MS = 4000;
const STALE_MS = 6000;

// The one verb for putting a word on the rails... lives in slot.js, where
// the wire's aiming story is told once. The pair carries its own sister
// verb here: an entangled end is not aimed, it is spoken into, and a pair
// the page detached says nothing rather than wrong someone.
const portWord = (port, word) => {
  try {
    port.postMessage(word);
    return true;
  } catch {
    // A pair the page took and detached, or an owner gone with the page.
    return false;
  }
};

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
// session is open. A page may take the pair's judge-facing end for itself —
// the capability story above says what that is worth, and the belt is what
// heals it.
export const createClaimant = (home, ticket, onVerdict, opts = {}) => {
  const getCount = opts.getCount ?? (() => 0);
  let want = false;
  let slotOpen = false;

  // The pair is minted once, on this frame's own time, and its far end
  // rides the first claim: the top frame's script is standing by then
  // without exception — both sides run at document start, and a parent's
  // start necessarily precedes every child it hosts — so the handoff
  // cannot be raced, whatever the pages of the chain do with the events.
  const rail = new MessageChannel();
  let adopted = false;
  let carried = false;

  const say = () => {
    // The claimant's own voice, on whichever mouth is standing: on the
    // wire until the judge says he holds the far end — the carried end
    // rides the first word only, for a port handed over twice is a port
    // detached twice, and a detached word is a word the wire never hears.
    const word = { [CLAIM_TAG]: ticket, want, count: getCount() };
    if (adopted) {
      portWord(rail.port1, word);
    } else {
      postWord(
        home.top,
        targetOf(home.location, true),
        word,
        carried ? [] : [rail.port2],
      );
      carried = true;
    }
    // The slot's word still climbs by hops — the width the session asks
    // for is widened one document at a time, and no pair reaches across
    // those walls. While a session is open the word rides the beat, so
    // the hold under it is made fresh within the grace it carries.
    if (slotOpen) {
      postWord(home.parent, targetOf(home.location), {
        [SLOT_TAG]: ticket,
        open: true,
      });
    }
  };

  // What keeps the heart beating: a claim in force, films to count, or a
  // slot held open. One answer, said once — the renew beat and the story
  // of stopping below both ask it.
  const worthSaying = () => want || slotOpen || getCount() > 0;

  // The next word, at the pace the mouth earns: the ramp keeps the fast
  // rhythm, the settled pair keeps the belt. The beat and the words are
  // knotted — each names the other — so the word is a hoisted one and the
  // slot is armed with it before its body reads.
  const beat = createTimerSlot(renew);
  function renew() {
    say();
    if (worthSaying()) {
      beat.set(adopted ? BELT_MS : RENEW_MS);
    }
  }

  // Any word on the pair answers for adoption before anything else: the
  // only writer of the far end is whoever took it, and the judge says he
  // took it before any verdict rides. A verdict that is not one — the
  // judge's note that the end was received — is heard and answered only
  // by the bench slowing down. The body is a hoisted name, like the word
  // it listens beside; the mouth is put on the pair only once the knot is
  // tied, for a word could arrive before anything else is standing.
  rail.port1.onmessage = railSpoke;
  function railSpoke(event) {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    if (data[CLAIM_TAG] === ticket) {
      if (!adopted) {
        adopted = true;
        // The bench slows for the pair from the moment it stands, not
        // from the next word: silence has a grace now, and the grace
        // starts with the adoption.
        if (worthSaying()) {
          beat.set(BELT_MS);
        }
      }
      if (typeof data.granted === 'boolean') {
        onVerdict(data.granted);
      }
    }
  }

  // The words now, and the heart's verdict after them: a frame with
  // something to say keeps beating — a claim in force, films to count, a
  // slot held open — and one with nothing left to say stops, so a page of
  // quiet frames pays the rail nothing.
  const tell = () => {
    say();
    if (worthSaying()) {
      if (!beat.isOn()) beat.set(adopted ? BELT_MS : RENEW_MS);
    } else {
      beat.clear();
    }
  };

  // The heart stops for whoever asked, and the pair goes with it — the
  // judge's forgetting has no further hand to shake.
  const end = () => {
    beat.clear();
    rail.port1.close();
  };

  // A session in this frame wants the page to give its seat room: the
  // request climbs one hop at a time, each document widening the element
  // that hosts the one below before passing the word along, so a chain of
  // strangers carries it as well as a family of same-origin frames. The
  // answer comes back as it went: what was widened is widened by each
  // document's own hand, and un-widened the same way.
  //
  // An open arrives as a hold on the page and then rides the heartbeat —
  // tell() has just said it, so a second copy of the same word buys
  // nothing the next beat does not renew. A close has no beat to ride
  // (the hold is nothing worth keeping alive) and is sent now: a shell
  // gone for good should not wait on a clock for the width back.
  const slot = (open) => {
    slotOpen = open;
    tell();
    if (!open) {
      postWord(home.parent, targetOf(home.location), {
        [SLOT_TAG]: ticket,
        open: false,
      });
    }
  };

  const setWant = (next) => {
    if (next === want) return;
    want = next;
    // The beat restarts with the want: a change of mind is worth a full
    // window, not whatever was left of the old one.
    beat.clear();
    tell();
  };

  // A document going away says so on every mouth it owns: the pair when
  // it stands — the death the platform gives no event for, said before
  // it is missed — and the ramp beside it, in case the pair is in other
  // hands.
  // The slot's width rides the same breath, aimed one hop up: a shell
  // navigating away should not leave a grace behind for somebody else to
  // wait out. And the bench freezes with the tree it belongs to — a page
  // hiding into the history's cache takes its judge, its claims, its
  // beat and its pair under together, and wakes them all together — so a
  // hiding that lives is not a death, and no word is said for it.
  const goodbye = () => {
    if (adopted) portWord(rail.port1, { [CLAIM_TAG]: ticket, farewell: true });
    postWord(home.top, targetOf(home.location, true), {
      [CLAIM_TAG]: ticket,
      farewell: true,
    });
    if (slotOpen) {
      postWord(home.parent, targetOf(home.location), {
        [SLOT_TAG]: ticket,
        open: false,
      });
    }
    rail.port1.close();
    beat.clear();
  };

  home.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    goodbye();
  });
  // Coming back from the cache: the pair survived the freezing — pairs
  // are carried through like everything else in the tree — so the words
  // only need to be said again to a biding that never forgot.
  home.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    tell();
  });

  // The ticket still says who a verdict answers to, and the top's window
  // is still the only source the ramp admits — the belt beside the pair,
  // kept as the fallback for whoever never handed an end over.
  home.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    // Verdicts name the ticket they answer to, and come from the judge
    // alone. A claim the page makes up with our words does not carry (or
    // cannot answer for) a ticket it was not given.
    if (data[CLAIM_TAG] !== ticket) return;
    if (event.source !== home.top) return;
    // A word without a granted is no verdict: a verdict is only asked to
    // say granted, and any other shape the top's window speaks — an echo,
    // a note — is heard as noise and forgotten.
    if (typeof data.granted === 'boolean') onVerdict(data.granted);
  });

  return { setWant, tell, slot, end };
};

// Where a window sits in our own tree, or null when it is nobody's child.
// The walk reads nothing but references — the frames list and the
// WindowProxies inside it are handed out across origins, and a document's
// content never is — so a page built of strangers is climbed all the same.
// Only the finding itself is used: a claim the walk cannot place in the
// tree is a claim from nowhere.
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
// claimant at a time. A claim may hand its caller a pair over the ramp —
// the judge takes the end, notes the receipt so the claimant's bench can
// settle, and from then on the words on that pair speak with the claim's
// own voice: claims to keep the book fresh, and the farewell a dying
// document says on its way out.
export const createJudge = (home, { ownWant = null, now = Date.now } = {}) => {
  // Ticket first in, seated first: the map keeps insertion order, and a
  // claimant that stays alive keeps its place even while renewing.
  const claims = new Map();

  // The verdicts go wherever the claim's own mouth reaches: over the pair
  // when one stands, over the aimed wire when it doesn't. Both end at the
  // same word, granted — an unseating is the same named truth backwards.
  const answer = (claim, ticket, word) => {
    if (claim.port !== null && claim.port !== undefined) {
      return portWord(claim.port, { [CLAIM_TAG]: ticket, ...word });
    }
    return postWord(claim.source, claim.origin, {
      [CLAIM_TAG]: ticket,
      ...word,
    });
  };

  const decide = () => {
    const at = now();
    for (const [ticket, claim] of claims) {
      if (claim.want && at - claim.renewedAt <= STALE_MS) continue;
      // A claim leaving the race — withdrawn, or gone quiet beyond its
      // window — still owes the claimant the news that the seat left it,
      // because a claimant that was seated keeps believing it is until a
      // verdict says otherwise. A claimant that cannot be told is one that
      // is gone, and its claim can go with it. The pair, when there was
      // one, is not closed: a claimant it still holds on the other end can
      // speak again, and the judge's forgetting is not the pair's.
      if (claim.granted) {
        answer(claim, ticket, { granted: false });
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
      // A claimant closing behind our back will not need the news: the
      // word goes nowhere, and a claim that cannot be told can go with it.
      const delivered = answer(claim, ticket, { granted: seated });
      if (!delivered) claims.delete(ticket);
    }
  };

  // What the words on a standing pair say. A farewell is a death the belt
  // would have taken a window to notice: the claim is dropped then and
  // there, and the seat is free before the page has finished leaving. A
  // claim renews its book — and a claim the judge's forgetting has pruned
  // is spoken back into the book, for a pair the page kept alive may yet
  // live. The book is not the pair's to prove: the head is the ticket the
  // end was minted for, and the words that ride it wear that ticket.
  const heardOn = (ticket, port, data) => {
    if (data === null || typeof data !== 'object') return;
    if (data[CLAIM_TAG] !== ticket) return;
    if (data.farewell === true) {
      claims.delete(ticket);
      decide();
      return;
    }
    const previous = claims.get(ticket);
    const claim = previous ?? {
      source: null,
      origin: null,
      granted: false,
      port,
    };
    claim.port ??= port;
    claim.want = Boolean(data.want);
    claim.count = readCount(data, previous);
    claim.renewedAt = now();
    claims.set(ticket, claim);
    decide();
  };

  home.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    const ticket = data[CLAIM_TAG];
    if (typeof ticket !== 'string' || ticket === '') return;
    // A claim is credited only to a window that is one of ours: a claimant
    // has to live in the frame tree below this document, and the walk that
    // finds it reads nothing but references. Anything else is a window
    // that can spell our words but is not one of our pages' frames — it is
    // answered the way a door is answered: nobody is home.
    if (locate(event.source, home, 0) === null) return;
    // The same farewell can ride the ramp: the goodbye of a claimant whose
    // pair never stood. It is a death, not a claim — forget it here, where
    // the tree still answers for the door it arrived by.
    if (data.farewell === true) {
      claims.delete(ticket);
      decide();
      return;
    }
    const previous = claims.get(ticket);

    // A claim may hand the judge an end on its way in. The receipt rides
    // the pair first — the claimant settles onto the belt over it — and
    // the words that reach the judge from this end forward speak the
    // claim: that the speaking is the ticket that minted the end is the
    // story the pair carries, and the belt beside it is what a page's
    // hands cannot stop — the seat comes back within a beat whatever is
    // spelled on the wire the pair reached through.
    const handed = event.ports?.[0];
    if (handed !== undefined && handed !== null) {
      previous?.port?.close();
      handed.onmessage = (pairEvent) => heardOn(ticket, handed, pairEvent.data);
      portWord(handed, { [CLAIM_TAG]: ticket, heard: true });
    }

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
      port: handed ?? previous?.port ?? null,
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
