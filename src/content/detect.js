// One duty, one file: the election. What a film is, which film a page is
// built around, and the budgeted walk over the document that finds them
// — judged here. The page's story of itself — mutations, the tab seen
// again, a resize, a film drawing nearer, the network's knock — is heard
// through dom.js's manager; this file is only its listener, asked to
// sweep exactly when a move is said, and never wired to an observer of
// its own.
import { createDebug } from '../lib/debug.js';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

// The election's verdicts are the question nobody can ask after the fact:
// why is the badge not here? The sweep's answer, once per change of mind,
// says how many films the page had and what it made of them.
const debug = createDebug('detect');
// The player is a player for one film — the one a page is built around.
// Where a page keeps several films, two cheap readings say which one it
// belongs to: the film must own at least half of the screen's area on its
// own, and double what the runner-up owns. A page that is a gallery, a
// results grid or a row of hover-preview cards elects no film at all —
// the right answer, because nothing there is the main film, and the badge
// is quieter than a player opened on a preview. A page with exactly one
// playable film is its own answer: one film is the film the page is built
// around, at whatever share the site's own player chrome leaves it — a
// watch page's masthead, sidebar and the room below never stop the film
// from being the reason the page stands.
const MAIN_MIN_SHARE = 0.5;
const MAIN_DOMINANCE = 2;
const HAVE_METADATA = 1;

// The budget the find-sweep walks under, counted per element visited. Where
// querySelectorAll('*') materialised a whole tree before a budget could
// object, a TreeWalker hands out one element at a time — the walker's own
// enumeration is what stops the cost the moment the budget says so.
const MAX_WALK_ELEMENTS = 5000;

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
  // One reading answers every kind of invisible, the element's own and its
  // ancestors': display gone, visibility off, opacity zeroed. The computed
  // styles this replaces could only speak for the element itself — opacity
  // is not inherited, and a style read is not a walk up the tree — so a
  // container opacity-zeroed or a layout collapsed around a film used to
  // elect a badge over a thing nobody can see. The check shipped in
  // Firefox 106; the floor is 158.
  if (
    !video.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  ) {
    return false;
  }
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
// One playable film alone on the page is the page's film outright — the
// rival arithmetic is only ever a judge among several.
export const pickPrimary = (videos) => {
  const ranked = Array.from(videos)
    .map((video) => ({
      video,
      area: visibleArea(video.getBoundingClientRect()),
    }))
    .filter(({ area }) => area > 0)
    .sort((first, second) => second.area - first.area);

  // One playable film alone on the page is the page's film outright: the
  // rival arithmetic only speaks when there are rival voices to judge.
  if (ranked.length <= 1) return ranked[0]?.video ?? null;

  const best = ranked[0];
  const runner = ranked[1];
  if (best.area < runner.area * MAIN_DOMINANCE) return null;
  if (best.area < window.innerWidth * window.innerHeight * MAIN_MIN_SHARE) {
    return null;
  }
  return best.video;
};

export const createVideoWatcher = (onPrimaryChange, dom) => {
  const playable = new Set();
  let primary = null;
  let isRunning = false;
  let offBeat = null;

  // The sweep's walkers, left standing between rescans: where one pass
  // stopped, the next resumes — a tree the budget ran out under is covered
  // in pieces, not approached from the top again every time.
  const walkStack = [];

  const collectVideos = () => {
    const found = new Set();
    // One budgeted pass for the whole document, light and shadowed alike:
    // the old walk waited for an empty light DOM before it ran, so a page
    // that kept a teaser in the light and its real film inside a custom
    // element never met the film at all. A walker cannot cross the shadow
    // boundary itself; each root it meets joins the same pass by one cheap
    // name query for its own videos and one walker on it for the roots
    // nested inside.
    if (walkStack.length === 0) {
      walkStack.push(
        document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT),
      );
    }
    let budget = MAX_WALK_ELEMENTS;
    while (walkStack.length > 0) {
      const walker = walkStack[walkStack.length - 1];
      const node = walker.nextNode();
      if (node === null) {
        walkStack.pop();
        continue;
      }
      budget -= 1;
      if (node.localName === 'video') found.add(node);
      if (node.shadowRoot !== null) {
        for (const video of node.shadowRoot.querySelectorAll('video')) {
          found.add(video);
        }
        walkStack.push(
          document.createTreeWalker(node.shadowRoot, NodeFilter.SHOW_ELEMENT),
        );
      }
      if (budget <= 0) break;
    }
    // `spent` says the budget, not the tree, drew the line under this pass;
    // the walk standing in `walkStack` resumes on the next beat the
    // manager answers.
    return { found, spent: budget <= 0 };
  };

  // The sweep, a hoisted name so start can argue it below. The beat it
  // answers arrives already clean: the manager has sat it out while the
  // page was hidden, and this file keeps its one belt for the first
  // answer it gives itself on start.
  function sweep() {
    if (document.hidden) return;
    const { found, spent } = collectVideos();
    // A piece the budget stopped under asks for its continuation: the
    // next beat is the next piece, and the walk below answers it.
    if (spent) dom.ask();
    // The playable set is not cleared and rebuilt here, as it was when one
    // sweep covered the whole document: a pass covers a piece of it, and a
    // clear would drop films a later pass has not reached yet — the elected
    // film flickering out of existence between two sweeps. Everything found
    // is judged fresh; what no found film can still be is what has left the
    // page, and the page is honest about that by itself.
    for (const video of found) {
      if (isPlayable(video)) playable.add(video);
      else playable.delete(video);
      // Every film the sweep meets rides the approach watch: its
      // drawing nearer is a move the manager says, where a scroll that
      // goes nowhere near costs nothing. Asking twice is one watch.
      dom.keepNear(video);
    }
    for (const video of playable) {
      // A film the page let go of stops being a film by the same honesty
      // the walk reaches it: not found again, and not on the page to find.
      if (!video.isConnected) playable.delete(video);
    }
    const next = pickPrimary(playable);
    if (next === primary) return;
    primary = next;
    debug(
      primary === null
        ? 'the page holds no film of its own'
        : 'the film is settled',
      `${playable.size} playable in all`,
    );
    onPrimaryChange(primary, playable.size);
  }

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    // The one hearing: every move the manager says is a sweep. A film's
    // own moments — play, pause, metadata landing — are moves the
    // document's events know first, asked for on the manager's beat.
    offBeat = dom.onMove(sweep);
    document.addEventListener('play', dom.ask, true);
    document.addEventListener('pause', dom.ask, true);
    document.addEventListener('loadedmetadata', dom.ask, true);
    // The first answer is not waited out: the walk is made at once, so
    // a film already in the document is elected without a beat.
    sweep();
  };

  const stop = () => {
    if (!isRunning) return;
    isRunning = false;
    // The ear's leaving, if it was the frame's last, is the manager
    // standing its eyes down — at no hand's word here.
    if (offBeat !== null) offBeat();
    offBeat = null;
    document.removeEventListener('play', dom.ask, true);
    document.removeEventListener('pause', dom.ask, true);
    document.removeEventListener('loadedmetadata', dom.ask, true);
    walkStack.length = 0;
    playable.clear();
    primary = null;
  };

  return {
    start,
    stop,
    getPrimary: () => primary,
    getCount: () => playable.size,
    // The hub's knock, from the network side of the house: a film's bytes
    // are already crossing the tab. It is the same one answer every other
    // event the watcher knows asks for — a sweep, on the manager's beat
    // — and it only means anything while the watch is standing; a film
    // the site has switched off is not owed the walk.
    poke: () => {
      if (!isRunning) return;
      dom.ask();
    },
  };
};
