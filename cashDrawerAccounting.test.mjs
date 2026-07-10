import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting uses opening native balances plus live transactions", () => {
  const drawer = {
    id: 1,
    balance: 385.75,
    ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
  };
  const shift = { id: "SH-1", openingBal: 812.75 };
  const transactions = [
    { shiftId: "SH-1", amount: 100, ccy: "USD" },
    { shiftId: "SH-1", amount: 65, ccy: "USD" },
    { shiftId: "SH-1", amount: -10, ccy: "USD" },
    { shiftId: "SH-1", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    { shiftId: "SH-1", amount: 4.5, ccy: "USD", fxCcy: "AUD", fxAmt: 7 },
    { shiftId: "SH-1", amount: 32.47, ccy: "USD", fxCcy: "AUD", fxAmt: 50 },
    { shiftId: "SH-1", amount: 0.27, ccy: "USD", fxCcy: "AED", fxAmt: 1 },
    { shiftId: "SH-1", amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20 },
  ];

  const accounting = buildCloseDrawerAccounting({
    shift,
    drawer,
    transactions,
    cashDrop: 100,
  });

  assert.deepEqual(accounting.expectedBalances, { USD: 540.75, AED: 22, AUD: 77 });
  assert.deepEqual(accounting.countedBalances, { USD: 540.75, AED: 22, AUD: 77 });
  assert.deepEqual(accounting.endingBalances, { USD: 440.75, AED: 22, AUD: 77 });
  assert.equal(accounting.cashDrop, 100);
  assert.equal(accounting.closingBal, 540.75);
  assert.equal(accounting.endingBal, 440.75);
});

test("counted balances drive variance and persisted ending balances", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-2", openingCcyBals: { USD: "100", AUD: "20" } },
    drawer: { balance: 0, ccyBalances: { USD: 0, AUD: 0 } },
    transactions: [
      { shiftId: "SH-2", amount: 30, ccy: "USD" },
      { shiftId: "SH-2", amount: 1, ccy: "USD", fxCcy: "AUD", fxAmt: -5 },
    ],
    countedBalances: { USD: "125", AUD: "12" },
    cashDrop: "25",
  });

  assert.deepEqual(accounting.expectedBalances, { USD: 130, AUD: 15 });
  assert.deepEqual(accounting.countedBalances, { USD: 125, AUD: 12 });
  assert.deepEqual(accounting.endingBalances, { USD: 100, AUD: 12 });
  assert.deepEqual(accounting.varianceByCode, { USD: -5, AUD: -3 });
});

test("cash drop is non-negative and applies only to USD", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-3", openingCcyBals: { USD: "50", AED: "30" } },
    drawer: {},
    transactions: [],
    countedBalances: { USD: "50", AED: "30" },
    cashDrop: "-10",
  });

  assert.equal(accounting.cashDrop, 0);
  assert.deepEqual(accounting.endingBalances, { USD: 50, AED: 30 });
  assert.deepEqual(accounting.ccySummary.map(row => [row.code, row.cashDrop]), [["USD", 0], ["AED", 0]]);
});
