import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { createVisuals } from '../../src/content/video/visuals.js';

// The stage is answered by whatever shape the test says it is today, and it
// can be given a new shape mid-test — that is the whole point of the intent
// model. The video's style is a plain object that records what was last set
// on it, so the transition strings and the transform values can be read back.
const makeStage = (width, height) => {
  const size = { width, height };
  const rect = () => ({ width: size.width, height: size.height });
  const stage = {
    getBoundingClientRect: rect,
    // Names the stage's next shape, as a turn or a resizing site would.
    resize: (nextWidth, nextHeight) => {
      size.width = nextWidth;
      size.height = nextHeight;
    },
  };
  return stage;
};

const makeVideo = (videoWidth, videoHeight) => {
  const written = {};
  const video = {
    videoWidth,
    videoHeight,
    style: {
      setProperty: (name, value) => {
        written[name] = value;
      },
    },
  };
  return { video, written };
};

const afterEachDrops = [];

afterEach(() => {
  for (const drop of afterEachDrops) drop();
  afterEachDrops.length = 0;
  delete globalThis.matchMedia;
});

// A 3-aspect film on a 1.5-aspect stage: cover is 2, the factor that crops
// the letterbox away exactly. Wider stage shapes scale the cover up with
// them, which is what the intent has to survive.
const FILM = [1200, 400];

const coverScaleFor = (stageWidth, stageHeight) => {
  const filmAspect = FILM[0] / FILM[1];
  const stageAspect = stageWidth / stageHeight;
  const ratio =
    filmAspect > stageAspect
      ? filmAspect / stageAspect
      : stageAspect / filmAspect;
  return ratio;
};

test('fit survives the stage changing shape', () => {
  const { video } = makeVideo(...FILM);
  const stage = makeStage(600, 400);
  const visuals = createVisuals(video, stage);
  visuals.relayout();
  visuals.pinchTo(coverScaleFor(600, 400) * 0.8);
  visuals.pinchTo(1);

  stage.resize(300, 400);
  visuals.relayout();
  assert.equal(visuals.getScale(), 1);
});

test('fill survives the stage changing shape', () => {
  const { video } = makeVideo(...FILM);
  const stage = makeStage(600, 400);
  const visuals = createVisuals(video, stage);
  visuals.relayout();
  visuals.pinchTo(coverScaleFor(600, 400));

  // A taller stage makes the cover harder to satisfy, and the fill intent
  // has to follow it rather than stay at yesterday's crop.
  stage.resize(300, 400);
  visuals.relayout();
  assert.equal(visuals.getScale(), coverScaleFor(300, 400));
});

test('a free crop is re-derived from the new shape, not stretched', () => {
  const { video } = makeVideo(...FILM);
  const stage = makeStage(600, 400);
  const visuals = createVisuals(video, stage);
  visuals.relayout();
  const mid = coverScaleFor(600, 400) * 0.75;
  visuals.pinchTo(mid);

  stage.resize(300, 400);
  visuals.relayout();
  assert.equal(visuals.getScale(), coverScaleFor(300, 400) * 0.75);
});

test('a pinch before the film is measured changes nothing', () => {
  const { video } = makeVideo(0, 0);
  const visuals = createVisuals(video, makeStage(600, 400));

  // The cover it would be remembered by is a guess, so the pinch is left
  // standing rather than reclassifying an unmeasured zoom as fit.
  assert.equal(visuals.beginPinch(), 1);
  assert.equal(visuals.pinchTo(5), 1);
  assert.equal(visuals.getScale(), 1);
  visuals.endPinch();

  // The same pinch, once the film has said its shape.
  video.videoWidth = FILM[0];
  video.videoHeight = FILM[1];
  assert.equal(visuals.pinchTo(5), coverScaleFor(600, 400));
});

test('a stage without a shape answers no relayout', () => {
  const { video } = makeVideo(...FILM);
  const visuals = createVisuals(video, makeStage(0, 0));
  visuals.relayout();

  visuals.pinchTo(coverScaleFor(600, 400));
  assert.equal(visuals.relayout(), false);
});

test('pinching drops the transform glide until the fingers lift', () => {
  const { video, written } = makeVideo(...FILM);
  const visuals = createVisuals(video, makeStage(600, 400));

  visuals.beginPinch();
  visuals.pinchTo(coverScaleFor(600, 400));
  assert.equal(written.transition.includes('transform'), false);
  assert.equal(written.transition.includes('filter'), true);

  visuals.endPinch();
  assert.equal(written.transition.includes('transform'), true);
});

test('a screen set to calm settles without the glides', () => {
  globalThis.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion'),
  });
  afterEachDrops.push(() => delete globalThis.matchMedia);

  const { video, written } = makeVideo(...FILM);
  const visuals = createVisuals(video, makeStage(600, 400));
  visuals.relayout();
  assert.equal(written.transition, 'none');
});

test('colour rides one filter with every function, in order', () => {
  const { video, written } = makeVideo(...FILM);
  const visuals = createVisuals(video, makeStage(600, 400));

  // Neutral is no filter at all — the film as the site encoded it.
  visuals.relayout();
  assert.equal(written.filter, 'none');

  visuals.setColour({ saturate: 1.2, contrast: 1, brightness: 0.9 });
  assert.equal(written.filter, 'saturate(1.2) contrast(1) brightness(0.9)');
});
