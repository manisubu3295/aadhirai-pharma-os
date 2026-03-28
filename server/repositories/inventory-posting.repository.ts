import { pool } from "../storage";

export type TxClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
};

export interface SalePostingInput {
  invoiceNo: string;
  customerId?: number | null;
  customerName: string;
  customerPhone?: string | null;
  customerGstin?: string | null;
  doctorId?: number | null;
  doctorName?: string | null;
  subtotal: string;
  discount: string;
  discountPercent: string;
  cgst: string;
  sgst: string;
  tax: string;
  total: string;
  roundOff?: string;
  paymentMethod: string;
  paymentReference?: string | null;
  receivedAmount?: string;
  changeAmount?: string;
  status?: string;
  printInvoice?: boolean;
  sendViaEmail?: boolean;
  userId?: string | null;
}

export interface SalePostingLineInput {
  medicineId: number;
  medicineName: string;
  batchNumber?: string;
  expiryDate?: string;
  hsnCode?: string | null;
  soldQty?: number;
  soldQtyBase?: number;
  quantity?: number;
  conversionFactorSnapshot?: number;
  unitType?: string;
  packSize?: number;
  price: string;
  mrp?: string | null;
  gstRate?: string;
  cgst?: string;
  sgst?: string;
  discount?: string;
  total?: string;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE";
}

export interface GrnPostingInput {
  grnNumber: string;
  poId?: number | null;
  supplierId: number;
  supplierName: string;
  supplierInvoiceNo?: string | null;
  supplierInvoiceDate?: string | null;
  receiptDate?: string | null;
  status?: string;
  subtotal: string;
  discountRate?: string;
  discountAmount?: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string | null;
  receivedBy?: string | null;
  updateSkuDefaultPricingFromGrn?: boolean;
}

export interface GrnPostingLineInput {
  poLineId?: number | null;
  poItemId?: number | null;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  receivedQty: number;
  freeQty?: number;
  conversionFactorSnapshot?: number;
  purchaseUnit?: string;
  unitsPerStrip?: number;
  packSize?: number;
  rate: string;
  ptr?: string | null;
  sellingPrice?: string | null;
  mrp?: string | null;
  discountPercent?: string;
  discountAmount?: string;
  gstRate?: string;
  taxAmount?: string;
  totalAmount?: string;
  taxMode?: "INCLUSIVE" | "EXCLUSIVE";
  locationId?: number | null;
}

