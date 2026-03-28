import { randomUUID } from "crypto";
import { MAX_ASSISTANT_MESSAGE_LENGTH, type AssistantMessage, type AssistantRequest, type AssistantResponse } from "@shared/assistant";
import type { MenuWithPermissions, User } from "@shared/schema";
import { storage } from "../storage";
import { createAssistantProvider } from "../providers/llm-provider";
import { AssistantPromptService } from "./assistant-prompt.service";
import { AssistantToolRegistry } from "./assistant-tool-registry";
import { findModuleByRoute, searchModulesByQuestion } from "./assistant-knowledge";

interface AssistantSessionContext {
  userId: string;
  role: string;
}

interface StoredConversationState {
  messages: AssistantMessage[];
  updatedAt: number;
}

const MAX_CONVERSATION_MESSAGES = 16;
const CONVERSATION_TTL_MS = 1000 * 60 * 60 * 6;

export class AssistantService {
  private readonly provider = createAssistantProvider();
  private readonly promptService = new AssistantPromptService();
  private readonly toolRegistry = new AssistantToolRegistry();
  private readonly conversations = new Map<string, StoredConversationState>();

  async reply(session: AssistantSessionContext, request: AssistantRequest): Promise<AssistantResponse> {
    const requestId = randomUUID();
    const conversationId = request.conversationId || randomUUID();
    const user = await this.requireUser(session.userId);
    const accessibleMenus = await storage.getUserNavigation(user.id, user.role);
    const history = this.resolveHistory(user.id, conversationId, request.messages);
    const toolHints = await this.toolRegistry.collectHints({
      question: request.message,
      route: request.context?.route,
      user,
      accessibleMenus,
    });

    const response = await this.generateReply({
      requestId,
      conversationId,
      user,
      accessibleMenus,
      history,
      request,
      toolHints,
    });

    const nextMessages = [
      ...history,
      { role: "user", content: request.message } satisfies AssistantMessage,
      { role: "assistant", content: response.reply } satisfies AssistantMessage,
    ].slice(-MAX_CONVERSATION_MESSAGES);

    this.conversations.set(this.getConversationKey(user.id, conversationId), {
      messages: nextMessages,
      updatedAt: Date.now(),
    });

    await this.writeAuditLog({
      requestId,
      conversationId,
      user,
      route: request.context?.route,
      mode: response.mode,
      provider: response.provider,
      question: request.message,
      answer: response.reply,
    });

    this.pruneExpiredConversations();

    return response;
  }

  private async generateReply(input: {
    requestId: string;
    conversationId: string;
    user: User;
    accessibleMenus: MenuWithPermissions[];
    history: AssistantMessage[];
    request: AssistantRequest;
    toolHints: string[];
  }): Promise<AssistantResponse> {
    const providerConfigured = this.provider.isConfigured;
    if (providerConfigured) {
      try {
        const providerResult = await this.provider.generateResponse({
          requestId: input.requestId,
          conversationId: input.conversationId,
          messages: this.promptService.buildConversation({
            user: input.user,
            route: input.request.context?.route,
            moduleTitle: input.request.context?.moduleTitle,
            pageSummary: input.request.context?.pageSummary,
            accessibleMenus: input.accessibleMenus,
            toolHints: input.toolHints,
            history: input.history,
            question: input.request.message,
          }),
        });

        return {
          conversationId: input.conversationId,
          requestId: input.requestId,
          provider: `${providerResult.provider}:${providerResult.model}`,
          mode: "llm",
          reply: this.sanitizeReply(providerResult.content),
          suggestions: this.buildSuggestions(input.request.message, input.request.context?.route, input.accessibleMenus),
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[assistant.provider.failed]", {
          requestId: input.requestId,
          provider: this.provider.name,
          message: errorMessage,
        });
        // Return the actual error so the user knows what went wrong
        return {
          conversationId: input.conversationId,
          requestId: input.requestId,
          provider: `${this.provider.name}:error`,
          mode: "fallback",
          reply: `AI assistant error: ${errorMessage}\n\nPlease check that your API key is valid and the server has been restarted after .env changes.`,
          suggestions: this.buildSuggestions(input.request.message, input.request.context?.route, input.accessibleMenus),
          createdAt: new Date().toISOString(),
        };
      }
    }

