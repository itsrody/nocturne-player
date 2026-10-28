// The cipher’s choreography, in the book’s own room. A crossing that
// names the hls family is worth the background’s fetch — its hands
// alone can read the manifest’s key decree without the page’s CORS —
// and the word answers only where a good generation stands: a ghost
// seat (no port behind the document) is never fed, for whatever the
// plan needs, only a frame with hands of its own can ask for.
import { sayCipher, sayCipherPlan } from '../../lib/protocol.js';

// The reads a generation is owed: one in earnest, and two more that the
// stream’s own cadence pays for — a stream in play re-crosses the bus
// every few seconds, and each crossing is the next chance for a read
// that answered nothing to be asked again. No clocks anywhere: the
// cadence is the heartbeat it always was, and the budget is the walk’s
// old discipline — a promise made at most a small, counted number of
// times, never forever.
const MAX_READS = 3;

// The read, asked for a generation while the budget still holds. The
// word is told by its answer, never by its ask: a read that answers
// nothing was not read, so the tally keeps a try up its sleeve and
// the stream’s next crossing is the re-ask. The crossing it is read
// from is the shape-and-url word the wire carried — the ear itself,
// or the dossier a ghost held onto until someone came home to ask.
export const createReader =
  (worker, book) => async (entry, tabId, frameId, crossing) => {
    if (worker === null || entry.port === null) return;
    if (crossing?.shape !== 'hls' || typeof crossing.url !== 'string') return;
    // The reading flag is the in-flight guard: the cadence’s next
    // crossing must wait out the ask it follows, not stack a second
    // fetch beside it.
    if (entry.cipherTold || entry.reading || entry.reads >= MAX_READS) return;
    entry.reads += 1;
    entry.reading = true;
    try {
      // The hands carry the room’s bearer word — the page’s own words
      // on the manifest ask, said into the book by the wiring — so a
      // stream whose manifest answers only a worded hand is read at
      // all. A miss fetches bare-handed, as it always was.
      const answer = await worker.readCipher(crossing.url, book.said(tabId));
      const table = book.books.get(tabId);
      if (table?.book.get(frameId) !== entry) return;
      // A manifest with no cipher decree says nothing: no word, at all —
      // and no word said, the tally is spent but the word waits for the
      // next crossing within the budget.
      if (answer === null) return;
      entry.cipherTold = true;
      entry.port.postMessage(sayCipher(answer.cipher, crossing.url));
      if (answer.plan !== null) {
        entry.port.postMessage(sayCipherPlan(answer.plan));
      }
    } catch {
      // The read is a hint by design: a dead fetch is a stream the
      // frame plays as it always did, and a mouthless port is a death
      // the disconnect has already spoken.
    } finally {
      entry.reading = false;
    }
  };
