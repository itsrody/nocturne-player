// One duty, one file: the reading and the spelling of the seat — the box
// the film stands in when the takeover plays it there instead of over the
// viewport. It lives apart because the session room is full of live DOM,
// players and sheets, and a test that wants to ask "which box would this
// film have been given" should not have to build all of that: this room
// answers from a stubbed element and honest arithmetic alone.
//
// The reading happens at the open of the session, while the film still
// occupies its place in the page — after the takeover has moved it there
// is no box left to read, only whatever the release will restore.

// The measured box of a film, and whether it can be seated in it. A film
// with no parent has no flow to sit in, and a box a pixel or two across
// would seat the film in a picture no wider than the buttons drawn over
// it — both films still play, but they play on the stage over the screen,
// where the viewer can actually see what they are doing.
export const readSeatBox = (video) => {
  const rect = video.getBoundingClientRect();
  return {
    fittable: video.parentNode !== null && rect.width >= 2 && rect.height >= 2,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
};

// The style the stage wears when it is the seat. The points of the craft:
//
// - `relative`, not `static`: the frame inside lives off the stage's own
//   edges, and a static box is nobody's containing block. Relative stands
//   in the page's flow exactly as a static one does, so the page's own
//   centering and margins keep working around it.
// - the box itself is pinned whole, in pixels: the page's terms said this
//   is where the film plays, so the takeover does not renegotiate with
//   whoever styled the video — and the style guard over the film would
//   otherwise spend its budget refighting a parent's own terms.
// - no `z-index`, no hoist: the seat is a neighbour in the page's own
//   stacking world, and lifting the film over its neighbours' heads is
//   what the stage over the viewport is for.
export const seatStyle = (box) => ({
  position: 'relative',
  display: 'block',
  width: `${box.width}px`,
  height: `${box.height}px`,
  margin: '0',
  padding: '0',
  border: '0',
  overflow: 'hidden',
  background: '#000',
});
