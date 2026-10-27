import {
  onSettingsChanged,
  readSettings,
  resetSettings,
  setHostEnabled,
  writeSettings,
} from '../lib/settings.js';

// A drag rewrites the shared settings object on every visible tick, and each
// write is a read-modify-write round trip through storage. Debounce per key:
// the slider feels live, storage sees a settled answer.
const WRITE_DELAY_MS = 150;
const RESET_ARM_MS = 4000;

const byId = (id) => document.getElementById(id);

// The sliders live on ranges whose endpoints are the settings module's own
// RANGES — cloned here so the page cannot drift from what storage will take
// back. A value that is somehow out of range still gets rewritten into its
// place by normalize on the write path, so the worst a mismatch buys is a
// blink.
const SLIDERS = [
  { key: 'warmth', output: 'warmth-output', unit: '' },
  { key: 'brightness', output: 'brightness-output', unit: '' },
  { key: 'contrast', output: 'contrast-output', unit: '' },
  { key: 'saturate', output: 'saturate-output', unit: '' },
  { key: 'doubleTapSeconds', output: 'doubleTapSeconds-output', unit: ' s' },
  { key: 'holdSpeed', output: 'holdSpeed-output', unit: '×' },
  { key: 'subtitleScale', output: 'subtitleScale-output', unit: '×' },
];

const TOGGLES = [
  { key: 'areEffectsReduced', id: 'are-effects-reduced' },
  { key: 'areSubtitlesNative', id: 'are-subtitles-native' },
  { key: 'debugMode', id: 'debug-mode' },
];

const pendingWrites = new Map();

const writeSoon = (key, value) => {
  clearTimeout(pendingWrites.get(key));
  pendingWrites.set(
    key,
    setTimeout(() => {
      pendingWrites.delete(key);
      writeSettings({ [key]: value });
    }, WRITE_DELAY_MS),
  );
};

// A slider answers as it moves: the number beside its label first (free), the
// storage write debounced after it. The decimals it shows come from its own
// step, so a seconds dial reads whole and a colour dial reads fine.
const decimalsOf = (step) => {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
};

const readSlider = (slider) => {
  const input = byId(slider.key);
  const label = byId(slider.output);

  const paint = () => {
    const value = Number(input.value);
    const decimals = decimalsOf(Number(input.step));
    label.textContent = `${value.toFixed(decimals)}${slider.unit}`;
  };

  input.addEventListener('input', () => {
    paint();
    writeSoon(slider.key, Number(input.value));
  });

  return {
    isHeld: () => input === document.activeElement,
    set: (value) => {
      input.value = value;
      paint();
    },
  };
};

// A checkbox answers when it is answered.
const readToggle = (toggle) => {
  const input = byId(toggle.id);
  input.addEventListener('change', () => {
    writeSettings({ [toggle.key]: input.checked });
  });
  return {
    isHeld: () => input === document.activeElement,
    set: (value) => {
      input.checked = value;
    },
  };
};

const sliderViews = SLIDERS.map(readSlider);
const toggleViews = TOGGLES.map(readToggle);

const sitesBox = byId('sites');
const sitesEmpty = byId('sites-empty');

const renderSites = (hosts) => {
  sitesBox.replaceChildren();
  sitesEmpty.hidden = hosts.length > 0;
  for (const host of hosts) {
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'site-host';
    name.textContent = host;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = 'Enable';
    remove.setAttribute('aria-label', `Enable Nocturne on ${host}`);
    remove.addEventListener('click', () => setHostEnabled(host, true));
    row.append(name, remove);
    sitesBox.append(row);
  }
};

// Sync, quietly: a control the user is holding — a slider under the thumb, a
// checkbox mid-answer — is the one whose opinion wins, so everything else
// takes what storage says and leaves the held one alone. This is what lets
// the popup and two copies of this page agree without fighting over inputs.
const sync = (settings) => {
  for (const view of sliderViews) {
    if (view.isHeld()) continue;
    view.set(settings[view.key]);
  }
  for (const view of toggleViews) {
    if (view.isHeld()) continue;
    view.set(settings[view.key]);
  }
  renderSites(settings.disabledHosts);
};

// The reset is heavy — it wipes colour, gesture and site choices at once —
// so it asks twice: armed by the first click, disarmed by time or by doing.
const resetButton = byId('reset');
let disarmTimer = null;

const disarm = () => {
  if (disarmTimer === null) return;
  clearTimeout(disarmTimer);
  disarmTimer = null;
  resetButton.classList.remove('armed');
  resetButton.textContent = 'Reset everything';
};

resetButton.addEventListener('click', async () => {
  if (disarmTimer === null) {
    resetButton.classList.add('armed');
    resetButton.textContent = 'Really wipe?';
    disarmTimer = setTimeout(disarm, RESET_ARM_MS);
    return;
  }
  disarm();
  await resetSettings();
});

onSettingsChanged(sync);
readSettings().then(sync);
