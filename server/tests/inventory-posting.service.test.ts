import test from "node:test";
import assert from "node:assert/strict";
import { applyBaseDelta, toBaseQty } from "../services/inventory-posting.service";

test("purchase 10 strips x 15 converts to 150 tablets", () => {
  const inwardQtyBase = toBaseQty(10, 15);
  assert.equal(inwardQtyBase, 150);
});

test("sell 18 tablets after 150 leaves 132", () => {
  const openingBase = 150;
  const soldQtyBase = toBaseQty(18, 1);
  const remaining = applyBaseDelta(openingBase, -soldQtyBase);
  assert.equal(remaining, 132);
});

test("sell 2 strips after remaining 132 leaves 102", () => {
  const openingBase = 132;
  const soldQtyBase = toBaseQty(2, 15);
  const remaining = applyBaseDelta(openingBase, -soldQtyBase);
  assert.equal(remaining, 102);
});

test("purchase 4 packs x 12 converts to 48 base units", () => {
  const inwardQtyBase = toBaseQty(4, 12);
  assert.equal(inwardQtyBase, 48);
});
