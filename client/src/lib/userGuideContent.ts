export interface UserGuideEntry {
  title: string;
  description: string;
  tips?: string[];
  /** Numbered "how to use it" walkthrough steps. */
  steps?: string[];
  /** Common mistakes people make on this screen — rendered as a distinct warning callout. */
  mistakes?: string[];
  /** Path under /guide/, e.g. "/guide/sales-new.png". Populate once a real screenshot exists. */
  screenshot?: string;
  screenshotAlt?: string;
}

// Keyed by the same `menus.key` values seeded in server/storage.ts
// seedDefaultMenus(). A menu with no entry here simply shows no guide card —
// harmless, not an error.
export const userGuideContent: Record<string, UserGuideEntry> = {
  dashboard: {
    title: "Dashboard",
    description: "Your daily snapshot — today's sales, low-stock alerts, and recent activity at a glance when you log in.",
    tips: ["Check this first thing each shift to catch stock or expiry issues early."],
    steps: [
      "Glance at the KPI cards for a quick pulse: Net Revenue, Total Returns, Low Stock Items, Customers Today.",
      "Scroll to Stock Alerts and Expiry Alerts — anything listed here needs action today.",
      "Check the Revenue Overview chart for the week's shape; a sudden dip is worth investigating same-day.",
      "Recent Transactions shows the latest sales system-wide — click View All to open full Sales Reports.",
    ],
    mistakes: [
      "Net Revenue and Total Returns are all-time totals, not today's figures — don't read them as a daily number.",
      "Customers Today counts sales made today, not unique customers — one customer buying twice counts as two.",
      "If a number here looks stuck or wrong, refresh the page before assuming something's broken — it can lag a few seconds right after a sale.",
    ],
  },
  "sales.new": {
    title: "New Sale (POS)",
    description: "The main billing screen. Search a medicine, add it to the cart, pick a payment method, and print or email the invoice.",
    tips: [
      "The medicine search lists near-expiry batches first — sell older stock before newer stock (FEFO).",
      "Card and Credit payment options only appear if enabled in Settings → Invoice Settings.",
    ],
    steps: [
      "Search and select the customer first (or add one inline) — this attaches the invoice to their purchase history.",
      "Optionally pick a referring Doctor so their commission is tracked automatically.",
      "Search a medicine by name, generic name, or batch — near-expiry stock is shown first so it sells before it expires.",
      "Adjust quantity, switching between Strip and Unit if the medicine is sold in packs — price recalculates automatically.",
      "Choose a payment method. Card and Credit only appear if enabled in Settings → Invoice Settings.",
      "Press Complete (or F8) to finalize — the invoice prints or emails automatically if those options are ticked.",
    ],
    mistakes: [
      "Switching the Strip/Unit dropdown after typing a quantity — re-check the number afterward, since 1 strip and 1 unit are very different amounts.",
      "Forgetting to select a doctor when a customer was referred — that sale's commission can't be added retroactively from this screen.",
      "Confusing Hold (F5, saves the cart for later) with Cancel (discards it completely) — they sit close together in the toolbar.",
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
    steps: [
      "Search for the original invoice by number, customer name, or phone.",
      "Pick the item(s) being returned and enter the quantity — in strips or base units, whichever the customer brought back.",
      "Review the refund amount before confirming — it's calculated from what was actually paid on that line, not today's price.",
      "Confirm the return; the exact batch that was sold is restocked automatically.",
    ],
    mistakes: [
      "Assuming the refund equals today's selling price × quantity — it's based on the paid amount on the original invoice, which may reflect a discount that day.",
      "Worrying that a partial return will let a customer over-claim — the app tracks how much of each line has already been returned and won't exceed what was paid.",
    ],
  },
  "inventory.medicines": {
    title: "Medicines / Products",
    description: "The master list of every medicine you stock — pricing, GST rate, reorder level, and current stock. Filter by Low Stock, Out of Stock, Near Expiry, or Expired, and sort any column including Expiry.",
    tips: ["The list defaults to soonest-expiring stock first so problems surface immediately."],
    steps: [
      "Use the filters (Low Stock, Out of Stock, Near Expiry, Expired) to triage what needs attention today.",
      "Click any column header, including Expiry, to sort — it defaults to soonest-expiring stock first.",
      "Open a medicine to edit its price, GST rate, or reorder level.",
      "Add a brand-new product here, or add another batch of an existing one via Opening Stock.",
    ],
    mistakes: [
      "If the total stock for a medicine looks wrong, check whether it was accidentally added twice under a slightly different name — stock is the sum across every batch of that exact medicine.",
      "Editing the price here only affects future sales — it doesn't change already-completed invoices.",
      "Expecting the same Low Stock cutoff for every medicine — it's each medicine's own Reorder Level, so two medicines with equal quantity can show different statuses.",
    ],
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
    steps: [
      "Select the supplier and the batch being returned.",
      "Enter the quantity and reason — this reduces your stock and logs what you expect back as refund or credit note.",
      "Reconcile the credit note against the supplier's ledger from the Suppliers page once it arrives.",
    ],
    mistakes: [
      "Using this for a customer's return instead of a supplier's — for a customer bringing something back, use Medicine Refund; the two are easy to mix up by name.",
      "Assuming the credit is applied automatically — recording the return here doesn't mean the supplier has issued it yet.",
    ],
  },
  "customers.accounts": {
    title: "Customer Accounts",
    description: "Your customer directory with contact details, credit limits, and purchase history.",
    steps: [
      "Search or add a customer here before billing them for the first time — New Sale can also add one inline, but this is the full record.",
      "Open a customer to see their full purchase history and outstanding balance.",
      "Set a Credit Limit here if this customer is allowed to buy on credit.",
    ],
    mistakes: [
      "Billing a customer on Credit when their limit is still ₹0 won't work at checkout — set the limit here first.",
      "Adding the same customer twice with slightly different name spelling — search by phone number first, since it splits their purchase history across two records otherwise.",
    ],
  },
  "customers.doctors": {
    title: "Doctors",
    description: "Manage referring doctors and their commission settings, so referred sales are tracked and commissions computed automatically.",
    steps: [
      "Add a doctor with a commission basis — either a Percentage of the sale or a Fixed Amount per referred sale.",
      "Select this doctor at checkout on New Sale to attribute the sale and accrue their commission automatically.",
      "Record a payout here when you actually pay a doctor, so Doctor Referrals shows accurate Earned vs Paid figures.",
    ],
    mistakes: [
      "Expecting a commission-rate change to apply retroactively — it only affects sales referred after the change; past sales keep the rate active at the time.",
      "Confusing Earned with Paid — earned accrues automatically from sales, paid only changes when you record a payout here.",
    ],
  },
  "customers.collections": {
    title: "Collections",
    description: "A combined view of sales and returns for a period, useful for reconciling what came in and went out over a day, week, or custom range.",
    steps: [
      "Pick a date range to see all sales and returns together for that period.",
      "Compare the total collected against your physical cash/UPI/card totals for the same period.",
    ],
    mistakes: [
      "Assuming a low net figure means a slow sales day — this view nets sales against returns, so a single large return can pull the total down; check the breakdown before concluding anything.",
    ],
  },
  "reports.sales": {
    title: "Sales Reports",
    description: "Sales totals and trends by day, top-selling medicines, payment method breakdown, and expiry/stock summaries — with CSV/PDF export.",
    steps: [
      "Choose a date range, then review totals, top-selling medicines, and payment method breakdown for that period.",
      "Export to CSV or PDF for accounting or to share with your accountant.",
    ],
    mistakes: [
      "Expecting a Held (not yet completed) bill from New Sale to show up here — reports only include completed sales.",
    ],
  },
  "reports.analytics": {
    title: "Owner Analytics",
    description: "A higher-level business view — revenue trends, top medicines, and payment mix over the last 7/30 days.",
  },
  "reports.doctor-referrals": {
    title: "Doctor Referrals",
    description: "Commission earned per referring doctor: a Summary of totals, a Transactions ledger of every individual entry, and Monthly/Quarterly/Yearly rollups.",
    tips: ["\"Earned\" comes from completed sales; \"Paid\" comes from payouts you record against a doctor from the Doctors page."],
    steps: [
      "Open the Summary tab for total commission earned per doctor over a period.",
      "Switch to Transactions for the itemized ledger of every referred sale behind that total.",
      "Use the Monthly/Quarterly/Yearly rollups to plan payout schedules.",
    ],
    mistakes: [
      "Expecting a sale to be attributed to a doctor after the fact — commission is only tracked if the doctor was actually selected at checkout on New Sale, it can't be added retroactively from this screen.",
      "If a number looks stuck right after a sale, refresh the page before assuming it's wrong.",
    ],
  },
  "admin.audit": {
    title: "Audit Log",
    description: "A record of who changed what and when — every create, update, delete, login, and logout across the app, for accountability and troubleshooting.",
    steps: [
      "Filter by user, action type, or date to investigate a specific change.",
      "Use it to answer \"who changed this price\" or \"who deleted that customer\" questions.",
    ],
    mistakes: [
      "Treating it as an undo button — the audit log only records what happened, it doesn't reverse anything.",
    ],
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
    steps: [
      "Select the medicine, then the specific batch you're correcting.",
      "Choose Increase or Decrease, enter the quantity, and pick a reason (Damage, Expiry, Theft/Loss, Stock Take Variance, etc.).",
      "Add a note for anything unusual — it becomes part of the permanent record for that adjustment.",
    ],
    mistakes: [
      "A medicine showing no batches to select usually means it has no opening stock recorded yet — add opening stock first from Inventory tools.",
      "An adjustment can't be edited or deleted afterward — double-check the quantity and batch before confirming.",
    ],
  },
  "operations.shift-handover": {
    title: "Shift Handover",
    description: "Record cash and notes when one staff member's shift ends and another begins, so responsibility for the till is clearly logged.",
  },
  "admin.locations": {
    title: "Storage Locations",
    description: "Define physical storage locations (racks, shelves, cold storage) and assign medicines to them, so staff can find stock quickly.",
    steps: [
      "Define your physical layout once — Rack, Row, Shelf/Bin.",
      "Assign medicines to a location as you receive stock, so any staff member can find them on the shelf without asking.",
    ],
    mistakes: [
      "Deleting a location doesn't move or affect the actual stock assigned to it — but staff lose the \"where is it\" reference until it's reassigned.",
    ],
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
