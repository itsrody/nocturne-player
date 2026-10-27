import { createDebug } from '../../lib/debug.js';
import {
  isFunction,
  pageWindow,
  probe,
  read,
  findGlobalMatches,
} from './pageapi.js';

// The hunt's misses are the other unanswerable question: why is there no
// sound-track sheet, no ladder? Once per sweep that comes up with nothing.
const debug = createDebug('engines');

// The quality ladder and the audio tracks are asked of the same object, so the
// hunt for that object lives here rather than twice over. Nothing in this file
// changes anything on the page: it is all identification.

export const isHlsEngine = (value) =>
  Array.isArray(read(value, 'levels')) &&
  typeof read(value, 'currentLevel') === 'number';

export const isDashPlayer = (value) =>
  isFunction(value, 'getBitrateInfoListFor') &&
  isFunction(value, 'setQualityFor');

export const isShakaPlayer = (value) =>
  isFunction(value, 'getVariantTracks') &&
  isFunction(value, 'selectVariantTrack');

// Playerjs hands out one method and keeps everything else in a closure. What
// identifies it is that api('id') answers with the id of the element it was
// built on — cheap, and true of a player that has no ladder to offer. The
// question is asked quietly: a call into an api that belongs to somebody is
// answered 'no' without a word in the console.
export const isPlayerjsInstance = (value) =>
  isFunction(value, 'api') && typeof probe(value, 'api', 'id') === 'string';

const ATTACHED_KEYS = [
  'hls',
  '_hls',
  '__hls',
  'hlsPlayer',
  // The video.js shapes sit here too, and so do the names sites hang
  // engines on when 'hls' was taken: every key is shape-checked before it
  // is believed, so a name that belongs to somebody else costs nothing.
  'player',
  'playerInstance',
  'playerObject',
  'playerApi',
  'engine',
];

// The seats a handle can hang from, most likely first: the element itself,
// then the film's own furniture — pages habitually hang the engine on the
// wrapper the player was built inside of — and the host answering for its
// own last.
const seatsOf = (video, host) => {
  const seats = [video.wrappedJSObject ?? video];
  let at = video.parentElement ?? null;
  for (let hops = 0; at !== null && hops < 5; hops++) {
    seats.push(at.wrappedJSObject ?? at);
    at = at.parentElement ?? null;
  }
  if (host !== null) seats.push(host.wrappedJSObject ?? host);
  return seats;
};

// Cheapest first: some pages hang the engine straight off the media element,
// and some hang it off the named player object the caller has already found —
// `playerEl.hls` being the common shape there. The element sits first, the
// host answers for its own furniture.
const findAttached = (video, host, shape) => {
  for (const seat of seatsOf(video, host)) {
    for (const key of ATTACHED_KEYS) {
      const candidate = read(seat, key);
      if (candidate && shape(candidate)) return candidate;
    }
  }
  return null;
};

// video.js keeps its ladder in the technology that reads the stream, and
// its public door is qualityLevels() — bundled with the player since the
// seventh major, and present on almost every page that calls itself
// video.js. The word 'tech' rides along so a lookalike with a decorative
// list of levels is not believed by mistake.
export const isVideojsPlayer = (value) =>
  isFunction(value, 'qualityLevels') && isFunction(value, 'tech');

// Sites that ship video.js bundled usually keep the constructor global even
// when the players themselves are born in closures — and the constructor
// keeps its own registry at videojs.players, every entry answering the
// shape. That registry is the widest door into a closed player there is.
const registeredVideojs = () => {
  const registry = read(read(pageWindow(), 'videojs'), 'players');
  if (typeof registry !== 'object' || registry === null) return [];
  const players = [];
  for (const key of Object.keys(registry)) {
    const candidate = read(registry, key);
    if (candidate !== null && isVideojsPlayer(candidate)) {
      players.push(candidate);
    }
  }
  return players;
};

const MATCHERS = [
  { name: 'hls', matches: isHlsEngine },
  { name: 'dash', matches: isDashPlayer },
  { name: 'shaka', matches: isShakaPlayer },
  { name: 'videojs', matches: isVideojsPlayer },
  { name: 'playerjs', matches: isPlayerjsInstance },
];

// One sweep of the page's globals for all of them. Sweeping once per engine
// meant walking the page's globals four times over, through cross-compartment
// wrappers, in the moment the viewer was waiting for the sheet to open.

// Playerjs is only worth looking for once the page has said it has one: the
// check is a call into an api() that belongs to somebody, and asking that of
// every global with a method by that name is not a question worth asking.
export const hasPlayerjs = () => isFunction(pageWindow(), 'Playerjs');

export const findEngines = (video, host = null) => {
  // Playerjs is asked for only once the page has said the word: asking the
  // page's every api-bearing object for the id is a call into other people's
  // code at identification time, and a page that has not admitted Playerjs
  // owes it to nobody. The gate lives here, so the quality sheet and the
  // audio sheet both inherit it instead of minding it separately.
  const matchers = hasPlayerjs()
    ? MATCHERS
    : MATCHERS.filter((one) => one.name !== 'playerjs');
  const found = findGlobalMatches(matchers, (total) => {
    debug('the sweep gave up at its budget', `${total} globals on the page`);
  });
  if (host !== null) {
    for (const matcher of matchers) {
      try {
        if (matcher.matches(host)) found[matcher.name] = host;
      } catch {
        continue;
      }
    }
  }
  if (found.hls === undefined) {
    const attached = findAttached(video, host, isHlsEngine);
    if (attached !== null) found.hls = attached;
  }
  if (found.videojs === undefined) {
    const [first] = registeredVideojs();
    if (first !== undefined) found.videojs = first;
  }
  const names = Object.keys(found);
  debug(
    names.length > 0 ? `identified ${names.join(', ')}` : 'no engine in sight',
  );
  return found;
};
