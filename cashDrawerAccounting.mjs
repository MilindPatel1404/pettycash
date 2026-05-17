export const BASE_CURRENCY = "USD";

const roundMoney = (value) => {
  const n = Number.isFinite(value) ? value : 0;
  return Number(n.toFixed(2));
};

export const parseOptionalFiniteAmount = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBalances = (balances = {}) => Object.entries(balances).reduce((acc, [code, value]) => {
  const parsed = parseOptionalFiniteAmount(value);
  if (parsed !== null) acc[code] = roundMoney(parsed);
  return acc;
}, {});

const sortedCurrencyCodes = (codes) => [
  BASE_CURRENCY,
  ...[...codes].filter(code => code && code !== BASE_CURRENCY).sort(),
];

export const cashDropForCurrency = (shiftOrSummary, code) => {
  if (shiftOrSummary?.code && Number.isFinite(shiftOrSummary.cashDrop)) return shiftOrSummary.cashDrop;
  if (shiftOrSummary && Number.isFinite(shiftOrSummary.cashDropByCurrency?.[code])) return shiftOrSummary.cashDropByCurrency[code];
  return code === BASE_CURRENCY ? roundMoney(parseOptionalFiniteAmount(shiftOrSummary?.cashDrop) || 0) : 0;
};

export const endingBalanceForSummary = (shift, summary) => {
  if (Number.isFinite(summary?.endingBal)) return summary.endingBal;
  const bal = parseOptionalFiniteAmount(summary?.bal) || 0;
  const drop = Number.isFinite(summary?.cashDrop)
    ? summary.cashDrop
    : cashDropForCurrency(shift, summary?.code);
  return roundMoney(bal - drop);
};

export const openingBalanceForSummary = (summary) => (
  Number.isFinite(summary?.openingBal) ? summary.openingBal : 0
);

export function computeCashDrawerClose({ activeShift, selectedDrawer, txns = [], ccyCounts = {}, cashDropInput = 0 }) {
  const shiftId = activeShift?.id || selectedDrawer?.currentShift;
  const shiftTxns = txns.filter(t => t.shiftId === shiftId);

  const openingCcyBals = normalizeBalances(
    activeShift?.openingCcyBals
    || selectedDrawer?.ccyBalances
    || { [BASE_CURRENCY]: activeShift?.openingBal ?? selectedDrawer?.balance ?? 0 }
  );
  if (openingCcyBals[BASE_CURRENCY] === undefined) {
    openingCcyBals[BASE_CURRENCY] = roundMoney(activeShift?.openingBal ?? selectedDrawer?.balance ?? 0);
  }

  const expectedBalances = { ...openingCcyBals };
  shiftTxns.forEach(txn => {
    if (txn.fxCcy) {
      expectedBalances[txn.fxCcy] = roundMoney((expectedBalances[txn.fxCcy] || 0) + (parseOptionalFiniteAmount(txn.fxAmt) || 0));
      return;
    }
    expectedBalances[BASE_CURRENCY] = roundMoney((expectedBalances[BASE_CURRENCY] || 0) + (parseOptionalFiniteAmount(txn.amount) || 0));
  });

  const countedCodes = Object.entries(ccyCounts).reduce((acc, [code, value]) => {
    if (parseOptionalFiniteAmount(value) !== null) acc.add(code);
    return acc;
  }, new Set());
  const codes = sortedCurrencyCodes(new Set([
    ...Object.keys(openingCcyBals),
    ...Object.keys(expectedBalances),
    ...countedCodes,
  ]));

  const cashDropParsed = parseOptionalFiniteAmount(cashDropInput);
  const cashDrop = roundMoney(cashDropParsed !== null && cashDropParsed > 0 ? cashDropParsed : 0);
  const cashDropByCurrency = { [BASE_CURRENCY]: cashDrop };

  const countedBalances = {};
  const endingCcyBalances = {};
  const ccySummary = codes.map(code => {
    const counted = parseOptionalFiniteAmount(ccyCounts[code]);
    const openingBal = roundMoney(openingCcyBals[code] || 0);
    const expectedBal = roundMoney(expectedBalances[code] || 0);
    const bal = roundMoney(counted !== null ? counted : expectedBal);
    const rows = code === BASE_CURRENCY
      ? shiftTxns.filter(t => !t.fxCcy)
      : shiftTxns.filter(t => t.fxCcy === code);
    const getAmt = t => code === BASE_CURRENCY
      ? (parseOptionalFiniteAmount(t.amount) || 0)
      : (parseOptionalFiniteAmount(t.fxAmt) || 0);
    const inRows = rows.filter(t => getAmt(t) > 0);
    const outRows = rows.filter(t => getAmt(t) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(getAmt(txn)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(getAmt(txn)), 0));
    const codeCashDrop = code === BASE_CURRENCY ? cashDrop : 0;
    const endingBal = roundMoney(bal - codeCashDrop);

    countedBalances[code] = bal;
    endingCcyBalances[code] = endingBal;

    return {
      code,
      openingBal,
      expectedBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal,
      cashDrop: codeCashDrop,
      endingBal,
      variance: roundMoney(bal - expectedBal),
    };
  });

  const usdSummary = ccySummary.find(row => row.code === BASE_CURRENCY) || {
    bal: 0,
    endingBal: 0,
    variance: 0,
    totIn: 0,
    totOut: 0,
  };

  return {
    shiftTxns,
    expectedBalances,
    countedBalances,
    endingCcyBalances,
    ccySummary,
    cashDrop,
    cashDropByCurrency,
    closingBal: usdSummary.bal,
    endingBalance: usdSummary.endingBal,
    variance: usdSummary.variance,
    cashIn: usdSummary.totIn,
    cashOut: usdSummary.totOut,
  };
}
