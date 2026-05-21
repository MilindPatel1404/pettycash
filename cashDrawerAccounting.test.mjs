import test from "node:test";
import assert from "node:assert/strict";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting preserves opening native balances and persists ending balances", () => {
  const drawer = {
    balance: 100,
    ccyBalances: { USD: 100, AUD: 10, AED: 1 },
  };
  const shift = { id: "SH-1", openingBal: 100 };
  const txns = [
    { shiftId: "SH-1", amount: 25 },
    { shiftId: "SH-1", amount: -5 },
    { shiftId: "SH-1", amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
    { shiftId: "SH-1", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
  ];

  const result = buildCloseDrawerAccounting({ drawer, shift, txns });

  assert.deepEqual(result.expectedByCode, { USD: 120, AUD: 20, AED: 21 });
  assert.deepEqual(result.endingByCode, { USD: 120, AUD: 20, AED: 21 });
  assert.equal(result.ccySummary.find(s => s.code === "AUD").openingBal, 10);
  assert.equal(result.ccySummary.find(s => s.code === "AUD").bal, 20);
});

test("cash drop applies only to USD and does not reduce foreign currency balances", () => {
  const drawer = {
    balance: 200,
    ccyBalances: { USD: 200, EUR: 50 },
  };
  const shift = {
    id: "SH-2",
    openingBal: 200,
    openingCcyBals: { USD: "200", EUR: "50" },
  };
  const txns = [
    { shiftId: "SH-2", amount: 20 },
    { shiftId: "SH-2", amount: 10.87, fxCcy: "EUR", fxAmt: 10 },
  ];

  const result = buildCloseDrawerAccounting({
    drawer,
    shift,
    txns,
    ccyCounts: { USD: "220", EUR: "60" },
    cashDrop: "100",
  });

  assert.equal(result.closingBal, 220);
  assert.equal(result.endingBalance, 120);
  assert.deepEqual(result.endingByCode, { USD: 120, EUR: 60 });
  assert.equal(result.ccySummary.find(s => s.code === "USD").cashDrop, 100);
  assert.equal(result.ccySummary.find(s => s.code === "EUR").cashDrop, 0);
});
