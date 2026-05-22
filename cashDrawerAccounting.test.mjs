import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting uses live USD transactions instead of stale shift aggregates", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 1, currentShift: "SH-1", balance: 500, ccyBalances: { USD: 500 } },
    shift: { id: "SH-1", openingBal: 500, cashIn: 0, cashOut: 0 },
    txns: [
      { shiftId: "SH-1", amount: 25 },
      { shiftId: "SH-1", amount: -5 },
    ],
    counts: {},
  });

  assert.equal(accounting.systemByCode.USD, 520);
  assert.equal(accounting.closingBal, 520);
  assert.equal(accounting.cashIn, 25);
  assert.equal(accounting.cashOut, 5);
});

test("foreign currency close uses opening balance, signed transactions, and cashier count", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 1, currentShift: "SH-1", balance: 500, ccyBalances: { USD: 500, AUD: 100 } },
    shift: { id: "SH-1", openingBal: 500, openingCcyBals: { USD: "500", AUD: "100" } },
    txns: [
      { shiftId: "SH-1", amount: 12.99, fxCcy: "AUD", fxAmt: 20 },
      { shiftId: "SH-1", amount: -6.49, fxCcy: "AUD", fxAmt: -10 },
    ],
    counts: { AUD: "85" },
  });

  const aud = accounting.ccySummary.find(row => row.code === "AUD");
  assert.equal(aud.expectedBal, 110);
  assert.equal(aud.bal, 85);
  assert.equal(aud.variance, -25);
  assert.equal(accounting.endingCcyBalances.AUD, 85);
});

test("cash drop is applied only to USD ending drawer balances", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 1, currentShift: "SH-1", balance: 500, ccyBalances: { USD: 500, AED: 40 } },
    shift: { id: "SH-1", openingBal: 500, openingCcyBals: { USD: "500", AED: "40" } },
    txns: [
      { shiftId: "SH-1", amount: 20 },
      { shiftId: "SH-1", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
    ],
    counts: { USD: "520", AED: "60" },
    cashDrop: "100",
  });

  assert.equal(accounting.closingBal, 520);
  assert.equal(accounting.endingCcyBalances.USD, 420);
  assert.equal(accounting.endingCcyBalances.AED, 60);
  assert.equal(accounting.ccySummary.find(row => row.code === "AED").cashDrop, 0);
});
