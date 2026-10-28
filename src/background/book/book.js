// The book of frames. Per tab: a room — `book` underneath is the frames
// alive in it, in the order their wants arrived, and `seatNext` is the
// counter the turn number is drawn from. The book’s keys are
// browser-attested frameIds — 0 is the page’s own document — and an
// entry’s life is exactly its port’s life: no clock walks the book,
// presence is connectivity, and a frame that reconnects takes a fresh
// entry, because whatever turn it held belonged to a document that has
// gone.
//
// The record itself: the want (the badge asked for), the count (the
// sweep’s ledger), the seat it was drawn, the granted answer in force,
// and the frame’s context — the warmth the wire wrote and the dossier it
// earned, which are the frame’s, not any document’s. The cipher
// choreography’s tally and the word-flags come up zero: a birth owes
// everything afresh.
//
// The bearer word sits on the room, not the frame: per tab, the words
// the page itself said at the stream’s manifest ask — `speak` writes
// them (normalized by the one policy in `src/lib/bearers.js`, so the
// record beneath is always only what a mouth may carry), `said` reads
// them back to every mouth that asks: the worker’s own hands and the
// bearer room’s answer on the page’s own asks. A tab going away wipes
// `books` — and the word with it, nothing swept twice.
import { bearerWords } from '../../lib/bearers.js';

export const createBook = () => {
  const books = new Map();

  // The room, stood on the first word that needs it — a ghost founding,
  // a port connecting, nothing more. One room per tab, never one per
  // word.
  const tableOf = (tabId) => {
    let table = books.get(tabId);
    if (table === undefined) {
      table = { book: new Map(), seatNext: 0, bearer: null };
      books.set(tabId, table);
    }
    return table;
  };

  // The bearer word, said where a crossing that names a family has
  // carried the ask’s own words: normalized here, at the write, so the
  // record beneath can only ever hold the carried words.
  const speak = (tabId, heads) => {
    tableOf(tabId).bearer = bearerWords(heads);
  };

  // The word read back: no room, no word — undefined is the miss the
  // mouths already know how to fetch past.
  const said = (tabId) => books.get(tabId)?.bearer ?? undefined;

  // A frame’s entry, born to the context the frame keeps — never to
  // what any document remembered. A predecessor’s stream warmth and
  // its dossier are the one inheritance a birth takes; every tally and
  // every word-flag starts again.
  const born = ({ predecessor = null, wire = null, stream = false } = {}) => ({
    port: null,
    want: false,
    count: 0,
    granted: false,
    seat: null,
    stream: stream === true || predecessor?.stream === true,
    wire: wire ?? predecessor?.wire ?? null,
    told: false,
    cipherTold: false,
    reads: 0,
    reading: false,
  });

  // A founding: the entry a crossing makes where no frame has ever
  // spoken — the stream runs, by the wire’s own word, whether anybody
  // stands in the document or not.
  const found = (tabId, frameId, wire) => {
    const table = tableOf(tabId);
    table.book.set(frameId, born({ stream: true, wire }));
    return table;
  };

  // An adoption: the entry a reconnecting frame takes — the context is
  // the frame’s, not any document’s, so the warmth and the dossier
  // carry over and nothing else does.
  const adopt = (tabId, frameId) => {
    const table = tableOf(tabId);
    const entry = born({ predecessor: table.book.get(frameId) });
    table.book.set(frameId, entry);
    return { table, entry };
  };

  // The recruiter’s skip-sign: is a field agent’s port standing in this
  // frame already? A ghost seat (no port) never counts as standing, so
  // a frame warm from the wire is still owed its boot — and a stranger
  // frame, never heard of, stands nothing.
  const standing = (tabId, frameId) => {
    const table = books.get(tabId);
    if (table === undefined) return false;
    const entry = table.book.get(frameId);
    return entry !== undefined && entry.port !== null;
  };

  // The dossier rides in once per generation of an entry, whenever both
  // parties to it are finally in the room: the background’s evidence
  // from the bus about this frame’s film, told down the frame’s own
  // port. The two roads that can lead here — a connect before the wire
  // was heard, a wire heard on a frame whose port already stands — are
  // covered by the same flag, so the word is said exactly once and
  // never rehearsed.
  const tell = (entry) => {
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

  return { books, tableOf, born, found, adopt, standing, tell, speak, said };
};
