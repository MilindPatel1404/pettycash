import assert from "node:assert/strict";
import test from "node:test";
import { buildCloseDrawerAccounting, isPositiveFinite } from "./cashDrawerAccounting.mjs";

test("derives USD expected balance from opening balance plus live ledger transactions", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-1", openingCcyBals: { USD: "100" }, openingBal: 999 },
    drawer: { ccyBalances: { USD: 100 } },
    txns: [
      { shiftId: "SH-1", amount: 50 },
      { shiftId: "SH-1", amount: -20 },
      { shiftId: "OTHER", amount: 1000 },
    ],
  });

  assert.equal(accounting.expectedByCode.USD, 130);
  assert.equal(accounting.closingBal, 130);
  assert.equal(accounting.endingCcyBalances.USD, 130);
});

test("derives foreign expected balances from opening native balance plus signed FX activity", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-FX", openingCcyBals: { USD: "0", AUD: "10" } },
    drawer: { ccyBalances: { USD: 0, AUD: 10 } },
    txns: [
      { shiftId: "SH-FX", amount: 9.74, fxCcy: "AUD", fxAmt: 15 },
      { shiftId: "SH-FX", amount: -2.6, fxCcy: "AUD", fxAmt: -4 },
    ],
    counts: { AUD: "21" },
  });

  const aud = accounting.ccySummary.find(summary => summary.code === "AUD");
  assert.equal(accounting.expectedByCode.AUD, 21);
  assert.equal(aud.totIn, 15);
  assert.equal(aud.totOut, 4);
  assert.equal(aud.bal, 21);
  assert.equal(aud.endingBal, 21);
});

test("applies cash drops only to USD ending balances", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-DROP", openingCcyBals: { USD: "100", AED: "20" } },
    drawer: { ccyBalances: { USD: 100, AED: 20 } },
    txns: [
      { shiftId: "SH-DROP", amount: 60 },
      { shiftId: "SH-DROP", amount: 2.72, fxCcy: "AED", fxAmt: 10 },
    ],
    counts: { USD: "160", AED: "30" },
    cashDrop: "50",
  });

  const usd = accounting.ccySummary.find(summary => summary.code === "USD");
  const aed = accounting.ccySummary.find(summary => summary.code === "AED");
  assert.equal(usd.cashDrop, 50);
  assert.equal(aed.cashDrop, 0);
  assert.deepEqual(accounting.endingCcyBalances, { USD: 110, AED: 30 });
});

test("uses drawer native balances as legacy fallback when a shift lacks openingCcyBals", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-LEGACY", openingBal: 999 },
    drawer: { ccyBalances: { USD: 100, AUD: 10 } },
    txns: [
      { shiftId: "SH-LEGACY", amount: 5 },
      { shiftId: "SH-LEGACY", amount: 1.3, fxCcy: "AUD", fxAmt: 2 },
    ],
  });

  assert.equal(accounting.expectedByCode.USD, 105);
  assert.equal(accounting.expectedByCode.AUD, 12);
});

test("rejects non-positive financial input values", () => {
  assert.equal(isPositiveFinite("1"), true);
  assert.equal(isPositiveFinite("0"), false);
  assert.equal(isPositiveFinite("-1"), false);
  assert.equal(isPositiveFinite("abc"), false);
});
