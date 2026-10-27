import { createShadowHost, el, pinStyle } from '../shell.js';
import { createSignal } from '../../lib/signals.js';
import badgeCss from './badge.css';

const SIZE_PX = 44;
const INSET_PX = 12;
const GAP_PX = 8;
const MIN_VISIBLE_RATIO = 0.35;
const ANCHOR_NAME = '--nocturne-film';

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
  // is covered while the player is closed. Only when the film runs to the
  // viewport's bottom rim is there no outside to be had, and the pill
  // falls back to its old seat inside the corner. Vertically the answer is
  // min(): the outside seat unless the viewport is out of screen below.
  // Horizontally it stays at the corner's own inset either way.
  const topSeat = (bottom) =>
    Math.min(bottom + GAP_PX, window.innerHeight - SIZE_PX - INSET_PX);

  // In the corner, down and to the right — its fallback, when a scroll
  // event or a viewport rim decides the pill has no outside to stand on.
  // Its tap is its own — a shadow-hosted button that stops propagation — so
  // the site's own controls that most skins paint into this corner stay
  // reachable around it. A film pinned by hand, one rect read per frame it
  // stands still.
  const placement = (rect) => {
    const left = rect.right - SIZE_PX - INSET_PX;
    return {
      left: `${Math.max(INSET_PX, left)}px`,
      top: `${topSeat(rect.bottom)}px`,
    };
  };

  // Whether the film is meaningfully on screen is the browser's question to
  // answer, in either mode: the observer fires when the film crosses the line
  // — by scroll, and by layout move a scroll listener never hears — so the
  // badge no longer rereads rects against its own viewport arithmetic. The
  // observe/notify work this way leaves the answer also true for a film that
  // moves without scrolling.
  const visibility = new IntersectionObserver(
    (entries) => {
      if (entries[entries.length - 1].intersectionRatio >= MIN_VISIBLE_RATIO) {
        reveal();
      } else {
        conceal();
      }
    },
    { threshold: MIN_VISIBLE_RATIO },
  );

  // The fallback's reposition, for a film a light-DOM anchor cannot name: a
  // video inside one of the site's own shadow roots is out of the badge's
  // anchor scope, so its geometry is carried by hand, as the badge always
  // carried it.
  const reposition = () => {
    frame = 0;
    if (!target?.isConnected) {
      conceal();
      return;
    }
    if (anchored === target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0) {
      conceal();
      return;
    }
    reveal();
    // The anchored badge's seat is the pill-below-the-corner rule too —
    // min() folds the viewport's bottom rim into it, so the pill falls
    // back inside the corner on the same arithmetic the fallback reads.
    pinStyle(shell.host, placement(rect));
  };

  const scheduleReposition = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(reposition);
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

  const show = (video) => {
    target = video;
    // Unshown until its position is known: a host pinned visible by default
    // would paint one frame at a stale or unset place otherwise.
    conceal();
    releaseAnchor();
    if (video.getRootNode() === document) {
      anchored = video;
      pinStyle(video, { 'anchor-name': ANCHOR_NAME });
      pinStyle(shell.host, {
        'position-anchor': ANCHOR_NAME,
        left: `calc(anchor(right) - ${SIZE_PX + INSET_PX}px)`,
        top: `min(calc(anchor(bottom) + ${GAP_PX}px), calc(100vh - ${
          SIZE_PX + INSET_PX
        }px))`,
      });
      // The anchor answers the scrolling page itself; a scroll listener would
      // only wake the fallback's redraw for no reason.
      setFallbackListener(false);
    } else {
      pinStyle(shell.host, { 'position-anchor': 'none' });
      setFallbackListener(true);
    }
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

  // The pill's tap is a moment said to whoever mounted the frame's wiring:
  // the badge knows only that a film under it was asked for; what opening
  // means is the frame's answer, registered here after the badge exists —
  // which is why the tap is a signal and not a field the wiring assigns.
  const activate = createSignal();

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (target) activate.emit(target);
  });

  return { show, hide, refresh: scheduleReposition, activate };
};
