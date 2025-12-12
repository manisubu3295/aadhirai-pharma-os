import { createContext, useContext, useState, ReactNode } from "react";

type PlanType = "BASIC" | "PRO";

interface PlanContextType {
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
  isPro: boolean;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const PLAN_STORAGE_KEY = "pharmacy_plan_mode";

export function PlanProvider({ children }: { children: ReactNode }) {
  // Plan gating removed - all features now available to all users
  // The plan state is kept for backward compatibility but isPro is always true
  const [plan, setPlanState] = useState<PlanType>("PRO");

  const setPlan = (newPlan: PlanType) => {
    setPlanState(newPlan);
  };

  return (
    <PlanContext.Provider value={{ plan, setPlan, isPro: true }}>
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
