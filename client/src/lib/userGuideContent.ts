export interface UserGuideEntry {
  title: string;
  description: string;
  tips?: string[];
}

// Keyed by the same `menus.key` values seeded in server/storage.ts
// seedDefaultMenus(). A menu with no entry here simply shows no guide card —
// harmless, not an error.
export const userGuideContent: Record<string, UserGuideEntry> = {
  dashboard: {
    title: "Dashboard",
    description: "Your daily snapshot — today's sales, low-stock alerts, and recent activity at a glance when you log in.",
    tips: ["Check this first thing each shift to catch stock or expiry issues early."],
  },
  "sales.new": {
    title: "New Sale (POS)",
    description: "The main billing screen. Search a medicine, add it to the cart, pick a payment method, and print or email the invoice.",
    tips: [
      "The medicine search lists near-expiry batches first — sell older stock before newer stock (FEFO).",
      "Card and Credit payment options only appear if enabled in Settings → Invoice Settings.",
    ],
  },
  "sales.pos": {
    title: "Point of Sale",
    description: "An alternate, streamlined billing view for fast counter sales.",
  },
  "sales.credit": {
    title: "Credit Billing",
    description: "View and manage customers who have outstanding credit balances — see what's owed and record payments against past credit sales.",
    tips: ["This is separate from the Credit payment option at checkout — that toggle lives in Settings."],
  },
  "sales.refund": {
    title: "Medicine Refund",
    description: "Process a return against a past invoice. Search the original bill, choose the items and quantity (in strips or base units) to return, and the refund amount is calculated automatically from what the customer actually paid.",
    tips: ["A sale can be returned in multiple partial visits — the app tracks how much of each item has already been returned."],
  },
  "inventory.medicines": {
    title: "Medicines / Products",
    description: "The master list of every medicine you stock — pricing, GST rate, reorder level, and current stock. Filter by Low Stock, Out of Stock, Near Expiry, or Expired, and sort any column including Expiry.",
    tips: ["The list defaults to soonest-expiring stock first so problems surface immediately."],
  },
  "inventory.suppliers": {
    title: "Suppliers",
    description: "Your supplier directory, plus each supplier's running ledger — what you've purchased and what you still owe.",
  },
  "inventory.rates": {
    title: "Rate Master",
    description: "Track and compare the rates different suppliers quote for the same medicine, so you can source at the best price.",
  },
  "inventory.po": {
    title: "Purchase Orders",
    description: "Create and track purchase orders sent to suppliers — what's pending, partially received, or fully received.",
  },
  "inventory.grn": {
    title: "Goods Receipt (GRN)",
    description: "Record stock as it physically arrives against a purchase order (or directly), setting batch numbers, expiry dates, and purchase rates for each item received.",
  },
  "inventory.returns": {
    title: "Purchase Returns",
    description: "Send stock back to a supplier — damaged, expired, or wrongly ordered — and track the refund or credit note you receive for it.",
  },
  "customers.accounts": {
    title: "Customer Accounts",
    description: "Your customer directory with contact details, credit limits, and purchase history.",
  },
  "customers.doctors": {
    title: "Doctors",
    description: "Manage referring doctors and their commission settings, so referred sales are tracked and commissions computed automatically.",
  },
  "customers.collections": {
    title: "Collections",
    description: "A combined view of sales and returns for a period, useful for reconciling what came in and went out over a day, week, or custom range.",
  },
  "reports.sales": {
    title: "Sales Reports",
    description: "Sales totals and trends by day, top-selling medicines, payment method breakdown, and expiry/stock summaries — with CSV/PDF export.",
  },
  "reports.analytics": {
    title: "Owner Analytics",
    description: "A higher-level business view — revenue trends, top medicines, and payment mix over the last 7/30 days.",
  },
  "reports.doctor-referrals": {
    title: "Doctor Referrals",
    description: "Commission earned per referring doctor: a Summary of totals, a Transactions ledger of every individual entry, and Monthly/Quarterly/Yearly rollups.",
    tips: ["\"Earned\" comes from completed sales; \"Paid\" comes from payouts you record against a doctor from the Doctors page."],
  },
  "admin.audit": {
    title: "Audit Log",
    description: "A record of who changed what and when — every create, update, delete, login, and logout across the app, for accountability and troubleshooting.",
  },
  "admin.tally": {
    title: "Tally Export",
    description: "Export sales and purchase data in a format ready to import into Tally for accounting.",
  },
  "admin.day-closing": {
    title: "Day Closing",
    description: "Open and close the business day, recording opening/closing cash and reconciling expected vs. actual cash in hand.",
  },
  "operations.expenses": {
    title: "Petty Cash / Expenses",
    description: "Log day-to-day cash expenses (courier, cleaning, tea, etc.) so they're accounted for in your daily cash reconciliation.",
  },
  "operations.approvals": {
    title: "Approval Requests",
    description: "Review and approve/reject sensitive changes raised by staff — like price overrides or stock corrections — that need a supervisor's sign-off.",
  },
  "operations.stock-adjustments": {
    title: "Stock Adjustments",
    description: "Correct stock counts for damage, loss, expiry write-off, or a physical stock-take mismatch, with a reason recorded for each adjustment.",
  },
  "operations.shift-handover": {
    title: "Shift Handover",
    description: "Record cash and notes when one staff member's shift ends and another begins, so responsibility for the till is clearly logged.",
  },
  "admin.locations": {
    title: "Storage Locations",
    description: "Define physical storage locations (racks, shelves, cold storage) and assign medicines to them, so staff can find stock quickly.",
  },
  "admin.settings": {
    title: "Settings",
    description: "Store profile, GST configuration, invoice options, payment method toggles, user management, and database backups — the central configuration screen.",
  },
  "admin.users": {
    title: "User Management",
    description: "Create staff logins and assign each one a Role (from Role Master), which controls both their login permissions and which menus they see.",
  },
  "admin.menus": {
    title: "Menu Management",
    description: "The master list of every menu in the app and whether it's active. Turning a menu off hides it for everyone except full-access accounts.",
  },
  "admin.groups": {
    title: "Menu Groups",
    description: "Bundle related menus into a named group (e.g. \"Inventory & Purchase\") so they can be granted to a role or user all at once.",
  },
  "admin.user-access": {
    title: "User Access",
    description: "Fine-tune one specific user's menu access — individual menus, menu groups, or their assigned role — beyond what their Role grants by default.",
    tips: ["Priority order: individual menu overrides beat menu groups, which beat the role's baseline."],
  },
  "admin.roles": {
    title: "Role Master",
    description: "Define roles (e.g. Cashier, Pharmacist) with a login-permission tier and a default set of menu groups, so you can onboard new staff by just assigning a role.",
  },
  "operations.my-sales": {
    title: "My Sales",
    description: "A personal view of the sales you've made — useful for staff to review their own billing without seeing the whole store's data.",
  },
  "operations.my-activity": {
    title: "My Activity",
    description: "A personal activity log of actions you've taken in the app.",
  },
};
