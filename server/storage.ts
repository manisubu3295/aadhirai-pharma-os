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
  users,
  medicines,
  customers,
  doctors,
  sales,
  saleItems,
  locations,
  auditLogs,
  creditPayments,
  heldBills
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
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
  createSale(sale: InsertSale, items: CreateSaleItem[]): Promise<Sale>;
  getSaleItems(saleId: number): Promise<SaleItem[]>;
  
  getDashboardStats(): Promise<{
    totalRevenue: string;
    activeOrders: number;
    lowStockItems: number;
    customersToday: number;
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

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
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

  async createSale(sale: InsertSale, items: CreateSaleItem[]): Promise<Sale> {
    const saleResult = await db.insert(sales).values(sale).returning();
    const createdSale = saleResult[0];
    
    const itemsWithSaleId = items.map(item => ({ ...item, saleId: createdSale.id }));
    await db.insert(saleItems).values(itemsWithSaleId);
    
    for (const item of items) {
      await this.updateMedicineStock(item.medicineId, -item.quantity);
    }
    
    return createdSale;
  }

  async getSaleItems(saleId: number): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  }

  async getDashboardStats(): Promise<{
    totalRevenue: string;
    activeOrders: number;
    lowStockItems: number;
    customersToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const revenueResult = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`
    }).from(sales);
    
    const pendingOrders = await db.select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(eq(sales.status, 'Pending'));
    
    const lowStock = await db.select({ count: sql<number>`count(*)` })
      .from(medicines)
      .where(eq(medicines.status, 'Low Stock'));
    
    const todayCustomers = await db.select({ count: sql<number>`count(*)` })
      .from(sales)
      .where(sql`${sales.createdAt} >= ${today.toISOString()}`);
    
    return {
      totalRevenue: revenueResult[0]?.total || "0",
      activeOrders: Number(pendingOrders[0]?.count || 0),
      lowStockItems: Number(lowStock[0]?.count || 0),
      customersToday: Number(todayCustomers[0]?.count || 0),
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
}

export const storage = new DatabaseStorage();
