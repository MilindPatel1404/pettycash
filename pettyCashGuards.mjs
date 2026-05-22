export function positiveAmount(value) {
  const amount = parseFloat(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function resolvePettyCashShiftId({ fund, shifts = [] } = {}) {
  const linkedDrawerId = fund?.drawerId ? String(fund.drawerId) : "";
  if (linkedDrawerId) {
    const linkedShift = shifts.find(s => s.status === "Open" && String(s.drawerId) === linkedDrawerId);
    if (linkedShift) return linkedShift.id;
  }

  return shifts.find(s => s.status === "Open")?.id || "SH-MANUAL";
}

export function validatePettyCashPayout({ amount, currentBalance } = {}) {
  const parsedAmount = positiveAmount(amount);
  if (parsedAmount === null) {
    return { valid: false, amount: 0, reason: "Amount must be greater than zero." };
  }

  const parsedBalance = parseFloat(currentBalance);
  const balance = Number.isFinite(parsedBalance) ? parsedBalance : 0;
  if (parsedAmount > balance) {
    return { valid: false, amount: parsedAmount, reason: "Amount exceeds the fund balance." };
  }

  return { valid: true, amount: parsedAmount, reason: "" };
}
