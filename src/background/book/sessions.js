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
import { readManifest, keepVariant } from '../cipher/manifest.js';
import { sayEngineShape } from '../../lib/media.js';
import {
  asCipherAsk,
  asLine,
  asReport,
  asRouteAsk,
  asRouteRung,
  asStateQuery,
  sayCipherBytes,
  sayLadder,
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

// The ladder’s own quote, taken from bytes already on hand: a routed
// manifest ask was answered by the house’s hands, and its body spells
// the stream — a master’s variant list, an MPD’s representations. This
// is the read that cannot miss: no second fetch, no cadence, no budget
// waiting on a read in flight — the ask the player itself caught is
// the catch the ladder is quoted at, and it is robust exactly because
// it rides the answer the player would have read anyway. A body that
// parses to nothing answers nothing; the read beside it is still the
// choreography for the seal’s own truth.
const quoteLadder = (url, answer) => {
  try {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(answer.bytes));
    const read = readManifest(text, url);
    if (read === null) return null;
    if (read.isMaster === true || read.mpd === true) return read.variants;
    return null;
  } catch {
    return null;
  }
};

// The honest miss the count reads: a status the wire itself invented —
// zero, nothing crossed — beside no bytes.
const miss = { status: 0, bytes: null, heads: [] };

// The pin’s own hand at the hub: an answer whose bytes spell a master
// playlist, reworded to the one variant the sheet pinned — every other
// STREAM-INF pair out, everything else carried across. A pin whose
// variant is no longer on the master, a text the read refused, an
// encoding that would not decode — all answer null, the whole master
// served unharmed. The reworded length is the reworded bytes’ own: the
// origin’s content-length row was said for a different body and is
// named no more. Exported for one other ear: the keeper at the bus,
// which rewords the ask it kills-and-replaces with the same hand.
export const rerune = (rung, url, answer) => {
  try {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(answer.bytes));
    const read = readManifest(text, url);
    if (read === null || read.isMaster !== true) return null;
    const wanted = read.variants[Number(rung)];
    if (wanted === undefined) return null;
    const kept = keepVariant(text, url, wanted.url);
    if (kept === null) return null;
    return {
      ...answer,
      bytes: new TextEncoder().encode(kept).buffer,
      heads: answer.heads.filter(
        (one) => one.name.toLowerCase() !== 'content-length',
      ),
    };
  } catch {
    return null;
  }
};

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
      // A rung’s pin, said up by the sheet once the viewer has tagged a
      // rung of the stream’s own ladder: the hub rewords its master
      // answers to that variant until the pin is lifted — the viewer’s
      // choice, carried on the frame’s own entry, which is the entry’s
      // not any document’s. Nothing is answered here; the choice lands
      // at the next manifest read, the way the stream’s own cadence
      // pays for it.
      const rung = asRouteRung(word);
      if (rung !== null) {
        if (rung.id === null) delete entry.rung;
        else entry.rung = rung.id;
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
        // The read starts at the catch, not at the bus: a manifest
        // ask means the frame’s own player is naming its stream, and
        // this is the earliest, most certain beat the cipher’s
        // choreography can run at — long before the eye at the bus
        // may catch the same crossing, if it ever does (an ask the
        // routing carries needs no second flight over the bus). The
        // reader’s own guards decide what it costs: the budget, the
        // in-flight flag, the same cadence re-asks the shim’s next
        // replay pays. The ask itself rides the answering hands below
        // regardless — the read and the ask share a door, not a
        // request.
        read(entry, tabId, frameId, {
          url: routed.url,
          shape: sayEngineShape('xmlhttprequest', routed.url),
        });
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
            // The ladder’s quote at the catch: the ask the player
            // itself caught was just answered by hands the house
            // trusts — if its body spells a manifest, the stream’s
            // own rungs are on hand right here, and the word rides
            // down without any read at all. Once per entry: a master
            // re-asked says nothing the sheet has not already hung.
            if (
              entry.ladderTold !== true &&
              answer.bytes !== null &&
              sayEngineShape('xmlhttprequest', replayed.url) !== null
            ) {
              const ladder = quoteLadder(replayed.url, answer);
              if (ladder !== null && ladder.length > 0) {
                entry.ladderTold = true;
                try {
                  port.postMessage(sayLadder(replayed.url, ladder));
                } catch {
                  // A mouth gone dead mid-word belongs to a death the
                  // disconnect has already spoken.
                }
              }
            }

            // The pinned rung: the hub rewords the answer before the
            // word rides down, when the sheet has pinned one and the
            // body spells a master. The reworded body is still clonable
            // bytes the shim’s own reader trusts — nothing here throws
            // at the shim.
            let said = answer;
            if (entry.rung !== undefined && answer.bytes !== null) {
              const reruned = rerune(entry.rung, replayed.url, answer);
              if (reruned !== null) said = reruned;
            }
            try {
              port.postMessage(
                sayRouteBytes(
                  replayed.id,
                  replayed.url,
                  said.status,
                  said.contentType,
                  said.bytes,
                  said.heads ?? [],
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
