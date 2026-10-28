# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased][unreleased]

### Added

- **A settings page.** Everything the extension remembers is now reachable
  from Firefox’s own settings UI: the picture’s four dials, the gesture
  feel (double-tap seek, hold speed), the subtitle scale, and the switches
  — calm screen, native subtitles, and the diagnostics switch with a
  spoken explanation, the first place `debugMode` has had a face. The
  page answers as the dials move (storage sees the settled answer), and it
  agrees with the popup and with its other copies through the settings
  bus — a control the hand is holding never fights it, and the whole
  switched-off site list gets a row with an Enable button each. The reset
  asks twice before it wipes, armed by the first click and disarmed by the
  second or by time; it has always been the one button that erases
  everything, and it is heavier for the colour choices the page now holds.
  The popup keeps its per-site job and opens the page through the toolbar
  with "More settings…" — no new permission.
- **The system’s media controls run the player.** While the player holds the
  film, the Android notification controls and the desktop media keys speak to
  it: play and pause, stepping forward and back by ten seconds, any position
  by name, and stop closes the player. The film’s name and artwork are what
  the page itself declares.
- **Three zones, one everywhere.** The picture reads as just what it is:
  left, middle and right, full height, no more guessed bands. Every
  anywhere-gesture — hold, the pull to dismiss, the horizontal scrub —
  works wherever the finger starts; every tap toggles the controls; and
  the seek bar is a real element that answers for its own taps and drags
  instead of a region the player guessed at.
- **A mouse over the picture keeps the controls up.** On a desktop, moving
  the pointer over the film holds them and rewinds their idle fade with the
  pointer; a tap still brings them, and a finger’s drift does not.
- **Swipe down puts the player away.** The whole player follows the finger
  down the screen like a sheet being put away, and the film goes back to the
  page with it. The pull leaves the player out the moment it passes a third
  of the screen’s height, or when it is flung at the lift; a shorter, slower
  pull snaps back where it was. Downward used to mean the video before in
  feed pages; down now always means out. An upward drag is now a dead lift,
  the feed stepping it used to ask for being cut.
- **A playback head on the seek bar.** A white ball rides the tip of the
  line as the film runs, glides between the timeline’s own updates, and
  grows under the finger while a scrub is under way. It is itself a second
  way to scrub: grab the ball and pull, and the film follows it one-to-one
  from where it stands — no jump at the grab, the same lean-away precision,
  and the controls hold on for as long as the ball is held.
- **Tapping the bar jumps.** With the controls out, a tap anywhere on the
  seek bar plays the moment under the finger — read from where the finger
  settled when the tap completed, so a thumb’s slide during the tap still
  aims at the resting spot, and the ask is bounded by the film’s own
  seekable range, so a streamed film lands where it was pointed instead of
  falling short and walking the ruler back. With the controls away the same
  tap is still the one that brings them.
- **The scrub is its own everywhere gesture.** A horizontal drag on any part
  of the picture scrubs the film exactly as grabbing the bar always did,
  with the finger’s lean away from its own start trading reach for
  precision. A drag that lifts before it has engaged is a tap — including
  on the bar itself, where a drifting tap used to be able to shove a long
  film by minutes.
- A record of the platform floor’s decisions and rejections lives in
  `docs/platform-158.md`.

### Added

- **The tokenized stream’s ledger speaks both dialects.** Every
  manifest read has always re-sealed the fresh tokenized addresses;
  now it also forgets the generation it replaces — the read a stream
  makes after is the stream’s only truth, so the tokens the ask
  expired leave the ledger together, and no other stream’s word is
  hurried. And every door is asked by the seal’s canonical word: the
  default port unnamed, the fragment and the empty query gone, the
  host small, the hex of a percent-escape said the standard’s way —
  an address the page’s own loader spells differently is heard for
  what it says, and a miss answers nothing.
- **The bearer word and the bearer mouth.** The eye’s ear reads the
  page’s own words on the ask now (`requestHeaders` — evidence still,
  it answers nothing), and the wiring says the word into the book
  where the crossing names a family: the manifest ask, which is where
  real streams say their credentials. One policy reads it
  (`src/lib/bearers.js`): only `authorization` and the site’s own
  `x-` names are ever carried — the page’s cookie jar and forwarding
  context are its own mouths’ furniture. Two mouths fetch through it:
  the cipher worker’s every hand (a header-gated key no longer answers
  a miss), and the new bearer room, which answers the page’s own
  outgoing ask with the words the stream’s manifest ask bore — the
  player that quotes its token once and forgets it on the segments
  plays in spite of itself. The house’s one declared answering mouth
  on the page’s own wire, declared as `bearer` in the scan: a miss
  returns undefined, and the native ask leaves as the page built it.
- **The proxy room: a sealed segment is unsealed on its way past.**
  The wire has a second ear now — the eye only observes, but where the
  fetching can never be done by the page and the reading is already
  ours, the response is held at the door: a segment whose address the
  cipher room’s ledger holds sealed is buffered whole, unsealed, and
  handed to the page’s own player as the plaintext the manifest’s
  decree named. The house’s one declared rewriting verb
  (`filterResponseData`, earning the `webRequestBlocking` permission
  its place in the manifest), and the narrowness is its whole book:
  the fetch family only, addresses the ledger seals, tabs the book
  knows, a small counted budget of buffers, and a miss writes the
  sealed bytes past — the stream the page would anyway have played.
  The page’s own player runs undisturbed — its MSE pipeline, its
  quality ladder, its error recovery — and the cipher room’s ledger
  keeps its own bound too: the oldest address recorded is the first
  forgotten, on a background page that lives for the browser’s
  lifetime.

### Changed

- **The background answers the routing room’s own misses.** The last
  robustness sweep of `src/background/`, read against the router the
  rooms serve: a routed ask whose frame carries no want is refused with
  the honest miss spoken straight back, where before the room said
  nothing and the page’s player hung a full thirty-second beat per ask;
  the routed ask now replays the room’s carried word — the credentials
  and the site’s own `x-` names the page said at the manifest ask and
  its segments forgot — through the new `replayedOn` door in
  `src/lib/bearers.js`, the bearer policy’s third reader and no second
  truth (the ask’s own words win, the room’s word only fills); and the
  worker’s key cache answers to the ledger’s own discipline at keys’
  scale — a bound of sixty-four imported keys, the oldest import the
  first forgotten, an eviction no loss but the honest re-fetch to the
  address the decree already named. The rooms themselves were read
  whole (the eye, the proxy, the bearer, the book, the conscript) and
  needed nothing else for the router: no wider wire, no extra ear.

- **The routing shim, driven, holds its own four words.** The ask-routing
  room was hardened by driven tests against a fake page realm, and the
  harness caught two real defects before any page could: the brand guard
  read the XML HTTP brand only when `typeof` said `object`, while every
  real page’s `XMLHttpRequest` constructor is `typeof` `function` — the
  brand’s door would have stood for nothing on every real page — and a
  re-arm after a failed lay could have wrapped the shim in its own
  patched `fetch`, because the original native was read back from the
  page each time. The native is now kept once at first arming
  (`__nocturneNative`), both disarm paths restore it whole, the guard
  admits functions, and eleven driven tests walk the held ask, the miss,
  the abort, the disarm and the once-per-document word.

### Added

