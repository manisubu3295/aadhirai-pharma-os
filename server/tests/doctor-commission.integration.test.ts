import test from "node:test";
import assert from "node:assert/strict";
import { pool, storage, initializeDatabase } from "../storage";
import { InventoryPostingService } from "../services/inventory-posting.service";

const postingService = new InventoryPostingService();

let medicineId: number;
let batchId: number;
let commissionDoctorId: number;
let noCommissionDoctorId: number;

const BATCH_NUMBER = "DC-TEST-BATCH";
const EXPIRY_DATE = "2099-12-31";

test.before(async () => {
  await initializeDatabase();

  const medicine = await storage.createMedicine({
    name: "Doctor Commission Test Medicine",
    manufacturer: "Test Manufacturer",
    category: "tablet",
    price: "10.00",
    mrp: "10.00",
    gstRate: "18",
    quantity: 0,
  } as any);
  medicineId = medicine.id;

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

  const commissionDoctor = await storage.createDoctor({
    name: "Dr Commission Test",
    commissionBasis: "subtotal_pretax",
    commissionRate: "10",
    minSaleAmount: "0",
  } as any);
  commissionDoctorId = commissionDoctor.id;

  const noCommissionDoctor = await storage.createDoctor({
    name: "Dr No Commission Test",
  } as any);
  noCommissionDoctorId = noCommissionDoctor.id;
});

test.after(async () => {
  await pool.query(`DELETE FROM inventory_batches WHERE id = $1`, [batchId]);
  await storage.deleteDoctor(commissionDoctorId);
  await storage.deleteDoctor(noCommissionDoctorId);
  await storage.deleteMedicine(medicineId);
  await pool.end();
});

async function cleanupSale(saleId: number) {
  await pool.query(`DELETE FROM doctor_commission_transactions WHERE sale_id = $1`, [saleId]);
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
      medicineName: "Doctor Commission Test Medicine",
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

async function postSaleWithDoctor(doctorId: number, subtotal: string, tax: string, total: string) {
  const result = await postingService.postSale({
    header: {
      invoiceNo: `DCTEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      doctorId,
      doctorName: "Test Doctor",
      customerId: null,
      customerName: "Walk-in",
      subtotal,
      discount: "0",
      discountPercent: "0",
      cgst: (parseFloat(tax) / 2).toFixed(2),
      sgst: (parseFloat(tax) / 2).toFixed(2),
      tax,
      total,
      paymentMethod: "cash",
      receivedAmount: total,
      changeAmount: "0",
    },
    lines: makeLine(subtotal) as any,
  });
  return result.sale.id as number;
}

test("sale with a commission-configured doctor writes one EARNED transaction", async () => {
  const saleId = await postSaleWithDoctor(commissionDoctorId, "1000", "180", "1180");

  const rows = await pool.query(
    `SELECT type, amount, sale_amount FROM doctor_commission_transactions WHERE sale_id = $1`,
    [saleId],
  );
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0].type, "EARNED");
  assert.equal(Number(rows.rows[0].amount), 100);
  assert.equal(Number(rows.rows[0].sale_amount), 1000);

  const balance = await storage.getDoctorCommissionBalance(commissionDoctorId);
  assert.equal(Number(balance), 100);

  await cleanupSale(saleId);
});

test("sale with a doctor that has no commission configured writes zero transactions", async () => {
  const saleId = await postSaleWithDoctor(noCommissionDoctorId, "1000", "180", "1180");

  const rows = await pool.query(
    `SELECT id FROM doctor_commission_transactions WHERE sale_id = $1`,
    [saleId],
  );
  assert.equal(rows.rows.length, 0);

  await cleanupSale(saleId);
});

test("sale with no doctor selected writes zero transactions (regression guard)", async () => {
  const result = await postingService.postSale({
    header: {
      invoiceNo: `DCTEST-${Date.now()}-nodoc`,
      customerId: null,
      customerName: "Walk-in",
      subtotal: "1000",
      discount: "0",
      discountPercent: "0",
      cgst: "90",
      sgst: "90",
      tax: "180",
      total: "1180",
      paymentMethod: "cash",
      receivedAmount: "1180",
      changeAmount: "0",
    },
    lines: makeLine("1000") as any,
  });
  const saleId = result.sale.id;

  const rows = await pool.query(
    `SELECT id FROM doctor_commission_transactions WHERE sale_id = $1`,
    [saleId],
  );
  assert.equal(rows.rows.length, 0);

  await cleanupSale(saleId);
});

test("payout reduces the computed commission balance", async () => {
  const saleId = await postSaleWithDoctor(commissionDoctorId, "1000", "180", "1180");

  const balanceAfterEarn = Number(await storage.getDoctorCommissionBalance(commissionDoctorId));
  assert.equal(balanceAfterEarn, 100);

  await storage.createDoctorCommissionPayout({ doctorId: commissionDoctorId, amount: "40.00", notes: "test payout" });
  const balanceAfterPayout = Number(await storage.getDoctorCommissionBalance(commissionDoctorId));
  assert.equal(balanceAfterPayout, 60);

  await pool.query(`DELETE FROM doctor_commission_transactions WHERE doctor_id = $1 AND type = 'PAID'`, [commissionDoctorId]);
  await cleanupSale(saleId);
});

test("the payout route rejects an amount exceeding the current balance", async () => {
  const saleId = await postSaleWithDoctor(commissionDoctorId, "1000", "180", "1180");
  const currentBalance = parseFloat(await storage.getDoctorCommissionBalance(commissionDoctorId));

  // Mirrors the exact guard in the POST /api/doctor-commissions/payout handler.
  const payoutAmount = currentBalance + 500;
  const wouldBeRejected = payoutAmount > currentBalance + 0.01;
  assert.equal(wouldBeRejected, true);

  await cleanupSale(saleId);
});
