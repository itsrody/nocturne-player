import { createDebug } from '../../lib/debug.js';
import {
  isFunction,
  pageWindow,
  probe,
  read,
  findGlobalMatches,
} from './pageapi.js';

// The hunt’s misses are the other unanswerable question: why is there no
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
  // The house’s own hatch: the instance the own engine hangs on the
  // element it took, the first key asked — no loader outranks the one
  // the house itself stood.
  'nocturneHls',
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
// then the film’s own furniture — pages habitually hang the engine on the
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

// The gate said no to Playerjs: those are the matchers the sweep carries.
const WITHOUT_PLAYERJS = MATCHERS.filter((one) => one.name !== 'playerjs');

// The families the bus can name (the protocol’s SHAPES), and the matcher
// names each one believes in, likeliest first. A family is a format
// word, not a promise: a sweep narrowed by one still owes the page the
// whole truth the moment the family’s own ask answers nothing.
const FAMILY_MATCHERS = {
  hls: ['hls'],
  dash: ['dash', 'shaka'],
  mss: ['shaka', 'dash'],
};

// One bounded pass of the page’s globals for every matcher at once.
// Sweeping once per engine meant walking the page’s globals several
// times over, through cross-compartment wrappers, in the moment the
// viewer was waiting.
const globalSweep = (matchers) =>
  findGlobalMatches(matchers, (total) => {
    debug('the sweep gave up at its budget', `${total} globals on the page`);
  });

// Playerjs is only worth looking for once the page has said it has one: the
// check is a call into an api() that belongs to somebody, and asking that of
// every global with a method by that name is not a question worth asking.
export const hasPlayerjs = () => isFunction(pageWindow(), 'Playerjs');

// The sweep’s answer, warm in hand. This is the manager’s arm at the
// page’s own quiet: the walk over the page’s globals is a document-wide
// ask, and it is made while the viewer is not waiting for it. The
// answer is stamped with the page’s count of moves, with the page’s
// word for Playerjs, and with the family the bus last named in the
// dossier — so a consult can tell whether it is still the page’s
// answer or a memory of an earlier page and an un-named crossing.
let warm = null;

// Ask the sweep at the page’s ease. `readShape` is the frame’s fresh
// reading of the dossier’s shape word, asked again at the hour the
// rest keeps, so the answer carries the family the bus named at that
// hour, not the one it named when the arm was handed in. The word back
// clears the arm — the answer’s bookkeeping goes with it, so a consult
// afterwards asks the page anew; the tests carry the word, a
// page-lifetime arm does not.
export const warmEngines = (dom, readShape = () => null) => {
  // The rest’s work, kept under a name so a knock can re-arm the same
  // asking: atEase is one rest per work, so a re-ask while the hour is
  // still pending costs nothing, and the hour stamps everything fresh
  // when it finally keeps.
  const work = () => {
    if (warm === null || warm.dom !== dom) return;
    const playerjs = hasPlayerjs();
    const found = globalSweep(playerjs ? MATCHERS : WITHOUT_PLAYERJS);
    // An empty answer is not stamped, here as anywhere: a page that
    // builds its engine later must not be answered from the memory of
    // the nothing before it.
    if (Object.keys(found).length === 0) return;
    warm.playerjs = playerjs;
    warm.shape = readShape();
    warm.turn = dom.turn();
    warm.found = found;
  };
  warm = {
    dom,
    readShape,
    work,
    turn: null,
    playerjs: null,
    shape: null,
    found: null,
  };
  const off = dom.atEase(work);
  return () => {
    if (warm !== null && warm.dom === dom) warm = null;
    off();
  };
};

// The network’s knock, from the bus: the film’s manifest is on the
// wire. Two truths arrive with it — the engine the film rides is, at
// that exact moment, at its most findable (the manifest is being
// fetched through it, before its element is ever inserted), and the
// old answer, if one was stamped, was made before the crossing. The
// stamp is dropped so no consult in between answers from it, and the
// rest is asked again — one rest per asking, so a pending hour is
// kept and not doubled.
export const knockWarm = () => {
  if (warm === null) return;
  warm.turn = null;
  warm.dom.atEase(warm.work);
};

// The warm answer, if it is still the page’s. The stamp is read three
// times — the count of moves, the page’s word for Playerjs, and the
// family the bus last named — because all three can change without
// the others.
const warmSweep = (playerjs, shape) => {
  if (warm === null) return null;
  if (
    warm.turn !== warm.dom.turn() ||
    warm.playerjs !== playerjs ||
    warm.shape !== shape
  ) {
    return null;
  }
  return warm.found;
};

// The site’s own engine hunt: the sweep of the page’s globals for every
// matcher at once, then the film’s own furniture and the host’s, then
// the constructor’s registry. `video` and `host` are the film and the
// player room it was judged in.
export const findEngines = (video, host = null) => {
  // Playerjs is asked for only once the page has said the word: asking the
  // page’s every api-bearing object for the id is a call into other people’s
  // code at identification time, and a page that has not admitted Playerjs
  // owes it to nobody. The gate lives here, so the quality sheet and the
  // audio sheet both inherit it instead of minding it separately.
  const playerjs = hasPlayerjs();
  const matchers = playerjs ? MATCHERS : WITHOUT_PLAYERJS;
  // The family the bus named, read fresh at every ask — the stamp is
  // lied to by no stale reading, and a crossing that named another
  // family since the answer was made makes the answer a memory’s.
  const shape = warm !== null ? warm.readShape() : null;

  let raw = warmSweep(playerjs, shape);
  if (raw === null) {
    // The family the bus named is asked first, its matchers alone: on
    // a page the hint is right about — the stream pages, the common
    // case — four matchers' worth of guarded reads over the page’s
    // globals are not paid. A family that answers nothing was no
    // promise (the URL is a hint by design), and the page’s whole
    // truth is asked for it instead.
    const family = FAMILY_MATCHERS[shape];
    if (family === undefined) {
      raw = globalSweep(matchers);
    } else {
      const narrowed = globalSweep(
        matchers.filter((one) => family.includes(one.name)),
      );
      raw = Object.keys(narrowed).length > 0 ? narrowed : globalSweep(matchers);
    }
    // A fresh sweep is its own stamp: one sheet opening pays, and the
    // next one on a page that has been quiet opens on the answer. An
    // empty answer is not stamped — a page that builds its engine later
    // must not be answered from a memory of the nothing before it.
    if (warm !== null && Object.keys(raw).length > 0) {
      warm.turn = warm.dom.turn();
      warm.playerjs = playerjs;
      warm.shape = shape;
      warm.found = raw;
    }
  }
  // The sweep’s answer is the page’s, not this ask’s: the film’s own
  // furniture and the host’s override it on a copy, so the warm answer
  // never accumulates one film’s attached engines for the next.
  const found = { ...raw };
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
