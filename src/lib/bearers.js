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
