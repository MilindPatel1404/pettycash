import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting preserves opening native balances and applies cash drop only to USD", () => {
  const drawer = {
    id: 1,
    currentShift: "SH-20250724-003",
    balance: 385.75,
    ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
  };
  const shift = {
    id: "SH-20250724-003",
    openingBal: 812.75,
  };
  const txns = [
    { shiftId: shift.id, amount: 100 },
    { shiftId: shift.id, amount: 65 },
    { shiftId: shift.id, amount: -10 },
    { shiftId: shift.id, amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
    { shiftId: shift.id, amount: 4.5, fxCcy: "AUD", fxAmt: 7 },
    { shiftId: shift.id, amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
    { shiftId: shift.id, amount: 0.27, fxCcy: "AED", fxAmt: 1 },
    { shiftId: shift.id, amount: 5.45, fxCcy: "AED", fxAmt: 20 },
  ];

  const accounting = buildCloseDrawerAccounting({ drawer, shift, txns, cashDrop: 100 });

  assert.equal(accounting.byCode.USD.startingBal, 385.75);
  assert.equal(accounting.byCode.USD.expectedBal, 540.75);
  assert.equal(accounting.byCode.USD.endingBal, 440.75);
  assert.equal(accounting.byCode.AUD.startingBal, 10);
  assert.equal(accounting.byCode.AUD.expectedBal, 77);
  assert.equal(accounting.byCode.AUD.cashDrop, 0);
  assert.equal(accounting.byCode.AED.startingBal, 1);
  assert.equal(accounting.byCode.AED.expectedBal, 22);
  assert.deepEqual(accounting.endingCcyBalances, { USD: 440.75, AUD: 77, AED: 22 });
});

test("entered counts override expected balances without treating blank counts as zero", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { currentShift: "S1", ccyBalances: { USD: 100, EUR: 5 } },
    shift: { id: "S1" },
    txns: [
      { shiftId: "S1", amount: 10 },
      { shiftId: "S1", amount: 2, fxCcy: "EUR", fxAmt: 3 },
    ],
    ccyCounts: { USD: "", EUR: "EUR  7.50" },
    cashDrop: -50,
  });

  assert.equal(accounting.byCode.USD.bal, 110);
  assert.equal(accounting.byCode.USD.cashDrop, 0);
  assert.equal(accounting.byCode.EUR.bal, 7.5);
  assert.equal(accounting.byCode.EUR.variance, -0.5);
});

test("shift opening currency balances take precedence for newly opened drawers", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { currentShift: "S2", ccyBalances: { USD: 999, EUR: 999 } },
    shift: { id: "S2", openingBal: 999, openingCcyBals: { USD: "10.00", EUR: "5.00" } },
    txns: [
      { shiftId: "S2", amount: 2 },
      { shiftId: "S2", amount: 3, fxCcy: "EUR", fxAmt: 3 },
    ],
  });

  assert.equal(accounting.byCode.USD.expectedBal, 12);
  assert.equal(accounting.byCode.EUR.expectedBal, 8);
});
