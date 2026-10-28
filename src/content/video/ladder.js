// The stream’s own ladders, in the frame’s room. A master playlist the
// house’s read fetched and parsed writes the ladder the sheet quotes;
// the storage here is where the two meet — the word down keeps one
// ladder per stream, the newest whole, and the sheet asks by the
// address the element itself said. The voice is the pin’s way out: the
// sheet has no hub hearing of its own, so a tagged rung is spoken up
// through the word the builder spells, and anything the wire refuses
// costs nothing at the caller.
import { createSignal } from '../../lib/signals.js';

const ladders = new Map();

// A small counted room, like the walk’s old discipline: one ladder per
// stream a generation met, and beyond that the oldest stream’s ladder
// is the first forgotten.
const MAX_LADDERS = 4;

// The crossings the frame itself paid for: the manifest-shaped asks the
// routing’s doors saw the page’s player make, newest first. This is the
// ladder’s other half of the pairing — the element’s `currentSrc` on
// most engines is a `blob:` name the player minted, so the master’s own
// address, seen at the ask, is the only word the ladder can be met by.
const crossings = [];

const MAX_CROSSINGS = 8;

// The pin’s voice, wired by the field agent at its birth: the word up
// that pairs a rung’s index with the hub’s own rewording.
let voice = null;

// The bell the sheet rings itself by: a ladder that landed after the
// sheet opened is a word that outran the sheet’s own refresh, so the
// sheet listens here instead.
const landed = createSignal();

// The sheet’s own subscription: the listener runs on every ladder that
// lands, with the master’s address — the listener decides for itself
// whether it is still on the air.
export const onLadder = (fn) => landed.on(fn);

export const hearLadder = (url, ladder) => {
  ladders.set(url, ladder);
  while (ladders.size > MAX_LADDERS) {
    const oldest = ladders.keys().next().value;
    ladders.delete(oldest);
  }
  // The word is worth a bell: a sheet opened before the read answered
  // is a sheet sitting empty while its ladder lands behind it — the
  // listener repaints, and the rungs appear without a second open.
  landed.emit(url);
};

// The sheet’s ask: the ladder the element’s own address was written in
// — or nothing, when no read of the house ever met it.
export const ladderFor = (url) => {
  if (typeof url !== 'string') return null;
  return ladders.get(url) ?? null;
};

// The routing’s door, heard whole: a manifest-shaped ask the frame’s
// player made — the master before it was ever fetched, so the sheet may
// open on a ladder the element already knows and the element itself
// never said in a name the house could read.
export const hearCrossing = (url) => {
  const at = crossings.indexOf(url);
  if (at >= 0) crossings.splice(at, 1);
  crossings.unshift(url);
  if (crossings.length > MAX_CROSSINGS) crossings.pop();
};

// The sheet’s route in, walked in the order of certainty: the ladder
// keyed by the element’s own address first — where the element said
// the manifest itself; then the frame’s manifest crossings, newest
// first — where the shim’s doors saw the ask; then the frame’s own
// ladders, newest first — because *this frame heard a ladder* is the
// one fact that never failed in the field: the element’s `currentSrc`
// is a `blob:` name, the ask is carried by the player’s own bundled
// loader, and no door anywhere sees a word the frame itself did not
// say. A frame speaks for one film; the last whole ladder it was told
// is that film’s, whatever road the ask took to be fetched. An element
// half-said (`blob:`) is no refusal here — it is exactly the shape the
// walk was cut for.
export const ladderNear = (video) => {
  const mine = ladderFor(
    typeof video.currentSrc === 'string' ? video.currentSrc : '',
  );
  if (mine !== null && mine.length >= 2) return mine;
  if (typeof video.src === 'string') {
    const said = ladderFor(video.src);
    if (said !== null && said.length >= 2) return said;
  }
  for (const url of crossings) {
    const met = ladderFor(url);
    if (met !== null && met.length >= 2) return met;
  }
  // The frame’s own hearing, newest first — the map remembers its
  // insertion order, so the backwards walk is the walk back in time.
  const spoken = Array.from(ladders.keys()).reverse();
  for (const url of spoken) {
    const heard = ladders.get(url);
    if (heard.length >= 2) return heard;
  }
  return null;
};

// The address the near ladder was keyed by — the master the frame
// speaks for, whatever road its ask took. The own engine’s fuel: a
// clash of loaders is read from the same book the sheet’s chips are.
export const ladderAddressNear = (video) => {
  const said = [video?.currentSrc, video?.src].filter(
    (one) => typeof one === 'string' && one !== '' && !one.startsWith('blob:'),
  );
  for (const url of said) {
    if (ladderFor(url) !== null) return url;
  }
  for (const url of crossings) {
    if (ladderFor(url) !== null) return url;
  }
  const spoken = Array.from(ladders.keys()).reverse();
  return spoken[0] ?? null;
};

// The pin’s voice, wired once by whoever holds the frame’s port.
export const voiceLadder = (wired) => {
  voice = wired;
};

// The tagged rung, spoken up: a rung’s index, or a plain null for the
// pin lifted. A wire that would not carry it is a death already spoken
// as an event; the chip’s own word is the sheet’s business either way.
export const pinRung = (id) => {
  try {
    voice?.(id);
  } catch {
    // No mouth home was owed the pin.
  }
};
