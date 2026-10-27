import { onSettingsChanged, readSettings } from './settings.js';

// Why was that film refused, why did the probe come back empty — questions
// nobody can ask after the fact, and the few scattered console warnings do
// not answer. The switch is off by default and every line it costs is one
// the viewer never pays: a page runs exactly as it would run without it.
// The line arrives only through the console of whoever asked for the
// answers, which is what uBlock's logger is, at our scale.
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
  };
};
