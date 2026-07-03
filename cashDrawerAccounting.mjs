export const BASE_CCY = "USD";

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = Number.parseFloat(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function isPositiveFinite(value) {
  return Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) > 0;
}

function maybeNumber(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const numberValue = Number.parseFloat(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function openingBalanceFor(shift, drawer, code) {
  const shiftNative = shift?.openingCcyBals?.[code];
  if (shiftNative !== undefined && shiftNative !== "") return toFiniteNumber(shiftNative);

  const drawerNative = drawer?.ccyBalances?.[code];
  if (drawerNative !== undefined && drawerNative !== "") return toFiniteNumber(drawerNative);

  return code === BASE_CCY ? toFiniteNumber(shift?.openingBal) : 0;
}

function uniqueCodes(values) {
  return [...new Set(values.filter(Boolean))];
}

export function buildCloseDrawerAccounting({ shift, drawer, txns = [], counts = {}, cashDrop = "" }) {
  if (!shift) {
    return {
      codes: [BASE_CCY],
      ccySummary: [],
      expectedByCode: { [BASE_CCY]: 0 },
      countedByCode: {},
      endingCcyBalances: { [BASE_CCY]: 0 },
      closingBal: 0,
      endingBal: 0,
      cashDrop: 0,
      variance: 0,
      hasUsdCount: false,
    };
  }

  const shiftTxns = txns.filter(t => t.shiftId === shift.id);
  const codes = uniqueCodes([
    BASE_CCY,
    ...Object.keys(shift.openingCcyBals || {}),
    ...Object.keys(drawer?.ccyBalances || {}),
    ...shiftTxns.map(t => t.fxCcy),
  ]);
  const normalizedDrop = Math.max(0, toFiniteNumber(cashDrop));

  const ccySummary = codes.map(code => {
    const isBase = code === BASE_CCY;
    const rows = isBase ? shiftTxns.filter(t => !t.fxCcy) : shiftTxns.filter(t => t.fxCcy === code);
    const getAmount = t => isBase ? toFiniteNumber(t.amount) : toFiniteNumber(t.fxAmt);
    const openingBal = openingBalanceFor(shift, drawer, code);
    const signedTxnTotal = rows.reduce((sum, txn) => sum + getAmount(txn), 0);
    const expectedBal = openingBal + signedTxnTotal;
    const counted = maybeNumber(counts[code]);
    const drawerBal = counted === undefined ? expectedBal : counted;
    const codeCashDrop = isBase ? normalizedDrop : 0;

    return {
      code,
      inCount: rows.filter(t => getAmount(t) > 0).length,
      outCount: rows.filter(t => getAmount(t) < 0).length,
      totIn: rows.filter(t => getAmount(t) > 0).reduce((sum, txn) => sum + Math.abs(getAmount(txn)), 0),
      totOut: rows.filter(t => getAmount(t) < 0).reduce((sum, txn) => sum + Math.abs(getAmount(txn)), 0),
      openingBal,
      expectedBal,
      bal: drawerBal,
      cashDrop: codeCashDrop,
      endingBal: drawerBal - codeCashDrop,
      variance: counted === undefined ? 0 : drawerBal - expectedBal,
      counted,
    };
  });

  const expectedByCode = Object.fromEntries(ccySummary.map(summary => [summary.code, summary.expectedBal]));
  const countedByCode = Object.fromEntries(ccySummary.filter(summary => summary.counted !== undefined).map(summary => [summary.code, summary.counted]));
  const endingCcyBalances = Object.fromEntries(ccySummary.map(summary => [summary.code, summary.endingBal]));
  const usdSummary = ccySummary.find(summary => summary.code === BASE_CCY);

  return {
    codes,
    ccySummary,
    expectedByCode,
    countedByCode,
    endingCcyBalances,
    closingBal: usdSummary?.bal || 0,
    endingBal: usdSummary?.endingBal || 0,
    cashDrop: normalizedDrop,
    variance: usdSummary?.variance || 0,
    hasUsdCount: usdSummary?.counted !== undefined,
  };
}
