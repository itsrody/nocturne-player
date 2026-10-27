import { createShadowHost, el, pinStyle } from '../shell.js';
import badgeCss from './badge.css';

const SIZE_PX = 44;
const INSET_PX = 12;
const GAP_PX = 8;
const MIN_VISIBLE_RATIO = 0.35;
const ANCHOR_NAME = '--nocturne-film';
// The walk looking for what actually bounds the visible room below the film
// reads at most six ancestors, and reads style before geometry.
const WALK_DEPTH = 6;
const OVERFLOW_CLIPS = new Set(['hidden', 'clip', 'auto', 'scroll']);

// Fullscreen arrows rather than a logo: what the button does is make this
// video fill the screen, and that is what a viewer is looking for. It stays
// up for as long as the video is in view: on a phone there is no hover, and a
// button that waited for a tap to appear was one most people never saw.
const buildButton = () =>
  el('button', { class: 'badge', type: 'button', title: 'Fullscreen' }, [
    el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
      el('path', { d: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' }),
    ]),
  ]);

export const createBadge = () => {
  const shell = createShadowHost(badgeCss, {
    width: `${SIZE_PX}px`,
    height: `${SIZE_PX}px`,
    'pointer-events': 'auto',
  });

  const button = buildButton();
  shell.shadow.append(button);

  let target = null;
  let frame = 0;
  let isMounted = false;
  let listensForScroll = false;

  const conceal = () => {
    pinStyle(shell.host, { opacity: '0', 'pointer-events': 'none' });
  };

  const reveal = () => {
    pinStyle(shell.host, { opacity: '1', 'pointer-events': 'auto' });
  };

  // The badge stays glued to the film the way the sheets stay glued to their
  // buttons: the video carries the anchor's name, and the host reads its
  // place from it. CSS answers every layout change for free — scroll, a
  // sidebar setting, a sticky header — where the pin used to walk after each
  // of them with a scroll listener and a redraw per frame. The name lives
  // inline on an element the extension already takes into its own frame, and
  // it is a claim on one element: anchor() that matched two videos would be
  // ambiguous, and an ambiguous anchor is dropped, so a switch always strips
  // the name from the previous holder before the next takes it.
  let anchored = null;

  const releaseAnchor = () => {
    if (anchored === null) return;
    // 'none' rather than a removal: the property went in inline and
    // important, and 'none' reads as never-named everywhere the name could
    // matter, so the video is left on the page exactly as the badge found it.
    pinStyle(anchored, { 'anchor-name': 'none' });
    anchored = null;
  };

  // Below the film's bottom-right corner, not over it: the pill hangs
  // outside the picture — a line's gap under the corner — so no film pixel
  // is covered while the player is closed. Which rim bounds the room is
  // read, not assumed: every ancestor that clips its children ends where
  // its children end, and the pill's seat yields to the tightest of those
  // rims — the viewport being one more of them, its own being the
  // outermost box rather than a special case. A drifted seat that reads no
  // nearer rim than the viewport is the anchor's to keep; a seat inside a
  // tighter clip is the hand's.
  const clipRim = (video) => {
    let rim = null;
    let node = video.parentElement;
    for (let depth = 0; node && depth < WALK_DEPTH; depth += 1) {
      const style = window.getComputedStyle(node);
      if (OVERFLOW_CLIPS.has(style.overflowY)) {
        rim = Math.min(rim ?? Infinity, node.getBoundingClientRect().bottom);
      }
      node = node.parentElement;
    }
    return rim;
  };

  // The seat's arithmetic, one shape for every rim: the lower edge of the
  // room the rim admits, a breath over it — pill bottom at rim's edge with
  // the corner inset's worth of dignity kept in.
  const topSeat = (bottom, rim) =>
    Math.min(bottom + GAP_PX, rim - SIZE_PX - INSET_PX);

  // In the corner, down and to the right — its tap is its own — a
  // shadow-hosted button that stops propagation — so the site's own
  // controls that most skins paint into this corner stay reachable around
  // it. A film pinned by hand, one rect read per frame it stands still.
  const placement = (rect, rim) => {
    const left = rect.right - SIZE_PX - INSET_PX;
    return {
      left: `${Math.max(INSET_PX, left)}px`,
      top: `${topSeat(rect.bottom, rim ?? window.innerHeight)}px`,
    };
  };

  // The runner. Its judge does not exist yet — the walk that decides the
  // seat needs every helper above it — so the slot is filled once the
  // judge is born, a little lower in the file: the cycle of listener
  // asking runner asking judge asking listener is cut with a slot rather
  // than with hoisting.
  let judge = null;

  const scheduleReposition = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(judge);
  };

  const setFallbackListener = (isNeeded) => {
    if (isNeeded === listensForScroll) return;
    listensForScroll = isNeeded;
    if (isNeeded) {
      window.addEventListener('scroll', scheduleReposition, true);
      window.addEventListener('resize', scheduleReposition);
    } else {
      window.removeEventListener('scroll', scheduleReposition, true);
      window.removeEventListener('resize', scheduleReposition);
    }
  };

  // The anchor's own outfit: the film carries the name, the host reads its
  // place with min() holding the viewport's rim, and the hand's listeners
  // are stood down — CSS answers every scroll and layout move itself.
  const seatByAnchor = (video) => {
    releaseAnchor();
    pinStyle(video, { 'anchor-name': ANCHOR_NAME });
    anchored = video;
    pinStyle(shell.host, {
      'position-anchor': ANCHOR_NAME,
      left: `calc(anchor(right) - ${SIZE_PX + INSET_PX}px)`,
      top: `min(calc(anchor(bottom) + ${GAP_PX}px), calc(100vh - ${
        SIZE_PX + INSET_PX
      }px))`,
    });
    setFallbackListener(false);
  };

  // Fold the anchor back before another seat takes it: the name goes to
  // 'none' rather than away, so the video is left on the page exactly as
  // the badge found it.
  const packAnchor = () => {
    releaseAnchor();
    pinStyle(shell.host, { 'position-anchor': 'none' });
  };

  // The seat's one judge. The walk names the visible rim below the film;
  // when it is tighter than the viewport's own, the pill is seated by hand
  // — anchored inside a tighter clip, it would read a transitioning seat
  // the CSS never hears about. When the walk names nothing nearer than the
  // viewport, the anchor keeps the seat — its CSS answering every scroll
  // and layout move on its own, no walk per frame. A film inside a shadow
  // root is the hand's regardless: the name would be out of the anchor's
  // reach, so no anchor to hold.
  const reposition = () => {
    frame = 0;
    if (!target?.isConnected) {
      conceal();
      return;
    }
    const rim = clipRim(target);
    const clipTightens = rim !== null && rim < window.innerHeight;
    if (clipTightens || target.getRootNode() !== document) {
      packAnchor();
      setFallbackListener(true);
      const rect = target.getBoundingClientRect();
      if (rect.width === 0) {
        conceal();
        return;
      }
      reveal();
      pinStyle(shell.host, placement(rect, rim));
      return;
    }
    // The walk named nothing nearer than the viewport, and the film is one
    // the anchor can reach: the anchor owns the seat. Already its own,
    // nothing to write — pins are idempotent, but a walk per scroll tick
    // need not restate them.
    if (anchored === target) return;
    seatByAnchor(target);
  };

  judge = reposition;

  // Whether the film is meaningfully on screen is the browser's question to
  // answer, in either mode: the observer fires when the film crosses the
  // line — by scroll, and by layout move a scroll listener never hears — so
  // the badge no longer rereads rects against its own viewport arithmetic.
  // The observe/notify work this way leaves the answer also true for a film
  // that moves without scrolling. A crossing is also the one occasion the
  // anchor-driven seat gets to re-ask which rim bounds the room: the walk
  // runs, and the seat drifts between anchor and hand only if the rims say
  // so.
  const visibility = new IntersectionObserver(
    (entries) => {
      const visibleNow =
        entries[entries.length - 1].intersectionRatio >= MIN_VISIBLE_RATIO;
      if (visibleNow) reveal();
      else conceal();
      if (anchored !== null) scheduleReposition();
    },
    { threshold: MIN_VISIBLE_RATIO },
  );

  const show = (video) => {
    target = video;
    // Unshown until its position is known: a host pinned visible by default
    // would paint one frame at a stale or unset place otherwise. The anchor
    // is folded flat as the seat's starting state; the judge below — the
    // scheduled reposition — deals anchor and hand from the walk's verdict.
    conceal();
    packAnchor();
    setFallbackListener(false);
    if (!isMounted) {
      document.body.append(shell.host);
      isMounted = true;
    } else {
      visibility.disconnect();
    }
    scheduleReposition();
    visibility.observe(video);
  };

  const hide = () => {
    setFallbackListener(false);
    releaseAnchor();
    target = null;
    if (!isMounted) return;
    visibility.disconnect();
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    shell.host.remove();
    isMounted = false;
  };

  const api = { show, hide, refresh: scheduleReposition, onActivate: null };

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (target && api.onActivate) api.onActivate(target);
  });

  return api;
};
