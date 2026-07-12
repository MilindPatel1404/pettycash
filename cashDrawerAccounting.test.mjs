import assert from "node:assert/strict";
import test from "node:test";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("closing a multi-currency drawer preserves opening balances and live native transactions", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 1, balance: 100, ccyBalances: { USD: 100, AUD: 10, AED: 5 } },
    shift: {
      id: "SH-1",
      openingBal: 100,
      openingCcyBals: { USD: "100", AUD: "10", AED: "5" },
    },
    txns: [
      { shiftId: "SH-1", amount: 50, ccy: "USD" },
      { shiftId: "SH-1", amount: -20, ccy: "USD" },
      { shiftId: "SH-1", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
      { shiftId: "SH-1", amount: 1.36, ccy: "USD", fxCcy: "AED", fxAmt: -5 },
      { shiftId: "OTHER", amount: 999, ccy: "USD" },
    ],
    counts: { USD: "130", AUD: "20", AED: "0" },
    cashDrop: "30",
  });

  assert.equal(accounting.closingBal, 130);
  assert.equal(accounting.cashDrop, 30);
  assert.deepEqual(accounting.ccyBalances, { USD: 100, AUD: 20, AED: 0 });
  assert.deepEqual(
    accounting.ccySummary.map(({ code, openingBal, expectedBal, countedBal, endingBal, cashDrop }) => ({
      code,
      openingBal,
      expectedBal,
      countedBal,
      endingBal,
      cashDrop,
    })),
    [
      { code: "USD", openingBal: 100, expectedBal: 130, countedBal: 130, endingBal: 100, cashDrop: 30 },
      { code: "AUD", openingBal: 10, expectedBal: 20, countedBal: 20, endingBal: 20, cashDrop: 0 },
      { code: "AED", openingBal: 5, expectedBal: 0, countedBal: 0, endingBal: 0, cashDrop: 0 },
    ],
  );
});

test("blank counts fall back to the computed ledger balance", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { balance: 25, ccyBalances: { USD: 25 } },
    shift: { id: "SH-2", openingBal: 25, openingCcyBals: { USD: "25" } },
    txns: [{ shiftId: "SH-2", amount: 15, ccy: "USD" }],
    counts: { USD: "" },
    cashDrop: "0",
  });

  assert.equal(accounting.closingBal, 40);
  assert.equal(accounting.variance, 0);
  assert.deepEqual(accounting.ccyBalances, { USD: 40 });
});

test("cash drops are non-negative and only reduce USD ending balance", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { ccyBalances: { USD: 50, EUR: 20 } },
    shift: { id: "SH-3", openingCcyBals: { USD: "50", EUR: "20" } },
    txns: [{ shiftId: "SH-3", fxCcy: "EUR", fxAmt: 5, amount: 5.43 }],
    counts: {},
    cashDrop: "-10",
  });

  assert.equal(accounting.cashDrop, 0);
  assert.deepEqual(accounting.ccyBalances, { USD: 50, EUR: 25 });
  assert.equal(accounting.ccySummary.find((row) => row.code === "EUR").cashDrop, 0);
});
