// The discipline of holding a line the site wants to move: repair it,
// count the repairs, and when the count is gone, sound off once and step
// aside. A site that fights back with its own !important would otherwise
// trade writes with us for as long as the page lives — a chase that costs
// the viewer a frame a beat and buys nothing. Every guard chooses its own
// trigger and its own repair; this is the one place the budget and the
// counting live.
const MAX_REPINS = 240;

// Answers true while the budget holds, false — after alarming exactly
// once — when it is spent. The alarm is the site's doing, and saying so
// once is the point: a guard that is standing aside should be quiet about
// it, and repeated alarms from relayout calls that arrive after the fact
// would be noise the viewer did nothing to earn.
export const createGuardBudget = (alarmed) => {
  let spent = 0;
  let standingAside = false;

  return () => {
    if (standingAside) return false;
    spent += 1;
    if (spent <= MAX_REPINS) return true;
    standingAside = true;
    alarmed();
    return false;
  };
};
