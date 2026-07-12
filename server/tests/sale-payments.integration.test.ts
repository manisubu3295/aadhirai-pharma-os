import test from "node:test";
import assert from "node:assert/strict";
import { pool, storage, initializeDatabase } from "../storage";
import { InventoryPostingService } from "../services/inventory-posting.service";

const postingService = new InventoryPostingService();

let medicineId: number;
let batchId: number;
let customerId: number;
const createdSaleIds: number[] = [];

const BATCH_NUMBER = "SP-TEST-BATCH";
const EXPIRY_DATE = "2099-12-31";

test.before(async () => {
  await initializeDatabase();

  const medicine = await storage.createMedicine({
    name: "Sale Payments Test Medicine",
    manufacturer: "Test Manufacturer",
    category: "tablet",
    price: "10.00",
    mrp: "10.00",
    gstRate: "0",
    quantity: 0,
  } as any);
  medicineId = medicine.id;

  const customer = await storage.createCustomer({
    name: "Sale Payments Test Customer",
    outstandingBalance: "0",
  } as any);
  customerId = customer.id;

  const batchResult = await pool.query(
    `
      INSERT INTO inventory_batches (
        medicine_id, batch_number, expiry_date, unit_snapshot,
        conversion_factor_snapshot, total_inward_qty_base, available_qty_base
      ) VALUES ($1, $2, $3, 'TABLET', 1, 10000, 10000)
      RETURNING id
    `,
    [medicineId, BATCH_NUMBER, EXPIRY_DATE],
  );
  batchId = Number(batchResult.rows[0].id);
});

test.after(async () => {
  await pool.query(`DELETE FROM inventory_batches WHERE id = $1`, [batchId]);
  await storage.deleteCustomer(customerId);
  await storage.deleteMedicine(medicineId);
  await pool.end();
});

async function resetCustomerBalance() {
  await pool.query(`UPDATE customers SET outstanding_balance = '0' WHERE id = $1`, [customerId]);
}

async function cleanupSale(saleId: number) {
  await pool.query(`DELETE FROM sale_payments WHERE sale_id = $1`, [saleId]);
  await pool.query(`DELETE FROM sale_batch_allocations WHERE sale_id = $1`, [saleId]);
  await pool.query(`DELETE FROM inventory_ledger WHERE source_id = $1 AND txn_source = 'SALE'`, [saleId]);
  await pool.query(`DELETE FROM sale_items WHERE sale_id = $1`, [saleId]);
  await pool.query(`DELETE FROM sales WHERE id = $1`, [saleId]);
}

function makeLine(total: string) {
  return [
    {
      medicineId,
      medicineName: "Sale Payments Test Medicine",
      batchNumber: BATCH_NUMBER,
      expiryDate: EXPIRY_DATE,
      unitType: "TABLET",
      soldQtyBase: 1,
      soldQty: 1,
      conversionFactorSnapshot: 1,
      price: total,
      total,
    },
  ];
}

test("split sale (cash+upi, no credit) writes two sale_payments rows summing to total", async () => {
  const result = await postingService.postSale({
    header: {
      invoiceNo: `SPTEST-${Date.now()}-1`,
      customerId: null,
      customerName: "Walk-in",
      subtotal: "500",
      discount: "0",
      discountPercent: "0",
      cgst: "0",
      sgst: "0",
      tax: "0",
      total: "500",
      paymentMethod: "Split",
      receivedAmount: "500",
      changeAmount: "0",
      payments: [
        { method: "cash", amount: 300, reference: null },
        { method: "upi", amount: 200, reference: null },
      ],
    },
    lines: makeLine("500") as any,
  });
  createdSaleIds.push(result.sale.id);

  const paymentRows = await pool.query(`SELECT method, amount FROM sale_payments WHERE sale_id = $1 ORDER BY method`, [result.sale.id]);
  assert.equal(paymentRows.rows.length, 2);
  const total = paymentRows.rows.reduce((s, r) => s + Number(r.amount), 0);
  assert.equal(total, 500);
  assert.ok(paymentRows.rows.some((r) => r.method === "cash" && Number(r.amount) === 300));
  assert.ok(paymentRows.rows.some((r) => r.method === "upi" && Number(r.amount) === 200));

  await cleanupSale(result.sale.id);
});

test("split sale with credit remainder increases customer outstanding balance by exactly the credit portion", async () => {
  await resetCustomerBalance();

  const result = await postingService.postSale({
    header: {
      invoiceNo: `SPTEST-${Date.now()}-2`,
      customerId,
      customerName: "Sale Payments Test Customer",
      subtotal: "500",
      discount: "0",
      discountPercent: "0",
      cgst: "0",
      sgst: "0",
      tax: "0",
      total: "500",
      paymentMethod: "Split",
      receivedAmount: "300",
      changeAmount: "0",
      payments: [
        { method: "cash", amount: 200, reference: null },
        { method: "upi", amount: 100, reference: null },
        { method: "credit", amount: 200, reference: null },
      ],
    },
    lines: makeLine("500") as any,
  });
  createdSaleIds.push(result.sale.id);

  const paymentRows = await pool.query(`SELECT method, amount FROM sale_payments WHERE sale_id = $1`, [result.sale.id]);
  const creditRow = paymentRows.rows.find((r) => r.method === "credit");
  assert.ok(creditRow);
  assert.equal(Number(creditRow.amount), 200);

  const customer = await storage.getCustomer(customerId);
  assert.equal(Number(customer?.outstandingBalance || 0), 200);

  await cleanupSale(result.sale.id);
  await resetCustomerBalance();
});

test("single-method cash sale (legacy path via postSale fallback) writes exactly one sale_payments row", async () => {
  const result = await postingService.postSale({
    header: {
      invoiceNo: `SPTEST-${Date.now()}-3`,
      customerId: null,
      customerName: "Walk-in",
      subtotal: "150",
      discount: "0",
      discountPercent: "0",
      cgst: "0",
      sgst: "0",
      tax: "0",
      total: "150",
      paymentMethod: "cash",
      receivedAmount: "150",
      changeAmount: "0",
    },
    lines: makeLine("150") as any,
  });
  createdSaleIds.push(result.sale.id);

  const paymentRows = await pool.query(`SELECT method, amount FROM sale_payments WHERE sale_id = $1`, [result.sale.id]);
  assert.equal(paymentRows.rows.length, 1);
  assert.equal(paymentRows.rows[0].method, "cash");
  assert.equal(Number(paymentRows.rows[0].amount), 150);

  await cleanupSale(result.sale.id);
});
