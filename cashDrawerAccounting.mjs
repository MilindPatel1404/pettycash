export const BASE_CCY = "USD";

export const cashNum = value => {
  const parsed = parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const cashDropForCode = (code, cashDrop = 0) =>
  code === BASE_CCY ? cashNum(cashDrop) : 0;

export const shiftCurrencyCodes = (shift, txns = [], fallbackCcyBalances = {}) => {
  const codes = new Set([BASE_CCY]);

  Object.keys(fallbackCcyBalances || {}).forEach(code => codes.add(code));
  Object.keys(shift?.openingCcyBals || {}).forEach(code => codes.add(code));
  txns.filter(t => t.fxCcy).forEach(t => codes.add(t.fxCcy));

  return [BASE_CCY, ...[...codes].filter(code => code !== BASE_CCY).sort()];
};

export const shiftOpeningByCode = (shift, code, fallbackCcyBalances = {}) => {
  if (shift?.openingCcyBals && shift.openingCcyBals[code] !== undefined) {
    return cashNum(shift.openingCcyBals[code]);
  }

  if (code === BASE_CCY) return cashNum(shift?.openingBal);

  return cashNum(fallbackCcyBalances?.[code]);
};

export const txnAmountForCode = (txn, code) =>
  code === BASE_CCY && !txn.fxCcy ? cashNum(txn.amount) :
  txn.fxCcy === code ? cashNum(txn.fxAmt) :
  0;

export const shiftExpectedBalances = (shift, txns = [], fallbackCcyBalances = {}) => {
  const balances = {};

  shiftCurrencyCodes(shift, txns, fallbackCcyBalances).forEach(code => {
    const movement = txns.reduce((sum, txn) => sum + txnAmountForCode(txn, code), 0);
    balances[code] = shiftOpeningByCode(shift, code, fallbackCcyBalances) + movement;
  });

  return balances;
};

export const summaryCashDrop = (shift, summary) =>
  summary?.cashDrop !== undefined ? cashNum(summary.cashDrop) : cashDropForCode(summary?.code, shift?.cashDrop);

export const buildCloseAccounting = ({ activeShift, selectedDrawer, txns = [], ccyCounts = {}, drop = 0 }) => {
  const fallbackCcyBalances = selectedDrawer?.ccyBalances || {};
  const drawerCcys = shiftCurrencyCodes(activeShift, txns, fallbackCcyBalances);
  const sysByCode = shiftExpectedBalances(activeShift, txns, fallbackCcyBalances);
  const closeDrop = cashNum(drop);
  const countedByCode = Object.fromEntries(drawerCcys.map(code => [
    code,
    ccyCounts[code] !== undefined ? cashNum(ccyCounts[code]) : cashNum(sysByCode[code]),
  ]));
  const endingByCode = Object.fromEntries(drawerCcys.map(code => [
    code,
    countedByCode[code] - cashDropForCode(code, closeDrop),
  ]));
  const closingBal = cashNum(countedByCode[BASE_CCY]);
  const variance = ccyCounts[BASE_CCY] !== undefined ? closingBal - cashNum(sysByCode[BASE_CCY]) : 0;

  const ccySummary = drawerCcys.map(code => {
    const rows = txns.filter(txn => code === BASE_CCY ? !txn.fxCcy : txn.fxCcy === code);
    const amounts = rows.map(txn => txnAmountForCode(txn, code));
    const incoming = amounts.filter(amount => amount > 0);
    const outgoing = amounts.filter(amount => amount < 0);

    return {
      code,
      inCount: incoming.length,
      outCount: outgoing.length,
      totIn: incoming.reduce((sum, amount) => sum + Math.abs(amount), 0),
      totOut: outgoing.reduce((sum, amount) => sum + Math.abs(amount), 0),
      startBal: shiftOpeningByCode(activeShift, code, fallbackCcyBalances),
      bal: cashNum(countedByCode[code]),
      cashDrop: cashDropForCode(code, closeDrop),
    };
  });

  return {
    drawerCcys,
    sysByCode,
    countedByCode,
    endingByCode,
    closingBal,
    closeDrop,
    variance,
    ccySummary,
  };
};
