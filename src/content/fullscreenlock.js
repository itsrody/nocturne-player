import { pageWindow } from './video/pageapi.js';

// Many film players take the screen for themselves when the phone is turned:
// on landscape they put their own element into fullscreen, on portrait they
// leave it. With our player open, either one took fullscreen away from the
// stage, which read exactly like the user backing out, and the player closed
// in the middle of the turn — leaving the film playing somewhere in the page.
//
// While the player is open, the page's calls to take or leave fullscreen are
// answered as if they had worked and otherwise ignored. Our own calls are not
// affected: a content script sees the browser's methods through its Xray
// wrappers, never the page's replacements.
const LOCKED = [
  { owner: 'Element', names: ['requestFullscreen', 'mozRequestFullScreen'] },
  { owner: 'Document', names: ['exitFullscreen', 'mozCancelFullScreen'] },
];

// uBlock's set-constant defuser, in its own words: the page is free to try,
// and what it wrote is what it believes it wrote. The lock leaves as it came:
// through a property definition whose writing side is a sunk void.
export const lockPageFullscreen = () => {
  const page = pageWindow();
  if (page === null || typeof exportFunction !== 'function') return () => {};

  const restores = [];

  for (const { owner, names } of LOCKED) {
    let proto = null;
    try {
      proto = page[owner].prototype;
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        const original = proto[name];
        if (typeof original !== 'function') continue;

        // Both sides of the property stand in the page's own compartment, so
        // the page calling through it sees room for no doubt — the same
        // "pretend it worked" answer as before, carried now by a property
        // whose writing side lands in a void. Reading back the old
        // writable-own-property way left the lock defeatable in one line:
        // `Element.prototype.requestFullscreen = pageFake` over it and won.
        // The getter stands one hop above the faked method — a property
        // read hands back a function, and the call happens on the page's
        // side of that function.
        const method = exportFunction(() => page.Promise.resolve(), proto);
        const holder = exportFunction(() => method, proto);
        const sink = exportFunction(() => {}, proto);
        page.Object.defineProperty(proto, name, {
          get: holder,
          set: sink,
          configurable: true,
          enumerable: true,
        });

        restores.push(() => {
          // Restore only what we provably hold. If the page reached past the
          // lock and defined the name away from us meanwhile — a definition
          // call can, where plain assignment could not — the current
          // description is the page's own doing, and ours never touches it:
          // no stale snapshot of ours comes back on top of the page's choice.
          // And the putting-back must define through, not assign through: the
          // assignment would land in the very sink the lock stands on.
          const now = page.Object.getOwnPropertyDescriptor(proto, name);
          if (now === undefined || now.get !== holder) return;
          page.Object.defineProperty(proto, name, {
            configurable: true,
            enumerable: true,
            value: original,
            writable: true,
          });
        });
      } catch (error) {
        console.warn(`Nocturne: could not hold ${name} for the player`, error);
      }
    }
  }

  return () => {
    for (const restore of restores) {
      try {
        restore();
      } catch (error) {
        console.warn('Nocturne: could not give fullscreen back', error);
      }
    }
    restores.length = 0;
  };
};