- **The film’s asks are spoken by the background’s hands.** The
  routing shim — FastStream’s own architecture, the page’s player and
  the browser’s own fetch together, no cipher of the house’s between —
  catches the film frame’s media asks where the page’s player hands
  them to the natives (`fetch`, and the XML HTTP brand’s
  `open`/`send`), says them to the hub’s port, and the answer comes
  back wrapped in the page’s own realm’s shapes: the network panel
  shows `background.js` as the initiator, and the page’s own player
  does all the parsing and unsealing on bytes it believes it fetched.
  Film-only by the law both sides tell: the shim arms where the frame’s
  own walk confirmed a film, and the hub refuses a routed ask from any
  frame whose entry carries no want. Every miss falls back to the
  page’s own native ask, whole — a shim that cannot deliver never
  breaks an ask the page could have made itself. The pure URL corpus
  (`isMediaShaped`, `sayEngineShape`) the eye and the shim both read
  moved to `src/lib/media.js`, where the wire’s shared vocabulary
  lives; the eye re-exports the names it always did.

### Changed

- **The backgrounds’ quiet answers say their own misses.** The read
  room’s every quiet return was silent by design, and a proxy word
  that never arrived could only be guessed at: now, under the
  viewer’s switch, the read names each beat it stops at — no hands in
  the frame, no family the read reads, a budget spent, a manifest
  answered no seals, a read that threw — and the proxy names the
  unseal’s miss beside the hold it already names.
- **The tap stands at the send-headers door.** The eye’s ear moved
  whole from `onBeforeRequest` to `onBeforeSendHeaders` — the only
  door where the platform accepts `requestHeaders` as a spec value
  (at the request door it is refused with
  `Invalid enumeration value "requestHeaders"`, an error thrown at
  listener registration, which kills the background page’s whole
  boot). The `onBeforeSendHeaders` details carry the eye its same
  attested facts — `type`, `tabId`, `frameId`, `documentUrl`,
  `frameAncestors` — so the ear’s shape, the wiring and every room
  downstream are unchanged; the ear still answers nothing, and the
  spec it names is `requestHeaders` alone.
- **The background’s rooms carry their own names.** The hub was one
  file answering for six duties at once; now each stands in its own
  file under `book/` — the registry and its births (`book.js`), the
  seat’s re-think (`seat.js`), the wire’s word (`strain.js`), the
  cipher’s choreography with its budget (`read.js`), the runtime
  channel and its ceremonies (`sessions.js`), and the popup’s one
  answer (`state.js`) — with the wiring spliced into `index.js`
  itself, where the three ears of the background are composed. The
  cipher work splits by purity the same way: `cipher/manifest.js`
  parses and unseals with never a fetch, and `cipher/worker.js` holds
  the network’s hands and the privacy allowance the scan reads. No
  behaviour moved: every word, every tally, every ceremony is where it
  was, the tests composing the same seams — the suite stands where it
  stood.
- **The word a stream’s cadence keeps listening.** A frame’s seat often
  warms on a crossing that names no family — a segment the player
  re-fetched while the manifest itself went unheard — and the manifest
  crossing that arrives next used to fall on the floor: the word the
  frame held said nothing about the family, so the engine sweep narrowed
  by it never engaged, and the read the generation owed was never owed
  again. Now a crossing that names a family upgrades a word that named
  none — the frame hears the dossier once more only where its
  predecessor was silent about the family — and the manifest read is
  asked by the stream’s own cadence while the budget holds: one read in
  earnest and two by re-crossing, no timers anywhere, the word told by
  its answer rather than its ask. A stream whose first read met a
  refusing endpoint is read on a later crossing, and a read that never
  answers spends three tries and says nothing, the frame playing as it
  always did.
- **Every frame’s diagnostics line stands in the background’s own
  console.** While the diagnostics switch is on, each line the frame’s
  console says is said up the seat port whole — exactly the sentence the
  frame spoke — and the hub prints it stamped with the frame’s
  coordinates at its head, so the background page’s inspect window
  carries every frame’s lines in one scroll. This is the one console a
  devtools window can be opened on without the page’s console ever
  cooperating, and the hub is a room with a console, never a recorder:
  nothing is booked, nothing is answered. With the switch off the logger
  stays silent before the listener is ever reached, so no word crosses
  the port at all — the page runs exactly as it would run without the
  diagnostics.
- **An AES-128 stream the element alone cannot read can now play.** The
  HLS standard’s own whole-segment cipher is not a DRM system — its key
  sits in the manifest as public data — and now the extension can
  shoulder it where the page’s own engine is missing. At the manifest
  crossing the background reads what the wire fetched, and the bus speaks
  the stream’s cipher down (`aes-128`, honestly `sample-aes` when the
  manifest names it, or CENC’s `clearkey` for the EME work another batch
  will take). For a stream the frame’s own playback room can honestly
  play — AES-128, an fmp4 init segment, a playlist that ends — a plan
  rides down too: the segments in play order with their sequence
  numbers, bounded at 4096 entries. When an element then dies on exactly
  the manifest the wire saw, the frame takes it over with the media
  source that answers to it: the background fetches the key once and
  unseals the segments with the WebCrypto pad trick (one standard block
  spelled by hand so an unpadded CBC decrypts as padded), the frame
  appends the header then the film in order, and the element plays — no
  page-level session or slot machinery touched, the film electing like
  any film. A miss restores the site’s own source: one attempt per
  element, never twice, never a half-fed stream. The background’s
  fetching is the house’s first declared network allowance, read by the
  privacy scan from the cipher room’s own words — same origins as the
  viewer’s player already visits, and nothing else. Live playlists, the
  TS transport (Firefox’s media source has no mp2t), and sample-level
  schemes are named in the diagnostics and declined in code, honestly.
- **The bus names the family the sweep believes in.** The eye at the bus
  already knew the shapes of the URLs a streaming library fetches; now
  it says which family the manifest speaks for — `hls`, `dash`, or the
  smooth family — and the word rides the dossier down to the frame. The
  engine sweep is asked in the family’s own matchers first, so a page
  the hint is right about — the stream pages, the common case — stops
  paying four matchers' worth of guarded reads over its globals on
  every cold consult; a family whose ask answers nothing loses nothing,
  and the page’s whole truth is asked instead, because a manifest’s URL
  is a hint by design, never a promise. The family’s word is the warm
  answer’s third stamp reading, beside the count of moves and the word
  for Playerjs — and the bus’s knock re-rests the sweep at the page’s
  ease: the manifest is being fetched through the engine it rides, an
  engine is never more findable than in that moment, and the warm
  answer’s stamp was never older than it is now.
- **The engine sweep is asked at the page’s quiet.** The walk over the
  page’s globals used to be paid at every sheet opening, in the moment
  the viewer was waiting; now the dom manager makes it at its own ease
  (the page’s idle time, natively), and the sheet opens on an answer
  already in hand. The warm answer is stamped with the page’s count of
  moves and with its word for Playerjs, so a page that has moved on —
  or gained the word — since the quiet hour is answered fresh, never
  from memory; an empty answer is never stamped, and a page that
  builds its engine later is not answered from the nothing before it.
  The climb up the video’s ancestors to find the site’s own player API
  keeps its finding per element the same way: re-checked against the
  one native `contains` reading, keyed by the names it was asked with,
  and a climb that found nothing is never remembered — a page that
  builds its player later has the walk waiting for it.
- **The frame carries the manager’s arm, and the arm ends in the
  handshake.** The film watcher is three body parts in one file: the
  budgeted walk (the only whole-document walk a frame keeps — mutations
  say something changed, never what); the **hooks** — every film the
  walk meets is armed on itself, its own native moments (play, pause,
  metadata landing) and the approach watch re-asking where the change
  is spoken instead of every stray media event in the page document-wide,
  and the arms' only payback is the page forgetting the element; and
  the **handshake** — the frame’s word to the background is the
  watcher’s own, said on the port it is handed: the count and the want,
  the want read fresh at every saying so a session open or a site
  switched off is answered on the same word. The frame’s era stays the
  frame’s: the announcement re-asks the word, and the word waits for it.
  A sweep that settles nothing is silent — no news, no word — and a
  count the book already carries is not said again.
