import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import type { AssistantRequest, AssistantResponse } from "@shared/assistant";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export interface AssistantUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface AssistantContextValue {
  isOpen: boolean;
  setOpen: (next: boolean) => void;
  messages: AssistantUiMessage[];
  isLoading: boolean;
  error: string | null;
  quickActions: string[];
  sendMessage: (message: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  resetConversation: () => void;
}

interface PendingRetryState {
  requestBody: AssistantRequest;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

function createMessage(role: "user" | "assistant", content: string): AssistantUiMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function getRouteQuickActions(route: string): string[] {
  switch (route) {
    case "/inventory":
      return [
        "Which medicines are expiring within 30 days?",
        "Show me items below reorder level",
        "How do I handle near-expiry stock?",
        "Which slow-moving items should I stop reordering?",
      ];
    case "/reports":
      return [
        "What are the top-selling medicines this month?",
        "Which categories have the highest expiry loss?",
        "Summarize profit vs discount trends",
        "Which supplier has the most delayed deliveries?",
      ];
    case "/purchase-orders":
      return [
        "How do I prioritize which items to reorder?",
        "Which suppliers have pending open orders?",
        "What should I verify before raising a PO?",
      ];
    case "/goods-receipts":
      return [
        "What should I check before posting a GRN?",
        "How do batch and expiry get recorded on receipt?",
        "How do PO and GRN statuses relate?",
      ];
    case "/new-sale":
    case "/pos":
      return [
        "How is GST calculated on this invoice?",
        "What discounts are allowed at billing?",
        "How do I handle a partial payment at counter?",
      ];
    case "/collections":
      return [
        "Which customers have overdue balances?",
        "How should I prioritize collection follow-ups?",
        "What should I verify before recording a payment?",
      ];
    case "/suppliers":
    case "/supplier-rates":
      return [
        "Which supplier offers the best rate for a medicine?",
        "How do I identify single-source dependency risk?",
        "Which suppliers have the longest lead times?",
      ];
    default:
      return [
        "Which medicines are expiring soon?",
        "Show items below reorder level",
        "How is GST applied to pharmacy sales?",
        "Which products have the highest expiry loss?",
      ];
  }
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [route] = useLocation();
  const [isOpen, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<PendingRetryState | null>(null);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversationId(crypto.randomUUID());
      setPendingRetry(null);
      setError(null);
      setOpen(false);
      return;
    }

    setMessages([
      createMessage(
        "assistant",
        `Hello ${user.name}. I'm your Medora+ AI Assistant — here to help with stock analysis, expiry tracking, reorder planning, sales insights, supplier performance, and billing queries. What would you like to analyse today?`,
      ),
    ]);
    setConversationId(crypto.randomUUID());
    setPendingRetry(null);
    setError(null);
  }, [user?.id]);

  const quickActions = useMemo(() => getRouteQuickActions(route), [route]);

  const resetConversation = () => {
    if (!user) {
      return;
    }

    setConversationId(crypto.randomUUID());
    setMessages([
      createMessage(
        "assistant",
        `New session started. Ask me about stock levels, expiry alerts, reorder planning, sales trends, supplier analysis, or billing and GST queries.`,
      ),
    ]);
    setPendingRetry(null);
    setError(null);
  };

  const executeRequest = async (requestBody: AssistantRequest, userMessage: AssistantUiMessage | null) => {
    setIsLoading(true);
    setError(null);

    if (userMessage) {
      setMessages((current) => [...current, userMessage]);
    }

    try {
      const response = await apiRequest("POST", "/api/assistant/query", requestBody);
      const payload = (await response.json()) as AssistantResponse;
      setConversationId(payload.conversationId);
      setMessages((current) => [
        ...current,
        createMessage("assistant", payload.reply),
      ]);
      setPendingRetry(null);
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : "Assistant request failed";
      setError(nextError);
      setPendingRetry({ requestBody });
      toast({
        title: "Assistant unavailable",
        description: "The request did not complete. You can retry the last message.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !user || isLoading) {
      return;
    }

    setOpen(true);
    const userMessage = createMessage("user", trimmed);
    const requestBody: AssistantRequest = {
      conversationId,
      message: trimmed,
      messages: messages
        .filter((entry) => entry.role === "assistant" || entry.role === "user")
        .slice(-12)
        .map((entry) => ({ role: entry.role, content: entry.content })),
      context: {
        route,
      },
    };

    await executeRequest(requestBody, userMessage);
  };

  const retryLastMessage = async () => {
    if (!pendingRetry || isLoading) {
      return;
    }

    await executeRequest(pendingRetry.requestBody, null);
  };

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        setOpen,
        messages,
        isLoading,
        error,
        quickActions,
        sendMessage,
        retryLastMessage,
        resetConversation,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }

  return context;
}