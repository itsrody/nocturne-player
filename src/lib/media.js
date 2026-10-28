// The corpus of media-shaped words — the pure vocabulary the eye at the
// bus and the routing shim in the film frame both read. It lives here
// because it is arithmetic on a URL and nothing else: no `webRequest`,
// no port, no page object, no storage. The background reads it where it
// names what crossed the bus; the frame reads it where it decides which
// of the page’s own asks the house’s hands will carry.
//
// `media` needs no URL check (the element is its own attestation); the
// corpus exists for the MSE case, where a page script speaks the request
// instead. It is kept deliberately small and cheap — a handful of shapes
// rather than a filter list — because the warm word it feeds is a hint
// by design: the DOM sweep remains the only teller of truth, and a wrong
// warm word costs one popup line, never a badge. Segment formats that
// hide their extension (googlevideo’s `videoplayback`, apple’s
// `format=m3u8`, the `mime=video/` query family) are named by their
// query marks instead.
export const extensions = [
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
export const marks = [
  'videoplayback',
  'mime=video/',
  'mime=audio/',
  'format=m3u8',
];

// The two readings a URL answers its question with: the path inside the
// query’s first door, and the extension that closes it.
export const bareOf = (url) => url.split('?')[0].toLowerCase();
export const extensionOf = (bare) => {
  const slash = bare.lastIndexOf('.');
  return slash === -1 ? '' : bare.slice(slash + 1);
};

export const isMediaShaped = (type, url) => {
  if (type === 'media') return true;
  if (type !== 'xmlhttprequest') return false;
  if (extensions.includes(extensionOf(bareOf(url)))) return true;
  const asked = url.toLowerCase();
  return marks.some((word) => asked.includes(word));
};

// The manifest formats whose crossings name a family in the engine
// sweep’s own words (`hls`, `dash`, `mss` — see the protocol’s SHAPES).
// Segment shapes name no family: mpeg-dash’s and hls.js’s segment
// corpora are the same three letters, an element’s own load is a browser
// act no script engine stands behind, and a plain video URL on the fetch
// family is a page buffering it itself. A family absent from the answer
// is honest absence, and the sweep falls back to the whole matcher set
// when the family it was hinted comes up with nothing.
const FAMILY_EXTENSIONS = {
  m3u8: 'hls',
  m3u: 'hls',
  mpd: 'dash',
  ism: 'mss',
  isml: 'mss',
  f4m: 'mss',
};
const FAMILY_MARKS = {
  'format=m3u8': 'hls',
};

export const sayEngineShape = (type, url) => {
  if (type !== 'xmlhttprequest') return null;
  const family = FAMILY_EXTENSIONS[extensionOf(bareOf(url))];
  if (family !== undefined) return family;
  const asked = url.toLowerCase();
  for (const [mark, family] of Object.entries(FAMILY_MARKS)) {
    if (asked.includes(mark)) return family;
  }
  return null;
};
