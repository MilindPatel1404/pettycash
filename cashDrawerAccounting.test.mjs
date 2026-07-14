import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("derives USD close balance from live transactions instead of stale shift rollups", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: {
      id: "SH-1",
      openingBal: 100,
      cashIn: 999,
      cashOut: 400,
    },
    drawer: { ccyBalances: { USD: 100 } },
    transactions: [
      { shiftId: "SH-1", amount: 25 },
      { shiftId: "SH-1", amount: -10 },
      { shiftId: "OTHER", amount: 500 },
    ],
    counts: { USD: "" },
    cashDrop: 15,
  });

  assert.equal(accounting.expectedBalances.USD, 115);
  assert.equal(accounting.drawerBalances.USD, 115);
  assert.equal(accounting.endingBalances.USD, 100);
  assert.equal(accounting.closingBal, 100);
  assert.equal(accounting.variances.USD, 0);
});

test("carries opening native balances and signed FX transactions into the next shift", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: {
      id: "SH-2",
      openingBal: 200,
      openingCcyBals: { USD: "200", AUD: "10", AED: "5" },
    },
    drawer: { ccyBalances: { USD: 200, AUD: 999, AED: 999 } },
    transactions: [
      { shiftId: "SH-2", amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
      { shiftId: "SH-2", amount: -4.55, fxCcy: "AUD", fxAmt: -7 },
      { shiftId: "SH-2", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
    ],
    counts: {},
  });

  assert.equal(accounting.expectedBalances.AUD, 53);
  assert.equal(accounting.endingBalances.AUD, 53);
  assert.equal(accounting.expectedBalances.AED, 25);
  assert.equal(accounting.endingBalances.AED, 25);
  assert.equal(accounting.expectedBalances.USD, 200);
});

test("uses physical counts for drawer balances and records per-currency variance", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: {
      id: "SH-3",
      openingBal: 100,
      openingCcyBals: { USD: "100", AUD: "10" },
    },
    drawer: { ccyBalances: { USD: 100, AUD: 10 } },
    transactions: [
      { shiftId: "SH-3", amount: 20 },
      { shiftId: "SH-3", amount: 6.5, fxCcy: "AUD", fxAmt: 10 },
    ],
    counts: { USD: "118", AUD: "21" },
    cashDrop: 18,
  });

  assert.equal(accounting.expectedBalances.USD, 120);
  assert.equal(accounting.drawerBalances.USD, 118);
  assert.equal(accounting.variances.USD, -2);
  assert.equal(accounting.endingBalances.USD, 100);
  assert.equal(accounting.expectedBalances.AUD, 20);
  assert.equal(accounting.variances.AUD, 1);
  assert.equal(accounting.endingBalances.AUD, 21);
  assert.deepEqual(accounting.countedCurrencies, ["USD", "AUD"]);
});

test("falls back to drawer native balances for legacy shifts without an opening snapshot", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-4", openingBal: 80 },
    drawer: { ccyBalances: { USD: 75, AUD: 12 } },
    transactions: [
      { shiftId: "SH-4", amount: -5 },
      { shiftId: "SH-4", amount: -3, fxCcy: "AUD", fxAmt: -4 },
    ],
  });

  assert.equal(accounting.expectedBalances.USD, 75);
  assert.equal(accounting.expectedBalances.AUD, 8);
});
