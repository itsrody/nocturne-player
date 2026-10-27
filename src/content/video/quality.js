import { ADAPTERS, AUTO_ID } from './qualityadapters.js';
import { createRungs } from './rungs.js';
import { createDebug } from '../../lib/debug.js';

export { AUTO_ID };

// The ladder's award is read once per sheet opening: naming which adapter
// took the film, and what it offered, is the answer to "why is the sheet
// empty" nobody can reconstruct afterwards.
const debug = createDebug('quality');

// A streaming player builds its quality ladder after the first segments land,
// so the ladder is looked up again every time the sheet is opened rather than
// once when the session starts.
export const createQuality = (video, host = null, adapters = ADAPTERS) => {
  const detect = () => {
    for (const create of adapters) {
      try {
        const candidate = create(video, host);
        if (candidate !== null) return candidate;
      } catch (error) {
        console.warn('Nocturne: a quality adapter threw while probing', error);
      }
    }
    return null;
  };

  const rungs = createRungs(detect, { autoId: AUTO_ID });

  const refresh = () => {
    const options = rungs.refresh();
    const adapter = rungs.getAdapter();
    if (adapter === null) {
      debug('no adapter would take the film');
      return options;
    }
    debug(
      `the ladder came from the ${adapter.name} adapter`,
      `${options.length} rungs offered`,
    );
    return options;
  };

  // Says which of the two things went wrong, because "no quality here" and
  // "found the player, it is offering nothing yet" want different answers from
  // whoever is looking at it.
  const describe = () => {
    const size =
      video.videoWidth === 0
        ? ''
        : `${video.videoWidth}×${video.videoHeight} · `;
    const adapter = rungs.getAdapter();
    if (adapter !== null) {
      const detail = adapter.diagnose ? adapter.diagnose() : 'no levels yet';
      return `${size}${adapter.name}: ${detail}`;
    }
    return `${size}set by the site`;
  };

  return {
    refresh,
    describe,
    getOptions: rungs.getOptions,
    getEngine: () => {
      const adapter = rungs.getAdapter();
      return adapter === null ? null : adapter.name;
    },
    isSwitchable: rungs.isSwitchable,
    getCurrent: rungs.getCurrent,
    select: rungs.select,
  };
};
