import { GeminiAssistantProvider } from "./gemini-provider.js";

export interface AssistantProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AssistantProviderRequest {
  requestId: string;
  conversationId: string;
  messages: AssistantProviderMessage[];
}

export interface AssistantProviderResult {
  content: string;
  provider: string;
  model: string;
}

export interface AssistantProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  generateResponse(input: AssistantProviderRequest): Promise<AssistantProviderResult>;
}

class DisabledAssistantProvider implements AssistantProvider {
  readonly name = "disabled";
  readonly isConfigured = false;

  async generateResponse(): Promise<AssistantProviderResult> {
    throw new Error("AI assistant provider is not configured.");
  }
}

class OpenAICompatibleAssistantProvider implements AssistantProvider {
  readonly name = "openai-compatible";
  readonly isConfigured = true;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async generateResponse(input: AssistantProviderRequest): Promise<AssistantProviderResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: input.messages,
      }),
    });

    if (!response.ok) {
      const failureText = await response.text();
      throw new Error(`Assistant provider request failed with ${response.status}: ${failureText}`);
    }

    const payload = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Assistant provider returned an empty response.");
    }

    return {
      content,
      provider: this.name,
      model: this.model,
    };
  }
}

export function createAssistantProvider(): AssistantProvider {
  const providerName = (process.env.AI_ASSISTANT_PROVIDER || "openai-compatible").trim().toLowerCase();

  if (providerName === "disabled") {
    return new DisabledAssistantProvider();
  }

  // Gemini provider — Google Generative AI REST API
  if (providerName === "gemini") {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.warn("[assistant.provider] AI_ASSISTANT_PROVIDER=gemini but GEMINI_API_KEY is not set. Falling back to disabled.");
      return new DisabledAssistantProvider();
    }
    const model = process.env.AI_ASSISTANT_MODEL || "gemini-2.5-flash";
    console.log(`[assistant.provider] Active provider: gemini | model: ${model}`);
    return new GeminiAssistantProvider(geminiKey, model);
  }

  // OpenAI-compatible provider (OpenAI, Azure OpenAI, local Ollama, etc.)
  const apiKey = process.env.AI_ASSISTANT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[assistant.provider] No API key found. Assistant running in guided-fallback mode.");
    return new DisabledAssistantProvider();
  }

  const baseUrl = process.env.AI_ASSISTANT_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_ASSISTANT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  console.log(`[assistant.provider] Active provider: openai-compatible | model: ${model}`);

  return new OpenAICompatibleAssistantProvider(apiKey, baseUrl, model);
}
