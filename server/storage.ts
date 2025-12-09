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
  type InsertSaleItem,
  users,
  medicines,
  customers,
  doctors,
  sales,
  saleItems
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, desc, sql } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  getMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined>;
  deleteMedicine(id: number): Promise<boolean>;
  updateMedicineStock(id: number, quantityChange: number): Promise<Medicine | undefined>;
  
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  
  getDoctors(): Promise<Doctor[]>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  
  getSales(limit?: number): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale>;
  getSaleItems(saleId: number): Promise<SaleItem[]>;
  
  getDashboardStats(): Promise<{
    totalRevenue: string;
    activeOrders: number;
    lowStockItems: number;
    customersToday: number;
  }>;
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

  async getSales(limit: number = 100): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit);
  }

  async getSale(id: number): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    return result[0];
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale> {
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
}

export const storage = new DatabaseStorage();
