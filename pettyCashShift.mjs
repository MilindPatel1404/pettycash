export const MANUAL_SHIFT_ID = "SH-MANUAL";

export function resolvePettyCashShiftId({ fund, drawers = [], shifts = [] } = {}) {
  const drawerId = fund?.drawerId;

  if (drawerId !== undefined && drawerId !== null && String(drawerId) !== "") {
    const drawer = drawers.find(d => String(d.id) === String(drawerId));
    const currentShift = drawer?.currentShift;

    if (currentShift) {
      const shift = shifts.find(s => s.id === currentShift);
      if (!shift || shift.status === "Open") return currentShift;
    }
  }

  const openShifts = shifts.filter(s => s.status === "Open");
  return openShifts.length === 1 ? openShifts[0].id : MANUAL_SHIFT_ID;
}
