const BASE_CCY = "USD";

const toAmount = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const roundMoney = (value) => Math.round((toAmount(value) + Number.EPSILON) * 100) / 100;

const normalizeBalances = (balances = {}) =>
  Object.fromEntries(
    Object.entries(balances || {})
      .filter(([code]) => code)
      .map(([code, value]) => [code, roundMoney(value)])
  );

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

export const nativeTxnAmount = (txn, code) => {
  if (!txn) return 0;
  if (code === BASE_CCY) return txn.fxCcy ? 0 : toAmount(txn.amount);
  return txn.fxCcy === code ? toAmount(txn.fxAmt) : 0;
};

export const getOpeningBalances = ({ shift, drawer } = {}) => {
  const opening = normalizeBalances(shift?.openingCcyBals);

  if (!hasOwn(opening, BASE_CCY)) {
    opening[BASE_CCY] = roundMoney(shift?.openingBal ?? drawer?.balance ?? drawer?.ccyBalances?.[BASE_CCY]);
  }

  if (!shift?.openingCcyBals) {
    const drawerBalances = normalizeBalances(drawer?.ccyBalances);
    Object.entries(drawerBalances).forEach(([code, amount]) => {
      if (code !== BASE_CCY && !hasOwn(opening, code)) opening[code] = amount;
    });
  }

  return opening;
};

export const getCloseCurrencyCodes = ({ shift, drawer, transactions = [], countedBalances = {} } = {}) => {
  const codes = new Set([BASE_CCY]);
  Object.keys(getOpeningBalances({ shift, drawer })).forEach(code => codes.add(code));
  transactions.forEach(txn => {
    if (txn?.fxCcy) codes.add(txn.fxCcy);
    else codes.add(BASE_CCY);
  });
  Object.keys(countedBalances || {}).forEach(code => codes.add(code));
  return [...codes];
};

export function buildCloseDrawerAccounting({
  shift,
  drawer,
  transactions = [],
  countedBalances = {},
  cashDrop = 0,
} = {}) {
  const openingBalances = getOpeningBalances({ shift, drawer });
  const cashDropAmount = Math.max(0, roundMoney(cashDrop));

  const ccySummary = getCloseCurrencyCodes({ shift, drawer, transactions, countedBalances }).map(code => {
    const openingBal = roundMoney(openingBalances[code]);
    const rows = transactions.filter(txn => nativeTxnAmount(txn, code) !== 0);
    const inRows = rows.filter(txn => nativeTxnAmount(txn, code) > 0);
    const outRows = rows.filter(txn => nativeTxnAmount(txn, code) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(nativeTxnAmount(txn, code)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(nativeTxnAmount(txn, code)), 0));
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const hasCount = hasOwn(countedBalances, code) && countedBalances[code] !== "";
    const bal = hasCount ? roundMoney(countedBalances[code]) : expectedBal;

    return {
      code,
      openingBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      expectedBal,
      bal,
      variance: roundMoney(bal - expectedBal),
    };
  });

  const drawerBalances = Object.fromEntries(ccySummary.map(summary => [summary.code, summary.bal]));
  const expectedBalances = Object.fromEntries(ccySummary.map(summary => [summary.code, summary.expectedBal]));
  const endingBalances = Object.fromEntries(
    ccySummary.map(summary => [
      summary.code,
      roundMoney(summary.bal - (summary.code === BASE_CCY ? cashDropAmount : 0)),
    ])
  );
  const usdSummary = ccySummary.find(summary => summary.code === BASE_CCY) || {
    bal: 0,
    totIn: 0,
    totOut: 0,
    variance: 0,
  };

  return {
    ccySummary,
    expectedBalances,
    drawerBalances,
    endingBalances,
    closingBal: usdSummary.bal,
    endingBal: endingBalances[BASE_CCY] || 0,
    cashIn: usdSummary.totIn,
    cashOut: usdSummary.totOut,
    cashDrop: cashDropAmount,
    variance: usdSummary.variance,
  };
}
