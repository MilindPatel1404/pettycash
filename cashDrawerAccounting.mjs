const toFiniteNumber = (value, fallback = 0) => {
  const number = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

const hasValue = value => value !== undefined && value !== null && value !== "";

const openingBalanceFor = (code, shift, drawer) => {
  const openingBalances = shift?.openingCcyBals || {};
  if (hasValue(openingBalances[code])) return toFiniteNumber(openingBalances[code]);
  if (code === "USD" && hasValue(shift?.openingBal)) return toFiniteNumber(shift.openingBal);
  return toFiniteNumber(drawer?.ccyBalances?.[code]);
};

const nativeAmount = (transaction, code) =>
  code === "USD" ? toFiniteNumber(transaction.amount) : toFiniteNumber(transaction.fxAmt);

export function buildCloseDrawerAccounting({
  shift,
  drawer,
  transactions = [],
  counts = {},
  cashDrop = 0,
}) {
  const shiftTransactions = transactions.filter(transaction => transaction.shiftId === shift?.id);
  const currencies = [...new Set([
    "USD",
    ...Object.keys(drawer?.ccyBalances || {}),
    ...Object.keys(shift?.openingCcyBals || {}),
    ...shiftTransactions.map(transaction => transaction.fxCcy).filter(Boolean),
    ...Object.keys(counts || {}),
  ])];

  const requestedDrop = toFiniteNumber(cashDrop);
  const normalizedDrop = requestedDrop > 0 ? requestedDrop : 0;
  const expectedBalances = {};
  const drawerBalances = {};
  const endingBalances = {};
  const variances = {};
  const countedCurrencies = [];

  const ccySummary = currencies.map(code => {
    const rows = code === "USD"
      ? shiftTransactions.filter(transaction => !transaction.fxCcy)
      : shiftTransactions.filter(transaction => transaction.fxCcy === code);
    const amounts = rows.map(transaction => nativeAmount(transaction, code));
    const openingBal = openingBalanceFor(code, shift, drawer);
    const totIn = amounts.filter(amount => amount > 0).reduce((sum, amount) => sum + amount, 0);
    const totOut = Math.abs(amounts.filter(amount => amount < 0).reduce((sum, amount) => sum + amount, 0));
    const expectedBal = openingBal + totIn - totOut;
    const wasCounted = hasValue(counts?.[code]) && Number.isFinite(Number.parseFloat(counts[code]));
    const drawerBal = wasCounted ? Number.parseFloat(counts[code]) : expectedBal;
    const codeDrop = code === "USD" ? normalizedDrop : 0;
    const endingBal = drawerBal - codeDrop;

    expectedBalances[code] = expectedBal;
    drawerBalances[code] = drawerBal;
    endingBalances[code] = endingBal;
    variances[code] = wasCounted ? drawerBal - expectedBal : 0;
    if (wasCounted) countedCurrencies.push(code);

    return {
      code,
      inCount: amounts.filter(amount => amount > 0).length,
      outCount: amounts.filter(amount => amount < 0).length,
      totIn,
      totOut,
      openingBal,
      expectedBal,
      variance: variances[code],
      bal: drawerBal,
      cashDrop: codeDrop,
      endingBal,
    };
  });

  return {
    currencies,
    expectedBalances,
    drawerBalances,
    endingBalances,
    variances,
    countedCurrencies,
    ccySummary,
    cashDrop: normalizedDrop,
    closingBal: endingBalances.USD,
  };
}
