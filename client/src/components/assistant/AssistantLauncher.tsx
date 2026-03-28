import { Bot } from "lucide-react";

interface AssistantLauncherProps {
  onOpen: () => void;
  hidden?: boolean;
}

export function AssistantLauncher({ onOpen, hidden = false }: AssistantLauncherProps) {
  if (hidden) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={onOpen}
        data-testid="button-open-assistant"
        className="group relative flex items-center gap-3 rounded-2xl bg-slate-950 py-3 pl-3 pr-5 text-white shadow-2xl shadow-slate-900/40 transition-all hover:bg-slate-800 hover:shadow-slate-900/60 hover:-translate-y-0.5"
      >
        {/* Pulse ring */}
        <span className="absolute -inset-0.5 rounded-2xl bg-indigo-500/20 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Icon */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Bot className="h-4.5 w-4.5 text-white" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>

        {/* Label */}
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight">AI Assistant</p>
          <p className="text-[11px] text-slate-400">Pharmacy insights</p>
        </div>
      </button>
    </div>
  );
}
