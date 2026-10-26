import { BANDS, createRecording } from './introprint.js';

// Kept apart from the settings: this is what the player has learned, not what
// the viewer chose, and it is many times larger.
//
// Nothing here says where a recording came from — no address, no title, no
// time it was watched. It is spectra and nothing else, which is also why it
// works across sites: an opening is recognised by how it sounds, wherever it
// is playing.
const STORAGE_KEY = 'nocturneIntros';
const VERSION = 2;
const MAX_INTROS = 12;
// Two, not one: someone following two series at once still has the last
// episode of each to learn from.
const MAX_PREVIOUS = 2;
const CHUNK = 0x8000;

const toBase64 = (bytes) => {
  let binary = '';
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return btoa(binary);
};

const fromBase64 = (text) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

const packCells = ({ cells }) =>
  toBase64(new Uint8Array(cells.buffer, cells.byteOffset, cells.byteLength));

// Under a minute heard is not worth keeping: it would push out an episode
// that has more to compare against.
const MIN_HEARD_CELLS = 300;

const countHeard = (recording) =>
  recording.heard.reduce((total, flag) => total + flag, 0);

const unpack = (entry) => {
  const recording = createRecording(entry.length);
  const cells = fromBase64(entry.cells);
  if (cells.length !== entry.length * BANDS) return null;
  recording.cells.set(new Int8Array(cells.buffer));
  if (entry.heard === undefined) recording.heard.fill(1);
  else recording.heard.set(fromBase64(entry.heard));
  return { ...recording, id: entry.id, seenAt: entry.seenAt };
};

const empty = () => ({
  version: VERSION,
  nextId: 1,
  intros: [],
  previous: [],
  revision: 0,
});

// A store from another version, or one that no longer parses, is dropped:
// the worst that costs is one more opening heard in full.
const readRaw = async () => {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const raw = stored[STORAGE_KEY];
    if (raw?.version !== VERSION) return empty();
    return raw;
  } catch (error) {
    console.error('Nocturne: could not read learned intros', error);
    return empty();
  }
};

export const readIntroStore = async () => {
  const raw = await readRaw();
  const decode = (list) => list.map(unpack).filter((entry) => entry !== null);
  try {
    return { intros: decode(raw.intros), previous: decode(raw.previous) };
  } catch (error) {
    console.error('Nocturne: learned intros are unreadable', error);
    return { intros: [], previous: [] };
  }
};

// Called once an episode is done with: what it taught, and what it leaves
// for the next episode to be compared with. The changes are worked out from
// the store it was given and nothing else, so a change lost in a race can be
// applied again on top of whatever the store is now — and so that applying
// it twice cannot double anything: the same sound already in the store is a
// fresher timestamp, not a second copy.
const sameTune = (entry, cells) => entry.cells === cells;

const merged = (raw, { found, recording }) => {
  const now = Date.now();
  let { intros } = raw;
  let { nextId } = raw;

  if (found?.kind === 'learned') {
    const cells = packCells(found.recording);
    const twin = intros.find((entry) => sameTune(entry, cells));
    if (twin === undefined) {
      intros = [
        { id: nextId, length: found.recording.length, cells, seenAt: now },
        ...intros,
      ];
      nextId += 1;
    } else {
      intros = intros.map((entry) =>
        entry === twin ? { ...entry, seenAt: now } : entry,
      );
    }
  } else if (found?.kind === 'known') {
    intros = intros.map((entry) =>
      entry.id === found.recording.id ? { ...entry, seenAt: now } : entry,
    );
  }

  // The openings not heard for longest are the ones let go of first.
  intros = intros
    .toSorted((first, second) => second.seenAt - first.seenAt)
    .slice(0, MAX_INTROS);

  let { previous } = raw;
  if (recording !== null && countHeard(recording) >= MIN_HEARD_CELLS) {
    const cells = packCells(recording);
    const twin = previous.find((entry) => sameTune(entry, cells));
    if (twin === undefined) {
      previous = [
        {
          id: nextId,
          length: recording.length,
          cells,
          heard: toBase64(recording.heard),
          seenAt: now,
        },
        ...previous,
      ].slice(0, MAX_PREVIOUS);
      nextId += 1;
    } else {
      previous = previous.map((entry) =>
        entry === twin ? { ...entry, seenAt: now } : entry,
      );
    }
  }

  return { version: VERSION, nextId, intros, previous };
};

// Every save is a read, a change and a write of the whole store, so two at
// once would lose one of them — and two really do happen at once, when a
// player in an iframe and the page's own player are both on a film. Storage
// keeps whoever wrote last; a revision is carried in the store so the last
// writer can notice it has been overtaken, undo the loss, and apply what it
// had on top of what is there now. They take turns within a frame, and take
// notice of each other across them.
const MAX_ATTEMPTS = 3;

export const writeEpisode = async (episode) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = await readRaw();
    const revision = typeof raw.revision === 'number' ? raw.revision : 0;
    const next = merged(raw, episode);
    next.revision = revision + 1;

    try {
      await browser.storage.local.set({ [STORAGE_KEY]: next });
    } catch (error) {
      console.error('Nocturne: could not save learned intros', error);
      return;
    }

    try {
      const settled = await browser.storage.local.get(STORAGE_KEY);
      // What landed decides. A writer whose revision is not the one it sent
      // was overtaken between the read and the write, and owes the store one
      // more pass.
      if (settled[STORAGE_KEY]?.revision === next.revision) return;
    } catch (error) {
      console.error('Nocturne: could not confirm the learned intros', error);
      return;
    }
  }
  console.warn('Nocturne: the intro store kept being rewritten elsewhere');
};

let pending = Promise.resolve();

export const saveEpisode = (episode) => {
  pending = pending.then(() => writeEpisode(episode));
  return pending;
};

export const clearIntroStore = async () => {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Nocturne: could not clear learned intros', error);
  }
};
