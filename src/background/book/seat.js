// The seat. The book of frames is answering one question a frame asks
// with its whole term — may I show the badge — and this is the one
// re-think of it, made after any word that moves an answer: who holds
// the seat, said to every frame whose answer moved.
//
// The seat is a turn across the tab’s frames: the oldest ask in force
// takes it, and only a frame that wants it can hold it. The top
// document’s own film outranks the framed ones — the page put it there
// to be seen as the page — so while the top wants, no framed film holds
// the seat.
import { sayVerdict } from '../../lib/protocol.js';

export const decide = (table) => {
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
