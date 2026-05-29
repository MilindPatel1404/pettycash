import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting carries opening native balances through transactions and USD drop", () => {
  const drawer = { id: 1, balance: 500, ccyBalances: { USD: 500, AUD: 10 } };
  const shift = {
    id: "SH-TEST",
    openingBal: 500,
    openingCcyBals: { USD: "500.00", AUD: "10.00" },
  };
  const txns = [
    { shiftId: "SH-TEST", amount: 100 },
    { shiftId: "SH-TEST", amount: -25 },
    { shiftId: "SH-TEST", amount: 20, fxCcy: "AUD", fxAmt: 30 },
    { shiftId: "SH-TEST", amount: -3.25, fxCcy: "AUD", fxAmt: -5 },
  ];

  const result = buildCloseDrawerAccounting({ drawer, shift, txns, counts: {}, cashDrop: "50" });

  assert.deepEqual(result.endingCcyBalances, { USD: 525, AUD: 35 });
  assert.deepEqual(
    result.ccySummary.map(row => ({
      code: row.code,
      openingBal: row.openingBal,
      totIn: row.totIn,
      totOut: row.totOut,
      bal: row.bal,
      cashDrop: row.cashDrop,
      endingBal: row.endingBal,
    })),
    [
      { code: "USD", openingBal: 500, totIn: 100, totOut: 25, bal: 575, cashDrop: 50, endingBal: 525 },
      { code: "AUD", openingBal: 10, totIn: 30, totOut: 5, bal: 35, cashDrop: 0, endingBal: 35 },
    ],
  );
});

test("blank counts use the ledger balance while entered counts record variance", () => {
  const drawer = { id: 1, balance: 200, ccyBalances: { USD: 200, AED: 4 } };
  const shift = {
    id: "SH-COUNT",
    openingBal: 200,
    openingCcyBals: { USD: "200", AED: "4" },
  };
  const txns = [
    { shiftId: "SH-COUNT", amount: 25 },
    { shiftId: "SH-COUNT", amount: 5, fxCcy: "AED", fxAmt: 18 },
  ];

  const result = buildCloseDrawerAccounting({
    drawer,
    shift,
    txns,
    counts: { USD: "", AED: "20" },
    cashDrop: "",
  });

  assert.equal(result.byCode.USD.bal, 225);
  assert.equal(result.byCode.USD.hasCount, false);
  assert.equal(result.byCode.AED.expectedBal, 22);
  assert.equal(result.byCode.AED.bal, 20);
  assert.equal(result.byCode.AED.variance, -2);
});
