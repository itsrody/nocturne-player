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

// How far a press on the pill may wander before it is read as a scrub —
// the same wander a tap may carry: under the line the lift is the tap the
// finger meant, so the jump waits for it.
const TAP_TOLERANCE_PX = 12;

const precisionFor = (distancePx) => {
  for (const step of PRECISION_STEPS) {
    if (distancePx <= step.withinPx) return step;
  }
  return PRECISION_STEPS[PRECISION_STEPS.length - 1];
};

// The third argument is a listener for the head ball's own grab: the
// controls must hold on for as long as the ball is held, since a drag on
// them otherwise walks off mid-scrub at the idle fade.
export const createControlBar = (video, seek, { onScrub } = {}) => {
  // One clock at the bar's right end, read as "current / duration": the
  // place in the film and its whole length at one glance.
  const timer = el('span', { class: 'time', text: '0:00' });
  const fill = el('div', { class: 'seek-fill' });
  const marks = el('div', { class: 'seek-marks' });
  const track = el('div', { class: 'seek-track' }, [fill, marks]);
  const headTime = el('span', { class: 'seek-time', text: '0:00' });
  // The playback head: a ball riding the tip of the fill, inside the area
  // and not the track, so the track cannot clip its bulge at either edge.
  const head = el('div', { class: 'seek-head' });
  const area = el('div', { class: 'seek-area' }, [track, head, headTime]);
  const chapterLabel = el('div', { class: 'chapter' });
  // The bar is framed by two slots: the transport before it, and at the far
  // right the clock with whatever buttons keep it company. Two groups
  // rather than bare flex children, so a narrow row can squeeze the ruler
  // — the one thing built to give — without tearing the clock from the
  // button beside it or pushing the transport off the strip.
  const lead = el('div', { class: 'controlbar-lead' });
  const tail = el('div', { class: 'controlbar-tail' }, [timer]);
  const row = el('div', { class: 'controlbar-row' }, [lead, area, tail]);
  const root = el('div', { class: 'controlbar' }, [chapterLabel, row]);

  let isScrubbing = false;
  let scrubTime = 0;
  // Where the drag took hold. The bar is one such place and no longer the
  // only one; every distance in the precision ladder is measured from here.
  let scrubOriginY = null;
  let lastPreviewAt = 0;
  let chapters = [];
  let arePlaced = false;

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

  // A hold lost rather than finished — a call, the sheet's take of the
  // finger — is an abort, not a commit: the film is left where it did
  // stand, not painted at a place it never arrived at. Head grabs and bar
  // presses both end in it, so the two paths cannot drift apart.
  const abandonScrub = () => {
    isScrubbing = false;
    root.classList.remove('is-scrubbing');
    paint(video.currentTime);
  };

  // A tap on the bar itself is answered where the finger settled: the
  // moment under the tap plays, the way the fill's own ruler reads it. The
  // tap's aim is the resting place the eye was watching when the tap was
  // done — not the press's first landing, which can carry the tolerance's
  // own twelve pixels and pay them out in minutes of film on a wide ruler.
  // Off the track's own edges the answer is clamped to its reach; the
  // labels beside it aim at its ends.
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
  // Each hold's own claim — id, last seat, origin, and the one layout read
  // per hold — sits here beside the other's: one hold belongs to one
  // finger, and the head's guard reads the area's claim to enforce it.
  let headPointerId = null;
  let headLastX = 0;
  let headOriginY = 0;
  let headWidth = 0;
  let areaPointerId = null;
  let areaLastX = 0;
  let areaOriginX = 0;
  let areaOriginY = 0;
  let areaWidth = 0;

  const grabHead = (event) => {
    // The film needs a length before a drag has anywhere to stand. One
    // hold belongs to one finger: a press the bar has claimed stays hers
    // even before it has crossed into a scrub, else a second finger could
    // take the ball and then the first could start a scrub under it.
    if (areaPointerId !== null || isScrubbing || duration() === 0) return;
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
    abandonScrub();
  };

  head.addEventListener('pointerdown', grabHead);
  head.addEventListener('pointermove', dragHead);
  head.addEventListener('pointerup', releaseHead);
  head.addEventListener('pointercancel', abortHead);

  // The pill's own finger handling — the seek bar is a real element, not a
  // band guessed off the picture behind it. A press that settles without
  // wandering is a tap and jumps to the place the finger rested on; a pull
  // past the tap's own tolerance is a scrub through the very same
  // precision ladder, with the hold owned by the area itself so the
  // finger's take is not lost if it slips off the pill mid-drag. Both
  // refuse what the head owns: its grab stops propagation before this can
  // hear it, and a once-only owner is one rule for both readers.
  const downArea = (event) => {
    if (areaPointerId !== null || isScrubbing || duration() === 0) return;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return;
    event.preventDefault();
    areaPointerId = event.pointerId;
    areaLastX = event.clientX;
    areaOriginX = event.clientX;
    areaOriginY = event.clientY;
    areaWidth = rect.width;
    area.setPointerCapture(areaPointerId);
  };

  const moveArea = (event) => {
    if (event.pointerId !== areaPointerId) return;
    const dx = event.clientX - areaLastX;
    areaLastX = event.clientX;
    // The tap boundary is the everywhere-scrub's own, and it is the whole
    // wander from the press's seat that crosses it — both axes cumulative
    // from the start, the recognizer's rule. A slice of the travel would
    // never do: a slow hand moves under the line per event forever, and a
    // per-event measure would call its whole haul a tap. Under the line
    // the press is still a possible tap, so the answer waits for the lift.
    if (
      !isScrubbing &&
      Math.hypot(event.clientX - areaOriginX, event.clientY - areaOriginY) <
        TAP_TOLERANCE_PX
    ) {
      return;
    }
    // The hold's origin is the press's own seat: the precision ladder is
    // measured from where the finger took the bar, not from wherever the
    // drag began to walk.
    if (!isScrubbing) start({ y: areaOriginY });
    move({ dx, y: event.clientY, width: areaWidth });
  };

  const upArea = (event) => {
    if (event.pointerId !== areaPointerId) return;
    areaPointerId = null;
    if (isScrubbing) end();
    else jumpToTap({ clientX: areaLastX });
  };

  const cancelArea = (event) => {
    if (event.pointerId !== areaPointerId) return;
    areaPointerId = null;
    abandonScrub();
  };

  area.addEventListener('pointerdown', downArea);
  area.addEventListener('pointermove', moveArea);
  area.addEventListener('pointerup', upArea);
  area.addEventListener('pointercancel', cancelArea);

  video.addEventListener('timeupdate', sync);
  video.addEventListener('durationchange', sync);
  video.addEventListener('seeked', sync);
  sync();

  // The bottom of the screen is the player's own control bar: the transport,
  // the ruler and the clock live over it in one strip, and the gear that
  // opens settings trails the clock at the far right. The player's buttons
  // are handed over here once they exist — what leads, and what trails.
  // The strip was built to be the whole bottom edge — the centre overlay it
  // retired folded into it.
  const setControls = (nodes = [], trailing = []) => {
    lead.replaceChildren(...nodes);
    tail.replaceChildren(timer, ...trailing);
  };

  return {
    root,
    start,
    move,
    end,
    setControls,
    setChapters: (list) => {
      chapters = list;
      arePlaced = false;
      placeMarks();
      showChapter(video.currentTime);
    },
    destroy: () => {
      video.removeEventListener('timeupdate', sync);
      video.removeEventListener('durationchange', sync);
      video.removeEventListener('seeked', sync);
      head.removeEventListener('pointerdown', grabHead);
      head.removeEventListener('pointermove', dragHead);
      head.removeEventListener('pointerup', releaseHead);
      head.removeEventListener('pointercancel', abortHead);
      area.removeEventListener('pointerdown', downArea);
      area.removeEventListener('pointermove', moveArea);
      area.removeEventListener('pointerup', upArea);
      area.removeEventListener('pointercancel', cancelArea);
    },
  };
};
