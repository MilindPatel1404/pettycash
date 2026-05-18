import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseAccounting, buildShiftCurrencySummary } from "./cashDrawerAccounting.mjs";

const shift = {
  id: "SH-TEST-001",
  openingBal: 500,
  openingCcyBals: { USD: "500.00", AUD: "10.00", AED: "1.00" },
};

const txns = [
  { id: "TXN-USD-IN", shiftId: shift.id, amount: 100, ccy: "USD" },
  { id: "TXN-USD-OUT", shiftId: shift.id, amount: -20, ccy: "USD" },
  { id: "TXN-AUD-IN", shiftId: shift.id, amount: 6.49, ccy: "USD", fxCcy: "AUD", fxAmt: 10, fxRate: 1.54 },
  { id: "TXN-AUD-OUT", shiftId: shift.id, amount: -1.95, ccy: "USD", fxCcy: "AUD", fxAmt: -3, fxRate: 1.54 },
  { id: "TXN-AED-IN", shiftId: shift.id, amount: 5.45, ccy: "USD", fxCcy: "AED", fxAmt: 20, fxRate: 3.67 },
];

test("active shift summaries include opening native balances", () => {
  const summary = buildShiftCurrencySummary({ shift, txns });
  const byCode = Object.fromEntries(summary.map(row => [row.code, row]));

  assert.equal(byCode.USD.openingBal, 500);
  assert.equal(byCode.USD.bal, 580);
  assert.equal(byCode.AUD.openingBal, 10);
  assert.equal(byCode.AUD.totIn, 10);
  assert.equal(byCode.AUD.totOut, 3);
  assert.equal(byCode.AUD.bal, 17);
  assert.equal(byCode.AED.openingBal, 1);
  assert.equal(byCode.AED.bal, 21);
});

test("close accounting preserves foreign cash and applies cash drop only to USD", () => {
  const close = buildCloseAccounting({
    shift,
    txns,
    counts: { USD: "590.00", AUD: "17.00", AED: "21.00" },
    cashDrop: "100.00",
  });

  assert.equal(close.closingBal, 590);
  assert.equal(close.endingBal, 490);
  assert.equal(close.cashDrop, 100);
  assert.equal(close.variance, 10);
  assert.deepEqual(close.endingCcyBalances, { USD: 490, AUD: 17, AED: 21 });

  const byCode = close.byCode;
  assert.equal(byCode.USD.cashDrop, 100);
  assert.equal(byCode.USD.endingBal, 490);
  assert.equal(byCode.AUD.cashDrop, 0);
  assert.equal(byCode.AUD.endingBal, 17);
  assert.equal(byCode.AED.cashDrop, 0);
  assert.equal(byCode.AED.endingBal, 21);
});

test("blank counts fall back to ledger balances instead of zeroing the drawer", () => {
  const close = buildCloseAccounting({
    shift,
    txns,
    counts: { USD: "", AUD: "" },
    cashDrop: "",
  });

  assert.equal(close.byCode.USD.countedBal, 580);
  assert.equal(close.byCode.AUD.countedBal, 17);
  assert.equal(close.byCode.AED.countedBal, 21);
  assert.deepEqual(close.endingCcyBalances, { USD: 580, AUD: 17, AED: 21 });
});
