import type { Request, Response } from "express";
import { ZodError } from "zod";
import { assistantRequestSchema } from "@shared/assistant";
import { assistantService } from "../services/assistant.service";

export class AssistantController {
  async reply(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = assistantRequestSchema.parse(req.body);
      const response = await assistantService.reply(
        {
          userId: req.session.userId,
          role: req.session.userRole || "unknown",
        },
        payload,
      );

      return res.json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((entry) => ({
            path: entry.path.join("."),
            message: entry.message,
          })),
        });
      }

      const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) || 500 : 500;
      const message = error instanceof Error ? error.message : "Failed to process assistant request";
      console.error("[assistant.request.failed]", {
        status,
        message,
      });
      return res.status(status).json({ error: message });
    }
  }
}

export const assistantController = new AssistantController();