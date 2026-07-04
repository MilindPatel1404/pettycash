const BASE_CCY = "USD";

const roundMoney = value => Math.round((Number(value) || 0) * 100) / 100;

const parseMoney = value => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasEnteredCount = (counts, code) =>
  Object.prototype.hasOwnProperty.call(counts || {}, code) &&
  String(counts[code] ?? "").trim() !== "";

const normalizeBalances = balances => Object.fromEntries(
  Object.entries(balances || {})
    .map(([code, amount]) => [code, roundMoney(parseMoney(amount))])
    .filter(([code]) => Boolean(code))
);

const getOpeningBalances = (drawer, shift) => {
  const explicit = normalizeBalances(shift?.openingCcyBals);
  if (Object.keys(explicit).length > 0) {
    if (explicit[BASE_CCY] === undefined) {
      explicit[BASE_CCY] = roundMoney(parseMoney(shift?.openingBal ?? drawer?.balance));
    }
    return explicit;
  }

  const legacy = {};
  if (shift?.openingBal !== undefined && shift?.openingBal !== null) {
    legacy[BASE_CCY] = roundMoney(parseMoney(shift.openingBal));
  } else if (drawer?.balance !== undefined && drawer?.balance !== null) {
    legacy[BASE_CCY] = roundMoney(parseMoney(drawer.balance));
  }

  for (const [code, amount] of Object.entries(drawer?.ccyBalances || {})) {
    if (code !== BASE_CCY) legacy[code] = roundMoney(parseMoney(amount));
  }
  return Object.keys(legacy).length ? legacy : { [BASE_CCY]: 0 };
};

export function buildCloseDrawerAccounting({
  drawer,
  shift,
  txns = [],
  counts = {},
  cashDrop = 0,
} = {}) {
  const openingByCode = getOpeningBalances(drawer, shift);
  const shiftId = shift?.id || drawer?.currentShift;
  const shiftTxns = shiftId ? (txns || []).filter(t => t.shiftId === shiftId) : [];
  const codeSet = new Set([BASE_CCY, ...Object.keys(openingByCode)]);

  for (const txn of shiftTxns) {
    if (txn.fxCcy) codeSet.add(txn.fxCcy);
  }

  const codes = [...codeSet];
  const txnsByCode = {};
  const expectedByCode = {};
  const countedByCode = {};
  const varianceByCode = {};
  const endingByCode = {};
  const ccySummary = [];
  const normalizedDrop = Math.max(0, roundMoney(parseMoney(cashDrop)));

  for (const code of codes) {
    const isBase = code === BASE_CCY;
    const rows = isBase
      ? shiftTxns.filter(t => !t.fxCcy)
      : shiftTxns.filter(t => t.fxCcy === code);
    const getAmt = txn => roundMoney(isBase ? parseMoney(txn.amount) : parseMoney(txn.fxAmt));
    const inRows = rows.filter(t => getAmt(t) > 0);
    const outRows = rows.filter(t => getAmt(t) < 0);
    const totIn = roundMoney(inRows.reduce((sum, txn) => sum + Math.abs(getAmt(txn)), 0));
    const totOut = roundMoney(outRows.reduce((sum, txn) => sum + Math.abs(getAmt(txn)), 0));
    const txnNet = roundMoney(totIn - totOut);
    const openingBal = roundMoney(openingByCode[code] || 0);
    const expectedBal = roundMoney(openingBal + txnNet);
    const countedBal = hasEnteredCount(counts, code)
      ? roundMoney(parseMoney(counts[code]))
      : expectedBal;
    const appliedDrop = isBase ? normalizedDrop : 0;
    const endingBal = roundMoney(countedBal - appliedDrop);

    txnsByCode[code] = txnNet;
    expectedByCode[code] = expectedBal;
    countedByCode[code] = countedBal;
    varianceByCode[code] = roundMoney(countedBal - expectedBal);
    endingByCode[code] = endingBal;
    ccySummary.push({
      code,
      openingBal,
      expectedBal,
      countedBal,
      variance: varianceByCode[code],
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      bal: countedBal,
      cashDrop: appliedDrop,
      endingBal,
    });
  }

  return {
    codes,
    openingByCode,
    txnsByCode,
    expectedByCode,
    countedByCode,
    varianceByCode,
    endingByCode,
    ccySummary,
    cashDrop: normalizedDrop,
    closingBal: countedByCode[BASE_CCY] || 0,
    endingBal: endingByCode[BASE_CCY] || 0,
    variance: varianceByCode[BASE_CCY] || 0,
    usdCashIn: ccySummary.find(row => row.code === BASE_CCY)?.totIn || 0,
    usdCashOut: ccySummary.find(row => row.code === BASE_CCY)?.totOut || 0,
  };
}
