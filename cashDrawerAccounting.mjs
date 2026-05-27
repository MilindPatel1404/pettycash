const DEFAULT_BASE_CCY = "USD";

const roundMoney = value => Number.parseFloat((Number(value) || 0).toFixed(2));

const toNumber = value => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const hasCount = value => value !== undefined && value !== null && String(value).trim() !== "";

const normalizeBalances = balances => Object.fromEntries(
  Object.entries(balances || {})
    .filter(([code]) => code)
    .map(([code, value]) => [code, roundMoney(toNumber(value))])
);

const shiftOpeningBalances = (drawer, shift, baseCurrency) => {
  if (shift?.openingCcyBals && Object.keys(shift.openingCcyBals).length > 0) {
    return normalizeBalances(shift.openingCcyBals);
  }
  if (drawer?.ccyBalances && Object.keys(drawer.ccyBalances).length > 0) {
    return normalizeBalances(drawer.ccyBalances);
  }
  return { [baseCurrency]: roundMoney(toNumber(shift?.openingBal ?? drawer?.balance)) };
};

const txnNativeCurrency = (txn, baseCurrency) => txn.fxCcy || baseCurrency;

const txnNativeAmount = (txn, baseCurrency) => (
  txnNativeCurrency(txn, baseCurrency) === baseCurrency ? toNumber(txn.amount) : toNumber(txn.fxAmt)
);

const summarizeNativeTransactions = (txns, code, baseCurrency) => {
  const rows = (txns || []).filter(txn => txnNativeCurrency(txn, baseCurrency) === code);
  const inRows = rows.filter(txn => txnNativeAmount(txn, baseCurrency) > 0);
  const outRows = rows.filter(txn => txnNativeAmount(txn, baseCurrency) < 0);
  return {
    inCount: inRows.length,
    outCount: outRows.length,
    totIn: roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(txnNativeAmount(txn, baseCurrency)), 0)),
    totOut: roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(txnNativeAmount(txn, baseCurrency)), 0)),
  };
};

export function buildCloseDrawerAccounting({
  drawer,
  shift,
  txns = [],
  countedBalances = {},
  cashDrop = 0,
  baseCurrency = DEFAULT_BASE_CCY,
} = {}) {
  const openingBalances = shiftOpeningBalances(drawer, shift, baseCurrency);
  const currencyCodes = Array.from(new Set([
    baseCurrency,
    ...Object.keys(openingBalances),
    ...(txns || []).map(txn => txnNativeCurrency(txn, baseCurrency)),
    ...Object.keys(countedBalances || {}),
  ]));
  const dropAmount = roundMoney(Math.max(0, toNumber(cashDrop)));

  const ccySummary = currencyCodes.map(code => {
    const txnSummary = summarizeNativeTransactions(txns, code, baseCurrency);
    const startingBal = roundMoney(openingBalances[code] || 0);
    const expectedBal = roundMoney(startingBal + txnSummary.totIn - txnSummary.totOut);
    const entered = hasCount(countedBalances?.[code]);
    const countedBal = entered ? roundMoney(toNumber(countedBalances[code])) : expectedBal;
    const rowCashDrop = code === baseCurrency ? dropAmount : 0;
    const endingBal = roundMoney(countedBal - rowCashDrop);

    return {
      code,
      ...txnSummary,
      startingBal,
      expectedBal,
      bal: countedBal,
      cashDrop: rowCashDrop,
      endingBal,
      variance: roundMoney(countedBal - expectedBal),
      counted: entered,
    };
  });

  const ccyBalances = Object.fromEntries(ccySummary.map(row => [row.code, row.endingBal]));
  const baseRow = ccySummary.find(row => row.code === baseCurrency) || ccySummary[0];

  return {
    ccySummary,
    ccyBalances,
    expectedBalances: Object.fromEntries(ccySummary.map(row => [row.code, row.expectedBal])),
    countedBalances: Object.fromEntries(ccySummary.map(row => [row.code, row.bal])),
    endingBalances: ccyBalances,
    enteredCounts: Object.fromEntries(ccySummary.map(row => [row.code, row.counted])),
    closingBal: baseRow?.bal || 0,
    endingBalance: baseRow?.endingBal || 0,
    variance: baseRow?.variance || 0,
    cashDrop: dropAmount,
  };
}
