import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSalePaymentPlan,
  buildLegacyPaymentPlan,
  resolveSalePayments,
  getSaleCreditPortion,
  isSaleCreditBill,
} from "../../shared/salePayments";

test("split payment across cash+upi exactly equals total", () => {
  const plan = buildSalePaymentPlan({
    total: 500,
    rows: [
      { method: "cash", amount: 300 },
      { method: "upi", amount: 200 },
    ],
    hasCustomer: false,
  });
  assert.equal(plan.paymentMethod, "Split");
  assert.equal(plan.rows.length, 2);
  assert.equal(plan.creditPortion, 0);
  assert.equal(plan.changeAmount, 0);
  assert.equal(plan.error, null);
});

test("split payment with customer credit remainder", () => {
  const plan = buildSalePaymentPlan({
    total: 500,
    rows: [
      { method: "cash", amount: 200 },
      { method: "upi", amount: 100 },
    ],
    hasCustomer: true,
  });
  assert.equal(plan.creditPortion, 200);
  assert.equal(plan.rows.length, 3);
  assert.ok(plan.rows.some((r) => r.method === "credit" && r.amount === 200));
  assert.equal(plan.paymentMethod, "Split");
  assert.equal(plan.error, null);
});

test("split payment credit remainder rejected without customer", () => {
  const plan = buildSalePaymentPlan({
    total: 500,
    rows: [{ method: "cash", amount: 200 }],
    hasCustomer: false,
  });
  assert.equal(plan.creditPortion, 300);
  assert.equal(plan.error, "Select a customer to record a credit remainder.");
});

test("split payment overpay with a cash row computes change, no error", () => {
  const plan = buildSalePaymentPlan({
    total: 500,
    rows: [
      { method: "cash", amount: 350 },
      { method: "upi", amount: 200 },
    ],
    hasCustomer: false,
  });
  assert.equal(plan.changeAmount, 50);
  assert.equal(plan.receivedAmount, 550);
  assert.equal(plan.error, null);
});

test("split payment overpay without a cash row is rejected", () => {
  const plan = buildSalePaymentPlan({
    total: 500,
    rows: [{ method: "upi", amount: 520 }],
    hasCustomer: false,
  });
  assert.equal(plan.error, "Change can only be returned for cash payments — add or increase a cash payment row.");
});

test("single-row split plan is not labeled Split (regression guard)", () => {
  const plan = buildSalePaymentPlan({
    total: 500,
    rows: [{ method: "cash", amount: 500 }],
    hasCustomer: false,
  });
  assert.equal(plan.paymentMethod, "cash");
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.creditPortion, 0);
});

test("legacy plan: full cash sale writes a single cash row", () => {
  const legacy = buildLegacyPaymentPlan({ total: 500, paymentMethod: "cash", receivedAmount: 500 });
  assert.deepEqual(legacy.rows, [{ method: "cash", amount: 500, reference: null }]);
  assert.equal(legacy.creditPortion, 0);
});

test("legacy plan: full credit sale (zero received) writes a single credit row", () => {
  const legacy = buildLegacyPaymentPlan({ total: 500, paymentMethod: "credit", receivedAmount: 0 });
  assert.deepEqual(legacy.rows, [{ method: "credit", amount: 500, reference: null }]);
  assert.equal(legacy.creditPortion, 500);
});

test("legacy plan: partial credit sale attributes the received portion to cash", () => {
  const legacy = buildLegacyPaymentPlan({ total: 500, paymentMethod: "credit", receivedAmount: 300 });
  assert.equal(legacy.rows.length, 2);
  assert.ok(legacy.rows.some((r) => r.method === "cash" && r.amount === 300));
  assert.ok(legacy.rows.some((r) => r.method === "credit" && r.amount === 200));
  assert.equal(legacy.creditPortion, 200);
  const sumOfRows = legacy.rows.reduce((s, r) => s + r.amount, 0);
  assert.equal(sumOfRows, 500);
});

test("resolveSalePayments synthesizes a virtual row for a historical cash sale", () => {
  const rows = resolveSalePayments(
    { paymentMethod: "cash", receivedAmount: "500", total: "500", customerId: null },
    undefined,
  );
  assert.deepEqual(rows, [{ method: "cash", amount: 500, reference: null }]);
});

test("resolveSalePayments synthesizes cash+credit virtual rows for a historical partial-credit sale", () => {
  const rows = resolveSalePayments(
    { paymentMethod: "credit", receivedAmount: "200", total: "500", customerId: 7 },
    undefined,
  );
  assert.equal(rows.length, 2);
  assert.ok(rows.some((r) => r.method === "cash" && r.amount === 200));
  assert.ok(rows.some((r) => r.method === "credit" && r.amount === 300));
});

test("resolveSalePayments returns real rows as-is when present", () => {
  const real = [{ method: "cash", amount: "300", reference: null }, { method: "upi", amount: "200", reference: "txn1" }];
  const rows = resolveSalePayments(
    { paymentMethod: "Split", receivedAmount: "500", total: "500", customerId: null },
    real,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].amount, 200);
});

test("getSaleCreditPortion sums multiple credit rows", () => {
  const real = [
    { method: "cash", amount: "100", reference: null },
    { method: "credit", amount: "150", reference: null },
    { method: "credit", amount: "50", reference: null },
  ];
  const portion = getSaleCreditPortion(
    { paymentMethod: "Split", receivedAmount: "100", total: "300", customerId: 3 },
    real,
  );
  assert.equal(portion, 200);
});

test("isSaleCreditBill is false when there is no credit row", () => {
  const real = [{ method: "cash", amount: "500", reference: null }];
  assert.equal(
    isSaleCreditBill({ paymentMethod: "cash", receivedAmount: "500", total: "500", customerId: null }, real),
    false,
  );
});
