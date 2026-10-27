// Everything a site’s own player knows about itself — the quality ladder, the
// caption list — lives in the page’s JavaScript, which a content script sees
// only through Gecko’s Xray wrappers. Waiving those wrappers is the supported
// way in on Firefox, and it stays a read of objects the page already made: no
// code is injected into the page and nothing is evaluated from a string.
//
// Nothing here can throw at the caller. A site is free to have a getter that
// raises, a method that is missing, or a value from a compartment we cannot
// touch; every one of those means "this player cannot do that", not "the
// player is broken".
// Bounded, but generously: the sweep is the sheet’s opening question, and a
// page that has outgrown the bound silently loses its engine to the cut. A
// register of two thousand globals costs a moment once, when the sheet opens.
const MAX_SCANNED_KEYS = 2000;

// Null rather than a throw where there is no window at all, so that a sweep of
// the page’s globals is simply an empty answer instead of an error every caller
// would have to catch.
export const pageWindow = () => {
  if (typeof window === 'undefined') return null;
  return window.wrappedJSObject ?? window;
};

// Structured-cloned into the page’s compartment so a page function can read it.
// Falls back to the plain value where the helper is absent, which is a context
// that already shares one compartment with the page.
export const toPage = (value) => {
  if (typeof cloneInto !== 'function') return value;
  try {
    return cloneInto(value, pageWindow());
  } catch {
    return value;
  }
};

export const read = (object, key) => {
  if (object === null || typeof object !== 'object') return null;
  try {
    const value = object[key];
    return value === undefined ? null : value;
  } catch {
    return null;
  }
};

const apply = (object, name, args, quiet) => {
  if (object === null || typeof object !== 'object') return null;
  let method;
  try {
    method = object[name];
  } catch {
    return null;
  }
  if (typeof method !== 'function') return null;
  try {
    // Reflect.apply, not method.apply: the latter reaches the page’s own
    // Function.prototype.apply, which then tries to read `length` off an array
    // built in our compartment and is refused — "Permission denied to access
    // property length". Every call into a site’s player failed that way, which
    // is why the quality ladder and the caption list both came back empty on
    // YouTube. Reflect is ours, so the arguments are unpacked on
    // this side and the page only ever sees the values.
    const value = Reflect.apply(method, object, args);
    return value === undefined ? null : value;
  } catch (error) {
    if (!quiet) {
      console.warn(`Nocturne: ${name}() failed on the site’s player`, error);
    }
    return null;
  }
};

export const call = (object, name, ...args) => apply(object, name, args, false);

// An identification-phase call is a question about shape, not an order:
// 'no' is an answer, and it is nobody’s console noise — the sweep may ask
// hundreds of the page’s objects, and a decorative api() that raises is a
// page that has said nothing to say.
export const probe = (object, name, ...args) => apply(object, name, args, true);

export const write = (object, key, value) => {
  if (object === null || typeof object !== 'object') return false;
  try {
    object[key] = value;
    return true;
  } catch {
    return false;
  }
};

// Page arrays come from another compartment, so they are walked by index
// rather than spread: an iterator that throws must not take the player down.
export const toArray = (value) => {
  const length = read(value, 'length');
  if (typeof length !== 'number' || !Number.isFinite(length)) return [];
  const items = [];
  for (let index = 0; index < length; index++) {
    items.push(read(value, index));
  }
  return items;
};

export const isFunction = (object, name) => {
  if (object === null || typeof object !== 'object') return false;
  try {
    return typeof object[name] === 'function';
  } catch {
    return false;
  }
};

// The climb asks the family of the video in the page, and a family is
// cheap to re-enter by way of a memory that re-checks itself: the
// ancestor found stays valid exactly as long as the element is still of
// it, which the one native `contains` reading answers. The names are
// part of the memory because the answer is an answer to a question — a
// climb with different names is a different climb.
const rememberedClimbs = new WeakMap();

// A site’s player API usually lives on an ancestor of the video: YouTube puts
// it on #movie_player. This has to be read before the video is moved onto our
// stage, because afterwards the chain of ancestors is ours, not theirs.
export const findApiAncestor = (element, names) => {
  // The memory answers only a repeat of the same ask about the same
  // family. A miss is not remembered at all: a page that builds its
  // player later must have the walk waiting for it, and a failed climb
  // is bounded by the chain’s depth — nothing worth remembering the
  // absence of.
  const memory = rememberedClimbs.get(element);
  if (memory !== undefined && memory.names === names) {
    try {
      // The one native reading decides: is the element still of the
      // family whose finding is on hand? It is when the memory is good,
      // and it throws too when the family is gone entirely — both
      // non-answers fall to the walk.
      if (element.contains(memory.ancestor)) return memory.waived;
    } catch {
      // The fall to the walk answers a throw the same as a no.
    }
    rememberedClimbs.delete(element);
  }
  let node = element.parentElement;
  while (node !== null) {
    const waived = node.wrappedJSObject ?? node;
    for (const name of names) {
      if (isFunction(waived, name)) {
        rememberedClimbs.set(element, { names, ancestor: node, waived });
        return waived;
      }
    }
    node = node.parentElement;
  }
  return null;
};

// A last resort for players that keep their engine on a global under a name
// only they know. Bounded, and every property read is guarded, because a getter
// on a page global can throw or be expensive.
//
// Every matcher is tried against each global in one sweep, and the first object
// that answers to a matcher is kept for it. Sweeping once per engine instead
// meant walking the page’s globals several times over, through
// cross-compartment wrappers, in the moment the viewer was waiting.
export const findGlobalMatches = (matchers, onCut = null) => {
  const scope = pageWindow();
  const found = {};
  if (scope === null) return found;
  let keys;
  try {
    keys = Object.keys(scope);
  } catch {
    return found;
  }

  // A page with more globals than the budget is read only to a cut, and
  // whoever asked deserves to know that the cut happened: an engine behind
  // the cut is indistinguishable from no engine on the page, and the debug
  // switch is the place the difference says itself.
  if (onCut !== null && keys.length > MAX_SCANNED_KEYS) onCut(keys.length);

  let missing = matchers.length;
  const limit = Math.min(keys.length, MAX_SCANNED_KEYS);
  for (let index = 0; index < limit && missing > 0; index++) {
    const value = read(scope, keys[index]);
    if (value === null || typeof value !== 'object') continue;
    for (const matcher of matchers) {
      if (found[matcher.name] !== undefined) continue;
      try {
        if (matcher.matches(value)) {
          found[matcher.name] = value;
          missing--;
        }
      } catch {
        continue;
      }
    }
  }
  return found;
};
