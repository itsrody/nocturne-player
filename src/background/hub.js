// The brain of the machine, in the one room the pages cannot enter. A
// background page on Firefox MV2 is persistent — it outlives every tab and
// never goes away under the extension — and the runtime channel it shares
// with a content script is the platform’s own wire: a page cannot spell a
// runtime message, and the browser attests to every port who is speaking.
// `sender.tab` and `sender.frameId` arrive read-only facts, not claims.
//
// That is why nothing on this page re-proves what it hears. The whole
// apparatus the page wire demanded — a ticket minted to say who a claim
// answered to, a judge seated in the top frame, a walk over its tree to
// find a claimant among somebody’s children, a heartbeat whose walk told
// life from silence — was the price of talking through windows the pages
// own. On the runtime, identity is read off the envelope.
//
// Death, too, is spoken. A content script’s port fires `onDisconnect` the
// moment its document is torn down — a navigation, an iframe lifted out of
// the tree, a tab closed — so the book of frames is never asked to guess a
// frame’s fate from its silence. No clock walks the book; presence is
// connectivity, and the seat the book holds is exactly as alive as the
// pages standing on it.
//
// The frames keep everything a frame alone can do — the sweep for films,
// the badge, the session — because the background has no document and none
// of that work exists anywhere else. What moved here is the arbitration:
// which frame’s film earns the badge on the page, and how many films the
// page holds. The book below is answering one question a frame asks with
// its whole term — may I show the badge — and one the popup asks on demand
// — how many films the tab holds. A third voice it hears says neither of
// those: the network’s own word, a media-shaped request crossing the tab’s
// bus bound for one of its frames.
import {
  asCipherAsk,
  asReport,
  asStateQuery,
  sayCipher,
  sayCipherBytes,
  sayCipherPlan,
  sayDossier,
  sayStrain,
  sayVerdict,
} from '../lib/protocol.js';

