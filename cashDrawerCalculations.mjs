export const toCashNumber = (value) => {
  const parsed = Number.parseFloat(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundCash = (value) => Number(toCashNumber(value).toFixed(2));

export const cashDropForCurrency = (code, cashDrop, baseCurrency = "USD") =>
  code === baseCurrency ? toCashNumber(cashDrop) : 0;

export const endingBalanceForCurrency = (summary, cashDrop, baseCurrency = "USD") =>
  roundCash(toCashNumber(summary?.bal) - cashDropForCurrency(summary?.code, cashDrop, baseCurrency));

export const buildEndingCurrencyBalances = (ccySummary, cashDrop, baseCurrency = "USD") => {
  const balances = {};
  (ccySummary || []).forEach((summary) => {
    balances[summary.code] = endingBalanceForCurrency(summary, cashDrop, baseCurrency);
  });
  return balances;
};

export const openingBalanceForCurrency = (shift, code, baseCurrency = "USD") => {
  if (!shift) return 0;
  if (code === baseCurrency) return toCashNumber(shift.openingBal);
  return toCashNumber(shift.openingCcyBals?.[code]);
};

export const transactionAmountForCurrency = (txn, code, baseCurrency = "USD") => {
  if (code === baseCurrency) return txn?.fxCcy ? 0 : toCashNumber(txn?.amount);
  return txn?.fxCcy === code ? toCashNumber(txn?.fxAmt) : 0;
};

export const systemBalanceForCurrency = (shift, txns, code, baseCurrency = "USD") =>
  roundCash(
    openingBalanceForCurrency(shift, code, baseCurrency) +
      (txns || []).reduce((sum, txn) => sum + transactionAmountForCurrency(txn, code, baseCurrency), 0)
  );

export const buildShiftCurrencySummary = (shift, txns, countedBalances = {}, baseCurrency = "USD") => {
  const codes = [
    baseCurrency,
    ...Object.keys(shift?.openingCcyBals || {}).filter((code) => code !== baseCurrency),
    ...(txns || []).map((txn) => txn?.fxCcy).filter(Boolean),
  ];

  return [...new Set(codes)].map((code) => {
    const rows = (txns || []).filter((txn) =>
      code === baseCurrency ? !txn?.fxCcy : txn?.fxCcy === code
    );
    const amounts = rows.map((txn) => transactionAmountForCurrency(txn, code, baseCurrency));
    const inAmounts = amounts.filter((amount) => amount > 0);
    const outAmounts = amounts.filter((amount) => amount < 0);
    const systemBal = systemBalanceForCurrency(shift, txns, code, baseCurrency);

    return {
      code,
      inCount: inAmounts.length,
      outCount: outAmounts.length,
      totIn: roundCash(inAmounts.reduce((sum, amount) => sum + amount, 0)),
      totOut: roundCash(Math.abs(outAmounts.reduce((sum, amount) => sum + amount, 0))),
      bal:
        countedBalances?.[code] !== undefined
          ? roundCash(countedBalances[code])
          : systemBal,
    };
  });
};
