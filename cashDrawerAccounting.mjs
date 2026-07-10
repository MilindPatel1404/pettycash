const USD = "USD";

export function parseMoney(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Math.round((parseMoney(value) + Number.EPSILON) * 100) / 100;
}

function hasCount(countedBalances, code) {
  return Object.prototype.hasOwnProperty.call(countedBalances || {}, code)
    && countedBalances[code] !== "";
}

export function getOpeningBalances(shift = {}, drawer = {}) {
  const raw = shift.openingCcyBals && Object.keys(shift.openingCcyBals).length
    ? shift.openingCcyBals
    : (drawer.ccyBalances || {});
  const balances = {};

  Object.entries(raw).forEach(([code, value]) => {
    balances[code] = roundMoney(value);
  });

  if (!Object.prototype.hasOwnProperty.call(balances, USD)) {
    balances[USD] = roundMoney(shift.openingBal ?? drawer.balance);
  }

  return balances;
}

function nativeAmountForCode(txn, code) {
  if (code === USD) return txn.fxCcy ? 0 : parseMoney(txn.amount);
  return txn.fxCcy === code ? parseMoney(txn.fxAmt) : 0;
}

function rowsForCode(transactions, code) {
  return transactions.filter(txn => code === USD ? !txn.fxCcy : txn.fxCcy === code);
}

function orderedCodes(openingBalances, transactions) {
  const codes = new Set([USD, ...Object.keys(openingBalances || {})]);
  transactions.forEach(txn => {
    if (txn.fxCcy) codes.add(txn.fxCcy);
  });
  return [USD, ...[...codes].filter(code => code !== USD).sort()];
}

export function buildCloseDrawerAccounting({
  shift,
  drawer,
  transactions = [],
  countedBalances = {},
  cashDrop = 0,
} = {}) {
  const shiftId = shift?.id;
  const shiftTxns = shiftId ? transactions.filter(txn => txn.shiftId === shiftId) : [];
  const openingBalances = getOpeningBalances(shift, drawer);
  const sanitizedCashDrop = Math.max(0, roundMoney(cashDrop));

  const ccySummary = orderedCodes(openingBalances, shiftTxns).map(code => {
    const rows = rowsForCode(shiftTxns, code);
    const inRows = rows.filter(txn => nativeAmountForCode(txn, code) > 0);
    const outRows = rows.filter(txn => nativeAmountForCode(txn, code) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(nativeAmountForCode(txn, code)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(nativeAmountForCode(txn, code)), 0));
    const openingBal = roundMoney(openingBalances[code] || 0);
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const bal = hasCount(countedBalances, code)
      ? roundMoney(countedBalances[code])
      : expectedBal;
    const codeCashDrop = code === USD ? sanitizedCashDrop : 0;
    const endingBal = roundMoney(bal - codeCashDrop);

    return {
      code,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      openingBal,
      expectedBal,
      bal,
      cashDrop: codeCashDrop,
      endingBal,
      variance: roundMoney(bal - expectedBal),
    };
  });

  const toBalanceMap = key => Object.fromEntries(ccySummary.map(row => [row.code, row[key]]));
  const usd = ccySummary.find(row => row.code === USD) || {
    totIn: 0,
    totOut: 0,
    bal: 0,
    endingBal: 0,
    variance: 0,
  };

  return {
    ccySummary,
    cashDrop: sanitizedCashDrop,
    closingBal: usd.bal,
    endingBal: usd.endingBal,
    variance: usd.variance,
    cashIn: usd.totIn,
    cashOut: usd.totOut,
    expectedBalances: toBalanceMap("expectedBal"),
    countedBalances: toBalanceMap("bal"),
    endingBalances: toBalanceMap("endingBal"),
    openingBalances: toBalanceMap("openingBal"),
    varianceByCode: toBalanceMap("variance"),
  };
}
