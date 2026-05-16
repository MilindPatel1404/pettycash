import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveNumber } from "./moneyInput.mjs";

test("parsePositiveNumber accepts positive finite numbers", () => {
  assert.equal(parsePositiveNumber("12.50"), 12.5);
  assert.equal(parsePositiveNumber(" 7 "), 7);
  assert.equal(parsePositiveNumber(3), 3);
  assert.equal(parsePositiveNumber("1e2"), 100);
});

test("parsePositiveNumber rejects values that would corrupt financial direction", () => {
  assert.equal(parsePositiveNumber(""), null);
  assert.equal(parsePositiveNumber("0"), null);
  assert.equal(parsePositiveNumber(0), null);
  assert.equal(parsePositiveNumber("-10"), null);
  assert.equal(parsePositiveNumber(-10), null);
  assert.equal(parsePositiveNumber("12abc"), null);
  assert.equal(parsePositiveNumber("1e309"), null);
  assert.equal(parsePositiveNumber(Number.POSITIVE_INFINITY), null);
  assert.equal(parsePositiveNumber(Number.NaN), null);
  assert.equal(parsePositiveNumber(undefined), null);
  assert.equal(parsePositiveNumber(null), null);
});
