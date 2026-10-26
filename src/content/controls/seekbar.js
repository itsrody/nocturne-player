import { chapterAt } from '../video/chapters.js';
import { formatClock } from '../../lib/time.js';
import { el } from '../shell.js';

const PREVIEW_INTERVAL_MS = 120;

// Pull the finger away from where the drag took hold and the same swipe
// covers less time, so a two-hour film can be landed on the exact scene.
// The origin is wherever the drag began — the bar or anywhere on the
// picture — by one rule for all of them.
const PRECISION_STEPS = [
  { withinPx: 40, factor: 1 },
  { withinPx: 100, factor: 0.5 },
  { withinPx: 180, factor: 0.25 },
  { withinPx: Infinity, factor: 0.1 },
];

const precisionFor = (distancePx) => {
  for (const step of PRECISION_STEPS) {
    if (distancePx <= step.withinPx) return step;
  }
  return PRECISION_STEPS[PRECISION_STEPS.length - 1];
};

// The third argument is a listener for the head ball's own grab: the
// controls must hold on for as long as the ball is held, since a drag on
// them otherwise walks off mid-scrub at the idle fade.
export const createSeekBar = (video, seek, { onScrub } = {}) => {
  // One clock at the bar's right end, read as "current / duration": the
  // place in the film and its whole length at one glance.
  const timer = el('span', { class: 'time', text: '0:00' });
  const fill = el('div', { class: 'seek-fill' });
  const marks = el('div', { class: 'seek-marks' });
  const zones = el('div', { class: 'seek-zones' });
  const track = el('div', { class: 'seek-track' }, [fill, zones, marks]);
  const headTime = el('span', { class: 'seek-time', text: '0:00' });
  // The playback head: a ball riding the tip of the fill, inside the area
  // and not the track, so the track cannot clip its bulge at either edge.
  const head = el('div', { class: 'seek-head' });
  const area = el('div', { class: 'seek-area' }, [track, head, headTime]);
  const chapterLabel = el('div', { class: 'chapter' });
  const row = el('div', { class: 'seek-row' }, [area, timer]);
  const root = el('div', { class: 'seekbar' }, [chapterLabel, row]);

  let isScrubbing = false;
  let scrubTime = 0;
  // Where the drag took hold. The bar is one such place and no longer the
  // only one; every distance in the precision ladder is measured from here.
  let scrubOriginY = null;
  let lastPreviewAt = 0;
  let chapters = [];
  let arePlaced = false;
  let spans = [];

  const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);

  // The dividers can only be placed once the film has told us how long it is,
  // so placing them is retried from the paint that follows.
  const placeMarks = () => {
    const total = duration();
    if (arePlaced || chapters.length === 0 || total === 0) return;
    const dividers = chapters
      .filter((chapter) => chapter.start > 0 && chapter.start < total)
      .map((chapter) => {
        const mark = el('span', { class: 'seek-mark' });
        mark.style.left = `${(chapter.start / total) * 100}%`;
        return mark;
      });
    marks.replaceChildren(...dividers);
    arePlaced = true;
  };

  // Stretches of the film painted onto the track — the opening, once it has
  // been recognised — redrawn whenever the length of the film is learned.
  const placeZones = () => {
    const total = duration();
    if (total === 0) return;
    const drawn = spans.map((span) => {
      const zone = el('span', { class: 'seek-zone' });
      zone.style.left = `${(span.start / total) * 100}%`;
      zone.style.width = `${((span.end - span.start) / total) * 100}%`;
      return zone;
    });
    zones.replaceChildren(...drawn);
  };

  const showChapter = (time) => {
    if (chapters.length === 0) return;
    const chapter = chapterAt(chapters, time);
    const title = chapter === null ? '' : chapter.title;
    if (chapterLabel.textContent === title) return;
    chapterLabel.textContent = title;
    chapterLabel.classList.toggle('is-visible', title !== '');
  };

  // While scrubbing the clock holds the moment the drag started, so the
  // target time on the line is not simply repeated back to the user and they
  // can see where to return to.
  // The clock reads as "current / duration" once the film has a length;
  // while it is still unknown, the current time alone.
  const timerText = (time) => {
    const total = duration();
    return total > 0
      ? `${formatClock(time)} / ${formatClock(total)}`
      : formatClock(time);
  };

  const paint = (time) => {
    const total = duration();
    placeMarks();
    showChapter(time);
    const ratio = total > 0 ? Math.min(1, Math.max(0, time / total)) : 0;
    fill.style.transform = `scaleX(${ratio})`;
    area.style.setProperty('--progress', `${ratio * 100}%`);
    headTime.textContent = formatClock(time);
    if (!isScrubbing) timer.textContent = timerText(time);
  };

  const sync = () => {
    if (isScrubbing) return;
    paint(video.currentTime);
  };

  const start = ({ y } = {}) => {
    scrubOriginY = typeof y === 'number' ? y : null;
    scrubTime = video.currentTime;
    lastPreviewAt = 0;
    timer.textContent = timerText(scrubTime);
    isScrubbing = true;
    root.classList.add('is-scrubbing');
  };

  const move = ({ dx, y, width }) => {
    const total = duration();
    if (total === 0) return;

    // Leaning away from the drag's origin trades reach for precision. For
    // a grab that began on the bar, this is the rule it always had — the
    // bar is the hold's own origin. For a grab that began anywhere, the
    // same rule travels with the finger.
    const step = precisionFor(
      scrubOriginY === null ? 0 : Math.abs(y - scrubOriginY),
    );
    scrubTime += (dx / width) * total * step.factor;
    scrubTime = Math.min(total, Math.max(0, scrubTime));
    paint(scrubTime);

    const now = performance.now();
    if (now - lastPreviewAt < PREVIEW_INTERVAL_MS) return;
    lastPreviewAt = now;
    seek(scrubTime, false);
  };

  const end = () => {
    if (!isScrubbing) return;
    isScrubbing = false;
    root.classList.remove('is-scrubbing');
    if (duration() > 0) seek(scrubTime);
    paint(scrubTime);
  };

  // A tap on the bar itself is answered where the finger was: the moment
  // under the tap is the one that plays, the way the fill's own ruler
  // reads it. It is the tap's anchor that speaks, not its lift — the drift
  // a thumb makes between down and up is not aim, and a band-wide ruler
  // would pay for it in film. Off the track's own edges the answer is
  // clamped to its reach; the labels beside it aim at its ends.
  const jumpToTap = ({ clientX } = {}) => {
    const total = duration();
    if (total === 0) return;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(ratio * total);
    paint(ratio * total);
  };

  // Grabbing the ball itself: a second way to scrub, for a finger that aims
  // at the head rather than resting on the picture. The grab never jumps —
  // the drag starts from where the film stands, and its reach maps onto the
  // very same precision ladder the anywhere-scrub uses, measured from the
  // drag's own start as its rule says. A finger lost mid-drag (a call or
  // leaving the sheet) is an abort: the commit is refused and the film is
  // left where it was grabbed, not painted at a place it never arrived at.
  let headPointerId = null;
  let headLastX = 0;
  let headOriginY = 0;
  let headWidth = 0;

  const grabHead = (event) => {
    // The film needs a length before a drag has anywhere to stand; a scrub
    // another finger is already driving stays the other finger's alone.
    if (isScrubbing || duration() === 0) return;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return;
    event.preventDefault();
    // The surface must not also read the hold: one drag belongs to one owner.
    event.stopPropagation();
    headPointerId = event.pointerId;
    headLastX = event.clientX;
    headOriginY = event.clientY;
    // Read once at the hold and no further: per-move layout reads are the
    // price the old bar paid, and the finger does not rescale mid-drag.
    headWidth = rect.width;
    head.setPointerCapture(event.pointerId);
    start({ y: headOriginY });
    onScrub?.(true);
  };

  const dragHead = (event) => {
    if (event.pointerId !== headPointerId) return;
    const dx = event.clientX - headLastX;
    headLastX = event.clientX;
    move({ dx, y: event.clientY, width: headWidth });
  };

  const releaseHead = (event) => {
    if (event.pointerId !== headPointerId) return;
    headPointerId = null;
    onScrub?.(false);
    end();
  };

  const abortHead = (event) => {
    if (event.pointerId !== headPointerId) return;
    headPointerId = null;
    onScrub?.(false);
    isScrubbing = false;
    root.classList.remove('is-scrubbing');
    paint(video.currentTime);
  };

  head.addEventListener('pointerdown', grabHead);
  head.addEventListener('pointermove', dragHead);
  head.addEventListener('pointerup', releaseHead);
  head.addEventListener('pointercancel', abortHead);

  video.addEventListener('timeupdate', sync);
  video.addEventListener('durationchange', sync);
  video.addEventListener('durationchange', placeZones);
  video.addEventListener('seeked', sync);
  sync();

  // The transport row lives inside the strip: the player's own buttons are
  // handed over here once they exist and are re-set in front of the bar,
  // with the clock trailing off its right end. The strip was built to be
  // the whole bottom edge — the centre overlay it retired folded into it.
  const setControls = (nodes = []) => {
    row.replaceChildren(...nodes, area, timer);
  };

  return {
    root,
    start,
    move,
    end,
    jumpToTap,
    setControls,
    setZones: (list) => {
      spans = list;
      placeZones();
    },
    setChapters: (list) => {
      chapters = list;
      arePlaced = false;
      placeMarks();
      showChapter(video.currentTime);
    },
    destroy: () => {
      video.removeEventListener('timeupdate', sync);
      video.removeEventListener('durationchange', sync);
      video.removeEventListener('durationchange', placeZones);
      video.removeEventListener('seeked', sync);
      head.removeEventListener('pointerdown', grabHead);
      head.removeEventListener('pointermove', dragHead);
      head.removeEventListener('pointerup', releaseHead);
      head.removeEventListener('pointercancel', abortHead);
    },
  };
};
