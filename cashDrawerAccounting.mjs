const BASE_CCY = "USD";

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseMoney = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number.parseFloat(String(value).replace(/^[A-Z]{3}\s+/, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasCount = (countsByCode, code) =>
  Object.prototype.hasOwnProperty.call(countsByCode || {}, code) &&
  countsByCode[code] !== "";

const txnCurrency = (txn) => txn.fxCcy || BASE_CCY;
const txnAmount = (txn) => txn.fxCcy ? parseMoney(txn.fxAmt) : parseMoney(txn.amount);

export function buildCloseDrawerAccounting({
  shift,
  txns = [],
  countsByCode = {},
  cashDrop = 0,
} = {}) {
  if (!shift) {
    return {
      ccySummary: [],
      expectedBalances: {},
      countedBalances: {},
      endingBalances: {},
      cashDrop: 0,
      closingBal: 0,
      variance: 0,
    };
  }

  const openingBalances = {
    [BASE_CCY]: parseMoney(shift.openingBal),
    ...Object.fromEntries(
      Object.entries(shift.openingCcyBals || {}).map(([code, amount]) => [code, parseMoney(amount)])
    ),
  };
  const shiftTxns = txns.filter((txn) => txn.shiftId === shift.id);
  const codes = [...new Set([
    BASE_CCY,
    ...Object.keys(openingBalances),
    ...Object.keys(countsByCode || {}),
    ...shiftTxns.map(txnCurrency),
  ])];
  const normalizedCashDrop = Math.max(0, parseMoney(cashDrop));

  const ccySummary = codes.map((code) => {
    const rows = shiftTxns.filter((txn) => txnCurrency(txn) === code);
    const signedAmounts = rows.map(txnAmount);
    const inAmounts = signedAmounts.filter((amount) => amount > 0);
    const outAmounts = signedAmounts.filter((amount) => amount < 0);
    const openingBal = roundMoney(openingBalances[code] || 0);
    const totIn = roundMoney(inAmounts.reduce((sum, amount) => sum + amount, 0));
    const totOut = roundMoney(Math.abs(outAmounts.reduce((sum, amount) => sum + amount, 0)));
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const countedBal = hasCount(countsByCode, code)
      ? roundMoney(parseMoney(countsByCode[code], expectedBal))
      : expectedBal;
    const codeCashDrop = code === BASE_CCY ? Math.max(0, Math.min(normalizedCashDrop, countedBal)) : 0;
    const endingBal = roundMoney(countedBal - codeCashDrop);

    return {
      code,
      openingBal,
      expectedBal,
      countedBal,
      inCount: inAmounts.length,
      outCount: outAmounts.length,
      totIn,
      totOut,
      bal: countedBal,
      cashDrop: codeCashDrop,
      endingBal,
    };
  });

  const expectedBalances = Object.fromEntries(ccySummary.map((row) => [row.code, row.expectedBal]));
  const countedBalances = Object.fromEntries(ccySummary.map((row) => [row.code, row.countedBal]));
  const endingBalances = Object.fromEntries(ccySummary.map((row) => [row.code, row.endingBal]));
  const usdSummary = ccySummary.find((row) => row.code === BASE_CCY) || {
    expectedBal: 0,
    countedBal: 0,
    endingBal: 0,
  };

  return {
    ccySummary,
    expectedBalances,
    countedBalances,
    endingBalances,
    cashDrop: usdSummary.cashDrop || 0,
    closingBal: usdSummary.countedBal,
    variance: roundMoney(usdSummary.countedBal - usdSummary.expectedBal),
  };
}
