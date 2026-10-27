const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const PLACEHOLDER = '--:--';

const isFiniteTime = (seconds) =>
  typeof seconds === 'number' && Number.isFinite(seconds);

// Hours only appear once the film is actually an hour long, so short clips
// read as "23:53" rather than "0:23:53".
export const formatClock = (seconds) => {
  if (!isFiniteTime(seconds)) return PLACEHOLDER;

  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor(total / SECONDS_PER_MINUTE) % SECONDS_PER_MINUTE;
  const secs = String(total % SECONDS_PER_MINUTE).padStart(2, '0');

  if (hours === 0) return `${minutes}:${secs}`;
  return `${hours}:${String(minutes).padStart(2, '0')}:${secs}`;
};

export const formatOffset = (seconds) => {
  if (!isFiniteTime(seconds)) return PLACEHOLDER;
  const sign = seconds < 0 ? '-' : '+';
  return `${sign}${formatClock(Math.abs(seconds))}`;
};

// A moment the code comes back to, held as one verb. The hand-bound bookkeeping
// this replaces — a bookkeeping variable, cleared if already armed, nulled when
// the work runs, cleared again on teardown — is one discipline said many
// times over; here it is said once. Rearming replaces what was pending, and
// the slot empties itself the moment the work runs, so `isOn` always means
// "still to come" — never "recently fired".
//
// The arm and drop arrive as knobs so the slot can be watched in a test
// realm where setTimeout is a ledger rather than a clock.
export const createTimerSlot = (
  fire,
  { arm = setTimeout, drop = clearTimeout } = {},
) => {
  let held = null;

  const when = () => {
    held = null;
    fire();
  };

  return {
    // Arms the moment: whatever was pending is taken away first, so a
    // rearm is one call, not a question about what was there before.
    set: (ms) => {
      if (held !== null) drop(held);
      held = arm(when, ms);
    },
    clear: () => {
      if (held === null) return;
      drop(held);
      held = null;
    },
    isOn: () => held !== null,
  };
};
