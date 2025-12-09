import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Plus
} from "lucide-react";
import logoImage from '@assets/4809A98F-D4B8-4E8A-AEF1-11CDDF7D2FD6_1765274700818.png';

export function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: ShoppingCart, label: "Point of Sale", href: "/pos" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: FileText, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0 fixed left-0 top-0 z-40">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center p-1">
             <img src={logoImage} alt="Aadhirai Innovations" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight">Aadhirai</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Innovations</p>
        </div>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2">
           <Link href="/new-sale">
             <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors h-10 rounded-md flex items-center justify-center gap-2 text-sm font-medium shadow-sm">
               <Plus className="w-4 h-4" /> New Sale
             </button>
           </Link>
        </div>
        
        <div className="h-4"></div>

        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <item.icon className={cn(
                  "w-4 h-4",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors"
                )} />
                {item.label}
              </a>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border/50">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
