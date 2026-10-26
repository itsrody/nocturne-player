import {
  isHostEnabled,
  onSettingsChanged,
  readSettings,
  writeSettings,
} from '../lib/settings.js';
import { createBadge } from './controls/badge.js';
import { createVideoWatcher } from './detect.js';
import {
  createClaimant,
  createJudge,
  isTopFrame,
  mintTicket,
} from './frames.js';
import { createSession } from './session.js';

const PERSIST_DELAY_MS = 400;

// A player embedded in an iframe should honour the decision the user made about
// the page they can actually see, so the embedding host counts too.
const resolveHosts = () => {
  const hosts = [location.host];
  if (window.top === window) return hosts;

  try {
    hosts.push(window.top.location.host);
  } catch {
    if (document.referrer !== '') {
      try {
        hosts.push(new URL(document.referrer).host);
      } catch (error) {
        console.error('Nocturne: unreadable referrer', error);
      }
    }
  }
  return hosts;
};

const isDocumentSupported = () =>
  document.contentType === 'text/html' &&
  location.protocol !== 'about:' &&
  location.protocol !== 'moz-extension:';

const start = async () => {
  if (!isDocumentSupported()) return;

  const hosts = resolveHosts();
  let session = null;
  // One settings object stays put for the whole lifetime of this frame, and
  // every change is merged into it. The session and the overlays it opens
  // hold this same reference, so a value set on the film in hand is already
  // in place when the feed moves on to the next video — rebinding, as a
  // fresh object did, left the session carrying the value it opened with.
  const current = await readSettings();
  let persistTimer = null;
  let pendingPatch = null;

  const badge = createBadge();

  // Preferences are written back in one debounced batch: stepping a value five
  // times should not mean five writes. The values waiting to be written
  // accumulate, because a timer that only carried the newest patch would have
  // dropped every field touched before it — a warmth turned down and then a
  // brightness turned up, and the warmth never reached storage at all.
  const persist = (patch) => {
    Object.assign(current, patch);
    pendingPatch = { ...pendingPatch, ...patch };
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      const patchToWrite = pendingPatch;
      pendingPatch = null;
      writeSettings(patchToWrite);
    }, PERSIST_DELAY_MS);
  };

  const isWatched = () => hosts.every((host) => isHostEnabled(current, host));

  // The badge is mounted by one frame at a time. The frames take turns
  // through the top frame: it seats one claimant at a time, and a seat is
  // the only permission a frame outside the top one has to show a badge.
  const isTop = isTopFrame();
  const ticket = mintTicket();
  let granted = isTop;

  // Late-bound, the way the player session binds its own actions: the verdict
  // and the arbitration both have to reach the watcher created below them,
  // and the watcher has to reach the same things on events of its own.
  const refs = {
    wantsBadge: () => false,
    onGrant: () => {},
    announce: () => {},
  };

  const claimant = isTop
    ? null
    : createClaimant(window, ticket, (next) => {
        granted = next;
        refs.onGrant();
      });

  const judge = isTop
    ? createJudge(window, { ownWant: () => refs.wantsBadge() })
    : null;

  const watcher = createVideoWatcher((primary) => {
    if (session) return;
    if (primary && granted && isWatched()) badge.show(primary);
    else badge.hide();
    refs.announce();
  });

  refs.onGrant = () => {
    const primary = watcher.getPrimary();
    if (primary && granted && isWatched()) badge.show(primary);
    else badge.hide();
  };

  refs.wantsBadge = () =>
    !session && watcher.getPrimary() !== null && isWatched();

  refs.announce = () => {
    // One call covers both sides of the arrangement: the frame tells the
    // judge what it wants, and the judge — when this frame is the judge —
    // reconsiders its seating with that knowledge in hand.
    claimant?.setWant(refs.wantsBadge());
    judge?.decide();
  };

  const apply = () => {
    if (isWatched()) {
      watcher.start();
    } else {
      watcher.stop();
      badge.hide();
      // A site that has been switched off while the player was on its film
      // loses the player as well: the off switch in the popup cannot leave a
      // film running on — and listening, while intro skip is its business —
      // under it.
      if (session) session.exit();
    }
    refs.announce();
  };

  badge.onActivate = async (video) => {
    if (session) return;
    badge.hide();
    session = createSession(video, {
      settings: current,
      onPersist: persist,
      // A feed may have moved on while the player was open, so the badge goes
      // back on whichever video the player was showing last. But only when
      // the frame may still have it: the site may have been switched off, or
      // the seat may have been handed to another frame while the player was
      // on the film.
      onExit: (lastVideo) => {
        session = null;
        if (granted && isWatched()) badge.show(lastVideo);
        else badge.hide();
        refs.announce();
      },
    });
    refs.announce();
    await session.enter();
  };

  apply();
  onSettingsChanged((next) => {
    // The popup writes too, and the write also comes back here when it is
    // our own: merged into the one shared object, never replaced, so the
    // reference the session holds stays the same. Everything is normalized
    // before it is assigned, so the whole is safe.
    Object.assign(current, next);
    apply();
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'query-state') return false;
    return Promise.resolve({ videoCount: watcher.getCount() });
  });
};

start().catch((error) => {
  console.error('Nocturne: failed to start', error);
});