- **Every move the page makes is heard through one manager.** The frame’s
  watch on its document — mutations, the tab seen again, a resize, a
  film drawing nearer, the network’s knock — is one debounced beat told
  by one module, in the dom-watcher shape: the eye stands when the
  first listener reaches it and stands down behind the last, a burst of
  asks is one beat, a move on an unseen page sits out until the tab is
  seen again, and every film the sweep meets rides one shared approach
  eye (the native `IntersectionObserver` with a `scrollMargin` past the
  screen, itself silent on a page that never scrolls near). The election
  keeps only what judging a film is — the budgeted walk, the gate, the
  share law — and nothing in a frame wires its own document-level
  observer any more.
- **The background alone swears the pages in.** The manifest’s content
  script — code standing in every frame of every site, waiting for
  nothing — is gone. Nothing runs in a page unless the wire said so: a
  media-shaped request crossing the tab’s bus names the frame it is
  bound for (with the browser’s attestation, plus the dossier’s raw
  material — the request’s url, what spoke for it, the document that
  owns the frame, and every origin nesting above it), and the
  background’s recruiter boots the field agent into exactly that frame
  with `tabs.executeScript` aimed by `frameId`, `matchAboutBlank`
  opening the embeds the manifest’s script could never reach. The
  field agent is the frame’s whole new authority: it tells the hub what
  the sweep confirms and what it wants (the badge), and the hub keeps
  every other answer — verdicts, counts, the dossier — coming down the
  frame’s own port. An ordinary page carries zero of our code; a
  media-cache edge is named honestly: a film whose bytes never cross
  the bus after the extension loads earns no badge until a fresh
  request, because the wire is now the only address the recruiter has.
- **The wire’s dossier rides the port.** The hub records the ear with
  the frame — where the film’s bytes come from, what spoke for them,
  which document the frame is, every origin above it — and tells the
  frame once per generation of its seat, whichever road arrived first:
  a connect before the wire, or a wire heard on a frame whose port
  already stands. The frame keeps it and speaks it in the diagnostics.
- **The relations are swept at the film’s boot.** A framed film needs a
  slot keeper in every document between it and the eye, and no frame
  list for the chain exists without the `webNavigation` permission, so
  a fresh film boot mints one `allFrames` round: every document the
  bundle has not fielded yet takes the field agent, and the bundle’s
  boot flag (one shared isolated world per frame: `__nocturneField`)
  keeps a repeat sweep costing a fielded frame one parse and nothing
  else. Steady state pays nothing: a stream’s own cadence re-crossing
  the bus finds the seat taken and arms nothing. A document that gains
  a new ancestor after the last fresh boot waits for the next film to
  arrive — the honest cost of the frame list we do not carry.
- **The viewer’s law is held at the gate.** The recruiter keeps a
  settings mirror (one read, then the storage events the popup’s
  writes already emit) and consults the same chain of names a frame
  itself would — the request document’s host, then the origins above
  it, nearest first, with the tab’s own url answering for a room the
  envelope leaves unnamed. A disabled host boots nothing: no field
  agent, no relay sweep, and the hub hears no strain — no ghost seat is
  ever founded on a page the viewer switched off. A page the viewer
  disables mid-session is still swept clean by the frame’s own hearing
  of the change, which stays.
- **One protocol for the whole machine.** Every word between the
  background, the frames and the popup is now spelled, built and
  checked in `src/lib/protocol.js` — the runtime’s vocabulary (report,
  verdict, strain, dossier, the popup’s question) and the page wire’s
  slot tag alike. Producers build through the `say*` builders;
  listeners hear through the `as*` guards and refuse a malformed word
  whole, never half-acting on one. `words.js` keeps only the storage
  names; the chain-of-hosts law moved to `src/lib/chain.js` so the
  background and a frame read the same rule from the same door.

- **The page hears the wire as well as the DOM.** Detection’s sweep has
  run on events alone for a long time now — an observer over the tree,
  the film’s own play and metadata moments, an approach margin in place
  of scroll polls — but every event it knew was the document’s. A
  background ear at the tab’s own bus stands beside the hub now: one
  `webRequest.onBeforeRequest` listener, aimed at `media` and
  `xmlhttprequest` requests and matched against a small corpus of
  stream-shaped words (`master.m3u8`, `manifest.mpd`, segments,
  `videoplayback`, the `mime=video/` family), because a film’s manifest
  is often read before its element is ever inserted, and MSE content
  rides the script-ridden fetch family the DOM never names. The request
  arrives bearing the frame it is bound for — attested by the browser,
  the same trust the port’s envelope carries — so the hub writes the
  warmth into the book under a key nobody can forge: a strain knocks a
  framed film’s sweep awake once and never again (the stream’s own
  cadence is the heartbeat; no clock enters anywhere), and where no seat
  stands an `about:blank` or `srcdoc` embed — a frame no content script
  ever runs in, invisible to every other channel this pipeline has —
  takes a ghost seat in the book: no port, no want, no count, only the
  context that a stream runs there. The popup answers that context as
  its own line — "media streams detected in frames of this page" — and
  the count stays DOM-verified: a warm seat never counts a film the
  sweep has not confirmed. The manifest takes the full uBO seat —
  `webRequest`, `webRequestBlocking`, `<all_urls>` — but the listener
  returns nothing and answers no request: the blocking permission stands
  beside an ear that never blocks, never cancels, never redirects, and
  the collection answer stays "none" — the warmth is session memory in
  one tab’s book, never persisted, never sent anywhere.

- **The seat leaves the pages' wires, for the background’s own room.** The
  extension had no background at all — every cross-frame bargain ran
  through windows the pages own, and every safeguard it carried was the
  price of that route: the ticket minted to say who a claim answered to,
  the judge seated in the top frame, the walk over its tree to credit a
  claim to somebody’s child, the presence beat that told life from
  silence. A persistent background page stands up a frame hub now, and
  the frames say their want and their film count to it on a runtime port
  opened once per document — a channel no page can spell a word on, with
  the tab and frame attested on the envelope by the browser itself, so
  the hub’s book is written in read-off facts and none of the page-wire
  machinery ships any more. And death, the thing the page wire could
  never have: a content script’s port fires `onDisconnect` when its
  document is torn down — navigation, iframe lifted out, tab closed — so
  presence is connectivity, a gone frame frees its seat as an event with
  no clock to wait out, and the walking belt and its staleness window
  depart with the ticket. The seat’s rule is mended in the move: only a
  frame that wants the seat can hold it (the old judge’s
  first-key rule would have seated a frame that only counted, had one
  ever spoken first), turns are drawn in first-want order with a
  reconnect re-entering at the back, and the top document’s own film
  still outranks the framed ones — the top is believed when it says it
  holds the seat, and no framed frame is ever seated while it wants. The
  popup’s count question goes to the hub too — one ask, one answer from
  the hot book, no round trip through the pages — and the manifest gains
  the background entry without a new permission: the book is session
  memory, never persisted, and the collection answer stays "none".
  What a frame alone can do stays with the frame — the sweep, the badge,
  the session — and the slot keeps its climb through the page’s own DOM
  for now, each document still widening the box that hosts the child
  below it, at the same slow beat the keeper’s hold expects; the hub’s
  speaking its own slot orders is the next room over, when the frame
  tree’s management moves in.

