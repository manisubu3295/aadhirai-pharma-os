import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { storage } from "../storage";
import { InventoryPostingService } from "../services/inventory-posting.service";
import {
  grnPostingRequestSchema,
  salePostingRequestSchema,
} from "../validation/inventory-posting.schemas";

const postingService = new InventoryPostingService();

export class InventoryPostingController {
  async createSale(req: Request, res: Response): Promise<Response | void> {
    try {
      const payload = salePostingRequestSchema.parse(req.body);
      const { items, ...saleHeader } = payload;

      const paymentMethod = (payload.paymentMethod || "").toLowerCase();
      const netAmount = parseFloat(String(payload.total || 0));
      const receivedAmount = parseFloat(String(payload.receivedAmount || 0));

      if (paymentMethod !== "credit" && receivedAmount < netAmount) {
        return res.status(400).json({
          error: "Received amount cannot be less than net amount for non-credit payments.",
        });
      }

      const userId = req.session?.userId || payload.userId || null;

      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const invoiceNo = await storage.getNextInvoiceNumber();
          const result = await postingService.postSale({
            header: {
              ...saleHeader,
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

      const normalizedLines = items.map((item) => ({
        ...item,
        poLineId: item.poLineId ?? item.poItemId ?? null,
        receivedQty: item.receivedQty ?? item.quantity ?? 0,
        freeQty: item.freeQty ?? item.freeQuantity ?? 0,
        conversionFactorSnapshot: item.conversionFactorSnapshot ?? item.unitsPerStrip ?? 1,
      }));

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
