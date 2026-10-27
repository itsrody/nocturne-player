import { STORAGE_KEY } from './words.js';

const SCHEMA_VERSION = 2;

// The schema, told once and in full: every key names its kind — a colour
// dial, a plain range dial, a switch, a list — and, for the dials, the
// ends they are allowed between and the neutral value they fall back to.
// The kinds are load-bearing: colour dials are the ones an upgrade wipes
// (a carried-over tint surprised its viewer once; see the migration
// below), ranges clamp themselves, switches accept only the word true,
// and lists only real arrays. Adding a key is one entry here; the
// defaults, the coercion and the upgrade all walk this table afterwards.
const SPEC = {
  warmth: { kind: 'colour', min: 0, max: 0.45, fallback: 0 },
  brightness: { kind: 'colour', min: 0.4, max: 2, fallback: 1 },
  contrast: { kind: 'colour', min: 0.5, max: 1.5, fallback: 1 },
  saturate: { kind: 'colour', min: 0, max: 2, fallback: 1 },
  doubleTapSeconds: { kind: 'range', min: 5, max: 60, fallback: 10 },
  holdSpeed: { kind: 'range', min: 1.5, max: 4, fallback: 2 },
  areEffectsReduced: { kind: 'flag', fallback: false },
  subtitleScale: { kind: 'range', min: 0.5, max: 2, fallback: 1 },
  areSubtitlesNative: { kind: 'flag', fallback: false },
  debugMode: { kind: 'flag', fallback: false },
  disabledHosts: { kind: 'list', fallback: [] },
};

export const DEFAULTS = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  ...Object.fromEntries(
    Object.entries(SPEC).map(([key, spec]) => [key, spec.fallback]),
  ),
});

// A dial's answer is only trusted within its ends: a colour or range value
// that is not a finite number in range is not the viewer's answer — it
// falls back to the neutral one rather than tinting somebody's first film
// for reasons they cannot see. The other kinds are stricter in their own
// way: a switch is only switched by a real boolean, a list only lists as
// an array it can keep a copy of.
const coerce = (spec, value) => {
  if (spec.kind === 'flag') return value === true;
  if (spec.kind === 'list') {
    return Array.isArray(value) ? value.slice() : [];
  }
  const isNumber = typeof value === 'number' && Number.isFinite(value);
  if (!isNumber) return spec.fallback;
  if (value < spec.min || value > spec.max) return spec.fallback;
  return value;
};

// Schema 1 kept whatever colour the panel was last left on, including values
// somebody had only been trying out. They came back on the next film — on what
// looked like a clean profile — as a picture that was already tinted, or in one
// case with the colour drained out of it entirely. The upgrade drops the colour
// dials once; after that they are the viewer's again.
const migrate = (stored) => {
  if (stored === null || typeof stored !== 'object') return stored;
  if (stored.schemaVersion === SCHEMA_VERSION) return stored;
  const migrated = { ...stored };
  for (const [key, spec] of Object.entries(SPEC)) {
    if (spec.kind === 'colour') delete migrated[key];
  }
  return migrated;
};

// Rebuilt key by key so every settings object shares one hidden class, and so
// unknown keys from a future version can never leak into the running state.
// The version is stamped last: it is the extension's answer, never storage's.
export const normalize = (raw) => {
  const stored = migrate(raw);
  const settings = {};
  for (const [key, spec] of Object.entries(SPEC)) {
    const value = stored?.[key];
    settings[key] = value === undefined ? spec.fallback : coerce(spec, value);
  }
  settings.schemaVersion = SCHEMA_VERSION;
  return settings;
};

export const readSettings = async () => {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    return normalize(stored[STORAGE_KEY]);
  } catch (error) {
    console.error('Nocturne: could not read settings', error);
    return normalize(null);
  }
};

export const writeSettings = async (patch) => {
  const current = await readSettings();
  const next = normalize({ ...current, ...patch });
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: next });
  } catch (error) {
    console.error('Nocturne: could not save settings', error);
  }
  return next;
};

export const resetSettings = async () => {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Nocturne: could not reset settings', error);
  }
  return normalize(null);
};

export const onSettingsChanged = (handler) => {
  const listener = (changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    handler(normalize(changes[STORAGE_KEY].newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
};

export const isHostEnabled = (settings, host) =>
  !settings.disabledHosts.includes(host);

export const setHostEnabled = async (host, isEnabled) => {
  const settings = await readSettings();
  const others = settings.disabledHosts.filter((entry) => entry !== host);
  const disabledHosts = isEnabled ? others : others.concat(host);
  return writeSettings({ disabledHosts });
};
