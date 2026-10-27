// While the player holds the film, the system still knows about the playing
// media: the Android notification controls, and the media keys on a desktop
// keyboard, act on the element underneath — with the site's own idea of what
// the film is called and none of the player's rules. The bridge hands the
// system the picture the player is running: its name, its place on the
// timeline, and handlers that speak the same direction — play and pause mean
// play and pause, the seek buttons step the film the way the side boxes do,
// and stop closes the player, which no other control does.
//
// A released bridge clears every handler it set and pays the system's own
// picture back: the metadata the page itself had declared resumes, a
// timeline the bridge pushed is dropped, and the playback state says what
// the element says now. The film goes back into the page first, and control
// and name go with that, so a notification pressed after the player has
// closed cannot drive a film the page has taken back — and cannot describe
// it as the player's film besides.
const SKIP_SECONDS = 10;

export const createMediaBridge = (video, { onExit }) => {
  const session = navigator.mediaSession;
  // The bridge has nothing to say where the platform has no session; a no-op
  // keeps the caller's code the same shape everywhere.
  if (session === undefined) {
    return { release: () => {} };
  }

  const element = video.wrappedJSObject ?? video;

  // A stream whose length the element has not given — NaN — or one that
  // runs live — Infinity — has no wall to clamp against; the seek sets out
  // for wherever it is asked.
  const clampToLength = (time) => {
    const wall = Number.isFinite(element.duration)
      ? element.duration
      : Infinity;
    return Math.min(Math.max(0, Number.isNaN(time) === true ? 0 : time), wall);
  };

  const sync = () => {
    session.playbackState = element.paused ? 'paused' : 'playing';
  };
  element.addEventListener('play', sync);
  element.addEventListener('pause', sync);

  // The offset rides the detail when one arrives, and falls back to the
  // specification's own ten seconds otherwise. An offset of 0 counts as no
  // offset at all — the Android plumbing has been caught emitting 0 on its
  // own errors — not as 'seek nowhere'.
  const skipOf = (detail) => (detail && detail.seekOffset) || SKIP_SECONDS;

  const seekTo = (time) => {
    element.currentTime = clampToLength(time);
  };

  const handlers = {
    play: () => {
      element.play().catch(() => {});
    },
    pause: () => element.pause(),
    stop: () => onExit(),
    seekforward: (detail) => seekTo(element.currentTime + skipOf(detail)),
    seekbackward: (detail) => seekTo(element.currentTime - skipOf(detail)),
    // The specification asks the seek to be written the moment the handler
    // sees the call: the element reads it as a normal seek, scrubbing and
    // all. A fast seek is the system's shout for 'a hand is dragging it':
    // keyframe-near beats frame-exact there, and fastSeek is how the
    // element speaks that (shipped in Firefox 31; the floor is 158).
    seekto: (detail) => {
      const time = clampToLength(detail.seekTime);
      if (detail.fastSeek === true && typeof element.fastSeek === 'function') {
        element.fastSeek(time);
      } else {
        element.currentTime = time;
      }
    },
  };

  for (const [action, handler] of Object.entries(handlers)) {
    session.setActionHandler(action, handler);
  }

  // The timeline the system shows is drawn from the position state and
  // interpolated between writes — one write per frame would be noise — so
  // the writes ride the moments the film's own rules change: a seek they
  // caused, a rate held or let go (the player's hold-speed moves the rate
  // under the site's feet), a length the stream revises, play and pause.
  // A paused film is pushed at rate zero: the state we push describes a
  // timeline that advances only while the film plays. A stream still
  // live has no wall to hang the timeline on — duration Infinity is one
  // the platform refuses outright — so nothing is pushed there, and the
  // system goes on guessing from the element, as it does for a page that
  // pushes nothing at all.
  const POSITION_EVENTS = [
    'play',
    'pause',
    'seeked',
    'ratechange',
    'durationchange',
    'loadedmetadata',
  ];

  const pushPosition = () => {
    const { currentTime, duration } = element;
    if (!Number.isFinite(duration) || !Number.isFinite(currentTime)) {
      session.setPositionState();
      return;
    }
    try {
      session.setPositionState({
        duration,
        playbackRate: element.paused ? 0 : element.playbackRate,
        position: currentTime,
      });
    } catch {
      // A picture the platform will not take keeps its guess; the film is
      // none the worse for it.
    }
  };

  for (const type of POSITION_EVENTS) {
    element.addEventListener(type, pushPosition);
  }

  // What the film is called, and the picture beside it. The page's own
  // declared metadata comes first — a site that means its film to be read
  // from the system names it there, with real thumbnails — and when it
  // does, the bridge keeps its silence: the page speaks for itself. Where
  // the page says nothing, the page's furniture answers: the title it
  // displays, the icon it declares — read only as the browser reads it —
  // with the icon's size and type carried, so the system picks an image
  // of the right size instead of scaling the smallest one blind. Whatever
  // stood in the session before the bridge spoke is stashed and paid
  // back at release.
  const pageMetadata = session.metadata ?? null;

  if (pageMetadata === null) {
    const title = element.title || document.title || '';
    const icon = document.querySelector(
      'link[rel~="apple-touch-icon"], link[rel~="icon"]',
    );
    if (title !== '' || icon !== null) {
      session.metadata = new MediaMetadata({
        title,
        artwork:
          icon === null
            ? undefined
            : [
                {
                  src: icon.href,
                  sizes: icon.getAttribute('sizes') ?? '',
                  type: icon.getAttribute('type') ?? '',
                },
              ],
      });
    }
  }

  sync();
  pushPosition();

  return {
    release: () => {
      element.removeEventListener('play', sync);
      element.removeEventListener('pause', sync);
      for (const type of POSITION_EVENTS) {
        element.removeEventListener(type, pushPosition);
      }
      for (const action of Object.keys(handlers)) {
        session.setActionHandler(action, null);
      }
      // The system's picture of the film is paid back one write at a
      // time: the page's own metadata resumes — or absence resumes — the
      // timeline is dropped, and the state says what the element says
      // now, not what the last event before the film left said.
      session.metadata = pageMetadata;
      session.setPositionState();
      sync();
    },
  };
};
