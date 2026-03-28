import { z } from "zod";

export const MAX_ASSISTANT_MESSAGE_LENGTH = 4000;

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_ASSISTANT_MESSAGE_LENGTH),
});

export const assistantContextSchema = z.object({
  route: z.string().trim().max(160).optional(),
  moduleTitle: z.string().trim().max(120).optional(),
  pageSummary: z.string().trim().max(280).optional(),
}).optional();

export const assistantRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  retryOfRequestId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Message is required").max(MAX_ASSISTANT_MESSAGE_LENGTH, "Message is too long"),
  messages: z.array(assistantMessageSchema).max(20).default([]),
  context: assistantContextSchema,
});

export const assistantResponseSchema = z.object({
  conversationId: z.string().uuid(),
  requestId: z.string().uuid(),
  provider: z.string(),
  mode: z.enum(["llm", "fallback"]),
  reply: z.string().min(1).max(MAX_ASSISTANT_MESSAGE_LENGTH),
  suggestions: z.array(z.string()).max(6).default([]),
  createdAt: z.string(),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type AssistantContext = z.infer<typeof assistantContextSchema>;