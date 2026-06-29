export const MANUAL_SHIFT_ID = "SH-MANUAL";

export function positiveFiniteAmount(value) {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function shiftIdForPettyFund(fund, shifts = []) {
  const openShifts = shifts.filter(shift => shift.status === "Open");
  if (fund?.drawerId) {
    const linkedShift = openShifts.find(shift => String(shift.drawerId) === String(fund.drawerId));
    if (linkedShift) return linkedShift.id;
  }
  return openShifts.length === 1 ? openShifts[0].id : MANUAL_SHIFT_ID;
}

export function canPayPettyCash(fund, amountValue) {
  const amount = positiveFiniteAmount(amountValue);
  if (amount === null) return { ok: false, reason: "Amount must be greater than zero." };
  if (!fund) return { ok: false, reason: "Select a petty cash fund first." };
  if (amount > Number.parseFloat(fund.currentBalance || 0)) {
    return { ok: false, reason: "Payout exceeds the fund balance." };
  }
  return { ok: true, amount };
}
