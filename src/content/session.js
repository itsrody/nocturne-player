import { createOverlay } from './ui.js';
import { createShadowHost, el, pinStyle } from './shell.js';
import { createSignal } from '../lib/signals.js';
import { findApiAncestor } from './video/pageapi.js';
import { createMediaBridge } from './video/mediasession.js';
import { lockPageFullscreen } from './fullscreenlock.js';
import { createGuardBudget } from './ground.js';
import { readSeatBox, seatStyle } from './seating.js';
import playerCss from './player.css';

// The names a site's own player hangs off the element wrapping the video.
const PLAYER_API_MARKERS = [
  'getAvailableQualityLevels',
  'setPlaybackQualityRange',
  'getOption',
  'levels',
];

const STALL_GRACE_MS = 400;
// Long enough for a site to finish re-attaching its stream. A scrub past the
// buffer makes YouTube tear its stream down and build it again, which on a slow
// connection takes seconds — and the player used to back out from under the
// finger that was scrubbing. A few seconds of black is a far smaller price than
// being thrown out of the film.
const EMPTIED_GRACE_MS = 6000;
const NETWORK_EMPTY = 0;
const RECOVER_DELAY_MS = 250;
// Below this share of the screen, a player that has lost fullscreen is playing
// in the box the site gave it — an embedded player's frame — rather than over
// the whole page, where it would still want its full set of controls.
const COMPACT_SCREEN_SHARE = 0.6;
// Turning the phone can cost the stage its fullscreen — the browser re-laying
// the screen out, or a site that reached it before the lock did. Losing it
// this close to a turn is not the user backing out.
const TURN_GRACE_MS = 1500;

const STAGE_STYLE = {
  position: 'fixed',
  inset: '0',
  width: '100vw',
  height: '100vh',
  margin: '0',
  padding: '0',
  border: '0',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  overflow: 'hidden',
  background: '#000',
  'z-index': '2147483646',
};

// Everything the player shows — the picture and everything drawn over it —
// lives in this wrapper rather than directly on the stage. The stage is the
// fullscreen element, and the browser composites that one itself: a transform
// applied to it is not reliably shown, while a transform applied to an
// ordinary child of it always is. The pull-to-dismiss asks for the whole
// player to move, so the frame exists to be the one element that carries the
// motion. Its centring is the stage's own flex layout carried over, so the
// picture sits precisely where it sat when the stage held it directly.
const FRAME_STYLE = {
  position: 'absolute',
  inset: '0',
  margin: '0',
  padding: '0',
  border: '0',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  overflow: 'hidden',
};

// A site's own player keeps rewriting the video's inline style — YouTube sets
// a pixel width, height and offset on every layout pass — which is what used to
// leave the picture stuck against the left edge or stretched across the screen
// after coming back from another app. Position and offsets are pinned here too,
// not only the size, and re-pinned whenever the site writes over them.
const VIDEO_STYLE = {
  position: 'relative',
  left: '0',
  top: '0',
  right: 'auto',
  bottom: 'auto',
  float: 'none',
  width: '100%',
  height: '100%',
  'max-width': 'none',
  'max-height': 'none',
  'min-width': '0',
  'min-height': '0',
  margin: '0',
  padding: '0',
  border: '0',
  display: 'block',
  'object-fit': 'contain',
  'object-position': '50% 50%',
  background: '#000',
  'transform-origin': 'center center',
};

// The crop and the colour are written by the visuals rather than pinned from
// the table above, but they are watched all the same: a site that rewrites the
// video's style wipes them, and the guard has to notice that it did.
const VIDEO_STYLE_KEYS = Object.keys(VIDEO_STYLE).concat([
  'transform',
  'filter',
]);

const captureVideoState = (video) => ({
  cssText: video.style.cssText,
  hasControlsAttribute: video.hasAttribute('controls'),
  playbackRate: video.playbackRate,
  volume: video.volume,
  isMuted: video.muted,
  parent: video.parentNode,
  nextSibling: video.nextSibling,
});

const restoreVideoState = (video, state) => {
  video.style.cssText = state.cssText;
  if (state.hasControlsAttribute) video.setAttribute('controls', '');
  else video.removeAttribute('controls');
  video.playbackRate = state.playbackRate;
  video.volume = state.volume;
  video.muted = state.isMuted;
};

