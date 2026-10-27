const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
// The player is a player for one film — the one a page is built around. Two
// cheap readings say that a page has one: the film must own at least half of
// the screen's area on its own, and where other films are present it must own
// double what the runner-up owns. A page that is a gallery, a results grid or
// a row of hover-preview cards elects no film at all — the right answer,
// because nothing there is the main film, and the badge is quieter than a
// player opened on a preview.
const MAIN_MIN_SHARE = 0.5;
const MAIN_DOMINANCE = 2;
const RESCAN_DELAY_MS = 250;
const HAVE_METADATA = 1;

// A scroll used to schedule a rescan of its own, every tick of the debounce,
// for as long as the page kept moving — the same sweep paid over and over on
// the way to a video it would only reach at the end. What the scroll was
// really saying is that the neighbourhood of the viewport has changed, which
// is what the approach observer watches instead: every video the last sweep
// found is kept under observation with a margin past the screen, and their
// drawing nearer — alone, and not the scroll itself — asks for the next
// sweep. A scroll that goes nowhere near a film costs nothing.
const APPROACH_MARGIN = '25%';

const makeApproachObserver = (onApproach) => {
  if (typeof IntersectionObserver !== 'function') return null;
  const observer = new IntersectionObserver(onApproach, {
    scrollMargin: APPROACH_MARGIN,
  });
  // An option the browser did not know is dropped, so the presence of the
  // reading is what says the margin was understood; without it the observer
  // would watch the true viewport and fire late.
  if (!('scrollMargin' in observer)) return null;
  return observer;
};

// The shadow walk is the expensive branch, so it only runs when the light DOM
// turned up nothing — which is the only case where it can help. And it is
// bounded: a page whose web components nest deeply can hand the walk a tree
// without end, and every scroll would send the walk down it again. The
// budget keeps one rescan from sitting on the main thread for longer than a
// moment; a video the budget went past is found by the next rescan instead,
// the way a page still being built is found in pieces.
const MAX_WALK_ELEMENTS = 5000;

const collectFromShadowRoots = (root, found) => {
  let budget = MAX_WALK_ELEMENTS;

  const walk = (node) => {
    if (budget <= 0) return;
    for (const element of node.querySelectorAll('*')) {
      budget -= 1;
      if (budget <= 0) return;
      const { shadowRoot } = element;
      if (!shadowRoot) continue;
      for (const video of shadowRoot.querySelectorAll('video')) {
        found.add(video);
      }
      walk(shadowRoot);
    }
  };

  walk(root);
};

const collectVideos = () => {
  const found = new Set(document.querySelectorAll('video'));
  if (found.size === 0) collectFromShadowRoots(document, found);
  return found;
};

export const isPlayable = (video) => {
  if (!video.isConnected) return false;
  // A portrait film is a clip by the nature of its shape: shorts, reels and
  // thumb-flick feeds are what portrait is on the pages a player is offered
  // to, and a page that is all clips has no main film in it. Refused at the
  // gate, so the candidacy arithmetic never sees one. Dimensions the element
  // has not given yet are no verdict either way.
  if (video.videoWidth > 0 && video.videoHeight > video.videoWidth) {
    return false;
  }
  const rect = video.getBoundingClientRect();
  if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) return false;
  const style = getComputedStyle(video);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  if (Number(style.opacity) === 0) return false;
  return video.readyState >= HAVE_METADATA || video.currentSrc !== '';
};

const visibleArea = (rect) => {
  const width =
    Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const height =
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return Math.max(0, width) * Math.max(0, height);
};

// Pick must rank on the visible area alone — not a weighted taste. What is
// on screen decides who the screen belongs to; a preview that plays by
// itself has no seniority, and a film that is still loading has no fault.
export const pickPrimary = (videos) => {
  const ranked = Array.from(videos)
    .map((video) => ({
      video,
      area: visibleArea(video.getBoundingClientRect()),
    }))
    .filter(({ area }) => area > 0)
    .sort((first, second) => second.area - first.area);

  const best = ranked[0];
  if (!best) return null;
  const runner = ranked[1];
  if (runner && best.area < runner.area * MAIN_DOMINANCE) return null;
  if (best.area < window.innerWidth * window.innerHeight * MAIN_MIN_SHARE) {
    return null;
  }
  return best.video;
};

export const createVideoWatcher = (onPrimaryChange) => {
  const playable = new Set();
  let primary = null;
  let observer = null;
  let rescanTimer = null;
  let approacher = null;
  const watched = new Set();
  let isRunning = false;

  const rescan = () => {
    rescanTimer = null;
    playable.clear();
    for (const video of collectVideos()) {
      if (isPlayable(video)) playable.add(video);
      // Position changes of known films come through the approach observer
      // rather than through scrolls, so every video the sweep meets is kept
      // on watch. An element the page has let go of is one it has forgotten:
      // the watch is dropped with it, which is what keeps the set of watched
      // elements from growing without end across a long visit.
      if (approacher !== null && !watched.has(video)) {
        watched.add(video);
        approacher.observe(video);
      }
    }
    if (approacher !== null) {
      for (const video of watched) {
        if (video.isConnected) continue;
        approacher.unobserve(video);
        watched.delete(video);
      }
    }
    const next = pickPrimary(playable);
    if (next === primary) return;
    primary = next;
    onPrimaryChange(primary, playable.size);
  };

  const scheduleRescan = () => {
    if (rescanTimer !== null) return;
    rescanTimer = setTimeout(rescan, RESCAN_DELAY_MS);
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    observer = new MutationObserver(scheduleRescan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    document.addEventListener('play', scheduleRescan, true);
    document.addEventListener('pause', scheduleRescan, true);
    document.addEventListener('loadedmetadata', scheduleRescan, true);
    window.addEventListener('resize', scheduleRescan);
    approacher = makeApproachObserver(scheduleRescan);
    // Without an approach observer — an old browser, or a promise the page
    // keeps none of — the scroll itself stands in, coarse as ever.
    if (approacher === null) {
      window.addEventListener('scroll', scheduleRescan, true);
    }
    rescan();
  };

  const stop = () => {
    if (!isRunning) return;
    isRunning = false;
    if (observer) observer.disconnect();
    observer = null;
    if (approacher !== null) approacher.disconnect();
    approacher = null;
    watched.clear();
    if (rescanTimer !== null) clearTimeout(rescanTimer);
    rescanTimer = null;
    document.removeEventListener('play', scheduleRescan, true);
    document.removeEventListener('pause', scheduleRescan, true);
    document.removeEventListener('loadedmetadata', scheduleRescan, true);
    window.removeEventListener('resize', scheduleRescan);
    window.removeEventListener('scroll', scheduleRescan, true);
    playable.clear();
    primary = null;
  };

  return {
    start,
    stop,
    getPrimary: () => primary,
    getCount: () => playable.size,
  };
};
