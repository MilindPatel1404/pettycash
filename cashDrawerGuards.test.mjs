import assert from "node:assert/strict";
import test from "node:test";

import { isDrawerInUse } from "./cashDrawerGuards.mjs";

test("drawer cannot be deleted while assigned to an active user", () => {
  assert.equal(isDrawerInUse({ id: 1, inUseBy: "Raj Kumar", currentShift: null }), true);
});

test("drawer cannot be deleted while it has an active shift id", () => {
  assert.equal(isDrawerInUse({ id: 2, inUseBy: null, currentShift: "SH-20250724-004" }), true);
});

test("closed drawer without an active user or shift can be deleted", () => {
  assert.equal(isDrawerInUse({ id: 3, inUseBy: null, currentShift: null }), false);
});
