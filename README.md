[![CI](https://github.com/itsrody/nocturne-player/actions/workflows/ci.yml/badge.svg)](https://github.com/itsrody/nocturne-player/actions/workflows/ci.yml)
[![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![No data collected](https://img.shields.io/badge/data%20collected-none-brightgreen.svg)](PRIVACY.md)

### Default browser player:

<img width="2856" height="1280" alt="default" src="https://github.com/user-attachments/assets/971f9017-4d59-406a-bff8-cce5e8c96229" />

### This Player:

<img width="2560" height="1147" alt="image" src="https://github.com/user-attachments/assets/739d01a8-7592-43e8-a7ba-e8ce2950718a" />

<img width="2560" height="1147" alt="image" src="https://github.com/user-attachments/assets/bb180257-44ac-4c46-a0e8-94551d936327" />

<img width="2560" height="1147" alt="image" src="https://github.com/user-attachments/assets/fd545609-f1e6-4d7f-895a-353c924992e9" />

Works on any site that plays a plain `<video>`, and on YouTube.

## Key features

### Colour

The palette button tunes the picture: **brightness**, **contrast**,
**saturation**, and a warm **night light** for watching in the dark. The
choice is remembered for the next film.

## Everything else

- **Seek bar** — scrub two ways: a horizontal drag on the picture is the
  same as grabbing the bar itself, and the white head at the timeline's tip
  can be grabbed and pulled directly. A tap on the visible bar jumps to the
  moment under the finger. Leaning the finger away from where it took hold
  trades reach for precision. A drag that lifts before it has engaged was a
  tap. Backward, play and forward sit in the strip to the bar's left; the
  clock reads "current / duration" at its right end.
- **Double-tap** the right side for +10 s, the left for −10 s. Keep tapping to
  go further.
- **Hold** anywhere on the picture to run it at the hold-speed chip (2x at
  default) for as long as the finger stays down; the old pace comes back on
  lift. Rewind is the seek band's business.
- **Tap** anywhere on the picture shows or hides the controls — the first tap
  of a double-tap too. Only the play button pauses.
- On a desktop, **moving the mouse** over the picture keeps the controls up
  and never lets them fade out from under the pointer.
- **Swipe** up through TikTok / Reels / Shorts feeds for the next video.
- **Swipe down** puts the player away, the way a sheet is put away: the whole
  player — picture and controls — follows the finger down the screen, and the
  moment the pull passes a third of the screen's height it is out; a shorter
  pull snaps back to where it was.
- **Pinch** to fill the screen and crop black bars.
- **Follows the window** — portrait or landscape, resizing mid-film included.
- **The system's media controls** — the Android notification and the desktop
  keyboard keys drive the player while it holds the film: play, pause, stepping
  forward and back, and stop closes the player.
- **Quality, audio track, speed, subtitles** (site tracks or your own
  `.srt` / `.vtt`) in the settings sheet.
- **Seasons and episodes** picker, and chapter marks on the seek bar.

## Privacy

- Permissions: `storage` (your settings, on the device) and `activeTab`.
- No `fetch`, no `XMLHttpRequest`, no remote URLs — a CI check enforces it.
- Nothing is collected or sent. Works offline. The build is not minified.
- It runs on all sites only to find the `<video>`; you can turn it off per
  site in the popup.

See [PRIVACY.md](PRIVACY.md).

## Limitations

- **Quality** works with `<source>` lists, YouTube, hls.js, dash.js, Shaka and
  Playerjs. Elsewhere the row shows what is playing.
- **Rewind** is stepped seeking — browsers cannot play backwards.
- **Volume** stays where the site put it; on Android it follows the hardware
  buttons.
- **Saving a frame** is impossible: Firefox for Android does not let any
  script read a video frame.
- **Pages on the file system** are skipped until you grant them: Firefox
  keeps `file://` behind its own permission, separate from an all-sites
  grant.

## Install

From [addons.mozilla.org](https://addons.mozilla.org). Needs Firefox 158+,
on desktop and Android alike.

## Development

```bash
npm ci
npm run lint      # eslint, prettier, web-ext lint, privacy check
npm test
npm run build     # dist/
npm run package   # artifacts/nocturne_player-<version>.zip
```

On a phone (enable **Remote debugging via USB** in Firefox's developer
settings first):

```bash
npm run fixture && npm run serve &
adb reverse tcp:8422 tcp:8422
npm run start:android   # then open http://localhost:8422/
```

- Don't run `build:clean` while `web-ext run` is active — it stops the session.
- After a rebuild, reload the page on the phone to get the new content script.

`npm audit` warnings come from `web-ext`, a dev-only dependency; nothing from
`node_modules` ships.

## License

[MPL-2.0](LICENSE)
