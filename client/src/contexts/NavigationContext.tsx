import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export interface MenuWithPermissions {
  id: number;
  key: string;
  label: string;
  routePath: string;
  icon: string | null;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
  canView: boolean;
  canEdit: boolean;
}

interface NavigationContextType {
  menus: MenuWithPermissions[];
  isLoading: boolean;
  error: Error | null;
  hasAccess: (routePath: string) => boolean;
  canEdit: (routePath: string) => boolean;
  refetch: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const { data: menus = [], isLoading, error, refetch } = useQuery<MenuWithPermissions[]>({
    queryKey: ["navigation", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch("/api/me/menus", { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error("Failed to fetch navigation");
      }
      return response.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const hasAccess = useCallback((routePath: string) => {
    if (!user) return false;
    if (user.role === "owner" || user.role === "admin") return true;
    return menus.some(menu => menu.routePath === routePath && menu.canView);
  }, [user, menus]);

  const canEdit = useCallback((routePath: string) => {
    if (!user) return false;
    if (user.role === "owner" || user.role === "admin") return true;
    return menus.some(menu => menu.routePath === routePath && menu.canEdit);
  }, [user, menus]);

  return (
    <NavigationContext.Provider value={{ 
      menus, 
      isLoading, 
      error: error as Error | null, 
      hasAccess, 
      canEdit,
      refetch 
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

export function groupMenusBySection(menus: MenuWithPermissions[]): { section: string; items: MenuWithPermissions[] }[] {
  const sections: { [key: string]: MenuWithPermissions[] } = {
    OPERATIONS: [],
    "INVENTORY & PURCHASE": [],
    "CUSTOMERS & CREDIT": [],
    "REPORTS & ANALYTICS": [],
    ADMINISTRATION: [],
  };

  for (const menu of menus) {
    const key = menu.key;
    if (key === "dashboard" || key.startsWith("sales.")) {
      sections.OPERATIONS.push(menu);
    } else if (key.startsWith("inventory.")) {
      sections["INVENTORY & PURCHASE"].push(menu);
    } else if (key.startsWith("customers.")) {
      sections["CUSTOMERS & CREDIT"].push(menu);
    } else if (key.startsWith("reports.")) {
      sections["REPORTS & ANALYTICS"].push(menu);
    } else if (key.startsWith("admin.")) {
      sections.ADMINISTRATION.push(menu);
    }
  }

  return Object.entries(sections)
    .filter(([_, items]) => items.length > 0)
    .map(([section, items]) => ({ section, items: items.sort((a, b) => a.displayOrder - b.displayOrder) }));
}
