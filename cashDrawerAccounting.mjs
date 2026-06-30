const BASE_CCY = "USD";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const parseMoney = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasCount = (counts, code) =>
  Object.prototype.hasOwnProperty.call(counts || {}, code) && String(counts[code]).trim() !== "";

const getOpeningBalances = (shift = {}, drawer = {}) => {
  const source = shift.openingCcyBals && Object.keys(shift.openingCcyBals).length
    ? shift.openingCcyBals
    : drawer.ccyBalances && Object.keys(drawer.ccyBalances).length
      ? drawer.ccyBalances
      : { [BASE_CCY]: shift.openingBal ?? drawer.balance ?? 0 };

  const balances = {};
  Object.entries(source).forEach(([code, amount]) => {
    balances[code] = roundMoney(parseMoney(amount));
  });
  if (!Object.prototype.hasOwnProperty.call(balances, BASE_CCY)) {
    balances[BASE_CCY] = roundMoney(parseMoney(shift.openingBal ?? drawer.balance ?? 0));
  }
  return balances;
};

export function buildCloseDrawerAccounting({
  shift,
  drawer,
  txns = [],
  counts = {},
  cashDrop = 0,
} = {}) {
  const openingByCode = getOpeningBalances(shift, drawer);
  const movementByCode = {};
  const statsByCode = {};

  const ensureStats = (code) => {
    if (!statsByCode[code]) {
      statsByCode[code] = { inCount: 0, outCount: 0, totIn: 0, totOut: 0 };
    }
    if (!Object.prototype.hasOwnProperty.call(movementByCode, code)) movementByCode[code] = 0;
    return statsByCode[code];
  };

  txns.forEach((txn) => {
    const code = txn.fxCcy || BASE_CCY;
    const amount = txn.fxCcy ? parseMoney(txn.fxAmt) : parseMoney(txn.amount);
    const stats = ensureStats(code);

    movementByCode[code] = roundMoney(movementByCode[code] + amount);
    if (amount > 0) {
      stats.inCount += 1;
      stats.totIn = roundMoney(stats.totIn + Math.abs(amount));
    } else if (amount < 0) {
      stats.outCount += 1;
      stats.totOut = roundMoney(stats.totOut + Math.abs(amount));
    }
  });

  const codes = [
    BASE_CCY,
    ...new Set([
      ...Object.keys(openingByCode),
      ...Object.keys(movementByCode),
      ...Object.keys(counts || {}),
    ].filter((code) => code !== BASE_CCY)),
  ];

  const expectedByCode = {};
  const countedByCode = {};
  const varianceByCode = {};
  const endingCcyBalances = {};
  const sanitizedCashDrop = Math.max(0, roundMoney(parseMoney(cashDrop)));

  const ccySummary = codes.map((code) => {
    const stats = ensureStats(code);
    const opening = roundMoney(openingByCode[code] || 0);
    const expected = roundMoney(opening + (movementByCode[code] || 0));
    const counted = hasCount(counts, code) ? roundMoney(parseMoney(counts[code])) : expected;
    const codeCashDrop = code === BASE_CCY ? sanitizedCashDrop : 0;
    const endingBal = roundMoney(counted - codeCashDrop);

    expectedByCode[code] = expected;
    countedByCode[code] = counted;
    varianceByCode[code] = roundMoney(counted - expected);
    endingCcyBalances[code] = endingBal;

    return {
      code,
      inCount: stats.inCount,
      outCount: stats.outCount,
      totIn: stats.totIn,
      totOut: stats.totOut,
      opening,
      expected,
      counted,
      variance: varianceByCode[code],
      bal: counted,
      cashDrop: codeCashDrop,
      endingBal,
    };
  });

  return {
    codes,
    openingByCode,
    expectedByCode,
    countedByCode,
    varianceByCode,
    ccySummary,
    cashDrop: sanitizedCashDrop,
    closingBal: countedByCode[BASE_CCY] || 0,
    endingCcyBalances,
    endingBalance: endingCcyBalances[BASE_CCY] || 0,
  };
}

