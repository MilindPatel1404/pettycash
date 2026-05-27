import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting preserves opening native balances and applies USD cash drop only", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: {
      balance: 385.75,
      ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
    },
    shift: { id: "SH-1", openingBal: 385.75 },
    txns: [
      { shiftId: "SH-1", amount: 100, ccy: "USD" },
      { shiftId: "SH-1", amount: -10, ccy: "USD" },
      { shiftId: "SH-1", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
      { shiftId: "SH-1", amount: -4.55, ccy: "USD", fxCcy: "AUD", fxAmt: -7 },
      { shiftId: "SH-1", amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20 },
    ],
    countedBalances: {},
    cashDrop: 50,
  });

  assert.deepEqual(accounting.expectedBalances, {
    USD: 475.75,
    AUD: 13,
    AED: 21,
  });
  assert.deepEqual(accounting.ccyBalances, {
    USD: 425.75,
    AUD: 13,
    AED: 21,
  });
  assert.equal(accounting.closingBal, 475.75);
  assert.equal(accounting.endingBalance, 425.75);
  assert.equal(accounting.ccySummary.find(row => row.code === "AUD").cashDrop, 0);
});

test("entered counts override expected balances and record variance", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { ccyBalances: { USD: 385.75, AUD: 10 } },
    shift: { id: "SH-2" },
    txns: [
      { shiftId: "SH-2", amount: 100, ccy: "USD" },
      { shiftId: "SH-2", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    ],
    countedBalances: { USD: "500", AUD: "25" },
    cashDrop: "40",
  });

  assert.equal(accounting.expectedBalances.USD, 485.75);
  assert.equal(accounting.countedBalances.USD, 500);
  assert.equal(accounting.variance, 14.25);
  assert.equal(accounting.ccyBalances.USD, 460);
  assert.equal(accounting.ccyBalances.AUD, 25);
});

test("shift opening balances are used instead of current drawer balances", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { ccyBalances: { USD: 999, AUD: 999 } },
    shift: { id: "SH-3", openingCcyBals: { USD: "100.50", AUD: "2.00" } },
    txns: [
      { shiftId: "SH-3", amount: 10, ccy: "USD" },
      { shiftId: "SH-3", amount: 1.3, ccy: "USD", fxCcy: "AUD", fxAmt: 2 },
    ],
  });

  assert.deepEqual(accounting.expectedBalances, {
    USD: 110.5,
    AUD: 4,
  });
});
