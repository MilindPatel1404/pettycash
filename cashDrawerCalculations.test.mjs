import assert from "node:assert/strict";
import {
  buildEndingCurrencyBalances,
  buildShiftCurrencySummary,
  cashDropForCurrency,
  endingBalanceForCurrency,
} from "./cashDrawerCalculations.mjs";

const summary = [
  { code: "USD", bal: 680 },
  { code: "AUD", bal: 67 },
  { code: "AED", bal: 21 },
];

assert.equal(cashDropForCurrency("USD", 100), 100);
assert.equal(cashDropForCurrency("AUD", 100), 0);
assert.equal(endingBalanceForCurrency(summary[0], 100), 580);
assert.equal(endingBalanceForCurrency(summary[1], 100), 67);
assert.deepEqual(buildEndingCurrencyBalances(summary, 100), {
  USD: 580,
  AUD: 67,
  AED: 21,
});

const shift = {
  openingBal: 500,
  openingCcyBals: { USD: "500", AUD: "10" },
};
const txns = [
  { amount: 80 },
  { amount: -20 },
  { amount: 6.49, fxCcy: "AUD", fxAmt: 10 },
];

assert.deepEqual(buildShiftCurrencySummary(shift, txns, {}, "USD"), [
  { code: "USD", inCount: 1, outCount: 1, totIn: 80, totOut: 20, bal: 560 },
  { code: "AUD", inCount: 1, outCount: 0, totIn: 10, totOut: 0, bal: 20 },
]);

assert.deepEqual(buildShiftCurrencySummary(shift, txns, { USD: "525", AUD: "18" }, "USD"), [
  { code: "USD", inCount: 1, outCount: 1, totIn: 80, totOut: 20, bal: 525 },
  { code: "AUD", inCount: 1, outCount: 0, totIn: 10, totOut: 0, bal: 18 },
]);
