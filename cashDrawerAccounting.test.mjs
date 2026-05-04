import assert from "node:assert/strict";
import test from "node:test";

import {
  cashDropForCode,
  buildClosedDrawerSnapshot,
  getSystemBalanceByCode,
} from "./cashDrawerAccounting.mjs";

test("close snapshot preserves post-drop per-currency drawer balances", () => {
  const drawer = {
    id: 1,
    balance: 385.75,
    ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
  };
  const shift = {
    id: "SH-1",
    openingBal: 385.75,
    openingCcyBals: { USD: "385.75", AUD: "10", AED: "1" },
  };
  const txns = [
    { shiftId: "SH-1", amount: 100, ccy: "USD" },
    { shiftId: "SH-1", amount: -10, ccy: "USD" },
    { shiftId: "SH-1", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    { shiftId: "SH-1", amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20 },
  ];

  assert.deepEqual(getSystemBalanceByCode(shift, drawer, txns), {
    USD: 475.75,
    AUD: 20,
    AED: 21,
  });

  const snapshot = buildClosedDrawerSnapshot({
    activeShift: shift,
    selectedDrawer: drawer,
    shiftTxns: txns,
    ccyCounts: { USD: "475.75", AUD: "20", AED: "21" },
    cashDrop: "75",
  });

  assert.equal(snapshot.closingBal, 475.75);
  assert.equal(snapshot.drawerBalance, 400.75);
  assert.deepEqual(snapshot.ccyBalances, { USD: 400.75, AUD: 20, AED: 21 });
  assert.equal(snapshot.variance, 0);
  assert.equal(snapshot.cashIn, 100);
  assert.equal(snapshot.cashOut, 10);
  assert.equal(cashDropForCode(snapshot.cashDrop, "USD"), 75);
  assert.equal(cashDropForCode(snapshot.cashDrop, "AUD"), 0);
});