export class InventoryPostingRepository {
  async withTransaction<T>(handler: (tx: TxClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await handler(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createSaleHeader(tx: TxClient, header: SalePostingInput): Promise<{ id: number }> {
    const result = await tx.query(
      `
        INSERT INTO sales (
          invoice_no, customer_id, customer_name, customer_phone, customer_gstin,
          doctor_id, doctor_name, subtotal, discount, discount_percent, cgst, sgst,
          tax, total, round_off, payment_method, payment_reference, received_amount,
          change_amount, status, print_invoice, send_via_email, user_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23
        )
        RETURNING id
      `,
      [
        header.invoiceNo,
        header.customerId ?? null,
        header.customerName,
        header.customerPhone ?? null,
        header.customerGstin ?? null,
        header.doctorId ?? null,
        header.doctorName ?? null,
        header.subtotal,
        header.discount,
        header.discountPercent,
        header.cgst,
        header.sgst,
        header.tax,
        header.total,
        header.roundOff ?? "0",
        header.paymentMethod,
        header.paymentReference ?? null,
        header.receivedAmount ?? "0",
        header.changeAmount ?? "0",
        header.status ?? "Completed",
        header.printInvoice ?? false,
        header.sendViaEmail ?? false,
        header.userId ?? null,
      ],
    );
    return { id: Number(result.rows[0].id) };
  }

  async createSaleItem(tx: TxClient, data: {
    saleId: number;
    line: SalePostingLineInput;
    batchNumber: string;
    expiryDate: string;
    soldQtyBase: number;
    soldUnitQty: number;
    conversionFactorSnapshot: number;
  }): Promise<{ id: number }> {
    const result = await tx.query(
      `
        INSERT INTO sale_items (
          sale_id, medicine_id, medicine_name, batch_number, expiry_date, hsn_code,
          quantity, price, mrp, gst_rate, cgst, sgst, discount, total,
          unit_type, display_qty, pack_size, sold_unit_qty, sold_qty_base,
          conversion_factor_snapshot, tax_mode
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21
        )
        RETURNING id
      `,
      [
        data.saleId,
        data.line.medicineId,
        data.line.medicineName,
        data.batchNumber,
        data.expiryDate,
        data.line.hsnCode ?? null,
        data.soldQtyBase,
        data.line.price,
        data.line.mrp ?? null,
        data.line.gstRate ?? "0",
        data.line.cgst ?? "0",
        data.line.sgst ?? "0",
        data.line.discount ?? "0",
        data.line.total ?? "0",
        (data.line.unitType || "TABLET").toUpperCase(),
        data.soldUnitQty,
        data.conversionFactorSnapshot,
        data.soldUnitQty,
        data.soldQtyBase,
        data.conversionFactorSnapshot,
        data.line.taxMode ?? "EXCLUSIVE",
      ],
    );
    return { id: Number(result.rows[0].id) };
  }

  async createGrnHeader(tx: TxClient, header: GrnPostingInput): Promise<{ id: number }> {
    const result = await tx.query(
      `
        INSERT INTO goods_receipts (
          grn_number, po_id, supplier_id, supplier_name, supplier_invoice_no,
          supplier_invoice_date, receipt_date, status, subtotal, discount_rate,
          discount_amount, tax_amount, total_amount, notes, received_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, COALESCE($7::timestamp, NOW()), $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        RETURNING id
      `,
      [
        header.grnNumber,
        header.poId ?? null,
        header.supplierId,
        header.supplierName,
        header.supplierInvoiceNo ?? null,
        header.supplierInvoiceDate ?? null,
        header.receiptDate ?? null,
        header.status ?? "Completed",
        header.subtotal,
        header.discountRate ?? "0",
        header.discountAmount ?? "0",
        header.taxAmount,
        header.totalAmount,
        header.notes ?? null,
        header.receivedBy ?? null,
      ],
    );
    return { id: Number(result.rows[0].id) };
  }

  async createGrnItem(tx: TxClient, data: {
    grnId: number;
    poId?: number | null;
    line: GrnPostingLineInput;
    receivedQtyBase: number;
    freeQtyBase: number;
    inwardQtyBase: number;
    conversionFactorSnapshot: number;
  }): Promise<{ id: number }> {
    const result = await tx.query(
      `
        INSERT INTO goods_receipt_items (
          grn_id, po_item_id, po_id, po_line_id,
          medicine_id, medicine_name, batch_number, expiry_date,
          quantity, free_quantity, rate, selling_price, mrp,
          discount_percent, discount_amount, gst_rate, tax_amount, total_amount,
          purchase_unit, units_per_strip, pack_size, unit_type,
          location_id, received_qty_base, free_qty_base, inward_qty_base,
          conversion_factor_snapshot, gst_percent_snapshot, tax_mode,
          ptr, purchase_rate_snapshot, default_sale_rate_snapshot
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27, $28, $29,
          $30, $31, $32
        )
        RETURNING id
      `,
      [
        data.grnId,
        data.line.poItemId ?? null,
        data.poId ?? null,
        data.line.poLineId ?? data.line.poItemId ?? null,
        data.line.medicineId,
        data.line.medicineName,
        data.line.batchNumber,
        data.line.expiryDate,
        data.line.receivedQty,
        data.line.freeQty ?? 0,
        data.line.rate,
        data.line.sellingPrice ?? null,
        data.line.mrp ?? null,
        data.line.discountPercent ?? "0",
        data.line.discountAmount ?? "0",
        data.line.gstRate ?? "0",
        data.line.taxAmount ?? "0",
        data.line.totalAmount ?? "0",
        (data.line.purchaseUnit || "STRIP").toUpperCase(),
        data.conversionFactorSnapshot,
        data.conversionFactorSnapshot,
        (data.line.purchaseUnit || "STRIP").toUpperCase(),
        data.line.locationId ?? null,
        data.receivedQtyBase,
        data.freeQtyBase,
        data.inwardQtyBase,
        data.conversionFactorSnapshot,
        data.line.gstRate ?? "0",
        data.line.taxMode ?? "EXCLUSIVE",
        data.line.ptr ?? null,
        data.line.rate,
        data.line.sellingPrice ?? null,
      ],
    );
    return { id: Number(result.rows[0].id) };
  }

  async getMedicineStock(tx: TxClient, medicineId: number): Promise<{ id: number; quantity: number; reorderLevel: number }> {
    const result = await tx.query(
      `SELECT id, quantity, reorder_level FROM medicines WHERE id = $1 LIMIT 1`,
      [medicineId],
    );
    if (!result.rows[0]) {
      throw new Error(`Medicine not found: ${medicineId}`);
    }
    return {
      id: Number(result.rows[0].id),
      quantity: Number(result.rows[0].quantity || 0),
      reorderLevel: Number(result.rows[0].reorder_level || 0),
    };
  }

  async updateMedicineStock(tx: TxClient, medicineId: number, quantityDeltaBase: number): Promise<void> {
    await tx.query(
      `
        UPDATE medicines
        SET
          quantity = GREATEST(quantity + $2, 0),
          status = CASE
            WHEN GREATEST(quantity + $2, 0) = 0 THEN 'Out of Stock'
            WHEN GREATEST(quantity + $2, 0) < GREATEST(COALESCE(reorder_level, 50), 1) THEN 'Low Stock'
            ELSE 'In Stock'
          END
        WHERE id = $1
      `,
      [medicineId, quantityDeltaBase],
    );
  }

  async upsertInventoryBatch(tx: TxClient, data: {
    medicineId: number;
    warehouseId?: number | null;
    batchNumber: string;
    expiryDate: string;
    grnId?: number | null;
    grnItemId?: number | null;
    purchaseRateSnapshot?: string | null;
    ptrSnapshot?: string | null;
    mrpSnapshot?: string | null;
    defaultSaleRateSnapshot?: string | null;
    gstPercentSnapshot?: string;
    taxMode?: "INCLUSIVE" | "EXCLUSIVE";
    unitSnapshot?: string;
    conversionFactorSnapshot: number;
    inwardQtyBase: number;
  }): Promise<{ id: number; availableQtyBase: number }> {
    const result = await tx.query(
      `
        INSERT INTO inventory_batches (
          medicine_id, warehouse_id, batch_number, expiry_date,
          grn_id, grn_item_id, purchase_rate_snapshot, ptr_snapshot,
          mrp_snapshot, default_sale_rate_snapshot, gst_percent_snapshot,
          tax_mode, unit_snapshot, conversion_factor_snapshot,
          total_inward_qty_base, available_qty_base, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14,
          $15, $15, NOW()
        )
        ON CONFLICT (medicine_id, warehouse_id, batch_number, expiry_date)
        DO UPDATE SET
          total_inward_qty_base = inventory_batches.total_inward_qty_base + EXCLUDED.total_inward_qty_base,
          available_qty_base = inventory_batches.available_qty_base + EXCLUDED.available_qty_base,
          updated_at = NOW(),
          purchase_rate_snapshot = COALESCE(EXCLUDED.purchase_rate_snapshot, inventory_batches.purchase_rate_snapshot),
          ptr_snapshot = COALESCE(EXCLUDED.ptr_snapshot, inventory_batches.ptr_snapshot),
          mrp_snapshot = COALESCE(EXCLUDED.mrp_snapshot, inventory_batches.mrp_snapshot),
          default_sale_rate_snapshot = COALESCE(EXCLUDED.default_sale_rate_snapshot, inventory_batches.default_sale_rate_snapshot),
          gst_percent_snapshot = COALESCE(EXCLUDED.gst_percent_snapshot, inventory_batches.gst_percent_snapshot),
          tax_mode = COALESCE(EXCLUDED.tax_mode, inventory_batches.tax_mode),
          unit_snapshot = COALESCE(EXCLUDED.unit_snapshot, inventory_batches.unit_snapshot),
          conversion_factor_snapshot = COALESCE(EXCLUDED.conversion_factor_snapshot, inventory_batches.conversion_factor_snapshot)
        RETURNING id, available_qty_base
      `,
      [
        data.medicineId,
        data.warehouseId ?? null,
        data.batchNumber,
        data.expiryDate,
        data.grnId ?? null,
        data.grnItemId ?? null,
        data.purchaseRateSnapshot ?? null,
        data.ptrSnapshot ?? null,
        data.mrpSnapshot ?? null,
        data.defaultSaleRateSnapshot ?? null,
        data.gstPercentSnapshot ?? "0",
        data.taxMode ?? "EXCLUSIVE",
        (data.unitSnapshot || "STRIP").toUpperCase(),
        data.conversionFactorSnapshot,
        data.inwardQtyBase,
      ],
    );

    return {
      id: Number(result.rows[0].id),
      availableQtyBase: Number(result.rows[0].available_qty_base || 0),
    };
  }

  async listFefoBatches(tx: TxClient, medicineId: number, warehouseId?: number | null): Promise<Array<{
    id: number;
    batchNumber: string;
    expiryDate: string;
    availableQtyBase: number;
    conversionFactorSnapshot: number;
    unitSnapshot: string;
  }>> {
    const result = await tx.query(
      `
        SELECT
          id,
          batch_number,
          expiry_date,
          available_qty_base,
          conversion_factor_snapshot,
          unit_snapshot
        FROM inventory_batches
        WHERE
          medicine_id = $1
          AND ($2::int IS NULL OR warehouse_id = $2)
          AND available_qty_base > 0
        ORDER BY
          CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END,
          expiry_date ASC,
          id ASC
      `,
      [medicineId, warehouseId ?? null],
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      batchNumber: String(row.batch_number),
      expiryDate: String(row.expiry_date || ""),
      availableQtyBase: Number(row.available_qty_base || 0),
      conversionFactorSnapshot: Number(row.conversion_factor_snapshot || 1),
      unitSnapshot: String(row.unit_snapshot || "TABLET"),
    }));
  }

  async deductBatchStock(tx: TxClient, batchId: number, outwardQtyBase: number): Promise<{ availableQtyBase: number }> {
    const result = await tx.query(
      `
        UPDATE inventory_batches
        SET
          available_qty_base = GREATEST(available_qty_base - $2, 0),
          total_outward_qty_base = total_outward_qty_base + $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING available_qty_base
      `,
      [batchId, outwardQtyBase],
    );
    return { availableQtyBase: Number(result.rows[0]?.available_qty_base || 0) };
  }

  async insertInventoryLedger(tx: TxClient, data: {
    medicineId: number;
    warehouseId?: number | null;
    batchId?: number | null;
    txnType: "IN" | "OUT";
    txnSource: string;
    sourceId?: number | null;
    sourceLineId?: number | null;
    qtyBase: number;
    balanceAfterBase?: number | null;
    unitSnapshot?: string;
    conversionFactorSnapshot?: number;
    purchaseRateSnapshot?: string | null;
    ptrSnapshot?: string | null;
    mrpSnapshot?: string | null;
    gstPercentSnapshot?: string;
    taxModeSnapshot?: "INCLUSIVE" | "EXCLUSIVE";
    remarks?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await tx.query(
      `
        INSERT INTO inventory_ledger (
          medicine_id, warehouse_id, batch_id,
          txn_type, txn_source, source_id, source_line_id,
          qty_base, balance_after_base, unit_snapshot, conversion_factor_snapshot,
          purchase_rate_snapshot, ptr_snapshot, mrp_snapshot,
          gst_percent_snapshot, tax_mode_snapshot, remarks, metadata
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17, $18::jsonb
        )
      `,
      [
        data.medicineId,
        data.warehouseId ?? null,
        data.batchId ?? null,
        data.txnType,
        data.txnSource,
        data.sourceId ?? null,
        data.sourceLineId ?? null,
        data.qtyBase,
        data.balanceAfterBase ?? null,
        (data.unitSnapshot || "TABLET").toUpperCase(),
        data.conversionFactorSnapshot ?? 1,
        data.purchaseRateSnapshot ?? null,
        data.ptrSnapshot ?? null,
        data.mrpSnapshot ?? null,
        data.gstPercentSnapshot ?? "0",
        data.taxModeSnapshot ?? "EXCLUSIVE",
        data.remarks ?? null,
        JSON.stringify(data.metadata ?? {}),
      ],
    );
  }

  async insertSaleBatchAllocation(tx: TxClient, data: {
    saleId: number;
    saleItemId: number;
    medicineId: number;
    warehouseId?: number | null;
    batchId: number;
    batchNumber: string;
    expiryDate: string;
    requestedQty: number;
    requestedUnit: string;
    soldQtyBase: number;
    conversionFactorSnapshot: number;
  }): Promise<void> {
    await tx.query(
      `
        INSERT INTO sale_batch_allocations (
          sale_id, sale_item_id, medicine_id, warehouse_id, batch_id,
          batch_number, expiry_date, requested_qty, requested_unit,
          sold_qty_base, conversion_factor_snapshot
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11
        )
      `,
      [
        data.saleId,
        data.saleItemId,
        data.medicineId,
        data.warehouseId ?? null,
        data.batchId,
        data.batchNumber,
        data.expiryDate,
        data.requestedQty,
        data.requestedUnit,
        data.soldQtyBase,
        data.conversionFactorSnapshot,
      ],
    );
  }

  async getPoLine(tx: TxClient, poLineId: number): Promise<{ id: number; orderedQtyBase: number; receivedQtyBase: number } | null> {
    const result = await tx.query(
      `
        SELECT id, ordered_qty_base, received_qty_base
        FROM purchase_order_items
        WHERE id = $1
        LIMIT 1
      `,
      [poLineId],
    );
    if (!result.rows[0]) {
      return null;
    }
    return {
      id: Number(result.rows[0].id),
      orderedQtyBase: Number(result.rows[0].ordered_qty_base || 0),
      receivedQtyBase: Number(result.rows[0].received_qty_base || 0),
    };
  }

  async updatePoLineReceiptBase(tx: TxClient, poLineId: number, inwardQtyBase: number): Promise<void> {
    await tx.query(
      `
        UPDATE purchase_order_items
        SET
          received_qty_base = received_qty_base + $2,
          pending_qty_base = GREATEST(ordered_qty_base - (received_qty_base + $2), 0),
          line_status = CASE
            WHEN (received_qty_base + $2) <= 0 THEN 'PENDING'
            WHEN (received_qty_base + $2) >= ordered_qty_base THEN 'COMPLETED'
            ELSE 'PARTIAL'
          END,
          received_qty = CASE
            WHEN UPPER(COALESCE(unit_snapshot, unit_type, 'STRIP')) = 'STRIP'
              THEN FLOOR((received_qty_base + $2)::numeric / GREATEST(COALESCE(conversion_factor_snapshot, units_per_strip, 1), 1))::int
            ELSE received_qty_base + $2
          END
        WHERE id = $1
      `,
      [poLineId, inwardQtyBase],
    );
  }

  async updatePoHeaderStatusFromLines(tx: TxClient, poId: number): Promise<void> {
    const result = await tx.query(
      `
        SELECT
          COUNT(*)::int AS line_count,
          COUNT(*) FILTER (WHERE line_status = 'COMPLETED')::int AS completed_count,
          COUNT(*) FILTER (WHERE received_qty_base > 0)::int AS received_count
        FROM purchase_order_items
        WHERE po_id = $1
      `,
      [poId],
    );

    const row = result.rows[0];
    const lineCount = Number(row?.line_count || 0);
    const completed = Number(row?.completed_count || 0);
    const received = Number(row?.received_count || 0);

    let status = "Issued";
    if (lineCount > 0 && completed === lineCount) {
      status = "Received";
    } else if (received > 0) {
      status = "PartiallyReceived";
    }

    await tx.query(`UPDATE purchase_orders SET status = $2 WHERE id = $1`, [poId, status]);
  }

  async createSupplierPurchaseCredit(tx: TxClient, data: {
    supplierId: number;
    grnId: number;
    grnNumber: string;
    totalAmount: string;
    createdByUserId?: string | null;
  }): Promise<void> {
    const total = Number(data.totalAmount || "0");
    if (!Number.isFinite(total) || total <= 0) {
      return;
    }

    await tx.query(
      `
        INSERT INTO supplier_transactions (
          supplier_id, type, reference_id, reference_number, txn_date,
          debit_amount, credit_amount, remarks, created_by_user_id
        ) VALUES (
          $1, 'PURCHASE', $2, $3, NOW(),
          0, $4, $5, $6
        )
      `,
      [
        data.supplierId,
        data.grnId,
        data.grnNumber,
        data.totalAmount,
        `Goods received - ${data.grnNumber}`,
        data.createdByUserId ?? null,
      ],
    );
  }

  async updateMedicinePricingFromGrn(tx: TxClient, data: {
    medicineId: number;
    conversionFactorSnapshot: number;
    costPrice: string;
    price?: string | null;
    mrp?: string | null;
    locationId?: number | null;
  }): Promise<void> {
    await tx.query(
      `
        UPDATE medicines
        SET
          cost_price = $2,
          price = COALESCE($3, price),
          mrp = COALESCE($4, mrp),
          pack_size = GREATEST($5, 1),
          price_per_unit = CASE
            WHEN COALESCE($3, price) IS NULL THEN price_per_unit
            ELSE (COALESCE($3, price)::numeric / GREATEST($5, 1))::numeric(10,2)
          END,
          location_id = COALESCE($6, location_id)
        WHERE id = $1
      `,
      [
        data.medicineId,
        data.costPrice,
        data.price ?? null,
        data.mrp ?? null,
        data.conversionFactorSnapshot,
        data.locationId ?? null,
      ],
    );
  }

  async increaseCustomerOutstandingForCredit(tx: TxClient, customerId: number, amount: number): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    await tx.query(
      `
        UPDATE customers
        SET outstanding_balance = (COALESCE(outstanding_balance, 0)::numeric + $2)::numeric(10,2)
        WHERE id = $1
      `,
      [customerId, amount.toFixed(2)],
    );
  }

  async getSaleWithItems(tx: TxClient, saleId: number): Promise<{ sale: any; items: any[] }> {
    const saleResult = await tx.query(`SELECT * FROM sales WHERE id = $1`, [saleId]);
    const itemResult = await tx.query(`SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id`, [saleId]);
    return { sale: saleResult.rows[0], items: itemResult.rows };
  }
}
