import test from "node:test";
import assert from "node:assert/strict";
import { positiveAmount, resolvePettyCashShiftId, validatePettyCashPayout } from "./pettyCashGuards.mjs";

test("petty cash resolves the open shift for the linked drawer", () => {
  const shiftId = resolvePettyCashShiftId({
    fund: { drawerId: "1" },
    shifts: [
      { id: "SH-BAR", drawerId: 2, status: "Open" },
      { id: "SH-FRONT", drawerId: 1, status: "Open" },
    ],
  });

  assert.equal(shiftId, "SH-FRONT");
});

test("petty cash payout cannot overdraw the fund", () => {
  assert.deepEqual(validatePettyCashPayout({ amount: "125", currentBalance: 100 }), {
    valid: false,
    amount: 125,
    reason: "Amount exceeds the fund balance.",
  });
});

test("financial amount validation rejects zero and negative values", () => {
  assert.equal(positiveAmount("0"), null);
  assert.equal(positiveAmount("-10"), null);
  assert.equal(positiveAmount("10.50"), 10.5);
});
