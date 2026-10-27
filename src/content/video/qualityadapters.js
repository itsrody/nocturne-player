import { call, isFunction, read, toArray, toPage, write } from './pageapi.js';
import { findEngines } from './engines.js';

export const AUTO_ID = 'auto';

const YOUTUBE_LABELS = {
  tiny: '144p',
  small: '240p',
  medium: '360p',
  large: '480p',
  hd720: '720p',
  hd1080: '1080p',
  hd1440: '1440p',
  hd2160: '2160p',
  highres: '4320p',
};

const YOUTUBE_LOWEST = 'tiny';
const YOUTUBE_HIGHEST = 'highres';

// Best first, which is both the order the chips want and the order the ladder
// is read in.
const YOUTUBE_LADDER = [
  { key: 'highres', height: 4320 },
  { key: 'hd2160', height: 2160 },
  { key: 'hd1440', height: 1440 },
  { key: 'hd1080', height: 1080 },
  { key: 'hd720', height: 720 },
  { key: 'large', height: 480 },
  { key: 'medium', height: 360 },
  { key: 'small', height: 240 },
  { key: 'tiny', height: 144 },
];

const youtubeKeyFor = (height) => {
  for (const rung of YOUTUBE_LADDER) {
    if (height >= rung.height) return rung.key;
  }
  return 'tiny';
};

const inLadderOrder = (keys) =>
  YOUTUBE_LADDER.filter((rung) => keys.has(rung.key)).map((rung) => rung.key);

const heightLabel = (height, fallback) =>
  typeof height === 'number' && height > 0 ? `${height}p` : fallback;

// Highest first: the reason anyone opens this list is to force a better
// picture, so the answer they want is the first chip.
const byHeightDescending = (first, second) => second.height - first.height;

// --- Plain <source> children -------------------------------------------------

const sourceLabel = (source, index) => {
  const explicit = source.dataset.label || source.getAttribute('title');
  if (explicit) return explicit;
  const match = /(\d{3,4})[pP]/.exec(source.src);
  return match ? `${match[1]}p` : `Source ${index + 1}`;
};

// Exported for the tests: quality.test.js reaches the adapters through
// createQuality's injected list so the coordinator contract is what is
// exercised, and these two are the ones a fixture can wire up directly.
export const createSourceAdapter = (video) => {
  const sources = Array.from(video.querySelectorAll('source'));
  if (sources.length < 2) return null;

  const options = sources.map((source, index) => ({
    id: String(index),
    label: sourceLabel(source, index),
    src: source.src,
  }));

  return {
    name: 'sources',
    hasAuto: false,
    list: () => options.map(({ id, label }) => ({ id, label })),
    current: () => {
      const found = options.find((option) => option.src === video.currentSrc);
      return found ? found.id : null;
    },
    // The element is reloaded, so the position and the playing state are
    // carried across by hand. The one listener rides both off-ramps:
    // metadata is the happy landing, error the failed one. Without the
    // error leg the restore leaked for the life of the element on a dead
    // source — and a leaked restore is worse than a leak, because a later
    // rung's loadedmetadata then fired the first rung's stale position and
    // playing state at it.
    select: (id) => {
      const option = options.find((entry) => entry.id === id);
      if (!option || video.currentSrc === option.src) return false;

      const resumeAt = video.currentTime;
      const wasPlaying = !video.paused;
      const settle = (event) => {
        video.removeEventListener('loadedmetadata', settle);
        video.removeEventListener('error', settle);
        if (event.type !== 'loadedmetadata') return;
        video.currentTime = resumeAt;
        if (wasPlaying) video.play().catch(() => {});
      };

      video.addEventListener('loadedmetadata', settle);
      video.addEventListener('error', settle);
      video.src = option.src;
      video.load();
      return true;
    },
  };
};

// --- YouTube -----------------------------------------------------------------

const findYouTubePlayer = (host) => {
  if (host !== null && isFunction(host, 'getAvailableQualityLevels')) {
    return host;
  }
  const element = document.querySelector('#movie_player, .html5-video-player');
  if (element === null) return null;
  const player = element.wrappedJSObject ?? element;
  return isFunction(player, 'getAvailableQualityLevels') ? player : null;
};

