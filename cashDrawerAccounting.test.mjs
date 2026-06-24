import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting preserves native opening balances and applies cash drop only to USD", () => {
  const drawer = {
    id: 1,
    balance: 385.75,
    ccyBalances: { USD: 385.75, AUD: 10, AED: 1 },
  };
  const shift = {
    id: "SH-1",
    openingBal: 385.75,
    openingCcyBals: { USD: "385.75", AUD: "10.00", AED: "1.00" },
  };
  const txns = [
    { shiftId: "SH-1", amount: 100, ccy: "USD" },
    { shiftId: "SH-1", amount: -10, ccy: "USD" },
    { shiftId: "SH-1", amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
    { shiftId: "SH-1", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
  ];

  const result = buildCloseDrawerAccounting({ drawer, shift, txns, drop: "20" });

  assert.deepEqual(result.endingBalances, { USD: 455.75, AUD: 60, AED: 21 });
  assert.equal(result.cashDrop, 20);
  assert.equal(result.byCode.USD.expected, 475.75);
  assert.equal(result.byCode.AUD.expected, 60);
  assert.equal(result.byCode.AUD.cashDrop, 0);
  assert.equal(result.byCode.AED.ending, 21);
});

test("close accounting falls back to drawer native balances for legacy open shifts", () => {
  const drawer = {
    id: 3,
    balance: 648.25,
    ccyBalances: { USD: 648.25, AUD: 65, AED: 150 },
  };
  const shift = { id: "SH-LEGACY", openingBal: 648.25 };
  const txns = [
    { shiftId: "SH-LEGACY", amount: 10, ccy: "USD" },
    { shiftId: "SH-LEGACY", amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
  ];

  const result = buildCloseDrawerAccounting({ drawer, shift, txns, ccyCounts: { AUD: "80" }, drop: "5" });

  assert.deepEqual(result.endingBalances, { USD: 653.25, AUD: 80, AED: 150 });
  assert.equal(result.byCode.AUD.expected, 75);
  assert.equal(result.byCode.AUD.variance, 5);
  assert.equal(result.byCode.AED.expected, 150);
});
