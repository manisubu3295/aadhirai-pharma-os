import { storage, pool } from "../server/storage";
import { InventoryPostingService } from "../server/services/inventory-posting.service";
import type { InsertMedicine, InsertPurchaseOrderItem } from "../shared/schema";

type CategoryCase = {
  category: string;
  saleUnitType: string;
  unitType: string;
  unitsPerPack: number;
  poQty: number;
  saleQty: number;
};

type ScenarioRow = {
  medicineId: number;
  medicineName: string;
  category: string;
  batchNumber: string;
  unitType: string;
  saleUnitType: string;
  unitsPerPack: number;
  poQty: number;
  grnQty: number;
  expectedAfterGrn: number;
  soldDisplayQty: number;
  soldBaseQty: number;
  expectedAfterSale: number;
  actualInitial: number;
  actualAfterGrn: number;
  actualAfterSale: number;
  passInitial: boolean;
  passAfterGrn: boolean;
  passAfterSale: boolean;
};

const categoryCases: CategoryCase[] = [
  { category: "Tablet", saleUnitType: "TABLET", unitType: "STRIP", unitsPerPack: 10, poQty: 2, saleQty: 4 },
  { category: "Capsule", saleUnitType: "CAPSULE", unitType: "STRIP", unitsPerPack: 8, poQty: 2, saleQty: 3 },
  { category: "Syrup", saleUnitType: "PACK", unitType: "PACK", unitsPerPack: 12, poQty: 2, saleQty: 1 },
  { category: "Drops", saleUnitType: "PACK", unitType: "PACK", unitsPerPack: 6, poQty: 3, saleQty: 1 },
  { category: "Injection", saleUnitType: "PACK", unitType: "PACK", unitsPerPack: 5, poQty: 3, saleQty: 1 },
  { category: "Ointment", saleUnitType: "PACK", unitType: "PACK", unitsPerPack: 4, poQty: 3, saleQty: 1 },
  { category: "Cream", saleUnitType: "PACK", unitType: "PACK", unitsPerPack: 4, poQty: 3, saleQty: 1 },
  { category: "Powder", saleUnitType: "PACK", unitType: "PACK", unitsPerPack: 10, poQty: 2, saleQty: 1 },
  { category: "Device", saleUnitType: "PIECE", unitType: "PACK", unitsPerPack: 2, poQty: 2, saleQty: 1 },
  { category: "Other", saleUnitType: "PIECE", unitType: "PACK", unitsPerPack: 3, poQty: 2, saleQty: 1 },
];

const isPackBased = (unit?: string | null) => {
  const normalized = String(unit || "").trim().toUpperCase();
  return normalized === "STRIP" || normalized === "PACK";
};

async function getMedicineQty(medicineId: number): Promise<number> {
  const med = await storage.getMedicine(medicineId);
  if (!med) throw new Error(`Medicine not found ${medicineId}`);
  return Number(med.quantity || 0);
}

