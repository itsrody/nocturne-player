// The seating room's own law: which films can be seated in the box the
// page gave them, and what the style pinned on the stage says when they
// are. Nothing here touches a real document — the element is a stub with
// only the two things the reading asks of it, a parent and a measure, so
// the law answers from arithmetic alone.
import test from 'node:test';
import assert from 'node:assert/strict';

import { readSeatBox, seatStyle } from '../../src/content/seating.js';

// A stub element: a parent to be seated in (or none), and the box it
// stands in today. Only these two facts the seating room reads.
const fakeVideo = (rect, parent = { child: [] }) => ({
  parentNode: parent,
  getBoundingClientRect: () => rect,
});

test('a film in a real box reads as seatable', () => {
  const box = readSeatBox(fakeVideo({ width: 640.4, height: 359.6 }));
  assert.equal(box.fittable, true);
  // The box the seat wears is whole pixels: the measurements a layout
  // hands out carry fractions, and a style string with a fraction in it
  // is one some sites' own guards would quietly rewrite.
  assert.deepEqual(box.width, 640);
  assert.deepEqual(box.height, 360);
});

test('a film with no box to sit in is not seatable, and is measured', () => {
  // No parent: there is no flow for a seat to live in.
  const parentless = readSeatBox(fakeVideo({ width: 640, height: 360 }, null));
  assert.equal(parentless.fittable, false);
  assert.deepEqual([parentless.width, parentless.height], [640, 360]);
  // A box a pixel across, or zero high — the film plays, but there is
  // nothing a viewer could watch it in.
  for (const rect of [
    { width: 1, height: 400 },
    { width: 640, height: 0 },
  ]) {
    const box = readSeatBox(fakeVideo(rect));
    assert.equal(box.fittable, false);
  }
});

test('the seat style stands in the page’s own flow', () => {
  const style = seatStyle({ width: 640, height: 360 });
  assert.equal(style.position, 'relative');
  assert.equal(style.display, 'block');
  // The two measures are the whole purpose of the room: the box the film
  // stood in, spelled as a style the stage keeps.
  assert.equal(style.width, '640px');
  assert.equal(style.height, '360px');
  // And the points it must not have: no hoist, no fixed reach over the
  // page — that is the other manner's business.
  assert.equal(style['z-index'], undefined);
  assert.equal(style.position !== 'fixed', true);
});
