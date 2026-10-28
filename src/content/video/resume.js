// The replay note — the handoff across a forced reload. A pinned rung
// lands at the hub's next master answer, and an engine closed over its
// own `MediaSource` never re-asks: for those, the whole frame replays,
// and the only thing worth carrying across is where the viewer was.
// `sessionStorage` survives exactly one reload of the same document and
// dies with the tab — no superset permission, no background storage,
// nothing leaves the frame. The note says who left it and when; a note
// older than its lifetime is one the reload never paid (a navigation
// elsewhere, a crash) and is cleared rather than replayed.

const KEY = 'nocturne:replay';

// Longer than any honest reload pays to stand its player back up; short
// enough that a stale note cannot jerk a film the viewer never pinned.
const LIFETIME_MS = 30_000;

// Says the element down before its frame reloads: the position, and the
// moment the note was written. Quiet on any refusal — a store the
// frame keeps private replays without a note, and the viewer simply
// starts over.
export const noteReplay = (video) => {
  try {
    globalThis.sessionStorage.setItem(
      KEY,
      JSON.stringify({ at: video.currentTime, when: Date.now() }),
    );
  } catch {
    // The store is there to serve, not to be trusted.
  }
};

// Says the note back into the element the frame newly holds — once, and
// the note gone: the claim is spent whether or not the restore lands,
// so a second settle can never re-jerk an old note into a new film.
// Returns the position to restore, or null when the note is absent,
// spent, stale, or unreadable.
export const claimReplay = () => {
  try {
    const raw = globalThis.sessionStorage.getItem(KEY);
    if (raw === null) return null;
    globalThis.sessionStorage.removeItem(KEY);
    const note = JSON.parse(raw);
    if (typeof note?.at !== 'number' || !Number.isFinite(note.at)) return null;
    if (typeof note?.when !== 'number') return null;
    if (Date.now() - note.when > LIFETIME_MS) return null;
    return note.at;
  } catch {
    // A note half-written by a dying frame reads as nothing.
    return null;
  }
};