async function run() {
  const postingService = new InventoryPostingService();
  const runId = `E2E-${Date.now()}`;
  const supplierCode = `E2E-${Date.now().toString().slice(-8)}`;

  console.log(`\n[START] Category stock flow E2E (${runId})`);

  const supplier = await storage.createSupplier({
    name: `E2E Supplier ${runId}`,
    code: supplierCode,
    contactPerson: "E2E",
    phone: "9999999999",
    email: null,
    address: null,
    gstin: null,
    panNumber: null,
    paymentTermsDays: 30,
    bankName: null,
    bankAccount: null,
    ifscCode: null,
    isActive: true,
  });

  const today = new Date();
  const expiry = new Date(today);
  expiry.setFullYear(expiry.getFullYear() + 2);
  const expiryDate = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, "0")}`;

  const medicines: Array<{ id: number; name: string; category: string; unitType: string; unitsPerPack: number; batchNumber: string }> = [];

  for (const [index, spec] of categoryCases.entries()) {
    const batchNumber = `B${Date.now().toString().slice(-6)}${index}`;
    const name = `E2E-${spec.category}-${runId}`;

    const payload: InsertMedicine = {
      name,
      genericName: null,
      skuName: null,
      manufacturer: "E2E Pharma",
      batchNumber,
      expiryDate,
      quantity: 0,
      price: "100.00",
      costPrice: "80.00",
      mrp: "120.00",
      gstRate: "12",
      hsnCode: null,
      category: spec.category,
      status: "Out of Stock",
      reorderLevel: 10,
      barcode: null,
      minStock: 0,
      maxStock: 1000,
      locationId: null,
      baseUnit: "UNIT",
      packSize: spec.unitsPerPack,
      pricePerUnit: (100 / spec.unitsPerPack).toFixed(2),
    };

    const created = await storage.createMedicine(payload);
    medicines.push({
      id: created.id,
      name: created.name,
      category: spec.category,
      unitType: spec.unitType,
      unitsPerPack: spec.unitsPerPack,
      batchNumber,
    });
  }

  const poItems: InsertPurchaseOrderItem[] = medicines.map((med) => {
    const spec = categoryCases.find((c) => c.category === med.category)!;
    const qty = spec.poQty;
    const rate = "80.00";
    const lineBase = Number(rate) * qty;
    const tax = lineBase * 0.12;
    return {
      poId: 0,
      medicineId: med.id,
      medicineName: med.name,
      supplierRateId: null,
      quantity: qty,
      receivedQty: 0,
      rate,
      unitType: med.unitType,
      unitsPerStrip: med.unitsPerPack,
      mrp: "120.00",
      gstRate: "12",
      discountPercent: "0",
      taxAmount: tax.toFixed(2),
      totalAmount: (lineBase + tax).toFixed(2),
    };
  });

  const poSubtotal = poItems.reduce((sum, item) => sum + Number(item.rate) * item.quantity, 0);
  const poTax = poSubtotal * 0.12;

  const po = await storage.createPurchaseOrder(
    {
      poNumber: `PO-${runId}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      orderDate: new Date(),
      expectedDeliveryDate: null,
      status: "Draft",
      subtotal: poSubtotal.toFixed(2),
      taxAmount: poTax.toFixed(2),
      discountAmount: "0",
      totalAmount: (poSubtotal + poTax).toFixed(2),
      notes: runId,
      createdBy: null,
    },
    poItems,
  );

  const persistedPoItems = await storage.getPurchaseOrderItems(po.id);

  const initialQty = new Map<number, number>();
  for (const med of medicines) {
    initialQty.set(med.id, await getMedicineQty(med.id));
  }

  const grnLines = medicines.map((med) => {
    const spec = categoryCases.find((c) => c.category === med.category)!;
    const poLine = persistedPoItems.find((line) => line.medicineId === med.id);
    if (!poLine) throw new Error(`PO line missing for medicine ${med.id}`);

    return {
      poLineId: poLine.id,
      poItemId: poLine.id,
      medicineId: med.id,
      medicineName: med.name,
      batchNumber: med.batchNumber,
      expiryDate,
      receivedQty: spec.poQty,
      freeQty: 0,
      conversionFactorSnapshot: isPackBased(med.unitType) ? med.unitsPerPack : 1,
      purchaseUnit: med.unitType,
      unitsPerStrip: med.unitsPerPack,
      rate: "80.00",
      ptr: "90.00",
      sellingPrice: "100.00",
      mrp: "120.00",
      discountPercent: "0",
      discountAmount: "0",
      gstRate: "12",
      taxAmount: (spec.poQty * 80 * 0.12).toFixed(2),
      totalAmount: (spec.poQty * 80 * 1.12).toFixed(2),
      taxMode: "EXCLUSIVE" as const,
      locationId: null,
    };
  });

  const grnSubtotal = grnLines.reduce((sum, line) => sum + Number(line.rate) * line.receivedQty, 0);
  const grnTax = grnSubtotal * 0.12;

  await postingService.postGoodsReceipt({
    header: {
      grnNumber: `GRN-${runId}`,
      poId: po.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierInvoiceNo: `INV-${runId}`,
      supplierInvoiceDate: null,
      receiptDate: new Date().toISOString(),
      status: "Completed",
      subtotal: grnSubtotal.toFixed(2),
      discountRate: "0",
      discountAmount: "0",
      taxAmount: grnTax.toFixed(2),
      totalAmount: (grnSubtotal + grnTax).toFixed(2),
      notes: runId,
      receivedBy: null,
      updateSkuDefaultPricingFromGrn: true,
    },
    lines: grnLines,
    allowExcessReceipt: false,
  });

  const afterGrnQty = new Map<number, number>();
  for (const med of medicines) {
    afterGrnQty.set(med.id, await getMedicineQty(med.id));
  }

  const saleLines = medicines.map((med) => {
    const spec = categoryCases.find((c) => c.category === med.category)!;
    const soldDisplayQty = spec.saleQty;
    const conversion = isPackBased(spec.saleUnitType) ? med.unitsPerPack : 1;
    const soldBase = soldDisplayQty * conversion;

    return {
      medicineId: med.id,
      medicineName: med.name,
      batchNumber: med.batchNumber,
      expiryDate,
      hsnCode: null,
      soldQty: soldDisplayQty,
      soldQtyBase: soldBase,
      quantity: soldBase,
      conversionFactorSnapshot: conversion,
      unitType: spec.saleUnitType,
      packSize: med.unitsPerPack,
      price: "100.00",
      mrp: "120.00",
      gstRate: "12",
      cgst: "6",
      sgst: "6",
      discount: "0",
      total: (soldDisplayQty * 100 * 1.12).toFixed(2),
      taxMode: "EXCLUSIVE" as const,
    };
  });

  const saleSubtotal = saleLines.reduce((sum, line) => sum + Number(line.price) * Number(line.soldQty || 0), 0);
  const saleTax = saleSubtotal * 0.12;

  await postingService.postSale({
    header: {
      invoiceNo: `INV-${runId}`,
      customerId: null,
      customerName: "E2E Walk-in",
      customerPhone: null,
      customerGstin: null,
      doctorId: null,
      doctorName: null,
      subtotal: saleSubtotal.toFixed(2),
      discount: "0",
      discountPercent: "0",
      cgst: (saleTax / 2).toFixed(2),
      sgst: (saleTax / 2).toFixed(2),
      tax: saleTax.toFixed(2),
      total: (saleSubtotal + saleTax).toFixed(2),
      roundOff: "0",
      paymentMethod: "cash",
      paymentReference: null,
      receivedAmount: (saleSubtotal + saleTax).toFixed(2),
      changeAmount: "0",
      status: "Completed",
      printInvoice: false,
      sendViaEmail: false,
      userId: null,
    },
    lines: saleLines,
  });

  const afterSaleQty = new Map<number, number>();
  for (const med of medicines) {
    afterSaleQty.set(med.id, await getMedicineQty(med.id));
  }

  const report: ScenarioRow[] = medicines.map((med) => {
    const spec = categoryCases.find((c) => c.category === med.category)!;
    const initial = initialQty.get(med.id) || 0;
    const afterGrn = afterGrnQty.get(med.id) || 0;
    const afterSale = afterSaleQty.get(med.id) || 0;

    const grnFactor = isPackBased(spec.unitType) ? med.unitsPerPack : 1;
    const expectedInward = spec.poQty * grnFactor;
    const expectedAfterGrn = initial + expectedInward;

    const saleFactor = isPackBased(spec.saleUnitType) ? med.unitsPerPack : 1;
    const soldBaseQty = spec.saleQty * saleFactor;
    const expectedAfterSale = expectedAfterGrn - soldBaseQty;

    return {
      medicineId: med.id,
      medicineName: med.name,
      category: med.category,
      batchNumber: med.batchNumber,
      unitType: spec.unitType,
      saleUnitType: spec.saleUnitType,
      unitsPerPack: med.unitsPerPack,
      poQty: spec.poQty,
      grnQty: spec.poQty,
      expectedAfterGrn,
      soldDisplayQty: spec.saleQty,
      soldBaseQty,
      expectedAfterSale,
      actualInitial: initial,
      actualAfterGrn: afterGrn,
      actualAfterSale: afterSale,
      passInitial: initial === 0,
      passAfterGrn: afterGrn === expectedAfterGrn,
      passAfterSale: afterSale === expectedAfterSale,
    };
  });

  const allPass = report.every((row) => row.passInitial && row.passAfterGrn && row.passAfterSale);

  console.log("\n[E2E RESULT TABLE]");
  console.table(
    report.map((row) => ({
      category: row.category,
      unitType: row.unitType,
      saleUnit: row.saleUnitType,
      unitsPerPack: row.unitsPerPack,
      initial: row.actualInitial,
      afterGrn: `${row.actualAfterGrn} (exp ${row.expectedAfterGrn})`,
      afterSale: `${row.actualAfterSale} (exp ${row.expectedAfterSale})`,
      passInitial: row.passInitial,
      passAfterGrn: row.passAfterGrn,
      passAfterSale: row.passAfterSale,
      passOverall: row.passInitial && row.passAfterGrn && row.passAfterSale,
    })),
  );

  const summary = {
    runId,
    supplierId: supplier.id,
    poId: po.id,
    categoriesTested: report.length,
    passedCategories: report.filter((row) => row.passInitial && row.passAfterGrn && row.passAfterSale).length,
    failedCategories: report.filter((row) => !(row.passInitial && row.passAfterGrn && row.passAfterSale)).length,
    overallPass: allPass,
  };

  console.log("\n[E2E SUMMARY]");
  console.log(JSON.stringify(summary, null, 2));

  if (!allPass) {
    const failed = report.filter((row) => !(row.passInitial && row.passAfterGrn && row.passAfterSale));
    console.log("\n[FAILED CASES]");
    console.log(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }

  await pool.end();
}

run().catch(async (error) => {
  console.error("[E2E ERROR]", error);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
