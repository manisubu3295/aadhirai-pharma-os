import { Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Header({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" data-testid="button-help">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
