const BASE_CCY = "USD";

const isBlank = value => value === undefined || value === null || value === "";

const money = value => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = value => Math.round((money(value) + Number.EPSILON) * 100) / 100;

const normalizeBalances = balances =>
  Object.fromEntries(
    Object.entries(balances || {})
      .filter(([code]) => code)
      .map(([code, value]) => [code, roundMoney(value)])
  );

const hasBalances = balances => Object.keys(normalizeBalances(balances)).length > 0;

const openingBalancesFor = (shift, drawer) => {
  if (hasBalances(shift?.openingCcyBals)) return normalizeBalances(shift.openingCcyBals);
  if (hasBalances(drawer?.ccyBalances)) return normalizeBalances(drawer.ccyBalances);
  return { [BASE_CCY]: roundMoney(shift?.openingBal ?? drawer?.balance ?? 0) };
};

const txnAmountForCode = (txn, code) => {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : money(txn.amount);
  return txn.fxCcy === code ? money(txn.fxAmt) : 0;
};

export function buildCloseDrawerAccounting({
  drawer,
  shift,
  txns = [],
  countedBalances = {},
  cashDrop = 0,
} = {}) {
  const openingBalances = openingBalancesFor(shift, drawer);
  const counted = countedBalances || {};
  const codes = [
    BASE_CCY,
    ...Object.keys(openingBalances),
    ...txns.map(t => t.fxCcy).filter(Boolean),
    ...Object.keys(counted).filter(code => !isBlank(counted[code])),
  ].filter((code, idx, arr) => arr.indexOf(code) === idx);
  const normalizedDrop = Math.max(0, roundMoney(cashDrop));

  const ccySummary = codes.map(code => {
    const rows = txns
      .map(txn => ({ txn, nativeAmount: txnAmountForCode(txn, code) }))
      .filter(row => row.nativeAmount !== 0);
    const inRows = rows.filter(row => row.nativeAmount > 0);
    const outRows = rows.filter(row => row.nativeAmount < 0);
    const totIn = roundMoney(inRows.reduce((sum, row) => sum + row.nativeAmount, 0));
    const totOut = roundMoney(Math.abs(outRows.reduce((sum, row) => sum + row.nativeAmount, 0)));
    const openingBal = roundMoney(openingBalances[code] || 0);
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const hasCount = !isBlank(counted[code]);
    const countedBal = hasCount ? roundMoney(counted[code]) : expectedBal;
    const dropForCode = code === BASE_CCY ? normalizedDrop : 0;
    const endingBal = roundMoney(countedBal - dropForCode);

    return {
      code,
      openingBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      expectedBal,
      bal: countedBal,
      variance: roundMoney(countedBal - expectedBal),
      cashDrop: dropForCode,
      endingBal,
    };
  });

  const summaryByCode = Object.fromEntries(ccySummary.map(summary => [summary.code, summary]));
  const usdSummary = summaryByCode[BASE_CCY] || {
    openingBal: 0,
    totIn: 0,
    totOut: 0,
    bal: 0,
    variance: 0,
    endingBal: 0,
  };

  return {
    ccySummary,
    summaryByCode,
    cashDrop: normalizedDrop,
    closingBal: usdSummary.bal,
    endingBal: usdSummary.endingBal,
    variance: usdSummary.variance,
    cashIn: usdSummary.totIn,
    cashOut: usdSummary.totOut,
    endingCcyBalances: Object.fromEntries(
      ccySummary.map(summary => [summary.code, summary.endingBal])
    ),
  };
}
