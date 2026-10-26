import { hitTest, isDragZone, isHoldZone, ZONE } from './zones.js';
import { isVerticalMove, readSwipe } from './swipe.js';

// A hold can begin anywhere on the picture — the way a long-press means "run
// it fast" everywhere the surface is worth touching. The one exception is the
// seek band: a press there is the start of a scrub, and the two meanings
// cannot share a finger.
const canHold = (zone) => zone !== ZONE.SEEK;

const HOLD_DELAY_MS = 350;
// How long a first tap is followed by the possibility of a second, whether a
// run of side seeks begins there. Nothing waits on it: the tap already spoke,
// so the window only decides whether the next tap joins it as a run.
const MULTI_TAP_WINDOW_MS = 320;
// Once a side is seeking, a tap on it keeps seeking for a little longer than
// the double-tap window: tapping on to go further is a slower rhythm than the
// two taps that started it.
const SEEK_RUN_MS = 700;
const MOVE_TOLERANCE_PX = 12;

const MODE = {
  IDLE: 'idle',
  PENDING: 'pending',
  DRAG: 'drag',
  HOLD: 'hold',
  PINCH: 'pinch',
  SWIPE: 'swipe',
  ABANDONED: 'abandoned',
};

const distanceBetween = (first, second) => {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return Math.hypot(dx, dy);
};

