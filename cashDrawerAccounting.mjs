const BASE_CCY = "USD";

export function parseCashAmount(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined || value === "") return fallback;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/^[A-Z]{3}\s*/i, "")
    .trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeBalances = balances => Object.fromEntries(
  Object.entries(balances || {}).map(([code, amount]) => [code, parseCashAmount(amount)])
);

function openingBalancesFor(drawer, shift) {
  const shiftBalances = normalizeBalances(shift?.openingCcyBals);
  const drawerBalances = normalizeBalances(drawer?.ccyBalances);
  const opening = Object.keys(shiftBalances).length ? shiftBalances : drawerBalances;

  if (opening[BASE_CCY] === undefined) {
    opening[BASE_CCY] = parseCashAmount(shift?.openingBal ?? drawer?.balance);
  }

  return opening;
}

function nativeTxnAmount(txn, code) {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : parseCashAmount(txn.amount);
  return txn.fxCcy === code ? parseCashAmount(txn.fxAmt) : 0;
}

export function buildCloseDrawerAccounting({ drawer, shift, txns = [], counts = {}, cashDrop = 0 } = {}) {
  if (!drawer || !shift || drawer.currentShift !== shift.id || shift.status !== "Open") return null;

  const shiftTxns = txns.filter(t => t.shiftId === shift.id);
  const openingBalances = openingBalancesFor(drawer, shift);
  const codes = [...new Set([
    BASE_CCY,
    ...Object.keys(openingBalances),
    ...shiftTxns.filter(t => t.fxCcy).map(t => t.fxCcy),
  ])];
  const parsedDrop = Math.max(0, parseCashAmount(cashDrop));
  const summary = codes.map(code => {
    const rows = shiftTxns.filter(t => code === BASE_CCY ? !t.fxCcy : t.fxCcy === code);
    const inRows = rows.filter(t => nativeTxnAmount(t, code) > 0);
    const outRows = rows.filter(t => nativeTxnAmount(t, code) < 0);
    const totIn = round2(inRows.reduce((sum, txn) => sum + Math.abs(nativeTxnAmount(txn, code)), 0));
    const totOut = round2(outRows.reduce((sum, txn) => sum + Math.abs(nativeTxnAmount(txn, code)), 0));
    const expectedBal = round2(parseCashAmount(openingBalances[code]) + rows.reduce((sum, txn) => sum + nativeTxnAmount(txn, code), 0));
    const rawCount = counts[code];
    const hasCount = rawCount !== undefined && String(rawCount).trim() !== "";
    const countedBal = round2(hasCount ? parseCashAmount(rawCount) : expectedBal);
    const codeDrop = code === BASE_CCY ? parsedDrop : 0;
    const endingBal = round2(countedBal - codeDrop);

    return {
      code,
      openingBal: round2(parseCashAmount(openingBalances[code])),
      expectedBal,
      countedBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal: countedBal,
      cashDrop: codeDrop,
      endingBal,
      variance: round2(countedBal - expectedBal),
    };
  });

  const byCode = Object.fromEntries(summary.map(row => [row.code, row]));
  const endingBalances = Object.fromEntries(summary.map(row => [row.code, row.endingBal]));
  const usd = byCode[BASE_CCY] || {
    totIn: 0,
    totOut: 0,
    variance: 0,
    endingBal: 0,
  };

  return {
    shiftId: shift.id,
    shiftTxns,
    ccySummary: summary,
    byCode,
    ccyBalances: endingBalances,
    cashDrop: parsedDrop,
    cashIn: usd.totIn,
    cashOut: usd.totOut,
    closingBal: usd.endingBal,
    drawerBalance: usd.endingBal,
    variance: usd.variance,
  };
}
