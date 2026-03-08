import "dotenv/config";

import { 
  type User, 
  type InsertUser,
  type Medicine,
  type InsertMedicine,
  type GenericName,
  type InsertGenericName,
  type Customer,
  type InsertCustomer,
  type Doctor,
  type InsertDoctor,
  type Sale,
  type InsertSale,
  type SaleItem,
  type CreateSaleItem,
  type Location,
  type InsertLocation,
  type AuditLog,
  type InsertAuditLog,
  type CreditPayment,
  type InsertCreditPayment,
  type HeldBill,
  type InsertHeldBill,
  type Supplier,
  type InsertSupplier,
  type SupplierRate,
  type InsertSupplierRate,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type GoodsReceipt,
  type InsertGoodsReceipt,
  type GoodsReceiptItem,
  type InsertGoodsReceiptItem,
  type SalesReturn,
  type InsertSalesReturn,
  type SalesReturnItem,
  type InsertSalesReturnItem,
  type AppSetting,
  type Menu,
  type InsertMenu,
  type MenuGroup,
  type InsertMenuGroup,
  type MenuGroupMenu,
  type InsertMenuGroupMenu,
  type UserMenu,
  type InsertUserMenu,
  type UserMenuGroup,
  type InsertUserMenuGroup,
  type MenuWithPermissions,
  type SupplierTransaction,
  type InsertSupplierTransaction,
  type SupplierPayment,
  type InsertSupplierPayment,
  type PurchaseReturn,
  type InsertPurchaseReturn,
  type PurchaseReturnItem,
  type InsertPurchaseReturnItem,
  type DayClosing,
  type InsertDayClosing,
  type ActivityLog,
  type InsertActivityLog,
  type PettyCashExpense,
  type InsertPettyCashExpense,
  type ApprovalRequest,
  type InsertApprovalRequest,
  type StockAdjustment,
  type InsertStockAdjustment,
  users,
  medicines,
  genericNames,
  customers,
  doctors,
  sales,
  saleItems,
  locations,
  auditLogs,
  creditPayments,
  heldBills,
  suppliers,
  supplierRates,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  salesReturns,
  salesReturnItems,
  appSettings,
  sequences,
  menus,
  menuGroups,
  menuGroupMenus,
  userMenus,
  userMenuGroups,
  supplierTransactions,
  supplierPayments,
  purchaseReturns,
  purchaseReturnItems,
  dayClosings,
  activityLogs as activityLogsTable,
  pettyCashExpenses,
  approvalRequests,
  stockAdjustments
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, sql, and, gte, lte, or } from "drizzle-orm";

console.log("Database URL:" + JSON.stringify(process.env.DATABASE_URL));
console.log("DATABASE_URL =", process.env.DATABASE_URL);
console.log("PGDATABASE   =", process.env.PGDATABASE);

const DEFAULT_DATABASE_NAME = "medora_vasantham";

function withDatabaseName(connectionString: string, databaseName: string): string {
  const parsedUrl = new URL(connectionString);
  parsedUrl.pathname = `/${databaseName}`;
  return parsedUrl.toString();
}

function getResolvedDatabaseConfig() {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const parsedUrl = new URL(rawConnectionString);
  const dbFromUrl = parsedUrl.pathname.replace(/^\//, "").trim();
  const resolvedDatabaseName = dbFromUrl || process.env.PGDATABASE || DEFAULT_DATABASE_NAME;
  const resolvedConnectionString = withDatabaseName(rawConnectionString, resolvedDatabaseName);

  return {
    resolvedDatabaseName,
    resolvedConnectionString,
    adminConnectionString: withDatabaseName(resolvedConnectionString, "postgres"),
  };
}

const databaseConfig = getResolvedDatabaseConfig();

async function ensureDatabaseExists() {
  const adminPool = new Pool({
    connectionString: databaseConfig.adminConnectionString,
    max: 1,
  });

  try {
    const checkResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseConfig.resolvedDatabaseName],
    );

    if (checkResult.rowCount === 0) {
      const safeDatabaseName = databaseConfig.resolvedDatabaseName.replace(/"/g, '""');
      await adminPool.query(`CREATE DATABASE "${safeDatabaseName}"`);
      console.log(`Database created: ${databaseConfig.resolvedDatabaseName}`);
    }
  } catch (error: any) {
    if (error?.code !== "42P04") {
      throw error;
    }
  } finally {
    await adminPool.end();
  }
}

