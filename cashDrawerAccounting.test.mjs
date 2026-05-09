import test from "node:test";
import assert from "node:assert/strict";
import { summarizeShiftCash } from "./cashDrawerAccounting.mjs";

const shift = {
  id: "SH-1",
  openingBal: 500,
  openingCcyBals: { USD: 500, AUD: 10 },
};

const drawer = {
  balance: 500,
  ccyBalances: { USD: 500, AUD: 10 },
};

const txns = [
  { shiftId: "SH-1", amount: 125 },
  { shiftId: "SH-1", amount: -20 },
  { shiftId: "SH-1", amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
  { shiftId: "SH-1", amount: -3.25, fxCcy: "AUD", fxAmt: -5 },
  { shiftId: "OTHER", amount: 999 },
];

test("summarizeShiftCash carries opening balances plus shift transactions", () => {
  const result = summarizeShiftCash({ shift, drawer, txns, cashDrop: 100 });

  assert.equal(result.usdSystemBalance, 605);
  assert.equal(result.usdDrawerBalance, 605);
  assert.equal(result.usdEndingBalance, 505);
  assert.equal(result.cashIn, 125);
  assert.equal(result.cashOut, 20);
  assert.deepEqual(result.endingBalances, { USD: 505, AUD: 55 });

  const aud = result.summary.find(row => row.code === "AUD");
  assert.equal(aud.openingBal, 10);
  assert.equal(aud.totIn, 50);
  assert.equal(aud.totOut, 5);
  assert.equal(aud.sysBal, 55);
  assert.equal(aud.endingBal, 55);
});

test("summarizeShiftCash uses entered counts for variances and carried balances", () => {
  const result = summarizeShiftCash({
    shift,
    drawer,
    txns,
    counts: { USD: "600", AUD: "60" },
    cashDrop: 100,
  });

  assert.equal(result.usdDrawerBalance, 600);
  assert.equal(result.usdVariance, -5);
  assert.deepEqual(result.endingBalances, { USD: 500, AUD: 60 });

  const aud = result.summary.find(row => row.code === "AUD");
  assert.equal(aud.variance, 5);
});

test("summarizeShiftCash is safe before a drawer is selected", () => {
  const result = summarizeShiftCash();

  assert.deepEqual(result.summary.map(row => row.code), ["USD"]);
  assert.equal(result.usdSystemBalance, 0);
});

test("summarizeShiftCash trusts explicit shift USD opening over drawer snapshot", () => {
  const result = summarizeShiftCash({
    shift: { id: "SH-2", openingBal: 800 },
    drawer: { balance: 300, ccyBalances: { USD: 300, AUD: 10 } },
    txns: [{ shiftId: "SH-2", amount: 25 }],
  });

  assert.equal(result.usdSystemBalance, 825);
  assert.equal(result.summary.find(row => row.code === "AUD").sysBal, 10);
});
