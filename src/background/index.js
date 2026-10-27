// The background page: the whole machine’s room, now that no page speaks
// first. A persistent background on Firefox MV2 outlives every tab and
// never goes away under the extension, so the machine it hosts keeps for
// the browser’s lifetime of any tab that touches it — no start to await,
// nothing to tear down, and no boot order the pages could postpone
// behind.
//
// Three factories, wired in one direction of dependence. The hub keeps
// the book; the recruiter asks its book whether a frame already stands;
// the eye at the bus hears the wire and speaks to both. The eye’s whole
// duty is the one listener below: a media-shaped request names a frame
// with a dossier in hand, the recruiter says whether the viewer’s law
// admits the tab at all (a disabled host boots nothing and founds no
// ghost either) and boots the field agent into the frame the browser
// named — plus one sweep of the relations when the film turns out to be
// framed — and only the admitted word is written into the book under the
// key the browser attested.
import { createConscript } from './conscript.js';
import { createCipherWorker } from './cipher.js';
import { createFrameHub } from './hub.js';
import { createWireTap } from './network.js';
import { LEGACY_OPENINGS_KEY } from '../lib/words.js';

// The cipher’s room rides the hub like the book does: the hub is the
// only mouth the frames speak through, so the worker’s two verbs —
// read a manifest, give one segment — are the hub’s calls, never the
// pages'.
const hub = createFrameHub(browser, createCipherWorker());
const conscript = createConscript(browser, { standing: hub.standing });

createWireTap(browser, (tabId, frameId, ear) => {
  conscript.rally(tabId, frameId, ear).then((admitted) => {
    if (admitted) hub.strain(tabId, frameId, ear);
  });
});

// The player no longer learns openings, but releases before this one kept
// what they heard in the extension’s own storage. The background removes
// the dead key once per background birth: a device that ever carried the
// learned openings ends up without them, quietly, by the time the viewer
// notices anything — and no page code now runs to sweep it, since no page
// code runs anywhere unless the wire conscripted it.
browser.storage.local.remove(LEGACY_OPENINGS_KEY).catch(() => {});
