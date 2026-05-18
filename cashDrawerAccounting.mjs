const BASE_CCY = "USD";

const roundMoney = (value) => {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

const hasCount = (counts, code) => (
  Object.prototype.hasOwnProperty.call(counts || {}, code) &&
  String(counts[code] ?? "").trim() !== ""
);

const collectOpeningBalances = (shift = {}, drawer = {}) => {
  const balances = {};
  const shiftBalances = shift.openingCcyBals || {};
  const hasShiftBalances = Object.keys(shiftBalances).length > 0;
  const source = hasShiftBalances ? shiftBalances : (drawer.ccyBalances || {});

  Object.entries(source).forEach(([code, value]) => {
    balances[code] = roundMoney(value);
  });

  if (!Object.prototype.hasOwnProperty.call(balances, BASE_CCY)) {
    balances[BASE_CCY] = roundMoney(shift.openingBal ?? drawer.balance ?? 0);
  }

  return balances;
};

const signedAmountForCode = (txn, code) => {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : roundMoney(txn.amount);
  return txn.fxCcy === code ? roundMoney(txn.fxAmt) : 0;
};

export function buildShiftCurrencySummary({ shift = {}, drawer = {}, txns = [], counts = {}, cashDrop = 0 } = {}) {
  const openingBalances = collectOpeningBalances(shift, drawer);
  const codes = new Set([BASE_CCY, ...Object.keys(openingBalances)]);
  txns.forEach(txn => {
    if (txn.fxCcy) codes.add(txn.fxCcy);
  });

  const summary = [...codes].map(code => {
    const signedRows = txns
      .map(txn => ({ txn, amount: signedAmountForCode(txn, code) }))
      .filter(row => row.amount !== 0);
    const inRows = signedRows.filter(row => row.amount > 0);
    const outRows = signedRows.filter(row => row.amount < 0);
    const movement = signedRows.reduce((sum, row) => sum + row.amount, 0);
    const expectedBal = roundMoney((openingBalances[code] || 0) + movement);
    const countedBal = hasCount(counts, code) ? roundMoney(counts[code]) : expectedBal;
    const drop = code === BASE_CCY ? Math.max(0, roundMoney(cashDrop)) : 0;
    const endingBal = roundMoney(countedBal - drop);

    return {
      code,
      openingBal: openingBalances[code] || 0,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn: roundMoney(inRows.reduce((sum, row) => sum + Math.abs(row.amount), 0)),
      totOut: roundMoney(outRows.reduce((sum, row) => sum + Math.abs(row.amount), 0)),
      expectedBal,
      countedBal,
      bal: countedBal,
      cashDrop: drop,
      endingBal,
      hasCount: hasCount(counts, code),
    };
  });

  return summary;
}

export function buildCloseAccounting({ shift = {}, drawer = {}, txns = [], counts = {}, cashDrop = 0 } = {}) {
  const ccySummary = buildShiftCurrencySummary({ shift, drawer, txns, counts, cashDrop });
  const byCode = Object.fromEntries(ccySummary.map(row => [row.code, row]));
  const endingCcyBalances = Object.fromEntries(ccySummary.map(row => [row.code, row.endingBal]));
  const usd = byCode[BASE_CCY] || {
    expectedBal: 0,
    countedBal: 0,
    endingBal: 0,
    hasCount: false,
    cashDrop: 0,
  };

  return {
    ccySummary,
    byCode,
    closingBal: usd.countedBal,
    endingBal: usd.endingBal,
    endingCcyBalances,
    cashDrop: usd.cashDrop,
    variance: usd.hasCount ? roundMoney(usd.countedBal - usd.expectedBal) : 0,
  };
}
