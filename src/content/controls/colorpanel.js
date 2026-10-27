import { el } from '../shell.js';
import { DIALS } from '../../lib/settings.js';

const asPercent = (value) => `${Math.round(value * 100)}%`;

const asWarmth = (value) =>
  value === 0 ? 'off' : `${Math.round((value / 0.45) * 100)}%`;

// Steppers rather than sliders: a thumb can hit a 44px button while holding the
// phone, which is not true of a slider handle. The row names its key and the
// hand's feel — the ends and the neutral come from the settings module's own
// dials, so a schema change cannot leave the panel clamping at stale numbers.
const ROWS = [
  // A wider reach and a bigger step than the rest: brightness is the one people
  // come here for, on a dark film in a dark room, and at 5% a press with a
  // ceiling of 150% it took ten presses to do anything you would call
  // brightening — which reads as a control that does not work.
  {
    key: 'brightness',
    label: 'Brightness',
    step: 0.1,
    format: asPercent,
  },
  {
    key: 'contrast',
    label: 'Contrast',
    step: 0.05,
    format: asPercent,
  },
  {
    key: 'saturate',
    label: 'Saturation',
    step: 0.1,
    format: asPercent,
  },
  {
    key: 'warmth',
    label: 'Night light',
    step: 0.09,
    format: asWarmth,
  },
];

const round = (value, step) => Math.round(value / step) * step;

const buildStepper = (spec, onChange) => {
  const dial = DIALS[spec.key];
  const readout = el('span', {
    class: 'step-value',
    text: spec.format(dial.fallback),
  });
  const minus = el('button', {
    class: 'step-button',
    type: 'button',
    text: '−',
    'aria-label': `Less ${spec.label.toLowerCase()}`,
  });
  const plus = el('button', {
    class: 'step-button',
    type: 'button',
    text: '+',
    'aria-label': `More ${spec.label.toLowerCase()}`,
  });

  let value = dial.fallback;

  const set = (next) => {
    value = round(Math.min(dial.max, Math.max(dial.min, next)), spec.step);
    readout.textContent = spec.format(value);
    minus.disabled = value <= dial.min;
    plus.disabled = value >= dial.max;
    return value;
  };

  minus.addEventListener('click', () =>
    onChange(spec.key, set(value - spec.step)),
  );
  plus.addEventListener('click', () =>
    onChange(spec.key, set(value + spec.step)),
  );
  set(dial.fallback);

  return {
    key: spec.key,
    reset: () => set(dial.fallback),
    set,
    root: el('div', { class: 'step-row' }, [
      el('span', { class: 'step-label', text: spec.label }),
      minus,
      readout,
      plus,
    ]),
  };
};

export const createColourRows = (onChange) => {
  const steppers = ROWS.map((spec) => buildStepper(spec, onChange));
  const byKey = new Map(steppers.map((stepper) => [stepper.key, stepper]));

  const reset = el('button', {
    class: 'step-reset',
    type: 'button',
    text: 'Reset',
  });

  reset.addEventListener('click', () => {
    for (const stepper of steppers) onChange(stepper.key, stepper.reset());
  });

  // The colour rows are a page's contents, not a sheet of their own: the
  // settings sheet hosts them as its second page and owns the framing.
  const root = el('div', { class: 'colour-rows' }, [
    ...steppers.map((stepper) => stepper.root),
    reset,
  ]);

  return {
    root,
    setValue: (key, value) => byKey.get(key)?.set(value),
  };
};