- **The rail dies by word, not by window.** A claim on the pages' own
  wires was kept alive the one way a connectionless wire knows: every
  claimant re-said itself every two seconds, and the judge believed an
  absence — a claim unseen for six seconds was a frame gone. The rail
  runs on a pair of entangled ports now: the claimant mints its channel
  and carries the far end with its first claim, and from the judge’s
  note of receipt on, the claims, the counts, the verdicts and the
  goodbye all ride the pair — where a pagehide is a death and not a
  mystery, and the seat is free while the leaving page is still leaving.
  The beat stays only as the belt beneath it: two seconds on the ramp
  where no pair stands, four on the settled rail, walking beneath the
  judge’s six-second window so that forgetting only ever claims what the
  words on the pair could not say — a frame whose document died without
  the chance to part. The honesty the new story buys is written into the
  rail’s own header: the pair is a capability that travels through
  windows the pages own, so a page that catches it in flight holds the
  claimant’s mouth — a claim held or withheld — and the belt is what
  spells the seat back within a settled beat. And the platform itself
  has no death notice for a pair — the close event sits awaiting
  Mozilla’s position, standards-positions #914, unanswered as of this
  writing — so the record of that gap, and the tripwire for dropping the
  belt the day the event ships, stand in the code.

- **The rail’s last per-beat work goes quiet.** A slot word rides the
  claimant’s own heartbeat, and every document of the chain that heard
  it walked its whole document — every iframe, every embed, every
  object — to re-answer what box the posting window lives in, a
  question it had answered one beat ago. What each window’s box is is
  remembered now, re-hunted only when the remembering runs dry: the
  element a site has torn out is swept the moment any word arrives,
  and a steady session costs the chain no walks at all. And the
  judge’s claim record stops carrying what nobody reads — the tree
  walk that proves a claimant is one of ours stays, but its depth
  by-product, orphaned the day the seat order became the tickets'
  arrival order, departs.

- **The moments the code says to itself get one mouth.** A signal — a
  moment one side says and every side that reached it in time hears —
  is the small vocabulary the late-bound cycles were waiting for: the
  frame’s badge grants and its announcements, the session’s exit and
  fullscreen commands, the pill’s tap and the subtitle’s name all say
  themselves through it now, and the hand-bound bags that carried the
  reach between the two halves of each cycle — the no-op stub, the
  `null` field, the four-slot `refs` — are gone, their queries rebound
  once their answer exists and their moments said without knowing who
  hears. And the one unbounded poll left in the content script goes
  quiet: the site captions' probe had been reading the container and
  asking after it every second forever, where the observer already
  owns the painting — the tick now keeps only the arranging question,
  and only in the second that contains something to arrange, settling
  once the container stands.

- **The gestures and the adapters answer to the same verbs the rest
  of the player keeps.** The recognizer’s two timers join the moment
  slots: the hold’s moment — armed per press, lost to anything that
  decides the press was not a hold — and the tap window’s fast and
  slow rhythms are slots now, with the fire asking the mode rather
  than trusting its arm. Every quality adapter answers for its own
  ladder — sources, hls.js, dash.js, shaka, video.js — so the sheet’s
  note no longer guesses for the adapters that kept quiet, and the
  ask carries no guards: video.js names both of its numbers, the rungs
  and how many are still open, since that pair is what explains its
  Auto chip. The three deliberately right shapes were read once more
  with current eyes — the menu’s DOM builders, the page reads that
  stay free functions over whatever the page hands them, the scope’s
  cleanup ledger beside the slot (a ledger of many moments undone
  together is not a slot, which holds one), and the bridge’s no-op
  release — and each verdict stands.

- **The rungs and the moments get homes of their own.** The quality row
  and the audio row had written the same ceremony twice — find the site’s
  player once per sheet opening, list what it offers, carry the viewer’s
  choice over it, refuse a rung the player will not take — and the rung
  sheet is struck once now, each row keeping only its own hunt and its
  two extra words. A one-shot timer is one verb where it used to be a
  hand-bound knot of a variable cleared if armed, nulled when it fired,
  cleared again at teardown: ten of them — the toast, the chrome’s idle
  fade, the dismiss spring home, the skip ledger’s linger, the persist
  batch, the frames rail’s beat, the slot’s expiry, the caption probe,
  the detect sweep — hold their moment in one place, and the slot
  empties itself the instant its work runs. The colour panel’s four
  steppers carried the settings schema’s ends copied by hand, and they
  read them from the module now (the feel of the hand — each step, each
  dial’s decimals — stays local), so the settings page writes its
  sliders' endpoints from the same source and the schema can no longer
  drift from its dials. And the badge’s answer for a film — shown, or
  not, and why not — is said once in the frame instead of four times.

- **The methods that were hidden in three hand-copies get one home.** The
  discipline of holding a line a rewriting site wants to move — repair,
  count, exceed the budget, sound off once, step aside — is now a guard
  budget of its own, keeping the video’s pin, the film’s anchor and the
  framed slot from three same stories and the 240 they used to spell
  twice. The words on the rails are aimed by one verb that answers
  whether a word left at all, so a judge forgets a claim it cannot tell;
  the framed slot’s open rides the heartbeat that just said it instead of
  being said twice; the claimant’s beat answers once what keeps it
  beating; the settings page’s controls answer for their own held or not
  state; and a never-wired stub leaves the session’s late-bound actions.

- **The words shared across a boundary have one mouth.** The string two
  files must agree on — the rail tags the frames protocol speaks, the
  popup’s question about how many films a page holds, the storage keys
  living and dead — is now spelled once in a words module, and every
  consumer imports the spelling instead of keeping a copy that can drift
  from somebody else’s. Nothing answers differently; the words just can
  no longer disagree with themselves.
- **The settings schema describes itself.** Every key now says out loud
  what it is — a colour dial, a range dial, a switch, a list — with the
  ends dials are allowed between and the neutral value each falls back
  to, and the defaults, the coercion and the schema-2 colour wipe all
  walk that one table. Adding a key is one entry in one place, where it
  used to be an entry plus edits in three lists that had to stay in step
  by hand.
- **The sweep knows more hiding places, and video.js by name.** The handle
  hunt for an engine now reads the film’s own furniture too — a handle hung
  on the wrapper the player was built inside is as good as one hung on the
  element — and answers to more of the names sites give it, every key
  shape-checked so a name that belongs to somebody else costs nothing. A
  video.js player is identified by its public door (`qualityLevels` plus a
  `tech` behind it) and found two ways: its own `videojs.players`
  registry, which the constructor keeps even for players born in closures,
  and the sweep of the page’s globals. Its ladder speaks the native
  language of the site’s own ABR — every rung open is Auto, the chosen
  rung is the one sole rung still enabled — and asking for a rung silences
  every rung but one, exactly as the site’s own quality pickers do. A page
  with more globals than the sweep’s budget can own now says where it
  stopped: the debug switch reports the cut instead of leaving an engine
  behind it indistinguishable from no engine at all.
- **The lock cannot be written over.** The fullscreen lock still answers the
  page’s take-the-screen calls as if they had worked, but its fake now stands
  behind a property the page cannot rewrite with plain assignment — a page
  that reaches past the lock by hand (the one thing a simple assignment could
  not do) finds a void where its write landed, and the lock’s way back at
  release is by what it provably holds at that moment: its own snapshot
  never comes back on top of the page’s doing.
- **The rails aim their words.** Every word between frames now names the
  window it belongs to: claims and film counts beat at the top frame by the
  top frame’s own name, verdicts go back to the origin a claim arrived
  from, slot words climb the chain by each hop’s parent’s name — every
  address read from the document’s own ancestor chain, so nothing is
  broadcast to listeners the words do not belong to. The unaimed '*' remains
  only where a realm has no chain to read, and the receiving ends keep
  their own checks either way.
