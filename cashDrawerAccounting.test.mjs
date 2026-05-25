import test from "node:test";
import assert from "node:assert/strict";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting includes opening balances and live native transactions", () => {
  const result = buildCloseDrawerAccounting({
    shift: {
      id: "SH-1",
      openingBal: 500,
      openingCcyBals: { USD: "500.00", AUD: "10.00", AED: "1.00" },
    },
    drawer: { balance: 500, ccyBalances: { USD: 500 } },
    txns: [
      { amount: 100 },
      { amount: -20 },
      { amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
      { amount: 0.27, fxCcy: "AED", fxAmt: 1 },
      { amount: 5.45, fxCcy: "AED", fxAmt: 20 },
    ],
    counts: {},
    drop: 50,
  });

  assert.equal(result.closingBal, 580);
  assert.equal(result.endingBal, 530);
  assert.equal(result.endingByCode.USD, 530);
  assert.equal(result.endingByCode.AUD, 20);
  assert.equal(result.endingByCode.AED, 22);
  assert.deepEqual(
    result.ccySummary.map(row => [row.code, row.openingBal, row.totIn, row.totOut, row.bal, row.endingBal]),
    [
      ["USD", 500, 100, 20, 580, 530],
      ["AUD", 10, 10, 0, 20, 20],
      ["AED", 1, 21, 0, 22, 22],
    ]
  );
});

test("explicit counts override expected balances and only USD cash drop is applied", () => {
  const result = buildCloseDrawerAccounting({
    shift: { id: "SH-2", openingCcyBals: { USD: 100, EUR: 25 } },
    txns: [
      { amount: 5, fxCcy: "EUR", fxAmt: 5 },
      { amount: 10 },
    ],
    counts: { USD: "120", EUR: "40" },
    drop: "15",
  });

  assert.equal(result.countedByCode.USD, 120);
  assert.equal(result.countedByCode.EUR, 40);
  assert.equal(result.endingByCode.USD, 105);
  assert.equal(result.endingByCode.EUR, 40);
  assert.equal(result.ccySummary.find(row => row.code === "EUR").cashDrop, 0);
});
