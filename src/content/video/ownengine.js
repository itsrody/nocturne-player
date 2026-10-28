// The hatching of the house’s own engine — FastStream’s whole idea of
// playback, cut here: when the site’s engine cannot be found and the
// element cannot play what the page gave it, the house stands its own
// loader — the vendored hls.js — on the element, and fuels it with the
// manifest address the frame already knows. The element never leaves
// the document; the film merely changes whose loader reads it. The
// loader itself is the second vendored room, the pre-buffer: fragments
// read in parallel behind the playhead, held on a bounded shelf, so
// the film plays at the speed of memory where a single stream’s speed
// would have been the ceiling.
//
// The hatch runs in the **page’s own compartment** — by module
// injection, not by sandbox code — and that choice is load-bearing
// twice over. First, the loader’s requests are page-made, so they ride
// exactly what the site’s own loader rides: the routing shim’s door
// where it stands, the bearer’s carried words, the keeper’s pinned
// kill-and-replace at the bus — a sealed stream arrives as plain bytes
// the loader can read, because the hub unseals before the shim
// answers. Second, the page’s `nocturneHls` expando is the engine
// sweep’s own first key, so the quality helm falls to the house the
// moment the loader does: the sheet’s chips walk the real `levels`,
// and no pin, rewording, or reload is ever owed again.
//
// The legitimacy is the arm the cipher feeder earned beside it: an
// *errored* element, and at most one engine per element — a takeover
// never hangs a second loader where one stands, and a fatal error
// puts the element back exactly where the site put it. An asking
// that answered nothing is the walk’s to re-ask at its next beat;
// that is the only retry this room keeps.
import { createDebug } from '../../lib/debug.js';
import { ladderAddressNear } from './ladder.js';
import { pageWindow, toPage } from './pageapi.js';

// The diagnostics voice of the hatching: the stand-up of a loader is
// the one fact this room alone can say.
const debug = createDebug('own-engine');

// The page-side of the hatch: a module script importing the vendored
// loader — and the pre-buffer shelf, whose loader wrapper the engine
// loads through — once per document, and hanging the whole spawn under
// the one name the own engine asks for. The piece runs in the page’s
// world — see the file’s head for why — and its own words are kept
// plain: a fatal failure buries the instance *and* the shelf’s parallel
// orders, restores the element’s own address, and leaves the page
// exactly as it was met.
export const hatchText = (engineUrl, shelfUrl) =>
  [
    `import Hls from '${engineUrl}';`,
    `import { createPrebufLoader } from '${shelfUrl}';`,
    'const Loader = createPrebufLoader(Hls);',
    'window.nocturneHatch = (video, address, original) => {',
    '  const engine = new Hls(Loader ? { loader: Loader } : {});',
    '  engine.on(Hls.Events.ERROR, (event, data) => {',
    '    if (!data || !data.fatal) return;',
    '    try { engine.destroy(); } catch {}',
    '    try { if (original) video.src = original; } catch {}',
    '    try { delete video.nocturneHls; } catch {}',
    '    try { Loader.dispose(); } catch {}',
    '  });',
    '  video.nocturneHls = engine;',
    '  engine.attachMedia(video);',
    '  engine.loadSource(address);',
    '  return engine;',
    '};',
  ].join('\n');

// The vendored rooms’ addresses out of the extension’s own room: the
// engine and the shelf beside it. A caller without the runtime (a test
// runner) answers null, and the default hatching asks nothing of
// nobody.
export const moduleUrls = () => {
  try {
    const runtime = globalThis.browser?.runtime;
    if (typeof runtime?.getURL !== 'function') return null;
    return {
      engine: runtime.getURL('vendor/hls.mjs'),
      shelf: runtime.getURL('vendor/prebuf.mjs'),
    };
  } catch {
    // No runtime here to ask: an honest null.
    return null;
  }
};

// The default spawn: the piece is landed at most once per document,
// then every spawn is a read of the page’s own `nocturneHatch`. A page
// whose binding refused the script answers null — the walk re-asks at
// the next beat, which is the only retry the takeover keeps.
const defaultSpawn = (() => {
  let landed = null;
  const injectPiece = (urls) =>
    new Promise((settled) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = hatchText(urls.engine, urls.shelf);
      script.addEventListener('error', () => settled(false));
      try {
        (document.head ?? document).appendChild(script);
      } catch {
        // A page that would not add the script is one the piece cannot
        // run in; the walk re-asks honestly.
        settled(false);
        return;
      }
      // A module’s imports settle on their own schedule; the promise
      // here only claims the script landed its text at all — the
      // spawn itself asks for the name when it needs it.
      settled(true);
    });
  return (videoReference, absolute, original) => {
    const urls = moduleUrls();
    if (urls === null) return Promise.resolve(null);
    landed ??= injectPiece(urls);
    return landed.then((pieceLanded) => {
      if (pieceLanded !== true) return null;
      try {
        const page = pageWindow();
        if (typeof page?.nocturneHatch !== 'function') return null;
        const run = page.nocturneHatch.wrappedJSObject ?? page.nocturneHatch;
        const plainArgs = [videoReference, absolute, original].map(toPage);
        return Promise.resolve(Reflect.apply(run, page, plainArgs));
      } catch {
        return null;
      }
    });
  };
})();

export const createOwnEngine = ({ spawn } = {}) => {
  // The spawn seam is the tests’ own: the world outside the tests gets
  // the default page-world spawn; a runner injects its own and never
  // touches the runtime or the page.
  const lay = spawn ?? defaultSpawn;

  // The elements the hatch owns, read from the page’s own expando —
  // the one fact the feeder composes with: an element the hatch feeds
  // is named planless there, so a plan arriving late can never hang a
  // second loader on one element.
  const owns = (video) => {
    const key = (video?.wrappedJSObject ?? video)?.nocturneHls;
    return key !== undefined && key !== null;
  };

  const repair = (video, hasPlan) => {
    // The sealed stream is the feeder’s film; the planless one is not.
    if (hasPlan === true || owns(video)) return;
    if (video === null || video?.error === null || video?.error === undefined) {
      return;
    }
    // The address the loader rides: the element’s own saying first —
    // a manifest the page named outright; then the frame’s own
    // ladder, whose key is a master — the `blob:` sites whose element
    // never said the manifest in a name the house could read.
    const attribute = video.getAttribute?.('src');
    const named =
      typeof attribute === 'string' &&
      attribute !== '' &&
      !attribute.startsWith('blob:');
    let raw = named ? attribute : null;
    if (raw === null) {
      const said = video.src;
      raw =
        typeof said === 'string' && said !== '' && !said.startsWith('blob:')
          ? said
          : null;
    }
    if (raw === null) raw = ladderAddressNear(video);
    if (typeof raw !== 'string' || raw === '') {
      debug('the house could not name the stream its own engine would ride');
      return;
    }
    let absolute;
    try {
      absolute = new URL(raw, document.baseURI).href;
    } catch {
      debug('the page’s naming of its own stream said nothing resolvable');
      return;
    }
    // The original the page gave the element: what a fatal failure
    // puts back, said down before the takeover — the attribute as the
    // page named it, and where only a `blob:` is said (an engine the
    // player minted the name for), nothing: there is no source of the
    // page’s own to hand back.
    const original = named ? attribute : '';
    (async () => {
      const engine = await lay(
        video.wrappedJSObject ?? video,
        absolute,
        original,
      );
      if (engine === null) debug('the hatch answered nothing for this element');
      else debug('the house hatches its own engine', absolute);
    })();
  };

  return { repair, owns };
};
