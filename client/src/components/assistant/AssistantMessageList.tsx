import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Bot, User2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantUiMessage } from "@/hooks/use-assistant";

interface AssistantMessageListProps {
  messages: AssistantUiMessage[];
  isLoading: boolean;
}

/** Renders **bold** segments inline */
function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-slate-900">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/** Converts Gemini markdown-style output into structured JSX */
function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Empty line → spacing
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        // Heading: ## or **text** on its own line or ALL CAPS short line
        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
          return (
            <p key={i} className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {headingMatch[1]}
            </p>
          );
        }

        // Numbered list: "1. text"
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 leading-none pt-0.5 min-w-[18px] min-h-[18px]">
                {numberedMatch[1]}
              </span>
              <span className="text-sm leading-relaxed text-slate-700">
                {renderInlineBold(numberedMatch[2])}
              </span>
            </div>
          );
        }

        // Bullet list: "- text" or "* text" or "• text"
        const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span className="text-sm leading-relaxed text-slate-700">
                {renderInlineBold(bulletMatch[1])}
              </span>
            </div>
          );
        }

        // Plain text
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-700">
            {renderInlineBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantMessageList({ messages, isLoading }: AssistantMessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="flex flex-col gap-3 px-4 py-5">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div key={message.id} className={cn("flex gap-3", isAssistant ? "items-start" : "flex-row-reverse items-start")}>
              {/* Avatar */}
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  isAssistant ? "bg-slate-900 text-white" : "bg-indigo-600 text-white",
                )}
              >
                {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User2 className="h-3.5 w-3.5" />}
              </div>

              {/* Bubble */}
              <div className={cn("flex max-w-[82%] flex-col gap-1", isAssistant ? "items-start" : "items-end")}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400">
                    {isAssistant ? "Medora+ AI" : "You"}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {format(new Date(message.createdAt), "h:mm a")}
                  </span>
                </div>

                <div
                  className={cn(
                    "rounded-xl px-4 py-3",
                    isAssistant
                      ? "border border-slate-100 bg-white shadow-sm"
                      : "bg-indigo-600 text-white",
                  )}
                >
                  {isAssistant ? (
                    <FormattedContent content={message.content} />
                  ) : (
                    <p className="text-sm leading-relaxed text-white">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400">Medora+ AI</span>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
