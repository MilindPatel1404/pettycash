import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting, isDrawerLifecycleLocked } from "./cashDrawerAccounting.mjs";

test("close accounting includes live USD transactions instead of stale shift rollups", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-1", openingCcyBals: { USD: 500 }, cashIn: 0, cashOut: 0 },
    drawer: { id: 1, ccyBalances: { USD: 500 } },
    transactions: [
      { shiftId: "SH-1", amount: 80 },
      { shiftId: "SH-1", amount: -10 },
    ],
  });

  assert.equal(accounting.expectedByCode.USD, 570);
  assert.equal(accounting.closingBal, 570);
  assert.equal(accounting.drawerUpdate.balance, 570);
  assert.equal(accounting.shiftUpdate.cashIn, 80);
  assert.equal(accounting.shiftUpdate.cashOut, 10);
});

test("multi-currency close preserves opening native balances and applies cash drop only to USD", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-2", openingCcyBals: { USD: "100", AUD: "10", AED: "5" } },
    drawer: { id: 2 },
    transactions: [
      { shiftId: "SH-2", amount: 50 },
      { shiftId: "SH-2", amount: 12.99, fxCcy: "AUD", fxAmt: 20 },
      { shiftId: "SH-2", amount: -0.55, fxCcy: "AED", fxAmt: -2 },
    ],
    countedBalances: { USD: "150", AUD: "30", AED: "3" },
    cashDrop: "40",
  });

  assert.deepEqual(accounting.expectedByCode, { USD: 150, AUD: 30, AED: 3 });
  assert.deepEqual(accounting.countedByCode, { USD: 150, AUD: 30, AED: 3 });
  assert.deepEqual(accounting.endingByCode, { USD: 110, AUD: 30, AED: 3 });
  assert.equal(accounting.drawerUpdate.balance, 110);
  assert.deepEqual(accounting.drawerUpdate.ccyBalances, { USD: 110, AUD: 30, AED: 3 });
});

test("legacy open shifts without openingCcyBals fall back to drawer native balances", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-3", openingBal: 999 },
    drawer: { id: 3, balance: 200, ccyBalances: { USD: 200, GBP: 15 } },
    transactions: [
      { shiftId: "SH-3", amount: 25 },
      { shiftId: "SH-3", amount: 6.25, fxCcy: "GBP", fxAmt: 5 },
    ],
  });

  assert.equal(accounting.expectedByCode.USD, 225);
  assert.equal(accounting.expectedByCode.GBP, 20);
});

test("drawer lifecycle lock is active when a drawer has an open shift reference", () => {
  assert.equal(isDrawerLifecycleLocked({ inUseBy: "Raj Kumar" }), true);
  assert.equal(isDrawerLifecycleLocked({ currentShift: "SH-1" }), true);
  assert.equal(isDrawerLifecycleLocked({ inUseBy: null, currentShift: null }), false);
});
