// The recruiter. Nothing in this extension runs in a page any more unless
// the wire said so: the manifest's content script is gone, and a frame is
// armed the moment a media-shaped request crosses the tab's bus bound for
// it — the field agent executed into exactly that frame, the relations
// swept once when the film turns out to be framed, and the viewer's own
// law consulted before any of it. An ordinary page carries no script of
// ours at all; a film frame is booted by the background that saw it, into
// the frame the browser itself named, with `tabs.executeScript` aimed by
// frameId — the same browser-attested identity the hub's book is keyed on.
//
// The law is the hub's, held here: a host the viewer switched off gets
// nothing — no boot, and the hub hears no strain either, so no ghost seat
// is ever founded on a page the viewer disabled. The mirror is kept as a
// plain object refreshed by the storage events settings already emit, so
// the gate never waits on storage in the wire's hot path: a playing
// stream re-crosses the bus every few seconds, and each crossing must
// cost no more than the check it earns.
import { chainHosts } from '../lib/chain.js';
import {
  isHostEnabled,
  onSettingsChanged,
  readSettings,
} from '../lib/settings.js';

const FIELD = '/content.js';

export const createConscript = (browser, { standing }) => {
  // The settings mirror: read once at birth, refreshed by every change.
  // Until the first read answers, the gate waits on the same promise —
  // the one boot queue of the extension's life — and not on every strain
  // after it.
  let current = null;
  const mirrored = readSettings().then((settings) => {
    current = settings;
    return settings;
  });
  onSettingsChanged((next) => {
    current = next;
  });

  // The frame's own file of names, told the same way a frame reads its
  // own: the host of the request's document first, then every origin
  // above it, nearest first. A top-level load's envelope carries no
  // document url of its own — the tab's own url is the browser's word
  // for the same room — and a document that names nobody (about:srcdoc,
  // an opaque origin) defers to the named ancestors above it, exactly as
  // the frame's own law does.
  const lawOf = async (tabId, ear) => {
    let doc = ear?.doc;
    if (typeof doc !== 'string') {
      try {
        const tab = await browser.tabs.get(tabId);
        doc = tab?.url;
      } catch {
        // A tab already gone has no url to ask for; the chain the ear
        // carried, if any, still speaks below.
      }
    }
    let host = '';
    try {
      host = new URL(doc).host;
    } catch {
      // An absent or unreadable document names itself nobody.
    }
    return chainHosts({ host, ancestorOrigins: ear?.chain ?? [] });
  };

  // One boot: the field agent into one subject of one tab. The catch
  // is quiet on purpose — a frame gone away mid-boot (a navigation
  // racing the strain) is told again by the next crossing, and a room
  // the platform refuses (a file url without the grant, a privileged
  // page) was never ours to enter. The run is at `document_start`,
  // deliberately: the boot itself is the catch — a page whose first
  // media ask fired while it was still parsing gets its field agent
  // standing before the page’s own player does, and the routing’s
  // arms are laid on the natives before the player’s first manifest
  // ask is built. Waiting out idle would mean the first ask — the
  // very request that proved the film — was never ours to rout, and
  // every later beat would arrive a second late.
  const boot = (tabId, subject) =>
    browser.tabs
      .executeScript(tabId, {
        file: FIELD,
        ...subject,
        runAt: 'document_start',
      })
      .catch(() => {});

  // The conscription proper. Answers whether the wire's tab is admitted
  // at all — the hub's strain is written only for admitted tabs, and
  // this answer is the difference.
  const rally = async (tabId, frameId, ear) => {
    // The mirror if it has settled, else the same read it settles from:
    // no strain is ever gated by an unsettled mirror.
    const settings = current === null ? await mirrored : current;
    const hosts = await lawOf(tabId, ear);
    const admitted = hosts.every((host) => isHostEnabled(settings, host));
    if (!admitted) return false;

    // The film's own frame, named exactly by the wire: one executeScript
    // at one frameId, `matchAboutBlank` opening the embeds the manifest's
    // script never reached. The standing question first — a port already
    // there means the agent already is, and the stream's own cadence
    // finds the seat taken and pays nothing.
    const fresh = standing(tabId, frameId)
      ? false
      : await boot(tabId, { frameId, matchAboutBlank: true });

    // The relay round, minted only for a newcomer: every document of the
    // chain a film is framed by takes one sweep, because widening an
    // element means widening it in every document between the film and
    // the eye — work the runtime cannot reach into a stranger's document
    // to do, so the keepers must stand there to begin with. The sweep
    // speaks `allFrames`, with no ancestor frameIds to name: the
    // platform lists none without the webNavigation permission, and the
    // bundle's boot flag (one shared isolated world per frame) is the
    // dedupe that keeps a repeat sweep paying one parse per fielded
    // frame and nothing more. `matchAboutBlank` is left off the round:
    // the documents a keeper is owed in are the http ones the manifest's
    // script once stood in, and an about: guest was never a relay's
    // home. A document that gained a new ancestor since the last fresh
    // boot waits for the next film to arrive — the honest cost of the
    // frame list we do not carry.
    if (fresh && (ear?.chain?.length ?? 0) > 0) {
      boot(tabId, { allFrames: true });
    }
    return true;
  };

  return { rally };
};
