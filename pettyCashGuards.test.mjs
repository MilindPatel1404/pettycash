import test from "node:test";
import assert from "node:assert/strict";
import { canPayPettyCash, positiveFiniteAmount, shiftIdForPettyFund } from "./pettyCashGuards.mjs";

test("petty cash transactions use the linked drawer's open shift", () => {
  const shifts = [
    { id: "SH-FRONT", drawerId: 1, status: "Open" },
    { id: "SH-BAR", drawerId: 2, status: "Open" },
  ];

  assert.equal(shiftIdForPettyFund({ drawerId: "2" }, shifts), "SH-BAR");
  assert.equal(shiftIdForPettyFund({ drawerId: "1" }, shifts), "SH-FRONT");
});

test("ambiguous unlinked petty cash activity falls back to manual shift", () => {
  const shifts = [
    { id: "SH-FRONT", drawerId: 1, status: "Open" },
    { id: "SH-BAR", drawerId: 2, status: "Open" },
  ];

  assert.equal(shiftIdForPettyFund({ drawerId: "" }, shifts), "SH-MANUAL");
});

test("petty cash payout validation rejects invalid amounts and overdrafts", () => {
  const fund = { currentBalance: 78 };

  assert.equal(positiveFiniteAmount("-1"), null);
  assert.equal(positiveFiniteAmount("0"), null);
  assert.equal(canPayPettyCash(fund, "100").ok, false);
  assert.deepEqual(canPayPettyCash(fund, "55"), { ok: true, amount: 55 });
});
