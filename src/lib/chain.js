// The chain of names between a document and the eye at the top of the
// window tree. Two consumers read one law through it: a frame deciding who
// settings its film belongs to, and the background deciding whether a
// frame is owed a field agent at all. Both bring the same shape — the
// document's own host, and the origins standing above it as the platform
// lists them — so both decide by the same rule, whatever room they sit in.

// The decision about a framed film is the embedding pages', plural: every
// named origin between the film and the eye names itself, because a page's
// settings speak for the page the viewer is actually looking at. The chain
// is read from what the platform hands over — ancestorOrigins answers for
// the same-origin and the cross-origin case alike, carries the whole
// nesting depth, and shipped in Firefox 148, under the floor of 158: it is
// always there. No window is ever touched. In a frame the list comes off
// the document's own location; in the background it comes off the wire's
// own envelope — same read, same truth.
//
// A guest's own seat often carries no name — about:srcdoc and sandboxed
// frames have an empty or opaque host — so an empty one offers nothing and
// the decision the nearest named ancestor above it made is what counts.
export const chainHosts = (loc) => {
  const seen = new Set();
  const hosts = [];
  const offer = (host) => {
    if (typeof host !== 'string' || host === '' || seen.has(host)) return;
    seen.add(host);
    hosts.push(host);
  };

  offer(loc.host);
  const chain = loc.ancestorOrigins;
  if (chain !== undefined) {
    for (let index = 0; index < chain.length; index++) {
      let host;
      try {
        host = new URL(chain[index]).host;
      } catch {
        // An opaque origin's word is "null" — not a URL, and telling the
        // truth it carries: this guest names itself nobody.
        host = '';
      }
      offer(host);
    }
  }
  return hosts;
};