- **A switch for the after-the-fact questions.** A `debugMode` setting
  (default false) turns on one-line console diagnostics at the places the
  answers live: the film election’s verdicts, the engine sweep’s finds and
  misses, the quality ladder’s award. uBlock’s logger at our scale — set
  the storage key while the page runs and the next word arrives; off, and
  the pages run exactly as they ran.
- **A page with its film behind glass answers for it whole.** The chain
  of named origins between a film and the eye comes from the frame’s own
  location now — `ancestorOrigins`, shipped in Firefox 148 and therefore
  guaranteed at the floor of 158 — so a host decision is read from the
  whole nesting without a cross-origin window ever being touched, and the
  old throw-and-guess path (the top host read that throws, then a
  `document.referrer` whose truth was the framer’s policy to give) is
  gone. The popup speaks for the page with one voice: every frame carries
  its living film count on the very rail it already beats on, and the
  frame the viewer is looking at totals them — before, a film living
  entirely behind an iframe counted as no video at all. And a full screen
  is no longer promised where the embedding chain has not allowed one:
  `document.fullscreenEnabled` decides whether the fullscreen control is
  offered, because a control that throws when pressed is not a control.
- **The frame tree answers for its own.** A claim is credited only to a
  window the judge can find in its own tree — reference walks, safe
  across origins — so a window that can spell our words but is nobody’s
  frame hears nothing back. And the player’s host page keeps the room it
  asks for: a session in a framed film tells its parent one hop at a
  time, each document widening the box that hosts the one below, so an
  embed that was built a paragraph tall plays across the whole viewport
  and pays the width back fully at release — strangers' frames and
  same-origin frames alike on the same rail, holds expiring on their own
  beats if a session dies before it can say so.
- **The quality sheet stops promising what the site cannot honor.** A
  `<source>` switch carried the position by hand and armed its restore on
  `loadedmetadata` — and nothing else. A load that died left the listener
  standing, and a leaked restore is worse than a leak: a later rung’s
  successful load then fired the failed one’s stale position and playing
  state at it. The one listener now rides both off-ramps, metadata the
  happy landing, `error` the failed one, and stands down either way. The
  YouTube adapter returned `true` for a rung it had never verified an old
  player could take; the two setter methods are asked for first, and a
  player that has neither is refused at the chip rather than believed.
  And where the page speaks its own chips — the `2160p Premium` names, the
  `60` marks, the HDR ones — they are taken when the data call answers
  with an honest string both sides, the synthesized ladder labels
  underneath staying the rule.
- **The crop answers the stage the page actually gives it, and the fight
  budget is spent only on real fights.** A stage grown or shrunk by the
  site’s own layout — a collapsing header, a sticky bar, a closing side
  column — owes no window event, and the zoom intent went on fitting a
  stage that had shipped until some other event happened by. An observer
  on the stage itself is the net, and cannot chase its own tail: the crop
  is a transform, which changes no layout for it to re-see. The re-pin
  guard that stands behind the player counted every cycle it woke for,
  so a long two-finger pinch spent a movement of the fight budget per
  frame while the site did nothing at all; a cycle now costs nothing
  unless the page’s style was genuinely rewritten. And a pinch the film
  is too young to answer — dimensions not yet spoken — changes
  nothing now, instead of quietly reclassifying the viewer’s zoom as
  fit; the unmeasured stage is refused the same way. And a viewer whose
  system has asked for reduced motion gets the same states without the
  glides between them.
- **The system’s mirror speaks the player’s film, and pays it back at
  release.** The bridge between the player’s film and the notification
  and the media keys once set handlers and stood aside; now it says where
  the film stands — position state pushed at the moments the film’s own
  rules change: a seek, a rate held (the pause-hold speed moves the rate
  under the site’s feet), a length the stream revises, play and pause,
  with a paused film pushed at rate zero and a live stream left to the
  browser’s own guess, whose Infinity the platform still refuses — and
  it honours the fast-seek flag the system sends for a hand dragging the
  timeline, keyframe-near there to beat frame-exact, and treats a zero
  seek offset as no offset at all, the way the Android plumbing’s error
  path has been caught emitting. The name comes from the page’s own
  words first: where the site declares its session metadata — real
  titles, real thumbnails — the bridge keeps its silence, and its
  favicon fallback carries the icon’s size and type so the system picks
  rather than scales blind. At the bridge’s release the page gets its
  own picture back — metadata restored to what the page itself had
  declared, timeline dropped, playback state resynced — instead of the
  player’s film still being advertised after it has gone.
- **The player stopped learning openings.** The intro-skip feature — the
  listening, the learned openings, the orange opening band on the bar and
  its settings toggle — is gone. Settings learned before this release are
  unaffected, and the sound records older releases kept on the device are
  removed the next time the player runs on a page.
- **The episodes picker is gone.** The seasons-and-episodes sheet, its
  button beside the way out, and the playlist machinery behind them all
  leave the player. The sites the feature read keep their own pickers, and
  the player plays the film the page gives it.
- **The transport moved into the seek strip.** Backward, play and forward
  sit to the bar’s left, the clock at its right end — one row at the bottom
  edge, where the thumb already works. The centre of the picture is the
  gestures' alone.
- **The clock reads as one sentence now.** It says "current / duration",
  the place in the film and its whole length together; the remaining read
  that used to sit on the other end is gone.
- The player is offered to Firefox on desktop as well as Android, under one
  floor for both: Firefox 158.
- **Colour and subtitles are pages of settings.** The topbar loses its palette
  button; the sheet’s own Picture and Subtitles rows drill into pages inside
  the same sheet — one panel DOM, one anchor, a back row to return. Subtitles
  moves because its row carried the most content: the track chips, the local
  file loader and the native renderer now share a page of their own instead
  of pushing the rest of the sheet down.
- **The bottom strip is the control bar, and the settings gear lives at its
  far right, beside the clock.** The topbar keeps only the ways out of the
  film; the settings sheet rises above the bar’s right end, laid in plain
  numbers against the bar’s known geometry — no anchor reaching into the
  strip’s DOM, no mis-placed sheet, no overlap. The bar’s two slots (the
  transport leading, the clock and whatever joins it trailing) name their
  own touch, since the strip itself is blind to taps that belong to the
  film: a plain button carried there used to be untouchable.
- The sheet headings' spaced capitals sit exactly in their line box.
- Videos found by a sweep are watched with a margin past the screen, so a
  scroll that never goes near a film no longer costs a sweep.
- One more fit after the first presented frame of a fresh source, so the
  crop and the picture agree on what is showing sooner.
- **Hold anywhere runs the film.** A hold begins on any part of the picture —
  middle and both sides included — and runs it at the hold-speed chip for as
  long as the finger is down, as the right side alone used to. The rewind
  hold is gone: rewind is the seek band’s business again.
- **The badge rides the film it names.** The pre-player pill reads its place
  from an anchor carried by the video itself, the way the sheets already
  read theirs from their buttons: the browser answers every scroll and
  layout move, so the scroll listener and the redraw per frame are gone,
  and being "mostly on screen" is an observation rather than an arithmetic.
  The one case left to the hand-held pin is a film living inside the site’s
  shadow root, out of the anchor’s reach.
- **The badge stands outside the picture.** The pre-player pill no longer
  paints over the film: it hangs a breath below the bottom-right corner,
  in the page’s own margin, and the rim that bounds the room is the
  viewport’s own — no other can matter, because an ancestor’s
  `overflow: hidden` clips only its descendants, and a pill mounted at
  `document.body` stands outside every wrapper the site builds around its
  video. (An earlier reading walked the ancestors for clip rims and could
  mistake the film’s own player shell for a wall the pill never lives
  behind; the walk is withdrawn.) The anchor keeps the seat for a film in
  the light DOM, CSS answering every scroll itself; a film inside one of
  the site’s shadow roots is out of the anchor’s reach and is carried by
  hand, one rect per frame it stands still.
