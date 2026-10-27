// The playback arm of the cipher work, in the frame — the only room an
// element can be fed from. The background decrypts; it cannot touch an
// element in a page. So when an element dies on a stream the element
// alone could not read, and the background has said the stream’s plan
// (an AES-128 fmp4 VOD), this feeder takes the element over: a media
// source is built, the init segment and the segments in play order are
// asked up one at a time, answered with clonable bytes, and appended —
// at which point the element plays, indifferent to how the bytes were
// got. Nothing in the page’s session or slot machinery changes: the
// element is still the element, and the film elects like any film.
//
// Honesty is the feeder’s spine. A miss — a segment that failed, a pack
// the element would not take — restores the element’s own source and
// walks away: the extension never asks twice, never retries, and never
// leaves a film half-fed under its own hand. One attempt per element is
// the whole deal; a second is what a visit in a WeakSet refuses.
import { createDebug } from '../../lib/debug.js';
import { askCipherSegment, asCipherBytes } from '../../lib/protocol.js';

// The diagnostics voice of the feeder: the takeover of an element is the
// one thing this file can say that nothing else knows has happened.
const debug = createDebug('cipher');

// Does the element name the manifest the wire saw? The src habit is
// relative names resolved against the document’s base, so the attribute
// is read and resolved, and the property (always absolute) is the
// fallback when no attribute stands.
const elementSays = (video, url) => {
  const attribute = video.getAttribute('src');
  const named =
    typeof attribute === 'string' && attribute !== '' ? attribute : video.src;
  try {
    return new URL(named, document.baseURI).href === url;
  } catch {
    return false;
  }
};

// The feeder. `up` is the frame’s port to the hub; `readPlan` answers
// with the plan the bus said, fresh at every ask — a plan said to a
// document now remade is no plan to play on.
export const createCipherFeeder = (up, readPlan) => {
  // The elements the feeder has already owned an attempt on. A WeakSet:
  // an element the page let go of takes its one refusal with it, and no
  // sweeps of this ever growing nowhere.
  const tried = new WeakSet();

  // One ask in flight at a time: a segment’s bytes are answered for the
  // ask still pending, and nothing else. The listener lives here, in the
  // feeder, because only the feeder knows which ask the answer belongs
  // to — the wire room’s own listener hears only its own words.
  let pending = null;

  up.onMessage.addListener((word) => {
    const answered = asCipherBytes(word);
    if (answered === null || pending === null) return;
    if (answered.url !== pending.url) return;
    const settle = pending.settle;
    pending = null;
    settle(answered.bytes);
  });

  const repair = (video) => {
    if (tried.has(video) || !video.error) return;
    const plan = readPlan();
    if (plan === null) return;
    // The manifesto match: a stream is only taken over when the element
    // is errored on exactly the manifest the wire saw — the feeder’s
    // whole legitimacy is that this film is the film the word is about.
    if (!elementSays(video, plan.url)) return;
    tried.add(video);

    const mime =
      plan.codecs === null ? 'video/mp4' : `video/mp4; codecs="${plan.codecs}"`;
    if (
      typeof MediaSource === 'undefined' ||
      typeof MediaSource.isTypeSupported !== 'function' ||
      !MediaSource.isTypeSupported(mime)
    ) {
      debug('the playback room declines the mime', mime);
      return;
    }

    // The original source, kept for one honest walk away: a miss puts
    // the element back where the site put it, and never asks again.
    let original = video.getAttribute('src');
    if (typeof original !== 'string' || original === '') original = video.src;
    const source = new MediaSource();
    const sourceUrl = URL.createObjectURL(source);
    let buffer = null;
    let broken = false;

    const restore = () => {
      broken = true;
      pending = null;
      try {
        URL.revokeObjectURL(sourceUrl);
      } catch {
        // An address the room never issued is not owed a revoke.
      }
      try {
        video.src = original;
      } catch {
        // An element that will not take its old source back is one the
        // retry cannot help anyway, and the port’s listener is the only
        // thing that could have pushed harder — it does not.
      }
    };

    // The ask, one at a time: the init segment first — it is the fmp4
    // stream’s header and must land before any segment — then the
    // stream, in play order. When the queue is out, the stream is
    // closed in the media source’s own tongue, and the element is
    // introduced to no more of it.
    const queue =
      plan.init === null
        ? plan.segments.map((one) => one.url)
        : [plan.init, ...plan.segments.map((one) => one.url)];

    const step = () => {
      if (broken || pending !== null) return;
      const url = queue.shift();
      if (url === undefined) {
        // The film’s whole known length is in the buffer: ending the
        // stream is what tells the element so, and start-to-end play
        // without a seek wait follows.
        try {
          buffer.endOfStream();
        } catch {
          // A stream already ended says nothing worth an error; the
          // element cannot be unplayed either way.
        }
        return;
      }
      pending = {
        url,
        settle: (bytes) => {
          if (broken) return;
          // A miss is the whole attempt’s end: the element goes back to
          // its own source, and this film plays without the extension.
          if (bytes === null) {
            debug('the stream was answered with a miss', url);
            restore();
            return;
          }
          try {
            buffer.appendBuffer(bytes);
          } catch (error) {
            debug('the room refused the segment', error);
            restore();
          }
        },
      };
      try {
        up.postMessage(askCipherSegment(url));
      } catch {
        // A port gone dead mid-ask is a home the feeder cannot answer
        // from ever again; the element is restored to itself.
        debug('the port was gone before the ask landed');
        restore();
      }
    };

    // The room answers for the film the moment the source opens: this
    // is the element’s own word that it has adopted the feeder’s stream.
    source.addEventListener('sourceopen', () => {
      if (broken) return;
      try {
        buffer = source.addSourceBuffer(mime);
      } catch (error) {
        debug('the room refused to make a buffer', error);
        restore();
        return;
      }
      // Each segment that lands asks for the next: the one event the
      // platform gives for answering everything that comes after.
      buffer.addEventListener('updateend', step);
      step();
    });

    video.src = sourceUrl;
    debug('the element was handed the fed stream', plan.url);
  };

  return { repair };
};
