const BASE_CCY = "USD";

const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const parseMoneyAmount = value => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[A-Z]{3}/gi, "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOpeningBalances = (shift = {}, drawer = {}) => {
  const source = shift.openingCcyBals && Object.keys(shift.openingCcyBals).length
    ? shift.openingCcyBals
    : drawer.ccyBalances;
  const balances = {};

  if (source && Object.keys(source).length) {
    Object.entries(source).forEach(([code, value]) => {
      balances[code] = round2(parseMoneyAmount(value));
    });
  }

  if (balances[BASE_CCY] === undefined) {
    balances[BASE_CCY] = round2(parseMoneyAmount(shift.openingBal ?? drawer.balance ?? 0));
  }

  return balances;
};

const txnAmountForCode = (txn, code) => {
  if (code === BASE_CCY) return txn.fxCcy ? 0 : parseMoneyAmount(txn.amount);
  return txn.fxCcy === code ? parseMoneyAmount(txn.fxAmt) : 0;
};

const txnsForCode = (txns, code) => txns.filter(txn => txnAmountForCode(txn, code) !== 0);

export function buildCloseDrawerAccounting({ drawer = {}, shift = {}, txns = [], counts = {}, cashDrop = 0 } = {}) {
  const openingByCode = getOpeningBalances(shift, drawer);
  const txnCodes = txns.map(txn => txn.fxCcy || BASE_CCY);
  const countCodes = Object.keys(counts || {});
  const codes = [...new Set([BASE_CCY, ...Object.keys(openingByCode), ...txnCodes, ...countCodes])];
  const parsedDrop = parseMoneyAmount(cashDrop);
  const usdCashDrop = parsedDrop > 0 ? round2(parsedDrop) : 0;

  const ccySummary = codes.map(code => {
    const rows = txnsForCode(txns, code);
    const amounts = rows.map(txn => txnAmountForCode(txn, code));
    const totIn = round2(amounts.filter(amount => amount > 0).reduce((sum, amount) => sum + amount, 0));
    const totOut = round2(Math.abs(amounts.filter(amount => amount < 0).reduce((sum, amount) => sum + amount, 0)));
    const openingBal = round2(openingByCode[code] ?? 0);
    const expectedBal = round2(openingBal + totIn - totOut);
    const hasCount = counts && counts[code] !== undefined && String(counts[code]).trim() !== "";
    const countedBal = hasCount ? round2(parseMoneyAmount(counts[code])) : expectedBal;
    const rowCashDrop = code === BASE_CCY ? usdCashDrop : 0;
    const endingBal = round2(countedBal - rowCashDrop);

    return {
      code,
      inCount: amounts.filter(amount => amount > 0).length,
      outCount: amounts.filter(amount => amount < 0).length,
      totIn,
      totOut,
      openingBal,
      expectedBal,
      countedBal,
      variance: round2(countedBal - expectedBal),
      cashDrop: rowCashDrop,
      bal: countedBal,
      endingBal,
    };
  });

  const byCode = Object.fromEntries(ccySummary.map(row => [row.code, row]));
  const endingCcyBalances = Object.fromEntries(ccySummary.map(row => [row.code, row.endingBal]));

  return {
    ccySummary,
    byCode,
    endingCcyBalances,
    closingBal: byCode[BASE_CCY]?.countedBal ?? 0,
    endingBalance: endingCcyBalances[BASE_CCY] ?? 0,
    variance: byCode[BASE_CCY]?.variance ?? 0,
    cashDrop: usdCashDrop,
    cashIn: byCode[BASE_CCY]?.totIn ?? 0,
    cashOut: byCode[BASE_CCY]?.totOut ?? 0,
  };
}