// `canSwipe` is asked at the moment a finger starts to travel, not once up
// front: the phone may have been turned, or the feed moved on to a film of a
// different shape, since the player opened.
export const createRecognizer = (
  surface,
  handlers,
  { canSwipe = () => false } = {},
) => {
  const pointers = new Map();

  let mode = MODE.IDLE;
  let anchor = null;
  let holdTimer = null;
  let tapTimer = null;
  let tapCount = 0;
  let tapZone = ZONE.DEAD;
  let pinchStartDistance = 0;
  let isEnabled = true;

  const emit = (name, detail) => {
    const handler = handlers[name];
    if (handler) handler(detail);
  };

  const localPoint = (event) => {
    const rect = surface.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const clearHoldTimer = () => {
    if (holdTimer === null) return;
    clearTimeout(holdTimer);
    holdTimer = null;
  };

  const flushTaps = () => {
    tapTimer = null;
    // Everything a tap had to say was said where it happened; the window
    // was only ever about whether more taps were still on their way.
    tapCount = 0;
  };

  // Every tap speaks the moment the finger lifts: the controls come up under
  // it sooner than any window can allow, and a run of side seeks is paid per
  // tap rather than held to a rhythm the finger did not keep. The first tap
  // acts; every tap that follows while a side run lives joins it — with a
  // stray that lands on the neutral middle counted into the run it came
  // from, because a second tap rarely lands exactly where the first did. A
  // tap on the other side, or one that arrives once the run is done, starts
  // a run of its own; the neutral middle never formed runs, and still does
  // not.
  const registerTap = (zone, point) => {
    if (
      tapCount > 0 &&
      isHoldZone(tapZone) &&
      (zone === tapZone || zone === ZONE.DEAD)
    ) {
      tapCount += 1;
      emit('multiTap', {
        zone: tapZone,
        count: tapCount,
        x: point.x,
        y: point.y,
      });
      // Between taps of a live run the window is the run's own, a slower
      // rhythm than the double-tap that started it: tapping on to go further
      // is a habit, not a reflex.
      tapTimer = setTimeout(flushTaps, SEEK_RUN_MS);
      return;
    }
    // A fresh tap, whatever the last run left behind: the run's timer is
    // cancelled rather than waited out, so a tap that lands just past a run
    // is judged on its own merits.
    if (tapTimer !== null) clearTimeout(tapTimer);
    tapCount = 1;
    tapZone = zone;
    emit('tap', { zone });
    // The window after a first tap exists only to know whether a second is
    // coming; nothing is decided when it runs out.
    tapTimer = setTimeout(flushTaps, MULTI_TAP_WINDOW_MS);
  };

  const startPinch = () => {
    clearHoldTimer();
    if (mode === MODE.DRAG) emit('dragEnd', { zone: anchor.zone });
    if (mode === MODE.HOLD) emit('holdEnd', { zone: anchor.zone });
    const points = Array.from(pointers.values());
    pinchStartDistance = distanceBetween(points[0], points[1]);
    mode = MODE.PINCH;
    emit('pinchStart', {});
  };

  const handleDown = (event) => {
    if (!isEnabled) return;
    surface.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId, point);

    if (pointers.size === 2) {
      startPinch();
      return;
    }
    if (pointers.size > 2) return;

    anchor = {
      x: point.x,
      y: point.y,
      lastX: point.x,
      lastY: point.y,
      zone: hitTest(point.x, point.y, point.width, point.height),
    };
    mode = MODE.PENDING;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (mode !== MODE.PENDING || !canHold(anchor.zone)) return;
      mode = MODE.HOLD;
      emit('holdStart', { zone: anchor.zone });
    }, HOLD_DELAY_MS);
  };

  const handlePinchMove = () => {
    const points = Array.from(pointers.values());
    if (points.length < 2) return;
    const spread = distanceBetween(points[0], points[1]);
    if (pinchStartDistance === 0) return;
    emit('pinchMove', { scale: spread / pinchStartDistance });
  };

  const handleMove = (event) => {
    if (!pointers.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.set(event.pointerId, point);

    if (mode === MODE.PINCH) {
      handlePinchMove();
      return;
    }
    const isSettled =
      mode === MODE.ABANDONED || mode === MODE.HOLD || mode === MODE.SWIPE;
    if (isSettled) return;

    if (mode === MODE.PENDING) {
      const dx = point.x - anchor.x;
      const dy = point.y - anchor.y;
      if (Math.hypot(dx, dy) < MOVE_TOLERANCE_PX) return;
      clearHoldTimer();
      // Checked before the zones: a flick up is the same gesture wherever on
      // the picture it starts, the seek band and the side boxes included.
      if (isVerticalMove(dx, dy) && canSwipe()) {
        mode = MODE.SWIPE;
        return;
      }
      if (!isDragZone(anchor.zone)) {
        mode = MODE.ABANDONED;
        return;
      }
      mode = MODE.DRAG;
      emit('dragStart', { zone: anchor.zone, x: anchor.x, y: anchor.y });
    }

    if (mode !== MODE.DRAG) return;
    emit('dragMove', {
      zone: anchor.zone,
      dx: point.x - anchor.lastX,
      dy: point.y - anchor.lastY,
      x: point.x,
      y: point.y,
      width: point.width,
      height: point.height,
    });
    anchor.lastX = point.x;
    anchor.lastY = point.y;
  };

  const finishSwipe = (event) => {
    const point = localPoint(event);
    const direction = readSwipe(point.y - anchor.y, point.height);
    if (direction !== null) emit('swipe', { direction });
  };

  const handleUp = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    if (mode === MODE.PINCH) {
      if (pointers.size >= 2) return;
      emit('pinchEnd', {});
      mode = pointers.size === 0 ? MODE.IDLE : MODE.ABANDONED;
      return;
    }
    if (pointers.size > 0) return;

    clearHoldTimer();
    if (mode === MODE.DRAG) emit('dragEnd', { zone: anchor.zone });
    else if (mode === MODE.HOLD) emit('holdEnd', { zone: anchor.zone });
    else if (mode === MODE.SWIPE) finishSwipe(event);
    else if (mode === MODE.PENDING) registerTap(anchor.zone, anchor);
    mode = MODE.IDLE;
  };

  const handleCancel = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    clearHoldTimer();
    if (mode === MODE.DRAG) emit('dragEnd', { zone: anchor.zone });
    if (mode === MODE.HOLD) emit('holdEnd', { zone: anchor.zone });
    if (mode === MODE.PINCH && pointers.size < 2) emit('pinchEnd', {});
    if (pointers.size === 0) mode = MODE.IDLE;
  };

  // Without this, a long press raises the system context menu and Gecko
  // cancels the pointer, which used to drop hold-to-2x after a second or two.
  const blockContextMenu = (event) => event.preventDefault();

  surface.addEventListener('contextmenu', blockContextMenu);
  surface.addEventListener('pointerdown', handleDown);
  surface.addEventListener('pointermove', handleMove);
  surface.addEventListener('pointerup', handleUp);
  surface.addEventListener('pointercancel', handleCancel);

  return {
    setEnabled: (value) => {
      isEnabled = value;
    },
    destroy: () => {
      clearHoldTimer();
      if (tapTimer !== null) clearTimeout(tapTimer);
      surface.removeEventListener('contextmenu', blockContextMenu);
      surface.removeEventListener('pointerdown', handleDown);
      surface.removeEventListener('pointermove', handleMove);
      surface.removeEventListener('pointerup', handleUp);
      surface.removeEventListener('pointercancel', handleCancel);
    },
  };
};
