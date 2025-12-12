import { 
  type User, 
  type InsertUser,
  type Medicine,
  type InsertMedicine,
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
  users,
  medicines,
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
  appSettings
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export async function initializeDatabase() {
  try {
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
    `);
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
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined>;
  deleteMedicine(id: number): Promise<boolean>;
  updateMedicineStock(id: number, quantityChange: number): Promise<Medicine | undefined>;
  
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
  getSale(id: number): Promise<Sale | undefined>;
  getSaleByInvoiceNo(invoiceNo: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale, items: CreateSaleItem[]): Promise<{ sale: Sale; items: SaleItem[] }>;
  getSaleItems(saleId: number): Promise<SaleItem[]>;
  
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
}

export class DatabaseStorage implements IStorage {
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
    return await db.select().from(medicines).orderBy(medicines.name);
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    const result = await db.select().from(medicines).where(eq(medicines.id, id)).limit(1);
    return result[0];
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const result = await db.insert(medicines).values(medicine).returning();
    return result[0];
  }

  async updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined> {
    const result = await db.update(medicines).set(medicine).where(eq(medicines.id, id)).returning();
    return result[0];
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

  async getSale(id: number): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    return result[0];
  }

  async getSaleByInvoiceNo(invoiceNo: string): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.invoiceNo, invoiceNo)).limit(1);
    return result[0];
  }

  async createSale(sale: InsertSale, items: CreateSaleItem[]): Promise<{ sale: Sale; items: SaleItem[] }> {
    const saleResult = await db.insert(sales).values(sale).returning();
    const createdSale = saleResult[0];
    
    const itemsWithSaleId = items.map(item => ({ ...item, saleId: createdSale.id }));
    const createdItems = await db.insert(saleItems).values(itemsWithSaleId).returning();
    
    for (const item of items) {
      await this.updateMedicineStock(item.medicineId, -item.quantity);
    }
    
    return { sale: createdSale, items: createdItems };
  }

  async getSaleItems(saleId: number): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
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
    }
  }

  async updatePurchaseOrderItemReceivedQty(id: number, receivedQty: number): Promise<PurchaseOrderItem | undefined> {
    const result = await db.update(purchaseOrderItems).set({ receivedQty }).where(eq(purchaseOrderItems.id, id)).returning();
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
    
    if (items.length > 0) {
      const itemsWithGrnId = items.map(item => ({ ...item, grnId: createdGrn.id }));
      await db.insert(goodsReceiptItems).values(itemsWithGrnId);
      
      for (const item of items) {
        await this.updateMedicineStock(item.medicineId, item.quantity);
        if (item.locationId) {
          await db.update(medicines).set({ locationId: item.locationId }).where(eq(medicines.id, item.medicineId));
        }
        if (item.poItemId) {
          const poItem = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, item.poItemId)).limit(1);
          if (poItem[0]) {
            const newReceivedQty = (poItem[0].receivedQty || 0) + item.quantity;
            await this.updatePurchaseOrderItemReceivedQty(item.poItemId, newReceivedQty);
          }
        }
      }
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
}

export const storage = new DatabaseStorage();
