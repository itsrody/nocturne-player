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
import {
  asCipher,
  asCipherPlan,
  asDossier,
  asLadder,
  asStrain,
  asVerdict,
  sayLine,
  sayRouteRung,
} from '../lib/protocol.js';
import { createBadge } from './controls/badge.js';
import { createVideoWatcher } from './detect.js';
import { createDomManager } from './dom.js';
import { hearLines } from '../lib/debug.js';
import { createCipherFeeder } from './video/cipherfeeder.js';
import { createRoute } from './video/route.js';
import { hearLadder, voiceLadder } from './video/ladder.js';
import { claimReplay } from './video/resume.js';
import { createOwnEngine } from './video/ownengine.js';
import { knockWarm, warmEngines } from './video/engines.js';
import { createSlot, isTopFrame } from './slot.js';
import { createSession } from './session.js';

const PERSIST_DELAY_MS = 400;

// The diagnostics voice of the wire room: the dossier’s arrival is the
// one thing this file can say that nothing else knows how to say — it is
// the background’s evidence about this frame’s film, earned at the bus.
const debug = createDebug('wire');

const isDocumentSupported = () =>
  document.contentType === 'text/html' &&
  location.protocol !== 'about:' &&
  location.protocol !== 'moz-extension:';

const start = async () => {
  if (!isDocumentSupported()) return;
  // The standing sign of this frame’s field agent: set on the first boot
  // and consulted before any of the arrangement below runs again. The
  // conscription may reach this bundle twice — a targeted boot for the
  // film’s own frame, and the relay sweep that names no frameIds — and
  // the check and the set are synchronous on purpose: two evals racing
  // meet at exactly one statement, and the loser leaves without opening
  // a port.
  if (globalThis.__nocturneField) return;
  globalThis.__nocturneField = true;

  // A player embedded in an iframe honours the decision the user made about
  // the page they can actually see, and every named origin between the film
  // and the eye counts — the whole chain arrives from this document’s own
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
  // is the slot’s business.
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
  // into — and the rider below carries the frame’s half of it. A rider is
  // asked of every frame but the top: the top’s room is the viewport
  // itself, and there is no window above it to ask.

  // The wiring of this frame is a cycle, and it is cut two ways rather than
  // by one hand-bound bag: the watcher’s want — whether this frame has a
  // session open and whether the site is watched — is read fresh at every
  // saying instead of copied once, and the moments said across the cycle —
  // a verdict arriving from the hub, and the announcement that closes the
  // arrangement — are signals, fired by whoever says them without knowing
  // who hears yet.
  const grant = createSignal();
  const announce = createSignal();
  // A moment the hub says and only the watcher hears: the network’s word
  // that a film’s bytes are already crossing the tab — before the
  // element has landed, before the metadata has arrived. Fired by the
  // word, heard by whoever comes below it.
  const strain = createSignal();

  // The frame’s seat of life: one runtime port to the background’s hub,
  // opened once and kept for the life of the document. The browser attests
  // to the envelope — tab and frame are facts the pages cannot forge — so
  // nothing is minted here anymore to say who is speaking. The port is
  // also the death notice: when this document is torn down, the port’s
  // disconnect is the hub’s word that the frame is gone, and the book
  // frees the seat with no clock to wait out. The watcher below carries
  // the frame’s half of this same handshake: its own findings, said on
  // the port it is handed.
  const up = browser.runtime.connect({ name: 'nocturneSeat' });

  // The diagnostics sink, registered while the seat stands: every line
  // the frame’s own logger says while the viewer’s switch is on is said
  // up the port whole, so the background’s inspect window carries the
  // whole house’s lines in one scroll — the pages a console cannot be
  // opened on included. With the switch off the logger stays silent
  // before this listener is ever reached, so nothing crosses at all.
  hearLines((text) => {
    try {
      up.postMessage(sayLine(text));
    } catch {
      // A mouth gone dead mid-word is a death the disconnect has
      // already spoken; the line was for a console that closed first.
    }
  });

  // The dossier this frame hears back, kept only until the next: the
  // background’s evidence from the bus — where the film’s bytes came
  // from, what spoke for them, every origin standing above this frame.
  // The DOM cannot see any of it, and this frame cannot re-earn it by
  // shouting; it is spoken into the diagnostics when they are on.
  let heard = null;

  // The playable plan the bus said, kept under the same rules as the
  // dossier: one copy, replaced whole by the next, never read by
  // anything that does not already hold the film it is a plan of — the
  // feeder below only plays it on an element errored on exactly the
  // manifest the plan was read from.
  let plan = null;

  // The family the bus named for this frame’s film, read fresh at every
  // asking. The dossier is spoken once per document’s life and the
  // shape rides it already, so the reading here is the dossier’s own
  // word handed onward — the sweep narrows by it when the stamp still
  // agrees, and falls back whole when the hint answers nothing.
  const hearShape = () => (heard === null ? null : heard.shape);

  // Three words ride back, and each is heard through the protocol’s own
  // guard, so a half-formed word is refused whole and never half-acted
  // on: the seat’s news by the badge’s own arrangement, the wire’s
  // strain by the scheduling signal — the sweep’s own debounce keeps a
  // burst of segment-fetch knocks from becoming a burst of walks — and
  // the dossier by the record above.
  up.onMessage.addListener((word) => {
    const strainWord = asStrain(word);
    if (strainWord !== null) {
      strain.emit();
      return;
    }
    const planWord = asCipherPlan(word);
    if (planWord !== null) {
      plan = planWord;
      return;
    }
    const cipherWord = asCipher(word);
    if (cipherWord !== null) {
      // The cipher’s own voice is diagnostics only for now: a
      // sample-aes stream is named honestly but not played, and an
      // aes-128 stream’s playable half rides the plan word above.
      debug('the bus named the cipher', cipherWord.cipher, cipherWord.url);
      return;
    }
    const ladderWord = asLadder(word);
    if (ladderWord !== null) {
      hearLadder(ladderWord.url, ladderWord.ladder);
      debug(
        `the stream’s ladder heard — ${ladderWord.ladder.length} rungs`,
        ladderWord.url,
      );
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

  // The badge’s answer for a film, said once and asked of wherever the
  // news comes from: a watcher’s sweep, a verdict arriving from the hub,
  // or the player handing its film back. The film is always given — each
  // caller knows it, and the answer needs no second opinion.
  const retune = (primary) => {
    if (primary && granted && isWatched()) badge.show(primary);
    else badge.hide();
  };

  // The page’s story of itself, one for the whole frame: a single eye on
  // the document, one beat for every origin of a move — mutations, the
  // tab seen again, a resize, films drawing nearer, the network’s knock
  // — stood when the first listener reaches it and stood down behind the
  // last. The watcher below is its first ear; nothing here wires an
  // observer of its own any more.
  const dom = createDomManager(window, document);

  // The cipher’s playback arm: the feeder that takes an errored element
  // over when the bus has said a plan for its stream. It is made here —
  // before the watcher, which asks it the repair arm in every sweep —
  // and it keeps its own asks and answers on the frame’s port.
  // The playback arms, composed at the one hook the walk offers before
  // its judgement: the feeder takes the sealed streams — a plan said
  // by the bus; the own engine takes the planless ones — plain HLS and
  // the `blob:` sites whose closed-over engine died with its own
  // MediaSource. Both arms keep the one-attempt law, and the feeder
  // owns its precedence: an element the own engine already feeds is
  // named planless to the feeder, so a plan arriving late can never
  // hang a second loader on an element the house has already taken.
  const own = createOwnEngine();
  const feeder = createCipherFeeder(up, (video) =>
    own.owns(video) ? null : plan,
  );

  // The routing arm — FastStream’s own architecture: the film frame’s
  // asks are spoken by the background’s hands, so the network panel
  // shows the house as the initiator and the page’s own player does all
  // the reading and unsealing on bytes it believes it fetched. Made
  // here, beside the feeder, and armed at the agent’s own birth — the
  // arm no longer waits on the walk: the boot itself is the catch
  // (the conscript stood this agent up *because* a media ask crossed
  // the frame), and at `document_start` the natives are laid before
  // the page’s own player is even parsed — the film’s first manifest
  // ask, the request that proved it, is ours to rout. One arm per
  // document, whatever comes after; a miss answered with the honest
  // miss, and the stand-down bows the whole room where the stream
  // answers nothing.
  const route = createRoute(up);

  // The pin’s voice, wired once beside the routing’s birth: a rung the
  // sheet tags is spoken up as the hub’s own rewording word. A refusal
  // on the wire — a port already dying — costs the caller nothing; the
  // pin’s own room swallows it.
  voiceLadder((id) => {
    up.postMessage(sayRouteRung(id));
  });

  // The frame’s arm of the manager, ending in the handshake with the
  // background: the watch handed the manager’s story and the frame’s
  // own port, the want as a fresh reading — a session open, a site
  // switched off — the watch answers for itself, and the feeder as the
  // repair arm a film that errored is offered before it is judged.
  const watcher = createVideoWatcher(
    dom,
    up,
    () => !session && isWatched(),
    (video) => {
      // The arms in precedence order, each its own gate: the hatch only
      // takes planless streams; the feeder renames what the hatch already
      // owns (the composed plan-reader above), so a late plan cannot hang
      // a second loader on an element the house feeds already.
      own.repair(video, plan !== null);
      feeder.repair(video);
    },
  );

  // The film in hand is the badge’s news: the badge is re-aimed where
  // the frame may still have a film, and the word to the background —
  // the count and the want — rides the announcement below. The walk is
  // the badge’s timing, not the routing’s: it names the film the badge
  // anchors onto, and the setting-site judge the want is read from —
  // the routing’s own arms stood before the walk ran at all.
  watcher.news.on((primary) => {
    // The safety arm for a room the birth could not lay — a frozen
    // page whose binding refused the first arm at `document_start`,
    // unfrozen by the time its player carne up. Idempotent per
    // document, so a second arm is a second nothing.
    if (primary !== null) route.arm();
    // The replay note is spent exactly once, on the claim itself: a pin
    // forced this frame to reload, and the position said down before
    // the reload is restored onto the element as it first stands — the
    // metadata landing, so the restore asks a player able to hold it;
    // and skipped where the element already stands further in, meaning
    // the frame's own player beat us to the restore.
    if (primary !== null) {
      const note = claimReplay();
      if (note !== null && primary.currentTime === 0) {
        const land = () => {
          primary.removeEventListener('loadedmetadata', land);
          primary.currentTime = note;
          primary.play().catch(() => {});
        };
        if (primary.readyState >= 1) land();
        else primary.addEventListener('loadedmetadata', land);
      }
    }
    if (session) return;
    retune(primary);
    announce.emit();
  });

  // A verdict arriving from the hub is the badge’s news with the film the
  // watcher holds: the answer is re-asked of the frame as it stands now.
  grant.on(() => retune(watcher.getPrimary()));

  // The wire’s strain is the sweep’s earliest knock: a film’s manifest is
  // often fetched before its element is ever inserted, so the hearing
  // here can open the walk a beat before the eye’s own — and the engine
  // arm re-rests on the same knock, because the manifest is fetched
  // through the engine it rides, an engine is never more findable than
  // in that moment, and the answer’s old stamp was never older than it
  // is now.
  strain.on(() => {
    watcher.poke();
    knockWarm();
  });

  announce.on(() => {
    // One call covers the whole arrangement: the frame tells the hub what
    // it wants and what it found, and the hub — where the book of frames
    // stands — reconsiders the seat with that knowledge in hand. The
    // word itself is the watcher’s; the era is the frame’s, because the
    // session and the settings are news the watch cannot know alone.
    watcher.report();
  });

  const apply = () => {
    if (isWatched()) {
      watcher.start();
      // The routing arms with the watch: a watched host’s frame lays
      // the arms at once — at `document_start` this runs before the
      // page’s own player asks anything, so its first ask is routed.
      // (birth below in news.on is the safety arm for a frozen page.)
      route.arm();
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
  // document, the top’s included, growing the box of whichever child
  // speaks and passing the word up — and, beside them in every framed
  // document, the rider that asks for the room. The climb stays on the
  // page’s own wire — widening an element means widening an element in a
  // document the hub cannot reach into — and the answer here is the one
  // verb the session needs: slot(open). At the top the verb means
  // nothing; the top’s room is the viewport itself.
  const slots = createSlot(window, document);

  badge.activate.on(async (video) => {
    if (session) return;
    badge.hide();
    const openedSession = createSession(video, {
      settings: current,
      onPersist: persist,
      // The press takes the film's own seat: the player plays where the
      // page had it, in the box the page gave it, with the page's flow
      // intact around it — fullscreen is one act away, on the player's own
      // button.
      presentation: 'inline',
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
    // Seated inline, the film keeps the frame it played in — the room is
    // already as big as the page meant it to be, and no widening ask rides
    // out. A film that fell back to the stage over the viewport is the
    // only one that pulls the widening machine.
    if (openedSession.presentation() === 'inline') return;
    slots.slot(true);
  });

  apply();

  // The engines' sweep is the page’s own document-wide ask, and it is
  // asked now at the page’s ease instead of at the sheet’s opening: a
  // quiet page answers its first sheet out of the quiet, and a page
  // that has since moved on answers as it always did — the walk stamped
  // by the manager, never believed stale. The family the dossier named
  // rides the ask as a fresh reading, so the consult narrows by the
  // very word the crossing said and falls back whole when the hint
  // names nothing the page holds.
  warmEngines(dom, hearShape);

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
// it — the boot flag’s check is read here, before the arrangement’s first
// await, by any repeat eval of this same bundle. The supported check and
// the flag’s set are the only run of statements the bundle makes twice;
// a frame the platform refuses loses nothing but the parse.
if (!globalThis.__nocturneField) {
  start().catch((error) => {
    console.error('Nocturne: failed to start', error);
  });
}
