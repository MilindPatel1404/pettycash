const BASE_CCY = "USD";

const toNumber = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const hasEnteredCount = (counts, code) => {
  if (!counts || !Object.prototype.hasOwnProperty.call(counts, code)) return false;
  const value = counts[code];
  return value !== "" && value !== null && value !== undefined;
};

const normalizeBalances = (balances) => {
  return Object.fromEntries(
    Object.entries(balances || {})
      .filter(([code]) => code)
      .map(([code, value]) => [code, roundMoney(value)])
  );
};

export function buildCloseDrawerAccounting({
  drawer,
  shift,
  txns = [],
  ccyCounts = {},
  cashDrop = 0,
} = {}) {
  const openingByCode = normalizeBalances(
    shift?.openingCcyBals && Object.keys(shift.openingCcyBals).length > 0
      ? shift.openingCcyBals
      : drawer?.ccyBalances
  );

  if (!Object.prototype.hasOwnProperty.call(openingByCode, BASE_CCY)) {
    openingByCode[BASE_CCY] = roundMoney(shift?.openingBal ?? drawer?.balance ?? 0);
  }

  const shiftTxns = txns.filter(t => t.shiftId === shift?.id);
  const txnCodes = shiftTxns.map(t => t.fxCcy || BASE_CCY);
  const countCodes = Object.keys(ccyCounts || {});
  const currencyCodes = [...new Set([BASE_CCY, ...Object.keys(openingByCode), ...txnCodes, ...countCodes])];

  const summaryByCode = Object.fromEntries(currencyCodes.map(code => [code, {
    code,
    inCount: 0,
    outCount: 0,
    totIn: 0,
    totOut: 0,
  }]));

  const expectedByCode = Object.fromEntries(currencyCodes.map(code => [code, roundMoney(openingByCode[code] || 0)]));

  shiftTxns.forEach(txn => {
    const code = txn.fxCcy || BASE_CCY;
    const amount = toNumber(txn.fxCcy ? txn.fxAmt : txn.amount);
    if (!summaryByCode[code]) {
      summaryByCode[code] = { code, inCount: 0, outCount: 0, totIn: 0, totOut: 0 };
    }
    if (!Object.prototype.hasOwnProperty.call(expectedByCode, code)) {
      expectedByCode[code] = 0;
      currencyCodes.push(code);
    }

    expectedByCode[code] = roundMoney(expectedByCode[code] + amount);
    if (amount > 0) {
      summaryByCode[code].inCount += 1;
      summaryByCode[code].totIn = roundMoney(summaryByCode[code].totIn + amount);
    } else if (amount < 0) {
      summaryByCode[code].outCount += 1;
      summaryByCode[code].totOut = roundMoney(summaryByCode[code].totOut + Math.abs(amount));
    }
  });

  const countedByCode = Object.fromEntries(currencyCodes.map(code => [
    code,
    roundMoney(hasEnteredCount(ccyCounts, code) ? ccyCounts[code] : expectedByCode[code]),
  ]));

  const usdCashDrop = Math.max(0, roundMoney(cashDrop));
  const endingByCode = Object.fromEntries(currencyCodes.map(code => [
    code,
    roundMoney(countedByCode[code] - (code === BASE_CCY ? usdCashDrop : 0)),
  ]));

  const ccySummary = currencyCodes.map(code => ({
    ...summaryByCode[code],
    openingBal: roundMoney(openingByCode[code] || 0),
    expectedBal: roundMoney(expectedByCode[code] || 0),
    countedBal: roundMoney(countedByCode[code] || 0),
    variance: roundMoney((countedByCode[code] || 0) - (expectedByCode[code] || 0)),
    cashDrop: code === BASE_CCY ? usdCashDrop : 0,
    endingBal: roundMoney(endingByCode[code] || 0),
    bal: roundMoney(countedByCode[code] || 0),
  }));

  return {
    currencyCodes,
    openingByCode,
    expectedByCode,
    countedByCode,
    endingByCode,
    ccySummary,
    closingBal: countedByCode[BASE_CCY] || 0,
    endingBalance: endingByCode[BASE_CCY] || 0,
    variance: roundMoney((countedByCode[BASE_CCY] || 0) - (expectedByCode[BASE_CCY] || 0)),
    cashDrop: usdCashDrop,
  };
}
