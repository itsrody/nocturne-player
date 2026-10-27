import {
  isHostEnabled,
  onSettingsChanged,
  readSettings,
  writeSettings,
} from '../lib/settings.js';
import { createDebug } from '../lib/debug.js';
import { chainHosts } from '../lib/chain.js';
import { createSignal } from '../lib/signals.js';
import { createTimerSlot } from '../lib/time.js';
import { asDossier, asStrain, asVerdict, sayReport } from '../lib/protocol.js';
import { createBadge } from './controls/badge.js';
import { createVideoWatcher } from './detect.js';
import { createSlot, isTopFrame } from './slot.js';
import { createSession } from './session.js';

const PERSIST_DELAY_MS = 400;

// The diagnostics voice of the wire room: the dossier's arrival is the
// one thing this file can say that nothing else knows how to say — it is
// the background's evidence about this frame's film, earned at the bus.
const debug = createDebug('wire');

const isDocumentSupported = () =>
  document.contentType === 'text/html' &&
  location.protocol !== 'about:' &&
  location.protocol !== 'moz-extension:';

const start = async () => {
  if (!isDocumentSupported()) return;
  // The standing sign of this frame's field agent: set on the first boot
  // and consulted before any of the arrangement below runs again. The
  // conscription may reach this bundle twice — a targeted boot for the
  // film's own frame, and the relay sweep that names no frameIds — and
  // the check and the set are synchronous on purpose: two evals racing
  // meet at exactly one statement, and the loser leaves without opening
  // a port.
  if (globalThis.__nocturneField) return;
  globalThis.__nocturneField = true;

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
  // through the hub: it seats one frame at a time, and a seat is the only
  // permission a frame outside the top one has to show a badge. The top
  // needs no turn — its own film is the film the page chose.
  const isTop = isTopFrame();
  let granted = isTop;

  // The slot keeps its climb on the page wire this round — widening an
  // element means widening an element in a document the hub cannot reach
  // into — and the rider below carries the frame's half of it. A rider is
  // asked of every frame but the top: the top's room is the viewport
  // itself, and there is no window above it to ask.

  // The wiring of this frame is a cycle, and it is cut two ways rather than
  // by one hand-bound bag: the questions asked late — the count this frame
  // reports with, and whether this frame wants the badge, both of which need
  // the watcher standing below them — are queries rebound once their answer
  // exists, and the moments said across the cycle — a verdict arriving from
  // the hub, and the announcement that closes the arrangement — are
  // signals, fired by whoever says them without knowing who hears yet.
  let liveCount = () => 0;
  let wantsBadge = () => false;
  const grant = createSignal();
  const announce = createSignal();
  // A moment the hub says and only the watcher hears: the network's word
  // that a film's bytes are already crossing the tab — before the
  // element has landed, before the metadata has arrived. Fired by the
  // word, heard by whoever comes below it.
  const strain = createSignal();

  // The frame's seat of life: one runtime port to the background's hub,
  // opened once and kept for the life of the document. The browser attests
  // to the envelope — tab and frame are facts the pages cannot forge — so
  // nothing is minted here anymore to say who is speaking. The port is
  // also the death notice: when this document is torn down, the port's
  // disconnect is the hub's word that the frame is gone, and the book
  // frees the seat with no clock to wait out.
  const up = browser.runtime.connect({ name: 'nocturneSeat' });

  // The frame's word about itself, on the announce moment: what it wants
  // and what it found, said plain. The hub keeps the book, so no beat
  // needs to walk beneath the words — silence here is a fact with an
  // event attached, not a guess the seat must ride out.
  const report = () => {
    up.postMessage(sayReport(wantsBadge(), liveCount()));
  };

  // The dossier this frame hears back, kept only until the next: the
  // background's evidence from the bus — where the film's bytes came
  // from, what spoke for them, every origin standing above this frame.
  // The DOM cannot see any of it, and this frame cannot re-earn it by
  // shouting; it is spoken into the diagnostics when they are on.
  let heard = null;

  // Three words ride back, and each is heard through the protocol's own
  // guard, so a half-formed word is refused whole and never half-acted
  // on: the seat's news by the badge's own arrangement, the wire's
  // strain by the scheduling signal — the sweep's own debounce keeps a
  // burst of segment-fetch knocks from becoming a burst of walks — and
  // the dossier by the record above.
  up.onMessage.addListener((word) => {
    const strainWord = asStrain(word);
    if (strainWord !== null) {
      strain.emit();
      return;
    }
    const dossierWord = asDossier(word);
    if (dossierWord !== null) {
      heard = dossierWord;
      debug('the wire’s dossier arrived', heard.url);
      return;
    }
    const verdictWord = asVerdict(word);
    if (verdictWord === null) return;
    granted = verdictWord.granted;
    grant.emit();
  });

  // The badge's answer for a film, said once and asked of wherever the
  // news comes from: a watcher's sweep, a verdict arriving from the hub,
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

  // A verdict arriving from the hub is the badge's news with the film the
  // watcher holds: the answer is re-asked of the frame as it stands now.
  grant.on(() => retune(watcher.getPrimary()));

  // The wire's strain is the sweep's earliest knock: a film's manifest is
  // often fetched before its element is ever inserted, so the hearing
  // here can open the walk a beat before the MutationObserver's own.
  strain.on(() => watcher.poke());

  wantsBadge = () => !session && watcher.getPrimary() !== null && isWatched();

  announce.on(() => {
    // One call covers the whole arrangement: the frame tells the hub what
    // it wants and what it found, and the hub — where the book of frames
    // stands — reconsiders the seat with that knowledge in hand.
    report();
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

  // The whole slot story, stood up in one call: the keepers — every
  // document, the top's included, growing the box of whichever child
  // speaks and passing the word up — and, beside them in every framed
  // document, the rider that asks for the room. The climb stays on the
  // page's own wire — widening an element means widening an element in a
  // document the hub cannot reach into — and the answer here is the one
  // verb the session needs: slot(open). At the top the verb means
  // nothing; the top's room is the viewport itself.
  const slots = createSlot(window, document);

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
        slots.slot(false);
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
    slots.slot(true);
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
};

// One field agent per frame, whatever route the background took to reach
// it — the boot flag's check is read here, before the arrangement's first
// await, by any repeat eval of this same bundle. The supported check and
// the flag's set are the only run of statements the bundle makes twice;
// a frame the platform refuses loses nothing but the parse.
if (!globalThis.__nocturneField) {
  start().catch((error) => {
    console.error('Nocturne: failed to start', error);
  });
}
