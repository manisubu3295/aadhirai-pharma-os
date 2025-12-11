import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings, 
  Plus,
  CreditCard,
  MapPin,
  Shield,
  Calculator,
  Crown,
  BarChart3,
  Stethoscope,
  Truck,
  Tags,
  ClipboardList,
  PackageCheck,
  Receipt,
  RotateCcw
} from "lucide-react";
import logoImage from '@assets/4809A98F-D4B8-4E8A-AEF1-11CDDF7D2FD6_1765274700818.png';
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/planContext";
import { Badge } from "@/components/ui/badge";
import { useRef, useEffect, useLayoutEffect, useCallback } from "react";

const NAV_SCROLL_KEY = "nav-scroll-position";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  proOnly?: boolean;
  ownerOnly?: boolean;
}

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isPro } = usePlan();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);

  const saveScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      sessionStorage.setItem(NAV_SCROLL_KEY, scrollRef.current.scrollTop.toString());
    }
  }, []);

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = sessionStorage.getItem(NAV_SCROLL_KEY);
    if (savedPosition && scrollRef.current) {
      scrollRef.current.scrollTop = parseInt(savedPosition, 10);
    }
  }, []);

  useLayoutEffect(() => {
    restoreScrollPosition();
  }, [location, restoreScrollPosition]);

  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 0);
    return () => clearTimeout(timer);
  }, [location, restoreScrollPosition]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current && !isNavigatingRef.current) {
      saveScrollPosition();
    }
  }, [saveScrollPosition]);

  const handleMenuClick = useCallback(() => {
    saveScrollPosition();
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  }, [saveScrollPosition]);

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Truck, label: "Suppliers", href: "/suppliers" },
    { icon: Tags, label: "Rate Master", href: "/supplier-rates" },
    { icon: ClipboardList, label: "Purchase Orders", href: "/purchase-orders" },
    { icon: PackageCheck, label: "Goods Receipt", href: "/goods-receipts" },
    { icon: ShoppingCart, label: "Point of Sale", href: "/pos" },
    { icon: Receipt, label: "Credit Billing", href: "/credit-billing" },
    { icon: RotateCcw, label: "Medicine Refund", href: "/medicine-refund" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: FileText, label: "Reports", href: "/reports" },
    { icon: Stethoscope, label: "Doctors", href: "/doctors", proOnly: true },
    { icon: CreditCard, label: "Collections", href: "/collections", proOnly: true },
    { icon: MapPin, label: "Locations", href: "/locations", proOnly: true },
    { icon: Shield, label: "Audit Log", href: "/audit-log", proOnly: true, ownerOnly: true },
    { icon: Calculator, label: "Tally Export", href: "/tally-export", proOnly: true, ownerOnly: true },
    { icon: BarChart3, label: "Owner Analytics", href: "/owner-dashboard", proOnly: true, ownerOnly: true },
    { icon: Settings, label: "Settings", href: "/settings", ownerOnly: true },
  ];

  const isOwner = user?.role === "owner";

  return (
    <aside className="w-64 h-screen sidebar-gradient text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0 fixed left-0 top-0 z-40">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
        <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center p-1">
             <img src={logoImage} alt="Aadhirai Innovations" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight">Aadhirai</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Innovations</p>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2">
           <Link href="/new-sale" onClick={handleMenuClick}>
             <button className="w-full bg-white text-primary hover:bg-white/90 transition-colors h-10 rounded-md flex items-center justify-center gap-2 text-sm font-medium shadow-sm">
               <Plus className="w-4 h-4" /> New Sale
             </button>
           </Link>
        </div>
        
        <div className="h-4"></div>

        {menuItems.map((item) => {
          if (item.ownerOnly && !isOwner) return null;
          
          const isActive = location === item.href;
          const isDisabled = item.proOnly && !isPro;
          
          if (isDisabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                data-testid={`menu-${item.label.toLowerCase().replace(/\s/g, "-")}-disabled`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                  PRO
                </Badge>
              </div>
            );
          }
          
          return (
            <Link key={item.href} href={item.href} onClick={handleMenuClick}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group cursor-pointer",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <item.icon className={cn(
                  "w-4 h-4",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors"
                )} />
                {item.label}
                {item.proOnly && isPro && (
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <Crown className="w-2.5 h-2.5 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
