// The eye at the bus. Every request the tab dishes up crosses this one
// listener — uBO's observation post, borrowed whole and beats shorter:
// nothing is blocked, redirected, rewritten, or answered; the listener
// returns nothing, and the blocking permission beside it in the manifest
// stands for nobody here. What it watches for is a shape: the request the
// network carries *away from* a video — a manifest read, a segment booked,
// an element's own source — bound for a frame the URL never says.
//
// The platform says the rest on its own: `type: 'media'` is the browser
// telling us a `<video>` or `<audio>` element asked for bytes; `type:
// 'xmlhttprequest'` covers the XHR and fetch calls every streaming
// library rides its segments on. `details.frameId` — the frame whose
// document made the request — is attested by the browser, the same trust
// the port's envelope carries, so a strain is written into the hub's book
// under a key nobody can forge.
//
// And the event, like every `onBeforeRequest`, is a push: nothing here
// polls, ever. The stream's own cadence is the heartbeat — a segment
// every few seconds re-crosses the bus, and each crossing is the context
// refreshing itself.

// The corpus of media-shaped words, checked against xmlhttprequest URLs
// only. `media` needs no URL check (the element is its own attestation);
// the corpus exists for the MSE case, where a page script speaks the
// request instead. It is kept deliberately small and cheap — a handful of
// shapes rather than a filter list — because the warm word it feeds is
// a hint by design: the DOM sweep remains the only teller of truth, and a
// wrong warm word costs one popup line, never a badge. Segment formats
// that hide their extension (googlevideo's `videoplayback`, apple's
// `format=m3u8`, the `mime=video/` query family) are named by their query
// marks instead.
const extensions = [
  'm3u8',
  'm3u',
  'mpd',
  'm4s',
  'ts',
  'webm',
  'mp4',
  'mkv',
  'mov',
  'f4m',
  'ism',
  'isml',
];
const marks = ['videoplayback', 'mime=video/', 'mime=audio/', 'format=m3u8'];

export const isMediaShaped = (type, url) => {
  if (type === 'media') return true;
  if (type !== 'xmlhttprequest') return false;
  const bare = url.split('?')[0].toLowerCase();
  const slash = bare.lastIndexOf('.');
  const mark = bare.slice(slash + 1);
  if (slash !== -1 && extensions.includes(mark)) return true;
  const asked = url.toLowerCase();
  return marks.some((word) => asked.includes(word));
};

// The one tap listener the background page stands up, wired from the hub
// with the callback the hub exported its ear to. `browser.webRequest` is
// absent where the permission is not granted or the platform stubbed out —
// a stand-in room that has nothing to hear is wired to nothing, not to a
// crash.
export const createWireTap = (browser, onStrain) => {
  if (browser.webRequest === undefined) return;

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      // A request with no tab behind it — service-worker chatter,
      // speculative connections, the browser's own housekeeping — is no
      // page's film.
      if (details.tabId < 0) return;
      if (!isMediaShaped(details.type, details.url)) return;
      // The ear's evidence rides with the name: where the bytes come from,
      // what spoke for them, the document that owns this frame, and every
      // origin nested above it — all attested by the same envelope that
      // named the frame. It is the dossier's raw material and the
      // recruiter's law, and it costs nothing: the platform listed it
      // before the listener ever ran.
      onStrain(details.tabId, details.frameId, {
        url: details.url,
        resource: details.type,
        doc: details.documentUrl,
        chain: details.frameAncestors ?? [],
      });
    },
    // The types are the whole story: media elements and the script-ridden
    // fetch family. `speculative` above all is left out — Firefox says its
    // tab and frame travel with it unreliably.
    {
      urls: ['<all_urls>'],
      types: ['media', 'xmlhttprequest'],
    },
  );
};
