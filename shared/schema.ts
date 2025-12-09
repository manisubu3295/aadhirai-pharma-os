import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("staff"),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  email: true,
  phone: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  batchNumber: text("batch_number").notNull(),
  manufacturer: text("manufacturer").notNull(),
  expiryDate: text("expiry_date").notNull(),
  quantity: integer("quantity").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  hsnCode: text("hsn_code"),
  category: text("category").notNull(),
  status: text("status").notNull().default("In Stock"),
  reorderLevel: integer("reorder_level").notNull().default(50),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  gstin: text("gstin"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("0"),
  outstandingBalance: decimal("outstanding_balance", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialization: text("specialization"),
  phone: text("phone"),
  registrationNo: text("registration_no"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no"),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerGstin: text("customer_gstin"),
  doctorId: integer("doctor_id"),
  doctorName: text("doctor_name"),
  prescriptionUrl: text("prescription_url"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  cgst: decimal("cgst", { precision: 10, scale: 2 }).notNull().default("0"),
  sgst: decimal("sgst", { precision: 10, scale: 2 }).notNull().default("0"),
  igst: decimal("igst", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  roundOff: decimal("round_off", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: text("payment_method").notNull(),
  receivedAmount: decimal("received_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  changeAmount: decimal("change_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("Completed"),
  printInvoice: boolean("print_invoice").notNull().default(false),
  sendViaEmail: boolean("send_via_email").notNull().default(false),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  batchNumber: text("batch_number").notNull(),
  expiryDate: text("expiry_date").notNull(),
  hsnCode: text("hsn_code"),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  cgst: decimal("cgst", { precision: 10, scale: 2 }).default("0"),
  sgst: decimal("sgst", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });

export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicines.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;
