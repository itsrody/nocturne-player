// The bearer room. The house’s one declared answering mouth on the
// page’s own outgoing asks: where the proxy holds a response at its
// door, this room speaks before the ask leaves — and where the worker
// replays the stream’s word on its own hands, this room replays the
// very same word on the page’s.
//
// The one network allowance the house declares here, and the one
// answer it may say:
//
//   nocturne-privacy-allowance: bearer
//
// It is earned, not widened, and the whole narrowness is the dispatch
// the proxy already keeps, run once more at a second door: only an ask
// bound for an address the cipher room’s ledger holds *sealed*, only a
// room that the book carries a bearer word for, only words the page
// itself said at the stream’s manifest ask — the credentials and the
// site’s own `x-` names, filtered once by the policy every mouth reads
// (`src/lib/bearers.js`). Nothing is invented, no rule is written
// where no word was said, and a miss returns undefined — the native
// ask leaves exactly as the page built it, headers, cookies and all.
//
// Why the page’s ask and not only its response: a player can say its
// credentials at the manifest ask and forget them at the segments’ —
// the segments answer refused, the house holds cipher it cannot
// honestly unseal, and the film the viewer chose not to break stutters.
// The word the manifest ask bore is the word the segment asks lacked;
// carrying it is a replay of the page’s own sentence, never a new one.
import { bearerWords } from '../../lib/bearers.js';

// The words laid onto the ask: the carried words replace their own
// name in place — the ask keeps its own shape, its own order, its own
// every other word — and a name the ask never said is added at the
// tail.
const laid = (ask, words) => {
  const said = ask.slice();
  for (const [name, value] of Object.entries(words)) {
    const at = said.findIndex((one) => one.name.toLowerCase() === name);
    if (at === -1) said.push({ name, value });
    else said[at] = { ...said[at], value };
  }
  return said;
};

export const createBearer = (browser, worker, book) => {
  if (browser?.webRequest?.onBeforeSendHeaders === undefined) return;

  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      // The dispatch, in one sentence: a tab the ask belongs to, an
      // address the ledger seals, and the word the room was said —
      // every miss a null word, and the asks the words stand under
      // answered only where words stand.
      const words =
        details.tabId < 0 ||
        worker?.seals === undefined ||
        !worker.seals(details.url)
          ? null
          : bearerWords(book.said(details.tabId));
      // The one answering return in this room: the ask, its own shape,
      // with the carried words laid onto it. None at all is no answer,
      // the ask leaves untouched.
      return words === null || Object.keys(words).length === 0
        ? undefined
        : { requestHeaders: laid(details.requestHeaders, words) };
    },
    // The types are the story the proxy already knows: the script-ridden
    // fetch family only, and a sealed address is the sole dispatch.
    { urls: ['<all_urls>'], types: ['xmlhttprequest'] },
    ['blocking', 'requestHeaders'],
  );
};