- **The player speaks through one pill.** The half-moon that lit up over the
  double-tapped side is gone, machinery and all; a skip run now reports
  through the same toast every other notice uses — hold speed, subtitle and
  file notices, the feed’s endpoints — as a pill under the top edge’s
  middle. The pill keeps the sitting’s account the way the moon used to:
  every tap that sought adds its step to one growing sum, the total stays
  open for a breath after the last tap, and a flip of sides starts a fresh
  sum — all of it matching what the film’s own cumulative seek did.
- **No dark layer under the controls.** The scrim’s gradient wash — black
  bands from both edges and a flat mist over the whole frame, shown whenever
  the controls were — is gone. The film runs at full strength behind the
  bar, the pill and the sheets; their glass and shadows carry their own
  legibility.
- **Ink instead of glass.** Every surface the player speaks from — the pill,
  the sheets, the scrub-time bubble, the pre-player badge — is solid black
  at four-fifths weight now, and the backdrop blurs behind them are gone,
  with them the per-frame GPU cost of being able to see through. The
  hairline rims and shadows that lifted the glass off dark scenes keep
  their jobs.
- **The way out sits at the bar’s end, and the topbar is gone.** The exit
  button moves to the control bar, at the very end of the tail — leaving
  the film is a reach along the edge the hand is already on, right of the
  settings gear — and it speaks with the exit-fullscreen arrows rather
  than a cross. The fullscreen button rides the tail after it, and the
  once-halved topbar is cut entirely: the frame carries no chrome above
  the picture, and the toast and sheets reseat to a breath from the top.
- **The player belongs to one film.** The badge only appears when a page can
  name one: where the page keeps several films, the film must own at least
  half of the screen and twice what the runner-up owns. A page of previews,
  a results grid or a row of hover cards elects nothing, so the player opens
  on nothing by accident; a portrait film — a shorts clip by shape — is
  refused at the gate, before any arithmetic. A page with exactly one
  playable film elects it outright: one film is the one the page is built
  around, at whatever share its own chrome leaves it — a watch page’s
  masthead, sidebar and the room below never stop it from being the reason
  the page stands, and a big window could once shrink the film’s share
  under the half and refuse it.
- **The sweep covers the whole page, in pieces.** The find-sweep walks the
  light DOM and every shadow root in one budgeted pass — the walk no longer
  waits for an empty light DOM to run, because a page that keeps a teaser
  in the light and its real film inside a custom element never met the
  film at all — and its TreeWalker hands out one element at a time where
  the old walk materialised whole trees before a budget could object. A
  walk the budget ends leaves its walkers standing; the next sweep resumes
  where this one stopped, so every shadowed film arrives sooner or later,
  and the playable set is reconciled, not rebuilt, or the elected film
  would flicker out of existence between two sweeps. The sweep sits out
  while the document hides — nothing it reads is worth forcing layout on
  an unpainting page — and the tab being seen again re-arms it.
- **A film the page has blinded is refused at the gate.** Three
  computed-style readings — display, visibility, opacity, all of them the
  element’s own — become one `checkVisibility` call, which also sees
  through the ancestors: a container opacity-zeroed, a visibility hidden
  above, a layout collapsed around a video no longer elects a badge over
  a thing nobody can see.
- **The engine sweep asks only the rooms that can answer.** The playerjs
  matcher was identification by invocation — `api('id')` called on every
  global that carried a method by that name, in the moment the viewer was
  waiting for the sheet — and the page’s own word (a `Playerjs` global)
  was checked after the ids were already asked. The word is fetched first
  and the question gated behind it: a page that has not admitted Playerjs
  is asked nothing, by the quality sheet or the audio sheet — the gate
  lives where the engines are found, so both inherit it instead of
  minding it separately. The questions the sweep does ask are quiet: an
  identification call that raises is an answer, not a console warning,
  while a real order to a site’s player keeps its witness. And the hunt
  for an element-attached engine walks the named player object too —
  `playerEl.hls`, the common hang-off, was a page the host path went
  blind on.
- **The bar speaks from its own ink pill.** The full-width strip the
  controls rode on becomes a stadium container of the same ink the toast
  and the sheets speak from, rim and shadow lifting it off the film — and
  the container itself stays blind: a tap on its own dead space answers
  the picture, only the ruler and the buttons name their touch. The
  sheets and the subtitle cues hang a breath above the taller body, and
  the clock needs no shadow on ink of its own kind. The toast joins the
  shape: rounded from its 12px corners into the same 999px stadium with
  the same rim in its ink, so the container and the notices read as one
  material speaking in two places.
- **The bar shows for interaction, and idles away.** Any contact with the
  film — a pointer travelling it, a touch laid down, a drag working —
  slides the pill up from its seat, wherever on the picture it happens,
  and the last of them starts a second-and-a-half count. Silence passes
  it, and the pill slides back down the road it came. There is no band to
  point at and no toggle to throw: showing is the interaction’s job,
  hiding is the silence’s. The pill travels one plane — the chrome’s own
  fade softens the far end of each trip, so neither direction reads as an
  appearance made out of nothing — and the motion is no millisecond
  clamp’s to mute: a system asked for less motion gets the slide anyway,
  for its rise and fall is how the picture answers the hand, not
  ornament.
- **The toast speaks in narrow chevrons.** The skip run’s total and the
  hold speed’s mark are written behind a drawn pair of solid chevron
  wedges — narrow, tucked one over the other, bold like the triangle
  pairs that used to stand there — at a larger 14pt voice, the wedges
  sized in the text’s own measure so they scale with it rather than
  holding a fixed footprint.
- **A tap on the middle toggles the film.** Where a running picture
  stands, a tap on the narrow centre strip pauses it; where a resting one
  waits, it plays. The bar lifts with the icon’s change, so the toggle
  answers at once. A tap on the sides is only the hand’s presence — it
  lifts the bar, and its second tap is free to become a run of seeks. The
  centre strip stays narrow so nobody pauses by accident.

### Removed

- **Chapters are gone.** The reader that picked chapter names and start
  times out of the site’s page blobs, the dividers it drew on the ruler,
  and the section name it held above the bar. The shapes kept moving under
  the search that refused to pin a path, and the reading cost more lives
  to keep alive than the label was worth. The ruler and the clock are
  unchanged.
- **Feed pages are out of the scope.** The flick up for the next video and
  down for the previous — the site’s own column being scrolled, the wait
  for the page to settle on the next film, and the loader that covered the
  gap, with the shape-matching that gated the flick — are gone. The player
  is a player for one film again: the pull to dismiss stays everywhere it
  worked, an upward drag is a dead lift, and whatever comes next is the
  page’s own autoplay.

## [0.9.1][] - 2026-10-20

### Changed

- Seasons and episodes open in a sheet styled like the settings: seasons as a
  segmented control, episodes as a list with a tick by the one playing. The
  top bar shows a single button naming where you are.
- Picking a season keeps the sheet open; picking an episode closes it.
- The controls no longer fade out while a sheet is open.

## [0.9.0][] - 2026-10-17

### Added

- **Skip intro.** The player learns a series' opening by ear: it compares the
  start of the episode playing with the last episodes it heard, and keeps the
  stretch where the two sound the same. From the next episode on, a **Skip
  intro** button comes up a second into the opening, wherever it falls, and
  lands where the story starts. A new opening mid-series is learned the
  same way. The opening is painted on the seek bar once it is recognised.
- A switch in the settings sheet turns the listening off, and **Reset
  settings** in the popup forgets what was learned.

