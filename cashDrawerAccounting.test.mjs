import assert from "node:assert/strict";
import test from "node:test";

import { buildCloseDrawerAccounting } from "./cashDrawerAccounting.mjs";

test("close accounting includes opening native balances and persists post-drop balances", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { id:1, balance:385.75, ccyBalances:{ USD:385.75, AUD:10, AED:1 } },
    shift: { id:"SH-1", openingBal:385.75, openingCcyBals:{ USD:"385.75", AUD:"10.00", AED:"1.00" } },
    txns: [
      { id:"USD-IN", amount:100, ccy:"USD" },
      { id:"USD-OUT", amount:-10, ccy:"USD" },
      { id:"AUD-IN", amount:6.49, ccy:"USD", fxCcy:"AUD", fxAmt:10 },
      { id:"AED-IN", amount:5.45, ccy:"USD", fxCcy:"AED", fxAmt:20 },
    ],
    countedBalances: { USD:"475.75", AUD:"20", AED:"21" },
    cashDrop: "75.75",
  });

  assert.equal(result.closingBal, 475.75);
  assert.equal(result.endingBal, 400);
  assert.deepEqual(result.endingCcyBalances, { USD:400, AUD:20, AED:21 });
  assert.equal(result.variance, 0);
  assert.deepEqual(
    result.ccySummary.map(({ code, openingBal, expectedBal, bal, cashDrop, endingBal }) => ({
      code,
      openingBal,
      expectedBal,
      bal,
      cashDrop,
      endingBal,
    })),
    [
      { code:"USD", openingBal:385.75, expectedBal:475.75, bal:475.75, cashDrop:75.75, endingBal:400 },
      { code:"AUD", openingBal:10, expectedBal:20, bal:20, cashDrop:0, endingBal:20 },
      { code:"AED", openingBal:1, expectedBal:21, bal:21, cashDrop:0, endingBal:21 },
    ]
  );
});

test("legacy open shifts fall back to drawer currency balances before live transactions", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { id:1, balance:385.75, ccyBalances:{ USD:385.75, AUD:10 } },
    shift: { id:"SH-LEGACY", openingBal:812.75 },
    txns: [
      { id:"AUD-IN", amount:32.47, ccy:"USD", fxCcy:"AUD", fxAmt:50 },
    ],
  });

  assert.equal(result.summaryByCode.USD.openingBal, 385.75);
  assert.equal(result.summaryByCode.USD.expectedBal, 385.75);
  assert.equal(result.summaryByCode.AUD.openingBal, 10);
  assert.equal(result.summaryByCode.AUD.expectedBal, 60);
  assert.deepEqual(result.endingCcyBalances, { USD:385.75, AUD:60 });
});

test("blank counted balances use the ledger expected balance", () => {
  const result = buildCloseDrawerAccounting({
    drawer: { id:2, ccyBalances:{ USD:500 } },
    shift: { id:"SH-2", openingCcyBals:{ USD:"500" } },
    txns: [{ id:"USD-IN", amount:45, ccy:"USD" }],
    countedBalances: { USD:"" },
  });

  assert.equal(result.closingBal, 545);
  assert.equal(result.variance, 0);
  assert.deepEqual(result.endingCcyBalances, { USD:545 });
});
