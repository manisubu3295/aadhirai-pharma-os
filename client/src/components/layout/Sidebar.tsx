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
  RotateCcw,
  LogOut,
  User,
  ChevronRight
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

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
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

  const menuSections: MenuSection[] = [
    {
      title: "OPERATIONS",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: Plus, label: "New Sale (POS)", href: "/new-sale" },
        { icon: ShoppingCart, label: "Point of Sale", href: "/pos" },
        { icon: Receipt, label: "Credit Billing", href: "/credit-billing" },
        { icon: RotateCcw, label: "Medicine Refund", href: "/medicine-refund" },
      ]
    },
    {
      title: "INVENTORY & PURCHASE",
      items: [
        { icon: Package, label: "Medicines / Products", href: "/inventory" },
        { icon: Truck, label: "Suppliers", href: "/suppliers" },
        { icon: Tags, label: "Rate Master", href: "/supplier-rates" },
        { icon: ClipboardList, label: "Purchase Orders", href: "/purchase-orders" },
        { icon: PackageCheck, label: "Goods Receipt (GRN)", href: "/goods-receipts" },
      ]
    },
    {
      title: "CUSTOMERS & CREDIT",
      items: [
        { icon: Users, label: "Customer Accounts", href: "/customers" },
        { icon: Stethoscope, label: "Doctors", href: "/doctors", proOnly: true },
        { icon: CreditCard, label: "Collections", href: "/collections", proOnly: true },
      ]
    },
    {
      title: "REPORTS & ANALYTICS",
      items: [
        { icon: FileText, label: "Sales Reports", href: "/reports" },
        { icon: BarChart3, label: "Owner Analytics", href: "/owner-dashboard", proOnly: true, ownerOnly: true },
        { icon: Shield, label: "Audit Log", href: "/audit-log", proOnly: true, ownerOnly: true },
        { icon: Calculator, label: "Tally Export", href: "/tally-export", proOnly: true, ownerOnly: true },
      ]
    },
    {
      title: "CONFIGURATION",
      items: [
        { icon: MapPin, label: "Storage Locations", href: "/locations", proOnly: true },
        { icon: Settings, label: "Settings", href: "/settings", ownerOnly: true },
      ]
    }
  ];

  const isOwner = user?.role === "owner";

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="w-72 h-screen bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col shrink-0 fixed left-0 top-0 z-40">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center p-1.5 shadow-lg shadow-indigo-500/20">
            <img src={logoImage} alt="Aadhirai" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight">Aadhirai</h1>
            <p className="text-[11px] text-slate-400 font-medium">Pharmacy Management</p>
          </div>
        </div>
        {isPro && (
          <div className="mt-3 flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-md border border-amber-500/30 w-fit">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400">PRO EDITION</span>
          </div>
        )}
      </div>

      {/* Scrollable Menu Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {menuSections.map((section, sectionIndex) => {
          const visibleItems = section.items.filter(item => {
            if (item.ownerOnly && !isOwner) return false;
            return true;
          });
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className={cn("mb-2", sectionIndex > 0 && "mt-4")}>
              {/* Section Header */}
              <div className="px-5 mb-2">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                  {section.title}
                </span>
              </div>

              {/* Section Items */}
              <div className="px-3 space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location === item.href;
                  const isDisabled = item.proOnly && !isPro;
                  
                  if (isDisabled) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed group"
                        data-testid={`menu-${item.label.toLowerCase().replace(/\s/g, "-")}-disabled`}
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                        <span className="flex-1">{item.label}</span>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 font-semibold">
                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                          PRO
                        </Badge>
                      </div>
                    );
                  }
                  
                  return (
                    <Link key={item.href} href={item.href} onClick={handleMenuClick}>
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer relative",
                        isActive 
                          ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-white border-l-[3px] border-indigo-400 ml-0" 
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-l-[3px] border-transparent"
                      )}>
                        <item.icon className={cn(
                          "w-[18px] h-[18px] transition-colors",
                          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"
                        )} />
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 text-indigo-400" />
                        )}
                        {item.proOnly && isPro && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 font-semibold">
                            PRO
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Section at Bottom */}
      <div className="border-t border-slate-800/80 p-4">
        {user && (
          <>
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name || user.username}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/profile" onClick={handleMenuClick} className="flex-1">
                <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors">
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </>
        )}
        {!user && (
          <Link href="/auth" onClick={handleMenuClick}>
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              <User className="w-4 h-4" />
              Sign In
            </button>
          </Link>
        )}
      </div>
    </aside>
  );
}
