import { Search, Bell, HelpCircle, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/planContext";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  pharmacist: "Pharmacist",
  cashier: "Cashier",
};

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { plan, setPlan, isPro } = usePlan();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-primary/20 header-gradient px-6 flex items-center justify-between sticky top-0 z-30">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
          <span className={`text-xs font-medium ${!isPro ? 'text-white' : 'text-white/50'}`}>BASIC</span>
          <Switch
            checked={isPro}
            onCheckedChange={(checked) => setPlan(checked ? "PRO" : "BASIC")}
            className="data-[state=checked]:bg-amber-500"
            data-testid="switch-plan-toggle"
          />
          <span className={`text-xs font-medium flex items-center gap-1 ${isPro ? 'text-amber-400' : 'text-white/50'}`}>
            <Crown className="w-3 h-3" />
            PRO
          </span>
        </div>

        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/60" />
          <input
            type="text"
            placeholder="Search inventory, orders..."
            className="w-full h-9 pl-9 pr-4 rounded-md border border-white/20 bg-white/10 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            data-testid="input-search"
          />
        </div>

        <button className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-400 rounded-full border border-white/20"></span>
        </button>

        <button className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors" data-testid="button-help">
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-white/20 mx-1"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 outline-none" data-testid="button-user-menu">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-none text-white" data-testid="text-user-name">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-white/70 mt-1" data-testid="text-user-role">
                  {roleLabels[user?.role || ""] || user?.role || "Staff"}
                </p>
              </div>
              <Avatar className="h-8 w-8 border border-white/30">
                <AvatarFallback className="bg-white/20 text-white">
                  {user ? getInitials(user.name || user.username) : "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive cursor-pointer" 
              onClick={logout}
              data-testid="button-logout"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
