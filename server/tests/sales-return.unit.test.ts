import test from "node:test";
import assert from "node:assert/strict";
import { computeReturnRefund } from "../../shared/salesReturns";

test("strip item: returning 1 strip (10 base) of a Rs.50/strip line refunds 50, not 500", () => {
  // Sale line: 1 strip of 10 tablets, quantity stored as 10 base units,
  // total Rs.50 — the old price-based math refunded 10 x 50 = 500.
  const result = computeReturnRefund({
    lineTotal: 50,
    quantitySold: 10,
    alreadyReturned: 0,
    quantityReturned: 10,
  });
  assert.equal(result.refundAmount, 50);
  assert.equal(result.pricePerUnit, 5);
});

test("2 strips sold, 1 strip returned refunds half the paid line total", () => {
  const result = computeReturnRefund({
    lineTotal: 100,
    quantitySold: 20,
    alreadyReturned: 0,
    quantityReturned: 10,
  });
  assert.equal(result.refundAmount, 50);
  assert.equal(result.pricePerUnit, 5);
});

test("legacy base-unit row (price per unit, displayQty defaulted): paid rate refunded", () => {
  // 10 units at Rs.9.50 each with Rs.5 discount: total 90.00
  const result = computeReturnRefund({
    lineTotal: 90,
    quantitySold: 10,
    alreadyReturned: 0,
    quantityReturned: 4,
  });
  assert.equal(result.refundAmount, 36);
});

test("partial returns never exceed the line total (cumulative prorate)", () => {
  const first = computeReturnRefund({
    lineTotal: 99.99,
    quantitySold: 10,
    alreadyReturned: 0,
    quantityReturned: 5,
  });
  const second = computeReturnRefund({
    lineTotal: 99.99,
    quantitySold: 10,
    alreadyReturned: 5,
    quantityReturned: 5,
  });
  assert.equal(first.refundAmount, 50);
  assert.equal(second.refundAmount, 49.99);
  assert.equal(Math.round((first.refundAmount + second.refundAmount) * 100) / 100, 99.99);
});

test("full return in one go refunds exactly the line total", () => {
  const result = computeReturnRefund({
    lineTotal: 123.45,
    quantitySold: 7,
    alreadyReturned: 0,
    quantityReturned: 7,
  });
  assert.equal(result.refundAmount, 123.45);
});

test("three-way partial returns still sum to the line total", () => {
  const args = { lineTotal: 100, quantitySold: 3 };
  const r1 = computeReturnRefund({ ...args, alreadyReturned: 0, quantityReturned: 1 });
  const r2 = computeReturnRefund({ ...args, alreadyReturned: 1, quantityReturned: 1 });
  const r3 = computeReturnRefund({ ...args, alreadyReturned: 2, quantityReturned: 1 });
  assert.equal(Math.round((r1.refundAmount + r2.refundAmount + r3.refundAmount) * 100) / 100, 100);
});

test("invalid inputs return zero", () => {
  assert.deepEqual(
    computeReturnRefund({ lineTotal: NaN, quantitySold: 10, alreadyReturned: 0, quantityReturned: 5 }),
    { refundAmount: 0, pricePerUnit: 0 },
  );
  assert.deepEqual(
    computeReturnRefund({ lineTotal: 50, quantitySold: 0, alreadyReturned: 0, quantityReturned: 5 }),
    { refundAmount: 0, pricePerUnit: 0 },
  );
  assert.deepEqual(
    computeReturnRefund({ lineTotal: 50, quantitySold: 10, alreadyReturned: 0, quantityReturned: 0 }),
    { refundAmount: 0, pricePerUnit: 0 },
  );
});
