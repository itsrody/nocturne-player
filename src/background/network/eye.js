// The eye at the bus. Every request the tab dishes up crosses this one
// listener — uBO’s observation post, borrowed whole and beats shorter:
// nothing is blocked, redirected, rewritten, or answered; the listener
// returns nothing, and the blocking permission beside it in the manifest
// stands for nobody in *this* room. The ear stands at the
// `onBeforeSendHeaders` door — the only door the platform tells the
// page’s own words to (`requestHeaders` refused as a spec value at the
// request door is the platform’s own error, a crash at registration
// time) — and it reads everything here it ever read before the words
// were owed: the `onBeforeSendHeaders` details carry the same attested
// facts the request door did. What it watches for is a shape: the
// request the network carries *away from* a video — a manifest read, a
// segment booked, an element’s own source — bound for a frame the URL
// never says. The rooms beside this one — `proxy.js` and `bearer.js` —
// are where the wire is spoken to, and only there, under their own
// declared allowances.
//
// The platform says the rest on its own: `type: 'media'` is the browser
// telling us a `<video>` or `<audio>` element asked for bytes; `type:
// 'xmlhttprequest'` covers the XHR and fetch calls every streaming
// library rides its segments on. `details.frameId` — the frame whose
// document made the request — is attested by the browser, the same trust
// the port’s envelope carries, so a strain is written into the hub’s book
// under a key nobody can forge.
//
// And the event, like every `onBeforeSendHeaders`, is a push: nothing here
// polls, ever. The stream’s own cadence is the heartbeat — a segment
// every few seconds re-crosses the bus, and each crossing is the context
// refreshing itself.

import { isMediaShaped, sayEngineShape } from '../../lib/media.js';
// The one tap listener the background page stands up, wired from the hub
// with the callback the hub exported its ear to. `browser.webRequest` is
// absent where the permission is not granted or the platform stubbed out —
// a stand-in room that has nothing to hear is wired to nothing, not to a
// crash.
export const createWireTap = (browser, onStrain) => {
  if (browser.webRequest === undefined) return;
  if (browser.webRequest.onBeforeSendHeaders === undefined) return;

  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      // A request with no tab behind it — service-worker chatter,
      // speculative connections, the browser’s own housekeeping — is no
      // page’s film.
      if (details.tabId < 0) return;
      if (!isMediaShaped(details.type, details.url)) return;
      // The ear’s evidence rides with the name: where the bytes come from,
      // what spoke for them, the document that owns this frame, and every
      // origin nested above it — all attested by the same envelope that
      // named the frame. It is the dossier’s raw material and the
      // recruiter’s law, and it costs nothing: the platform listed it
      // before the listener ever ran.
      onStrain(details.tabId, details.frameId, {
        url: details.url,
        resource: details.type,
        doc: details.documentUrl,
        chain: details.frameAncestors ?? [],
        // The family the crossing’s URL names, when it names one: the
        // sweep’s narrowing begins here, from the corpus the eye owns.
        shape: sayEngineShape(details.type, details.url),
        // The page’s own words on the ask, when the spec asked for
        // them: the bearer word’s raw material. Evidence only, like
        // the rest of the ear — the dossier’s whitelist keeps them out
        // of what rides down to the frame, and the mouths that carry
        // them answer only by the book’s own word.
        heads: details.requestHeaders,
      });
    },
    // The types are the whole story: media elements and the script-ridden
    // fetch family. `speculative` above all is left out — Firefox says its
    // tab and frame travel with it unreliably. The spec beneath the types
    // names the one extra reading the ear asks for: the page’s own words
    // on the ask — evidence still, never an answer, and nothing is
    // returned from this listener ever.
    {
      urls: ['<all_urls>'],
      types: ['media', 'xmlhttprequest'],
    },
    ['requestHeaders'],
  );
};
