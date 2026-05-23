import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting derives USD expected balance from transaction log", () => {
  const drawer = {
    id: 1,
    currentShift: "SH-1",
    balance: 500,
    ccyBalances: { USD: 500 },
  };
  const shift = {
    id: "SH-1",
    status: "Open",
    openingBal: 500,
    cashIn: 0,
    cashOut: 0,
  };
  const accounting = buildCloseDrawerAccounting({
    drawer,
    shift,
    txns: [
      { shiftId: "SH-1", amount: 125, ccy: "USD" },
      { shiftId: "SH-1", amount: -20, ccy: "USD" },
    ],
    counts: {},
    cashDrop: 50,
  });

  assert.equal(accounting.byCode.USD.expectedBal, 605);
  assert.equal(accounting.byCode.USD.bal, 605);
  assert.equal(accounting.drawerBalance, 555);
  assert.deepEqual(accounting.ccyBalances, { USD: 555 });
});

test("close accounting keeps native foreign opening balances and payout signs", () => {
  const drawer = {
    id: 2,
    currentShift: "SH-2",
    balance: 400,
    ccyBalances: { USD: 400, AUD: 100 },
  };
  const shift = {
    id: "SH-2",
    status: "Open",
    openingBal: 400,
    openingCcyBals: { USD: "400", AUD: "100" },
  };
  const accounting = buildCloseDrawerAccounting({
    drawer,
    shift,
    txns: [
      { shiftId: "SH-2", amount: 10, ccy: "USD", fxCcy: "AUD", fxAmt: 15 },
      { shiftId: "SH-2", amount: -20, ccy: "USD", fxCcy: "AUD", fxAmt: -30 },
    ],
    counts: {},
    cashDrop: 25,
  });

  assert.equal(accounting.byCode.USD.expectedBal, 400);
  assert.equal(accounting.byCode.AUD.expectedBal, 85);
  assert.equal(accounting.byCode.AUD.totIn, 15);
  assert.equal(accounting.byCode.AUD.totOut, 30);
  assert.equal(accounting.byCode.AUD.endingBal, 85);
  assert.deepEqual(accounting.ccyBalances, { USD: 375, AUD: 85 });
});

test("close accounting refuses stale drawer selections without an active shift", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { id: 3, currentShift: null, balance: 700 },
    shift: { id: "SH-3", status: "Closed", openingBal: 700 },
  });

  assert.equal(accounting, null);
});