// Exported for the tests: quality.test.js wires the fixtures straight up
// rather than going through ADAPTERS' order.
export const createYouTubeAdapter = (video, host) => {
  const player = findYouTubePlayer(host);
  if (player === null) return null;

  const advertised = () =>
    toArray(call(player, 'getAvailableQualityLevels')).filter(
      (level) => typeof level === 'string' && level !== AUTO_ID,
    );

  // The phone player answers getAvailableQualityLevels() with nothing at all,
  // so the ladder is worked out from the formats the video actually has. Every
  // one of them carries the height it was encoded at, which is the same thing
  // the quality names stand for.
  const fromFormats = () => {
    const response = call(player, 'getPlayerResponse');
    const streaming = read(response, 'streamingData');
    const formats = toArray(read(streaming, 'adaptiveFormats')).concat(
      toArray(read(streaming, 'formats')),
    );

    const keys = new Set();
    for (const format of formats) {
      const height = read(format, 'height');
      if (typeof height === 'number' && height > 0) {
        keys.add(youtubeKeyFor(height));
      }
    }
    return inLadderOrder(keys);
  };

  const levels = () => {
    const listed = advertised();
    return listed.length > 0 ? listed : fromFormats();
  };

  // The page's own chips say more than the ladder keys can — '2160p
  // Premium', '1080p60', the HDR names. Not every player answers the data
  // call, and no confirmed shape backs it, so only a rung carrying an
  // honest string on both sides is spoken, and the synthesized labels
  // underneath stay the rule.
  const spoken = () => {
    const labels = {};
    const data = toArray(call(player, 'getAvailableQualityData'));
    for (const entry of data) {
      if (entry === null || typeof entry !== 'object') continue;
      const key = read(entry, 'quality');
      const label = read(entry, 'qualityLabel');
      if (
        typeof key !== 'string' ||
        typeof label !== 'string' ||
        label === ''
      ) {
        continue;
      }
      labels[key] = label;
    }
    return labels;
  };

  return {
    name: 'youtube',
    hasAuto: true,
    // Which of the two ways in produced something, in the words of whoever has
    // to work out why a film is not offering the rung they want.
    diagnose: () =>
      `${advertised().length} listed, ${fromFormats().length} in formats`,
    list: () => {
      const labels = spoken();
      return levels().map((level) => ({
        id: level,
        label: labels[level] ?? YOUTUBE_LABELS[level] ?? level,
      }));
    },
    current: () => {
      const quality = call(player, 'getPlaybackQuality');
      return typeof quality === 'string' ? quality : null;
    },
    // Both calls together: the range is what pins the ladder for the rest of
    // the video, while setPlaybackQuality is what older players listen to.
    // A promise is kept only where somebody could be listening: an old
    // player with neither method would give back a chip that switched
    // nothing, and the sheet wants to say 'the site would not change it'
    // rather than believe it.
    select: (id) => {
      const ranged = isFunction(player, 'setPlaybackQualityRange');
      const pinned = isFunction(player, 'setPlaybackQuality');
      if (!ranged && !pinned) return false;
      if (id === AUTO_ID) {
        if (ranged) {
          call(
            player,
            'setPlaybackQualityRange',
            YOUTUBE_LOWEST,
            YOUTUBE_HIGHEST,
          );
        }
        if (pinned) call(player, 'setPlaybackQuality', AUTO_ID);
        return true;
      }
      if (ranged) call(player, 'setPlaybackQualityRange', id, id);
      if (pinned) call(player, 'setPlaybackQuality', id);
      return true;
    },
  };
};

// --- hls.js ------------------------------------------------------------------

const buildHlsAdapter = (engine) => {
  const levels = () =>
    toArray(read(engine, 'levels')).map((level, index) => ({
      index,
      height: read(level, 'height') ?? 0,
      bitrate: read(level, 'bitrate') ?? 0,
    }));

  return {
    name: 'hls.js',
    hasAuto: true,
    list: () =>
      levels()
        .sort(byHeightDescending)
        .map((level) => ({
          id: String(level.index),
          label: heightLabel(
            level.height,
            `${Math.round(level.bitrate / 1000)}k`,
          ),
        })),
    current: () => {
      const level = read(engine, 'currentLevel');
      return typeof level === 'number' && level >= 0 ? String(level) : AUTO_ID;
    },
    select: (id) => {
      const index = id === AUTO_ID ? -1 : Number(id);
      if (Number.isNaN(index)) return false;
      write(engine, 'nextLevel', index);
      return write(engine, 'currentLevel', index);
    },
  };
};

// --- dash.js -----------------------------------------------------------------

