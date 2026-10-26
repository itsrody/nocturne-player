import { readSiteChapters } from './video/chapters.js';
import { createColorPanel } from './controls/colorpanel.js';
import { createMenu } from './controls/menu.js';
import { createPlaylistPanel } from './controls/playlistpanel.js';
import { createAudioTracks } from './video/audiotracks.js';
import { createPlaylist } from './video/playlist.js';
import { createQuality } from './video/quality.js';
import { createRecognizer } from './gestures/recognizer.js';
import { createSeekBar } from './controls/seekbar.js';
import { createSeeker } from './video/seek.js';
import { createSkipFeedback } from './controls/skipfeedback.js';
import { createIntroSkip } from './controls/introskip.js';
import { createIntroWatch } from './video/introwatch.js';
import { createTrackManager } from './video/tracks.js';
import { createVisuals } from './video/visuals.js';
import { el } from './shell.js';
import { isFeedShaped } from './gestures/swipe.js';
import { ZONE } from './gestures/zones.js';

// Controls that show themselves are timed from the moment they show: three
// seconds of nothing happening on them, and they step aside again. The
// countdown is rewound — not restarted from scratch — by a pointer moving
// over an already-shown chrome, so hover holds it and silence still hides it.
const CHROME_IDLE_MS = 3000;
// Hold speed is a setting, chosen from the sheet's chips (1.5x–4x). A held
// picture runs at that rate for as long as the finger stays down, wherever
// the hold began; the pace before the hold comes back when it lifts.
const TOAST_MS = 900;
const HINT_MS = 2200;
// The same distance both ways, as on every other phone player: five seconds
// back was too short to be worth a tap, and the button is not one people
// expect to count differently from its twin.
const SKIP_SECONDS = 10;
const SIDE_SKIP_SECONDS = {
  [ZONE.HOLD_LEFT]: -SKIP_SECONDS,
  [ZONE.HOLD_RIGHT]: SKIP_SECONDS,
};
const PLAYLIST_SETTLE_MS = 600;
const CHAPTER_TRIES_MS = [1200, 4000, 10000];
// A pull on the picture is judged like a sheet being put away: far enough
// down the screen, or flung fast enough, and it leaves; short of both, it
// comes back. The slide itself is timed to be felt, not watched.
const DISMISS_MS = 260;
const DISMISS_COMMIT_TRAVEL = 0.3;
const DISMISS_COMMIT_SPEED = 1.2;

// A gear with eight teeth, worked out rather than pasted: drawn by hand the
// path runs to six hundred characters that nobody can check by eye.
const GEAR = { teeth: 8, outer: 9.6, root: 7.4, tip: 9, base: 14, hub: 3 };

const gearPoint = (radius, degrees) => {
  const angle = ((degrees - 90) * Math.PI) / 180;
  const x = 12 + radius * Math.cos(angle);
  const y = 12 + radius * Math.sin(angle);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
};

const buildGearPath = () => {
  const { teeth, outer, root, tip, base, hub } = GEAR;
  const parts = [];
  for (let index = 0; index < teeth; index++) {
    const centre = (index * 360) / teeth;
    const start = gearPoint(root, centre - base);
    parts.push(index === 0 ? `M${start}` : `A${root} ${root} 0 0 1 ${start}`);
    parts.push(`L${gearPoint(outer, centre - tip)}`);
    parts.push(`A${outer} ${outer} 0 0 1 ${gearPoint(outer, centre + tip)}`);
    parts.push(`L${gearPoint(root, centre + base)}`);
  }
  parts.push(`A${root} ${root} 0 0 1 ${gearPoint(root, -base)}Z`);
  parts.push(`M${12 + hub} 12a${hub} ${hub} 0 1 1-${hub * 2} 0`);
  parts.push(` ${hub} ${hub} 0 1 1 ${hub * 2} 0z`);
  return parts.join('');
};

const ICON = {
  exit: 'M6 6l12 12M18 6L6 18',
  chevron: 'M7 10l5 5 5-5',
  palette:
    'M12 3c-5 0-9 3.7-9 8.4 0 4.9 4 8.6 8.7 8.6 1.4 0 2.1-.9 2.1-1.9 ' +
    '0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1 .8-1.8 1.8-1.8H16 ' +
    'c2.8 0 5-2.2 5-5C21 6.5 17 3 12 3z',
  settings: buildGearPath(),
  play: 'M8 5 19 12 8 19z',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  pause: 'M6 5h3.6v14H6zM14.4 5h3.6v14h-3.6z',
};

