const BASE_CURRENCY = "USD";

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toMoney = value => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const unique = values => [...new Set(values.filter(Boolean))];

const normalizeBalances = balances =>
  Object.fromEntries(
    Object.entries(balances || {}).map(([code, amount]) => [code, toMoney(amount)])
  );

const nativeTxnAmount = (txn, code, baseCurrency) =>
  code === baseCurrency ? toMoney(txn.amount) : toMoney(txn.fxAmt);

export function buildDrawerCloseAccounting({
  shift,
  drawer,
  txns = [],
  counts = {},
  cashDrop = 0,
  baseCurrency = BASE_CURRENCY,
} = {}) {
  const openingBalances = normalizeBalances(shift?.openingCcyBals);
  const drawerBalances = normalizeBalances(drawer?.ccyBalances);
  Object.entries(drawerBalances).forEach(([code, amount]) => {
    if (openingBalances[code] === undefined) openingBalances[code] = amount;
  });
  if (shift?.openingBal !== undefined) {
    openingBalances[baseCurrency] = toMoney(shift.openingBal);
  } else if (openingBalances[baseCurrency] === undefined) {
    openingBalances[baseCurrency] = toMoney(drawer?.balance);
  }

  const countedBalances = normalizeBalances(counts);
  const shiftTxns = shift?.id ? txns.filter(txn => txn.shiftId === shift.id) : txns;
  const txnCurrencies = shiftTxns.map(txn => txn.fxCcy || baseCurrency);
  const currencies = unique([
    baseCurrency,
    ...Object.keys(openingBalances),
    ...Object.keys(drawerBalances),
    ...Object.keys(countedBalances),
    ...txnCurrencies,
  ]);

  const systemBalances = {};
  const closingBalances = {};
  const endingDrawerBalances = {};
  const variances = {};

  const ccySummary = currencies.map(code => {
    const rows = code === baseCurrency
      ? shiftTxns.filter(txn => !txn.fxCcy)
      : shiftTxns.filter(txn => txn.fxCcy === code);
    const inRows = rows.filter(txn => nativeTxnAmount(txn, code, baseCurrency) > 0);
    const outRows = rows.filter(txn => nativeTxnAmount(txn, code, baseCurrency) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(nativeTxnAmount(txn, code, baseCurrency)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(nativeTxnAmount(txn, code, baseCurrency)), 0));
    const openingBalance = openingBalances[code] ?? 0;
    const systemBalance = roundMoney(openingBalance + totIn - totOut);
    const countedBalance = counts?.[code] !== undefined ? countedBalances[code] : systemBalance;
    const cashDropForCode = code === baseCurrency ? toMoney(cashDrop) : 0;

    systemBalances[code] = systemBalance;
    closingBalances[code] = roundMoney(countedBalance);
    endingDrawerBalances[code] = roundMoney(countedBalance - cashDropForCode);
    variances[code] = roundMoney(countedBalance - systemBalance);

    return {
      code,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal: roundMoney(countedBalance),
      systemBal: systemBalance,
      variance: variances[code],
    };
  });

  const usdSummary = ccySummary.find(summary => summary.code === baseCurrency);

  return {
    currencies,
    ccySummary,
    systemBalances,
    closingBalances,
    drawerBalances: endingDrawerBalances,
    variance: variances[baseCurrency] ?? 0,
    variances,
    closingBal: closingBalances[baseCurrency] ?? 0,
    cashIn: usdSummary?.totIn ?? 0,
    cashOut: usdSummary?.totOut ?? 0,
  };
}