const buildDashAdapter = (player) => {
  const setAuto = (isOn) => {
    call(
      player,
      'updateSettings',
      toPage({ streaming: { abr: { autoSwitchBitrate: { video: isOn } } } }),
    );
  };

  const levels = () =>
    toArray(call(player, 'getBitrateInfoListFor', 'video')).map((info) => ({
      index: read(info, 'qualityIndex') ?? 0,
      height: read(info, 'height') ?? 0,
      bitrate: read(info, 'bitrate') ?? 0,
    }));

  return {
    name: 'dash.js',
    hasAuto: true,
    list: () =>
      levels()
        .sort(byHeightDescending)
        .map((level) => ({
          id: String(level.index),
          label: heightLabel(
            level.height,
            `${Math.round(level.bitrate / 1000)}k`,
          ),
        })),
    current: () => {
      const index = call(player, 'getQualityFor', 'video');
      return typeof index === 'number' ? String(index) : null;
    },
    select: (id) => {
      if (id === AUTO_ID) {
        setAuto(true);
        return true;
      }
      const index = Number(id);
      if (Number.isNaN(index)) return false;
      setAuto(false);
      call(player, 'setQualityFor', 'video', index, true);
      return true;
    },
  };
};

// --- Shaka Player ------------------------------------------------------------

const buildShakaAdapter = (player) => {
  // The originals are handed back to selectVariantTrack untouched: a track is
  // a page object, and only the page's own object is accepted there.
  let known = new Map();

  const collect = () => {
    known = new Map();
    return toArray(call(player, 'getVariantTracks')).map((track) => {
      const id = String(read(track, 'id'));
      known.set(id, track);
      return {
        id,
        height: read(track, 'height') ?? 0,
        bandwidth: read(track, 'bandwidth') ?? 0,
        isActive: read(track, 'active') === true,
      };
    });
  };

  return {
    name: 'shaka',
    hasAuto: true,
    list: () =>
      collect()
        .sort(byHeightDescending)
        .map((track) => ({
          id: track.id,
          label: heightLabel(
            track.height,
            `${Math.round(track.bandwidth / 1000)}k`,
          ),
        })),
    current: () => {
      const active = collect().find((track) => track.isActive);
      return active ? active.id : null;
    },
    select: (id) => {
      if (id === AUTO_ID) {
        call(player, 'configure', toPage({ abr: { enabled: true } }));
        return true;
      }
      if (known.size === 0) collect();
      const track = known.get(id);
      if (track === undefined) return false;
      call(player, 'configure', toPage({ abr: { enabled: false } }));
      call(player, 'selectVariantTrack', track, true);
      return true;
    },
  };
};

// --- Playerjs ----------------------------------------------------------------

// Playerjs hands the page a single method — api() — and keeps the streaming
// engine it drives inside a closure, so there is no ladder object to find the
// way there is with hls.js. What it will answer is its own question:
// api('qualities') lists the rungs the site built, in the site's own words,
// and api('quality', label) is the same call its own menu makes. Those two are
// the whole adapter, and they are what makes quality work on the run of film
// sites that ship this player.
const AUTO_WORDS = /^(auto|авто|авто\u0301|autom)/i;

const heightOf = (label) => {
  const match = /(\d{3,4})/.exec(label);
  return match === null ? 0 : Number(match[1]);
};

// Auto first, then the heights from best to worst — the order the chips want,
// whatever order the site happened to list them in.
const orderLabels = (labels) => {
  const auto = labels.filter((label) => AUTO_WORDS.test(label));
  const rest = labels
    .filter((label) => !AUTO_WORDS.test(label))
    .sort((first, second) => heightOf(second) - heightOf(first));
  return auto.concat(rest);
};

// On auto the player answers with both words — "Авто 720p" — because it is
// naming the rung it picked as well as saying who picked it. The chip that
// should light up is the one the viewer chose, so the longest label the answer
// starts with wins: "Авто" over "720p", but a pinned "1080p" over nothing.
export const matchLabel = (labels, shown) => {
  if (typeof shown !== 'string' || shown === '') return null;
  const found = labels
    .filter((label) => shown.startsWith(label))
    .sort((first, second) => second.length - first.length);
  return found.length > 0 ? found[0] : null;
};

const listQualities = (instance) =>
  toArray(call(instance, 'api', 'qualities')).filter(
    (label) => typeof label === 'string' && label !== '',
  );

