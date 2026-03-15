import {
  InventoryPostingRepository,
  type GrnPostingInput,
  type GrnPostingLineInput,
  type SalePostingInput,
  type SalePostingLineInput,
} from "../repositories/inventory-posting.repository";

export const toBaseQty = (unitQty: number, conversionFactorSnapshot: number): number => {
  const qty = Math.max(0, Number(unitQty) || 0);
  const factor = Math.max(1, Number(conversionFactorSnapshot) || 1);
  return qty * factor;
};

export const applyBaseDelta = (currentQtyBase: number, deltaBase: number): number => {
  return Math.max(0, (Number(currentQtyBase) || 0) + (Number(deltaBase) || 0));
};

export class InventoryPostingService {
  constructor(private readonly repository = new InventoryPostingRepository()) {}

  async postGoodsReceipt(input: {
    header: GrnPostingInput;
    lines: GrnPostingLineInput[];
    allowExcessReceipt?: boolean;
  }): Promise<{ grn: { id: number } }> {
    return this.repository.withTransaction(async (tx) => {
      const header = input.header;
      const grn = await this.repository.createGrnHeader(tx, header);

      for (const line of input.lines) {
        const purchaseUnit = String(line.purchaseUnit || "STRIP").toUpperCase();
        const isPackBasedUnit = purchaseUnit === "STRIP" || purchaseUnit === "PACK";
        const fallbackConversionFactor = isPackBasedUnit
          ? Math.max(1, Number(line.unitsPerStrip ?? line.packSize ?? 1) || 1)
          : 1;
        const conversionFactorSnapshot = Math.max(
          1,
          Number(
            line.conversionFactorSnapshot ??
            fallbackConversionFactor,
          ) || 1,
        );

        const receivedQty = Math.max(0, Number(line.receivedQty) || 0);
        const freeQty = Math.max(0, Number(line.freeQty) || 0);
        const receivedQtyBase = toBaseQty(receivedQty, conversionFactorSnapshot);
        const freeQtyBase = toBaseQty(freeQty, conversionFactorSnapshot);
        const inwardQtyBase = receivedQtyBase + freeQtyBase;

        if (!line.batchNumber?.trim()) {
          throw new Error(`Batch number is mandatory for medicine ${line.medicineName}`);
        }
        if (!line.expiryDate?.trim()) {
          throw new Error(`Expiry date is mandatory for medicine ${line.medicineName}`);
        }

        const poLineId = line.poLineId ?? line.poItemId ?? null;
        if (poLineId) {
          const poLine = await this.repository.getPoLine(tx, poLineId);
          if (!poLine) {
            throw new Error(`PO line not found: ${poLineId}`);
          }
          if (!input.allowExcessReceipt) {
            const nextReceived = poLine.receivedQtyBase + inwardQtyBase;
            if (nextReceived > poLine.orderedQtyBase) {
              throw new Error(
                `GRN exceeds pending quantity for PO line ${poLineId}. Ordered(base): ${poLine.orderedQtyBase}, Received(base): ${poLine.receivedQtyBase}, Attempted Inward(base): ${inwardQtyBase}`,
              );
            }
          }
        }

        const grnItem = await this.repository.createGrnItem(tx, {
          grnId: grn.id,
          poId: header.poId,
          line,
          receivedQtyBase,
          freeQtyBase,
          inwardQtyBase,
          conversionFactorSnapshot,
        });

        const batch = await this.repository.upsertInventoryBatch(tx, {
          medicineId: line.medicineId,
          warehouseId: line.locationId ?? null,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          grnId: grn.id,
          grnItemId: grnItem.id,
          purchaseRateSnapshot: line.rate,
          ptrSnapshot: line.ptr ?? null,
          mrpSnapshot: line.mrp ?? null,
          defaultSaleRateSnapshot: line.sellingPrice ?? null,
          gstPercentSnapshot: line.gstRate ?? "0",
          taxMode: line.taxMode ?? "EXCLUSIVE",
          unitSnapshot: line.purchaseUnit ?? "STRIP",
          conversionFactorSnapshot,
          inwardQtyBase,
        });

        await this.repository.insertInventoryLedger(tx, {
          medicineId: line.medicineId,
          warehouseId: line.locationId ?? null,
          batchId: batch.id,
          txnType: "IN",
          txnSource: "GRN",
          sourceId: grn.id,
          sourceLineId: grnItem.id,
          qtyBase: inwardQtyBase,
          balanceAfterBase: batch.availableQtyBase,
          unitSnapshot: line.purchaseUnit ?? "STRIP",
          conversionFactorSnapshot,
          purchaseRateSnapshot: line.rate,
          ptrSnapshot: line.ptr ?? null,
          mrpSnapshot: line.mrp ?? null,
          gstPercentSnapshot: line.gstRate ?? "0",
          taxModeSnapshot: line.taxMode ?? "EXCLUSIVE",
          remarks: `GRN inward ${header.grnNumber}`,
          metadata: {
            receivedQty,
            freeQty,
            receivedQtyBase,
            freeQtyBase,
          },
        });

        await this.repository.updateMedicineStock(tx, line.medicineId, inwardQtyBase);

        if (header.updateSkuDefaultPricingFromGrn) {
          await this.repository.updateMedicinePricingFromGrn(tx, {
            medicineId: line.medicineId,
            conversionFactorSnapshot,
            costPrice: line.rate,
            price: line.sellingPrice ?? null,
            mrp: line.mrp ?? null,
            locationId: line.locationId ?? null,
          });
        }

        if (poLineId) {
          await this.repository.updatePoLineReceiptBase(tx, poLineId, inwardQtyBase);
        }
      }

      if (header.poId) {
        await this.repository.updatePoHeaderStatusFromLines(tx, header.poId);
      }

      await this.repository.createSupplierPurchaseCredit(tx, {
        supplierId: header.supplierId,
        grnId: grn.id,
        grnNumber: header.grnNumber,
        totalAmount: header.totalAmount,
      });

      return { grn };
    });
  }

