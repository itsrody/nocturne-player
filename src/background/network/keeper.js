// The keeper — the pin’s own door at the bus, cut to FastStream’s own
// move: a manifest ask the player itself is about to make is *killed*
// and replaced with the house’s answer, so the master the engine is
// born on is ours from byte one. Whatever carried the ask — the page’s
// own network stack, an engine the in-page shim never patched, a frame
// the conscription missed — no longer matters: the ask dies at the
// door and the player reads the reworded bytes believing the origin
// said them.
//
// The narrowness is the point, and its guards say it whole. Only a
// manifest-shaped ask (an m3u8 family address — a master or a variant
// — by the same shape-table the shim’s doors read); only an ask with a
// tab and a frame behind it (the hub’s own hands never cross this
// door); only a frame the book knows, whose viewer asked for the
// player and whose sheet pinned a rung — a master with no pin on it
// belongs to the page, and the door holds it back to nothing but its
// rails. The replace side is the house’s own hands — the same
// `askBytes` the routed asks ride — so the answer, the rewording
// (`rerune`, the sessions room’s own hand) and the miss law are one
// and the same; and where the house cannot reword (no pin, an MPD, a
// miss, a refused read) the promise answers the rails empty and the
// *original* ask flows on unharmed — the door kills nothing it cannot
// replace.
//
// The listener is a blocking one under the platform’s own webRequest
// law (Firefox MV2), and never answers with its own words for an ask
// it did not first hear the origin speak through the reader — the door
// is a seat for the house’s hands, not a mouth for its own.
import { sayEngineShape } from '../../lib/media.js';
import { replayedOn } from '../../lib/bearers.js';
import { rerune } from '../book/sessions.js';

// The manifest family’s own name, said on the replacement so the
// player’s loader reads the bytes as a playlist, not a text file.
const SAY = 'data:application/vnd.apple.mpegurl;base64,';

// The bytes to the name the data door reads: a chunked spelling, since
// a master the house rewords is small but a master is not bounded.
const spell = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const said = [];
  for (let at = 0; at < bytes.length; at += 0x8000) {
    said.push(String.fromCharCode(...bytes.subarray(at, at + 0x8000)));
  }
  return btoa(said.join(''));
};

export const createKeeper = ({ browser, book, worker, debug }) => {
  // One blocking ear at the bus. The pin is read from the book’s room
  // for the ask’s own frame — the room the eye and the sessions keep —
  // and the replace side never blocks the bus past the one promise: a
  // promise that answers the rails empty is the original ask on its
  // way, exactly as the platform expects.
  const hear = (details) => {
    if (details.tabId < 0) return Promise.resolve({});
    const shape = sayEngineShape('xmlhttprequest', details.url);
    if (shape !== 'hls') return Promise.resolve({});
    const entry = book.tableOf(details.tabId).book.get(details.frameId);
    if (
      entry === undefined ||
      entry.want !== true ||
      entry.rung === undefined
    ) {
      return Promise.resolve({});
    }
    const ask = {
      id: 0,
      url: details.url,
      method: 'GET',
      creden: 'same-origin',
      heads: replayedOn([], book.said(details.tabId)),
    };
    return Promise.resolve(worker?.askBytes?.(ask.url, ask) ?? null)
      .then((answer) => {
        const reruned =
          answer === null || answer.bytes === null
            ? null
            : rerune(entry.rung, ask.url, answer);
        if (reruned === null || reruned.bytes === null) {
          debug(
            'the keeper held the ask back to the rails — nothing ours to kill',
            ask.url,
          );
          return {};
        }
        debug('the keeper killed the ask and replaced it', ask.url);
        return { redirectUrl: `${SAY}${spell(reruned.bytes)}` };
      })
      .catch(() => ({}));
  };

  browser.webRequest.onBeforeRequest.addListener(
    hear,
    { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest'] },
    ['blocking'],
  );
};
