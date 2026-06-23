const BASE_CCY = "USD";

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseMoney = value => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!normalized) return 0;
  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasCount = (counts, code) =>
  Object.prototype.hasOwnProperty.call(counts || {}, code) && String(counts[code]).trim() !== "";

const addCode = (codes, code) => {
  if (code && !codes.includes(code)) codes.push(code);
};

export function buildCloseDrawerAccounting({ drawer, shift, transactions = [], counts = {}, cashDrop = 0 }) {
  const codes = [BASE_CCY];
  const openingByCode = {};
  const openingSource = shift?.openingCcyBals || drawer?.ccyBalances || {};

  Object.entries(openingSource).forEach(([code, value]) => {
    addCode(codes, code);
    openingByCode[code] = roundMoney(parseMoney(value));
  });

  if (!Object.prototype.hasOwnProperty.call(openingByCode, BASE_CCY)) {
    openingByCode[BASE_CCY] = roundMoney(parseMoney(shift?.openingBal ?? drawer?.balance));
  }

  transactions.forEach(txn => addCode(codes, txn.fxCcy || BASE_CCY));
  Object.keys(counts || {}).forEach(code => addCode(codes, code));

  const effectiveDrop = Math.max(0, roundMoney(parseMoney(cashDrop)));
  const expectedByCode = {};
  const countedByCode = {};
  const endingByCode = {};
  const varianceByCode = {};

  const ccySummary = codes.map(code => {
    const isBase = code === BASE_CCY;
    const rows = transactions.filter(txn => isBase ? !txn.fxCcy : txn.fxCcy === code);
    const getAmount = txn => isBase ? parseMoney(txn.amount) : parseMoney(txn.fxAmt);
    const inRows = rows.filter(txn => getAmount(txn) > 0);
    const outRows = rows.filter(txn => getAmount(txn) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(getAmount(txn)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(getAmount(txn)), 0));
    const openingBal = roundMoney(openingByCode[code] || 0);
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const countedBal = roundMoney(hasCount(counts, code) ? parseMoney(counts[code]) : expectedBal);
    const codeDrop = code === BASE_CCY ? effectiveDrop : 0;
    const endingBal = roundMoney(countedBal - codeDrop);

    expectedByCode[code] = expectedBal;
    countedByCode[code] = countedBal;
    endingByCode[code] = endingBal;
    varianceByCode[code] = roundMoney(countedBal - expectedBal);

    return {
      code,
      openingBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      expectedBal,
      countedBal,
      bal: countedBal,
      cashDrop: codeDrop,
      endingBal,
      variance: varianceByCode[code],
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
    cashDrop: effectiveDrop,
    variance: varianceByCode[BASE_CCY] || 0,
  };
}
