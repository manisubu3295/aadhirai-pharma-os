import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { storage } from "../storage";
import { InventoryPostingService } from "../services/inventory-posting.service";
import {
  grnPostingRequestSchema,
  salePostingRequestSchema,
} from "../validation/inventory-posting.schemas";
import { buildLegacyPaymentPlan, buildSalePaymentPlan } from "@shared/salePayments";

const postingService = new InventoryPostingService();

export class InventoryPostingController {
  async createSale(req: Request, res: Response): Promise<Response | void> {
    try {
      const payload = salePostingRequestSchema.parse(req.body);
      const { items, payments: enteredPayments, ...saleHeader } = payload;

      const netAmount = parseFloat(String(payload.total || 0));
      const hasCustomer = !!payload.customerId;

      let plan: {
        paymentMethod: string;
        rows: { method: string; amount: number; reference?: string | null }[];
        receivedAmount: number;
        changeAmount: number;
        creditPortion: number;
        error: string | null;
      };

      if (enteredPayments && enteredPayments.length > 1) {
        plan = buildSalePaymentPlan({
          total: netAmount,
          rows: enteredPayments.map((r) => ({ method: r.method, amount: parseFloat(String(r.amount)), reference: r.reference })),
          hasCustomer,
        });
      } else {
        const singleRow = enteredPayments?.[0];
        const legacyMethod = singleRow?.method || payload.paymentMethod || "";
        const legacyReceived = singleRow ? parseFloat(String(singleRow.amount)) : parseFloat(String(payload.receivedAmount || 0));
        const legacyReference = singleRow?.reference ?? payload.paymentReference ?? null;
        const legacy = buildLegacyPaymentPlan({
          total: netAmount,
          paymentMethod: legacyMethod,
          receivedAmount: legacyReceived,
          reference: legacyReference,
        });
        const method = legacyMethod.toLowerCase();
        plan = {
          paymentMethod: method,
          rows: legacy.rows,
          receivedAmount: legacyReceived,
          changeAmount: legacy.changeAmount,
          creditPortion: legacy.creditPortion,
          error:
            method !== "credit" && legacyReceived < netAmount
              ? "Received amount cannot be less than net amount for non-credit payments."
              : legacy.creditPortion > 0 && !hasCustomer
                ? "Select a customer to record a credit remainder."
                : null,
        };
      }

      if (plan.error) {
        return res.status(400).json({ error: plan.error });
      }

      const userId = req.session?.userId || payload.userId || null;

      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const invoiceNo = await storage.getNextInvoiceNumber();
          const result = await postingService.postSale({
            header: {
              ...saleHeader,
              paymentMethod: plan.paymentMethod,
              receivedAmount: String(plan.receivedAmount),
              changeAmount: String(plan.changeAmount),
              payments: plan.rows,
              invoiceNo,
              userId,
            },
            lines: items,
          });
          return res.status(201).json(result);
        } catch (error) {
          const errorCode = (error as { code?: string })?.code;
          const detailText = String((error as { detail?: string; message?: string })?.detail || (error as Error)?.message || "");
          const isDuplicateInvoice =
            errorCode === "23505" &&
            (detailText.includes("sales_invoice_no_idx") || detailText.toLowerCase().includes("invoice_no"));

          if (!isDuplicateInvoice) {
            throw error;
          }

          lastError = error;
        }
      }

      throw lastError || new Error("Failed to generate unique invoice number");
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((entry) => `${entry.path.join(".")}: ${entry.message}`).join(", "),
        });
      }

      const traceId = randomUUID();
      const errorObj = error as {
        message?: string;
        code?: string;
        detail?: string;
        table?: string;
        column?: string;
        constraint?: string;
      };

      console.error("[SALES_CREATE_FAILED_V2]", {
        traceId,
        message: errorObj?.message || String(error),
        code: errorObj?.code,
        detail: errorObj?.detail,
        table: errorObj?.table,
        column: errorObj?.column,
        constraint: errorObj?.constraint,
        itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
      });

      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({ error: "Failed to create sale", traceId });
      }

      return res.status(500).json({
        error: "Failed to create sale",
        traceId,
        details: {
          message: errorObj?.message || String(error),
          code: errorObj?.code,
          detail: errorObj?.detail,
          table: errorObj?.table,
          column: errorObj?.column,
          constraint: errorObj?.constraint,
        },
      });
    }
  }

  async createGoodsReceipt(req: Request, res: Response): Promise<Response | void> {
    try {
      const payload = grnPostingRequestSchema.parse(req.body);
      const { items, allowExcessReceipt, ...grnHeader } = payload;

      const normalizedLines = items.map((item) => {
        const purchaseUnit = String(item.purchaseUnit || "STRIP").toUpperCase();
        const conversionFactorSnapshot = item.conversionFactorSnapshot ?? (
          purchaseUnit === "STRIP" || purchaseUnit === "PACK"
            ? Math.max(1, Number(item.unitsPerStrip || 1) || 1)
            : 1
        );

        return {
          ...item,
          poLineId: item.poLineId ?? item.poItemId ?? null,
          receivedQty: item.receivedQty ?? item.quantity ?? 0,
          freeQty: item.freeQty ?? item.freeQuantity ?? 0,
          conversionFactorSnapshot,
        };
      });

      const result = await postingService.postGoodsReceipt({
        header: {
          ...grnHeader,
        },
        lines: normalizedLines,
        allowExcessReceipt: Boolean(allowExcessReceipt),
      });

      return res.status(201).json(result.grn);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[GRN_CREATE_FAILED_V2]", { message, error });
      return res.status(500).json({ error: "Failed to create goods receipt", details: message });
    }
  }
}

export const inventoryPostingController = new InventoryPostingController();
