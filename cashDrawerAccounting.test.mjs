import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCloseAccounting,
  shiftExpectedBalances,
  summaryCashDrop,
} from "./cashDrawerAccounting.mjs";

describe("cash drawer close accounting", () => {
  const activeShift = {
    id: "SH-TEST-001",
    openingBal: 500,
    openingCcyBals: { USD: "500", AUD: "10", AED: "1" },
  };
  const selectedDrawer = {
    id: 1,
    ccyBalances: { USD: 500, AUD: 10, AED: 1 },
  };
  const txns = [
    { shiftId: activeShift.id, amount: 100, ccy: "USD" },
    { shiftId: activeShift.id, amount: -25, ccy: "USD" },
    { shiftId: activeShift.id, amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    { shiftId: activeShift.id, amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20 },
  ];

  it("keeps opening balances when deriving per-currency system balances", () => {
    assert.deepEqual(shiftExpectedBalances(activeShift, txns, selectedDrawer.ccyBalances), {
      USD: 575,
      AED: 21,
      AUD: 20,
    });
  });

  it("persists post-drop balances without applying USD drops to foreign currency", () => {
    const close = buildCloseAccounting({
      activeShift,
      selectedDrawer,
      txns,
      ccyCounts: {},
      drop: "200",
    });

    assert.equal(close.closingBal, 575);
    assert.deepEqual(close.endingByCode, {
      USD: 375,
      AED: 21,
      AUD: 20,
    });
    assert.equal(close.ccySummary.find(row => row.code === "USD").cashDrop, 200);
    assert.equal(close.ccySummary.find(row => row.code === "AUD").cashDrop, 0);
    assert.equal(close.ccySummary.find(row => row.code === "AED").cashDrop, 0);
  });

  it("uses per-summary cash drops when rendering existing close summaries", () => {
    const shift = { cashDrop: 200 };
    const usdSummary = { code: "USD", bal: 575 };
    const audSummary = { code: "AUD", bal: 20, cashDrop: 0 };

    assert.equal(usdSummary.bal - summaryCashDrop(shift, usdSummary), 375);
    assert.equal(audSummary.bal - summaryCashDrop(shift, audSummary), 20);
  });
});
