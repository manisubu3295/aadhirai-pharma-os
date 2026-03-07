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
  photoUrl: text("photo_url"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  pharmacyName: text("pharmacy_name"),
  gstNumber: text("gst_number"),
  drugLicense: text("drug_license"),
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

export const updateProfileSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  phone: true,
  photoUrl: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  pharmacyName: true,
  gstNumber: true,
  drugLicense: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
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
  barcode: text("barcode"),
  minStock: integer("min_stock").default(10),
  maxStock: integer("max_stock").default(500),
  locationId: integer("location_id"),
  baseUnit: text("base_unit").default("UNIT"),
  packSize: integer("pack_size").default(1),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
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
  creditPeriodDays: integer("credit_period_days").default(30),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  rack: text("rack").notNull(),
  row: text("row").notNull(),
  bin: text("bin").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  entityName: text("entity_name").notNull(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditPayments = pgTable("credit_payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  customerId: integer("customer_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  userId: varchar("user_id"),
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
  paymentReference: text("payment_reference"),
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
  unitType: text("unit_type").default("TABLET"),
  displayQty: integer("display_qty").default(1),
  packSize: integer("pack_size").default(1),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const createSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, saleId: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertCreditPaymentSchema = createInsertSchema(creditPayments).omit({ id: true, createdAt: true });

export const heldBills = pgTable("held_bills", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerId: integer("customer_id"),
  doctorId: integer("doctor_id"),
  doctorName: text("doctor_name"),
  items: text("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHeldBillSchema = createInsertSchema(heldBills).omit({ id: true, createdAt: true });

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

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertCreditPayment = z.infer<typeof insertCreditPaymentSchema>;
export type CreditPayment = typeof creditPayments.$inferSelect;

export type CreateSaleItem = z.infer<typeof createSaleItemSchema>;
export type InsertHeldBill = z.infer<typeof insertHeldBillSchema>;
export type HeldBill = typeof heldBills.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  gstin: text("gstin"),
  panNumber: text("pan_number"),
  paymentTermsDays: integer("payment_terms_days").default(30),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  ifscCode: text("ifsc_code"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierRates = pgTable("supplier_rates", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18"),
  minOrderQty: integer("min_order_qty").default(1),
  leadTimeDays: integer("lead_time_days").default(3),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  status: text("status").notNull().default("Draft"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  supplierRateId: integer("supplier_rate_id"),
  quantity: integer("quantity").notNull(),
  receivedQty: integer("received_qty").notNull().default(0),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  unitType: text("unit_type").default("STRIP"),
  unitsPerStrip: integer("units_per_strip").default(1),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  grnNumber: text("grn_number").notNull().unique(),
  poId: integer("po_id"),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierInvoiceNo: text("supplier_invoice_no"),
  supplierInvoiceDate: timestamp("supplier_invoice_date"),
  receiptDate: timestamp("receipt_date").defaultNow().notNull(),
  status: text("status").notNull().default("Completed"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  receivedBy: varchar("received_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").notNull(),
  poItemId: integer("po_item_id"),
  medicineId: integer("medicine_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  batchNumber: text("batch_number").notNull(),
  expiryDate: text("expiry_date").notNull(),
  quantity: integer("quantity").notNull(),
  freeQuantity: integer("free_quantity").default(0),
  schemeDescription: text("scheme_description"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  purchaseUnit: text("purchase_unit").default("STRIP"),
  unitsPerStrip: integer("units_per_strip").default(1),
  packSize: integer("pack_size").default(1),
  unitType: text("unit_type").default("STRIP"),
  displayQty: integer("display_qty"),
  locationId: integer("location_id"),
});

export const supplierTransactions = pgTable("supplier_transactions", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  type: text("type").notNull(),
  referenceId: integer("reference_id"),
  referenceNumber: text("reference_number"),
  txnDate: timestamp("txn_date").defaultNow().notNull(),
  debitAmount: decimal("debit_amount", { precision: 10, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 10, scale: 2 }).default("0"),
  remarks: text("remarks"),
  createdByUserId: varchar("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(),
  referenceNo: text("reference_no"),
  remarks: text("remarks"),
  createdByUserId: varchar("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseReturns = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  returnNumber: text("return_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  originalGrnId: integer("original_grn_id"),
  returnDate: timestamp("return_date").defaultNow().notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  reason: text("reason"),
  status: text("status").notNull().default("Completed"),
  createdByUserId: varchar("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseReturnItems = pgTable("purchase_return_items", {
  id: serial("id").primaryKey(),
  purchaseReturnId: integer("purchase_return_id").notNull(),
  grnItemId: integer("grn_item_id"),
  medicineId: integer("medicine_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  batchNumber: text("batch_number").notNull(),
  expiryDate: text("expiry_date").notNull(),
  quantityReturned: integer("quantity_returned").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const dayClosings = pgTable("day_closings", {
  id: serial("id").primaryKey(),
  businessDate: text("business_date").notNull().unique(),
  openedByUserId: varchar("opened_by_user_id"),
  openingCash: decimal("opening_cash", { precision: 10, scale: 2 }).default("0"),
  openingTime: timestamp("opening_time"),
  closedByUserId: varchar("closed_by_user_id"),
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }),
  actualCash: decimal("actual_cash", { precision: 10, scale: 2 }),
  difference: decimal("difference", { precision: 10, scale: 2 }),
  closingTime: timestamp("closing_time"),
  notes: text("notes"),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  description: text("description").notNull(),
  detailsBefore: text("details_before"),
  detailsAfter: text("details_after"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertSupplierRateSchema = createInsertSchema(supplierRates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });
export const insertGoodsReceiptSchema = createInsertSchema(goodsReceipts).omit({ id: true, createdAt: true });
export const insertGoodsReceiptItemSchema = createInsertSchema(goodsReceiptItems).omit({ id: true });

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertSupplierRate = z.infer<typeof insertSupplierRateSchema>;
export type SupplierRate = typeof supplierRates.$inferSelect;

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

export type InsertGoodsReceipt = z.infer<typeof insertGoodsReceiptSchema>;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;

export type InsertGoodsReceiptItem = z.infer<typeof insertGoodsReceiptItemSchema>;
export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;

export const insertSupplierTransactionSchema = createInsertSchema(supplierTransactions).omit({ id: true, createdAt: true });
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true, createdAt: true });
export const insertPurchaseReturnSchema = createInsertSchema(purchaseReturns).omit({ id: true, createdAt: true });
export const insertPurchaseReturnItemSchema = createInsertSchema(purchaseReturnItems).omit({ id: true });
export const insertDayClosingSchema = createInsertSchema(dayClosings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });

export type InsertSupplierTransaction = z.infer<typeof insertSupplierTransactionSchema>;
export type SupplierTransaction = typeof supplierTransactions.$inferSelect;

export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type SupplierPayment = typeof supplierPayments.$inferSelect;

export type InsertPurchaseReturn = z.infer<typeof insertPurchaseReturnSchema>;
export type PurchaseReturn = typeof purchaseReturns.$inferSelect;

export type InsertPurchaseReturnItem = z.infer<typeof insertPurchaseReturnItemSchema>;
export type PurchaseReturnItem = typeof purchaseReturnItems.$inferSelect;

export type InsertDayClosing = z.infer<typeof insertDayClosingSchema>;
export type DayClosing = typeof dayClosings.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const salesReturns = pgTable("sales_returns", {
  id: serial("id").primaryKey(),
  originalSaleId: integer("original_sale_id").notNull(),
  invoiceNo: text("invoice_no"),
  returnDate: timestamp("return_date").defaultNow().notNull(),
  totalRefundAmount: decimal("total_refund_amount", { precision: 10, scale: 2 }).notNull(),
  refundMode: text("refund_mode").notNull(),
  reason: text("reason"),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesReturnItems = pgTable("sales_return_items", {
  id: serial("id").primaryKey(),
  salesReturnId: integer("sales_return_id").notNull(),
  saleItemId: integer("sale_item_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  batchNumber: text("batch_number").notNull(),
  quantityReturned: integer("quantity_returned").notNull(),
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
});

export const insertSalesReturnSchema = createInsertSchema(salesReturns).omit({ id: true, createdAt: true });
export const insertSalesReturnItemSchema = createInsertSchema(salesReturnItems).omit({ id: true });

export type InsertSalesReturn = z.infer<typeof insertSalesReturnSchema>;
export type SalesReturn = typeof salesReturns.$inferSelect;

export type InsertSalesReturnItem = z.infer<typeof insertSalesReturnItemSchema>;
export type SalesReturnItem = typeof salesReturnItems.$inferSelect;

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  currentValue: integer("current_value").notNull().default(0),
  prefix: text("prefix").notNull().default("INV"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSequenceSchema = createInsertSchema(sequences).omit({ id: true, updatedAt: true });
export type InsertSequence = z.infer<typeof insertSequenceSchema>;
export type Sequence = typeof sequences.$inferSelect;

// Menu Management Tables
export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  routePath: text("route_path").notNull(),
  icon: text("icon"),
  parentId: integer("parent_id"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const menuGroups = pgTable("menu_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const menuGroupMenus = pgTable("menu_group_menus", {
  id: serial("id").primaryKey(),
  menuGroupId: integer("menu_group_id").notNull(),
  menuId: integer("menu_id").notNull(),
});

export const userMenus = pgTable("user_menus", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  menuId: integer("menu_id").notNull(),
  canView: boolean("can_view").notNull().default(true),
  canEdit: boolean("can_edit").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userMenuGroups = pgTable("user_menu_groups", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  menuGroupId: integer("menu_group_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuSchema = createInsertSchema(menus).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuGroupSchema = createInsertSchema(menuGroups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuGroupMenuSchema = createInsertSchema(menuGroupMenus).omit({ id: true });
export const insertUserMenuSchema = createInsertSchema(userMenus).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserMenuGroupSchema = createInsertSchema(userMenuGroups).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menus.$inferSelect;

export type InsertMenuGroup = z.infer<typeof insertMenuGroupSchema>;
export type MenuGroup = typeof menuGroups.$inferSelect;

export type InsertMenuGroupMenu = z.infer<typeof insertMenuGroupMenuSchema>;
export type MenuGroupMenu = typeof menuGroupMenus.$inferSelect;

export type InsertUserMenu = z.infer<typeof insertUserMenuSchema>;
export type UserMenu = typeof userMenus.$inferSelect;

export type InsertUserMenuGroup = z.infer<typeof insertUserMenuGroupSchema>;
export type UserMenuGroup = typeof userMenuGroups.$inferSelect;

// Combined type for navigation with permissions
export type MenuWithPermissions = Menu & {
  canView: boolean;
  canEdit: boolean;
};

// Petty Cash / Expenses Table
export const pettyCashExpenses = pgTable("petty_cash_expenses", {
  id: serial("id").primaryKey(),
  expenseDate: text("expense_date").notNull(),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull().default("CASH"),
  notes: text("notes"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdByUserName: text("created_by_user_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPettyCashExpenseSchema = createInsertSchema(pettyCashExpenses).omit({ id: true, createdAt: true });
export type InsertPettyCashExpense = z.infer<typeof insertPettyCashExpenseSchema>;
export type PettyCashExpense = typeof pettyCashExpenses.$inferSelect;

// Approval Requests Table (for void, discount, price override, return approvals)
export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  requestedByUserId: varchar("requested_by_user_id").notNull(),
  requestedByUserName: text("requested_by_user_name"),
  status: text("status").notNull().default("PENDING"),
  approvedByUserId: varchar("approved_by_user_id"),
  approvedByUserName: text("approved_by_user_name"),
  reason: text("reason"),
  payloadBefore: text("payload_before"),
  payloadAfter: text("payload_after"),
  approvalNotes: text("approval_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;

// Stock Adjustments Table
export const stockAdjustments = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  medicineId: integer("medicine_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  batchNumber: text("batch_number").notNull(),
  adjustmentQty: integer("adjustment_qty").notNull(),
  adjustmentType: text("adjustment_type").notNull(),
  reasonCode: text("reason_code").notNull(),
  notes: text("notes"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdByUserName: text("created_by_user_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockAdjustmentSchema = createInsertSchema(stockAdjustments).omit({ id: true, createdAt: true });
export type InsertStockAdjustment = z.infer<typeof insertStockAdjustmentSchema>;
export type StockAdjustment = typeof stockAdjustments.$inferSelect;
