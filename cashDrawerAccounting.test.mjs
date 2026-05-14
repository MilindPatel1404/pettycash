import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDrawerCloseAccounting } from "./cashDrawerAccounting.mjs";

describe("buildDrawerCloseAccounting", () => {
  it("keeps counted foreign balances and applies USD cash drop to the drawer balance", () => {
    const result = buildDrawerCloseAccounting({
      shift: {
        id: "SH-1",
        openingBal: 100,
        openingCcyBals: { USD: "100", AUD: "10" },
      },
      drawer: { balance: 100, ccyBalances: { USD: 100, AUD: 10 } },
      txns: [
        { shiftId: "SH-1", amount: 50 },
        { shiftId: "SH-1", amount: -10 },
        { shiftId: "SH-1", amount: 32.47, fxCcy: "AUD", fxAmt: 50 },
      ],
      counts: { USD: "140", AUD: "60" },
      cashDrop: 20,
    });

    assert.deepEqual(result.drawerBalances, { USD: 120, AUD: 60 });
    assert.equal(result.closingBal, 140);
    assert.equal(result.variance, 0);
    assert.deepEqual(
      result.ccySummary.map(({ code, totIn, totOut, bal, systemBal }) => ({
        code,
        totIn,
        totOut,
        bal,
        systemBal,
      })),
      [
        { code: "USD", totIn: 50, totOut: 10, bal: 140, systemBal: 140 },
        { code: "AUD", totIn: 50, totOut: 0, bal: 60, systemBal: 60 },
      ],
    );
  });

  it("falls back to system balances including opening foreign cash when counts are omitted", () => {
    const result = buildDrawerCloseAccounting({
      shift: {
        id: "SH-2",
        openingBal: 200,
        openingCcyBals: { USD: "200", AED: "15" },
      },
      txns: [
        { shiftId: "SH-2", amount: 25 },
        { shiftId: "SH-2", amount: 5.45, fxCcy: "AED", fxAmt: 20 },
      ],
    });

    assert.deepEqual(result.closingBalances, { USD: 225, AED: 35 });
    assert.deepEqual(result.drawerBalances, { USD: 225, AED: 35 });
    assert.equal(result.cashIn, 25);
    assert.equal(result.cashOut, 0);
  });

  it("ignores transactions from other shifts", () => {
    const result = buildDrawerCloseAccounting({
      shift: { id: "SH-3", openingBal: 75, openingCcyBals: { USD: "75" } },
      txns: [
        { shiftId: "SH-3", amount: 10 },
        { shiftId: "OTHER", amount: 999 },
      ],
    });

    assert.deepEqual(result.systemBalances, { USD: 85 });
    assert.equal(result.closingBal, 85);
  });
});
