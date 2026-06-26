const BASE_CCY = "USD";

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const toNumber = value => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const hasEnteredAmount = (obj, key) => hasOwn(obj, key) && String(obj[key] ?? "").trim() !== "";

const roundMoney = value => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const normalizeOpeningBalances = (shift, drawer) => {
  if (shift?.openingCcyBals && Object.keys(shift.openingCcyBals).length > 0) {
    return Object.fromEntries(
      Object.entries(shift.openingCcyBals).map(([code, value]) => [code, roundMoney(value)])
    );
  }

  if (drawer?.ccyBalances && Object.keys(drawer.ccyBalances).length > 0) {
    return Object.fromEntries(
      Object.entries(drawer.ccyBalances).map(([code, value]) => [code, roundMoney(value)])
    );
  }

  return { [BASE_CCY]: roundMoney(shift?.openingBal ?? drawer?.balance ?? 0) };
};

const nativeTxnCode = txn => txn.fxCcy || BASE_CCY;
const nativeTxnAmount = txn => txn.fxCcy ? toNumber(txn.fxAmt) : toNumber(txn.amount);

export const isDrawerLifecycleLocked = drawer => Boolean(drawer?.inUseBy || drawer?.currentShift);

export function buildCloseDrawerAccounting({
  shift,
  drawer,
  transactions = [],
  countedBalances = {},
  cashDrop = 0,
} = {}) {
  const openingByCode = normalizeOpeningBalances(shift, drawer);
  const relevantTxns = shift?.id ? transactions.filter(t => t.shiftId === shift.id) : [];
  const codes = [...new Set([
    BASE_CCY,
    ...Object.keys(openingByCode),
    ...relevantTxns.map(nativeTxnCode),
    ...Object.keys(countedBalances || {}),
  ])];

  const txnsByCode = Object.fromEntries(codes.map(code => [code, []]));
  relevantTxns.forEach(txn => {
    const code = nativeTxnCode(txn);
    if (!txnsByCode[code]) txnsByCode[code] = [];
    txnsByCode[code].push(txn);
  });

  const expectedByCode = {};
  const countedByCode = {};
  const endingByCode = {};
  const ccySummary = codes.map(code => {
    const rows = txnsByCode[code] || [];
    const signedAmounts = rows.map(nativeTxnAmount);
    const inAmounts = signedAmounts.filter(amount => amount > 0);
    const outAmounts = signedAmounts.filter(amount => amount < 0);
    const totIn = roundMoney(inAmounts.reduce((sum, amount) => sum + amount, 0));
    const totOut = roundMoney(Math.abs(outAmounts.reduce((sum, amount) => sum + amount, 0)));
    const openingBal = roundMoney(openingByCode[code] || 0);
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const countedBal = hasEnteredAmount(countedBalances, code)
      ? roundMoney(countedBalances[code])
      : expectedBal;
    const dropForCode = code === BASE_CCY ? Math.max(0, roundMoney(cashDrop)) : 0;
    const endingBal = roundMoney(countedBal - dropForCode);

    expectedByCode[code] = expectedBal;
    countedByCode[code] = countedBal;
    endingByCode[code] = endingBal;

    return {
      code,
      openingBal,
      inCount: inAmounts.length,
      outCount: outAmounts.length,
      totIn,
      totOut,
      expectedBal,
      bal: countedBal,
      endingBal,
    };
  });

  const normalizedCashDrop = Math.max(0, roundMoney(cashDrop));
  const closingBal = roundMoney(countedByCode[BASE_CCY] || 0);
  const endingBal = roundMoney(endingByCode[BASE_CCY] || 0);
  const variance = roundMoney(closingBal - (expectedByCode[BASE_CCY] || 0));
  const usdSummary = ccySummary.find(summary => summary.code === BASE_CCY) || {
    totIn: 0,
    totOut: 0,
  };

  return {
    codes,
    openingByCode,
    expectedByCode,
    countedByCode,
    endingByCode,
    ccySummary,
    cashDrop: normalizedCashDrop,
    closingBal,
    endingBal,
    variance,
    shiftUpdate: {
      closingBal,
      cashIn: usdSummary.totIn,
      cashOut: usdSummary.totOut,
      variance,
      ccySummary,
      cashDrop: normalizedCashDrop,
    },
    drawerUpdate: {
      balance: endingBal,
      ccyBalances: endingByCode,
    },
  };
}
