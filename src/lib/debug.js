import { onSettingsChanged, readSettings } from './settings.js';

// Why was that film refused, why did the probe come back empty — questions
// nobody can ask after the fact, and the few scattered console warnings do
// not answer. The switch is off by default and every line it costs is one
// the viewer never pays: a page runs exactly as it would run without it.
// The line arrives only through the console of whoever asked for the
// answers, which is what uBlock's logger is, at our scale.

// The frame’s own console is where the line lands today — and one room in
// the extension holds every frame’s port and a console of its own: the
// background the devtools can be opened on even when the page’s cannot.
// This registry is that seam. While the switch is on, the line is said to
// the local console as it always was and to every sink standing — the
// frame’s port asks to stand via index.js, so the words cross up and the
// background’s inspect window carries every frame’s lines in one scroll.
// With the switch off, the registry hears nothing: no word, no byte, the
// page runs as it would run without the diagnostics at all.
const sinks = new Set();

// One sink, one standing word; the returned answer stands it down. The
// sink takes the line whole — the full text the console would say —
// because the formatting is this file’s one business, not every sink’s.
export const hearLines = (sink) => {
  sinks.add(sink);
  return () => {
    sinks.delete(sink);
  };
};

export const createDebug = (area) => {
  const state = { on: false };

  // A realm with no storage bus to ask — the unit tests' — keeps the switch
  // it was born with: quiet. The content realm always has the bus.
  const speechless = typeof browser === 'undefined';

  if (!speechless) {
    readSettings().then((next) => {
      state.on = next.debugMode;
    });
    onSettingsChanged((next) => {
      state.on = next.debugMode;
    });
  }

  return (message, detail = undefined) => {
    if (!state.on) return;
    const note = detail === undefined ? '' : ` — ${detail}`;
    console.info(`Nocturne: [${area}] ${message}${note}`);
    // The sink says the line exactly as the console has it — the word
    // that crosses keeps the formatting the frame’s console gave it, so
    // the background’s scroll reads like the frame’s own.
    for (const sink of sinks) sink(`Nocturne: [${area}] ${message}${note}`);
  };
};
