// The wire’s word. The network’s knock, heard from the eye at the bus: a
// media-shaped request crossed the tab’s bus bound for this frame, and
// the ear it comes with — where the bytes came from, what spoke for
// them, and every origin standing above the frame — is the frame’s
// dossier. The warm word is written wherever the frame’s seat stands,
// and where none does a ghost seat is founded — a frame with no script
// behind its document has no port, no want, no count, and only the one
// truth the wire carries: a stream runs here. A wordless crossing (ear
// absent) still warms the seat; the dossier waits for a crossing that
// spoke.
//
// The wake rides the first strain of an entry’s life, and never again:
// a stream in play re-crosses the bus every few seconds by its own
// cadence, and each crossing finds the entry already warm — the word is
// a door-knock, not a heartbeat, because the frame’s sweep runs at the
// knock and its own events (the film’s element landing in the DOM, the
// metadata arriving) are what keep it fresh. The stream being warm
// again for a document born again is exactly the knock the beginner
// deserves: a reconnect replaces the entry, and the next strain knocks
// anew.
import { sayDossier, sayStrain } from '../../lib/protocol.js';

// The verb the eye feeds. Each crossing it hears re-arms the read and
// re-tells the word; the knock it says exactly once, the first time the
// frame’s stream is heard warm.
export const createStrain =
  ({ book, read }) =>
  (tabId, frameId, ear) => {
    const table = book.tableOf(tabId);
    const entry = table.book.get(frameId);
    if (entry === undefined) {
      book.found(tabId, frameId, ear === undefined ? null : sayDossier(ear));
      return;
    }
    // The ear arriving on a seat already founded: a ghost warmed by a
    // wordless crossing, or an entry whose port stands but whose
    // evidence arrives late — both hear it now. And a crossing that
    // names a family upgrades a word that named none: the manifest
    // crossing a warm seat reads from is often its second, the first
    // heard shape being a segment the eye met in the stream’s own
    // cadence. The word is said again only where its predecessor was
    // silent about the family — the frame’s record keeps the latest
    // whole, and the sweep that narrows by it is never answered by a
    // memory that admits it knows nothing.
    if (ear !== undefined) {
      const word = sayDossier(ear);
      const standing = entry.wire;
      if (
        standing === null ||
        (word.shape !== null && standing.shape === null)
      ) {
        entry.wire = word;
        entry.told = false;
        book.tell(entry);
      }
    }
    // The manifest’s own word, read while the generation still owes a
    // try: every crossing the wire hears is the next chance for a read
    // that answered nothing — the cadence is the re-ask’s clock, and
    // the read’s own guards decide what an ask costs. A warm entry
    // earns no second knock; the word alone is worth the re-tell.
    read(entry, tabId, frameId, ear);
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
  };
