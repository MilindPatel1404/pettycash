export const BASE_CCY = "USD";

export function parseMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasEnteredCount(counts, code) {
  return Object.prototype.hasOwnProperty.call(counts || {}, code) && String(counts[code] ?? "").trim() !== "";
}

function uniqueCurrencyCodes(drawer, shift, shiftTxns) {
  const codes = new Set([BASE_CCY]);
  Object.keys(drawer?.ccyBalances || {}).forEach(code => codes.add(code));
  Object.keys(shift?.openingCcyBals || {}).forEach(code => codes.add(code));
  shiftTxns.filter(t => t.fxCcy).forEach(t => codes.add(t.fxCcy));
  return [BASE_CCY, ...[...codes].filter(code => code !== BASE_CCY).sort()];
}

function openingBalanceFor(code, drawer, shift) {
  if (code === BASE_CCY) {
    if (Object.prototype.hasOwnProperty.call(shift?.openingCcyBals || {}, BASE_CCY)) {
      return parseMoney(shift.openingCcyBals[BASE_CCY]);
    }
    return parseMoney(shift?.openingBal ?? drawer?.balance);
  }

  if (Object.prototype.hasOwnProperty.call(shift?.openingCcyBals || {}, code)) {
    return parseMoney(shift.openingCcyBals[code]);
  }
  return parseMoney(drawer?.ccyBalances?.[code]);
}

export function buildCloseDrawerAccounting({ drawer, shift, txns = [], counts = {}, cashDrop = 0 } = {}) {
  const shiftId = shift?.id || drawer?.currentShift;
  const shiftTxns = (txns || []).filter(t => t.shiftId === shiftId);
  const currencyCodes = uniqueCurrencyCodes(drawer, shift, shiftTxns);
  const parsedCashDrop = Math.max(0, parseMoney(cashDrop));

  const ccySummary = currencyCodes.map(code => {
    const isBase = code === BASE_CCY;
    const rows = isBase ? shiftTxns.filter(t => !t.fxCcy) : shiftTxns.filter(t => t.fxCcy === code);
    const getAmt = t => isBase ? parseMoney(t.amount) : parseMoney(t.fxAmt);
    const inRows = rows.filter(t => getAmt(t) > 0);
    const outRows = rows.filter(t => getAmt(t) < 0);
    const totIn = inRows.reduce((sum, t) => sum + Math.abs(getAmt(t)), 0);
    const totOut = outRows.reduce((sum, t) => sum + Math.abs(getAmt(t)), 0);
    const startingBal = openingBalanceFor(code, drawer, shift);
    const expectedBal = startingBal + rows.reduce((sum, t) => sum + getAmt(t), 0);
    const countedBal = hasEnteredCount(counts, code) ? parseMoney(counts[code]) : expectedBal;
    const dropForCode = isBase ? parsedCashDrop : 0;
    const endingBal = countedBal - dropForCode;

    return {
      code,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      startingBal,
      expectedBal,
      countedBal,
      variance: countedBal - expectedBal,
      cashDrop: dropForCode,
      bal: countedBal,
      endingBal,
    };
  });

  const usdSummary = ccySummary.find(cs => cs.code === BASE_CCY) || {
    totIn: 0,
    totOut: 0,
    expectedBal: 0,
    countedBal: 0,
    variance: 0,
    endingBal: 0,
  };

  return {
    currencyCodes,
    ccySummary,
    systemByCode: Object.fromEntries(ccySummary.map(cs => [cs.code, cs.expectedBal])),
    countedByCode: Object.fromEntries(ccySummary.map(cs => [cs.code, cs.countedBal])),
    endingCcyBalances: Object.fromEntries(ccySummary.map(cs => [cs.code, cs.endingBal])),
    closingBal: usdSummary.countedBal,
    endingBal: usdSummary.endingBal,
    variance: usdSummary.variance,
    cashIn: usdSummary.totIn,
    cashOut: usdSummary.totOut,
    cashDrop: parsedCashDrop,
  };
}
