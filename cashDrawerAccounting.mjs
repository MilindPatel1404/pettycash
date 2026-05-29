export const BASE_CCY = "USD";

const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function parseMoney(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return fallback;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addTo(map, code, amount) {
  map[code] = round2((map[code] || 0) + amount);
}

export function getOpeningBalances(drawer, shift) {
  const balances = {};
  const openingCcyBals = shift?.openingCcyBals || {};

  Object.entries(openingCcyBals).forEach(([code, amount]) => {
    balances[code] = round2(parseMoney(amount));
  });

  if (!Object.keys(balances).length) {
    if (shift?.openingBal !== undefined && shift?.openingBal !== null) {
      balances[BASE_CCY] = round2(parseMoney(shift.openingBal));
    } else if (drawer?.ccyBalances) {
      Object.entries(drawer.ccyBalances).forEach(([code, amount]) => {
        balances[code] = round2(parseMoney(amount));
      });
    } else {
      balances[BASE_CCY] = round2(parseMoney(drawer?.balance));
    }

    // Older seeded shifts did not store openingCcyBals. Preserve any native
    // non-USD drawer balances so a close does not wipe foreign cash balances.
    Object.entries(drawer?.ccyBalances || {}).forEach(([code, amount]) => {
      if (code !== BASE_CCY && balances[code] === undefined) {
        balances[code] = round2(parseMoney(amount));
      }
    });
  }

  if (balances[BASE_CCY] === undefined) balances[BASE_CCY] = 0;
  return balances;
}

export function summarizeShiftTransactions(txns, shiftId) {
  const byCode = {};

  (txns || []).filter(t => t.shiftId === shiftId).forEach(txn => {
    const code = txn.fxCcy || BASE_CCY;
    const amount = txn.fxCcy ? parseMoney(txn.fxAmt) : parseMoney(txn.amount);
    if (!byCode[code]) {
      byCode[code] = { code, inCount: 0, outCount: 0, totIn: 0, totOut: 0, delta: 0 };
    }
    if (amount > 0) {
      byCode[code].inCount += 1;
      byCode[code].totIn = round2(byCode[code].totIn + amount);
    } else if (amount < 0) {
      byCode[code].outCount += 1;
      byCode[code].totOut = round2(byCode[code].totOut + Math.abs(amount));
    }
    byCode[code].delta = round2(byCode[code].delta + amount);
  });

  return byCode;
}

export function buildCloseDrawerAccounting({ drawer, shift, txns, counts = {}, cashDrop = 0 }) {
  if (!drawer || !shift) return null;

  const openingBalances = getOpeningBalances(drawer, shift);
  const txnByCode = summarizeShiftTransactions(txns, shift.id);
  const codes = [
    BASE_CCY,
    ...Object.keys(openingBalances).filter(code => code !== BASE_CCY),
    ...Object.keys(txnByCode).filter(code => code !== BASE_CCY && openingBalances[code] === undefined),
  ];
  const usdCashDrop = Math.max(0, parseMoney(cashDrop));
  const byCode = {};

  const ccySummary = codes.map(code => {
    const txn = txnByCode[code] || { code, inCount: 0, outCount: 0, totIn: 0, totOut: 0, delta: 0 };
    const openingBal = round2(openingBalances[code] || 0);
    const expectedBal = round2(openingBal + txn.delta);
    const rawCount = counts?.[code];
    const hasCount = rawCount !== undefined && String(rawCount).trim() !== "";
    const countedBal = hasCount ? round2(parseMoney(rawCount)) : expectedBal;
    const codeCashDrop = code === BASE_CCY ? Math.min(usdCashDrop, Math.max(0, countedBal)) : 0;
    const endingBal = round2(countedBal - codeCashDrop);
    const variance = round2(countedBal - expectedBal);
    const summary = {
      code,
      openingBal,
      inCount: txn.inCount,
      outCount: txn.outCount,
      totIn: txn.totIn,
      totOut: txn.totOut,
      expectedBal,
      countedBal,
      bal: countedBal,
      cashDrop: codeCashDrop,
      endingBal,
      variance,
      hasCount,
    };
    byCode[code] = summary;
    return summary;
  });

  const endingCcyBalances = Object.fromEntries(ccySummary.map(row => [row.code, row.endingBal]));
  const usd = byCode[BASE_CCY];

  return {
    ccySummary,
    byCode,
    closingBal: usd.countedBal,
    endingBal: usd.endingBal,
    endingCcyBalances,
    cashDrop: usd.cashDrop,
    variance: usd.variance,
    cashIn: usd.totIn,
    cashOut: usd.totOut,
  };
}
