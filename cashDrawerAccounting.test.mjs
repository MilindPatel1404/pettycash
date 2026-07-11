import test from "node:test";
import assert from "node:assert/strict";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting includes opening native balances and live signed transactions", () => {
  const drawer = {
    balance: 100,
    ccyBalances: { USD: 100, AUD: 20, AED: 5 },
  };
  const shift = {
    openingBal: 100,
    openingCcyBals: { USD: "100.00", AUD: "20.00", AED: "5.00" },
  };
  const txns = [
    { amount: 40 },
    { amount: -15 },
    { amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
    { amount: 2.72, fxCcy: "AED", fxAmt: 10 },
    { amount: -1.36, fxCcy: "AED", fxAmt: -5 },
  ];

  const result = buildCloseDrawerAccounting({ drawer, shift, txns, counts: {}, cashDrop: 25 });

  assert.equal(result.byCode.USD.expectedBal, 125);
  assert.equal(result.byCode.AUD.expectedBal, 30);
  assert.equal(result.byCode.AED.expectedBal, 10);
  assert.deepEqual(result.endingCcyBalances, { USD: 100, AUD: 30, AED: 10 });
});

test("counted balances override expected balances without applying USD drops to foreign cash", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { balance: 200, ccyBalances: { USD: 200, EUR: 50 } },
    shift: { openingBal: 200, openingCcyBals: { USD: 200, EUR: 50 } },
    txns: [{ amount: 10 }, { amount: 21.74, fxCcy: "EUR", fxAmt: 20 }],
    counts: { USD: "250", EUR: "75" },
    cashDrop: "40",
  });

  assert.equal(result.byCode.USD.countedBal, 250);
  assert.equal(result.byCode.USD.endingBal, 210);
  assert.equal(result.byCode.EUR.countedBal, 75);
  assert.equal(result.byCode.EUR.endingBal, 75);
  assert.deepEqual(result.endingCcyBalances, { USD: 210, EUR: 75 });
});

test("negative cash drops are ignored instead of inflating drawer balances", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { balance: 100, ccyBalances: { USD: 100 } },
    shift: { openingBal: 100, openingCcyBals: { USD: 100 } },
    txns: [],
    counts: { USD: "100" },
    cashDrop: "-50",
  });

  assert.equal(result.cashDrop, 0);
  assert.equal(result.endingCcyBalances.USD, 100);
});

test("legacy open shifts fall back to drawer native balances", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { balance: 80, ccyBalances: { USD: 80, GBP: 30 } },
    shift: { openingBal: 999 },
    txns: [{ amount: 12.66, fxCcy: "GBP", fxAmt: 10 }],
    counts: {},
    cashDrop: 0,
  });

  assert.equal(result.byCode.USD.expectedBal, 80);
  assert.equal(result.byCode.GBP.expectedBal, 40);
});
