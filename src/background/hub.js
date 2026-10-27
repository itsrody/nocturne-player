// The brain of the machine, in the one room the pages cannot enter. A
// background page on Firefox MV2 is persistent — it outlives every tab and
// never goes away under the extension — and the runtime channel it shares
// with a content script is the platform's own wire: a page cannot spell a
// runtime message, and the browser attests to every port who is speaking.
// `sender.tab` and `sender.frameId` arrive read-only facts, not claims.
//
// That is why nothing on this page re-proves what it hears. The whole
// apparatus the page wire demanded — a ticket minted to say who a claim
// answered to, a judge seated in the top frame, a walk over its tree to
// find a claimant among somebody's children, a heartbeat whose walk told
// life from silence — was the price of talking through windows the pages
// own. On the runtime, identity is read off the envelope.
//
// Death, too, is spoken. A content script's port fires `onDisconnect` the
// moment its document is torn down — a navigation, an iframe lifted out of
// the tree, a tab closed — so the book of frames is never asked to guess a
// frame's fate from its silence. No clock walks the book; presence is
// connectivity, and the seat the book holds is exactly as alive as the
// pages standing on it.
//
// The frames keep everything a frame alone can do — the sweep for films,
// the badge, the session — because the background has no document and none
// of that work exists anywhere else. What moved here is the arbitration:
// which frame's film earns the badge on the page, and how many films the
// page holds. The book below is answering one question a frame asks with
// its whole term — may I show the badge — and one the popup asks on demand
// — how many films the tab holds.
import { STATE_QUERY, VERDICT } from '../lib/words.js';

// The one verb the state answers with is a count, read fresh from the book
// whenever the question arrives — the book is the hot record, and nothing
// here caches an answer that a disconnect would leave behind.
export const createFrameHub = (browser) => {
  // Per tab: the frames alive in it, in the order their wants arrived, and
  // the counter the turn number is drawn from. The book's keys are
  // browser-attested frameIds — 0 is the page's own document — and an
  // entry's life is exactly its port's life.
  const books = new Map();

  // The re-think, after any word: who holds the seat, said to every frame
  // whose answer moved. The seat is a turn across the tab's frames: the
  // oldest ask in force takes it, and only a frame that wants it can hold
  // it. The top document's own film outranks the framed ones — the page
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
        entry.port.postMessage({ type: VERDICT, granted: seated });
      } catch {
        // A mouth that would not carry the news belongs to a frame whose
        // death is already spoken as an event; the book is the truth, and
        // the disconnect that follows will tidy what the throw could not.
      }
    }
  };

  browser.runtime.onConnect.addListener((port) => {
    // The vouching is the whole entrance exam: a port without a tab and a
    // frame named on its envelope is nobody's frame — an extension page's
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
    // way the old rail's re-claim did.
    const entry = { port, want: false, count: 0, granted: false, seat: null };
    table.book.set(frameId, entry);

    port.onMessage.addListener((word) => {
      if (word === null || typeof word !== 'object') return;
      entry.want = Boolean(word.want);
      if (typeof word.count === 'number' && Number.isFinite(word.count)) {
        entry.count = Math.max(0, Math.floor(word.count));
      }
      // The turn is drawn the first time this frame asks to be shown —
      // and since the entry is born again on every reconnect, the draw is
      // the re-entry's own place at the back of the line.
      if (entry.want && entry.seat === null) {
        entry.seat = table.seatNext;
        table.seatNext += 1;
      }
      decide(table);
    });

    port.onDisconnect.addListener(() => {
      // The identity guard on the way out, mirroring the one way in: the
      // book frees a seat when the entry's own port dies. A replaced
      // frame's port may live a teardown longer than its welcome — its
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
    if (word?.type !== STATE_QUERY) return false;
    // A runtime word reaches every ear of the extension — the frames'
    // content scripts included — so the speaker is checked before the
    // answer: only an extension page (the popup, the options) has no tab
    // on its envelope. A frame asking here is answered nothing; the hub
    // alone speaks for the book.
    if (sender?.tab !== undefined) return false;
    const book = books.get(word.tabId)?.book;
    let total = 0;
    if (book !== undefined) {
      for (const entry of book.values()) {
        total += entry.count;
      }
    }
    return Promise.resolve({ videoCount: total });
  });

  // The book is returned for the tests, which stand in for the browser and
  // read the registry by hand; the running extension never needs it.
  return { books };
};
