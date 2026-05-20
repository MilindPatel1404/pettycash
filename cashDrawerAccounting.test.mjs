import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting preserves opening balances and live native currency movement", () => {
  const drawer = {
    id: 3,
    balance: 648.25,
    ccyBalances: { USD: 648.25, AUD: 65, AED: 150 },
  };
  const shift = {
    id: "SH-NEW",
    openingBal: 648.25,
    openingCcyBals: { USD: "648.25", AUD: "65", AED: "150" },
  };
  const txns = [
    { shiftId: "SH-NEW", amount: 100 },
    { shiftId: "SH-NEW", amount: -20 },
    { shiftId: "SH-NEW", amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
    { shiftId: "SH-OTHER", amount: 999, fxCcy: "AED", fxAmt: 999 },
  ];

  const accounting = buildCloseDrawerAccounting({
    drawer,
    shift,
    txns,
    counts: {},
    cashDrop: 50,
  });

  assert.deepEqual(accounting.expectedByCode, {
    USD: 728.25,
    AUD: 75,
    AED: 150,
  });
  assert.deepEqual(accounting.countedByCode, accounting.expectedByCode);
  assert.deepEqual(accounting.endingCcyBalances, {
    USD: 678.25,
    AUD: 75,
    AED: 150,
  });
  assert.equal(accounting.closingBal, 728.25);
  assert.equal(accounting.variance, 0);
});

test("counted balances override expected balances without applying USD drop to foreign cash", () => {
  const accounting = buildCloseDrawerAccounting({
    drawer: { ccyBalances: { USD: 500, AUD: 20 } },
    shift: { id: "SH-COUNTED", openingCcyBals: { USD: "500", AUD: "20" } },
    txns: [
      { shiftId: "SH-COUNTED", amount: 60 },
      { shiftId: "SH-COUNTED", amount: 3.25, fxCcy: "AUD", fxAmt: 5 },
    ],
    counts: { USD: "570", AUD: "30" },
    cashDrop: 70,
  });

  assert.deepEqual(accounting.countedByCode, {
    USD: 570,
    AUD: 30,
  });
  assert.deepEqual(accounting.endingCcyBalances, {
    USD: 500,
    AUD: 30,
  });
  assert.deepEqual(accounting.ccySummary.map(({ code, openingBal, totIn, bal, cashDrop, endingBal }) => ({
    code,
    openingBal,
    totIn,
    bal,
    cashDrop,
    endingBal,
  })), [
    { code: "USD", openingBal: 500, totIn: 60, bal: 570, cashDrop: 70, endingBal: 500 },
    { code: "AUD", openingBal: 20, totIn: 5, bal: 30, cashDrop: 0, endingBal: 30 },
  ]);
  assert.equal(accounting.variance, 10);
});
