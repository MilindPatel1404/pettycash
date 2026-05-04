export const BASE_CCY = "USD";

export const parseAmt = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const hasEnteredCount = (counts, code) =>
  Object.prototype.hasOwnProperty.call(counts || {}, code) &&
  String(counts[code] ?? "").trim() !== "";

const txnAmountForCode = (txn, code) => {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : parseAmt(txn.amount);
  return txn.fxCcy === code ? parseAmt(txn.fxAmt) : 0;
};

export const getOpeningCcyBalances = (activeShift, selectedDrawer) => {
  if (activeShift?.openingCcyBals && Object.keys(activeShift.openingCcyBals).length) {
    return Object.fromEntries(
      Object.entries(activeShift.openingCcyBals).map(([code, amount]) => [code, parseAmt(amount)])
    );
  }

  const source =
    selectedDrawer?.ccyBalances && Object.keys(selectedDrawer.ccyBalances).length
      ? selectedDrawer.ccyBalances
      : { [BASE_CCY]: selectedDrawer?.balance ?? 0 };

  const opening = Object.fromEntries(
    Object.entries(source).map(([code, amount]) => [code, parseAmt(amount)])
  );

  if (activeShift?.openingBal !== undefined) {
    opening[BASE_CCY] = parseAmt(activeShift.openingBal);
  }

  return opening;
};

export const getShiftCurrencyCodes = (activeShift, selectedDrawer, shiftTxns = []) => {
  const opening = getOpeningCcyBalances(activeShift, selectedDrawer);
  return [
    ...new Set([
      BASE_CCY,
      ...Object.keys(opening),
      ...shiftTxns.filter((txn) => txn.fxCcy).map((txn) => txn.fxCcy),
    ]),
  ];
};

export const getSystemBalanceByCode = (activeShift, selectedDrawer, shiftTxns = []) => {
  const opening = getOpeningCcyBalances(activeShift, selectedDrawer);
  return Object.fromEntries(
    getShiftCurrencyCodes(activeShift, selectedDrawer, shiftTxns).map((code) => {
      const txnNet = shiftTxns.reduce((sum, txn) => sum + txnAmountForCode(txn, code), 0);
      return [code, round2((opening[code] || 0) + txnNet)];
    })
  );
};

export const buildClosedDrawerSnapshot = ({
  activeShift,
  selectedDrawer,
  shiftTxns = [],
  ccyCounts = {},
  cashDrop = 0,
}) => {
  const sysByCode = getSystemBalanceByCode(activeShift, selectedDrawer, shiftTxns);
  const closeDrop = parseAmt(cashDrop);
  const ccyBalances = {};

  const ccySummary = getShiftCurrencyCodes(activeShift, selectedDrawer, shiftTxns).map((code) => {
    const countedBalance = hasEnteredCount(ccyCounts, code)
      ? parseAmt(ccyCounts[code])
      : sysByCode[code] || 0;
    const rows = shiftTxns.filter((txn) => txnAmountForCode(txn, code) !== 0);
    const inRows = rows.filter((txn) => txnAmountForCode(txn, code) > 0);
    const outRows = rows.filter((txn) => txnAmountForCode(txn, code) < 0);
    const totIn = round2(inRows.reduce((sum, txn) => sum + txnAmountForCode(txn, code), 0));
    const totOut = round2(Math.abs(outRows.reduce((sum, txn) => sum + txnAmountForCode(txn, code), 0)));
    const dropForCode = code === BASE_CCY ? closeDrop : 0;

    ccyBalances[code] = round2(countedBalance - dropForCode);

    return {
      code,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal: round2(countedBalance),
    };
  });

  const usdSummary = ccySummary.find((row) => row.code === BASE_CCY) || {
    totIn: 0,
    totOut: 0,
    bal: 0,
  };
  const countedUsd = hasEnteredCount(ccyCounts, BASE_CCY)
    ? parseAmt(ccyCounts[BASE_CCY])
    : sysByCode[BASE_CCY] || 0;

  return {
    closingBal: usdSummary.bal,
    drawerBalance: ccyBalances[BASE_CCY] ?? usdSummary.bal,
    ccyBalances,
    ccySummary,
    cashDrop: closeDrop,
    cashIn: usdSummary.totIn,
    cashOut: usdSummary.totOut,
    variance: hasEnteredCount(ccyCounts, BASE_CCY)
      ? round2(countedUsd - (sysByCode[BASE_CCY] || 0))
      : 0,
    sysByCode,
  };
};

export const cashDropForCode = (cashDrop, code) => {
  if (code === BASE_CCY) return parseAmt(cashDrop);
  return 0;
};
