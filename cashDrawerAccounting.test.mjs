import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCashDrawerAccounting } from "./cashDrawerAccounting.mjs";

describe("buildCashDrawerAccounting", () => {
  it("keeps per-currency opening balances and signed transactions when closing", () => {
    const result = buildCashDrawerAccounting({
      drawer: { balance: 100, ccyBalances: { USD: 100, AUD: 10, AED: 1 } },
      shift: {
        openingBal: 100,
        openingCcyBals: { USD: "100", AUD: "10", AED: "1" },
      },
      txns: [
        { amount: 50 },
        { amount: -20 },
        { fxCcy: "AUD", fxAmt: 15, amount: 9.74 },
        { fxCcy: "AUD", fxAmt: -5, amount: -3.25 },
        { fxCcy: "AED", fxAmt: 4, amount: 1.09 },
      ],
      counts: { USD: "140", AUD: "20", AED: "5" },
      cashDrop: "40",
    });

    assert.deepEqual(result.expectedBalances, { USD: 130, AUD: 20, AED: 5 });
    assert.deepEqual(result.countedBalances, { USD: 140, AUD: 20, AED: 5 });
    assert.deepEqual(result.endingCcyBalances, { USD: 100, AUD: 20, AED: 5 });
    assert.equal(result.variance, 10);
    assert.equal(result.cashDrop, 40);
  });

  it("falls back blank counts to the ledger and does not drop foreign cash", () => {
    const result = buildCashDrawerAccounting({
      drawer: { balance: 250, ccyBalances: { USD: 250, EUR: 30 } },
      shift: { openingBal: 250, openingCcyBals: { USD: "250", EUR: "30" } },
      txns: [
        { amount: 25 },
        { fxCcy: "EUR", fxAmt: 10, amount: 10.87 },
      ],
      counts: { USD: "", EUR: "" },
      cashDrop: "50",
    });

    assert.deepEqual(result.expectedBalances, { USD: 275, EUR: 40 });
    assert.deepEqual(result.countedBalances, { USD: 275, EUR: 40 });
    assert.deepEqual(result.endingCcyBalances, { USD: 225, EUR: 40 });
    assert.deepEqual(result.ccySummary.map(row => [row.code, row.opening, row.bal, row.ending]), [
      ["USD", 250, 275, 225],
      ["EUR", 30, 40, 40],
    ]);
  });

  it("uses existing drawer currency balances for legacy open shifts without openingCcyBals", () => {
    const result = buildCashDrawerAccounting({
      drawer: { balance: 385.75, ccyBalances: { USD: 385.75, AUD: 10, AED: 1 } },
      shift: { openingBal: 812.75 },
      txns: [
        { amount: 65 },
        { fxCcy: "AUD", fxAmt: 7, amount: 4.5 },
        { fxCcy: "AED", fxAmt: 20, amount: 5.45 },
      ],
      cashDrop: 100,
    });

    assert.deepEqual(result.expectedBalances, { USD: 450.75, AUD: 17, AED: 21 });
    assert.deepEqual(result.endingCcyBalances, { USD: 350.75, AUD: 17, AED: 21 });
  });
});
