import assert from "node:assert/strict";
import test from "node:test";
import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting carries opening native balances through counted close and USD-only drop", () => {
  const shift = {
    id: "SH-1",
    openingBal: 100,
    openingCcyBals: { USD: "100.00", AUD: "10.00", AED: "1.00" },
  };
  const drawer = { balance: 100, ccyBalances: { USD: 100, AUD: 10, AED: 1 } };
  const txns = [
    { shiftId: "SH-1", amount: 50, ccy: "USD" },
    { shiftId: "SH-1", amount: -20, ccy: "USD" },
    { shiftId: "SH-1", amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10 },
    { shiftId: "SH-1", amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20 },
  ];

  const result = buildCloseDrawerAccounting({
    shift,
    drawer,
    txns,
    counts: { USD: "130.00", AUD: "20.00", AED: "21.00" },
    cashDrop: "30.00",
  });

  assert.deepEqual(result.expectedByCode, { USD: 130, AUD: 20, AED: 21 });
  assert.deepEqual(result.countedByCode, { USD: 130, AUD: 20, AED: 21 });
  assert.deepEqual(result.endingCcyBalances, { USD: 100, AUD: 20, AED: 21 });
  assert.equal(result.cashDrop, 30);
  assert.equal(result.closingBal, 130);
  assert.equal(result.endingBalance, 100);
  assert.equal(result.ccySummary.find((row) => row.code === "AUD").cashDrop, 0);
  assert.equal(result.ccySummary.find((row) => row.code === "AED").endingBal, 21);
});

test("blank counts fall back to expected balances and preserve legacy drawer currency openings", () => {
  const shift = { id: "SH-LEGACY", openingBal: 500 };
  const drawer = { balance: 500, ccyBalances: { USD: 500, AUD: 65 } };
  const txns = [
    { shiftId: "SH-LEGACY", amount: 100, ccy: "USD" },
    { shiftId: "SH-LEGACY", amount: 32.47, ccy: "USD", fxCcy: "AUD", fxAmt: 50 },
  ];

  const result = buildCloseDrawerAccounting({
    shift,
    drawer,
    txns,
    counts: { USD: "", AUD: "" },
    cashDrop: "",
  });

  assert.deepEqual(result.expectedByCode, { USD: 600, AUD: 115 });
  assert.deepEqual(result.countedByCode, { USD: 600, AUD: 115 });
  assert.deepEqual(result.endingCcyBalances, { USD: 600, AUD: 115 });
});
