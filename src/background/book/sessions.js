// The runtime channel, in the one room the pages cannot enter. A
// background page on Firefox MV2 is persistent — it outlives every tab
// and never goes away under the extension — and the runtime channel it
// shares with a content script is the platform’s own wire: a page cannot
// spell a runtime message, and the browser attests to every port who is
// speaking. `sender.tab` and `sender.frameId` arrive read-only facts,
// not claims. That is why nothing here re-proves what it hears — the
// whole apparatus the page wire demanded was the price of talking
// through windows the pages own, and identity on this wire is read off
// the envelope.
//
// Death, too, is spoken. A content script’s port fires `onDisconnect`
// the moment its document is torn down — a navigation, an iframe lifted
// out of the tree, a tab closed — so the book of frames is never asked
// to guess a frame’s fate from its silence.
//
// The frames keep everything a frame alone can do — the sweep for
// films, the badge, the session — because the background has no
// document and none of that work exists anywhere else. What lives here
// is the carrying: which words a frame says arrive through this room,
// and which words of the house go back down.
import { replayedOn } from '../../lib/bearers.js';
import {
  asCipherAsk,
  asLine,
  asReport,
  asRouteAsk,
  asStateQuery,
  sayCipherBytes,
  sayRouteBow,
  sayRouteBytes,
} from '../../lib/protocol.js';

// The miss streak a frame’s routing may total before the hub says the
// stand-down: eight answers’ worth of “the origin said no to the
// house’s hands” is not a network hiccup, it is a stream the house
// cannot serve — a key server the hand cannot reach, a checksum the
// origin refuses cross-compartment. The number says *streak*, not
// lifetime: one success puts the count back to nothing, and a stream
// that answers the house is a stream the house keeps serving.
const MAX_MISSES = 8;

// The honest miss the count reads: a status the wire itself invented —
// zero, nothing crossed — beside no bytes.
const miss = { status: 0, bytes: null, heads: [] };

// The rooms wired: the book the entries live in, the seat asked after
// every word that moves an answer, the reader that carries the cipher
// choreography, and the popup’s one answer. A channel with no worker
// answers every cipher ask with an honest null — nothing here throws.
export const createSessions = ({
  browser,
  book,
  worker,
  read,
  decide,
  answerState,
}) => {
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

    // A frame that reconnects — its document was remade while the tab
    // lived on — takes a fresh entry: whatever turn it held belonged to
    // a document that has gone, and it re-enters the queue at the back,
    // the way the old rail’s re-claim did. What it adopts with it is
    // the frame’s context, kept by the book — the dossier starts its
    // life untold, told again to whoever now holds the seat.
    const { table, entry } = book.adopt(tabId, frameId);
    entry.port = port;
    book.tell(entry);

    // A ghost seat the manifest warmed hears its cipher the moment a
    // hand comes home: the crossing is read from the word the seat was
    // warmed with, not from any fresh fetch the wire owes again.
    read(entry, tabId, frameId, entry.wire);

    port.onMessage.addListener((word) => {
      // The frame’s diagnostics line, printed in the background’s own
      // console with the frame’s coordinates at its head: the one room
      // where every frame’s words stand in a single scroll, and the one
      // console the viewer’s devtools can be opened on for the frames
      // whose own console will not cooperate. The word only ever
      // arrives while the viewer’s switch is on — off, nothing crosses,
      // and the hub is no recorder of what it did not hear.
      const line = asLine(word);
      if (line !== null) {
        console.info(`Nocturne: [tab ${tabId} frame ${frameId}] ${line.text}`);
        return;
      }
      // The cipher’s ask rides the same port as the report: the frame
      // holds the plan, and the bytes it cannot fetch itself are asked
      // for one address at a time, answered with clonable bytes — or
      // with an honest null, when the fetch failed or the reading
      // threw, for the worker misses are answers, never errors.
      const segment = asCipherAsk(word);
      if (segment !== null) {
        Promise.resolve(
          worker?.giveSegment?.(segment.url, book.said(tabId)) ?? null,
        )
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
      // A routed ask: the film frame’s shim caught a media ask the
      // page’s own player built, and the house’s hands speak it. The
      // film-only law is told twice — the shim only arms where the
      // walk confirmed a film, and here the ask is refused again while
      // this frame’s entry does not carry the want — so no frame can
      // found a seat and route through a book its viewer never chose.
      // A refusal is also answered: the honest miss, spoken straight
      // back, so the shim’s fallback takes it the same beat — a want
      // the film let go of must never turn into thirty seconds of
      // hanging per ask.
      const routed = asRouteAsk(word);
      if (routed !== null) {
        if (entry.want !== true) {
          try {
            port.postMessage(
              sayRouteBytes(routed.id, routed.url, 0, null, null),
            );
          } catch {
            // A mouth gone dead mid-answer belongs to a death the
            // disconnect has already spoken.
          }
          return;
        }
        // The replay law, applied at the hub’s hearing as well as the
        // shim’s saying: the ask’s own words replayed, the room’s
        // carried word filling where the ask forgot. One policy file,
        // and the hub does not hold a second copy of the law — a word
        // nobody said is replayed by nobody.
        const replayed = {
          ...routed,
          heads: replayedOn(routed.heads, book.said(tabId)),
        };
        Promise.resolve(worker?.askBytes?.(replayed.url, replayed) ?? miss)
          .then((answer) => {
            // The miss streak: a stream whose every answer comes back
            // a miss — the origin refusing, a key server the hands
            // cannot reach — is a stream this frame should not be
            // standing between. The hub counts the streak and, once it
            // is long enough to mean something, says the stand-down:
            // the shim bows, the page’s own asks flow, the film plays
            // the way the page itself could play it. A success puts
            // the count back to nothing — a stream that answers the
            // house is a stream the house keeps serving.
            if (answer.status === 0 || answer.bytes === null) {
              entry.misses = (entry.misses ?? 0) + 1;
            } else {
              entry.misses = 0;
            }
            try {
              if (entry.want === true && entry.misses >= MAX_MISSES) {
                port.postMessage(sayRouteBow());
              }
            } catch {
              // A mouth gone dead mid-word belongs to a death the
              // disconnect has already spoken.
            }
            try {
              port.postMessage(
                sayRouteBytes(
                  replayed.id,
                  replayed.url,
                  answer.status,
                  answer.contentType,
                  answer.bytes,
                  answer.heads ?? [],
                ),
              );
            } catch {
              // A mouth gone dead mid-answer belongs to a death the
              // disconnect has already spoken.
            }
          })
          .catch(() => {
            try {
              port.postMessage(
                sayRouteBytes(replayed.id, replayed.url, 0, null, null),
              );
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
        book.books.delete(tabId);
      } else {
        decide(table);
      }
    });
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    book.books.delete(tabId);
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
    return Promise.resolve(answerState(book.books, ask.tabId));
  });
};
