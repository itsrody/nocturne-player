// A ladder of rungs — picture qualities, audio renditions — is read the
// same way wherever a site offers one: the site's player is found once per
// sheet opening and held only that long, what it offers is listed with the
// viewer's choice carried across on top, one rung alone is a fact rather
// than a choice, and asking for a rung must succeed through the player's
// own hand before the chip says so. The quality row and the audio row
// strike the same bargain; this is where it is struck once.
export const createRungs = (detect, { autoId = null } = {}) => {
  let adapter = null;
  let options = [];

  // What the viewer asked for has to outlive the adapter. The ladder is looked
  // up again every time the sheet opens, which builds a new adapter each time,
  // and a player that has been given a rung goes back to reporting whatever its
  // own auto has drifted to. The chip should say what was asked for.
  let chosen = null;

  const refresh = () => {
    adapter = detect();
    if (adapter === null) {
      options = [];
      chosen = null;
      return options;
    }
    const listed = adapter.list();
    const auto =
      autoId !== null && adapter.hasAuto ? [{ id: autoId, label: 'Auto' }] : [];
    options = listed.length > 0 ? auto.concat(listed) : [];
    // A choice lives only as long as the rung it names is still on offer.
    if (!options.some((option) => option.id === chosen)) chosen = null;
    return options;
  };

  return {
    refresh,
    getOptions: () => options,
    // One rung is not a choice, it is a fact, and a row offering it is a row
    // in the way.
    isSwitchable: () => options.length > 1,
    getCurrent: () => {
      if (chosen !== null) return chosen;
      return adapter === null ? null : adapter.current();
    },
    select: (id) => {
      if (adapter === null) return false;
      const wanted = String(id);
      if (adapter.select(wanted) !== true) return false;
      chosen = wanted;
      return true;
    },
    // The adapter the last refresh found, for sheets that say more about
    // where the ladder came from than the rungs alone show: the quality
    // row names the adapter and diagnoses a flat ladder.
    getAdapter: () => adapter,
  };
};
