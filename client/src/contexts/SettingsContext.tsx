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
  enableCardPayment: boolean;
  enableCreditBilling: boolean;
}

// Identity fields (name/address/phone/email/license/GSTIN) intentionally have
// no placeholder text — they must always come from what the pharmacy saved
// in Settings, never a fallback brand name that could end up on a real bill.
const defaultSettings: AppSettings = {
  storeName: "",
  storePhone: "",
  storeAddress: "",
  storeEmail: "",
  dlNo: "",
  gstin: "",
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
  enableCardPayment: false,
  enableCreditBilling: false,
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
        enableCardPayment: rawSettings.enableCardPayment === "true",
        enableCreditBilling: rawSettings.enableCreditBilling === "true",
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
