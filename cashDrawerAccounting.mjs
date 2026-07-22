const BASE_CCY = "USD";

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseMoney = (value, fallback = 0) => {
  if (typeof value === "string") {
    const normalized = value.replace(/[A-Z]{3}/gi, "").replace(/,/g, "").trim();
    if (!normalized) return fallback;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasEnteredValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const normalizeBalances = (balances = {}) => Object.fromEntries(
  Object.entries(balances)
    .map(([code, amount]) => [code, roundMoney(parseMoney(amount))])
    .filter(([code]) => code)
);

const signedTxnAmountForCode = (txn, code) => {
  if (code === BASE_CCY && !txn.fxCcy) return parseMoney(txn.amount);
  if (txn.fxCcy === code) return parseMoney(txn.fxAmt);
  return 0;
};

export function buildCloseDrawerAccounting({ drawer, shift, txns = [], counts = {}, cashDrop = 0 }) {
  const openingBalances = normalizeBalances(
    shift?.openingCcyBals && Object.keys(shift.openingCcyBals).length
      ? shift.openingCcyBals
      : shift
        ? { [BASE_CCY]: shift.openingBal ?? 0 }
        : drawer?.ccyBalances && Object.keys(drawer.ccyBalances).length
        ? drawer.ccyBalances
        : { [BASE_CCY]: drawer?.balance ?? 0 }
  );

  if (!Object.prototype.hasOwnProperty.call(openingBalances, BASE_CCY)) {
    openingBalances[BASE_CCY] = roundMoney(parseMoney(shift?.openingBal ?? drawer?.balance ?? 0));
  }

  const shiftTxns = txns.filter((txn) => txn.shiftId === shift?.id);
  const txnCodes = shiftTxns.flatMap((txn) => txn.fxCcy ? [txn.fxCcy] : [BASE_CCY]);
  const countCodes = Object.keys(counts || {});
  const codes = [...new Set([BASE_CCY, ...Object.keys(openingBalances), ...txnCodes, ...countCodes])];

  const expectedBalances = {};
  const countedBalances = {};
  const endingBalances = {};
  const variances = {};
  const closeDrop = Math.max(0, roundMoney(parseMoney(cashDrop)));

  const ccySummary = codes.map((code) => {
    const isBase = code === BASE_CCY;
    const rows = shiftTxns.filter((txn) => isBase ? !txn.fxCcy : txn.fxCcy === code);
    const getAmount = (txn) => signedTxnAmountForCode(txn, code);
    const inRows = rows.filter((txn) => getAmount(txn) > 0);
    const outRows = rows.filter((txn) => getAmount(txn) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(getAmount(txn)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(getAmount(txn)), 0));
    const openingBal = roundMoney(openingBalances[code] || 0);
    const expectedBal = roundMoney(openingBal + rows.reduce((sum, txn) => sum + getAmount(txn), 0));
    const countedBal = roundMoney(hasEnteredValue(counts?.[code]) ? parseMoney(counts[code], expectedBal) : expectedBal);
    const dropForCode = code === BASE_CCY ? Math.min(closeDrop, Math.max(0, countedBal)) : 0;
    const endingBal = roundMoney(countedBal - dropForCode);
    const variance = roundMoney(countedBal - expectedBal);

    expectedBalances[code] = expectedBal;
    countedBalances[code] = countedBal;
    endingBalances[code] = endingBal;
    variances[code] = variance;

    return {
      code,
      openingBal,
      expectedBal,
      countedBal,
      variance,
      cashDrop: dropForCode,
      endingBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal: countedBal,
    };
  });

  return {
    closingBal: countedBalances[BASE_CCY] ?? 0,
    endingBal: endingBalances[BASE_CCY] ?? 0,
    variance: variances[BASE_CCY] ?? 0,
    cashDrop: ccySummary.find((row) => row.code === BASE_CCY)?.cashDrop ?? 0,
    ccySummary,
    ccyBalances: endingBalances,
    expectedBalances,
    countedBalances,
    endingBalances,
    variances,
  };
}