### Notes

- Measured on a phone on three episodes of one series: the opening was
  learned to within a fifth of a second; the button came up a second into the
  opening, or three seconds after the player was opened partway through it.
  No check takes more than a few milliseconds.
- Only a video the site serves itself is listened to. Web Audio returns
  silence for a video loaded from another domain without permission, and
  routing the sound through it would silence the film too.

## [0.8.2][] - 2026-10-17

### Changed

- The settings button is a gear instead of three bars.
- Back skips 10 seconds, the same as forward, on the button and on a
  double-tap on the left.
- The fullscreen button on an inline video stays visible while the video is
  in view, instead of fading out and waiting for a tap.

## [0.8.1][] - 2026-09-27

### Fixed

- A tap in the middle shows the controls at once again, so two quick taps
  there pause, as before 0.8.0. Only side taps wait for a second tap.

## [0.8.0][] - 2026-09-27

### Added

- Fullscreen button when the player is not fullscreen; in a small embedded
  frame it replaces exit, colour and settings.

### Fixed

- Turning the phone no longer closes the player. Sites can’t take fullscreen
  from it while it’s open.
- A slow double-tap no longer shows the controls instead of seeking.
- Holding the left side rewinds visibly instead of freezing.

### Changed

- Hold right = the 2x speed setting, with sound, until you let go.
- Double-tap and hold areas cover the left and right 40% of the screen.
- A single tap on a side shows the controls after ~0.3 s, waiting for a
  second tap.
- Fullscreen opens on the video alone, no controls.
- Settings sheet: narrower, iOS-style sections, segmented controls, switches.
- The site’s word for auto quality (e.g. "Авто") shows as "Auto".

## [0.7.0][] - 2026-09-23

### Added

- **Swipe up for the next short video.** With the phone held upright and an
  upright video on screen — TikTok, Reels, Shorts — a swipe up moves on to the
  next video and a swipe down goes back, without leaving the player. The swipe
  scrolls the site’s own feed, so the site loads and counts the next video as
  it would for a swipe of its own, and the next video comes up on its own,
  with no controls drawn over it. On a landscape film, or with the phone on
  its side, a vertical swipe does nothing, as before.
- **Double-tap feedback on the side you tapped.** The side lights up as a
  half-moon with arrows running the way the film is going and the seconds the
  run has covered, in place of a label in the middle of the screen.

### Changed

- **The player no longer turns the screen to landscape.** It opens in the
  position the phone is held in and follows it from there. Forcing landscape
  put every upright video on its side the moment the player opened.
- **The picture starts whole instead of filling the screen.** Filling cropped
  the edges off every film that was not the screen’s own shape, and cut most
  of an upright video away with the phone on its side. Pinch out to fill the
  screen, as before.
- **Every tap of a double-tap run seeks at once.** From the second tap on, the
  jump happens the moment the finger lifts instead of a quarter of a second
  later, and a tap that lands mid-seek counts from where that seek is going.
- **The colour button is drawn as a painter’s palette.** The old outline read
  as a blank shape.

### Removed

- **The subtitle size, subtitle sync and fullscreen rows of the settings
  sheet.** None of them changed the film itself. Subtitles are drawn at their
  default size, and the player always takes the screen.

## [0.6.0][] - 2026-08-16

### Changed

- **The back button skips 5 seconds, not 10.** Going back is for the line of
  dialogue you missed; going forward is for the opening you have seen. Forward
  is unchanged at 10 seconds, and a double-tap in each zone now follows its own
  button: 5 seconds a tap on the left, 10 on the right.

### Removed

- **Picture in picture.** Gecko has no floating-window API on Android, so the
  button asked the system for the home screen and hoped: it worked on some
  builds and did nothing on others. The top row is one button shorter.

### Notes

- **A screenshot button was attempted and is not possible.** Firefox for
  Android does not give a decoded video frame to any script: `drawImage` of the
  video into a 2D canvas leaves it transparent, a WebGL texture of it reads
  back as a single flat colour (`#330033`), and `tabs.captureVisibleTab` draws
  the page with the video area black. This was measured from the page’s own
  scripts, from a content script, and from a background script with host
  permissions, on Firefox 153 on an AOSP Android 16 emulator and on a Pixel 9
  Pro. The button is therefore not shipped rather than shipped broken.
## [0.5.0][] - 2026-08-09

### Added

- **Seasons and episodes, as two dropdowns in the corner of the screen.** A
  series on a Playerjs site keeps its path — the season, the dub, the episode —
  and the player draws one control per step of it. Nocturne now reads those and
  puts them where a thumb reaches with the phone held sideways, beside the way
  out: the season on the left, the episode next to it, each opening a list with
  the one you are on marked. Picking an episode plays it without leaving the
  player. A step with only one thing in it — a film with one dub — is not drawn,
  and a page that is a film has no bar at all.
- **Audio tracks.** Film sites often carry two or three dubs and switching them
  from a phone was close to impossible. The sheet now has a row for it, reading
  hls.js `audioTracks`, dash.js `getTracksFor('audio')`, Shaka’s audio
  languages, Playerjs’s own list and the `audioTracks` a browser exposes on the
  video element. Like the quality row, it stays hidden when there is nothing to
  choose between.

### Changed

- Quality and audio now find the page’s player through one shared piece of
  detection rather than each hunting for it separately.

### Notes

- Playerjs answers `api('next')` and `api('prev')`, but refuses an entry by
  index or by name: `api('playlist')` is undefined, `api('play', n)` throws and
  `api('find')` returns false. The dropdowns therefore press the player’s own
  rows, which is what its own menu does — reads and presses on elements the page
  already drew, no code injected and nothing evaluated from a string.

## [0.4.0][] - 2026-08-08

### Added

- **Quality on ordinary film sites.** Sites that embed Playerjs — a large part
  of what people actually watch on a phone — now offer their ladder in the
  sheet like any other player. Playerjs keeps its streaming engine inside a
  closure, but it answers about itself: `api('qualities')` lists the rungs the
  site built, in the site’s own words, and `api('quality', label)` is the call
  its own menu makes. Both are reads and calls on an object the page already
  published; no code is injected and nothing is evaluated from a string. The
  chips come out auto first, then best to worst, whatever order the site listed
  them in.

### Changed

- The rung the viewer picked is remembered above the adapters rather than
  inside them. The ladder is looked up again every time the sheet opens, which
  builds a fresh adapter, and a player that has been given a rung goes back to
  reporting whatever its own auto has drifted to — so the chip used to fall
  back to Auto a few seconds after a choice. It now stays on the choice until
  the rung stops being offered.

### Notes

- 0.3.0 said a player that keeps its engine in a closure could not be reached
  from an extension at all. That was too strong: Playerjs cannot be reached
  *through its engine*, but it answers questions about itself, and that is
  enough. Players that expose neither still report the resolution being played
  rather than offering a choice that would do nothing.

## [0.3.0][] - 2026-08-07

Everything in this release comes from watching real films on a real phone with
0.2.0 installed.

### Added

- **Quality selection.** The site keeps its ladder; the sheet asks for a rung.
  Adapters for `<source>` lists, YouTube, hls.js, dash.js and Shaka, read
  through the page’s own objects — no code is injected into the page and nothing
  is evaluated from a string. Where a player exposes no way in, the row reports
  the resolution being played instead of offering a choice that does nothing.
- **Captions from players that paint their own.** YouTube’s caption list is read
  through its player API and the text it renders is mirrored into the player’s
  cue layer, which is why subtitles were missing there before. The same mirror
  covers Shaka, video.js, JW Player, Plyr and Playerjs.