const auditRestore = (video, state) => {
  const isSameParent = video.parentNode === state.parent;
  const isSameSibling = video.nextSibling === state.nextSibling;
  if (isSameParent && isSameSibling) return true;
  console.warn('Nocturne: video was not restored to its original position', {
    isSameParent,
    isSameSibling,
  });
  return false;
};

// The style is compared against what the browser serialised, never against
// what we asked for: setting `left: 0` reads back as `0px`, so comparing with
// the input would find a difference every time and re-pin on the strength of
// its own mutation record — a loop that recalculates style until the phone
// crawls.
const readStyle = (video) => {
  const seen = {};
  for (const name of VIDEO_STYLE_KEYS) {
    seen[name] = video.style.getPropertyValue(name);
  }
  return seen;
};

const isSameStyle = (first, second) => {
  if (first === null) return false;
  return VIDEO_STYLE_KEYS.every((name) => first[name] === second[name]);
};

// navigationUI is deliberately left at its default. Asking Gecko to hide it put
// Android into sticky immersive mode, where the first swipe up only brings the
// system bars back and a second one is needed to leave the app.
const requestFullscreen = async (element) => {
  if (!document.fullscreenEnabled) return false;
  try {
    await element.requestFullscreen();
    return true;
  } catch (error) {
    console.warn('Nocturne: fullscreen refused', error);
    return false;
  }
};

// Losing fullscreen is how the user leaves the player, and it is also how
// Android announces that it is taking the video into a floating window. The two
// look identical at the moment they happen and only differ a beat later, when
// an app that has gone into the background is no longer the focused one.
const isBackgrounded = () => document.hidden || !document.hasFocus();

const readOrientation = () => {
  const type = window.screen.orientation?.type;
  if (type) return type.split('-')[0];
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
};

const isSmallerThanScreen = () => {
  const screenArea = window.screen.width * window.screen.height;
  if (screenArea === 0) return false;
  const viewArea = window.innerWidth * window.innerHeight;
  return viewArea < screenArea * COMPACT_SCREEN_SHARE;
};

// Everything a part of the player hooks into the page is undone together. The
// stage keeps one scope for as long as the player is open; each video it shows
// gets a scope of its own, which goes with it.
const createScope = () => {
  const undos = [];
  const timers = new Set();

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    undos.push(() => target.removeEventListener(type, handler, options));
  };

  // For the lifetimes that are not event listeners — an observer, a pointer
  // lock, anything the page handed out that needs a standing way back.
  const undo = (drop) => {
    undos.push(drop);
  };

  const later = (handler, delay) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      handler();
    }, delay);
    timers.add(timer);
    return timer;
  };

  const cancel = (timer) => {
    clearTimeout(timer);
    timers.delete(timer);
  };

  const dispose = () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const undo of undos) undo();
    undos.length = 0;
  };

  return { listen, undo, later, cancel, dispose };
};

// Gecko keeps a media element playing across a re-parent, but a site shim
// that reloads it leaves us holding an empty player. A quality switch empties
// the element too, so the verdict waits until the dust settles.
const watchForTeardown = (video, scope, onTornDown) => {
  let pending = null;

  // Any sign of life cancels the verdict. An element that is loading again is
  // an element the site is still using, whatever its readyState says at the
  // moment we happen to look.
  const revive = () => {
    if (pending === null) return;
    scope.cancel(pending);
    pending = null;
  };

  const LIFE_SIGNS = [
    'loadstart',
    'loadedmetadata',
    'progress',
    'seeked',
    'canplay',
    'playing',
  ];

  for (const name of LIFE_SIGNS) {
    scope.listen(video, name, revive);
  }

  scope.listen(video, 'emptied', () => {
    revive();
    pending = scope.later(() => {
      pending = null;
      const hasSource = video.currentSrc !== '' || video.srcObject !== null;
      // networkState is the honest one: NETWORK_EMPTY means the element has
      // no source at all, where a seek in progress reads as loading.
      const isEmpty = video.networkState === NETWORK_EMPTY;
      if (hasSource || video.readyState > 0 || !isEmpty) return;
      console.warn('Nocturne: the video was torn down, backing out');
      onTornDown();
    }, EMPTIED_GRACE_MS);
  });
};

