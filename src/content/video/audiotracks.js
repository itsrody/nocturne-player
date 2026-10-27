import { call, read, toArray, write } from './pageapi.js';
import { findEngines } from './engines.js';
import { createRungs } from './rungs.js';

// A film with two dubs carries them as two audio renditions of the same stream,
// and every engine names them differently. What they agree on is that there is
// a list, one of them is playing, and one of them can be asked for — which is
// all a row of chips needs.

const trackLabel = (name, language, index) => {
  if (typeof name === 'string' && name !== '') return name;
  if (typeof language === 'string' && language !== '') return language;
  return `Track ${index + 1}`;
};

// --- hls.js ------------------------------------------------------------------

const buildHlsTracks = (engine) => ({
  name: 'hls.js',
  list: () =>
    toArray(read(engine, 'audioTracks')).map((track, index) => ({
      id: String(index),
      label: trackLabel(read(track, 'name'), read(track, 'lang'), index),
    })),
  current: () => {
    const index = read(engine, 'audioTrack');
    return typeof index === 'number' && index >= 0 ? String(index) : null;
  },
  select: (id) => write(engine, 'audioTrack', Number(id)),
});

// --- dash.js -----------------------------------------------------------------

const buildDashTracks = (player) => {
  // The originals go back to setCurrentTrack untouched: a track is a page
  // object, and only the page's own object is accepted there.
  let known = new Map();

  const collect = () => {
    known = new Map();
    return toArray(call(player, 'getTracksFor', 'audio')).map(
      (track, index) => {
        const id = String(index);
        known.set(id, track);
        const labels = toArray(read(track, 'labels'));
        return {
          id,
          label: trackLabel(
            read(labels[0] ?? null, 'text'),
            read(track, 'lang'),
            index,
          ),
        };
      },
    );
  };

  return {
    name: 'dash.js',
    list: collect,
    current: () => {
      const track = call(player, 'getCurrentTrackFor', 'audio');
      const language = read(track, 'lang');
      const found = collect().find(
        (entry) => read(known.get(entry.id), 'lang') === language,
      );
      return found === undefined ? null : found.id;
    },
    select: (id) => {
      if (known.size === 0) collect();
      const track = known.get(id);
      if (track === undefined) return false;
      call(player, 'setCurrentTrack', track);
      return true;
    },
  };
};

// --- Shaka Player ------------------------------------------------------------

const buildShakaTracks = (player) => ({
  name: 'shaka',
  list: () =>
    toArray(call(player, 'getAudioLanguages'))
      .filter((language) => typeof language === 'string' && language !== '')
      .map((language) => ({ id: language, label: language })),
  current: () => {
    const active = toArray(call(player, 'getVariantTracks')).find(
      (track) => read(track, 'active') === true,
    );
    const language = read(active ?? null, 'language');
    return typeof language === 'string' && language !== '' ? language : null;
  },
  select: (id) => {
    call(player, 'selectAudioLanguage', id);
    return true;
  },
});

// --- Playerjs ----------------------------------------------------------------

const buildPlayerjsTracks = (instance) => ({
  name: 'playerjs',
  list: () =>
    toArray(call(instance, 'api', 'audiotracks'))
      .filter((label) => typeof label === 'string' && label !== '')
      .map((label) => ({ id: label, label })),
  current: () => {
    const shown = call(instance, 'api', 'audiotrack');
    return typeof shown === 'string' && shown !== '' ? shown : null;
  },
  select: (id) => {
    call(instance, 'api', 'audiotrack', id);
    return true;
  },
});

// --- The element's own list --------------------------------------------------

// Where the browser exposes it, this is the plainest answer of all. Gecko does
// not ship audioTracks on Android today, so it is the fallback rather than the
// first thing asked.
const buildNativeTracks = (video) => {
  const element = video.wrappedJSObject ?? video;
  const list = read(element, 'audioTracks');
  if (typeof read(list, 'length') !== 'number') return null;

  return {
    name: 'element',
    list: () =>
      toArray(list).map((track, index) => ({
        id: String(index),
        label: trackLabel(read(track, 'label'), read(track, 'language'), index),
      })),
    current: () => {
      const tracks = toArray(list);
      const index = tracks.findIndex(
        (track) => read(track, 'enabled') === true,
      );
      return index === -1 ? null : String(index);
    },
    // Exactly one enabled at a time: switching is turning the others off.
    select: (id) => {
      const wanted = Number(id);
      const tracks = toArray(list);
      if (Number.isNaN(wanted) || tracks[wanted] === undefined) return false;
      tracks.forEach((track, index) =>
        write(track, 'enabled', index === wanted),
      );
      return true;
    },
  };
};

const BUILDERS = [
  { kind: 'hls', build: buildHlsTracks },
  { kind: 'dash', build: buildDashTracks },
  { kind: 'shaka', build: buildShakaTracks },
  { kind: 'playerjs', build: buildPlayerjsTracks },
];

export const createAudioTracks = (video, host = null) => {
  const detect = () => {
    const engines = findEngines(video, host);
    for (const { kind, build } of BUILDERS) {
      const engine = engines[kind];
      if (engine === undefined) continue;
      try {
        const candidate = build(engine);
        if (candidate.list().length > 0) return candidate;
      } catch (error) {
        console.warn('Nocturne: an audio adapter threw while probing', error);
      }
    }
    try {
      const native = buildNativeTracks(video);
      if (native !== null && native.list().length > 0) return native;
    } catch (error) {
      console.warn('Nocturne: the element refused its audio list', error);
    }
    return null;
  };

  // The sheet itself is the shared ceremony — the same bargain the quality
  // row strikes, held by the rungs module; only the hunt for the adapter
  // is this row's own.
  const rungs = createRungs(detect);
  return {
    refresh: rungs.refresh,
    getOptions: rungs.getOptions,
    isSwitchable: rungs.isSwitchable,
    getCurrent: rungs.getCurrent,
    select: rungs.select,
  };
};
