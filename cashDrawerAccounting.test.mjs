import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting preserves opening balances and live native transactions", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 1, currentShift: "SH-1", balance: 100, ccyBalances: { USD: 100, AUD: 20 } },
    shift: {
      id: "SH-1",
      openingBal: 100,
      openingCcyBals: { USD: "100.00", AUD: "20.00" },
    },
    txns: [
      { shiftId: "SH-1", amount: 50, ccy: "USD" },
      { shiftId: "SH-1", amount: -10, ccy: "USD" },
      { shiftId: "SH-1", amount: 13.33, fxCcy: "AUD", fxAmt: 20 },
      { shiftId: "SH-OTHER", amount: 999, ccy: "USD" },
    ],
    counts: { USD: "140.00", AUD: "40.00" },
    cashDrop: "25.00",
  });

  assert.deepEqual(accounting.expectedByCode, { USD: 140, AUD: 40 });
  assert.deepEqual(accounting.countedByCode, { USD: 140, AUD: 40 });
  assert.deepEqual(accounting.endingByCode, { USD: 115, AUD: 40 });
  assert.equal(accounting.ccySummary.find(row => row.code === "AUD").cashDrop, 0);
});

test("blank counts fall back to the computed ledger balance", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 2, currentShift: "SH-2", balance: 500, ccyBalances: { USD: 500 } },
    shift: { id: "SH-2", openingBal: 500, openingCcyBals: { USD: "500.00" } },
    txns: [
      { shiftId: "SH-2", amount: 80, ccy: "USD" },
      { shiftId: "SH-2", amount: -15, ccy: "USD" },
    ],
    counts: { USD: "" },
  });

  assert.equal(accounting.expectedByCode.USD, 565);
  assert.equal(accounting.countedByCode.USD, 565);
  assert.equal(accounting.variance, 0);
});

test("negative cash drops cannot increase the persisted drawer balance", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 3, currentShift: "SH-3", balance: 200 },
    shift: { id: "SH-3", openingBal: 200, openingCcyBals: { USD: "200.00" } },
    txns: [],
    counts: { USD: "200.00" },
    cashDrop: "-75.00",
  });

  assert.equal(accounting.cashDrop, 0);
  assert.equal(accounting.endingByCode.USD, 200);
});