- **Picture-in-picture button**, last in the top row after colour and settings,
  where a thumb reaches it. Gecko ships no Web API for it on Android, so the
  button does what a viewer does by hand: it asks Android for the home screen
  and leaves Firefox playing behind it, which is the hand-off Android already
  knows how to float.
- **Chapters on the seek bar.** Where a site publishes sections — YouTube does —
  the bar is cut at each one and the title of the section under the finger is
  named above it.
- **A fullscreen button on the inline video.** One button, drawn as the
  fullscreen arrows, sitting on the site’s own small player. It fades out after
  a few seconds untouched and comes back on any tap, so it is there when it is
  wanted and gone when it is not.
- **Quality leads the settings sheet**, above speed and subtitles. The rows are
  as tall as their chips with a hairline between them, and the sheet ends above
  the seek bar — a nine-rung quality ladder used to wrap across the row beneath
  it and run off the bottom of the screen.
- **Fullscreen switch** in the settings sheet. Off runs the player as an overlay
  instead of taking the screen, which leaves Android’s ordinary single swipe
  home working. It applies to the session it is used in and is deliberately not
  remembered, the way playback speed is not.
- Loading an `.srt` / `.vtt` file now actually loads it: the file input had no
  handler, so the button did nothing.

### Changed

- **Pausing is the play button and nothing else.** The invisible pause zone that
  covered the whole picture is gone; a tap anywhere else brings the controls up
  or puts them away.
- **The seek band sits above the bottom of the screen**, clear of the Android
  home swipe, which used to be read as a scrub and threw the film into the
  middle.
- **The badge sits halfway up the right edge** of an inline video rather than in
  the bottom corner, where it covered the site’s own controls.
- **The scrim is heavier** where the controls sit, so they stay readable when
  they come up over a bright, playing picture rather than over a paused one.
- Motion follows one easing curve throughout, with scrims and shadows under the
  controls so they stay legible over a bright picture.
- The launcher no longer asks Gecko to hide the navigation UI, which is what put
  Android into sticky immersive mode.

### Fixed

- **The picture stays centred and keeps its shape.** A site that rewrites the
  video’s inline style — YouTube does it on every layout pass — could push the
  picture against an edge or stretch it across the screen after a return from
  another app. Position and offsets are pinned along with the size and re-pinned
  whenever the site writes over them, and the zoom is re-derived from what the
  viewer asked for whenever the stage changes shape.
- **Colour starts neutral.** Settings move to schema 2, which drops the four
  colour values once on upgrade: a profile left on zero saturation was playing
  every film in black and white, and one left on 1.3 contrast kept every film
  tinted, neither of them anything a viewer would connect to a setting they
  touched once. Values stored out of range or of the wrong type now fall back
  to the neutral one as well.
- **No more fade to grey while paused.** People pause to look at the picture.
- **Quieter.** Choosing a quality no longer prints a message over the film; the
  chip lighting up says it. Only a refusal is worth a word.
- **Brightness reaches further and moves faster**: 40%–200% in steps of ten,
  rather than 50%–150% in steps of five. A film mastered dark can now actually
  be lifted, and one press does something you can see — at five percent a press
  the control read as one that did nothing.
- Leaving the app no longer tears the session down. Losing fullscreen while the
  app is on its way to the background is what Android’s floating-window hand-off
  looks like, and it is now told apart from the viewer leaving the player.
- A quality switch that empties the media element no longer backs the player
  out; the check waits to see whether the element really was torn down.
- **Every call into a site’s player was being refused.** `method.apply()`
  reaches the page’s own `Function.prototype.apply`, and the page — the less
  privileged side — cannot read the `length` of an array built in the content
  script’s compartment, so each call died with "Permission denied to access
  property length" before it arrived. Calls go through `Reflect.apply` now.
  This one bug is why quality, captions and chapters were all missing on
  YouTube; all three work.
- **A drag along the seek bar no longer throws the viewer back to the page.**
  YouTube removes its `<video>` element when it is told a seek is final, and a
  drag was telling it so every 120ms. Seeks go through the site’s own `seekTo`
  where there is one, and only the finger coming off counts as final. The watch
  that decides a video has been torn down is slower and harder to convince too.
- **The fullscreen button takes the screen.** It used to obey a stored switch
  that a stray tap could turn off for good, after which the button looked
  broken. The switch in the sheet still drops back to the overlay, for the
  session it is used in.
- The site’s player object is captured before the video is moved, so the
  quality, caption and chapter readers still have something to ask once the
  element no longer sits inside it.
- The style guard no longer answers its own writes. It compared what it had
  asked for against what the browser had stored, never matched, and rewrote
  twenty properties on every mutation it caused — which is what made the player
  crawl and fullscreen take seconds to arrive.

### Notes

- Quality on a site that embeds Playerjs — common on film sites — is still the
  site’s to choose. The page publishes the hls.js constructor and a player
  object with one opaque method; the instance that holds the ladder never
  leaves the closure. Driving the player’s own menu is the way in, and it is
  left for a later version.

## [0.2.0][] - 2026-08-02

First release submitted to addons.mozilla.org.

### Added

- Manifest V2 extension targeting Firefox for Android 142+, declaring
  `data_collection_permissions: { required: ["none"] }` so the absence of data
  collection is machine-checkable rather than merely documented.
- Video detection across frames and shadow roots, ranking candidates by visible
  area so an unloaded player below the fold cannot win over the video on screen.
- Immersive session: re-parents the video into a fullscreen stage, hides the
  site’s controls, locks to landscape, and restores the page exactly on exit.
- Seek bar with relative drag: grab it anywhere and the position moves with the
  finger, with precision scaling as the finger moves away from the bar. The
  target time rides the tip of the line while the left label holds the moment
  the drag began.
- Tap anywhere to pause, with a visible play button and −10 / +10 skip buttons
  when the controls are showing.
- Hold either side to scrub at 2x, double-tap to skip ten seconds.
- The picture fills the screen by default; pinch switches between the full
  frame and the cropped one and goes no further.
- Night light, brightness, contrast and saturation, adjusted with plus and
  minus buttons. With every value at its default no filter is applied at all.
- Netflix-style fade to grey while paused, suspended while the colour sheet is
  open so colours can be judged against the real picture.
- Settings sheet with playback speed, subtitles and quality.
- Subtitles from the site’s own tracks or a local `.srt` / `.vtt` file, with
  size and sync controls and a fallback to native cue painting. A site’s own
  default track is adopted on entry so cues render through the player’s layer.
- Preferences persist on the device through `storage.local`. Playback speed is
  deliberately excluded: it belongs to one film, not to the next.
- Build pipeline with esbuild producing an unminified, reproducible bundle;
  linting with eslint-config-metarhia and Prettier; a privacy check that fails
  the build on any network, sensor, analytics or dynamic-code API in the
  source; and CI running all of it on every commit.

### Notes

- Hold-to-scrub steps the clock rather than raising `playbackRate`, which
  Firefox for Android accepts but does not appear to honour during playback.
  There is no sound while scrubbing.
- Volume is left to the phone’s own buttons.

[unreleased]: https://github.com/itsrody/nocturne-player/compare/v0.9.1...HEAD
[0.9.1]: https://github.com/itsrody/nocturne-player/releases/tag/v0.9.1
[0.9.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.9.0
[0.8.2]: https://github.com/itsrody/nocturne-player/releases/tag/v0.8.2
[0.8.1]: https://github.com/itsrody/nocturne-player/releases/tag/v0.8.1
[0.8.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.8.0
[0.7.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.7.0
[0.6.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.6.0
[0.5.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.5.0
[0.4.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.4.0
[0.3.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.3.0
[0.2.0]: https://github.com/itsrody/nocturne-player/releases/tag/v0.2.0
