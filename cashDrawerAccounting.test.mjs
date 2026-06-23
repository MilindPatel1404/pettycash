import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting includes opening native balances, signed live transactions, and USD-only drop", () => {
  const drawer = {
    balance: 385.75,
    ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
  };
  const shift = {
    openingBal: 385.75,
    openingCcyBals: { USD: "385.75", AUD: "10.00", AED: "1.00" },
  };
  const transactions = [
    { amount: 100, ccy: "USD" },
    { amount: -10, ccy: "USD" },
    { amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    { amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20 },
  ];

  const result = buildCloseDrawerAccounting({
    drawer,
    shift,
    transactions,
    counts: { USD: "475.75", AUD: "20.00", AED: "21.00" },
    cashDrop: "75.75",
  });

  assert.deepEqual(result.expectedByCode, { USD: 475.75, AUD: 20, AED: 21 });
  assert.deepEqual(result.countedByCode, { USD: 475.75, AUD: 20, AED: 21 });
  assert.deepEqual(result.endingByCode, { USD: 400, AUD: 20, AED: 21 });
  assert.equal(result.cashDrop, 75.75);
  assert.equal(result.closingBal, 475.75);
  assert.equal(result.endingBal, 400);
  assert.equal(result.variance, 0);
});

test("blank counts fall back to expected ledger balances without erasing cash", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { balance: 500, ccyBalances: { USD: 500 } },
    shift: { openingBal: 500 },
    transactions: [{ amount: 45, ccy: "USD" }],
    counts: {},
    cashDrop: "",
  });

  assert.equal(result.expectedByCode.USD, 545);
  assert.equal(result.countedByCode.USD, 545);
  assert.equal(result.endingByCode.USD, 545);
});

test("negative cash drops cannot increase the persisted drawer balance", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { balance: 100, ccyBalances: { USD: 100 } },
    shift: { openingBal: 100 },
    transactions: [],
    counts: { USD: "100" },
    cashDrop: "-25",
  });

  assert.equal(result.cashDrop, 0);
  assert.equal(result.endingByCode.USD, 100);
});
