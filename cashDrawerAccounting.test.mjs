import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

const multiCurrencyShift = {
  id: "SH-20250724-003",
  openingBal: 385.75,
  openingCcyBals: { USD: "385.75", AUD: "10.00", AED: "1.00" },
};

const shiftTxns = [
  { id: "TXN-001", shiftId: "SH-20250724-003", amount: 100 },
  { id: "TXN-002", shiftId: "SH-20250724-003", amount: 65 },
  { id: "TXN-003", shiftId: "SH-20250724-003", amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
  { id: "TXN-004", shiftId: "SH-20250724-003", amount: 4.50, fxCcy: "AUD", fxAmt: 7 },
  { id: "TXN-005", shiftId: "SH-20250724-003", amount: 0.27, fxCcy: "AED", fxAmt: 1 },
  { id: "TXN-006", shiftId: "SH-20250724-003", amount: -10 },
  { id: "TXN-010", shiftId: "SH-20250724-003", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
  { id: "TXN-011", shiftId: "SH-20250724-003", amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
  { id: "OTHER", shiftId: "SH-OTHER", amount: 999 },
];

test("close accounting carries opening balances and live native transactions forward", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: multiCurrencyShift,
    txns: shiftTxns,
    cashDrop: "40",
  });

  assert.deepEqual(accounting.expectedBalances, {
    USD: 540.75,
    AUD: 77,
    AED: 22,
  });
  assert.deepEqual(accounting.endingBalances, {
    USD: 500.75,
    AUD: 77,
    AED: 22,
  });
  assert.equal(accounting.cashDrop, 40);
  assert.equal(accounting.closingBal, 540.75);
  assert.equal(accounting.variance, 0);
});

test("counted balances override only the currencies supplied by the cashier", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: multiCurrencyShift,
    txns: shiftTxns,
    countsByCode: { USD: "530.00", AUD: "" },
    cashDrop: "20",
  });

  assert.deepEqual(accounting.countedBalances, {
    USD: 530,
    AUD: 77,
    AED: 22,
  });
  assert.deepEqual(accounting.endingBalances, {
    USD: 510,
    AUD: 77,
    AED: 22,
  });
  assert.equal(accounting.variance, -10.75);
});

test("foreign currency payouts reduce the native foreign balance", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: multiCurrencyShift,
    txns: [
      ...shiftTxns,
      { id: "AUD-OUT", shiftId: "SH-20250724-003", amount: -3.25, fxCcy: "AUD", fxAmt: -5 },
    ],
  });

  const audSummary = accounting.ccySummary.find((row) => row.code === "AUD");
  assert.equal(audSummary.totIn, 67);
  assert.equal(audSummary.totOut, 5);
  assert.equal(accounting.endingBalances.AUD, 72);
});