const buildIcon = (path) =>
  el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    el('path', { d: path }),
  ]);

const buildButton = (label, icon, onClick, className = 'button') => {
  const attributes = { class: className, type: 'button', title: label };
  const graphic = typeof icon === 'string' ? buildIcon(icon) : icon;
  const button = el('button', attributes, [graphic]);
  button.addEventListener('click', onClick);
  return button;
};

// Paint on a palette, each blob its own colour: a lone outline read as a
// blank shape, and colour is what the panel behind it is about.
const PAINTS = [
  { x: 7.4, y: 11.6, colour: '#ff6b6b' },
  { x: 9.4, y: 7.3, colour: '#ffd166' },
  { x: 14.2, y: 6.9, colour: '#6ee7a8' },
  { x: 17.4, y: 10.4, colour: '#6cb8ff' },
];

const buildPaletteIcon = () =>
  el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    el('path', { d: ICON.palette }),
    ...PAINTS.map(({ x, y, colour }) =>
      el('circle', {
        cx: String(x),
        cy: String(y),
        r: '1.5',
        fill: colour,
        stroke: 'none',
      }),
    ),
  ]);

// A ring with an arrowhead and the number inside, the way phone players draw
// their skip controls.
const buildSkipIcon = (seconds) => {
  const isForward = seconds > 0;
  const arc = isForward
    ? 'M12 4.5A7.5 7.5 0 1 0 19.5 12'
    : 'M12 4.5A7.5 7.5 0 1 1 4.5 12';
  const head = isForward
    ? 'M12 1.4 12 7.6 15.6 4.5z'
    : 'M12 1.4 12 7.6 8.4 4.5z';

  return el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    el('path', { d: arc }),
    el('path', { d: head, fill: 'currentColor', stroke: 'none' }),
    el('text', {
      x: '12',
      y: '15.6',
      'text-anchor': 'middle',
      'font-size': '8.5',
      'font-weight': '600',
      fill: 'currentColor',
      stroke: 'none',
      text: String(Math.abs(seconds)),
    }),
  ]);
};

