import test from "node:test";
import assert from "node:assert/strict";
import {
  cashDropForCurrency,
  computeCashDrawerClose,
  endingBalanceForSummary,
} from "./cashDrawerAccounting.mjs";

test("close accounting preserves native opening balances, counts, and USD-only cash drop", () => {
  const result = computeCashDrawerClose({
    activeShift: {
      id: "SH-1",
      openingBal: 385.75,
      openingCcyBals: { USD: "385.75", AUD: "10.00", AED: "1.00" },
    },
    selectedDrawer: {
      currentShift: "SH-1",
      balance: 385.75,
      ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
    },
    txns: [
      { shiftId: "SH-1", amount: 65 },
      { shiftId: "SH-1", amount: -10 },
      { shiftId: "SH-1", amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
      { shiftId: "SH-1", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
    ],
    ccyCounts: { USD: "440.75", AUD: "60.00", AED: "21.00" },
    cashDropInput: "100",
  });

  assert.deepEqual(result.expectedBalances, { USD: 440.75, AED: 21, AUD: 60 });
  assert.deepEqual(result.countedBalances, { USD: 440.75, AED: 21, AUD: 60 });
  assert.deepEqual(result.endingCcyBalances, { USD: 340.75, AED: 21, AUD: 60 });

  const usd = result.ccySummary.find(row => row.code === "USD");
  const aud = result.ccySummary.find(row => row.code === "AUD");
  const aed = result.ccySummary.find(row => row.code === "AED");

  assert.equal(usd.openingBal, 385.75);
  assert.equal(usd.bal, 440.75);
  assert.equal(usd.cashDrop, 100);
  assert.equal(usd.endingBal, 340.75);
  assert.equal(aud.openingBal, 10);
  assert.equal(aud.bal, 60);
  assert.equal(aud.cashDrop, 0);
  assert.equal(aud.endingBal, 60);
  assert.equal(aed.openingBal, 1);
  assert.equal(aed.bal, 21);
});

test("blank USD count falls back to ledger balance instead of closing to zero", () => {
  const result = computeCashDrawerClose({
    activeShift: { id: "SH-2", openingBal: 100, openingCcyBals: { USD: "100" } },
    selectedDrawer: { currentShift: "SH-2", balance: 100, ccyBalances: { USD: 100 } },
    txns: [{ shiftId: "SH-2", amount: 50 }],
    ccyCounts: { USD: "" },
  });

  assert.equal(result.closingBal, 150);
  assert.equal(result.endingCcyBalances.USD, 150);
  assert.equal(result.variance, 0);
});

test("legacy global cash drop only applies to USD ending balances", () => {
  const legacyShift = { cashDrop: 25 };
  const usdSummary = { code: "USD", bal: 100 };
  const audSummary = { code: "AUD", bal: 60 };

  assert.equal(cashDropForCurrency(legacyShift, "USD"), 25);
  assert.equal(cashDropForCurrency(legacyShift, "AUD"), 0);
  assert.equal(endingBalanceForSummary(legacyShift, usdSummary), 75);
  assert.equal(endingBalanceForSummary(legacyShift, audSummary), 60);
});