export const buildPlayerjsAdapter = (instance) => ({
  name: 'playerjs',
  // The site's own list already carries its own word for auto, and it is the
  // only one this player answers to.
  hasAuto: false,
  diagnose: () => `${listQualities(instance).length} in the site's list`,
  // The site's word for auto is kept as the id, since it is the one the
  // player answers to, but the chip says it in the sheet's own language.
  list: () =>
    orderLabels(listQualities(instance)).map((label) => ({
      id: label,
      label: AUTO_WORDS.test(label) ? 'Auto' : label,
    })),
  current: () =>
    matchLabel(listQualities(instance), call(instance, 'api', 'quality')),
  select: (id) => {
    const labels = listQualities(instance);
    if (!labels.includes(id)) return false;
    // Asking for the rung that is already playing would have the site tear
    // the stream down and build it again for no change at all.
    if (matchLabel(labels, call(instance, 'api', 'quality')) === id) {
      return true;
    }
    call(instance, 'api', 'quality', id);
    return true;
  },
});

// --- video.js ----------------------------------------------------------------

// The ladder lives in the technology reading the stream, and the public door
// to it is qualityLevels(): a live list where every rung answers for its own
// height and bitrate, and the site's own ABR is 'every rung enabled at
// once'. Asking for a rung means silencing every rung but one — the shape
// the site's own quality pickers use.
export const buildVideojsAdapter = (player) => {
  const rungs = () => toArray(call(player, 'qualityLevels')) ?? [];
  if (rungs().length < 2) return null;

  return {
    name: 'video.js',
    hasAuto: true,
    list: () =>
      rungs()
        .map((rung, index) => ({
          id: String(index),
          height: read(rung, 'height') ?? 0,
          bitrate: read(rung, 'bitrate') ?? 0,
        }))
        .sort(byHeightDescending)
        .map((rung) => ({
          id: rung.id,
          label: heightLabel(
            rung.height,
            `${Math.round(rung.bitrate / 1000)}k`,
          ),
        })),
    current: () => {
      const open = rungs().filter((rung) => Boolean(read(rung, 'enabled')));
      // ABR answers with every rung open at once, or more than one open:
      // either way the site is choosing, and the chip says Auto.
      if (open.length !== 1) return AUTO_ID;
      const index = rungs().indexOf(open[0]);
      return index >= 0 ? String(index) : AUTO_ID;
    },
    select: (id) => {
      const wanted = id === AUTO_ID ? null : Number(id);
      if (id !== AUTO_ID && !Number.isInteger(wanted)) return false;
      const all = rungs();
      if (id !== AUTO_ID && (wanted < 0 || wanted >= all.length)) return false;
      let wrote = true;
      all.forEach((rung, index) => {
        if (!write(rung, 'enabled', id === AUTO_ID ? true : index === wanted)) {
          wrote = false;
        }
      });
      return wrote;
    },
  };
};

// An engine that hands over its ladder can say more about it than a player that
// only answers in labels, so Playerjs is the last one asked.
const BUILDERS = [
  { kind: 'hls', build: buildHlsAdapter },
  { kind: 'dash', build: buildDashAdapter },
  { kind: 'shaka', build: buildShakaAdapter },
  { kind: 'videojs', build: buildVideojsAdapter },
  { kind: 'playerjs', build: buildPlayerjsAdapter },
];

const createEngineAdapter = (video, host) => {
  const engines = findEngines(video, host);
  const found = [];
  for (const { kind, build } of BUILDERS) {
    const engine = engines[kind];
    if (engine === undefined) continue;
    try {
      const adapter = build(engine);
      // A player with nothing to offer is not an answer; the next one might be.
      if (adapter.list().length === 0) continue;
      found.push(adapter);
    } catch (error) {
      console.warn('Nocturne: a quality adapter threw while probing', error);
    }
  }
  // More than one object on a page can answer to an engine's shape — a demo
  // wired to nothing, a helper kept for the page's own stats. Of the ones
  // with a ladder, the one that can also say what is playing now is the one
  // wired to the film; the rest are probably talking about somebody else's.
  const wired = found.find((adapter) => adapter.current() !== null);
  return wired ?? found[0] ?? null;
};

// Cheapest and most certain first: a <source> list is unambiguous, a named
// player is next, and the sweep of the page's globals is the last thing tried.
export const ADAPTERS = [
  createSourceAdapter,
  createYouTubeAdapter,
  createEngineAdapter,
];
