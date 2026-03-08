import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface AppSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeEmail: string;
  dlNo: string;
  gstin: string;
  stateCode: string;
  autoGst: boolean;
  invoicePrefix: string;
  startNumber: string;
  showMrp: boolean;
  showGstBreakup: boolean;
  showDoctor: boolean;
  printOnSave: boolean;
  defaultGrnDiscountRate: string;
  defaultGrnGstMode: "item" | "header";
}

const defaultSettings: AppSettings = {
  storeName: "Aadhirai Innovations Pharmacy",
  storePhone: "+91 98765 43210",
  storeAddress: "123 Main Street, Chennai, Tamil Nadu - 600001",
  storeEmail: "contact@aadhiraipharmacy.com",
  dlNo: "TN-01-123456",
  gstin: "33AABCU9603R1ZM",
  stateCode: "33",
  autoGst: true,
  invoicePrefix: "INV-",
  startNumber: "1001",
  showMrp: true,
  showGstBreakup: true,
  showDoctor: true,
  printOnSave: false,
  defaultGrnDiscountRate: "5",
  defaultGrnGstMode: "item",
};

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: rawSettings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const settings: AppSettings = rawSettings
    ? {
        storeName: rawSettings.storeName || defaultSettings.storeName,
        storePhone: rawSettings.storePhone || defaultSettings.storePhone,
        storeAddress: rawSettings.storeAddress || defaultSettings.storeAddress,
        storeEmail: rawSettings.storeEmail || defaultSettings.storeEmail,
        dlNo: rawSettings.dlNo || defaultSettings.dlNo,
        gstin: rawSettings.gstin || defaultSettings.gstin,
        stateCode: rawSettings.stateCode || defaultSettings.stateCode,
        autoGst: rawSettings.autoGst === "true",
        invoicePrefix: rawSettings.invoicePrefix || defaultSettings.invoicePrefix,
        startNumber: rawSettings.startNumber || defaultSettings.startNumber,
        showMrp: rawSettings.showMrp !== "false",
        showGstBreakup: rawSettings.showGstBreakup !== "false",
        showDoctor: rawSettings.showDoctor !== "false",
        printOnSave: rawSettings.printOnSave === "true",
        defaultGrnDiscountRate: rawSettings.defaultGrnDiscountRate || defaultSettings.defaultGrnDiscountRate,
        defaultGrnGstMode: rawSettings.defaultGrnGstMode === "header" ? "header" : "item",
      }
    : defaultSettings;

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
