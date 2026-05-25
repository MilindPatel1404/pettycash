export const BASE_CCY = "USD";

const isFiniteNumber = value => Number.isFinite(value);

export function parseMoney(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return isFiniteNumber(parsed) ? parsed : fallback;
}

function normalizeBalances(balances) {
  return Object.fromEntries(
    Object.entries(balances || {}).map(([code, value]) => [code, parseMoney(value)])
  );
}

function currencyCodes(openingByCode, txns) {
  return [...new Set([
    BASE_CCY,
    ...Object.keys(openingByCode || {}),
    ...(txns || []).filter(t => t.fxCcy).map(t => t.fxCcy),
  ])];
}

function txnAmountForCode(txn, code) {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : parseMoney(txn.amount);
  return txn.fxCcy === code ? parseMoney(txn.fxAmt) : 0;
}

export function buildCloseDrawerAccounting({ shift, drawer, txns = [], counts = {}, drop = 0 }) {
  const openingByCode = normalizeBalances(
    shift?.openingCcyBals || drawer?.ccyBalances || { [BASE_CCY]: shift?.openingBal || drawer?.balance || 0 }
  );
  const codes = currencyCodes(openingByCode, txns);
  const cashDrop = Math.max(0, parseMoney(drop));
  const expectedByCode = {};
  const countedByCode = {};
  const endingByCode = {};
  const varianceByCode = {};

  const ccySummary = codes.map(code => {
    const rows = txns.filter(t => txnAmountForCode(t, code) !== 0);
    const openingBal = parseMoney(openingByCode[code]);
    const net = rows.reduce((sum, txn) => sum + txnAmountForCode(txn, code), 0);
    const expectedBal = openingBal + net;
    const hasCount = counts[code] !== undefined && counts[code] !== "";
    const countedBal = hasCount ? parseMoney(counts[code], expectedBal) : expectedBal;
    const codeDrop = code === BASE_CCY ? cashDrop : 0;
    const endingBal = countedBal - codeDrop;

    expectedByCode[code] = expectedBal;
    countedByCode[code] = countedBal;
    endingByCode[code] = endingBal;
    varianceByCode[code] = countedBal - expectedBal;

    const inRows = rows.filter(t => txnAmountForCode(t, code) > 0);
    const outRows = rows.filter(t => txnAmountForCode(t, code) < 0);

    return {
      code,
      openingBal,
      expectedBal,
      countedBal,
      endingBal,
      cashDrop: codeDrop,
      variance: varianceByCode[code],
      inCount: inRows.length,
      outCount: outRows.length,
      totIn: inRows.reduce((sum, txn) => sum + Math.abs(txnAmountForCode(txn, code)), 0),
      totOut: outRows.reduce((sum, txn) => sum + Math.abs(txnAmountForCode(txn, code)), 0),
      bal: countedBal,
    };
  });

  return {
    ccySummary,
    expectedByCode,
    countedByCode,
    endingByCode,
    varianceByCode,
    closingBal: countedByCode[BASE_CCY] || 0,
    endingBal: endingByCode[BASE_CCY] || 0,
    variance: varianceByCode[BASE_CCY] || 0,
    cashDrop,
    cashIn: ccySummary.find(row => row.code === BASE_CCY)?.totIn || 0,
    cashOut: ccySummary.find(row => row.code === BASE_CCY)?.totOut || 0,
  };
}
