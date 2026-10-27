// The one vocabulary of the whole machine, and the one door it all passes
// through. Every word between the background and the frames, and between
// the popup and the hub, is built here and checked here: producers spell
// with the builders, listeners hear through the guards, and no file keeps
// a private copy of a verb’s spelling or a private idea of a word’s shape.
// A malformed word can only ever be turned away whole — a listener that
// half-hears a report would otherwise invent a frame that does not exist.
//
// Two vocabularies live here, on two wires. The runtime’s words — REPORT,
// VERDICT, STRAIN, DOSSIER, the popup’s one question — ride a channel no
// page can spell and the browser attests to every speaker. The page wire’s
// one tag — SLOT_TAG — crosses windows the pages own, and it is answered
// by the keeper in the document that receives it, whose checks are its
// own business; only the spelling is shared.

// A frame’s word about itself: what it wants (the badge) and what it
// found (the sweep’s count). Spoken up the port, answered nothing.
export const REPORT = 'nocturneReport';

// The hub’s news for one frame: whether this frame’s want holds the seat.
// The top frame is never sent one — it believes its own about: the page
// chose its film itself.
export const VERDICT = 'nocturneVerdict';

// The hub’s knock, from the network side of the house: a media-shaped
// request crossed the tab’s bus bound for this frame. The word carries
// nothing — the knock is the whole message, and the frame’s sweep answers
// it at its own debounce.
export const STRAIN = 'nocturneStrain';

// The hub’s dossier, pushed once per generation of a frame’s seat: the
// background’s evidence from the bus about the film’s frame — where the
// bytes came from, what spoke for them, which document the frame is, and
// every origin standing above it, nearest first. The DOM cannot see any
// of it; the frame that hears it cannot re-earn it by shouting.
export const DOSSIER = 'nocturneDossier';

// The family words a crossing may name in the dossier. They are the
// stream’s *format* families, not engine promises: the file at the bus
// spells which library family could be playing it, and the DOM sweep
// that asks for an engine object still has to find it and probe it.
// `mss` is the smooth-streaming family (ism/isml/f4m), which shaka and
// the dash family both speak; `dash` for a manifest normally means
// dash.js or shaka alike.
export const SHAPES = ['hls', 'dash', 'mss'];

// The popup’s one question and the hub’s alone to answer: how many films
// the whole tab holds, and how many frames stream one the count cannot
// confirm. A frame asking is answered nothing — the speaker’s envelope
// separates the two, and that is the hub’s check, not the word’s shape.
export const STATE_QUERY = 'query-state';

// The page wire’s slot tag — the request to widen a window’s room in the
// page, aimed one hop up at a time and coached on the claimant’s own
// heartbeat. It is spelled here because the sender and every keeper along
// the chain must agree on the exact spelling; its truth lives on the page
// side, in slot.js.
export const SLOT_TAG = 'nocturneSlot';
// --- The builders: how every word is said. ---

// A frame’s report. The want is a plain boolean, the count a whole number
// of films the sweep is confirming — zero is said plainly, never left out.
export const sayReport = (want, count) => ({
  type: REPORT,
  want,
  count,
});

// The seat’s news, the hub’s alone to say.
export const sayVerdict = (granted) => ({ type: VERDICT, granted });

// The knock. Deliberately empty: a word that carries nothing cannot carry
// a page’s forgery of it either — only the runtime can speak the type.
export const sayStrain = () => ({ type: STRAIN });

// The dossier, said from an ear the bus handed over: the request’s url,
// what spoke for it (`media` — an element’s own load — or the
// script-ridden fetch family a streaming library rides), the document
// that owns the frame, the chain of origins above it, and the family
// the URL named, when it named one. The chain is copied: an ear is a
// platform snapshot and the word travels alone.
export const sayDossier = (ear) => ({
  type: DOSSIER,
  url: ear?.url,
  resource: ear?.resource,
  doc: ear?.doc,
  chain: (ear?.chain ?? []).slice(),
  shape: ear?.shape ?? null,
});

// The popup’s question, carrying the tab it reads.
export const askState = (tabId) => ({ type: STATE_QUERY, tabId });

// The page wire’s one word, the way a rider says it: the hold it names
// and the answer it wants, one hop up, aimed by origin at the window
// that owns it.
export const saySlot = (ticket, open) => ({ [SLOT_TAG]: ticket, open });

// --- The guards: how every word is heard. ---

const isWord = (word) => word !== null && typeof word === 'object';

const isSpelled = (value) => typeof value === 'string' && value !== '';

const isCount = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

// A frame’s report about itself, believed only whole: the want as a real
// boolean, the count as a non-negative whole number — a count that is
// said and lies (fractional below the floor’s truth, negative, not a
// number) refuses the word entire, because the book’s counts are read by
// the popup as said and are never half-writes. A count left out is
// admitted, with the book keeping the one it already holds.
export const asReport = (word) => {
  if (!isWord(word) || word.type !== REPORT) return null;
  if (word.want !== true && word.want !== false) return null;
  if (word.count === undefined || word.count === null) {
    return { want: word.want, count: null };
  }
  if (!isCount(word.count)) return null;
  return { want: word.want, count: Math.floor(word.count) };
};

export const asVerdict = (word) => {
  if (!isWord(word) || word.type !== VERDICT) return null;
  if (word.granted !== true && word.granted !== false) return null;
  return { granted: word.granted };
};

export const asStrain = (word) => {
  if (!isWord(word) || word.type !== STRAIN) return null;
  return {};
};

// The dossier, believed only when it names its film: a url that says
// something, and a chain that is a real array — the entries that spell a
// string are kept, the rest are not the wire’s word. The shape rides
// only as one of the family’s own words: a dossier whose shape spells
// something else keeps its url and loses the hint, because a word the
// corpus never said is nobody’s family. The chain comes back a copy, so
// a listener cannot walk the platform’s own list by holding the word’s
// hand.
export const asDossier = (word) => {
  if (!isWord(word) || word.type !== DOSSIER || !isSpelled(word.url)) {
    return null;
  }
  if (!Array.isArray(word.chain)) return null;
  return {
    url: word.url,
    resource: typeof word.resource === 'string' ? word.resource : null,
    doc: isSpelled(word.doc) ? word.doc : null,
    chain: word.chain.filter(isSpelled),
    shape: SHAPES.includes(word.shape) ? word.shape : null,
  };
};

// The popup’s question, believed only with a tab to read.
export const asStateQuery = (word) => {
  if (!isWord(word) || word.type !== STATE_QUERY) return null;
  if (typeof word.tabId !== 'number' || !Number.isFinite(word.tabId)) {
    return null;
  }
  return { tabId: word.tabId };
};

// The slot word, believed only well-formed: a ticket that spells
// something, and an answer that is a real boolean — the two truth
// values a keeper can act on. Extra fields ride along untouched: the
// guard is the admission gate, not the word’s whole description.
export const asSlot = (data) => {
  if (!isWord(data) || !isSpelled(data[SLOT_TAG])) return null;
  if (data.open !== true && data.open !== false) return null;
  return { ticket: data[SLOT_TAG], open: data.open };
};
