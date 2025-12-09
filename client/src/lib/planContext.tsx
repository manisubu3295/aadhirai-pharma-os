import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type PlanType = "BASIC" | "PRO";

interface PlanContextType {
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
  isPro: boolean;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const PLAN_STORAGE_KEY = "pharmacy_plan_mode";

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<PlanType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PLAN_STORAGE_KEY);
      return (stored as PlanType) || "BASIC";
    }
    return "BASIC";
  });

  useEffect(() => {
    localStorage.setItem(PLAN_STORAGE_KEY, plan);
  }, [plan]);

  const setPlan = (newPlan: PlanType) => {
    setPlanState(newPlan);
  };

  return (
    <PlanContext.Provider value={{ plan, setPlan, isPro: plan === "PRO" }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}
