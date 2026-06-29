export const BASE_CURRENCY = "USD";

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

export const toFiniteNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number.parseFloat(String(value).replace(/^[A-Z]{3}\s+/, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = value => Number.parseFloat(toFiniteNumber(value).toFixed(2));

const normalizeBalances = balances => Object.fromEntries(
  Object.entries(balances || {}).map(([code, value]) => [code, roundMoney(value)])
);

export function openingBalancesForShift(shift, drawer) {
  if (shift?.openingCcyBals && Object.keys(shift.openingCcyBals).length > 0) {
    return normalizeBalances(shift.openingCcyBals);
  }
  if (drawer?.ccyBalances && Object.keys(drawer.ccyBalances).length > 0) {
    return normalizeBalances(drawer.ccyBalances);
  }
  return { [BASE_CURRENCY]: roundMoney(shift?.openingBal ?? drawer?.balance ?? 0) };
}

export function buildCloseDrawerAccounting({ shift, drawer, txns = [], counts = {}, cashDrop = 0 } = {}) {
  const openingBalances = openingBalancesForShift(shift, drawer);
  const shiftTxns = shift?.id ? txns.filter(t => t.shiftId === shift.id) : [];
  const drop = Math.max(0, roundMoney(cashDrop));
  const codes = [...new Set([
    BASE_CURRENCY,
    ...Object.keys(openingBalances),
    ...Object.keys(drawer?.ccyBalances || {}),
    ...shiftTxns.filter(t => t.fxCcy).map(t => t.fxCcy),
    ...Object.keys(counts || {}),
  ])];

  const summary = codes.map(code => {
    const isBase = code === BASE_CURRENCY;
    const rows = isBase
      ? shiftTxns.filter(t => !t.fxCcy)
      : shiftTxns.filter(t => t.fxCcy === code);
    const getAmt = txn => roundMoney(isBase ? txn.amount : txn.fxAmt);
    const inRows = rows.filter(txn => getAmt(txn) > 0);
    const outRows = rows.filter(txn => getAmt(txn) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(getAmt(txn)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(getAmt(txn)), 0));
    const net = roundMoney(rows.reduce((sum, txn) => sum + getAmt(txn), 0));
    const opening = roundMoney(openingBalances[code] || 0);
    const expected = roundMoney(opening + net);
    const countWasEntered = hasOwn(counts, code) && String(counts[code]).trim() !== "";
    const counted = countWasEntered ? roundMoney(counts[code]) : expected;
    const codeDrop = isBase ? drop : 0;
    const endingBal = roundMoney(counted - codeDrop);

    return {
      code,
      opening,
      expected,
      counted,
      countWasEntered,
      variance: roundMoney(counted - expected),
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal: counted,
      cashDrop: codeDrop,
      endingBal,
    };
  });

  const byCode = Object.fromEntries(summary.map(row => [row.code, row]));
  const usd = byCode[BASE_CURRENCY] || {
    expected: 0,
    counted: 0,
    variance: 0,
    endingBal: 0,
    countWasEntered: false,
  };

  return {
    summary,
    byCode,
    cashDrop: drop,
    closingBal: usd.counted,
    variance: usd.variance,
    hasUsdCount: usd.countWasEntered,
    endingBalances: Object.fromEntries(summary.map(row => [row.code, row.endingBal])),
  };
}