async function seedDefaultAppSettings() {
  const settingsCountResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM app_settings`,
  );

  const existingCount = Number(settingsCountResult.rows[0]?.count || "0");
  if (existingCount > 0) {
    console.log(`Skipping app settings seed: ${existingCount} existing rows found`);
    return;
  }

  const defaultSettings: Record<string, string> = {
    storeName: "Medora+",
    storePhone: "+91 98765 43210",
    storeAddress: "123 Main Street, Chennai, Tamil Nadu - 600001",
    storeEmail: "contact@medoraplus.com",
    dlNo: "TN-01-123456",
    gstin: "33AABCU9603R1ZM",
    stateCode: "33",
    autoGst: "true",
    invoicePrefix: "INV-",
    startNumber: "1001",
    showMrp: "true",
    showGstBreakup: "true",
    showDoctor: "true",
    printOnSave: "false",
    defaultGrnDiscountRate: "5",
    defaultGrnGstMode: "item",
  };

  const valueColumnResult = await pool.query<{
    data_type: string;
    udt_name: string;
  }>(
    `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'app_settings'
        AND column_name = 'value'
      LIMIT 1
    `,
  );

  const valueColumn = valueColumnResult.rows[0];
  const isJsonValueColumn = valueColumn
    ? valueColumn.data_type === "json" || valueColumn.udt_name === "jsonb"
    : false;

  for (const [key, value] of Object.entries(defaultSettings)) {
    const preparedValue = isJsonValueColumn ? JSON.stringify(value) : value;

    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, preparedValue],
    );
  }

  console.log(`Seeded default app settings: ${Object.keys(defaultSettings).length} rows`);
}

export const pool = new Pool({
  connectionString: databaseConfig.resolvedConnectionString,
});

export const db = drizzle(pool);

export async function initializeDatabase() {
  try {
    await ensureDatabaseExists();

  const r = await pool.query("select current_database() as db");
console.log("Connected DB:", r.rows[0].db);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'staff',
        email TEXT,
        phone TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS medicines (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        generic_name TEXT,
        sku_name TEXT,
        batch_number TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        mrp DECIMAL(10,2),
        gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
        hsn_code TEXT,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'In Stock',
        reorder_level INTEGER NOT NULL DEFAULT 50,
        barcode TEXT,
        min_stock INTEGER DEFAULT 10,
        max_stock INTEGER DEFAULT 500,
        location_id INTEGER
      );

      ALTER TABLE medicines
        ADD COLUMN IF NOT EXISTS generic_name TEXT,
        ADD COLUMN IF NOT EXISTS sku_name TEXT;

      CREATE TABLE IF NOT EXISTS generic_names (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_generic_names_name_lower
      ON generic_names (LOWER(name));
      
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        gstin TEXT,
        credit_limit DECIMAL(10,2) DEFAULT 0,
        outstanding_balance DECIMAL(10,2) DEFAULT 0,
        credit_period_days INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        specialization TEXT,
        phone TEXT,
        registration_no TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        rack TEXT NOT NULL,
        row TEXT NOT NULL,
        bin TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        invoice_no TEXT,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_gstin TEXT,
        doctor_id INTEGER,
        doctor_name TEXT,
        prescription_url TEXT,
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        cgst DECIMAL(10,2) NOT NULL DEFAULT 0,
        sgst DECIMAL(10,2) NOT NULL DEFAULT 0,
        igst DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        round_off DECIMAL(10,2) DEFAULT 0,
        payment_method TEXT NOT NULL,
        payment_reference TEXT,
        received_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        change_amount DECIMAL(10,2) DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Completed',
        print_invoice BOOLEAN NOT NULL DEFAULT false,
        send_via_email BOOLEAN NOT NULL DEFAULT false,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        medicine_name TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        hsn_code TEXT,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        mrp DECIMAL(10,2),
        gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
        cgst DECIMAL(10,2) DEFAULT 0,
        sgst DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        entity_name TEXT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS credit_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS held_bills (
        id SERIAL PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_id INTEGER,
        doctor_id INTEGER,
        doctor_name TEXT,
        items TEXT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        tax DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        notes TEXT,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sales_returns (
        id SERIAL PRIMARY KEY,
        original_sale_id INTEGER NOT NULL,
        invoice_no TEXT,
        return_date TIMESTAMP DEFAULT NOW() NOT NULL,
        total_refund_amount DECIMAL(10,2) NOT NULL,
        refund_mode TEXT NOT NULL,
        reason TEXT,
        customer_id INTEGER,
        customer_name TEXT,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id SERIAL PRIMARY KEY,
        sales_return_id INTEGER NOT NULL,
        sale_item_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        medicine_name TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        quantity_returned INTEGER NOT NULL,
        price_per_unit DECIMAL(10,2) NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sequences (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        current_value INTEGER NOT NULL DEFAULT 0,
        prefix TEXT NOT NULL DEFAULT 'INV',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      INSERT INTO sequences (name, current_value, prefix) 
      VALUES ('invoice', 0, 'INV') 
      ON CONFLICT (name) DO NOTHING;
      
      -- New tables for supplier ledger, purchase returns, day closing
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS free_quantity INTEGER DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS scheme_description TEXT;
      ALTER TABLE medicines ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;
      ALTER TABLE medicines ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2);
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'STRIP';
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1;
      ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS purchase_unit TEXT DEFAULT 'STRIP';
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 1;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS ordered_qty_base INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS received_qty_base INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS pending_qty_base INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'PENDING';
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS unit_snapshot TEXT NOT NULL DEFAULT 'STRIP';
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS gst_percent_snapshot DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE';
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS po_id INTEGER;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS po_line_id INTEGER;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS received_qty_base INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS free_qty_base INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS inward_qty_base INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS gst_percent_snapshot DECIMAL(5,2) DEFAULT 0;
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE';
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS ptr DECIMAL(10,2);
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS purchase_rate_snapshot DECIMAL(10,2);
      ALTER TABLE goods_receipt_items ADD COLUMN IF NOT EXISTS default_sale_rate_snapshot DECIMAL(10,2);
      ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sold_unit_qty INTEGER;
      ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sold_qty_base INTEGER;
      ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE';

      CREATE TABLE IF NOT EXISTS inventory_batches (
        id SERIAL PRIMARY KEY,
        medicine_id INTEGER NOT NULL,
        warehouse_id INTEGER,
        batch_number TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        grn_id INTEGER,
        grn_item_id INTEGER,
        purchase_rate_snapshot DECIMAL(10,2),
        ptr_snapshot DECIMAL(10,2),
        mrp_snapshot DECIMAL(10,2),
        default_sale_rate_snapshot DECIMAL(10,2),
        gst_percent_snapshot DECIMAL(5,2) DEFAULT 0,
        tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE',
        unit_snapshot TEXT NOT NULL DEFAULT 'STRIP',
        conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
        total_inward_qty_base INTEGER NOT NULL DEFAULT 0,
        total_outward_qty_base INTEGER NOT NULL DEFAULT 0,
        available_qty_base INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_inventory_batch UNIQUE (medicine_id, warehouse_id, batch_number, expiry_date)
      );

      CREATE TABLE IF NOT EXISTS inventory_ledger (
        id SERIAL PRIMARY KEY,
        medicine_id INTEGER NOT NULL,
        warehouse_id INTEGER,
        batch_id INTEGER,
        txn_type TEXT NOT NULL,
        txn_source TEXT NOT NULL,
        source_id INTEGER,
        source_line_id INTEGER,
        qty_base INTEGER NOT NULL,
        balance_after_base INTEGER,
        unit_snapshot TEXT NOT NULL DEFAULT 'TABLET',
        conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
        purchase_rate_snapshot DECIMAL(10,2),
        ptr_snapshot DECIMAL(10,2),
        mrp_snapshot DECIMAL(10,2),
        gst_percent_snapshot DECIMAL(5,2) DEFAULT 0,
        tax_mode_snapshot TEXT NOT NULL DEFAULT 'EXCLUSIVE',
        remarks TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sale_batch_allocations (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        sale_item_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        warehouse_id INTEGER,
        batch_id INTEGER NOT NULL,
        batch_number TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        requested_qty INTEGER NOT NULL,
        requested_unit TEXT NOT NULL,
        sold_qty_base INTEGER NOT NULL,
        conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_batches_fefo
      ON inventory_batches (medicine_id, warehouse_id, expiry_date, available_qty_base)
      WHERE available_qty_base > 0;

      CREATE INDEX IF NOT EXISTS idx_inventory_ledger_source
      ON inventory_ledger (txn_source, source_id, source_line_id);

      CREATE INDEX IF NOT EXISTS idx_sale_batch_allocations_sale
      ON sale_batch_allocations (sale_id, medicine_id);
      
      CREATE TABLE IF NOT EXISTS supplier_transactions (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        reference_id INTEGER,
        reference_number TEXT,
        txn_date TIMESTAMP DEFAULT NOW() NOT NULL,
        debit_amount DECIMAL(10,2) DEFAULT 0,
        credit_amount DECIMAL(10,2) DEFAULT 0,
        remarks TEXT,
        created_by_user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL,
        payment_date TIMESTAMP DEFAULT NOW() NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_mode TEXT NOT NULL,
        reference_no TEXT,
        remarks TEXT,
        created_by_user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id SERIAL PRIMARY KEY,
        return_number TEXT NOT NULL UNIQUE,
        supplier_id INTEGER NOT NULL,
        supplier_name TEXT NOT NULL,
        original_grn_id INTEGER,
        return_date TIMESTAMP DEFAULT NOW() NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'Completed',
        created_by_user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id SERIAL PRIMARY KEY,
        purchase_return_id INTEGER NOT NULL,
        grn_item_id INTEGER,
        medicine_id INTEGER NOT NULL,
        medicine_name TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        quantity_returned INTEGER NOT NULL,
        rate DECIMAL(10,2) NOT NULL,
        gst_rate DECIMAL(5,2) DEFAULT 18,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS day_closings (
        id SERIAL PRIMARY KEY,
        business_date TEXT NOT NULL UNIQUE,
        opened_by_user_id VARCHAR(255),
        opening_cash DECIMAL(10,2) DEFAULT 0,
        opening_time TIMESTAMP,
        closed_by_user_id VARCHAR(255),
        expected_cash DECIMAL(10,2),
        actual_cash DECIMAL(10,2),
        difference DECIMAL(10,2),
        closing_time TIMESTAMP,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        description TEXT NOT NULL,
        details_before TEXT,
        details_after TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      INSERT INTO sequences (name, current_value, prefix)
      VALUES ('purchase_return', 0, 'PR')
      ON CONFLICT (name) DO NOTHING;
    `);

    await seedDefaultAppSettings();

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Record<string, any>): Promise<User | undefined>;
  
  getMedicines(): Promise<Medicine[]>;
  getSaleMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined>;
  deleteMedicine(id: number): Promise<boolean>;
  updateMedicineStock(id: number, quantityChange: number): Promise<Medicine | undefined>;
  getGenericNames(includeInactive?: boolean): Promise<GenericName[]>;
  createGenericName(input: { name: string }): Promise<GenericName>;
  updateGenericName(id: number, input: { name: string }): Promise<GenericName | undefined>;
  softDeleteGenericName(id: number): Promise<GenericName | undefined>;
  
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  getDoctors(): Promise<Doctor[]>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: number, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined>;
  deleteDoctor(id: number): Promise<boolean>;
  
  getSales(limit?: number): Promise<Sale[]>;
  getSalesByUser(userId: string, options?: { from?: Date; to?: Date; search?: string }): Promise<Sale[]>;
  getSalesWithFilters(options: { userId?: string; from?: Date; to?: Date; search?: string; limit?: number }): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  getSaleByInvoiceNo(invoiceNo: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale, items: CreateSaleItem[]): Promise<{ sale: Sale; items: SaleItem[] }>;
  getSaleItems(saleId: number): Promise<SaleItem[]>;
  getNextInvoiceNumber(): Promise<string>;
  
  getDashboardStats(): Promise<{
    totalRevenue: string;
    activeOrders: number;
    lowStockItems: number;
    customersToday: number;
    totalReturns?: string;
    netRevenue?: string;
  }>;
  
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;
  
  getAuditLogs(from?: Date, to?: Date): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  getCreditPayments(saleId?: number, customerId?: number): Promise<CreditPayment[]>;
  createCreditPayment(payment: InsertCreditPayment): Promise<CreditPayment>;
  
  getHeldBills(): Promise<HeldBill[]>;
  getHeldBill(id: number): Promise<HeldBill | undefined>;
  createHeldBill(bill: InsertHeldBill): Promise<HeldBill>;
  deleteHeldBill(id: number): Promise<boolean>;
  
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  getSupplierRates(supplierId?: number): Promise<SupplierRate[]>;
  getSupplierRate(id: number): Promise<SupplierRate | undefined>;
  createSupplierRate(rate: InsertSupplierRate): Promise<SupplierRate>;
  updateSupplierRate(id: number, rate: Partial<InsertSupplierRate>): Promise<SupplierRate | undefined>;
  deleteSupplierRate(id: number): Promise<boolean>;
  
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderItems(poId: number): Promise<PurchaseOrderItem[]>;
  deletePurchaseOrderItems(poId: number): Promise<void>;
  createPurchaseOrderItems(items: InsertPurchaseOrderItem[]): Promise<void>;
  updatePurchaseOrderItemReceivedQty(id: number, receivedQty: number): Promise<PurchaseOrderItem | undefined>;
  
  getGoodsReceipts(): Promise<GoodsReceipt[]>;
  getGoodsReceipt(id: number): Promise<GoodsReceipt | undefined>;
  createGoodsReceipt(grn: InsertGoodsReceipt, items: InsertGoodsReceiptItem[]): Promise<GoodsReceipt>;
  getGoodsReceiptItems(grnId: number): Promise<GoodsReceiptItem[]>;
  
  getSalesReturns(): Promise<SalesReturn[]>;
  getSalesReturn(id: number): Promise<SalesReturn | undefined>;
  getSaleWithReturns(saleId: number): Promise<{ sale: Sale; items: (SaleItem & { returnedQty: number })[]; returns: SalesReturn[] } | undefined>;
  createSalesReturn(returnData: InsertSalesReturn, items: Omit<InsertSalesReturnItem, 'salesReturnId'>[]): Promise<SalesReturn>;
  getSalesReturnItems(returnId: number): Promise<SalesReturnItem[]>;
  getTotalReturnsForPeriod(startDate: Date, endDate: Date): Promise<string>;
  
  // Menu Management
  getMenus(): Promise<Menu[]>;
  getMenu(id: number): Promise<Menu | undefined>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: number, menu: Partial<InsertMenu>): Promise<Menu | undefined>;
  deleteMenu(id: number): Promise<boolean>;
  
  getMenuGroups(): Promise<MenuGroup[]>;
  getMenuGroup(id: number): Promise<MenuGroup | undefined>;
  createMenuGroup(group: InsertMenuGroup): Promise<MenuGroup>;
  updateMenuGroup(id: number, group: Partial<InsertMenuGroup>): Promise<MenuGroup | undefined>;
  deleteMenuGroup(id: number): Promise<boolean>;
  
  getMenuGroupMenus(groupId: number): Promise<MenuGroupMenu[]>;
  setMenuGroupMenus(groupId: number, menuIds: number[]): Promise<void>;
  
  getUserMenus(userId: string): Promise<UserMenu[]>;
  setUserMenus(userId: string, permissions: { menuId: number; canView: boolean; canEdit: boolean }[]): Promise<void>;
  
  getUserMenuGroups(userId: string): Promise<UserMenuGroup[]>;
  setUserMenuGroups(userId: string, groupIds: number[]): Promise<void>;
  
  getUserNavigation(userId: string, role: string): Promise<MenuWithPermissions[]>;
  seedDefaultMenus(): Promise<void>;
  
  // Supplier Ledger & Payments
  getSupplierLedger(supplierId: number): Promise<SupplierTransaction[]>;
  getSupplierBalance(supplierId: number): Promise<string>;
  createSupplierTransaction(txn: InsertSupplierTransaction): Promise<SupplierTransaction>;
  getSupplierPayments(supplierId?: number): Promise<SupplierPayment[]>;
  createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment>;
  
  // Purchase Returns
  getPurchaseReturns(): Promise<PurchaseReturn[]>;
  getPurchaseReturn(id: number): Promise<PurchaseReturn | undefined>;
  createPurchaseReturn(returnData: InsertPurchaseReturn, items: Omit<InsertPurchaseReturnItem, 'purchaseReturnId'>[]): Promise<PurchaseReturn>;
  getPurchaseReturnItems(returnId: number): Promise<PurchaseReturnItem[]>;
  getNextPurchaseReturnNumber(): Promise<string>;
  
  // Day Closing
  getDayClosing(businessDate: string): Promise<DayClosing | undefined>;
  getDayClosings(limit?: number, userId?: string): Promise<DayClosing[]>;
  openDay(data: { businessDate: string; openingCash: string; openedByUserId: string }): Promise<DayClosing>;
  closeDay(businessDate: string, data: { actualCash: string; notes?: string; closedByUserId: string }): Promise<DayClosing | undefined>;
  computeExpectedCash(businessDate: string, openingCash: string): Promise<string>;
  computeExpectedCashWithBreakdown(businessDate: string, openingCash: string): Promise<{
    openingCash: number;
    cashSales: number;
    cashCollections: number;
    cashExpenses: number;
    expectedCash: number;
  }>;
  
  // Activity Logs (Enhanced)
  getActivityLogs(filters?: { userId?: string; entityType?: string; action?: string; from?: Date; to?: Date }): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Petty Cash / Expenses
  getPettyCashExpenses(filters?: { from?: string; to?: string; category?: string }): Promise<PettyCashExpense[]>;
  getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined>;
  createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense>;
  updatePettyCashExpense(id: number, expense: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined>;
  deletePettyCashExpense(id: number): Promise<boolean>;
  getPettyCashSummary(date: string): Promise<{ category: string; total: string }[]>;
  
  // Approval Requests
  getApprovalRequests(filters?: { status?: string; type?: string; from?: Date; to?: Date }): Promise<ApprovalRequest[]>;
  getApprovalRequest(id: number): Promise<ApprovalRequest | undefined>;
  createApprovalRequest(request: InsertApprovalRequest): Promise<ApprovalRequest>;
  updateApprovalRequest(id: number, data: Partial<InsertApprovalRequest>): Promise<ApprovalRequest | undefined>;
  approveRequest(id: number, approvedByUserId: string, approvedByUserName: string, notes?: string): Promise<ApprovalRequest | undefined>;
  rejectRequest(id: number, approvedByUserId: string, approvedByUserName: string, notes?: string): Promise<ApprovalRequest | undefined>;
  
  // Stock Adjustments
  getStockAdjustments(filters?: { medicineId?: number; reasonCode?: string; from?: Date; to?: Date }): Promise<StockAdjustment[]>;
  getStockAdjustment(id: number): Promise<StockAdjustment | undefined>;
  createStockAdjustment(adjustment: InsertStockAdjustment): Promise<StockAdjustment>;
}

