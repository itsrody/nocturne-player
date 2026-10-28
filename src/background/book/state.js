// The popup’s one question and the hub’s alone to answer: how many films
// the whole tab holds, and how many frames stream one the count cannot
// confirm. The book is the hot record — read fresh from it whenever the
// question arrives, nothing here caching an answer a disconnect would
// leave behind.
export const answerState = (books, tabId) => {
  const book = books.get(tabId)?.book;
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
  return { videoCount: total, streams };
};
