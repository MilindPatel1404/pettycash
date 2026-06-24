export const BASE_CCY = "USD";

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const parseMoney = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const moneyOrZero = (value) => parseMoney(value) ?? 0;

const normalizeBalances = (balances) => {
  const normalized = {};
  Object.entries(balances || {}).forEach(([code, value]) => {
    const amount = parseMoney(value);
    if (amount !== null) normalized[code] = amount;
  });
  return normalized;
};

export const getOpeningBalances = ({ drawer, shift } = {}) => {
  const shiftBalances = normalizeBalances(shift?.openingCcyBals);
  if (Object.keys(shiftBalances).length > 0) {
    if (shiftBalances[BASE_CCY] === undefined) {
      shiftBalances[BASE_CCY] = moneyOrZero(shift?.openingBal ?? drawer?.balance);
    }
    return shiftBalances;
  }

  const drawerBalances = normalizeBalances(drawer?.ccyBalances);
  if (Object.keys(drawerBalances).length > 0) {
    if (drawerBalances[BASE_CCY] === undefined) {
      drawerBalances[BASE_CCY] = moneyOrZero(drawer?.balance ?? shift?.openingBal);
    }
    return drawerBalances;
  }

  return { [BASE_CCY]: moneyOrZero(shift?.openingBal ?? drawer?.balance) };
};

const currencyCodesFor = ({ drawer, shift, txns = [] }) => {
  const opening = getOpeningBalances({ drawer, shift });
  const codes = new Set([BASE_CCY, ...Object.keys(opening)]);
  txns.forEach((txn) => {
    if (txn?.fxCcy) codes.add(txn.fxCcy);
  });
  return [...codes];
};

const signedTxnAmount = (txn, code) => {
  if (code === BASE_CCY) return txn?.fxCcy ? 0 : moneyOrZero(txn?.amount);
  return txn?.fxCcy === code ? moneyOrZero(txn?.fxAmt) : 0;
};

const transactionStats = (txns, code) => {
  const rows = (txns || []).filter((txn) => code === BASE_CCY ? !txn?.fxCcy : txn?.fxCcy === code);
  const amounts = rows.map((txn) => signedTxnAmount(txn, code));
  const inAmounts = amounts.filter((amount) => amount > 0);
  const outAmounts = amounts.filter((amount) => amount < 0);
  return {
    inCount: inAmounts.length,
    outCount: outAmounts.length,
    totIn: round2(inAmounts.reduce((sum, amount) => sum + amount, 0)),
    totOut: round2(outAmounts.reduce((sum, amount) => sum + Math.abs(amount), 0)),
    net: round2(amounts.reduce((sum, amount) => sum + amount, 0)),
  };
};

export const buildCloseDrawerAccounting = ({ drawer, shift, txns = [], ccyCounts = {}, drop = "" } = {}) => {
  const shiftTxns = shift?.id ? (txns || []).filter((txn) => txn?.shiftId === shift.id) : [];
  const openingBalances = getOpeningBalances({ drawer, shift });
  const requestedDrop = Math.max(0, moneyOrZero(drop));

  const ccySummary = currencyCodesFor({ drawer, shift, txns: shiftTxns }).map((code) => {
    const opening = round2(openingBalances[code] ?? 0);
    const stats = transactionStats(shiftTxns, code);
    const expected = round2(opening + stats.net);
    const countedInput = parseMoney(ccyCounts?.[code]);
    const counted = round2(countedInput === null ? expected : countedInput);
    const cashDrop = code === BASE_CCY ? round2(Math.min(requestedDrop, Math.max(0, counted))) : 0;
    const ending = round2(counted - cashDrop);

    return {
      code,
      opening,
      expected,
      counted,
      bal: counted,
      variance: round2(counted - expected),
      cashDrop,
      ending,
      inCount: stats.inCount,
      outCount: stats.outCount,
      totIn: stats.totIn,
      totOut: stats.totOut,
    };
  });

  const byCode = Object.fromEntries(ccySummary.map((summary) => [summary.code, summary]));
  const usd = byCode[BASE_CCY] || ccySummary[0] || {
    bal: 0,
    variance: 0,
    cashDrop: 0,
    ending: 0,
    totIn: 0,
    totOut: 0,
  };

  return {
    ccySummary,
    byCode,
    closingBal: round2(usd.bal),
    variance: round2(usd.variance),
    cashDrop: round2(usd.cashDrop),
    endingBalances: Object.fromEntries(ccySummary.map((summary) => [summary.code, round2(summary.ending)])),
    cashIn: round2(usd.totIn),
    cashOut: round2(usd.totOut),
  };
};