export class DatabaseStorage implements IStorage {
  private normalizeGenericName(name: string | null | undefined): string {
    return String(name || "").trim();
  }

  private async ensureGenericNameExists(name: string | null | undefined): Promise<void> {
    const normalized = this.normalizeGenericName(name);
    if (!normalized) return;

    const existing = await pool.query(
      `SELECT id, is_active FROM generic_names WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [normalized],
    );

    if (existing.rowCount && existing.rows[0]) {
      if (!existing.rows[0].is_active) {
        await pool.query(
          `UPDATE generic_names SET is_active = true, name = $1, updated_at = NOW() WHERE id = $2`,
          [normalized, existing.rows[0].id],
        );
      }
      return;
    }

    await pool.query(
      `INSERT INTO generic_names (name, is_active, created_at, updated_at) VALUES ($1, true, NOW(), NOW())`,
      [normalized],
    );
  }

  private async isInventoryBatchTrackingEnabled(): Promise<boolean> {
    const result = await pool.query<{ exists: string | null }>(
      `SELECT to_regclass('public.inventory_batches')::text AS exists`,
    );
    return Boolean(result.rows[0]?.exists);
  }

  private async syncMedicineBatchQuantity(
    medicineId: number,
    targetQtyBase: number,
    snapshots: {
      batchNumber: string;
      expiryDate: string;
      costPrice: string | null;
      mrp: string | null;
      price: string;
      gstRate: string;
      unitSnapshot: string;
      conversionFactor: number;
    },
  ): Promise<void> {
    const enabled = await this.isInventoryBatchTrackingEnabled();
    if (!enabled) {
      return;
    }

    const totalResult = await pool.query<{ total: string }>(
      `
        SELECT COALESCE(SUM(available_qty_base), 0)::text AS total
        FROM inventory_batches
        WHERE medicine_id = $1
      `,
      [medicineId],
    );

    const currentTotal = Number(totalResult.rows[0]?.total || "0");
    const delta = targetQtyBase - currentTotal;
    if (delta === 0) {
      return;
    }

    if (delta > 0) {
      await pool.query(
        `
          INSERT INTO inventory_batches (
            medicine_id,
            warehouse_id,
            batch_number,
            expiry_date,
            purchase_rate_snapshot,
            ptr_snapshot,
            mrp_snapshot,
            default_sale_rate_snapshot,
            gst_percent_snapshot,
            tax_mode,
            unit_snapshot,
            conversion_factor_snapshot,
            total_inward_qty_base,
            total_outward_qty_base,
            available_qty_base,
            updated_at
          )
          VALUES (
            $1,
            NULL,
            $2,
            $3,
            $4,
            NULL,
            $5,
            $6,
            $7,
            'EXCLUSIVE',
            $8,
            $9,
            $10,
            0,
            $10,
            NOW()
          )
          ON CONFLICT (medicine_id, warehouse_id, batch_number, expiry_date)
          DO UPDATE SET
            total_inward_qty_base = inventory_batches.total_inward_qty_base + EXCLUDED.total_inward_qty_base,
            available_qty_base = inventory_batches.available_qty_base + EXCLUDED.available_qty_base,
            purchase_rate_snapshot = COALESCE(EXCLUDED.purchase_rate_snapshot, inventory_batches.purchase_rate_snapshot),
            mrp_snapshot = COALESCE(EXCLUDED.mrp_snapshot, inventory_batches.mrp_snapshot),
            default_sale_rate_snapshot = COALESCE(EXCLUDED.default_sale_rate_snapshot, inventory_batches.default_sale_rate_snapshot),
            gst_percent_snapshot = COALESCE(EXCLUDED.gst_percent_snapshot, inventory_batches.gst_percent_snapshot),
            unit_snapshot = COALESCE(EXCLUDED.unit_snapshot, inventory_batches.unit_snapshot),
            conversion_factor_snapshot = COALESCE(EXCLUDED.conversion_factor_snapshot, inventory_batches.conversion_factor_snapshot),
            updated_at = NOW()
        `,
        [
          medicineId,
          snapshots.batchNumber,
          snapshots.expiryDate,
          snapshots.costPrice,
          snapshots.mrp,
          snapshots.price,
          snapshots.gstRate,
          snapshots.unitSnapshot,
          snapshots.conversionFactor,
          delta,
        ],
      );
      return;
    }

    let remainingToReduce = Math.abs(delta);
    const batchesResult = await pool.query<{ id: number; available_qty_base: number }>(
      `
        SELECT id, available_qty_base
        FROM inventory_batches
        WHERE medicine_id = $1
          AND available_qty_base > 0
        ORDER BY expiry_date DESC, id DESC
      `,
      [medicineId],
    );

    const reducible = batchesResult.rows.reduce((sum, row) => sum + Number(row.available_qty_base || 0), 0);
    if (reducible < remainingToReduce) {
      throw new Error(
        `Quantity cannot be reduced below available batch stock (${reducible}). Requested ${targetQtyBase}.`,
      );
    }

    for (const row of batchesResult.rows) {
      if (remainingToReduce <= 0) {
        break;
      }

      const available = Number(row.available_qty_base || 0);
      if (available <= 0) {
        continue;
      }

      const deduct = Math.min(available, remainingToReduce);
      await pool.query(
        `
          UPDATE inventory_batches
          SET
            available_qty_base = GREATEST(available_qty_base - $2, 0),
            total_outward_qty_base = total_outward_qty_base + $2,
            updated_at = NOW()
          WHERE id = $1
        `,
        [row.id, deduct],
      );

      remainingToReduce -= deduct;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, userData: Record<string, any>): Promise<User | undefined> {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getMedicines(): Promise<Medicine[]> {
    const result = await pool.query(
      `
        WITH has_batches AS (
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'inventory_batches'
          ) AS enabled
        ),
        batch_stock AS (
          SELECT
            medicine_id,
            batch_number,
            expiry_date,
            COALESCE(SUM(available_qty_base), 0)::int AS available_qty_base
          FROM inventory_batches
          GROUP BY medicine_id, batch_number, expiry_date
        ),
        batch_stock_total AS (
          SELECT
            medicine_id,
            COALESCE(SUM(available_qty_base), 0)::int AS available_qty_base
          FROM inventory_batches
          GROUP BY medicine_id
        )
        SELECT
          m.*,
          CASE
            WHEN has_batches.enabled THEN COALESCE(batch_stock.available_qty_base, 0)
            ELSE m.quantity
          END::int AS quantity,
          CASE
            WHEN has_batches.enabled THEN COALESCE(batch_stock_total.available_qty_base, 0)
            ELSE m.quantity
          END::int AS consolidated_quantity
        FROM medicines m
        CROSS JOIN has_batches
        LEFT JOIN batch_stock
          ON batch_stock.medicine_id = m.id
         AND COALESCE(batch_stock.batch_number, '') = COALESCE(m.batch_number, '')
         AND COALESCE(batch_stock.expiry_date, '') = COALESCE(m.expiry_date, '')
        LEFT JOIN batch_stock_total
          ON batch_stock_total.medicine_id = m.id
        ORDER BY m.name
      `,
    );

    return result.rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      genericName: row.generic_name,
      skuName: row.sku_name,
      batchNumber: row.batch_number,
      manufacturer: row.manufacturer,
      expiryDate: row.expiry_date,
      quantity: Number(row.quantity || 0),
      consolidatedQty: Number(row.consolidated_quantity || row.quantity || 0),
      price: row.price,
      costPrice: row.cost_price,
      mrp: row.mrp,
      gstRate: row.gst_rate,
      hsnCode: row.hsn_code,
      category: row.category,
      status: row.status,
      reorderLevel: Number(row.reorder_level ?? 100),
      barcode: row.barcode,
      minStock: row.min_stock == null ? null : Number(row.min_stock),
      maxStock: row.max_stock == null ? null : Number(row.max_stock),
      locationId: row.location_id == null ? null : Number(row.location_id),
      baseUnit: row.base_unit,
      packSize: row.pack_size == null ? null : Number(row.pack_size),
      pricePerUnit: row.price_per_unit,
    })) as Medicine[];
  }

  async getSaleMedicines(): Promise<Medicine[]> {
    const result = await pool.query(
      `
        WITH has_batches AS (
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'inventory_batches'
          ) AS enabled
        ),
        batch_rows AS (
          SELECT
            m.id,
            m.name,
            m.generic_name,
            m.sku_name,
            ib.batch_number,
            m.manufacturer,
            ib.expiry_date,
            COALESCE(ib.available_qty_base, 0)::int AS quantity,
            COALESCE(
              SUM(ib.available_qty_base) OVER (PARTITION BY ib.medicine_id),
              0
            )::int AS consolidated_quantity
            ,m.price
            ,m.cost_price
            ,m.mrp
            ,m.gst_rate
            ,m.hsn_code
            ,m.category
            ,m.status
            ,m.reorder_level
            ,m.barcode
            ,m.min_stock
            ,m.max_stock
            ,m.location_id
            ,m.base_unit
            ,m.pack_size
            ,m.price_per_unit
          FROM inventory_batches ib
          JOIN medicines m ON m.id = ib.medicine_id
          WHERE COALESCE(ib.available_qty_base, 0) > 0
        )
        SELECT
          b.id,
          b.name,
          b.generic_name,
          b.sku_name,
          b.batch_number,
          b.manufacturer,
          b.expiry_date,
          b.quantity,
          b.consolidated_quantity,
          b.price,
          b.cost_price,
          b.mrp,
          b.gst_rate,
          b.hsn_code,
          b.category,
          b.status,
          b.reorder_level,
          b.barcode,
          b.min_stock,
          b.max_stock,
          b.location_id,
          b.base_unit,
          b.pack_size,
          b.price_per_unit
        FROM batch_rows b

        UNION ALL

        SELECT
          m.id,
          m.name,
          m.generic_name,
          m.sku_name,
          m.batch_number,
          m.manufacturer,
          m.expiry_date,
          COALESCE(m.quantity, 0)::int AS quantity,
          COALESCE(m.quantity, 0)::int AS consolidated_quantity,
          m.price,
          m.cost_price,
          m.mrp,
          m.gst_rate,
          m.hsn_code,
          m.category,
          m.status,
          m.reorder_level,
          m.barcode,
          m.min_stock,
          m.max_stock,
          m.location_id,
          m.base_unit,
          m.pack_size,
          m.price_per_unit
        FROM medicines m
        CROSS JOIN has_batches
        WHERE (
          NOT has_batches.enabled
          OR NOT EXISTS (
            SELECT 1
            FROM inventory_batches ib
            WHERE ib.medicine_id = m.id
              AND COALESCE(ib.available_qty_base, 0) > 0
          )
        )
          AND COALESCE(m.quantity, 0) > 0

