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

// The manifest’s own cipher, said down once per generation like the
// dossier: which non-DRM scheme the stream carries. `aes-128` is the
// HLS standard’s whole-segment CBC — the one the frame can be handed
// through the background’s key and decrypt work; `sample-aes` is the
// sample-level scheme, named honestly so the diagnostics can say it is
// known but not yet played; `clearkey` is CENC without a DRM system —
// the element’s own EME asks, and only the key material would ever
// cross. These are authentication words, public data in the manifest,
// not circumvention: no DRM system is ever touched.
export const CIPHER = 'nocturneCipher';
export const CIPHERS = ['aes-128', 'sample-aes', 'clearkey'];

// The playable plan behind the cipher word: one fetch of the manifest
// the bus saw, parsed into the order the playback needs — the init
// segment’s address (an fmp4 stream names one; the TS transport is not
// played: Firefox’s media source has no support for it), and the
// segments in play order with the sequence number the cipher’s default
// answer derives its counter from. VOD only: an ENDLIST at the end. A
// live playlist is a promise the frame cannot keep honestly yet, and a
// plan that is not said is a plan the frame does not ask after.
export const CIPHER_PLAN = 'nocturnePlan';

// A bound on the plan’s own size, for the same reason the sweep has
// its budget: a playlist that never ends cannot be promised to the
// frame whole.
export const MAX_PLAN_SEGMENTS = 4096;

// One segment’s ask, up: the frame holds the plan, and the bytes are
// asked for one address at a time — the key itself never crosses to
// the page’s side of the wire.
export const CIPHER_ASK = 'nocturneCipherAsk';

// The segment’s answer, down: clonable bytes, or an honest null — a
// fetch that failed or a segment the plan never knew is a miss, not an
// error at the caller.
export const CIPHER_BYTES = 'nocturneCipherBytes';

// The frame’s diagnostics line, said up while the viewer asks for the
// answers: the background’s own console is the room where every frame’s
// lines stand in one scroll — and the one console a devtools window can
// be opened on without the page’s console ever cooperating. The word
// carries the line whole, exactly the text the frame’s console said,
// and nothing else: the hub stamps its own frame coordinates at the
// head, because the frame’s own words do not know they are a frame’s.
export const LINE = 'nocturneLine';

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

// The cipher’s voice, said from a manifest the bus fetched and read.
export const sayCipher = (cipher, url) => ({ type: CIPHER, cipher, url });

// The plan, said from a manifest parsed to end: the init segment’s
// address or null, the segments in play order with the sequence number
// each one is counted as. Both are a copy — an ear’s arrays are the
// word’s own, not the worker’s.
export const sayCipherPlan = (plan) => ({
  type: CIPHER_PLAN,
  url: plan.url,
  codecs: plan.codecs,
  init: plan.init,
  segments: plan.segments.map((one) => ({ url: one.url, seq: one.seq })),
});

// One segment’s ask, said up by the frame holding the plan.
export const askCipherSegment = (url) => ({ type: CIPHER_ASK, url });

// The answer, said down with clonable bytes — or an honest null when
// the ask came to nothing.
export const sayCipherBytes = (url, bytes) => ({
  type: CIPHER_BYTES,
  url,
  bytes,
});

// The frame’s line, said up by the sink standing at the seat port: it
// crosses exactly as the console said it, because the formatting is the
// logger’s one business and the hub’s stamp is added at the other end.
export const sayLine = (text) => ({ type: LINE, text });

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

// The cipher’s voice, believed only for a scheme the extension knows
// and a manifest the wire actually saw.
export const asCipher = (word) => {
  if (!isWord(word) || word.type !== CIPHER || !CIPHERS.includes(word.cipher)) {
    return null;
  }
  if (!isSpelled(word.url)) return null;
  return { cipher: word.cipher, url: word.url };
};

// The plan, believed only whole: a manifest named, an fmp4 codec list
// or none at all, an init address that is either spelled or absent,
// and segments that each name an address and a whole sequence number —
// trimmed to the plan’s bound, because a playlist that outgrows the
// bound is live in spirit even if its ENDLIST says otherwise.
export const asCipherPlan = (word) => {
  if (!isWord(word) || word.type !== CIPHER_PLAN || !isSpelled(word.url)) {
    return null;
  }
  if (word.init !== null && word.init !== undefined && !isSpelled(word.init)) {
    return null;
  }
  if (!Array.isArray(word.segments)) return null;
  const segments = [];
  for (const one of word.segments) {
    if (!isWord(one) || !isSpelled(one.url) || !isCount(one.seq)) return null;
    segments.push({ url: one.url, seq: Math.floor(one.seq) });
    if (segments.length === MAX_PLAN_SEGMENTS) break;
  }
  if (segments.length === 0) return null;
  const codecs = isSpelled(word.codecs) ? word.codecs : null;
  return {
    url: word.url,
    codecs,
    init: isSpelled(word.init) ? word.init : null,
    segments,
  };
};

// A segment’s ask, believed only with an address.
export const asCipherAsk = (word) => {
  if (!isWord(word) || word.type !== CIPHER_ASK || !isSpelled(word.url)) {
    return null;
  }
  return { url: word.url };
};

// The answer, believed only whole: an address, and bytes that are a
// real buffer — or a plain null, the miss the caller is owed instead
// of an error.
export const asCipherBytes = (word) => {
  if (!isWord(word) || word.type !== CIPHER_BYTES || !isSpelled(word.url)) {
    return null;
  }
  if (word.bytes === null) return { url: word.url, bytes: null };
  if (!(word.bytes instanceof ArrayBuffer)) return null;
  return { url: word.url, bytes: word.bytes };
};

// The frame’s line, believed only as a sentence that says something:
// the whole text the frame’s console spoke, or nothing.
export const asLine = (word) => {
  if (!isWord(word) || word.type !== LINE || !isSpelled(word.text)) {
    return null;
  }
  return { text: word.text };
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