export const createOverlay = ({
  video,
  stage,
  frame,
  shadow,
  layers,
  onExit,
  settings,
  onPersist,
  playerHost,
  onFeedStep,
  onFullscreen,
  isChromeShown = true,
}) => {
  const surface = el('div', { class: 'layer surface' });
  const scrim = el('div', { class: 'layer scrim' });
  const toast = el('div', { class: 'toast' });
  const topbar = el('div', { class: 'topbar' });
  const chrome = el('div', { class: 'chrome' });
  const cueBox = el('div', { class: 'cue' });
  const filePicker = el('input', {
    type: 'file',
    class: 'file-picker',
    accept: '.srt,.vtt,text/vtt',
  });

  // Late-bound: buttons, the recognizer and the track manager all need to refer
  // to things created after them.
  const buttons = {
    exit: null,
    colour: null,
    menu: null,
    playlist: null,
    play: null,
    fullscreen: null,
  };
  const menuRef = { setSubtitle: () => {} };
  const playlistRef = {
    refresh: () => {},
    isOpen: () => false,
    close: () => {},
  };

  // Playback speed is deliberately not restored: it belongs to the film you
  // were watching, not to the next one.
  video.playbackRate = 1;

  const visuals = createVisuals(video, stage);
  const quality = createQuality(video, playerHost);
  const audio = createAudioTracks(video, playerHost);
  const playlist = createPlaylist(video, playerHost);
  const tracks = createTrackManager(
    video,
    (text) => {
      cueBox.textContent = text;
      cueBox.classList.toggle('is-visible', text !== '');
    },
    (id) => menuRef.setSubtitle(id),
    playerHost,
  );

  const seek = createSeeker(video, playerHost);
  // While the head ball on the bar is being dragged, the chrome must hold
  // on: an idle fade mid-scrub walks the target out from under the finger.
  // The hook is a hoisted name here and is only given its washer below,
  // because a grab — when the hook runs — lands long after this whole
  // stretch of the file has been declared.
  let isHeadScrubbing = false;
  let onScrubChrome = null;
  function onHeadScrub(isOn) {
    isHeadScrubbing = isOn;
    // Shown at both ends: at the grab the idle timer may be near expiry,
    // and at the release the frozen timer has skipped its hiding, so being
    // shown is how the chrome gets its fade schedule back.
    onScrubChrome?.();
  }

  const seekBar = createSeekBar(video, seek, { onScrub: onHeadScrub });
  const skipFeedback = createSkipFeedback();
  const introSkip = createIntroSkip(video, seek);
  const introWatch = createIntroWatch(video, {
    onFound: (span) => {
      introSkip.show(span);
      seekBar.setZones(span === null ? [] : [span]);
    },
  });

  let chromeTimer = null;
  let toastTimer = null;
  let pinchBase = 1;
  let skipTarget = null;
  let releaseHold = null;
  // Read from the snapshot the overlay opened with and written by the sheet's
  // chip: a film in progress takes the new pace at once, and persistence
  // keeps it for the next one.
  let holdSpeed = settings.holdSpeed;
  // While a hold is on, it owns the element's rate. Some site engines rewrite
  // playbackRate back to 1x the moment they see it move, which used to leave
  // the toast promising a speed the film never ran at.
  let holdRate = 0;

  // A duration of null keeps the toast up until hideToast takes it down: the
  // 2x label stays for as long as the finger does.
  const showToast = (text, duration = TOAST_MS) => {
    toast.textContent = text;
    toast.classList.add('is-visible');
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = null;
    if (duration === null) return;
    toastTimer = setTimeout(() => {
      toastTimer = null;
      toast.classList.remove('is-visible');
    }, duration);
  };

  const hideToast = () => {
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = null;
    toast.classList.remove('is-visible');
  };

  const applyWarmth = (value) => {
    layers.warm.style.opacity = String(value);
  };

  const colorPanel = createColorPanel((key, value) => {
    if (key === 'warmth') applyWarmth(value);
    else visuals.setColour({ [key]: value });
    onPersist({ [key]: value });
  });

  const menu = createMenu({
    video,
    tracks,
    quality,
    audio,
    onPickFile: () => filePicker.click(),
    onRate: () => {},
    holdSpeed,
    onHoldSpeed: (value) => {
      holdSpeed = value;
      onPersist({ holdSpeed: value });
    },
    onNotice: (text) => showToast(text, HINT_MS),
    isIntroSkipOn: settings.isIntroSkipOn,
    onIntroSkip: (isOn) => {
      onPersist({ isIntroSkipOn: isOn });
      introWatch.setEnabled(isOn);
      if (isOn) return;
      introSkip.show(null);
      seekBar.setZones([]);
    },
  });

  menuRef.setSubtitle = menu.setSubtitle;

  const isPanelOpen = () =>
    colorPanel.isOpen() || menu.isOpen() || playlistRef.isOpen();

  // The chrome must never fade out from under an open panel: the panel lives
  // inside it, and hiding it mid-adjustment looked like the player had frozen.
  // The idle timer that puts an undisturbed picture away, in its own name:
  // showing must never and rewinding must be able to reach it alone. The
  // flag read here alongside it is the head ball's: see onHeadScrub above,
  // which indeed runs before this atom does.
  const scheduleFade = () => {
    chromeTimer = setTimeout(() => {
      chromeTimer = null;
      if (isPanelOpen() || isHeadScrubbing) return;
      chrome.toggleAttribute('hidden', true);
    }, CHROME_IDLE_MS);
  };

  const setChromeVisible = (isVisible) => {
    // Read again on the way in: an episode that finished and rolled on to the
    // next one has left the bar naming the one before it.
    if (isVisible) playlistRef.refresh();
    chrome.toggleAttribute('hidden', !isVisible);
    if (chromeTimer !== null) clearTimeout(chromeTimer);
    chromeTimer = null;
    if (!isVisible || video.paused || isPanelOpen()) return;
    scheduleFade();
  };

  // A mouse gliding over the picture keeps the controls up — but it may not
  // pay a tap's price for it. Showing again runs the playlist's page walk,
  // and the pointer moves hundreds of times a second. So a wake shows only
  // what is actually hidden; everything else it does is to rewind the idle
  // timer, so chrome the mouse rests on never fades out from under it, and
  // one left alone fades on the schedule as ever. Touch fingers do not wake
  // it: tapping the picture is how a hand brings the controls back, and the
  // drift of a palm brushing the film must not summon them.
  const wakeChrome = (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (chromeTimer !== null) clearTimeout(chromeTimer);
    if (chrome.hasAttribute('hidden')) setChromeVisible(true);
    else if (!video.paused && !isPanelOpen()) scheduleFade();
  };
  surface.addEventListener('pointermove', wakeChrome);
  chrome.addEventListener('pointermove', wakeChrome);

  // What the ball's grab reaches, given to the hook above now that it has a
  // name: showing again rewinds the idle timer, and the freeze flag the hook
  // sets is what keeps the timer from hiding anything while the ball is held.
  onScrubChrome = setChromeVisible;

  const closePanels = () => {
    playlistRef.close();
    colorPanel.close();
    menu.close();
    buttons.playlist?.setAttribute('aria-pressed', 'false');
    buttons.colour?.setAttribute('aria-pressed', 'false');
    buttons.menu?.setAttribute('aria-pressed', 'false');
    setChromeVisible(true);
  };

  const playlistPanel = createPlaylistPanel({
    onSelect: (level, option, isEpisode) => {
      // A season is half an answer: the sheet stays up until the episode in
      // it has been picked.
      if (isEpisode) {
        playlistPanel.close();
        buttons.playlist.setAttribute('aria-pressed', 'false');
      }
      playlist.select(level, option);
      // The player rewrites its own path as it switches, so the sheet is read
      // again rather than guessing what the press will have done — once now,
      // on the way back into the controls, and once more after the step it
      // had to fetch has landed.
      setChromeVisible(true);
      setTimeout(() => playlistRef.refresh(), PLAYLIST_SETTLE_MS);
    },
  });

  playlistRef.isOpen = playlistPanel.isOpen;
  playlistRef.close = playlistPanel.close;

  const togglePlay = () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    setChromeVisible(true);
  };

  // A tap that lands while the last seek is still in flight counts from where
  // that seek is going, not from the frame still on screen, so every tap in a
  // run is worth its full step.
  const skip = (seconds) => {
    const from =
      video.seeking && skipTarget !== null ? skipTarget : video.currentTime;
    skipTarget = seek(from + seconds);
  };

  // Writing the default rate along with it is deliberate: the rate falls back
  // to the default when the element loads a new resource, which is exactly
  // what a stream the site feeds itself through MSE does mid-hold.
  const assertHoldRate = () => {
    if (holdRate === 0 || video.playbackRate === holdRate) return;
    video.defaultPlaybackRate = holdRate;
    video.playbackRate = holdRate;
    // Reading straight after the write is the element answering. A backend
    // that cannot run at the ask clamps silently, and writing into its own
    // answer would trade events with itself forever — so the hold steps
    // aside and the film runs at whatever the hardware can manage.
    if (video.playbackRate !== holdRate) holdRate = 0;
  };
  video.addEventListener('ratechange', assertHoldRate);

  // Exactly what the hold-speed chip in the sheet does, for as long as the
  // finger is down, and the speed that was set before comes back when it
  // lifts. The film is woken from a pause and put back to sleep the same
  // way, on the hold's own account.
  const holdForward = () => {
    const previousRate = video.playbackRate;
    const previousDefault = video.defaultPlaybackRate;
    const wasPaused = video.paused;
    holdRate = holdSpeed;
    assertHoldRate();
    if (wasPaused) video.play().catch(() => {});
    return () => {
      holdRate = 0;
      video.defaultPlaybackRate = previousDefault;
      video.playbackRate = previousRate;
      if (wasPaused) video.pause();
    };
  };

  const stopHold = () => {
    if (releaseHold === null) return;
    const release = releaseHold;
    releaseHold = null;
    release();
    hideToast();
  };

  // The player is put away the way a sheet is: it follows the finger down
  // the screen while the pull lasts — never riding back above where the
  // pull began, but down past the edge as freely as the finger goes. The
  // pull does not wait for the finger to lift: the moment it has gone far
  // enough down, the player is out. A lift that was flung hard counts as
  // the same intent even at short travel; a slow short one is let go, and
  // comes home in one spring.
  //
  // The transform lives on the frame, the wrapper that holds the picture
  // and everything drawn over it, and not on the stage: the stage is the
  // fullscreen element, and the browser draws that on its own — a transform
  // asked of it is not reliably shown, where a transform asked of an
  // ordinary child of it always is. It also keeps clear of the video's own
  // inline style, which the style guard watches for the site: the picture
  // rides because its house is moved, not because anything touched the
  // picture's style. The frame dies with the session, so an unmade bed
  // cannot meet the next one.
  let dismissSettleTimer = null;

  const clearDismissStage = () => {
    frame.style.transition = '';
    frame.style.transform = '';
  };

  const dismissMove = ({ progress }) => {
    // No ceremony at the line: crossing it is the whole gesture. The player
    // is already where the finger has dragged it, so it goes out there and
    // then, with no fall of its own to watch afterwards.
    if (progress >= DISMISS_COMMIT_TRAVEL) {
      if (dismissSettleTimer !== null) {
        clearTimeout(dismissSettleTimer);
        dismissSettleTimer = null;
      }
      onExit();
      return;
    }
    frame.style.transition = '';
    frame.style.transform = `translateY(${Math.max(0, progress) * 100}%)`;
  };

  const dismissEnd = ({ velocity }) => {
    // A flung lift says the same thing at short travel: a flick toward the
    // bottom edge has spoken loudly enough.
    if (velocity >= DISMISS_COMMIT_SPEED) {
      onExit();
      return;
    }
    frame.style.transition = `transform ${DISMISS_MS}ms ease-out`;
    frame.style.transform = 'translateY(0%)';
    if (dismissSettleTimer !== null) clearTimeout(dismissSettleTimer);
    dismissSettleTimer = setTimeout(() => {
      dismissSettleTimer = null;
      clearDismissStage();
    }, DISMISS_MS);
  };

  const canSwipe = () =>
    !isPanelOpen() &&
    isFeedShaped(
      window.innerWidth,
      window.innerHeight,
      video.videoWidth,
      video.videoHeight,
    );

  const recognizer = createRecognizer(
    surface,
    {
      tap: ({ zone, clientX }) => {
        if (isPanelOpen()) {
          closePanels();
          return;
        }
        // A tap on the bar itself jumps to the moment under the finger —
        // but only when the bar is actually out to meet it: with the chrome
        // hidden there is no bar to aim at, so the tap is the ordinary one
        // that summons the controls.
        if (zone === ZONE.SEEK && !chrome.hasAttribute('hidden')) {
          setChromeVisible(true);
          seekBar.jumpToTap({ clientX });
          return;
        }
        setChromeVisible(chrome.hasAttribute('hidden'));
      },
      multiTap: ({ zone, x, y }) => {
        if (isPanelOpen()) {
          closePanels();
          return;
        }
        const seconds = SIDE_SKIP_SECONDS[zone];
        if (seconds === undefined) {
          setChromeVisible(chrome.hasAttribute('hidden'));
          return;
        }
        skip(seconds);
        skipFeedback.show(seconds, x, y);
      },
      holdStart: () => {
        if (isPanelOpen()) return;
        stopHold();
        releaseHold = holdForward();
        showToast(`${holdSpeed}x ▶▶`, null);
      },
      holdEnd: () => stopHold(),
      dragStart: ({ x, y }) => {
        setChromeVisible(true);
        seekBar.start({ x, y });
      },
      dragMove: (detail) => seekBar.move(detail),
      dragEnd: () => seekBar.end(),
      dismissStart: () => {
        // A drag takes the whole player, sheets and all, off the screen;
        // one already open is settled first, so nothing is twitching under
        // the moving picture.
        if (isPanelOpen()) closePanels();
      },
      dismissMove,
      dismissEnd,
      pinchStart: () => {
        pinchBase = visuals.beginPinch();
      },
      pinchMove: ({ scale }) => visuals.pinchTo(pinchBase * scale),
      pinchEnd: () => visuals.endPinch(),
      swipe: ({ direction }) => onFeedStep(direction),
    },
    { canSwipe },
  );

  buttons.play = buildButton(
    'Play or pause',
    video.paused ? ICON.play : ICON.pause,
    togglePlay,
    'play-button',
  );
  const playPath = buttons.play.querySelector('path');

  const buildSkipButton = (seconds) => {
    const attributes = {
      class: 'skip-button',
      type: 'button',
      title: `${seconds > 0 ? 'Forward' : 'Back'} ${Math.abs(seconds)} seconds`,
    };
    const button = el('button', attributes, [buildSkipIcon(seconds)]);
    button.addEventListener('click', () => {
      skip(seconds);
      setChromeVisible(true);
    });
    return button;
  };

  // The transport sits in the seek strip now — backward, play, forward to
  // the bar's left, in one row with it — where a thumb reaches all three
  // without leaving the bottom edge it already works. The middle of the
  // picture belongs to the gestures alone.
  seekBar.setControls([
    buildSkipButton(-SKIP_SECONDS),
    buttons.play,
    buildSkipButton(SKIP_SECONDS),
  ]);

  buttons.colour = buildButton(
    'Colour',
    buildPaletteIcon(),
    () => {
      menu.close();
      playlistPanel.close();
      buttons.menu.setAttribute('aria-pressed', 'false');
      buttons.playlist.setAttribute('aria-pressed', 'false');
      colorPanel.toggle();
      buttons.colour.setAttribute('aria-pressed', String(colorPanel.isOpen()));
      setChromeVisible(true);
    },
    'button anchor-colour',
  );

  buttons.menu = buildButton(
    'Settings',
    ICON.settings,
    () => {
      colorPanel.close();
      playlistPanel.close();
      buttons.colour.setAttribute('aria-pressed', 'false');
      buttons.playlist.setAttribute('aria-pressed', 'false');
      menu.toggle();
      buttons.menu.setAttribute('aria-pressed', String(menu.isOpen()));
      setChromeVisible(true);
    },
    'button anchor-menu',
  );

  // The playlist sits where a thumb reaches it while the phone is held
  // sideways — beside the way out, not buried in the settings sheet, which is
  // no place to be changing episode from. The button names where in the series
  // the film is; the sheet it opens is where another episode is picked.
  const playlistLabel = el('span', { class: 'playlist-current' });
  buttons.playlist = el(
    'button',
    {
      class: 'playlist-button anchor-playlist',
      type: 'button',
      title: 'Episodes',
    },
    [playlistLabel, buildIcon(ICON.chevron)],
  );
  buttons.playlist.addEventListener('click', () => {
    colorPanel.close();
    menu.close();
    buttons.colour.setAttribute('aria-pressed', 'false');
    buttons.menu.setAttribute('aria-pressed', 'false');
    playlistPanel.toggle();
    const isOpen = playlistPanel.isOpen();
    buttons.playlist.setAttribute('aria-pressed', String(isOpen));
    setChromeVisible(true);
  });

  // A series only admits to having a playlist once its player has drawn one, so
  // the button appears when there is something to choose from and stays away
  // when the page is a film.
  playlistRef.refresh = () => {
    playlist.refresh();
    const levels = playlist.getLevels();
    const path = levels.map((level) => level.current);
    playlistLabel.textContent = path.join(' · ');
    buttons.playlist.classList.toggle('is-empty', levels.length === 0);
    playlistPanel.setLevels(levels);
    if (levels.length === 0) {
      buttons.playlist.setAttribute('aria-pressed', 'false');
    }
  };
  playlistRef.refresh();

  buttons.exit = buildButton('Exit player', ICON.exit, () => onExit());
  buttons.fullscreen = buildButton('Fullscreen', ICON.fullscreen, () => {
    onFullscreen();
    setChromeVisible(false);
  });

  const fullOnly = [
    buttons.exit,
    buttons.playlist,
    buttons.colour,
    buttons.menu,
  ];
  for (const node of fullOnly) node.classList.add('is-full-only');
  buttons.fullscreen.classList.add('is-windowed-only');

  topbar.append(
    buttons.exit,
    buttons.playlist,
    el('div', { class: 'spacer' }),
    buttons.colour,
    buttons.menu,
    buttons.fullscreen,
  );

  // Whenever the player is out of fullscreen it offers the way back to it.
  // Playing in the box the site gave it — an embedded player's frame — it is
  // too small for the sheets as well, so they and the way out step aside.
  const setScreen = ({ isFullscreen, isCompact }) => {
    chrome.toggleAttribute('data-windowed', !isFullscreen);
    if (chrome.hasAttribute('data-compact') === isCompact) return;
    chrome.toggleAttribute('data-compact', isCompact);
    if (isCompact && isPanelOpen()) closePanels();
  };

  chrome.append(
    scrim,
    topbar,
    colorPanel.root,
    menu.root,
    playlistPanel.root,
    seekBar.root,
  );

  // Reading a file the user picked themselves, straight into the cue list.
  // Nothing leaves the device and nothing is parsed as markup.
  const loadSubtitleFile = async () => {
    const file = filePicker.files?.[0];
    if (!file) return;
    const text = await file.text();
    filePicker.value = '';
    const id = tracks.addCues(file.name.replace(/\.(srt|vtt)$/i, ''), text);
    if (id === null) {
      showToast('No subtitles in that file', HINT_MS);
      return;
    }
    tracks.select(id);
    menu.refresh();
    showToast('Subtitles loaded', HINT_MS);
  };

  filePicker.addEventListener('change', () => {
    loadSubtitleFile().catch((error) => {
      console.error('Nocturne: could not read the subtitle file', error);
      showToast('Could not read that file', HINT_MS);
    });
  });

  // Only the path data changes, so swapping play for pause cannot make the
  // button flicker or shift. A pause brings the controls up, since the next
  // thing wanted is usually one of them; a start only restarts their idle
  // timer if they are already up. A feed starts every video it moves on to,
  // and that is no reason to cover the picture.
  // A hold wakes and re-pauses the film on its own account, and that is no
  // reason to bring the controls up over the picture it is running through.
  const handlePlaybackChange = () => {
    playPath.setAttribute('d', video.paused ? ICON.play : ICON.pause);
    if (releaseHold !== null) return;
    const isChromeHidden = chrome.hasAttribute('hidden');
    if (video.paused || !isChromeHidden) setChromeVisible(true);
  };
  video.addEventListener('pause', handlePlaybackChange);
  video.addEventListener('play', handlePlaybackChange);

  const restoreSettings = () => {
    visuals.setColour({
      brightness: settings.brightness,
      contrast: settings.contrast,
      saturate: settings.saturate,
    });
    for (const key of ['brightness', 'contrast', 'saturate', 'warmth']) {
      colorPanel.setValue(key, settings[key]);
    }
    applyWarmth(settings.warmth);
  };

  // Walking the site's page data is not free, so it happens after the picture
  // is up rather than in the way of it — and more than once, because a page
  // that was navigated to fills its data in some time after the video starts.
  const chapterTimers = CHAPTER_TRIES_MS.map((delay) =>
    setTimeout(() => {
      const chapters = readSiteChapters(playerHost);
      if (chapters.length > 0) seekBar.setChapters(chapters);
    }, delay),
  );

  restoreSettings();
  // Kept as a list so the overlay can take itself off the screen again: the
  // shadow root outlives it when a feed moves on to its next video.
  const roots = [
    surface,
    ...skipFeedback.roots,
    cueBox,
    chrome,
    introSkip.root,
    toast,
    filePicker,
  ];
  shadow.append(...roots);
  introWatch.setEnabled(settings.isIntroSkipOn);
  setChromeVisible(isChromeShown);

  return {
    relayout: () => visuals.relayout(),
    repin: () => visuals.repin(),
    notify: (text) => showToast(text, HINT_MS),
    setScreen,
    showControls: () => setChromeVisible(true),
    destroy: () => {
      for (const node of roots) node.remove();
      recognizer.destroy();
      seekBar.destroy();
      skipFeedback.destroy();
      introWatch.destroy();
      introSkip.destroy();
      tracks.destroy();
      stopHold();
      if (dismissSettleTimer !== null) clearTimeout(dismissSettleTimer);
      if (chromeTimer !== null) clearTimeout(chromeTimer);
      if (toastTimer !== null) clearTimeout(toastTimer);
      for (const timer of chapterTimers) clearTimeout(timer);
      surface.removeEventListener('pointermove', wakeChrome);
      chrome.removeEventListener('pointermove', wakeChrome);
      video.removeEventListener('pause', handlePlaybackChange);
      video.removeEventListener('play', handlePlaybackChange);
      video.removeEventListener('ratechange', assertHoldRate);
    },
  };
};
