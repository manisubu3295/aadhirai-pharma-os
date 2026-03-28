import { useState } from "react";
import { AlertCircle, Bot, RotateCcw, SendHorizonal, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssistantMessageList } from "./AssistantMessageList";
import { useAssistant } from "@/hooks/use-assistant";

export function AssistantPanel() {
  const {
    messages,
    isLoading,
    error,
    quickActions,
    sendMessage,
    retryLastMessage,
    resetConversation,
  } = useAssistant();
  const [draft, setDraft] = useState("");

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-3 bg-slate-950 px-5 py-3.5 pr-14">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
          <Bot className="h-4.5 w-4.5 text-white" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-white">Medora+ AI Assistant</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[11px] text-slate-400">Pharmacy business intelligence · Gemini</p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
          data-testid="button-reset-assistant"
        >
          <RotateCcw className="h-3 w-3" />
          New chat
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex shrink-0 items-center gap-0 border-b border-slate-100 bg-slate-50 px-4 py-2">
        <Zap className="mr-2 h-3 w-3 shrink-0 text-slate-400" />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setDraft(action)}
              className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              data-testid={`assistant-quick-action-${action.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-hidden bg-slate-50/50">
        <AssistantMessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
        {error ? (
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-rose-700">Request failed</p>
              <p className="mt-0.5 truncate text-[11px] text-rose-500">{error}</p>
            </div>
            <button
              onClick={retryLastMessage}
              className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-rose-600 hover:bg-rose-100"
              data-testid="button-retry-assistant"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask about expiry, reorder levels, sales trends, GST, supplier performance…"
            className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border-slate-200 bg-slate-50 text-sm leading-relaxed placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-400"
            rows={1}
            data-testid="input-assistant-message"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={isLoading || !draft.trim()}
            className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 p-0 hover:bg-indigo-700 disabled:bg-slate-200"
            data-testid="button-send-assistant"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          Business insights only · For medical advice consult a qualified doctor
        </p>
      </div>
    </div>
  );
}
