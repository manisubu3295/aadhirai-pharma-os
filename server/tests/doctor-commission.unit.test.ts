import test from "node:test";
import assert from "node:assert/strict";
import { computeDoctorCommission } from "../../shared/doctorCommission";

test("percentage of pre-tax subtotal", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "subtotal_pretax", commissionRate: 5, commissionFixedAmount: null, minSaleAmount: 0 },
    { subtotal: 1000, total: 1180 },
  );
  assert.equal(commission, 50);
});

test("percentage of GST-inclusive total", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "total_with_gst", commissionRate: 5, commissionFixedAmount: null, minSaleAmount: 0 },
    { subtotal: 1000, total: 1180 },
  );
  assert.equal(commission, 59);
});

test("fixed amount ignores sale size", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "fixed", commissionRate: null, commissionFixedAmount: 75, minSaleAmount: 0 },
    { subtotal: 50, total: 59 },
  );
  assert.equal(commission, 75);
});

test("no commission configured returns 0", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: null, commissionRate: null, commissionFixedAmount: null, minSaleAmount: null },
    { subtotal: 1000, total: 1180 },
  );
  assert.equal(commission, 0);
});

test("sale below minSaleAmount threshold earns nothing", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "subtotal_pretax", commissionRate: 5, commissionFixedAmount: null, minSaleAmount: 500 },
    { subtotal: 400, total: 472 },
  );
  assert.equal(commission, 0);
});

test("sale exactly at the minSaleAmount threshold earns commission", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "subtotal_pretax", commissionRate: 5, commissionFixedAmount: null, minSaleAmount: 500 },
    { subtotal: 500, total: 590 },
  );
  assert.equal(commission, 25);
});

test("fixed basis still respects the minSaleAmount threshold", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "fixed", commissionRate: null, commissionFixedAmount: 75, minSaleAmount: 500 },
    { subtotal: 400, total: 472 },
  );
  assert.equal(commission, 0);
});

test("zero or missing rate on a percentage basis earns nothing", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "subtotal_pretax", commissionRate: 0, commissionFixedAmount: null, minSaleAmount: 0 },
    { subtotal: 1000, total: 1180 },
  );
  assert.equal(commission, 0);
});

test("string-typed numeric fields (as returned by the DB) are handled correctly", () => {
  const commission = computeDoctorCommission(
    { commissionBasis: "subtotal_pretax", commissionRate: "5.00", commissionFixedAmount: null, minSaleAmount: "0" },
    { subtotal: 1000, total: 1180 },
  );
  assert.equal(commission, 50);
});