// The one verb the state answers with is a count, read fresh from the book
// whenever the question arrives — the book is the hot record, and nothing
// here caches an answer that a disconnect would leave behind.
export const createFrameHub = (browser, worker = null) => {
  // Per tab: the frames alive in it, in the order their wants arrived, and
  // the counter the turn number is drawn from. The book’s keys are
  // browser-attested frameIds — 0 is the page’s own document — and an
  // entry’s life is exactly its port’s life.
  const books = new Map();

  // The re-think, after any word: who holds the seat, said to every frame
  // whose answer moved. The seat is a turn across the tab’s frames: the
  // oldest ask in force takes it, and only a frame that wants it can hold
  // it. The top document’s own film outranks the framed ones — the page
  // put it there to be seen as the page — so while the top wants, no
  // framed film holds the seat.
  const decide = (table) => {
    const top = table.book.get(0);
    let winner = null;
    if (!top?.want) {
      for (const [frameId, entry] of table.book) {
        if (frameId === 0 || !entry.want) continue;
        if (winner === null || entry.seat < table.book.get(winner).seat) {
          winner = frameId;
        }
      }
    }
    for (const [frameId, entry] of table.book) {
      // The top frame is never sent a verdict: it believes `granted` on
      // its own — it is the one frame whose film the page itself chose —
      // and its want is only ever read above as the supreme claim.
      if (frameId === 0) continue;
      const seated = frameId === winner;
      if (entry.granted === seated) continue;
      entry.granted = seated;
      try {
        entry.port.postMessage(sayVerdict(seated));
      } catch {
        // A mouth that would not carry the news belongs to a frame whose
        // death is already spoken as an event; the book is the truth, and
        // the disconnect that follows will tidy what the throw could not.
      }
    }
  };

  // The dossier rides in once per generation of an entry, whenever both
  // parties to it are finally in the room: the background’s evidence from
  // the bus about this frame’s film, told down the frame’s own port. The
  // two roads that can lead here — a connect before the wire was heard, a
  // wire heard on a frame whose port already stands — are covered by the
  // same flag, so the word is said exactly once and never rehearsed.
  const tellDossier = (entry) => {
    if (entry.wire === null || entry.told || entry.port === null) return;
    entry.told = true;
    try {
      entry.port.postMessage(entry.wire);
    } catch {
      // A mouth that would not carry the dossier belongs to a frame
      // whose death is already spoken as an event; nothing here is lost
      // that the next generation will not hear again.
    }
  };

  // The read, told only while the entry still stands: the document that
  // named the manifest may be remade before the answer keeps, and a
  // word said to a replaced entry’s port would leak its book life. The
  // crossing it is read from is the shape-and-url word the wire carried —
  // the ear itself, or the dossier a ghost held onto until someone came
  // home to ask.
  const readCipher = async (entry, tabId, frameId, crossing) => {
    if (worker === null || entry.port === null) return;
    if (crossing?.shape !== 'hls' || typeof crossing.url !== 'string') return;
    if (entry.cipherTold) return;
    entry.cipherTold = true;
    try {
      const answer = await worker.readCipher(crossing.url);
      const table = books.get(tabId);
      if (table?.book.get(frameId) !== entry) return;
      // A manifest with no cipher decree says nothing: no word, at all.
      if (answer === null) return;
      entry.port.postMessage(sayCipher(answer.cipher, crossing.url));
      if (answer.plan !== null) {
        entry.port.postMessage(sayCipherPlan(answer.plan));
      }
    } catch {
      // The read is a hint by design: a dead fetch is a stream the
      // frame plays as it always did, and a mouthless port is a death
      // the disconnect has already spoken.
    }
  };

  // The network’s word, heard from the eye at the bus: a media-shaped
  // request crossed the tab’s network bound for this frame, and the ear
  // it comes with — where the bytes came from, what spoke for them, and
  // every origin standing above the frame — is the frame’s dossier.
  // The warm word is written wherever the frame’s seat stands, and where
  // none does a ghost seat is founded — a frame with no script behind its
  // document has no port, no want, no count, and only the one truth the
  // wire carries: a stream runs here. A wordless crossing (ear absent)
  // still warms the seat; the dossier waits for a crossing that spoke.
  //
  // The wake rides the first strain of an entry’s life, and never
  // again: a stream in play re-crosses the bus every few seconds by its
  // own cadence, and each crossing finds the entry already warm — the
  // word is a door-knock, not a heartbeat, because the frame’s sweep
  // runs at the knock and its own events (the film’s element landing in
  // the DOM, the metadata arriving) are what keep it fresh. The stream
  // being warm again for a document born again is exactly the knock the
  // beginner deserves: a reconnect replaces the entry, and the next
  // strain knocks anew.
  const strain = (tabId, frameId, ear) => {
    let table = books.get(tabId);
    if (table === undefined) {
      table = { book: new Map(), seatNext: 0 };
      books.set(tabId, table);
    }
    const entry = table.book.get(frameId);
    if (entry === undefined) {
      table.book.set(frameId, {
        port: null,
        want: false,
        count: 0,
        granted: false,
        seat: null,
        stream: true,
        wire: ear === undefined ? null : sayDossier(ear),
        told: false,
        cipherTold: false,
      });
      return;
    }
    // The dossier arriving on a seat already founded: a ghost warmed by
    // a wordless crossing, or an entry whose port stands but whose
    // evidence arrives late — both hear it now, once.
    if (ear !== undefined && entry.wire === null) {
      entry.wire = sayDossier(ear);
      tellDossier(entry);
    }
    if (entry.stream) return;
    entry.stream = true;
    if (entry.port !== null) {
      try {
        entry.port.postMessage(sayStrain());
      } catch {
        // A mouth that would not carry the knock is one whose death is
        // on its way as an event; the warmth stays written, the book
        // keeps what the wire said.
      }
    }
    // The manifest’s own word, read once per generation: a crossing
    // that named the hls family is worth the fetch — the background’s
    // hands are the only ones that can read the manifest’s key decree
    // without the page’s own CORS. A ghost seat (no port behind the
    // document) is never fed: whatever answers the plan needs, only a
    // frame with hands of its own can ask for them.
    readCipher(entry, tabId, frameId, ear);
  };

  // The recruiter’s skip-sign: is a field agent’s port standing in this
  // frame already? Answered straight from the book — a ghost seat (no
  // port) never counts as standing, so a frame warm from the wire is
  // still owed its boot — and a stranger frame, never heard of, stands
  // nothing.
  const standing = (tabId, frameId) => {
    const table = books.get(tabId);
    if (table === undefined) return false;
    const entry = table.book.get(frameId);
    return entry !== undefined && entry.port !== null;
  };

  browser.runtime.onConnect.addListener((port) => {
    // The vouching is the whole entrance exam: a port without a tab and a
    // frame named on its envelope is nobody’s frame — an extension page’s
    // own connect, or a caller the browser did not attest — and is shown
    // the door at once.
    const sender = port.sender ?? {};
    const tabId = sender.tab?.id;
    const frameId = sender.frameId;
    if (typeof tabId !== 'number' || typeof frameId !== 'number') {
      port.disconnect();
      return;
    }

    let table = books.get(tabId);
    if (table === undefined) {
      table = { book: new Map(), seatNext: 0 };
      books.set(tabId, table);
    }

    // A frame that reconnects — its document was remade while the tab
    // lived on — takes a fresh entry: whatever turn it held belonged to a
    // document that has gone, and it re-enters the queue at the back, the
    // way the old rail’s re-claim did. What it adopts with it is the
    // frame’s context: the warmth the wire wrote (a ghost seat the stream
    // fed, or a predecessor’s) and the dossier it earned — the context is
    // the frame’s, not any document’s, and the dossier starts its life
    // untold, told again to whoever now holds the seat.
    const entry = {
      port,
      want: false,
      count: 0,
      granted: false,
      seat: null,
      stream: table.book.get(frameId)?.stream === true,
      wire: table.book.get(frameId)?.wire ?? null,
      told: false,
      cipherTold: false,
    };
    table.book.set(frameId, entry);
    tellDossier(entry);

    // A ghost seat the manifest warmed hears its cipher the moment a
    // hand comes home: the crossing is read from the word the seat was
    // warmed with, not from any fresh fetch the wire owes again.
    readCipher(entry, tabId, frameId, entry.wire);

    port.onMessage.addListener((word) => {
      // The cipher’s ask rides the same port as the report: the frame
      // holds the plan, and the bytes it cannot fetch itself are asked
      // for one address at a time, answered with clonable bytes — or
      // with an honest null, when the fetch failed or the reading
      // threw, for the worker misses are answers, never errors.
      const segment = asCipherAsk(word);
      if (segment !== null) {
        Promise.resolve(worker?.giveSegment?.(segment.url) ?? null)
          .then((bytes) => port.postMessage(sayCipherBytes(segment.url, bytes)))
          .catch(() => {
            try {
              port.postMessage(sayCipherBytes(segment.url, null));
            } catch {
              // A mouth gone dead mid-answer belongs to a death the
              // disconnect has already spoken.
            }
          });
        return;
      }
      const said = asReport(word);
      if (said === null) return;
      entry.want = said.want;
      if (said.count !== null) {
        entry.count = said.count;
      }
      // The turn is drawn the first time this frame asks to be shown —
      // and since the entry is born again on every reconnect, the draw is
      // the re-entry’s own place at the back of the line.
      if (entry.want && entry.seat === null) {
        entry.seat = table.seatNext;
        table.seatNext += 1;
      }
      decide(table);
    });

    port.onDisconnect.addListener(() => {
      // The identity guard on the way out, mirroring the one way in: the
      // book frees a seat when the entry’s own port dies. A replaced
      // frame’s port may live a teardown longer than its welcome — its
      // late disconnect must not strangle its successor.
      if (table.book.get(frameId) !== entry) return;
      table.book.delete(frameId);
      if (table.book.size === 0) {
        // The whole tab went — the book leaves with it, rather than
        // lingering as an empty room.
        books.delete(tabId);
      } else {
        decide(table);
      }
    });
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    books.delete(tabId);
  });

  browser.runtime.onMessage.addListener((word, sender) => {
    const ask = asStateQuery(word);
    if (ask === null) return false;
    // A runtime word reaches every ear of the extension — the frames'
    // content scripts included — so the speaker is checked before the
    // answer: only an extension page (the popup, the options) has no tab
    // on its envelope. A frame asking here is answered nothing; the hub
    // alone speaks for the book.
    if (sender?.tab !== undefined) return false;
    const book = books.get(ask.tabId)?.book;
    let total = 0;
    let streams = 0;
    if (book !== undefined) {
      for (const entry of book.values()) {
        total += entry.count;
        // The context line beyond the count: frames the count is still
        // silent about — either nobody stands behind their document to
        // sweep it, or the sweep ran and found nothing the DOM names —
        // where the wire alone says a film streams. A frame with films
        // to count repeats no line; its context is already spoken.
        if (entry.stream && entry.count === 0) streams += 1;
      }
    }
    return Promise.resolve({ videoCount: total, streams });
  });

  // The book is returned for the tests, which stand in for the browser
  // and read the registry by hand — and `strain` and `standing` with
  // them: the eye at the bus feeds the first, and the recruiter asks the
  // second before any boot. The running extension composes the three in
  // background/index.js: the tap hears the wire, the conscript arms the
  // frames, the hub keeps the book.
  return { books, strain, standing };
};
