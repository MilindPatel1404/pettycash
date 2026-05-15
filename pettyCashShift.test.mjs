import assert from "node:assert/strict";
import test from "node:test";

import { MANUAL_SHIFT_ID, resolvePettyCashShiftId } from "./pettyCashShift.mjs";

test("uses the linked drawer's current open shift for petty cash activity", () => {
  const drawers = [
    { id: 1, currentShift: "SH-FRONT" },
    { id: 2, currentShift: "SH-BAR" },
  ];
  const shifts = [
    { id: "SH-BAR", status: "Open" },
    { id: "SH-FRONT", status: "Open" },
  ];

  assert.equal(
    resolvePettyCashShiftId({ fund: { drawerId: "1" }, drawers, shifts }),
    "SH-FRONT"
  );
});

test("does not guess a global shift when multiple shifts are open and the fund is unlinked", () => {
  const shifts = [
    { id: "SH-BAR", status: "Open" },
    { id: "SH-FRONT", status: "Open" },
  ];

  assert.equal(resolvePettyCashShiftId({ fund: {}, shifts }), MANUAL_SHIFT_ID);
});

test("keeps single-shift fallback for unlinked activity", () => {
  const shifts = [
    { id: "SH-CLOSED", status: "Closed" },
    { id: "SH-ONLY", status: "Open" },
  ];

  assert.equal(resolvePettyCashShiftId({ fund: {}, shifts }), "SH-ONLY");
});
