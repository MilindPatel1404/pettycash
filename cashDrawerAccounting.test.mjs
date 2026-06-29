import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting uses opening native balances plus signed live transactions", () => {
  const shift = {
    id: "SH-1",
    openingBal: 999,
    openingCcyBals: { USD: "100.00", AUD: "10.00", AED: "1.00" },
  };
  const drawer = { id: 1, balance: 100, ccyBalances: { USD: 100, AUD: 10, AED: 1 } };
  const txns = [
    { shiftId: "SH-1", amount: 50, ccy: "USD" },
    { shiftId: "SH-1", amount: -20, ccy: "USD" },
    { shiftId: "SH-1", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    { shiftId: "SH-1", amount: -3.25, ccy: "USD", fxCcy: "AUD", fxAmt: -5 },
    { shiftId: "OTHER", amount: 999, ccy: "USD" },
  ];

  const accounting = buildCloseDrawerAccounting({
    shift,
    drawer,
    txns,
    counts: { USD: "130.00", AUD: "15.00" },
    cashDrop: "30.00",
  });

  assert.equal(accounting.byCode.USD.expected, 130);
  assert.equal(accounting.byCode.USD.counted, 130);
  assert.equal(accounting.byCode.USD.endingBal, 100);
  assert.equal(accounting.byCode.AUD.expected, 15);
  assert.equal(accounting.byCode.AUD.totIn, 10);
  assert.equal(accounting.byCode.AUD.totOut, 5);
  assert.equal(accounting.byCode.AUD.endingBal, 15);
  assert.deepEqual(accounting.endingBalances, { USD: 100, AUD: 15, AED: 1 });
});

test("blank counts fall back to system balances and negative cash drops are ignored", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-1", openingCcyBals: { USD: "50.00" } },
    drawer: { ccyBalances: { USD: 50 } },
    txns: [{ shiftId: "SH-1", amount: 10, ccy: "USD" }],
    counts: { USD: "" },
    cashDrop: "-100.00",
  });

  assert.equal(accounting.closingBal, 60);
  assert.equal(accounting.cashDrop, 0);
  assert.equal(accounting.endingBalances.USD, 60);
  assert.equal(accounting.hasUsdCount, false);
});

test("legacy open shifts without opening currency balances use drawer native balances", () => {
  const accounting = buildCloseDrawerAccounting({
    shift: { id: "SH-1", openingBal: 999 },
    drawer: { ccyBalances: { USD: 20, AED: 5 } },
    txns: [{ shiftId: "SH-1", amount: 2, ccy: "USD", fxCcy: "AED", fxAmt: 8 }],
  });

  assert.equal(accounting.byCode.USD.expected, 20);
  assert.equal(accounting.byCode.AED.expected, 13);
});
