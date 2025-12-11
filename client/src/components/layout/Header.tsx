import { Bell, HelpCircle, Crown, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/planContext";

export function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const { plan, setPlan, isPro } = usePlan();

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
          <span className={`text-[11px] font-semibold ${!isPro ? 'text-slate-700' : 'text-slate-400'}`}>BASIC</span>
          <Switch
            checked={isPro}
            onCheckedChange={(checked) => setPlan(checked ? "PRO" : "BASIC")}
            className="data-[state=checked]:bg-amber-500 h-5 w-9"
            data-testid="switch-plan-toggle"
          />
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${isPro ? 'text-amber-600' : 'text-slate-400'}`}>
            <Crown className="w-3 h-3" />
            PRO
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200"></div>

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
