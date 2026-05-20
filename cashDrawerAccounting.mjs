const BASE_CCY = "USD";

const roundMoney = value => Math.round((Number(value) || 0) * 100) / 100;

const hasCount = (counts, code) =>
  Object.prototype.hasOwnProperty.call(counts || {}, code) &&
  String(counts[code]).trim() !== "";

const parseMoney = value => {
  const parsed = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const openingBalancesFor = (drawer, shift) => {
  const source = shift?.openingCcyBals || drawer?.ccyBalances || { [BASE_CCY]: shift?.openingBal || drawer?.balance || 0 };
  const balances = {};

  Object.entries(source).forEach(([code, value]) => {
    balances[code] = roundMoney(parseMoney(value));
  });

  if (!Object.prototype.hasOwnProperty.call(balances, BASE_CCY)) {
    balances[BASE_CCY] = roundMoney(parseMoney(shift?.openingBal || drawer?.balance || 0));
  }

  return balances;
};

export function buildCloseDrawerAccounting({ drawer, shift, txns = [], counts = {}, cashDrop = 0 }) {
  const openingBalances = openingBalancesFor(drawer, shift);
  const shiftTxns = txns.filter(t => t.shiftId === shift?.id);
  const currencies = new Set([BASE_CCY, ...Object.keys(openingBalances)]);

  shiftTxns.forEach(t => {
    currencies.add(t.fxCcy || BASE_CCY);
  });
  Object.keys(counts || {}).forEach(code => currencies.add(code));

  const drop = Math.max(0, roundMoney(parseMoney(cashDrop)));
  const expectedByCode = {};
  const countedByCode = {};
  const endingCcyBalances = {};

  const ccySummary = [...currencies].map(code => {
    const isBase = code === BASE_CCY;
    const rows = isBase
      ? shiftTxns.filter(t => !t.fxCcy)
      : shiftTxns.filter(t => t.fxCcy === code);
    const getAmt = t => isBase ? parseMoney(t.amount) : parseMoney(t.fxAmt);
    const inRows = rows.filter(t => getAmt(t) > 0);
    const outRows = rows.filter(t => getAmt(t) < 0);
    const totIn = roundMoney(inRows.reduce((a, t) => a + Math.abs(getAmt(t)), 0));
    const totOut = roundMoney(outRows.reduce((a, t) => a + Math.abs(getAmt(t)), 0));
    const openingBal = roundMoney(openingBalances[code] || 0);
    const expectedBal = roundMoney(openingBal + totIn - totOut);
    const countedBal = hasCount(counts, code) ? roundMoney(parseMoney(counts[code])) : expectedBal;
    const cashDropForCode = isBase ? drop : 0;
    const endingBal = roundMoney(countedBal - cashDropForCode);

    expectedByCode[code] = expectedBal;
    countedByCode[code] = countedBal;
    endingCcyBalances[code] = endingBal;

    return {
      code,
      openingBal,
      inCount: inRows.length,
      outCount: outRows.length,
      totIn,
      totOut,
      expectedBal,
      bal: countedBal,
      cashDrop: cashDropForCode,
      endingBal,
    };
  });

  const closingBal = countedByCode[BASE_CCY] || 0;
  const variance = roundMoney(closingBal - (expectedByCode[BASE_CCY] || 0));

  return {
    currencies: [...currencies],
    expectedByCode,
    countedByCode,
    endingCcyBalances,
    ccySummary,
    closingBal,
    variance,
    cashDrop: drop,
  };
}
