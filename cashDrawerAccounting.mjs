const BASE_CCY = "USD";

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseMoney = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const collectOpeningBalances = (shift, drawer) => {
  const balances = {};
  const shiftOpening = shift?.openingCcyBals;
  const source = shiftOpening && Object.keys(shiftOpening).length > 0
    ? shiftOpening
    : drawer?.ccyBalances;

  if (source) {
    Object.entries(source).forEach(([code, value]) => {
      const parsed = parseMoney(value);
      if (parsed !== null) balances[code] = roundMoney(parsed);
    });
  }

  if (balances[BASE_CCY] === undefined) {
    const openingBal = parseMoney(shift?.openingBal ?? drawer?.balance);
    balances[BASE_CCY] = roundMoney(openingBal ?? 0);
  }

  return balances;
};

const txnNativeCode = (txn) => txn.fxCcy || BASE_CCY;
const txnNativeAmount = (txn, code) => {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : Number(txn.amount || 0);
  return txn.fxCcy === code ? Number(txn.fxAmt || 0) : 0;
};

export function buildCloseDrawerAccounting({ shift, drawer, txns = [], ccyCounts = {}, cashDrop = 0 } = {}) {
  const shiftId = shift?.id ?? drawer?.currentShift;
  const shiftTxns = shiftId ? txns.filter((txn) => txn.shiftId === shiftId) : [];
  const openingBalances = collectOpeningBalances(shift, drawer);
  const normalizedCashDrop = Math.max(0, parseMoney(cashDrop) ?? 0);

  const codes = [];
  const addCode = (code) => {
    if (code && !codes.includes(code)) codes.push(code);
  };
  addCode(BASE_CCY);
  Object.keys(openingBalances).forEach(addCode);
  shiftTxns.map(txnNativeCode).forEach(addCode);
  Object.keys(ccyCounts || {}).forEach(addCode);

  const ccySummary = codes.map((code) => {
    const rows = shiftTxns.filter((txn) => txnNativeCode(txn) === code);
    const getAmt = (txn) => txnNativeAmount(txn, code);
    const inRows = rows.filter((txn) => getAmt(txn) > 0);
    const outRows = rows.filter((txn) => getAmt(txn) < 0);
    const totIn = roundMoney(inRows.reduce((total, txn) => total + Math.abs(getAmt(txn)), 0));
    const totOut = roundMoney(outRows.reduce((total, txn) => total + Math.abs(getAmt(txn)), 0));
    const openingBal = roundMoney(openingBalances[code] ?? 0);
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const countedInput = parseMoney(ccyCounts?.[code]);
    const countedBal = roundMoney(countedInput ?? expectedBal);
    const codeCashDrop = code === BASE_CCY ? roundMoney(normalizedCashDrop) : 0;
    const endingBal = roundMoney(countedBal - codeCashDrop);

    return {
      code,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      startingBal: openingBal,
      expectedBal,
      bal: countedBal,
      variance: roundMoney(countedBal - expectedBal),
      cashDrop: codeCashDrop,
      endingBal,
    };
  });

  const byCode = Object.fromEntries(ccySummary.map((summary) => [summary.code, summary]));
  const usd = byCode[BASE_CCY] || {
    bal: 0,
    endingBal: 0,
    variance: 0,
  };

  return {
    ccySummary,
    byCode,
    closingBal: usd.bal,
    endingCcyBalances: Object.fromEntries(ccySummary.map((summary) => [summary.code, summary.endingBal])),
    cashDrop: roundMoney(normalizedCashDrop),
    variance: usd.variance,
  };
}