        ORDER BY name, batch_number, expiry_date
      `,
    );

    return result.rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      genericName: row.generic_name,
      skuName: row.sku_name,
      batchNumber: row.batch_number,
      manufacturer: row.manufacturer,
      expiryDate: row.expiry_date,
      quantity: Number(row.quantity || 0),
      consolidatedQty: Number(row.consolidated_quantity || row.quantity || 0),
      price: row.price,
      costPrice: row.cost_price,
      mrp: row.mrp,
      gstRate: row.gst_rate,
      hsnCode: row.hsn_code,
      category: row.category,
      status: row.status,
      reorderLevel: Number(row.reorder_level ?? 100),
      barcode: row.barcode,
      minStock: row.min_stock == null ? null : Number(row.min_stock),
      maxStock: row.max_stock == null ? null : Number(row.max_stock),
      locationId: row.location_id == null ? null : Number(row.location_id),
      baseUnit: row.base_unit,
      packSize: row.pack_size == null ? null : Number(row.pack_size),
      pricePerUnit: row.price_per_unit,
    })) as Medicine[];
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    const result = await db.select().from(medicines).where(eq(medicines.id, id)).limit(1);
    return result[0];
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    await this.ensureGenericNameExists((medicine as any).genericName ?? null);
    const result = await db.insert(medicines).values(medicine).returning();
    return result[0];
  }

  async updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined> {
    const existing = await this.getMedicine(id);
    if (!existing) {
      return undefined;
    }

    const hasQuantityPatch = Object.prototype.hasOwnProperty.call(medicine, "quantity");
    const nextQuantity = hasQuantityPatch ? Number((medicine as Record<string, unknown>).quantity) : Number(existing.quantity);
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
      throw new Error("Quantity must be a non-negative number.");
    }

    const normalizedUpdate: Partial<InsertMedicine> = {
      ...medicine,
      quantity: Math.trunc(nextQuantity),
    };

    if (Object.prototype.hasOwnProperty.call(medicine, "genericName")) {
      await this.ensureGenericNameExists((medicine as any).genericName ?? null);
    }

    const result = await db.update(medicines).set(normalizedUpdate).where(eq(medicines.id, id)).returning();
    const updated = result[0];

    if (!updated) {
      return undefined;
    }

    if (hasQuantityPatch) {
      await this.syncMedicineBatchQuantity(id, Math.trunc(nextQuantity), {
        batchNumber: String(updated.batchNumber || existing.batchNumber || `LEGACY-${id}`),
        expiryDate: String(updated.expiryDate || existing.expiryDate || "2099-12-31"),
        costPrice: updated.costPrice ? String(updated.costPrice) : null,
        mrp: updated.mrp ? String(updated.mrp) : null,
        price: String(updated.price || existing.price || "0"),
        gstRate: String(updated.gstRate || existing.gstRate || "0"),
        unitSnapshot: "TABLET",
        conversionFactor: Math.max(1, Number(updated.packSize || existing.packSize || 1) || 1),
      });
    }

    return updated;
  }

  async getGenericNames(includeInactive = false): Promise<GenericName[]> {
    const result = await pool.query(
      `
        SELECT id, name, is_active, created_at, updated_at
        FROM generic_names
        WHERE ($1::boolean = true OR is_active = true)
        ORDER BY LOWER(name)
      `,
      [includeInactive],
    );

    return result.rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as GenericName[];
  }

  async createGenericName(input: { name: string }): Promise<GenericName> {
    const normalized = this.normalizeGenericName(input.name);
    if (!normalized) {
      throw new Error("Generic name is required");
    }

    const existing = await pool.query(
      `SELECT id FROM generic_names WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [normalized],
    );

    if (existing.rowCount && existing.rows[0]) {
      const revived = await pool.query(
        `UPDATE generic_names SET name = $1, is_active = true, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_active, created_at, updated_at`,
        [normalized, existing.rows[0].id],
      );
      const row = revived.rows[0];
      return {
        id: Number(row.id),
        name: row.name,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as GenericName;
    }

    const result = await pool.query(
      `INSERT INTO generic_names (name, is_active, created_at, updated_at) VALUES ($1, true, NOW(), NOW()) RETURNING id, name, is_active, created_at, updated_at`,
      [normalized],
    );
    const row = result.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as GenericName;
  }

  async updateGenericName(id: number, input: { name: string }): Promise<GenericName | undefined> {
    const normalized = this.normalizeGenericName(input.name);
    if (!normalized) {
      throw new Error("Generic name is required");
    }

    const current = await pool.query(
      `SELECT name FROM generic_names WHERE id = $1 LIMIT 1`,
      [id],
    );
    const previousName = current.rows[0]?.name;
    if (!previousName) {
      return undefined;
    }

    const conflict = await pool.query(
      `SELECT id FROM generic_names WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1`,
      [normalized, id],
    );
    if (conflict.rowCount && conflict.rows[0]) {
      throw new Error("Generic name already exists");
    }

    const result = await pool.query(
      `UPDATE generic_names SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_active, created_at, updated_at`,
      [normalized, id],
    );
    const row = result.rows[0];
    if (!row) return undefined;

    await pool.query(
      `UPDATE medicines SET generic_name = $1 WHERE LOWER(COALESCE(generic_name, '')) = LOWER($2)`,
      [normalized, previousName],
    );

    return {
      id: Number(row.id),
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as GenericName;
  }

  async softDeleteGenericName(id: number): Promise<GenericName | undefined> {
    const result = await pool.query(
      `UPDATE generic_names SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, name, is_active, created_at, updated_at`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: Number(row.id),
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as GenericName;
  }

  async deleteMedicine(id: number): Promise<boolean> {
    const result = await db.delete(medicines).where(eq(medicines.id, id)).returning();
    return result.length > 0;
  }

  async updateMedicineStock(id: number, quantityChange: number): Promise<Medicine | undefined> {
    const medicine = await this.getMedicine(id);
    if (!medicine) return undefined;
    
    const newQuantity = parseInt(medicine.quantity.toString()) + quantityChange;
    let status = "In Stock";
    
    if (newQuantity === 0) {
      status = "Out of Stock";
    } else if (newQuantity < 50) {
      status = "Low Stock";
    }
    
    return await this.updateMedicine(id, { quantity: newQuantity, status });
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async getDoctors(): Promise<Doctor[]> {
    return await db.select().from(doctors).orderBy(doctors.name);
  }

  async getDoctor(id: number): Promise<Doctor | undefined> {
    const result = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    return result[0];
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const result = await db.insert(doctors).values(doctor).returning();
    return result[0];
  }

  async updateDoctor(id: number, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const result = await db.update(doctors).set(doctor).where(eq(doctors.id, id)).returning();
    return result[0];
  }

  async deleteDoctor(id: number): Promise<boolean> {
    const result = await db.delete(doctors).where(eq(doctors.id, id)).returning();
    return result.length > 0;
  }

  async getSales(limit: number = 100): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit);
  }

  async getSalesByUser(userId: string, options?: { from?: Date; to?: Date; search?: string }): Promise<Sale[]> {
    const conditions = [eq(sales.userId, userId)];
    
    if (options?.from) {
      conditions.push(gte(sales.createdAt, options.from));
    }
    if (options?.to) {
      conditions.push(lte(sales.createdAt, options.to));
    }
    
    let results = await db.select().from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.createdAt));
    
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(s => 
        s.invoiceNo?.toLowerCase().includes(searchLower) ||
        s.customerName?.toLowerCase().includes(searchLower) ||
        s.customerPhone?.includes(searchLower)
      );
    }
    
    return results;
  }

  async getSalesWithFilters(options: { userId?: string; from?: Date; to?: Date; search?: string; limit?: number }): Promise<Sale[]> {
    const conditions: any[] = [];
    
    if (options.userId) {
      conditions.push(eq(sales.userId, options.userId));
    }
    if (options.from) {
      conditions.push(gte(sales.createdAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(sales.createdAt, options.to));
    }
    
    let query = db.select().from(sales);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const hasDateFilter = options.from || options.to;
    const effectiveLimit = options.limit || (hasDateFilter ? undefined : 10000);
    
    let orderedQuery = query.orderBy(desc(sales.createdAt));
    let results = effectiveLimit ? await orderedQuery.limit(effectiveLimit) : await orderedQuery;
    
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(s => 
        s.invoiceNo?.toLowerCase().includes(searchLower) ||
        s.customerName?.toLowerCase().includes(searchLower) ||
        s.customerPhone?.includes(searchLower)
      );
    }
    
    return results;
  }

  async getSale(id: number): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    return result[0];
  }

  async getSaleByInvoiceNo(invoiceNo: string): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.invoiceNo, invoiceNo)).limit(1);
    return result[0];
  }

  async createSale(sale: InsertSale, items: CreateSaleItem[]): Promise<{ sale: Sale; items: SaleItem[] }> {
    // First, validate stock availability for all items
    const insufficientStock: { name: string; available: number; requested: number }[] = [];
    for (const item of items) {
      const medicine = await this.getMedicine(item.medicineId);
      if (medicine) {
        const currentStock = parseInt(medicine.quantity.toString());
        if (currentStock < item.quantity) {
          insufficientStock.push({
            name: medicine.name,
            available: currentStock,
            requested: item.quantity
          });
        }
      }
    }
    
    if (insufficientStock.length > 0) {
      const errorDetails = insufficientStock.map(i => 
        `${i.name}: available ${i.available}, requested ${i.requested}`
      ).join('; ');
      throw new Error(`Insufficient stock: ${errorDetails}`);
    }
    
    const saleResult = await db.insert(sales).values(sale).returning();
    const createdSale = saleResult[0];
    
    const itemsWithSaleId = items.map(item => ({ ...item, saleId: createdSale.id }));
    const createdItems = await db.insert(saleItems).values(itemsWithSaleId).returning();
    
    for (const item of items) {
      await this.updateMedicineStock(item.medicineId, -item.quantity);
    }
    
    if (sale.paymentMethod?.toLowerCase() === 'credit' && sale.customerId) {
      const customer = await this.getCustomer(sale.customerId);
      if (customer) {
        const currentBalance = parseFloat(customer.outstandingBalance || "0");
        const saleTotal = parseFloat(String(sale.total || 0));
        const receivedAmount = parseFloat(String(sale.receivedAmount || 0));
        const unpaidAmount = Math.max(0, saleTotal - receivedAmount);
        const newBalance = currentBalance + unpaidAmount;
        await this.updateCustomer(sale.customerId, {
          outstandingBalance: newBalance.toFixed(2),
        });
      }
    }
    
    return { sale: createdSale, items: createdItems };
  }

  async getSaleItems(saleId: number): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`
        INSERT INTO sequences (name, current_value, prefix, updated_at)
        VALUES ('invoice', 0, 'INV', NOW())
        ON CONFLICT (name) DO NOTHING
      `);

      const seqResult = await client.query<{
        current_value: number;
        prefix: string;
      }>(`
        SELECT current_value, prefix
        FROM sequences
        WHERE name = 'invoice'
        FOR UPDATE
      `);

      const sequenceRow = seqResult.rows[0];
      const prefix = sequenceRow?.prefix || "INV";
      const currentValue = Number(sequenceRow?.current_value || 0);

      const maxInvoiceResult = await client.query<{ max_no: number }>(
        `
          SELECT COALESCE(
            MAX(
              CASE
                WHEN invoice_no ~ ('^' || $1 || '-[0-9]+$')
                THEN LEAST(split_part(invoice_no, '-', 2)::numeric, 2147483647)::int
                ELSE NULL
              END
            ),
            0
          ) AS max_no
          FROM sales
        `,
        [prefix],
      );

      const maxExisting = Number(maxInvoiceResult.rows[0]?.max_no || 0);

      if (currentValue >= 2147483647 || maxExisting >= 2147483647) {
        await client.query("COMMIT");
        const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`;
        return `${prefix}-${uniqueSuffix}`;
      }

      const nextValue = Math.max(currentValue + 1, maxExisting + 1);

      await client.query(
        `
          UPDATE sequences
          SET current_value = $1,
              updated_at = NOW()
          WHERE name = 'invoice'
        `,
        [nextValue],
      );

      await client.query("COMMIT");
      return `${prefix}-${nextValue}`;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getDashboardStats(): Promise<{
    totalRevenue: string;
    activeOrders: number;
    lowStockItems: number;
    customersToday: number;
    totalReturns?: string;
    netRevenue?: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const revenueResult = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`
    }).from(sales);
    
    const returnsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${salesReturns.totalRefundAmount}), 0)`
    }).from(salesReturns);
    
    const pendingOrders = await db.select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(eq(sales.status, 'Pending'));
    
    const lowStock = await db.select({ count: sql<number>`count(*)` })
      .from(medicines)
      .where(eq(medicines.status, 'Low Stock'));
    
    const todayCustomers = await db.select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(sql`${sales.createdAt} >= ${today.toISOString()}`);
    
    const totalRevenue = parseFloat(revenueResult[0]?.total || "0");
    const totalReturns = parseFloat(returnsResult[0]?.total || "0");
    const netRevenue = totalRevenue - totalReturns;
    
    return {
      totalRevenue: totalRevenue.toFixed(2),
      activeOrders: Number(pendingOrders[0]?.count || 0),
      lowStockItems: Number(lowStock[0]?.count || 0),
      customersToday: Number(todayCustomers[0]?.count || 0),
      totalReturns: totalReturns.toFixed(2),
      netRevenue: netRevenue.toFixed(2),
    };
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).orderBy(locations.rack);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const result = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
    return result[0];
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await db.insert(locations).values(location).returning();
    return result[0];
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const result = await db.update(locations).set(location).where(eq(locations.id, id)).returning();
    return result[0];
  }

  async deleteLocation(id: number): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }

  async getAuditLogs(from?: Date, to?: Date): Promise<AuditLog[]> {
    if (from && to) {
      return await db.select().from(auditLogs)
        .where(and(gte(auditLogs.createdAt, from), lte(auditLogs.createdAt, to)))
        .orderBy(desc(auditLogs.createdAt));
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getCreditPayments(saleId?: number, customerId?: number): Promise<CreditPayment[]> {
    if (saleId) {
      return await db.select().from(creditPayments).where(eq(creditPayments.saleId, saleId)).orderBy(desc(creditPayments.createdAt));
    }
    if (customerId) {
      return await db.select().from(creditPayments).where(eq(creditPayments.customerId, customerId)).orderBy(desc(creditPayments.createdAt));
    }
    return await db.select().from(creditPayments).orderBy(desc(creditPayments.createdAt));
  }

  async createCreditPayment(payment: InsertCreditPayment): Promise<CreditPayment> {
    const result = await db.insert(creditPayments).values(payment).returning();
    return result[0];
  }

  async getHeldBills(): Promise<HeldBill[]> {
    return await db.select().from(heldBills).orderBy(desc(heldBills.createdAt));
  }

  async getHeldBill(id: number): Promise<HeldBill | undefined> {
    const result = await db.select().from(heldBills).where(eq(heldBills.id, id)).limit(1);
    return result[0];
  }

  async createHeldBill(bill: InsertHeldBill): Promise<HeldBill> {
    const result = await db.insert(heldBills).values(bill).returning();
    return result[0];
  }

  async deleteHeldBill(id: number): Promise<boolean> {
    const result = await db.delete(heldBills).where(eq(heldBills.id, id)).returning();
    return result.length > 0;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(supplier).returning();
    return result[0];
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const result = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return result[0];
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
    return result.length > 0;
  }

  async getSupplierRates(supplierId?: number): Promise<SupplierRate[]> {
    if (supplierId) {
      return await db.select().from(supplierRates).where(eq(supplierRates.supplierId, supplierId)).orderBy(supplierRates.id);
    }
    return await db.select().from(supplierRates).orderBy(supplierRates.id);
  }

  async getSupplierRate(id: number): Promise<SupplierRate | undefined> {
    const result = await db.select().from(supplierRates).where(eq(supplierRates.id, id)).limit(1);
    return result[0];
  }

  async createSupplierRate(rate: InsertSupplierRate): Promise<SupplierRate> {
    const result = await db.insert(supplierRates).values(rate).returning();
    return result[0];
  }

  async updateSupplierRate(id: number, rate: Partial<InsertSupplierRate>): Promise<SupplierRate | undefined> {
    const result = await db.update(supplierRates).set(rate).where(eq(supplierRates.id, id)).returning();
    return result[0];
  }

  async deleteSupplierRate(id: number): Promise<boolean> {
    const result = await db.delete(supplierRates).where(eq(supplierRates.id, id)).returning();
    return result.length > 0;
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
    return result[0];
  }

  async createPurchaseOrder(po: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrder> {
    const poResult = await db.insert(purchaseOrders).values(po).returning();
    const createdPo = poResult[0];
    
    if (items.length > 0) {
      const itemsWithPoId = items.map(item => ({ ...item, poId: createdPo.id }));
      await db.insert(purchaseOrderItems).values(itemsWithPoId);
      await pool.query(
        `
          UPDATE purchase_order_items
          SET
            conversion_factor_snapshot = GREATEST(COALESCE(units_per_strip, 1), 1),
            unit_snapshot = COALESCE(unit_type, 'STRIP'),
            ordered_qty_base = CASE
              WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
                THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
              ELSE COALESCE(quantity, 0)
            END,
            received_qty_base = 0,
            pending_qty_base = CASE
              WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
                THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
              ELSE COALESCE(quantity, 0)
            END,
            line_status = 'PENDING',
            gst_percent_snapshot = COALESCE(gst_rate, 0),
            tax_mode = COALESCE(tax_mode, 'EXCLUSIVE')
          WHERE po_id = $1
        `,
        [createdPo.id],
      );
    }
    
    return createdPo;
  }

  async updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const result = await db.update(purchaseOrders).set(po).where(eq(purchaseOrders.id, id)).returning();
    return result[0];
  }

  async getPurchaseOrderItems(poId: number): Promise<PurchaseOrderItem[]> {
    return await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  }

  async deletePurchaseOrderItems(poId: number): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  }

  async createPurchaseOrderItems(items: InsertPurchaseOrderItem[]): Promise<void> {
    if (items.length > 0) {
      await db.insert(purchaseOrderItems).values(items);
      const poIds = Array.from(new Set(items.map((item) => item.poId).filter((value): value is number => Boolean(value))));
      for (const poId of poIds) {
        await pool.query(
          `
            UPDATE purchase_order_items
            SET
              conversion_factor_snapshot = GREATEST(COALESCE(units_per_strip, 1), 1),
              unit_snapshot = COALESCE(unit_type, 'STRIP'),
              ordered_qty_base = CASE
                WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
                  THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
                ELSE COALESCE(quantity, 0)
              END,
              pending_qty_base = CASE
                WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
                  THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
                ELSE COALESCE(quantity, 0)
              END,
              line_status = 'PENDING',
              gst_percent_snapshot = COALESCE(gst_rate, 0),
              tax_mode = COALESCE(tax_mode, 'EXCLUSIVE')
            WHERE po_id = $1
          `,
          [poId],
        );
      }
    }
  }

  async updatePurchaseOrderItemReceivedQty(id: number, receivedQty: number): Promise<PurchaseOrderItem | undefined> {
    const result = await db.update(purchaseOrderItems).set({ receivedQty }).where(eq(purchaseOrderItems.id, id)).returning();
    await pool.query(
      `
        UPDATE purchase_order_items
        SET
          received_qty_base = CASE
            WHEN UPPER(COALESCE(unit_snapshot, unit_type, 'STRIP')) = 'STRIP'
              THEN COALESCE(received_qty, 0) * GREATEST(COALESCE(conversion_factor_snapshot, units_per_strip, 1), 1)
            ELSE COALESCE(received_qty, 0)
          END,
          pending_qty_base = GREATEST(
            ordered_qty_base -
            CASE
              WHEN UPPER(COALESCE(unit_snapshot, unit_type, 'STRIP')) = 'STRIP'
                THEN COALESCE(received_qty, 0) * GREATEST(COALESCE(conversion_factor_snapshot, units_per_strip, 1), 1)
              ELSE COALESCE(received_qty, 0)
            END,
            0
          ),
          line_status = CASE
            WHEN COALESCE(received_qty, 0) <= 0 THEN 'PENDING'
            WHEN COALESCE(received_qty, 0) >= COALESCE(quantity, 0) THEN 'COMPLETED'
            ELSE 'PARTIAL'
          END
        WHERE id = $1
      `,
      [id],
    );
    return result[0];
  }

  async getGoodsReceipts(): Promise<GoodsReceipt[]> {
    return await db.select().from(goodsReceipts).orderBy(desc(goodsReceipts.createdAt));
  }

  async getGoodsReceipt(id: number): Promise<GoodsReceipt | undefined> {
    const result = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id)).limit(1);
    return result[0];
  }

  async createGoodsReceipt(grn: InsertGoodsReceipt, items: InsertGoodsReceiptItem[]): Promise<GoodsReceipt> {
    const grnResult = await db.insert(goodsReceipts).values(grn).returning();
    const createdGrn = grnResult[0];
    const headerDiscountRate = parseFloat(String(createdGrn.discountRate || "0")) || 0;
    
    if (items.length > 0) {
      const resolvedItems: InsertGoodsReceiptItem[] = [];

      for (const item of items) {
        const sourceMedicine = await this.getMedicine(item.medicineId);
        if (!sourceMedicine) {
          throw new Error(`Medicine not found for GRN item: ${item.medicineId}`);
        }

        const normalizedBatch = String(item.batchNumber || sourceMedicine.batchNumber || "").trim();
        if (!normalizedBatch) {
          throw new Error("Batch number is required for GRN item");
        }

        let targetMedicine = sourceMedicine;

        if (sourceMedicine.batchNumber !== normalizedBatch) {
          const existingBatch = await db
            .select()
            .from(medicines)
            .where(
              and(
                eq(medicines.name, sourceMedicine.name),
                eq(medicines.manufacturer, sourceMedicine.manufacturer),
                eq(medicines.batchNumber, normalizedBatch),
              ),
            )
            .limit(1);

          if (existingBatch[0]) {
            targetMedicine = existingBatch[0];
          } else {
            const sellingPrice = parseFloat(String(item.sellingPrice || item.mrp || item.rate || sourceMedicine.price || "0")) || 0;
            const unitsPerStrip = Math.max(1, parseInt(String(item.unitsPerStrip || item.packSize || sourceMedicine.packSize || 1)) || 1);
            const purchaseUnit = String(item.purchaseUnit || item.unitType || "STRIP").toUpperCase();
            const computedPricePerUnit = purchaseUnit === "STRIP"
              ? sellingPrice / unitsPerStrip
              : sellingPrice;

            targetMedicine = await this.createMedicine({
              name: sourceMedicine.name,
              batchNumber: normalizedBatch,
              manufacturer: sourceMedicine.manufacturer,
              expiryDate: item.expiryDate || sourceMedicine.expiryDate,
              quantity: 0,
              price: sellingPrice.toFixed(2),
              costPrice: String(item.rate || sourceMedicine.costPrice || sourceMedicine.price || "0"),
              mrp: item.mrp ? String(item.mrp) : (sourceMedicine.mrp ? String(sourceMedicine.mrp) : null),
              gstRate: String(item.gstRate || sourceMedicine.gstRate || "18"),
              hsnCode: sourceMedicine.hsnCode,
              category: sourceMedicine.category,
              status: "Out of Stock",
              reorderLevel: sourceMedicine.reorderLevel,
              barcode: sourceMedicine.barcode,
              minStock: sourceMedicine.minStock,
              maxStock: sourceMedicine.maxStock,
              locationId: item.locationId || sourceMedicine.locationId,
              baseUnit: sourceMedicine.baseUnit,
              packSize: unitsPerStrip,
              pricePerUnit: computedPricePerUnit.toFixed(2),
            });
          }
        }

        resolvedItems.push({
          ...item,
          medicineId: targetMedicine.id,
          batchNumber: normalizedBatch,
          expiryDate: item.expiryDate || targetMedicine.expiryDate,
        });
      }

      const itemsWithGrnId = resolvedItems.map(item => ({ ...item, grnId: createdGrn.id }));
      await db.insert(goodsReceiptItems).values(itemsWithGrnId);
      
      for (const item of resolvedItems) {
        const unitsPerStrip = Math.max(1, parseInt(String(item.unitsPerStrip || item.packSize || 1)) || 1);
        const purchaseUnit = String(item.purchaseUnit || item.unitType || "STRIP").toUpperCase();
        const purchasedQty = Math.max(0, Number(item.quantity) || 0);
        const freeQty = Math.max(0, Number(item.freeQuantity) || 0);
        const totalQty = purchasedQty + freeQty;
        const stockUnitsToAdd = purchaseUnit === "STRIP"
          ? totalQty * unitsPerStrip
          : totalQty;

        await this.updateMedicineStock(item.medicineId, stockUnitsToAdd);

        const lineDiscountRate = parseFloat(String(item.discountPercent || "0")) || 0;
        const baseRate = parseFloat(String(item.rate || "0")) || 0;
        const effectivePurchaseRate = baseRate * (1 - lineDiscountRate / 100) * (1 - headerDiscountRate / 100);

        const sellingPrice = parseFloat(String(item.sellingPrice || item.mrp || item.rate || "0")) || 0;
        const pricePerUnit = purchaseUnit === "STRIP"
          ? sellingPrice / unitsPerStrip
          : sellingPrice;

        const medicineUpdate: Partial<InsertMedicine> = {
          costPrice: effectivePurchaseRate.toFixed(2),
          price: sellingPrice.toFixed(2),
          mrp: item.mrp ? String(item.mrp) : null,
          packSize: unitsPerStrip,
          pricePerUnit: pricePerUnit.toFixed(2),
        };

        if (item.locationId) {
          medicineUpdate.locationId = item.locationId;
        }

        await this.updateMedicine(item.medicineId, medicineUpdate);

        if (item.poItemId) {
          const poItem = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, item.poItemId)).limit(1);
          if (poItem[0]) {
            const newReceivedQty = (poItem[0].receivedQty || 0) + item.quantity;
            await this.updatePurchaseOrderItemReceivedQty(item.poItemId, newReceivedQty);
          }
        }
      }
    }
    
    // Create supplier transaction (credit entry for purchase)
    const totalAmount = parseFloat(createdGrn.totalAmount || "0");
    if (totalAmount > 0 && createdGrn.supplierId) {
      await this.createSupplierTransaction({
        supplierId: createdGrn.supplierId,
        type: 'PURCHASE',
        referenceId: createdGrn.id,
        referenceNumber: createdGrn.grnNumber,
        creditAmount: String(totalAmount.toFixed(2)),
        debitAmount: "0",
        remarks: `Goods received - ${createdGrn.grnNumber}`,
        createdByUserId: null,
      });
    }
    
    return createdGrn;
  }

  async getGoodsReceiptItems(grnId: number): Promise<GoodsReceiptItem[]> {
    return await db.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.grnId, grnId));
  }

  async getSalesReturns(): Promise<SalesReturn[]> {
    return await db.select().from(salesReturns).orderBy(desc(salesReturns.createdAt));
  }

  async getSalesReturn(id: number): Promise<SalesReturn | undefined> {
    const result = await db.select().from(salesReturns).where(eq(salesReturns.id, id)).limit(1);
    return result[0];
  }

  async getSaleWithReturns(saleId: number): Promise<{ sale: Sale; items: (SaleItem & { returnedQty: number })[]; returns: SalesReturn[] } | undefined> {
    const saleResult = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    if (!saleResult[0]) return undefined;
    
    const sale = saleResult[0];
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
    const returns = await db.select().from(salesReturns).where(eq(salesReturns.originalSaleId, saleId)).orderBy(desc(salesReturns.createdAt));
    
    const returnItemsResult = await db.select().from(salesReturnItems);
    const returnItemsBySaleItem: Record<number, number> = {};
    
    for (const returnItem of returnItemsResult) {
      if (!returnItemsBySaleItem[returnItem.saleItemId]) {
        returnItemsBySaleItem[returnItem.saleItemId] = 0;
      }
      returnItemsBySaleItem[returnItem.saleItemId] += returnItem.quantityReturned;
    }
    
    const itemsWithReturned = items.map(item => ({
      ...item,
      returnedQty: returnItemsBySaleItem[item.id] || 0
    }));
    
    return { sale, items: itemsWithReturned, returns };
  }

  async createSalesReturn(returnData: InsertSalesReturn, items: Omit<InsertSalesReturnItem, 'salesReturnId'>[]): Promise<SalesReturn> {
    const returnResult = await db.insert(salesReturns).values(returnData).returning();
    const createdReturn = returnResult[0];
    
    if (items.length > 0) {
      const itemsWithReturnId = items.map(item => ({ ...item, salesReturnId: createdReturn.id }));
      await db.insert(salesReturnItems).values(itemsWithReturnId);
      
      for (const item of items) {
        await this.updateMedicineStock(item.medicineId, item.quantityReturned);
      }
    }
    
    return createdReturn;
  }

  async getSalesReturnItems(returnId: number): Promise<SalesReturnItem[]> {
    return await db.select().from(salesReturnItems).where(eq(salesReturnItems.salesReturnId, returnId));
  }

  async getTotalReturnsForPeriod(startDate: Date, endDate: Date): Promise<string> {
    const result = await db.select({
      total: sql<string>`COALESCE(SUM(${salesReturns.totalRefundAmount}), 0)`
    }).from(salesReturns)
      .where(and(
        gte(salesReturns.returnDate, startDate),
        lte(salesReturns.returnDate, endDate)
      ));
    return result[0]?.total || "0";
  }

  async getAllSettings(): Promise<AppSetting[]> {
    return await db.select().from(appSettings);
  }

  async getSetting(key: string): Promise<AppSetting | undefined> {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return result[0];
  }

  async upsertSetting(key: string, value: string): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const result = await db.update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(appSettings).values({ key, value }).returning();
      return result[0];
    }
  }

  async upsertMultipleSettings(settings: { key: string; value: string }[]): Promise<AppSetting[]> {
    const results: AppSetting[] = [];
    for (const setting of settings) {
      const result = await this.upsertSetting(setting.key, setting.value);
      results.push(result);
    }
    return results;
  }

  // Menu Management Implementation
  async getMenus(): Promise<Menu[]> {
    return await db.select().from(menus).orderBy(menus.displayOrder);
  }

  async getMenu(id: number): Promise<Menu | undefined> {
    const result = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
    return result[0];
  }

  async createMenu(menu: InsertMenu): Promise<Menu> {
    const result = await db.insert(menus).values(menu).returning();
    return result[0];
  }

  async updateMenu(id: number, menu: Partial<InsertMenu>): Promise<Menu | undefined> {
    const result = await db.update(menus).set({ ...menu, updatedAt: new Date() }).where(eq(menus.id, id)).returning();
    return result[0];
  }

  async deleteMenu(id: number): Promise<boolean> {
    const result = await db.update(menus).set({ isActive: false, updatedAt: new Date() }).where(eq(menus.id, id)).returning();
    return result.length > 0;
  }

  async getMenuGroups(): Promise<MenuGroup[]> {
    return await db.select().from(menuGroups).orderBy(menuGroups.name);
  }

  async getMenuGroup(id: number): Promise<MenuGroup | undefined> {
    const result = await db.select().from(menuGroups).where(eq(menuGroups.id, id)).limit(1);
    return result[0];
  }

  async createMenuGroup(group: InsertMenuGroup): Promise<MenuGroup> {
    const result = await db.insert(menuGroups).values(group).returning();
    return result[0];
  }

  async updateMenuGroup(id: number, group: Partial<InsertMenuGroup>): Promise<MenuGroup | undefined> {
    const result = await db.update(menuGroups).set({ ...group, updatedAt: new Date() }).where(eq(menuGroups.id, id)).returning();
    return result[0];
  }

  async deleteMenuGroup(id: number): Promise<boolean> {
    const result = await db.update(menuGroups).set({ isActive: false, updatedAt: new Date() }).where(eq(menuGroups.id, id)).returning();
    return result.length > 0;
  }

  async getMenuGroupMenus(groupId: number): Promise<MenuGroupMenu[]> {
    return await db.select().from(menuGroupMenus).where(eq(menuGroupMenus.menuGroupId, groupId));
  }

  async setMenuGroupMenus(groupId: number, menuIds: number[]): Promise<void> {
    await db.delete(menuGroupMenus).where(eq(menuGroupMenus.menuGroupId, groupId));
    if (menuIds.length > 0) {
      const values = menuIds.map(menuId => ({ menuGroupId: groupId, menuId }));
      await db.insert(menuGroupMenus).values(values);
    }
  }

  async getUserMenus(userId: string): Promise<UserMenu[]> {
    return await db.select().from(userMenus).where(eq(userMenus.userId, userId));
  }

  async setUserMenus(userId: string, permissions: { menuId: number; canView: boolean; canEdit: boolean }[]): Promise<void> {
    await db.delete(userMenus).where(eq(userMenus.userId, userId));
    if (permissions.length > 0) {
      const values = permissions.map(p => ({ userId, menuId: p.menuId, canView: p.canView, canEdit: p.canEdit }));
      await db.insert(userMenus).values(values);
    }
  }

  async getUserMenuGroups(userId: string): Promise<UserMenuGroup[]> {
    return await db.select().from(userMenuGroups).where(eq(userMenuGroups.userId, userId));
  }

  async setUserMenuGroups(userId: string, groupIds: number[]): Promise<void> {
    await db.delete(userMenuGroups).where(eq(userMenuGroups.userId, userId));
    if (groupIds.length > 0) {
      const values = groupIds.map(menuGroupId => ({ userId, menuGroupId }));
      await db.insert(userMenuGroups).values(values);
    }
  }

  async getUserNavigation(userId: string, role: string): Promise<MenuWithPermissions[]> {
    const allMenus = await db.select().from(menus).where(eq(menus.isActive, true)).orderBy(menus.displayOrder);
    
    if (allMenus.length === 0) {
      return [];
    }
    
    // If owner or admin, return all menus with full permissions
    if (role === 'owner' || role === 'admin') {
      return allMenus.map(menu => ({ ...menu, canView: true, canEdit: true }));
    }
    
    // Get user's direct menu permissions
    const directMenus = await db.select().from(userMenus).where(eq(userMenus.userId, userId));
    
    // Get user's menu groups
    const userGroups = await db.select().from(userMenuGroups).where(eq(userMenuGroups.userId, userId));
    
    // Get all menus from user's groups
    const groupMenuIds: number[] = [];
    for (const ug of userGroups) {
      const groupMenus = await db.select().from(menuGroupMenus).where(eq(menuGroupMenus.menuGroupId, ug.menuGroupId));
      groupMenuIds.push(...groupMenus.map(gm => gm.menuId));
    }
    
    // If user has no explicit assignments, use defaults based on role
    if (directMenus.length === 0 && userGroups.length === 0) {
      // Default: staff gets view access to common menus
      return allMenus
        .filter(m => !m.key.startsWith('admin.') && !m.key.includes('settings') && !m.key.includes('audit'))
        .map(menu => ({ ...menu, canView: true, canEdit: false }));
    }
    
    // Build permissions map
    const permissionsMap: Map<number, { canView: boolean; canEdit: boolean }> = new Map();
    
    // Add group menu permissions (view only by default for groups)
    for (const menuId of groupMenuIds) {
      if (!permissionsMap.has(menuId)) {
        permissionsMap.set(menuId, { canView: true, canEdit: false });
      }
    }
    
    // Override with direct permissions (ensure type safety for local environments)
    for (const dm of directMenus) {
      const menuIdNum = Number(dm.menuId);
      const canViewBool = Boolean(dm.canView);
      const canEditBool = Boolean(dm.canEdit);
      const existing = permissionsMap.get(menuIdNum) || { canView: false, canEdit: false };
      permissionsMap.set(menuIdNum, {
        canView: existing.canView || canViewBool,
        canEdit: existing.canEdit || canEditBool
      });
    }
    
    // Return menus with permissions
    const result: MenuWithPermissions[] = [];
    for (const menu of allMenus) {
      const menuIdNum = Number(menu.id);
      const perms = permissionsMap.get(menuIdNum);
      if (perms && perms.canView) {
        result.push({ ...menu, canView: perms.canView, canEdit: perms.canEdit });
      }
    }
    
    return result;
  }

  async seedDefaultMenus(): Promise<void> {
    const existingMenus = await db.select().from(menus);
    if (existingMenus.length > 0) {
      return; // Already seeded
    }

    const defaultMenus: InsertMenu[] = [
      { key: 'dashboard', label: 'Dashboard', routePath: '/', icon: 'LayoutDashboard', displayOrder: 1 },
      { key: 'sales.new', label: 'New Sale (POS)', routePath: '/new-sale', icon: 'Plus', displayOrder: 2 },
      { key: 'sales.pos', label: 'Point of Sale', routePath: '/pos', icon: 'ShoppingCart', displayOrder: 3 },
      { key: 'sales.credit', label: 'Credit Billing', routePath: '/credit-billing', icon: 'Receipt', displayOrder: 4 },
      { key: 'sales.refund', label: 'Medicine Refund', routePath: '/medicine-refund', icon: 'RotateCcw', displayOrder: 5 },
      { key: 'inventory.medicines', label: 'Medicines / Products', routePath: '/inventory', icon: 'Package', displayOrder: 10 },
      { key: 'inventory.suppliers', label: 'Suppliers', routePath: '/suppliers', icon: 'Truck', displayOrder: 11 },
      { key: 'inventory.rates', label: 'Rate Master', routePath: '/supplier-rates', icon: 'Tags', displayOrder: 12 },
      { key: 'inventory.po', label: 'Purchase Orders', routePath: '/purchase-orders', icon: 'ClipboardList', displayOrder: 13 },
      { key: 'inventory.grn', label: 'Goods Receipt (GRN)', routePath: '/goods-receipts', icon: 'PackageCheck', displayOrder: 14 },
      { key: 'inventory.returns', label: 'Purchase Returns', routePath: '/purchase-returns', icon: 'Undo2', displayOrder: 15 },
      { key: 'customers.accounts', label: 'Customer Accounts', routePath: '/customers', icon: 'Users', displayOrder: 20 },
      { key: 'customers.doctors', label: 'Doctors', routePath: '/doctors', icon: 'Stethoscope', displayOrder: 21 },
      { key: 'customers.collections', label: 'Collections', routePath: '/collections', icon: 'CreditCard', displayOrder: 22 },
      { key: 'reports.sales', label: 'Sales Reports', routePath: '/reports', icon: 'FileText', displayOrder: 30 },
      { key: 'reports.analytics', label: 'Owner Analytics', routePath: '/owner-dashboard', icon: 'BarChart3', displayOrder: 31 },
      { key: 'admin.audit', label: 'Audit Log', routePath: '/audit-log', icon: 'Shield', displayOrder: 40 },
      { key: 'admin.tally', label: 'Tally Export', routePath: '/tally-export', icon: 'Calculator', displayOrder: 41 },
      { key: 'admin.day-closing', label: 'Day Closing', routePath: '/day-closing', icon: 'CalendarCheck', displayOrder: 42 },
      { key: 'operations.expenses', label: 'Petty Cash / Expenses', routePath: '/expenses', icon: 'Wallet', displayOrder: 43 },
      { key: 'operations.approvals', label: 'Approval Requests', routePath: '/approvals', icon: 'CheckCircle', displayOrder: 44 },
      { key: 'operations.stock-adjustments', label: 'Stock Adjustments', routePath: '/stock-adjustments', icon: 'RefreshCw', displayOrder: 45 },
      { key: 'operations.shift-handover', label: 'Shift Handover', routePath: '/shift-handover', icon: 'Clock', displayOrder: 46 },
      { key: 'admin.locations', label: 'Storage Locations', routePath: '/locations', icon: 'MapPin', displayOrder: 50 },
      { key: 'admin.settings', label: 'Settings', routePath: '/settings', icon: 'Settings', displayOrder: 51 },
      { key: 'admin.users', label: 'User Management', routePath: '/admin/users', icon: 'Users', displayOrder: 52 },
      { key: 'admin.menus', label: 'Menu Management', routePath: '/admin/menus', icon: 'Menu', displayOrder: 53 },
      { key: 'admin.groups', label: 'Menu Groups', routePath: '/admin/menu-groups', icon: 'FolderOpen', displayOrder: 54 },
      { key: 'admin.user-access', label: 'User Access', routePath: '/admin/user-access', icon: 'Shield', displayOrder: 55 },
      { key: 'operations.my-sales', label: 'My Sales', routePath: '/my-sales', icon: 'ShoppingCart', displayOrder: 94 },
      { key: 'operations.my-activity', label: 'My Activity', routePath: '/my-activity', icon: 'Activity', displayOrder: 95 },
    ];

    for (const menu of defaultMenus) {
      await db.insert(menus).values(menu);
    }

    // Create default menu groups
    const operations = await db.insert(menuGroups).values({ name: 'Operations', description: 'Day-to-day operations' }).returning();
    const inventory = await db.insert(menuGroups).values({ name: 'Inventory & Purchase', description: 'Stock and purchasing' }).returning();
    const customersGroup = await db.insert(menuGroups).values({ name: 'Customers & Credit', description: 'Customer management' }).returning();
    const reports = await db.insert(menuGroups).values({ name: 'Reports & Analytics', description: 'Business insights' }).returning();
    const admin = await db.insert(menuGroups).values({ name: 'Administration', description: 'System administration' }).returning();
    const billing = await db.insert(menuGroups).values({ name: 'Billing', description: 'Front office billing' }).returning();

    // Get inserted menus to link
    const insertedMenus = await db.select().from(menus);
    const menuByKey = new Map(insertedMenus.map(m => [m.key, m.id]));

    // Link menus to groups
    const groupLinks = [
      { group: operations[0].id, keys: ['dashboard', 'sales.new', 'sales.pos', 'sales.credit', 'sales.refund', 'operations.expenses', 'operations.approvals', 'operations.stock-adjustments', 'operations.shift-handover', 'operations.my-sales', 'operations.my-activity'] },
      { group: inventory[0].id, keys: ['inventory.medicines', 'inventory.suppliers', 'inventory.rates', 'inventory.po', 'inventory.grn', 'inventory.returns'] },
      { group: customersGroup[0].id, keys: ['customers.accounts', 'customers.doctors', 'customers.collections'] },
      { group: reports[0].id, keys: ['reports.sales', 'reports.analytics'] },
      { group: admin[0].id, keys: ['admin.audit', 'admin.tally', 'admin.day-closing', 'admin.locations', 'admin.settings', 'admin.users', 'admin.menus', 'admin.groups', 'admin.user-access'] },
      { group: billing[0].id, keys: ['dashboard', 'sales.new', 'sales.pos', 'sales.credit'] },
    ];

    for (const link of groupLinks) {
      for (const key of link.keys) {
        const menuId = menuByKey.get(key);
        if (menuId) {
          await db.insert(menuGroupMenus).values({ menuGroupId: link.group, menuId });
        }
      }
    }
  }

  // Supplier Ledger & Payments Implementation
  async getSupplierLedger(supplierId: number): Promise<SupplierTransaction[]> {
    return await db.select().from(supplierTransactions)
      .where(eq(supplierTransactions.supplierId, supplierId))
      .orderBy(desc(supplierTransactions.txnDate));
  }

  async getSupplierBalance(supplierId: number): Promise<string> {
    const result = await db.select({
      balance: sql<string>`COALESCE(SUM(${supplierTransactions.creditAmount}) - SUM(${supplierTransactions.debitAmount}), 0)`
    }).from(supplierTransactions)
      .where(eq(supplierTransactions.supplierId, supplierId));
    return result[0]?.balance || "0";
  }

  async createSupplierTransaction(txn: InsertSupplierTransaction): Promise<SupplierTransaction> {
    const result = await db.insert(supplierTransactions).values(txn).returning();
    return result[0];
  }

  async getSupplierPayments(supplierId?: number): Promise<SupplierPayment[]> {
    if (supplierId) {
      return await db.select().from(supplierPayments)
        .where(eq(supplierPayments.supplierId, supplierId))
        .orderBy(desc(supplierPayments.paymentDate));
    }
    return await db.select().from(supplierPayments).orderBy(desc(supplierPayments.paymentDate));
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    const result = await db.insert(supplierPayments).values(payment).returning();
    const createdPayment = result[0];
    
    // Also create a corresponding supplier transaction (debit entry for payment)
    await this.createSupplierTransaction({
      supplierId: payment.supplierId,
      type: 'PAYMENT',
      referenceId: createdPayment.id,
      referenceNumber: payment.referenceNo || `PAY-${createdPayment.id}`,
      txnDate: payment.paymentDate,
      debitAmount: payment.amount,
      creditAmount: "0",
      remarks: payment.remarks || 'Payment to supplier',
      createdByUserId: payment.createdByUserId
    });
    
    return createdPayment;
  }

  // Purchase Returns Implementation
  async getPurchaseReturns(): Promise<PurchaseReturn[]> {
    return await db.select().from(purchaseReturns).orderBy(desc(purchaseReturns.returnDate));
  }

  async getPurchaseReturn(id: number): Promise<PurchaseReturn | undefined> {
    const result = await db.select().from(purchaseReturns).where(eq(purchaseReturns.id, id)).limit(1);
    return result[0];
  }

  async createPurchaseReturn(
    returnData: InsertPurchaseReturn, 
    items: Omit<InsertPurchaseReturnItem, 'purchaseReturnId'>[]
  ): Promise<PurchaseReturn> {
    const returnResult = await db.insert(purchaseReturns).values(returnData).returning();
    const createdReturn = returnResult[0];
    
    // Insert return items
    const itemsWithReturnId = items.map(item => ({ ...item, purchaseReturnId: createdReturn.id }));
    await db.insert(purchaseReturnItems).values(itemsWithReturnId);
    
    // Decrease medicine stock for each returned item
    for (const item of items) {
      await this.updateMedicineStock(item.medicineId, -item.quantityReturned);
    }
    
    // Create supplier transaction entry (debit entry - we're owed money)
    await this.createSupplierTransaction({
      supplierId: returnData.supplierId,
      type: 'PURCHASE_RETURN',
      referenceId: createdReturn.id,
      referenceNumber: returnData.returnNumber,
      txnDate: returnData.returnDate,
      debitAmount: returnData.totalAmount,
      creditAmount: "0",
      remarks: returnData.reason || 'Purchase return',
      createdByUserId: returnData.createdByUserId
    });
    
    return createdReturn;
  }

  async getPurchaseReturnItems(returnId: number): Promise<PurchaseReturnItem[]> {
    return await db.select().from(purchaseReturnItems)
      .where(eq(purchaseReturnItems.purchaseReturnId, returnId));
  }

  async getNextPurchaseReturnNumber(): Promise<string> {
    const result = await pool.query(
      `UPDATE sequences SET current_value = current_value + 1, updated_at = NOW() 
       WHERE name = 'purchase_return' 
       RETURNING current_value, prefix`
    );
    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO sequences (name, current_value, prefix) VALUES ('purchase_return', 1, 'PR')`
      );
      return 'PR-0001';
    }
    const { current_value, prefix } = result.rows[0];
    return `${prefix}-${String(current_value).padStart(4, '0')}`;
  }

  // Day Closing Implementation
  async getDayClosing(businessDate: string): Promise<DayClosing | undefined> {
    const result = await db.select().from(dayClosings)
      .where(eq(dayClosings.businessDate, businessDate)).limit(1);
    return result[0];
  }

  async getDayClosings(limit: number = 30, userId?: string): Promise<DayClosing[]> {
    if (userId) {
      return await db.select().from(dayClosings)
        .where(or(
          eq(dayClosings.openedByUserId, userId),
          eq(dayClosings.closedByUserId, userId)
        ))
        .orderBy(desc(dayClosings.businessDate))
        .limit(limit);
    }
    return await db.select().from(dayClosings)
      .orderBy(desc(dayClosings.businessDate))
      .limit(limit);
  }

  async openDay(data: { businessDate: string; openingCash: string; openedByUserId: string }): Promise<DayClosing> {
    const existing = await this.getDayClosing(data.businessDate);
    if (existing) {
      throw new Error('Day already exists for this date');
    }
    
    const result = await db.insert(dayClosings).values({
      businessDate: data.businessDate,
      openingCash: data.openingCash,
      openedByUserId: data.openedByUserId,
      openingTime: new Date(),
      status: 'OPEN'
    }).returning();
    return result[0];
  }

  async closeDay(businessDate: string, data: { actualCash: string; notes?: string; closedByUserId: string }): Promise<DayClosing | undefined> {
    const dayRecord = await this.getDayClosing(businessDate);
    if (!dayRecord) {
      throw new Error('Day not found for this date');
    }
    if (dayRecord.status === 'CLOSED') {
      throw new Error('Day is already closed');
    }
    
    const openingCash = dayRecord.openingCash || "0";
    const expectedCash = await this.computeExpectedCash(businessDate, openingCash);
    const actualCash = parseFloat(data.actualCash);
    const expectedCashNum = parseFloat(expectedCash);
    const difference = actualCash - expectedCashNum;
    
    const result = await db.update(dayClosings).set({
      expectedCash: expectedCash,
      actualCash: data.actualCash,
      difference: difference.toFixed(2),
      closingTime: new Date(),
      closedByUserId: data.closedByUserId,
      notes: data.notes,
      status: 'CLOSED',
      updatedAt: new Date()
    }).where(eq(dayClosings.businessDate, businessDate)).returning();
    
    return result[0];
  }

  async computeExpectedCash(businessDate: string, openingCash: string): Promise<string> {
    // Get all cash sales for the day
    const startOfDay = new Date(businessDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(businessDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const cashSalesResult = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.receivedAmount}), 0)`
    }).from(sales).where(and(
      eq(sales.paymentMethod, 'cash'),
      gte(sales.createdAt, startOfDay),
      lte(sales.createdAt, endOfDay)
    ));
    
    const cashSales = parseFloat(cashSalesResult[0]?.total || "0");
    const opening = parseFloat(openingCash);
    
    // Get cash refunds for the day
    const refundsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${salesReturns.totalRefundAmount}), 0)`
    }).from(salesReturns).where(and(
      eq(salesReturns.refundMode, 'cash'),
      gte(salesReturns.returnDate, startOfDay),
      lte(salesReturns.returnDate, endOfDay)
    ));
    
    const cashRefunds = parseFloat(refundsResult[0]?.total || "0");
    
    return (opening + cashSales - cashRefunds).toFixed(2);
  }

  async computeExpectedCashWithBreakdown(businessDate: string, openingCash: string): Promise<{
    openingCash: number;
    cashSales: number;
    cashCollections: number;
    cashExpenses: number;
    expectedCash: number;
  }> {
    const startOfDay = new Date(businessDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(businessDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get cash sales for the day
    const cashSalesResult = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.receivedAmount}), 0)`
    }).from(sales).where(and(
      eq(sales.paymentMethod, 'cash'),
      gte(sales.createdAt, startOfDay),
      lte(sales.createdAt, endOfDay)
    ));
    
    const cashSalesAmount = parseFloat(cashSalesResult[0]?.total || "0");
    const opening = parseFloat(openingCash);
    
    // Get cash refunds/expenses for the day
    const refundsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${salesReturns.totalRefundAmount}), 0)`
    }).from(salesReturns).where(and(
      eq(salesReturns.refundMode, 'cash'),
      gte(salesReturns.returnDate, startOfDay),
      lte(salesReturns.returnDate, endOfDay)
    ));
    
    const cashExpenses = parseFloat(refundsResult[0]?.total || "0");
    
    // Get cash collections (credit payments received in cash)
    const collectionsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${creditPayments.amount}), 0)`
    }).from(creditPayments).where(and(
      eq(creditPayments.paymentMethod, 'cash'),
      gte(creditPayments.createdAt, startOfDay),
      lte(creditPayments.createdAt, endOfDay)
    ));
    
    const cashCollections = parseFloat(collectionsResult[0]?.total || "0");
    
    const expectedCash = opening + cashSalesAmount + cashCollections - cashExpenses;
    
    return {
      openingCash: opening,
      cashSales: cashSalesAmount,
      cashCollections,
      cashExpenses,
      expectedCash
    };
  }

  // Activity Logs Implementation
  async getActivityLogs(filters?: { userId?: string; entityType?: string; action?: string; from?: Date; to?: Date }): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogsTable);
    
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(activityLogsTable.userId, filters.userId));
    }
    if (filters?.entityType) {
      conditions.push(eq(activityLogsTable.entityType, filters.entityType));
    }
    if (filters?.action) {
      conditions.push(eq(activityLogsTable.action, filters.action));
    }
    if (filters?.from) {
      conditions.push(gte(activityLogsTable.createdAt, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(activityLogsTable.createdAt, filters.to));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(activityLogsTable)
        .where(and(...conditions))
        .orderBy(desc(activityLogsTable.createdAt))
        .limit(500);
    }
    
    return await db.select().from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(500);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLogsTable).values(log).returning();
    return result[0];
  }

  // Petty Cash / Expenses Implementation
  async getPettyCashExpenses(filters?: { from?: string; to?: string; category?: string }): Promise<PettyCashExpense[]> {
    const conditions = [];
    if (filters?.from) {
      conditions.push(gte(pettyCashExpenses.expenseDate, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(pettyCashExpenses.expenseDate, filters.to));
    }
    if (filters?.category) {
      conditions.push(eq(pettyCashExpenses.category, filters.category));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(pettyCashExpenses)
        .where(and(...conditions))
        .orderBy(desc(pettyCashExpenses.createdAt));
    }
    
    return await db.select().from(pettyCashExpenses)
      .orderBy(desc(pettyCashExpenses.createdAt));
  }

  async getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined> {
    const result = await db.select().from(pettyCashExpenses)
      .where(eq(pettyCashExpenses.id, id)).limit(1);
    return result[0];
  }

  async createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense> {
    const result = await db.insert(pettyCashExpenses).values(expense).returning();
    return result[0];
  }

  async updatePettyCashExpense(id: number, expense: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined> {
    const result = await db.update(pettyCashExpenses)
      .set(expense)
      .where(eq(pettyCashExpenses.id, id))
      .returning();
    return result[0];
  }

  async deletePettyCashExpense(id: number): Promise<boolean> {
    const result = await db.delete(pettyCashExpenses)
      .where(eq(pettyCashExpenses.id, id))
      .returning();
    return result.length > 0;
  }

  async getPettyCashSummary(date: string): Promise<{ category: string; total: string }[]> {
    const result = await db.select({
      category: pettyCashExpenses.category,
      total: sql<string>`COALESCE(SUM(${pettyCashExpenses.amount}), 0)`
    }).from(pettyCashExpenses)
      .where(eq(pettyCashExpenses.expenseDate, date))
      .groupBy(pettyCashExpenses.category);
    return result;
  }

  // Approval Requests Implementation
  async getApprovalRequests(filters?: { status?: string; type?: string; from?: Date; to?: Date }): Promise<ApprovalRequest[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(approvalRequests.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(approvalRequests.type, filters.type));
    }
    if (filters?.from) {
      conditions.push(gte(approvalRequests.createdAt, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(approvalRequests.createdAt, filters.to));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(approvalRequests)
        .where(and(...conditions))
        .orderBy(desc(approvalRequests.createdAt));
    }
    
    return await db.select().from(approvalRequests)
      .orderBy(desc(approvalRequests.createdAt));
  }

  async getApprovalRequest(id: number): Promise<ApprovalRequest | undefined> {
    const result = await db.select().from(approvalRequests)
      .where(eq(approvalRequests.id, id)).limit(1);
    return result[0];
  }

  async createApprovalRequest(request: InsertApprovalRequest): Promise<ApprovalRequest> {
    const result = await db.insert(approvalRequests).values(request).returning();
    return result[0];
  }

  async updateApprovalRequest(id: number, data: Partial<InsertApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const result = await db.update(approvalRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(approvalRequests.id, id))
      .returning();
    return result[0];
  }

  async approveRequest(id: number, approvedByUserId: string, approvedByUserName: string, notes?: string): Promise<ApprovalRequest | undefined> {
    const result = await db.update(approvalRequests)
      .set({
        status: 'APPROVED',
        approvedByUserId,
        approvedByUserName,
        approvalNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(approvalRequests.id, id))
      .returning();
    return result[0];
  }

  async rejectRequest(id: number, approvedByUserId: string, approvedByUserName: string, notes?: string): Promise<ApprovalRequest | undefined> {
    const result = await db.update(approvalRequests)
      .set({
        status: 'REJECTED',
        approvedByUserId,
        approvedByUserName,
        approvalNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(approvalRequests.id, id))
      .returning();
    return result[0];
  }

  // Stock Adjustments Implementation
  async getStockAdjustments(filters?: { medicineId?: number; reasonCode?: string; from?: Date; to?: Date }): Promise<StockAdjustment[]> {
    const conditions = [];
    if (filters?.medicineId) {
      conditions.push(eq(stockAdjustments.medicineId, filters.medicineId));
    }
    if (filters?.reasonCode) {
      conditions.push(eq(stockAdjustments.reasonCode, filters.reasonCode));
    }
    if (filters?.from) {
      conditions.push(gte(stockAdjustments.createdAt, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(stockAdjustments.createdAt, filters.to));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(stockAdjustments)
        .where(and(...conditions))
        .orderBy(desc(stockAdjustments.createdAt));
    }
    
    return await db.select().from(stockAdjustments)
      .orderBy(desc(stockAdjustments.createdAt));
  }

  async getStockAdjustment(id: number): Promise<StockAdjustment | undefined> {
    const result = await db.select().from(stockAdjustments)
      .where(eq(stockAdjustments.id, id)).limit(1);
    return result[0];
  }

  async createStockAdjustment(adjustment: InsertStockAdjustment): Promise<StockAdjustment> {
    // Calculate the actual quantity change based on adjustment type
    const qtyChange = adjustment.adjustmentType === 'DECREASE' 
      ? -Math.abs(adjustment.adjustmentQty) 
      : Math.abs(adjustment.adjustmentQty);
    
    // Check for negative stock on decrease
    if (adjustment.adjustmentType === 'DECREASE') {
      const medicine = await db.select().from(medicines)
        .where(eq(medicines.id, adjustment.medicineId)).limit(1);
      if (medicine[0] && medicine[0].quantity + qtyChange < 0) {
        throw new Error(`Insufficient stock. Current: ${medicine[0].quantity}, Adjustment: ${Math.abs(adjustment.adjustmentQty)}`);
      }
    }
    
    // Create the adjustment record
    const result = await db.insert(stockAdjustments).values(adjustment).returning();
    
    // Update the medicine stock atomically
    await db.update(medicines)
      .set({
        quantity: sql`${medicines.quantity} + ${qtyChange}`
      })
      .where(eq(medicines.id, adjustment.medicineId));
    
    return result[0];
  }
}

export const storage = new DatabaseStorage();
