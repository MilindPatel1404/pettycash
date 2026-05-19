import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting includes opening balances and live native transactions", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { openingBal: 100, openingCcyBals: { USD: "100", AUD: "10" } },
    transactions: [
      { amount: 50, ccy: "USD" },
      { amount: -20, ccy: "USD" },
      { amount: 19.48, ccy: "USD", fxCcy: "AUD", fxAmt: 30 },
      { amount: -3.25, ccy: "USD", fxCcy: "AUD", fxAmt: -5 },
    ],
    cashDrop: 40,
  });

  assert.deepEqual(accounting.expectedBalances, { USD: 130, AUD: 35 });
  assert.deepEqual(accounting.drawerBalances, { USD: 130, AUD: 35 });
  assert.deepEqual(accounting.endingBalances, { USD: 90, AUD: 35 });
  assert.equal(accounting.closingBal, 130);
  assert.equal(accounting.endingBal, 90);
  assert.equal(accounting.cashIn, 50);
  assert.equal(accounting.cashOut, 20);
  assert.equal(accounting.variance, 0);
});

test("counted balances override expected balances and record variance", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { openingBal: 100, openingCcyBals: { USD: "100", AED: "5" } },
    transactions: [
      { amount: 10, ccy: "USD" },
      { amount: 2.72, ccy: "USD", fxCcy: "AED", fxAmt: 10 },
    ],
    countedBalances: { USD: "108", AED: "" },
    cashDrop: 8,
  });

  const usd = accounting.ccySummary.find(row => row.code === "USD");
  const aed = accounting.ccySummary.find(row => row.code === "AED");

  assert.equal(usd.expectedBal, 110);
  assert.equal(usd.bal, 108);
  assert.equal(usd.variance, -2);
  assert.equal(aed.expectedBal, 15);
  assert.equal(aed.bal, 15);
  assert.deepEqual(accounting.endingBalances, { USD: 100, AED: 15 });
});

test("legacy shifts fall back to shift USD opening balance and drawer foreign balances", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { openingBal: 200 },
    drawer: { balance: 999, ccyBalances: { USD: 999, EUR: 12 } },
    transactions: [
      { amount: -25, ccy: "USD" },
      { amount: 5.43, ccy: "USD", fxCcy: "EUR", fxAmt: 5 },
    ],
  });

  assert.deepEqual(accounting.expectedBalances, { USD: 175, EUR: 17 });
});
