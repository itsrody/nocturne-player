# Platform notes — Firefox 158

The add-on's floor is [a single 158 for desktop and Android]. This file
records what that floor buys, what was adopted with it, and what was
weighed and left out, so the decisions do not have to be made twice.
Written October 2026, with Firefox 158 stable.

## Why 158

One floor for both platforms replaced the drift of desktop at 140 and
Android at 142. 158 is the stable release the floor was set against; MV3
is not the reason (see below).

## Adopted with the floor

| Item                                | Shipped in           | What it does here                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MediaSession bridge                 | (82, now dependable) | The system's media controls — Android notification, desktop media keys — drive the player while it holds the film: play, pause, ±10 s seeks, stop closes the player. Metadata comes from what the page itself declares.                                                                            |
| `IntersectionObserver.scrollMargin` | 141                  | Scroll-driven rescans in the watcher are exactly the neighbourhood events the approach observer fires: videos found by a sweep are watched with a 25% margin past the screen, and only their drawing near asks for the next sweep. A scroll that passes no film costs nothing.                     |
| `requestVideoFrameCallback`         | 132                  | After a feed step or a stream rewrite the first presented frame gets one more fit pass — the only moment the crop and the picture agree on what is showing.                                                                                                                                        |
| CSS anchor positioning              | 147                  | Sheets hang under the buttons that open them, margins read from the buttons rather than guessed against the topbar's padding — and the pre-player badge reads its place from the film itself, named by the video, so it follows every layout move with no scroll listener and no redraw per frame. |
| `text-box-trim`                     | 154                  | The sheet headings' spaced capitals sit exactly in their line box instead of riding a few pixels low.                                                                                                                                                                                              |
| MKV playback                        | 145                  | The browser plays Matroska itself; nothing for the add-on to do beyond documenting it.                                                                                                                                                                                                             |
| `file://` as a separate permission  | 153                  | Pages on the file system are no longer covered by an all-sites grant; the user opts in per site. Documented.                                                                                                                                                                                       |

## Weighed and left out

- **Manifest V3.** No Mozilla mandate — no MV2 sunset date has been
  announced, and nothing this add-on needs is MV3-only: no background page,
  no `webRequest`, no dynamic injection. A migration would trade a
  known-good manifest for a renamed key. `data_collection_permissions` —
  the one policy requirement — is already declared.
- **WebCodecs.** Desktop only; Firefox for Android does not ship it, and a
  `VideoFrame` built from an element specifically fails there (bug
  1884282). Nothing is built on it.
- **Reading video frames on Android.** Still broken for
  `drawImage(video)`. WebGL `texImage2D(video)` works — the path a future
  seek-bar thumbnail feature would take, and the only one that covers both
  platforms.
- **On-device speech recognition (158).** Preference-gated, Nightly-graded,
  desktop-only. The floor is stable features only.

## Notes for later

- `@starting-style` / `transition-behavior: allow-discrete` were
  considered for `player.css` and are deliberately not used: the chrome's
  hidden state is a display-block-and-fade, which transitions both ways
  without either — adopting them would be ceremony, not behaviour.
- If a future feature ever _does_ need MV3 — none is foreseen — the
  migration is `browser_action` → `action` and a manifest retest through
  `npm run lint:ext`.
