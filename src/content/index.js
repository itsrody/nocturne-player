import {
  isHostEnabled,
  onSettingsChanged,
  readSettings,
  writeSettings,
} from '../lib/settings.js';
import { createSignal } from '../lib/signals.js';
import { createTimerSlot } from '../lib/time.js';
import { LEGACY_OPENINGS_KEY, STATE_QUERY } from '../lib/words.js';
import { createBadge } from './controls/badge.js';
import { createVideoWatcher } from './detect.js';
import {
  chainHosts,
  createClaimant,
  createJudge,
  isTopFrame,
  mintTicket,
} from './frames.js';
import { createSlotKeeper } from './slot.js';
import { createSession } from './session.js';

const PERSIST_DELAY_MS = 400;

// The player no longer learns openings, but releases before this one kept
// what they heard in the extension's own storage. The sweep removes the dead
// key once per boot: a device that ever carried the learned openings ends up
// without them, quietly, by the time the viewer notices anything.
browser.storage.local.remove(LEGACY_OPENINGS_KEY).catch(() => {});

const isDocumentSupported = () =>
  document.contentType === 'text/html' &&
  location.protocol !== 'about:' &&
  location.protocol !== 'moz-extension:';

const start = async () => {
  if (!isDocumentSupported()) return;

  // A player embedded in an iframe honours the decision the user made about
  // the page they can actually see, and every named origin between the film
  // and the eye counts — the whole chain arrives from this document's own
  // location, same-origin and cross-origin alike.
  const hosts = chainHosts(location);
  let session = null;
  // One settings object stays put for the whole lifetime of this frame, and
  // every change is merged into it. The session and the overlays it opens
  // hold this same reference, so a value set on the film in hand is already
  // in place for the next film the page hands over — rebinding, as a fresh
  // object did, left the session carrying the value it opened with.
  const current = await readSettings();
  let pendingPatch = null;

  const badge = createBadge();

  // Preferences are written back in one debounced batch: stepping a value five
  // times should not mean five writes. The values waiting to be written
  // accumulate, because a timer that only carried the newest patch would have
  // dropped every field touched before it — a warmth turned down and then a
  // brightness turned up, and the warmth never reached storage at all. The
  // debouncer is a timer slot: rearms replace, and nothing about the ledger
  // is the slot's business.
  const persistTimer = createTimerSlot(() => {
    const patchToWrite = pendingPatch;
    pendingPatch = null;
    writeSettings(patchToWrite);
  });

  const persist = (patch) => {
    Object.assign(current, patch);
    pendingPatch = { ...pendingPatch, ...patch };
    persistTimer.set(PERSIST_DELAY_MS);
  };

  const isWatched = () => hosts.every((host) => isHostEnabled(current, host));

  // The badge is mounted by one frame at a time. The frames take turns
  // through the top frame: it seats one claimant at a time, and a seat is
  // the only permission a frame outside the top one has to show a badge.
  const isTop = isTopFrame();
  const ticket = mintTicket();
  let granted = isTop;

  // The wiring of this frame is a cycle, and it is cut two ways rather than
  // by one hand-bound bag: the questions asked late — the count a claimant
  // reports with, and whether this frame wants the badge, both of which need
  // the watcher standing below them — are queries rebound once their answer
  // exists, and the moments said across the cycle — a grant arriving from
  // the judge, and the announcement that closes the arrangement — are
  // signals, fired by whoever says them without knowing who hears yet.
  let liveCount = () => 0;
  let wantsBadge = () => false;
  const grant = createSignal();
  const announce = createSignal();

  const claimant = isTop
    ? null
    : createClaimant(
        window,
        ticket,
        (next) => {
          granted = next;
          grant.emit();
        },
        { getCount: () => liveCount() },
      );

  const judge = isTop
    ? createJudge(window, { ownWant: () => wantsBadge() })
    : null;

  // The badge's answer for a film, said once and asked of wherever the
  // news comes from: a watcher's sweep, a grant arriving from the judge,
  // or the player handing its film back. The film is always given — each
  // caller knows it, and the answer needs no second opinion.
  const retune = (primary) => {
    if (primary && granted && isWatched()) badge.show(primary);
    else badge.hide();
  };

  const watcher = createVideoWatcher((primary) => {
    if (session) return;
    retune(primary);
    announce.emit();
  });

  liveCount = () => watcher.getCount();

  // A grant arriving from the judge is the badge's news with the film the
  // watcher holds: the answer is re-asked of the frame as it stands now.
  grant.on(() => retune(watcher.getPrimary()));

  wantsBadge = () => !session && watcher.getPrimary() !== null && isWatched();

  announce.on(() => {
    // One call covers all three sides of the arrangement: the frame tells
    // the judge what it wants, the count rides the same word (the frame
    // may have films to report without a claim in force, so the word is
    // said even when the want is unchanged), and the judge — when this
    // frame is the judge — reconsiders its seating with that knowledge in
    // hand.
    claimant?.setWant(wantsBadge());
    claimant?.tell();
    judge?.decide();
  });

  const apply = () => {
    if (isWatched()) {
      watcher.start();
    } else {
      watcher.stop();
      badge.hide();
      // A site that has been switched off while the player was on its film
      // loses the player as well: the off switch in the popup cannot leave
      // a film running on under it.
      if (session) session.exit();
    }
    announce.emit();
  };

  // Every document — the top's included — keeps its children's slots: the
  // session's request to grow the page arrives hop by hop, each document
  // widening the box of the child that spoke to it and passing the word
  // up. The keeper is frame-neutral; only the claimant below knows the
  // session that asked.
  createSlotKeeper(window, document);

  badge.activate.on(async (video) => {
    if (session) return;
    badge.hide();
    const openedSession = createSession(video, {
      settings: current,
      onPersist: persist,
      // The page may have moved on while the player was open, so the badge
      // goes back on whichever video the player was showing last. But only
      // when the frame may still have it: the site may have been switched
      // off, or the seat may have been handed to another frame while the
      // player was on the film.
      onExit: (lastVideo) => {
        session = null;
        claimant?.slot(false);
        retune(lastVideo);
        announce.emit();
      },
    });
    session = openedSession;
    announce.emit();
    await session.enter();
    // A session that went away while the door was still opening leaves no
    // slot held: the exit has already said its word.
    if (session !== openedSession) return;
    claimant?.slot(true);
  });

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
    if (message?.type !== STATE_QUERY) return false;
    // One voice per page: the framed copies hear the same question and say
    // nothing, so the first answer is never one document's own count. The
    // top speaks for the page — its own films plus what every lively frame
    // keeps reporting on the claims rail.
    if (!isTop) return false;
    return Promise.resolve({
      videoCount: watcher.getCount() + (judge ? judge.totalCount() : 0),
    });
  });
};

start().catch((error) => {
  console.error('Nocturne: failed to start', error);
});
