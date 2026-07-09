const BASE_CCY = "USD";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const parseMoney = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const addAmount = (balances, code, amount) => {
  const ccy = code || BASE_CCY;
  balances[ccy] = roundMoney((balances[ccy] || 0) + (Number(amount) || 0));
};

const parseBalanceMap = (balances) => {
  return Object.fromEntries(
    Object.entries(balances || {})
      .map(([code, value]) => [code, roundMoney(parseMoney(value, 0))])
      .filter(([, value]) => Number.isFinite(value))
  );
};

export function getOpeningBalances(drawer = {}, shift = {}) {
  const shiftBalances = parseBalanceMap(shift.openingCcyBals);
  if (Object.keys(shiftBalances).length > 0) {
    if (shiftBalances[BASE_CCY] === undefined) {
      shiftBalances[BASE_CCY] = roundMoney(parseMoney(shift.openingBal, parseMoney(drawer.balance, 0)));
    }
    return shiftBalances;
  }

  const drawerBalances = parseBalanceMap(drawer.ccyBalances);
  if (Object.keys(drawerBalances).length > 0) {
    if (drawerBalances[BASE_CCY] === undefined) {
      drawerBalances[BASE_CCY] = roundMoney(parseMoney(shift.openingBal, parseMoney(drawer.balance, 0)));
    }
    return drawerBalances;
  }

  return { [BASE_CCY]: roundMoney(parseMoney(shift.openingBal, parseMoney(drawer.balance, 0))) };
}

export function getTransactionDeltaBalances(txns = []) {
  return txns.reduce((balances, txn) => {
    if (txn?.fxCcy) {
      addAmount(balances, txn.fxCcy, parseMoney(txn.fxAmt, 0));
    } else {
      addAmount(balances, BASE_CCY, parseMoney(txn?.amount, 0));
    }
    return balances;
  }, {});
}

const buildCurrencySummary = (code, txns, opening, expected, counted, ending) => {
  const isBase = code === BASE_CCY;
  const rows = isBase ? txns.filter(t => !t.fxCcy) : txns.filter(t => t.fxCcy === code);
  const signedAmount = (txn) => isBase ? parseMoney(txn.amount, 0) : parseMoney(txn.fxAmt, 0);
  const inRows = rows.filter(txn => signedAmount(txn) > 0);
  const outRows = rows.filter(txn => signedAmount(txn) < 0);

  return {
    code,
    inCount: inRows.length,
    outCount: outRows.length,
    totIn: roundMoney(inRows.reduce((sum, txn) => sum + signedAmount(txn), 0)),
    totOut: roundMoney(Math.abs(outRows.reduce((sum, txn) => sum + signedAmount(txn), 0))),
    opening: roundMoney(opening),
    expected: roundMoney(expected),
    bal: roundMoney(counted),
    ending: roundMoney(ending),
  };
};

export function buildCashDrawerAccounting({
  drawer = {},
  shift = {},
  txns = [],
  counts = {},
  cashDrop = 0,
} = {}) {
  const openingBalances = getOpeningBalances(drawer, shift);
  const deltaBalances = getTransactionDeltaBalances(txns);
  const countedInput = counts || {};
  const usdDrop = Math.max(0, roundMoney(parseMoney(cashDrop, 0)));
  const currencyCodes = [...new Set([
    BASE_CCY,
    ...Object.keys(openingBalances),
    ...Object.keys(deltaBalances),
    ...Object.keys(countedInput).filter(code => countedInput[code] !== undefined && countedInput[code] !== ""),
  ])];

  const expectedBalances = {};
  const countedBalances = {};
  const endingCcyBalances = {};
  const ccySummary = currencyCodes.map((code) => {
    const expected = roundMoney((openingBalances[code] || 0) + (deltaBalances[code] || 0));
    const counted = countedInput[code] !== undefined && countedInput[code] !== ""
      ? roundMoney(parseMoney(countedInput[code], expected))
      : expected;
    const ending = roundMoney(counted - (code === BASE_CCY ? usdDrop : 0));

    expectedBalances[code] = expected;
    countedBalances[code] = counted;
    endingCcyBalances[code] = ending;

    return buildCurrencySummary(code, txns, openingBalances[code] || 0, expected, counted, ending);
  });

  const varianceByCode = Object.fromEntries(currencyCodes.map(code => [
    code,
    roundMoney((countedBalances[code] || 0) - (expectedBalances[code] || 0)),
  ]));

  return {
    openingBalances,
    expectedBalances,
    countedBalances,
    endingCcyBalances,
    ccySummary,
    cashDrop: usdDrop,
    closingBal: countedBalances[BASE_CCY] || 0,
    endingBal: endingCcyBalances[BASE_CCY] || 0,
    variance: varianceByCode[BASE_CCY] || 0,
    varianceByCode,
  };
}