  async postSale(input: {
    header: SalePostingInput;
    lines: SalePostingLineInput[];
  }): Promise<{ sale: any; items: any[] }> {
    return this.repository.withTransaction(async (tx) => {
      const sale = await this.repository.createSaleHeader(tx, input.header);

      for (const line of input.lines) {
        const unit = String(line.unitType || "TABLET").toUpperCase();
        const isPackBasedUnit = unit === "STRIP" || unit === "PACK";
        const conversionFactorSnapshot = Math.max(
          1,
          Number(
            line.conversionFactorSnapshot ??
            (isPackBasedUnit ? line.packSize : 1) ??
            1,
          ) || 1,
        );

        const soldUnitQty = Math.max(
          0,
          Number(line.soldQty ?? 0) || 0,
        );
        const fallbackBaseQty = Math.max(0, Number(line.quantity ?? 0) || 0);
        const soldQtyBase = Math.max(
          0,
          Number(line.soldQtyBase ?? (soldUnitQty > 0 ? toBaseQty(soldUnitQty, conversionFactorSnapshot) : fallbackBaseQty)) || 0,
        );

        if (soldQtyBase <= 0) {
          throw new Error(`Invalid sale quantity for medicine ${line.medicineName}`);
        }

        const batches = await this.repository.listFefoBatches(tx, line.medicineId, null);
        const totalAvailable = batches.reduce((sum, batch) => sum + batch.availableQtyBase, 0);
        if (totalAvailable < soldQtyBase) {
          throw new Error(
            `Insufficient stock for ${line.medicineName}. Available(base): ${totalAvailable}, Required(base): ${soldQtyBase}`,
          );
        }

        let remaining = soldQtyBase;
        for (const batch of batches) {
          if (remaining <= 0) {
            break;
          }
          const allocated = Math.min(batch.availableQtyBase, remaining);
          if (allocated <= 0) {
            continue;
          }

          const saleItem = await this.repository.createSaleItem(tx, {
            saleId: sale.id,
            line,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            soldQtyBase: allocated,
            soldUnitQty: Math.max(1, Math.ceil(allocated / conversionFactorSnapshot)),
            conversionFactorSnapshot,
          });

          const batchAfter = await this.repository.deductBatchStock(tx, batch.id, allocated);

          await this.repository.insertSaleBatchAllocation(tx, {
            saleId: sale.id,
            saleItemId: saleItem.id,
            medicineId: line.medicineId,
            warehouseId: null,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            requestedQty: soldUnitQty > 0 ? soldUnitQty : fallbackBaseQty,
            requestedUnit: unit,
            soldQtyBase: allocated,
            conversionFactorSnapshot,
          });

          await this.repository.insertInventoryLedger(tx, {
            medicineId: line.medicineId,
            warehouseId: null,
            batchId: batch.id,
            txnType: "OUT",
            txnSource: "SALE",
            sourceId: sale.id,
            sourceLineId: saleItem.id,
            qtyBase: allocated,
            balanceAfterBase: batchAfter.availableQtyBase,
            unitSnapshot: unit,
            conversionFactorSnapshot,
            mrpSnapshot: line.mrp ?? null,
            gstPercentSnapshot: line.gstRate ?? "0",
            taxModeSnapshot: line.taxMode ?? "EXCLUSIVE",
            remarks: `Sale outward ${input.header.invoiceNo}`,
            metadata: {
              soldUnitQty,
              soldQtyBase: allocated,
              conversionFactorSnapshot,
            },
          });

          await this.repository.updateMedicineStock(tx, line.medicineId, -allocated);

          remaining -= allocated;
        }
      }

      if ((input.header.paymentMethod || "").toLowerCase() === "credit" && input.header.customerId) {
        const total = Number(input.header.total || "0") || 0;
        const received = Number(input.header.receivedAmount || "0") || 0;
        const unpaid = Math.max(0, total - received);
        await this.repository.increaseCustomerOutstandingForCredit(tx, input.header.customerId, unpaid);
      }

      return this.repository.getSaleWithItems(tx, sale.id);
    });
  }
}
