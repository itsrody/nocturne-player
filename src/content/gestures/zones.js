export const ZONE = {
  LEFT: 'left',
  MIDDLE: 'middle',
  RIGHT: 'right',
};

// Three zones across the whole picture, read from the finger's own x and
// nothing else. There is no vertical subdivision any more: the seek bar is a
// real element now, and it answers for its own taps and drags — the zones
// are only ever the picture's, and they span its full height. The sides
// stay wide the way a phone video app draws them, two fifths of the picture
// each: a sloppy second tap of a double-tap must still land on one, while
// the middle — where a tap now toggles the film itself, pause and play —
// stays a narrow strip nobody accidentally means.
const LEFT_EDGE = 0.4;
const RIGHT_EDGE = 0.6;

export const hitTest = (x, width) => {
  if (x < LEFT_EDGE * width) return ZONE.LEFT;
  if (x > RIGHT_EDGE * width) return ZONE.RIGHT;
  return ZONE.MIDDLE;
};

// A run of taps that keeps seeking lives on the sides: the middle toggles
// instead, and a run of toggles is not a thing the bar wants read.
export const isSide = (zone) => zone === ZONE.LEFT || zone === ZONE.RIGHT;