// The screen is left to follow the phone. Locking it to landscape turned an
// upright TikTok or Reels video on its side the moment the player opened, and
// a film shot wide is one turn of the wrist away, which Android offers even
// with auto-rotate switched off.
export const createSession = (
  firstVideo,
  { onExit, settings, onPersist, presentation = 'stage' },
) => {
  const stage = document.createElement('div');
  // The wrapper the pull-to-dismiss moves, and everything the player shows
  // lives in (see FRAME_STYLE).
  const frame = document.createElement('div');
  const ui = createShadowHost(playerCss);
  const scope = createScope();

  const layers = {
    warm: el('div', { class: 'layer warm' }),
  };
  let isActive = false;
  // Seated inline, the stage stands in the page's own flow at the film's
  // old address, rather than over the viewport. Fullscreen asks, and the
  // leaving-fullscreen exits, read this differently — set at the open,
  // before anything listens for them.
  let seated = false;
  let shown = null;
  let lastVideo = firstVideo;
  let relayoutFrame = 0;
  let unlockPageFullscreen = () => {};
  let lastTurnAt = -Infinity;
  let heldOrientation = readOrientation();

  const readScreen = () => {
    const isFullscreen = document.fullscreenElement === stage;
    return {
      isFullscreen,
      isCompact: !isFullscreen && isSmallerThanScreen(),
    };
  };

  const isTurning = () =>
    performance.now() - lastTurnAt < TURN_GRACE_MS ||
    readOrientation() !== heldOrientation;

  const relayout = () => {
    relayoutFrame = 0;
    if (shown) shown.relayout();
  };

  const scheduleRelayout = () => {
    if (relayoutFrame !== 0) return;
    relayoutFrame = requestAnimationFrame(relayout);
  };

  // The session's own commands, said as signals: a teardown noticed mid-open,
  // the bridge's stop and the sheet's own buttons all ask for the way out
  // before `exit` exists to answer, and the fullscreen ask rides the same
  // shape. Whoever later owns the command registers for it — the moment said
  // before a listener stands is lost the same way the no-op stub heard
  // everything.
  const actions = { exit: createSignal(), fullscreen: createSignal() };

  // Takes one video out of the page, puts it on the stage with the controls
  // over it, and returns what is needed to hand it back exactly as it was.
  const show = (video, { shouldPlay, isChromeShown }) => {
    const state = captureVideoState(video);
    const playerHost = findApiAncestor(video, PLAYER_API_MARKERS);
    const anchor = document.createComment('nocturne-player');
    const own = createScope();

    let styleGuard = null;
    let pinnedStyle = null;
    let overlay = null;

    // The video's pin guarded: repairs against a budget, and a site that
    // keeps fighting wins the field once the budget is gone — only a write
    // that actually changed the watched style counts, because our own crop
    // writes reach this observer too, and a long pinch used to spend a
    // frame of it per movement without the site doing a thing.
    const budget = createGuardBudget(() => {
      if (styleGuard) styleGuard.disconnect();
      styleGuard = null;
      console.warn('Nocturne: the site keeps rewriting the video, leaving it');
    });
    const pin = () => {
      const before = readStyle(video);
      if (isSameStyle(pinnedStyle, before)) return;

      pinStyle(video, VIDEO_STYLE);
      if (overlay) overlay.repin();
      const after = readStyle(video);

      const foreign = !isSameStyle(before, after);
      if (foreign && !budget()) return;
      pinnedStyle = after;
    };

    video.replaceWith(anchor);
    video.removeAttribute('controls');
    pin();

    // The site is free to keep laying its player out; it just does not get to
    // move the picture we are showing.
    styleGuard = new MutationObserver(pin);
    styleGuard.observe(video, {
      attributes: true,
      attributeFilter: ['style', 'width', 'height'],
    });

    // The anchor is the film's address in the page, and the style guard above
    // says nothing about whether the place still exists. A site clearing that
    // spot — its own player rebuilt, a page using itself up — used to leave
    // the release coming back to nothing and deleting the film outright. The
    // parent's child list is cheap to watch (the anchor is a direct child, so
    // nothing deeper can concern us), and the anchor is put back where the
    // capture says it lived. Only the comment moves; the picture stays on the
    // stage. Bounded, in case the site wants the spot empty more than once.
    let anchorGuard = null;
    const anchorBudget = createGuardBudget(() => {
      if (anchorGuard) anchorGuard.disconnect();
      anchorGuard = null;
      console.warn('Nocturne: the anchor keeps losing its place');
    });
    anchorGuard = new MutationObserver(() => {
      if (anchor.isConnected) return;
      // A page that has left the film behind entirely has no house to put it
      // back to; playback goes on until the viewer leaves for good.
      if (state.parent === null || !state.parent.isConnected) return;
      if (!anchorBudget()) return;
      if (
        state.nextSibling !== null &&
        state.nextSibling.parentNode === state.parent
      ) {
        state.parent.insertBefore(anchor, state.nextSibling);
      } else {
        state.parent.append(anchor);
      }
      // The house it is put back into may be a different one each time.
      anchorGuard.disconnect();
      if (anchor.parentNode !== null) {
        anchorGuard.observe(anchor.parentNode, { childList: true });
      }
    });
    if (anchor.parentNode !== null) {
      anchorGuard.observe(anchor.parentNode, { childList: true });
    }

    frame.prepend(video);
    watchForTeardown(video, own, () => actions.exit.emit());

    // The metadata event can outrun the picture: an MSE stream is allowed
    // to revise its dimensions after the metadata says them, and the site
    // can recycle the element for its own next film. One more fit, timed
    // to the first frame that is actually presented, is the only moment
    // the crop and the picture agree on what is showing — a frame the
    // timeline reports at all only when one is playing; a paused film has
    // its picture fitted as before, straight away.
    own.listen(video, 'loadedmetadata', () => {
      scheduleRelayout();
      if (
        video.paused ||
        typeof video.requestVideoFrameCallback !== 'function'
      ) {
        return;
      }
      video.requestVideoFrameCallback(scheduleRelayout);
    });
    own.listen(video, 'resize', scheduleRelayout);

    const mediaBridge = createMediaBridge(video, {
      onExit: () => actions.exit.emit(),
    });

    overlay = createOverlay({
      video,
      stage,
      frame,
      shadow: ui.shadow,
      layers,
      onExit: () => actions.exit.emit(),
      settings,
      onPersist,
      playerHost,
      onFullscreen: () => actions.fullscreen.emit(),
      isChromeShown,
    });
    overlay.setScreen(readScreen());

    own.later(() => {
      if (shouldPlay && video.paused) video.play().catch(() => {});
    }, STALL_GRACE_MS);

    const release = () => {
      own.dispose();
      mediaBridge.release();
      if (styleGuard) styleGuard.disconnect();
      styleGuard = null;
      anchorGuard.disconnect();
      overlay.destroy();
      restoreVideoState(video, state);
      if (anchor.isConnected) anchor.replaceWith(video);
      else video.remove();
      auditRestore(video, state);
    };

    lastVideo = video;
    return {
      video,
      release,
      notify: (text) => overlay.notify(text),
      showControls: () => overlay.showControls(),
      relayout: () => {
        pin();
        overlay.setScreen(readScreen());
        overlay.relayout();
      },
    };
  };

  const exit = () => {
    if (!isActive) return;
    isActive = false;

    if (relayoutFrame !== 0) cancelAnimationFrame(relayoutFrame);
    relayoutFrame = 0;
    scope.dispose();
    unlockPageFullscreen();

    if (document.fullscreenElement === stage) {
      document.exitFullscreen().catch(() => {});
    }

    if (shown) shown.release();
    shown = null;
    stage.remove();
    onExit(lastVideo);
  };

  actions.exit.on(exit);
  // The player's fullscreen button. From the stage over the viewport it is
  // a re-take; seated inline it is the one-act escalation out of the seat —
  // a fullscreen ask covers the stage element itself, wherever the stage
  // stands, so no second road is needed for the seat.
  actions.fullscreen.on(() => {
    requestFullscreen(stage).then(scheduleRelayout);
  });

  const openStage = (seat) => {
    stage.dataset.nocturnePlayer = '';
    // The two manners share one body: over the viewport the stage is the
    // fixed black face it has always been; at the seat it wears the film's
    // measured box and lives in the page's own flow (`seatStyle` for the
    // craft of that spelling). The frame, the host and the layers are set
    // up alike either way.
    pinStyle(stage, seat === null ? STAGE_STYLE : seatStyle(seat));
    pinStyle(frame, FRAME_STYLE);
    stage.append(frame);
    frame.append(ui.host);
    ui.shadow.append(layers.warm);
    if (seat === null) {
      document.body.append(stage);
      return;
    }
    // The stage takes the film's place one act before `show()` moves the
    // film: planted in front of the video, it holds the address while
    // `show()`'s own `replaceWith` lands the anchor comment right behind it
    // — so the restore address, and the guard that keeps the anchor alive,
    // work word for word as they do on the stage over the viewport.
    firstVideo.before(stage);
  };

  const restoreFullscreen = () => {
    if (document.fullscreenElement === stage) return;
    // Gecko may refuse this without a fresh gesture. The stage covers the
    // viewport on its own, so the player stays usable either way.
    requestFullscreen(stage).then(scheduleRelayout);
  };

  const watchForReturn = () => {
    const noteTurn = () => {
      lastTurnAt = performance.now();
      scheduleRelayout();
    };

    // A turn keeps the player open, out of fullscreen, with its controls up:
    // the fullscreen button is then one tap away. Gecko will not hand the
    // screen back without a tap, so the player cannot take it back itself.
    scope.listen(document, 'fullscreenchange', () => {
      scheduleRelayout();
      if (document.fullscreenElement === stage) {
        heldOrientation = readOrientation();
        return;
      }
      // Seated inline, fullscreen was an escalation the viewer made from
      // the seat, and walking out of it is the way back down — not the way
      // out. The player stays seated and brings its controls up, where the
      // exit remains its own question.
      if (seated) {
        if (shown) shown.showControls();
        return;
      }
      scope.later(() => {
        if (!isActive) return;
        if (isBackgrounded()) return;
        if (isTurning()) {
          heldOrientation = readOrientation();
          if (shown) shown.showControls();
          return;
        }
        exit();
      }, RECOVER_DELAY_MS);
    });

    // Coming back from a floating window or from another app: the stage
    // over the viewport re-takes the screen, and both manners re-fit the
    // picture to whatever shape it is now. A seat has no screen to take —
    // it lost nothing by going to the background.
    scope.listen(document, 'visibilitychange', () => {
      if (document.hidden) return;
      scope.later(() => {
        if (!isActive) return;
        if (!seated) restoreFullscreen();
        scheduleRelayout();
      }, RECOVER_DELAY_MS);
    });

    scope.listen(window, 'resize', scheduleRelayout);
    scope.listen(window, 'orientationchange', noteTurn);

    // The stage can change size without the window changing: the site's own
    // layout around it — a collapsing header, a sticky bar appearing, a side
    // column closing — owes us no event, and the crop would go on answering
    // a stage that has shipped. An observer on the stage itself is the
    // precise net, and it cannot chase its own tail: the crop is a
    // transform, which changes no layout for the observer to re-see.
    const stageWatcher = new ResizeObserver(() => scheduleRelayout());
    stageWatcher.observe(stage);
    scope.undo(() => stageWatcher.disconnect());
    if (window.screen.orientation) {
      scope.listen(window.screen.orientation, 'change', noteTurn);
    }
  };

  const enter = async () => {
    if (isActive) return false;
    isActive = true;

    // The seat is read while the film still occupies the box the page gave
    // it — after the move there is no box left to read. A film that asks
    // for the seat but has none (no parent, or a box too small to sit in)
    // is met by the stage over the viewport instead, which is the one
    // manner those films can actually be watched in.
    const wantsSeat = presentation === 'inline';
    const seat = wantsSeat ? readSeatBox(firstVideo) : null;
    seated = wantsSeat && seat !== null && seat.fittable;

    unlockPageFullscreen = lockPageFullscreen();
    openStage(seated ? { width: seat.width, height: seat.height } : null);
    // The picture first: a film that is playing opens with nothing drawn over
    // it, and a tap brings the controls up. One that is paused shows them, or
    // the screen would be a still frame with no hint of what to do next.
    shown = show(firstVideo, {
      shouldPlay: !firstVideo.paused,
      isChromeShown: firstVideo.paused,
    });
    watchForReturn();

    // Over the viewport, the button that opens the player is drawn as a
    // fullscreen icon, so it takes the screen every time. Seated inline the
    // open asks for no screen at all: the film plays where the page had it,
    // and the screen is one act away — the player's own fullscreen button,
    // whose ask covers the stage wherever the stage happens to stand.
    if (!seated) await requestFullscreen(stage);
    scheduleRelayout();
    return true;
  };

  return {
    enter,
    exit,
    stage,
    shadow: ui.shadow,
    layers,
    isActive: () => isActive,
    // The manner the open settled on: asked-for and given, or fallen back
    // to over the viewport. The caller reads it to know which rooms are
    // owed — a seat widens nothing, a stage pulls the widening machine.
    presentation: () => (seated ? 'inline' : 'stage'),
  };
};
