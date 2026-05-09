export const roundMoney = (value) => {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const hasValue = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

export const getOpeningCcyBalances = (shift = {}, drawer = {}) => {
  shift = shift || {};
  drawer = drawer || {};
  const balances = {};
  const source = shift.openingCcyBals && Object.keys(shift.openingCcyBals).length > 0
    ? shift.openingCcyBals
    : drawer.ccyBalances;

  Object.entries(source || {}).forEach(([code, value]) => {
    balances[code] = roundMoney(value);
  });

  if (shift.openingBal !== undefined && shift.openingBal !== null) {
    balances.USD = roundMoney(shift.openingBal);
  } else if (!hasValue(balances, "USD")) {
    balances.USD = roundMoney(shift.openingBal ?? drawer.balance ?? 0);
  }

  return balances;
};

export const getTxnCashAmount = (txn, code) => {
  if (code === "USD") return txn.fxCcy ? 0 : roundMoney(txn.amount);
  return txn.fxCcy === code ? roundMoney(txn.fxAmt) : 0;
};

export const summarizeShiftCash = ({ shift, drawer, txns = [], counts = {}, cashDrop = 0 } = {}) => {
  shift = shift || {};
  drawer = drawer || {};
  const openingBalances = getOpeningCcyBalances(shift, drawer);
  const shiftTxns = shift.id ? txns.filter(t => t.shiftId === shift.id) : [];
  const currencies = [...new Set([
    "USD",
    ...Object.keys(openingBalances),
    ...shiftTxns.filter(t => t.fxCcy).map(t => t.fxCcy),
  ])];

  const summary = currencies.map(code => {
    const rows = shiftTxns.filter(t => code === "USD" ? !t.fxCcy : t.fxCcy === code);
    const inRows = rows.filter(t => getTxnCashAmount(t, code) > 0);
    const outRows = rows.filter(t => getTxnCashAmount(t, code) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(getTxnCashAmount(txn, code)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(getTxnCashAmount(txn, code)), 0));
    const txDelta = roundMoney(rows.reduce((sum, txn) => sum + getTxnCashAmount(txn, code), 0));
    const openingBal = roundMoney(openingBalances[code] ?? 0);
    const sysBal = roundMoney(openingBal + txDelta);
    const countWasEntered = hasValue(counts, code) && counts[code] !== "";
    const bal = countWasEntered ? roundMoney(counts[code]) : sysBal;
    const codeCashDrop = code === "USD" ? roundMoney(cashDrop) : 0;

    return {
      code,
      openingBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      sysBal,
      bal,
      cashDrop: codeCashDrop,
      endingBal: roundMoney(bal - codeCashDrop),
      variance: roundMoney(bal - sysBal),
    };
  });

  const usd = summary.find(row => row.code === "USD") || {
    sysBal: 0,
    bal: 0,
    endingBal: 0,
    variance: 0,
    totIn: 0,
    totOut: 0,
  };

  return {
    summary,
    openingBalances,
    systemBalances: Object.fromEntries(summary.map(row => [row.code, row.sysBal])),
    endingBalances: Object.fromEntries(summary.map(row => [row.code, row.endingBal])),
    usdSystemBalance: usd.sysBal,
    usdDrawerBalance: usd.bal,
    usdEndingBalance: usd.endingBal,
    usdVariance: usd.variance,
    cashIn: usd.totIn,
    cashOut: usd.totOut,
  };
};