    // No provider configured — return navigation guidance
    return {
      conversationId: input.conversationId,
      requestId: input.requestId,
      provider: "guided-fallback",
      mode: "fallback",
      reply: this.buildFallbackReply(input.user, input.request, input.accessibleMenus, input.toolHints),
      suggestions: this.buildSuggestions(input.request.message, input.request.context?.route, input.accessibleMenus),
      createdAt: new Date().toISOString(),
    };
  }

  private buildFallbackReply(
    user: User,
    request: AssistantRequest,
    accessibleMenus: MenuWithPermissions[],
    toolHints: string[],
  ): string {
    const currentModule = findModuleByRoute(request.context?.route);
    const relatedModules = searchModulesByQuestion(request.message)
      .filter((moduleInfo) => accessibleMenus.some((menu) => menu.routePath === moduleInfo.route && menu.canView))
      .slice(0, 2);
    const accessibleRouteList = accessibleMenus.filter((menu) => menu.canView).slice(0, 5);

    const lines = [
      `I can help as an in-app operations copilot for ${user.pharmacyName || "your Medora+ workspace"}.`,
    ];

    if (currentModule) {
      lines.push(`You are currently in ${currentModule.title}. ${currentModule.summary}`);
    }

    if (toolHints.length > 0) {
      lines.push("Relevant guidance:");
      lines.push(...toolHints.slice(0, 4).map((hint) => `- ${hint}`));
    }

    if (relatedModules.length > 0) {
      lines.push("Related modules you can use next:");
      lines.push(...relatedModules.map((moduleInfo) => `- ${moduleInfo.title} at ${moduleInfo.route}`));
    } else if (accessibleRouteList.length > 0) {
      lines.push("Common accessible modules for you:");
      lines.push(...accessibleRouteList.map((menu) => `- ${menu.label} at ${menu.routePath}`));
    }

    lines.push("If you want a deeper answer, configure an AI provider with AI_ASSISTANT_API_KEY or OPENAI_API_KEY. Until then I will stay in guided, audit-friendly mode.");

    return lines.join("\n");
  }

  private buildSuggestions(question: string, route: string | undefined, accessibleMenus: MenuWithPermissions[]): string[] {
    const normalized = question.toLowerCase();
    const currentModule = findModuleByRoute(route);
    const suggestions = new Set<string>();

    if (currentModule) {
      suggestions.add(`Explain the ${currentModule.title} workflow`);
    }

    if (normalized.includes("stock") || normalized.includes("expiry")) {
      suggestions.add("Show me how to review expiring medicines");
      suggestions.add("Where should I check low stock items?");
    }

    if (normalized.includes("invoice") || normalized.includes("sale") || normalized.includes("billing")) {
      suggestions.add("Guide me through creating an invoice draft");
      suggestions.add("What should I verify before posting a sale?");
    }

    for (const menu of accessibleMenus.filter((entry) => entry.canView).slice(0, 3)) {
      suggestions.add(`What can I do in ${menu.label}?`);
    }

    return Array.from(suggestions).slice(0, 4);
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw Object.assign(new Error("User not found for assistant request."), { status: 401 });
    }

    return user;
  }

  private resolveHistory(userId: string, conversationId: string, clientMessages: AssistantMessage[]): AssistantMessage[] {
    const stored = this.conversations.get(this.getConversationKey(userId, conversationId));
    if (clientMessages.length > 0) {
      return clientMessages.slice(-MAX_CONVERSATION_MESSAGES);
    }

    return stored?.messages.slice(-MAX_CONVERSATION_MESSAGES) || [];
  }

  private getConversationKey(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  private sanitizeReply(reply: string): string {
    return reply.replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_ASSISTANT_MESSAGE_LENGTH);
  }

  private pruneExpiredConversations(): void {
    const now = Date.now();
    this.conversations.forEach((state, key) => {
      if (now - state.updatedAt > CONVERSATION_TTL_MS) {
        this.conversations.delete(key);
      }
    });
  }

  private async writeAuditLog(input: {
    requestId: string;
    conversationId: string;
    user: User;
    route?: string;
    mode: "llm" | "fallback";
    provider: string;
    question: string;
    answer: string;
  }): Promise<void> {
    try {
      await storage.createAuditLog({
        action: "ASSISTANT_QUERY",
        entityType: "assistant",
        entityId: 0,
        entityName: "AI Assistant",
        userId: input.user.id,
        userName: input.user.name,
        oldValue: null,
        newValue: JSON.stringify({
          questionPreview: input.question.slice(0, 220),
          answerPreview: input.answer.slice(0, 220),
        }),
        details: JSON.stringify({
          requestId: input.requestId,
          conversationId: input.conversationId,
          route: input.route || null,
          mode: input.mode,
          provider: input.provider,
        }),
      });
    } catch (error) {
      console.error("[assistant.audit.failed]", {
        requestId: input.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const assistantService = new AssistantService();