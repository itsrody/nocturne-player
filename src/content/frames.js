// Two films on one screen — the page's own and one inside an iframe — each
// used to mount a badge: every frame was blind to the others. One badge is
// the one the viewer can aim at, so the frames take turns through the top
// frame: the one window every frame can already write to, however deep the
// nesting and however much the page between them would rather not be read.
//
// A frame that wants the screen posts a claim, tagged with a ticket it drew
// at boot, and repeats the claim until there is news; the top frame keeps
// the claims it hears, forgets the ones gone quiet, and seats at most one
// frame at a time — itself first, then the oldest claim still alive. A
// verdict tells each claimant whether the seat is its own.
//
// Everything in flight here passes through windows the pages own, so a page
// could hear the words and forge a verdict. What such a forgery buys is a
// badge drawn or withheld — which a page could bring about with a style rule
// on its own content all the same. The ticket filters out everything the
// protocol did not itself put on the wire.
const TAG = 'nocturneClaim';
const RENEW_MS = 2000;
const STALE_MS = 6000;

export const mintTicket = () =>
  `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;

export const isTopFrame = () => window.top === window;

// One end of the protocol: lives in every frame but the top one, and learns
// whether the seat is its own.
export const createClaimant = (home, ticket, onVerdict) => {
  let want = false;
  let renewTimer = null;

  const tell = () => {
    try {
      home.top.postMessage({ [TAG]: ticket, want }, '*');
    } catch {
      // A window that went away with the page. A claim that cannot be sent
      // has no consequence the next claim cannot repair.
    }
  };

  const renew = () => {
    renewTimer = null;
    tell();
    renewTimer = setTimeout(renew, RENEW_MS);
  };

  const setWant = (next) => {
    if (next === want) return;
    want = next;
    if (renewTimer !== null) {
      clearTimeout(renewTimer);
      renewTimer = null;
    }
    tell();
    if (want) renewTimer = setTimeout(renew, RENEW_MS);
  };

  home.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    // Verdicts name the ticket they answer to, and come from the judge
    // alone. A claim the page makes up with our words does not carry (or
    // cannot answer for) a ticket it was not given.
    if (data[TAG] !== ticket) return;
    if (event.source !== home.top) return;
    onVerdict(Boolean(data.granted));
  });

  return { setWant };
};

// The other end: lives in the top frame, hears the claims and seats one
// claimant at a time.
export const createJudge = (home, { ownWant = null, now = Date.now } = {}) => {
  // Ticket first in, seated first: the map keeps insertion order, and a
  // claimant that stays alive keeps its place even while renewing.
  const claims = new Map();

  const decide = () => {
    const at = now();
    for (const [ticket, claim] of claims) {
      if (claim.want && at - claim.renewedAt <= STALE_MS) continue;
      // A claim leaving the race — withdrawn, or gone quiet beyond its
      // window — still owes the claimant the news that the seat left it,
      // because a claimant that was seated keeps believing it is until a
      // verdict says otherwise. A claimant that cannot be told is one that
      // is gone, and its claim can go with it.
      if (claim.granted) {
        try {
          claim.source.postMessage({ [TAG]: ticket, granted: false }, '*');
        } catch {
          // The claimant is closing behind our back; it will not need news.
        }
      }
      claims.delete(ticket);
    }

    // The top frame's own film outranks any framed one: the page put it
    // there to be seen as the page. The seat clears when every claimant has
    // gone quiet.
    const supreme = ownWant !== null && Boolean(ownWant());
    const waiting = claims.keys().next().value ?? null;
    const winner = supreme ? null : waiting;

    for (const [ticket, claim] of claims) {
      const seated = ticket === winner;
      if (claim.granted === seated) continue;
      claim.granted = seated;
      try {
        claim.source.postMessage({ [TAG]: ticket, granted: seated }, '*');
      } catch {
        // The claimant is closing behind our back; it will not need news.
        claims.delete(ticket);
      }
    }
  };

  home.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object') return;
    const ticket = data[TAG];
    if (typeof ticket !== 'string' || ticket === '') return;
    const previous = claims.get(ticket);
    claims.set(ticket, {
      source: event.source,
      want: Boolean(data.want),
      renewedAt: now(),
      granted: previous === undefined ? false : previous.granted,
    });
    decide();
  });

  return { decide };
};
