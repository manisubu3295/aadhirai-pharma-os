export interface AssistantModuleDescriptor {
  route: string;
  title: string;
  summary: string;
  keywords: string[];
  commonTasks: string[];
}

export const assistantModuleCatalog: AssistantModuleDescriptor[] = [
  {
    route: "/",
    title: "Dashboard Overview",
    summary: "High-level operational snapshot for sales, stock movement, notifications, and business follow-up.",
    keywords: ["dashboard", "overview", "home", "summary"],
    commonTasks: ["review alerts", "monitor operations", "spot exceptions"],
  },
  {
    route: "/inventory",
    title: "Inventory Management",
    summary: "Maintain medicine master data, stock quantities, storage locations, pricing, and reorder visibility.",
    keywords: ["inventory", "stock", "medicine", "batch", "location", "expiry"],
    commonTasks: ["find stock issues", "check availability", "review reorder items"],
  },
  {
    route: "/pos",
    title: "POS Billing",
    summary: "Operational point-of-sale workspace for quick medicine billing and walk-in customer checkout.",
    keywords: ["pos", "billing", "checkout", "counter", "sale"],
    commonTasks: ["create a bill", "apply payment method", "complete a retail sale"],
  },
  {
    route: "/new-sale",
    title: "New Sale",
    summary: "Detailed sale entry workflow for invoice creation, payment handling, and line-level medicine capture.",
    keywords: ["new sale", "invoice", "sale entry", "billing"],
    commonTasks: ["draft an invoice", "capture patient sale", "review totals before posting"],
  },
  {
    route: "/collections",
    title: "Collections",
    summary: "Track customer receivables, outstanding balances, and collection follow-ups.",
    keywords: ["collections", "receivable", "outstanding", "credit payment"],
    commonTasks: ["follow up on dues", "review customer balance", "record collections"],
  },
  {
    route: "/reports",
    title: "Reports",
    summary: "Reporting area for business review, operational analysis, and audit-oriented outputs.",
    keywords: ["reports", "analytics", "business insights", "summary"],
    commonTasks: ["understand a report", "review trends", "prepare management notes"],
  },
  {
    route: "/purchase-orders",
    title: "Purchase Orders",
    summary: "Create and track supplier purchase orders, quantities, rates, and expected deliveries.",
    keywords: ["purchase order", "po", "supplier order", "procurement"],
    commonTasks: ["create a PO", "review pending orders", "compare supplier planning"],
  },
  {
    route: "/goods-receipts",
    title: "Goods Receipts",
    summary: "Receive supplier deliveries, capture batches, expiry, and inventory inward postings.",
    keywords: ["goods receipt", "grn", "receiving", "batch inward"],
    commonTasks: ["post a GRN", "validate batch data", "check pending receipt"],
  },
  {
    route: "/purchase-returns",
    title: "Purchase Returns",
    summary: "Manage supplier returns, defective stock handling, and reversal documentation.",
    keywords: ["purchase return", "supplier return", "return stock"],
    commonTasks: ["return damaged stock", "review return note", "explain return workflow"],
  },
  {
    route: "/suppliers",
    title: "Suppliers",
    summary: "Maintain supplier master data, contact details, financial standing, and payment support flows.",
    keywords: ["supplier", "vendor", "supplier master"],
    commonTasks: ["find supplier details", "review supplier status", "open supplier ledger"],
  },
  {
    route: "/supplier-rates",
    title: "Supplier Rates",
    summary: "Compare supplier pricing, discounts, and lead times for procurement decisions.",
    keywords: ["supplier rates", "vendor pricing", "rate comparison"],
    commonTasks: ["compare purchase rates", "review lead times", "evaluate sourcing"],
  },
  {
    route: "/audit-log",
    title: "Audit Log",
    summary: "Trace user activity and important operational changes for compliance and accountability.",
    keywords: ["audit", "activity log", "history", "trace"],
    commonTasks: ["investigate a change", "review user action", "support compliance checks"],
  },
  {
    route: "/settings",
    title: "Settings",
    summary: "Configure application-wide settings, billing preferences, and store identity information.",
    keywords: ["settings", "configuration", "app setup"],
    commonTasks: ["update business settings", "configure invoice defaults", "review application setup"],
  },
  {
    route: "/approvals",
    title: "Approvals",
    summary: "Handle approval workflows and operational requests that need supervision.",
    keywords: ["approval", "authorization", "pending approval"],
    commonTasks: ["review pending approvals", "explain approval status", "guide next action"],
  },
  {
    route: "/stock-adjustments",
    title: "Stock Adjustments",
    summary: "Correct inventory variances, damages, and reconciliation exceptions with controlled updates.",
    keywords: ["stock adjustment", "variance", "reconciliation"],
    commonTasks: ["adjust stock", "explain variance handling", "review correction process"],
  },
];

export function findModuleByRoute(route?: string | null): AssistantModuleDescriptor | undefined {
  if (!route) {
    return undefined;
  }

  return assistantModuleCatalog.find((entry) => entry.route === route);
}

export function searchModulesByQuestion(question: string): AssistantModuleDescriptor[] {
  const normalized = question.toLowerCase();
  return assistantModuleCatalog.filter((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())) ||
    normalized.includes(entry.title.toLowerCase()),
  );
}