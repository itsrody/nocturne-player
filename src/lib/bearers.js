// The bearer words: the one policy every mouth of the house reads. A
// bearer word is a header the page itself said at the stream’s manifest
// ask — never an invention, never a rule the house wrote. The carried
// words are the credentials and the site’s own `x-` names, and only
// those: the page’s cookie jar and its forwarding context (`cookie`,
// `origin`, `referer`, `host`) are its own mouths’ furniture, and the
// fetch standard forbids hands like these from writing most of it
// anyway. A miss — no word said, no carried name in the word — is no
// word at all.
//
// The word arrives in two shapes and this one door reads both: the
// ear’s raw material (the array of name-and-value pairs the platform
// hands over) and the book’s record (the normalized object the
// wiring said). Both are normalized here, so the mouths need only
// ask.
const pairs = (heads) =>
  Array.isArray(heads)
    ? heads.map((one) => [one?.name, one?.value])
    : Object.entries(heads ?? {});

const carried = ([name, value]) =>
  typeof value === 'string' &&
  (name === 'authorization' || name.startsWith('x-'));

export const bearerWords = (heads) =>
  Object.fromEntries(
    pairs(heads)
      .map(([name, value]) => [
        typeof name === 'string' ? name.toLowerCase() : name,
        value,
      ])
      .filter(carried),
  );

// The routed ask’s replay law, the same one file, one policy wider: a
// routed ask replays the page’s own reader furniture — what range of
// bytes it wants, what it will accept, when it last asked (`if-*`) —
// beside the carried credentials above. The cookie jar and the
// forwarding context (`cookie`, `origin`, `referer`, `host`) are
// still nobody’s replay: the browser attaches what the asking side
// truly is, and the house forges nothing of a page it is standing
// beside. Both mouths of the routing (the shim at the saying side and
// the hub at its own hearing) read this one door, so no second copy of
// the law can drift apart from the first.
export const REPLAYED = new Set([
  'accept',
  'accept-language',
  'range',
  'if-none-match',
  'if-modified-since',
  'authorization',
]);

export const isReplayed = (name) => {
  const said = String(name ?? '').toLowerCase();
  return REPLAYED.has(said) || said.startsWith('x-');
};

export const replayedHeads = (heads) =>
  pairs(heads)
    .filter(([name]) => isReplayed(name))
    .map(([name, value]) => ({ name, value }));

// The routed ask’s replay, with the room’s own word underneath. The
// ask itself wins — a name the page said at the ask is replayed as
// the ask said it — and a carried name the ask forgot fills the gap,
// the same weakness the bearer room answers on the page’s own asks:
// a player that says its credentials at the manifest ask and forgets
// them at the segments’. This is the door the hub’s hearing reads;
// the shim’s saying side reads `replayedHeads` alone, because a room
// word is the background’s knowledge and the shim speaks the page’s
// own sentence only.
export const replayedOn = (askHeads, roomWord) => {
  const said = replayedHeads(askHeads);
  for (const [name, value] of Object.entries(bearerWords(roomWord ?? {}))) {
    if (!said.some((one) => one.name.toLowerCase() === name)) {
      said.push({ name, value });
    }
  }
  return said;
};
