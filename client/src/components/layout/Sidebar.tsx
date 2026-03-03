import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
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
  ChevronRight,
  Menu,
  FolderOpen,
  Undo2,
  CalendarCheck,
  Wallet,
  CheckCircle,
  RefreshCw,
  Clock
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigation, groupMenusBySection } from "@/contexts/NavigationContext";

const NAV_SCROLL_KEY = "nav-scroll-position";

const iconMap: { [key: string]: React.ElementType } = {
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
  BarChart3,
  Stethoscope,
  Truck,
  Tags,
  ClipboardList,
  PackageCheck,
  Receipt,
  RotateCcw,
  Menu,
  FolderOpen,
  Undo2,
  CalendarCheck,
  Wallet,
  CheckCircle,
  RefreshCw,
  Clock,
};

function getIcon(iconName: string | null): React.ElementType {
  if (!iconName) return Package;
  return iconMap[iconName] || (LucideIcons as any)[iconName] || Package;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  ownerOnly?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface SidebarProps {
  isCollapsed?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isCollapsed = false, isOpen = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { menus, isLoading: isNavigationLoading } = useNavigation();
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

  const fallbackMenuSections: MenuSection[] = [
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
        { icon: Undo2, label: "Purchase Returns", href: "/purchase-returns" },
      ]
    },
    {
      title: "CUSTOMERS & CREDIT",
      items: [
        { icon: Users, label: "Customer Accounts", href: "/customers" },
        { icon: Stethoscope, label: "Doctors", href: "/doctors" },
        { icon: CreditCard, label: "Collections", href: "/collections" },
      ]
    },
    {
      title: "REPORTS & ANALYTICS",
      items: [
        { icon: FileText, label: "Sales Reports", href: "/reports" },
        { icon: BarChart3, label: "Owner Analytics", href: "/owner-dashboard", ownerOnly: true },
        { icon: Shield, label: "Audit Log", href: "/audit-log", ownerOnly: true },
        { icon: Calculator, label: "Tally Export", href: "/tally-export", ownerOnly: true },
      ]
    },
    {
      title: "CONFIGURATION",
      items: [
        { icon: MapPin, label: "Storage Locations", href: "/locations" },
        { icon: CalendarCheck, label: "Day Closing", href: "/day-closing" },
        { icon: Settings, label: "Settings", href: "/settings", ownerOnly: true },
      ]
    }
  ];

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  const isPrivileged = isOwner || isAdmin;
  
  // For owner/admin, use all menus from navigation API (they get full access)
  // For regular users, only show menus they have canView permission for
  const dynamicSections = groupMenusBySection(menus);
  
  // Only use fallback for owner/admin when navigation API returns empty (initial load)
  const menuSections: MenuSection[] = dynamicSections.length > 0
    ? dynamicSections.map(section => ({
        title: section.section,
        items: section.items.map(item => ({
          icon: getIcon(item.icon),
          label: item.label,
          href: item.routePath,
        }))
      }))
    : (isPrivileged ? fallbackMenuSections : []);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "h-screen bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col shrink-0 fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-72",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
      {/* Brand Header */}
      <div className={cn("border-b border-slate-800/80", isCollapsed ? "p-4" : "p-5")}>
        <div className="flex items-center gap-3">
          {isCollapsed ? (
            <h1 className="font-bold text-base text-white tracking-tight mx-auto">M+</h1>
          ) : (
            <div>
              <h1 className="font-bold text-base text-white tracking-tight">Medora+</h1>
              <p className="text-[11px] text-slate-400 font-medium">Pharmacy Management</p>
            </div>
          )}
        </div>
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
              {!isCollapsed && (
                <div className="px-5 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                    {section.title}
                  </span>
                </div>
              )}

              {/* Section Items */}
              <div className={cn("space-y-0.5", isCollapsed ? "px-2" : "px-3")}>
                {visibleItems.map((item) => {
                  const isActive = location === item.href;
                  
                  return (
                    <Link key={item.href} href={item.href} onClick={() => {
                      handleMenuClick();
                      onClose?.();
                    }}>
                      <div className={cn(
                        "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer relative",
                        isCollapsed ? "justify-center" : "gap-3",
                        isActive 
                          ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-white border-l-[3px] border-indigo-400 ml-0" 
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-l-[3px] border-transparent"
                      )}>
                        <item.icon className={cn(
                          "w-[18px] h-[18px] transition-colors",
                          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"
                        )} />
                        {!isCollapsed && <span className="flex-1">{item.label}</span>}
                        {!isCollapsed && isActive && (
                          <ChevronRight className="w-4 h-4 text-indigo-400" />
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
      <div className={cn("border-t border-slate-800/80", isCollapsed ? "p-3" : "p-4")}>
        {user && (
          <>
            <div className={cn("flex items-center mb-3", isCollapsed ? "justify-center" : "gap-3 px-2")}>
              {(user as any).photoUrl ? (
                <img 
                  src={(user as any).photoUrl} 
                  alt={user.name || user.username} 
                  className="w-9 h-9 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name || user.username}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
                </div>
              )}
            </div>
            <div className={cn("flex", isCollapsed ? "flex-col gap-2" : "gap-2")}>
              <Link href="/profile" onClick={handleMenuClick} className="flex-1">
                <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors">
                  <User className="w-3.5 h-3.5" />
                  {!isCollapsed && "Profile"}
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {!isCollapsed && "Logout"}
              </button>
            </div>
          </>
        )}
        {!user && (
          <Link href="/auth" onClick={handleMenuClick}>
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors">
              <User className="w-4 h-4" />
              Sign In
            </button>
          </Link>
        )}
      </div>
      </aside>
    </>
  );
}
