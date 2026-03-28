import type { AssistantProvider, AssistantProviderRequest, AssistantProviderResult } from "./llm-provider.js";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
      role?: string;
    };
    finishReason?: string;
  }>;
  error?: {
    message: string;
    code: number;
    status?: string;
  };
}

export class GeminiAssistantProvider implements AssistantProvider {
  readonly name = "gemini";
  readonly isConfigured = true;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateResponse(input: AssistantProviderRequest): Promise<AssistantProviderResult> {
    const systemMessage = input.messages.find((m) => m.role === "system");
    const conversationMessages = input.messages.filter((m) => m.role !== "system");

    // Map OpenAI-style roles to Gemini roles ("assistant" → "model")
    const rawContents: GeminiContent[] = conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini requires strictly alternating user/model, starting with user
    const contents = this.sanitizeForGemini(rawContents);

    const requestBody: {
      system_instruction?: { parts: GeminiPart[] };
      contents: GeminiContent[];
      generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        candidateCount: number;
      };
      safetySettings: Array<{ category: string; threshold: string }>;
    } = {
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
        candidateCount: 1,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    if (systemMessage) {
      requestBody.system_instruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed with ${response.status}: ${errorText}`);
    }

    const payload = (await response.json()) as GeminiResponse;

    if (payload.error) {
      throw new Error(`Gemini API error ${payload.error.code}: ${payload.error.message}`);
    }

    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) {
      throw new Error("Gemini returned an empty response.");
    }

    return {
      content,
      provider: this.name,
      model: this.model,
    };
  }

  /**
   * Gemini requires strictly alternating user/model turns starting with user.
   * Drops leading model turns, then merges any consecutive same-role turns.
   */
  private sanitizeForGemini(contents: GeminiContent[]): GeminiContent[] {
    // Drop leading model messages (e.g. welcome greeting from state)
    let start = 0;
    while (start < contents.length && contents[start].role === "model") {
      start++;
    }
    const trimmed = contents.slice(start);
    if (trimmed.length === 0) return [];

    // Merge consecutive same-role messages by concatenating their text
    const result: GeminiContent[] = [{ ...trimmed[0], parts: [{ text: trimmed[0].parts[0].text }] }];
    for (let i = 1; i < trimmed.length; i++) {
      const prev = result[result.length - 1];
      const curr = trimmed[i];
      if (prev.role === curr.role) {
        prev.parts = [{ text: `${prev.parts[0].text}\n${curr.parts[0].text}` }];
      } else {
        result.push({ ...curr, parts: [{ text: curr.parts[0].text }] });
      }
    }

    return result;
  }
}
