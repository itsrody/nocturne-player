// The names the storage holds — the only strings left here. Everything
// else two files must agree on moved to its own room: the words of the
// runtime and the page wire are spelled, built, and checked in
// lib/protocol.js, one vocabulary for the whole machine rather than a
// list of tags each end copies by hand and keeps from drifting.
export const STORAGE_KEY = 'nocturne';

// A dead key from an earlier era: the openings the player once learned and
// must never carry again. The name is kept only to be able to erase it.
export const LEGACY_OPENINGS_KEY = 'nocturneIntros';
