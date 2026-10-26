// While the player holds the film, the system still knows about the playing
// media: the Android notification controls, and the media keys on a desktop
// keyboard, act on the element underneath — with the site's own idea of what
// the film is called and none of the player's rules. The bridge hands the
// system the picture the player is running: its name, and handlers that speak
// the same direction — play and pause mean play and pause, the seek buttons
// step the film the way the side boxes do, and stop closes the player, which
// no other control does.
//
// A released bridge clears every handler it set: the film goes back into the
// page first, and control of it goes with that, so a notification pressed
// after the player has closed cannot drive a film the page has taken back.
const SKIP_SECONDS = 10;

export const createMediaBridge = (video, { onExit }) => {
  const session = navigator.mediaSession;
  // The bridge has nothing to say where the platform has no session; a no-op
  // keeps the caller's code the same shape everywhere.
  if (session === undefined) {
    return { release: () => {} };
  }

  const element = video.wrappedJSObject ?? video;

  const sync = () => {
    session.playbackState = element.paused ? 'paused' : 'playing';
  };
  element.addEventListener('play', sync);
  element.addEventListener('pause', sync);

  const seekTo = (time) => {
    // A stream with an unknown length has no wall to clamp against; the seek
    // sets out for wherever it is asked.
    const limit = Number.isNaN(element.duration) ? Infinity : element.duration;
    element.currentTime = Math.min(Math.max(0, time), limit);
  };

  const skipOf = (detail) => (detail && detail.seekOffset) ?? SKIP_SECONDS;

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
    // all.
    seekto: (detail) => seekTo(detail.seekTime),
  };

  for (const [action, handler] of Object.entries(handlers)) {
    session.setActionHandler(action, handler);
  }

  // What the film is called, and the picture beside it: the page's own title
  // is the closest thing to a name the film has — it already says which
  // episode or which stream is up — and the site's own icon is the artwork.
  // Nothing is worked out or fetched: both come from what the page itself
  // declares, and any reading of the icon is the browser's, not ours.
  const title = element.title || document.title || '';
  const artworkLink = document.querySelector(
    'link[rel~="apple-touch-icon"], link[rel~="icon"]',
  );
  if (title !== '' || artworkLink !== null) {
    session.metadata = new MediaMetadata({
      title,
      artwork: artworkLink === null ? undefined : [{ src: artworkLink.href }],
    });
  }

  sync();

  return {
    release: () => {
      element.removeEventListener('play', sync);
      element.removeEventListener('pause', sync);
      for (const action of Object.keys(handlers)) {
        session.setActionHandler(action, null);
      }
    },
  };
};
