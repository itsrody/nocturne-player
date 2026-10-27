// A moment one side of the code says and every side that reached it in
// time hears. The registry stands before its listeners do, and that is the
// point: whoever fires the moment may hold it from the day it is created and
// never learn who hears it, where the hand-bound late binding it replaces was
// a mutable field or a no-op stub assigned once the listener's half of the
// cycle had come to exist.
export const createSignal = () => {
  const listeners = new Set();

  return {
    // Puts a listener in the hearing. The removal comes back for the shorter
    // lives that need to stop listening before they end; a lifetime of the
    // module's own can simply let it go.
    on: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // Says the moment. The hearing is the set as it stood when the moment
    // was spoken — a listener that registers while the moment is being said
    // waits for the next one, so nobody hears their own echo, and no listener
    // met at the door is left out.
    emit: (detail) => {
      for (const listener of Array.from(listeners)) listener(detail);
    },
  };
};
