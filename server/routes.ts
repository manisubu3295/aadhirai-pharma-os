import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertMedicineSchema, 
  insertCustomerSchema, 
  insertDoctorSchema, 
  insertSaleSchema,
  createSaleItemSchema,
  insertLocationSchema,
  insertAuditLogSchema,
  insertCreditPaymentSchema,
  insertHeldBillSchema,
  insertSupplierSchema,
  insertSupplierRateSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertGoodsReceiptSchema,
  insertGoodsReceiptItemSchema,
  insertSalesReturnSchema,
  insertSalesReturnItemSchema,
  insertPettyCashExpenseSchema,
  insertApprovalRequestSchema,
  insertStockAdjustmentSchema
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  
  if (now - lastActivity > IDLE_TIMEOUT_MS) {
    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
    });
    return res.status(401).json({ 
      error: "Session expired due to inactivity. Please log in again.",
      sessionExpired: true 
    });
  }
  
  req.session.lastActivity = now;
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint for production verification
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const medicines = await storage.getMedicines();
      res.json({ 
        status: "healthy", 
        database: "connected",
        medicineCount: medicines.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Health check failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        status: "unhealthy", 
        database: "error",
        error: errorMessage 
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      console.log("Login attempt for user:", user);
      console.log("Login attempt for username:", username);
      console.log("Login attempt for Response:", res);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "Account is disabled" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.lastActivity = Date.now();
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : " "});
      //res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  app.put("/api/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { name, email, phone, photoUrl, address, city, state, pincode, pharmacyName, gstNumber, drugLicense } = req.body;
      
      const updatedUser = await storage.updateUser(req.session.userId, {
        name,
        email,
        phone,
        photoUrl,
        address,
        city,
        state,
        pincode,
        pharmacyName,
        gstNumber,
        drugLicense,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/auth/reset-passwords", async (req, res) => {
    try {
      const users = await storage.getUsers();
      if (users.length === 0) {
        return res.status(400).json({ error: "No users to reset" });
      }
      
      const password = await bcrypt.hash("password123", 10);
      
      for (const user of users) {
        await storage.updateUser(user.id, { password });
      }
      
      res.json({ 
        message: "Passwords reset successfully for all users",
        credentials: { password: "password123" }
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  app.post("/api/auth/setup", async (req, res) => {
    try {
      const password = await bcrypt.hash("password123", 10);
      const created: string[] = [];
      
      const ownerExists = await storage.getUserByUsername("owner");
      if (!ownerExists) {
        await storage.createUser({
          username: "owner",
          password,
          name: "Admin User",
          role: "owner",
          email: "admin@pharmacy.com",
          phone: "9876543210",
        });
        created.push("owner");
      }
      
      const pharmacistExists = await storage.getUserByUsername("pharmacist");
      if (!pharmacistExists) {
        await storage.createUser({
          username: "pharmacist",
          password,
          name: "Pharmacist User",
          role: "pharmacist",
          email: "pharmacist@pharmacy.com",
          phone: "9876543211",
        });
        created.push("pharmacist");
      }
      
      const cashierExists = await storage.getUserByUsername("cashier");
      if (!cashierExists) {
        await storage.createUser({
          username: "cashier",
          password,
          name: "Cashier User",
          role: "cashier",
          email: "cashier@pharmacy.com",
          phone: "9876543212",
        });
        created.push("cashier");
      }
      
      if (created.length === 0) {
        return res.json({ message: "All default users already exist." });
      }
      
      res.json({ 
        message: `Setup completed. Created users: ${created.join(", ")}`, 
        credentials: {
          username: "owner",
          password: "password123"
        }
      });
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({ error: "Setup failed" });
    }
  });

  app.get("/api/users", requireRole("owner", "admin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password: _, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireRole("owner"), async (req, res) => {
    try {
      const data = req.body;
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/users/:id/reset-password", requireRole("owner", "admin"), async (req, res) => {
    try {
      const userId = req.params.id;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (targetUser.role === "owner") {
        return res.status(403).json({ error: "Cannot reset owner password" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/medicines", async (req, res) => {
    try {
      const medicines = await storage.getMedicines();
      res.json(medicines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medicines" });
    }
  });

  app.get("/api/medicines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const medicine = await storage.getMedicine(id);
      if (!medicine) {
        return res.status(404).json({ error: "Medicine not found" });
      }
      res.json(medicine);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medicine" });
    }
  });

  app.post("/api/medicines", async (req, res) => {
    try {
      const data = insertMedicineSchema.parse(req.body);
      const medicine = await storage.createMedicine(data);
      res.status(201).json(medicine);
    } catch (error) {
      console.error("Medicine creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create medicine", details: errorMessage });
    }
  });

  app.patch("/api/medicines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertMedicineSchema.partial().parse(req.body);
      const medicine = await storage.updateMedicine(id, data);
      if (!medicine) {
        return res.status(404).json({ error: "Medicine not found" });
      }
      res.json(medicine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update medicine" });
    }
  });

  app.delete("/api/medicines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMedicine(id);
      if (!deleted) {
        return res.status(404).json({ error: "Medicine not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete medicine" });
    }
  });

  app.post("/api/medicines/import", async (req, res) => {
    try {
      const { medicines } = req.body;
      if (!Array.isArray(medicines)) {
        return res.status(400).json({ error: "Invalid data format" });
      }
      
      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      for (const med of medicines) {
        try {
          const data = insertMedicineSchema.parse({
            name: med.name,
            genericName: med.genericName || null,
            manufacturer: med.manufacturer || null,
            batchNumber: med.batchNumber || `BATCH-${Date.now()}`,
            expiryDate: med.expiryDate || "",
            quantity: parseInt(med.quantity) || 0,
            price: med.price || "0",
            costPrice: med.costPrice || med.price || "0",
            mrp: med.mrp || med.price || "0",
            gstRate: med.gstRate || "12",
            hsnCode: med.hsnCode || null,
            category: med.category || null,
            schedule: med.schedule || null,
            reorderLevel: parseInt(med.reorderLevel) || 10,
            packSize: parseInt(med.packSize) || 1,
            unitType: med.unitType || "STRIP",
          });
          await storage.createMedicine(data);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to import medicines" });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Customer creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create customer", details: errorMessage });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.post("/api/customers/import", async (req, res) => {
    try {
      const { customers } = req.body;
      if (!Array.isArray(customers)) {
        return res.status(400).json({ error: "Invalid data format" });
      }
      
      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      for (const cust of customers) {
        try {
          const data = insertCustomerSchema.parse({
            name: cust.name,
            phone: cust.phone || null,
            email: cust.email || null,
            address: cust.address || null,
            creditLimit: cust.creditLimit || "0",
          });
          await storage.createCustomer(data);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to import customers" });
    }
  });

  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  app.post("/api/doctors", async (req, res) => {
    try {
      const data = insertDoctorSchema.parse(req.body);
      const doctor = await storage.createDoctor(data);
      res.status(201).json(doctor);
    } catch (error) {
      console.error("Doctor creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create doctor", details: errorMessage });
    }
  });

  app.put("/api/doctors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertDoctorSchema.partial().parse(req.body);
      const doctor = await storage.updateDoctor(id, data);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update doctor" });
    }
  });

  app.delete("/api/doctors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDoctor(id);
      if (!deleted) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete doctor" });
    }
  });

  app.post("/api/doctors/import", async (req, res) => {
    try {
      const { doctors } = req.body;
      if (!Array.isArray(doctors)) {
        return res.status(400).json({ error: "Invalid data format" });
      }
      
      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      for (const doc of doctors) {
        try {
          const data = insertDoctorSchema.parse({
            name: doc.name,
            specialization: doc.specialization || null,
            phone: doc.phone || null,
            email: doc.email || null,
            registrationNo: doc.registrationNo || null,
            address: doc.address || null,
          });
          await storage.createDoctor(data);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to import doctors" });
    }
  });

  app.get("/api/my-sales", requireAuth, async (req, res) => {
    try {
      const userRole = req.session.userRole;
      const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
      
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string + "T23:59:59") : undefined;
      const search = req.query.search as string | undefined;
      
      if (isOwnerOrAdmin) {
        const targetUserId = req.query.userId as string | undefined;
        const sales = await storage.getSalesWithFilters({ 
          userId: targetUserId || undefined, 
          from, 
          to, 
          search 
        });
        res.json(sales);
      } else {
        const sales = await storage.getSalesByUser(req.session.userId!, { from, to, search });
        res.json(sales);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user sales" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const invoiceNo = req.query.invoiceNo as string | undefined;
      
      if (invoiceNo) {
        const sale = await storage.getSaleByInvoiceNo(invoiceNo);
        return res.json(sale ? [sale] : []);
      }
      
      const sales = await storage.getSales(limit);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSale(id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sale" });
    }
  });

  app.get("/api/sales/:id/items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getSaleItems(id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sale items" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const { items, ...saleData } = req.body;
      const sale = insertSaleSchema.parse(saleData);
      const saleItems = z.array(createSaleItemSchema).parse(items);
      
      const paymentMethod = (sale.paymentMethod || "").toLowerCase();
      const netAmount = parseFloat(String(sale.total || 0));
      const receivedAmount = parseFloat(String(sale.receivedAmount || 0));
      
      if (paymentMethod !== "credit" && receivedAmount < netAmount) {
        return res.status(400).json({ 
          error: "Received amount cannot be less than net amount for non-credit payments." 
        });
      }
      
      const invoiceNo = await storage.getNextInvoiceNumber();
      const saleWithInvoice = { ...sale, invoiceNo };
      
      const createdSale = await storage.createSale(saleWithInvoice, saleItems);
      res.status(201).json(createdSale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/reports/collections/monthly", async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const allSales = await storage.getSales(10000);
      
      const monthlyData: Record<string, { cash: number; card: number; upi: number; credit: number; total: number }> = {};
      
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        monthlyData[monthKey] = { cash: 0, card: 0, upi: 0, credit: 0, total: 0 };
      }
      
      allSales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        if (saleDate.getFullYear() === year) {
          const monthKey = `${year}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`;
          const amount = parseFloat(String(sale.total));
          const method = sale.paymentMethod?.toLowerCase() || 'cash';
          
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].total += amount;
            if (method === 'cash') monthlyData[monthKey].cash += amount;
            else if (method === 'card') monthlyData[monthKey].card += amount;
            else if (method === 'upi') monthlyData[monthKey].upi += amount;
            else if (method === 'credit') monthlyData[monthKey].credit += amount;
            else monthlyData[monthKey].cash += amount;
          }
        }
      });
      
      const result = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        year,
        monthName: new Date(`${month}-01`).toLocaleString('default', { month: 'long' }),
        ...data
      }));
      
      res.json(result);
    } catch (error) {
      console.error("Monthly collections error:", error);
      res.status(500).json({ error: "Failed to fetch monthly collections" });
    }
  });

  app.get("/api/reports/collections/quarterly", async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const allSales = await storage.getSales(10000);
      
      const quarterlyData: Record<string, { cash: number; card: number; upi: number; credit: number; total: number }> = {
        'Q1': { cash: 0, card: 0, upi: 0, credit: 0, total: 0 },
        'Q2': { cash: 0, card: 0, upi: 0, credit: 0, total: 0 },
        'Q3': { cash: 0, card: 0, upi: 0, credit: 0, total: 0 },
        'Q4': { cash: 0, card: 0, upi: 0, credit: 0, total: 0 }
      };
      
      allSales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        if (saleDate.getFullYear() === year) {
          const month = saleDate.getMonth();
          const quarter = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4';
          const amount = parseFloat(String(sale.total));
          const method = sale.paymentMethod?.toLowerCase() || 'cash';
          
          quarterlyData[quarter].total += amount;
          if (method === 'cash') quarterlyData[quarter].cash += amount;
          else if (method === 'card') quarterlyData[quarter].card += amount;
          else if (method === 'upi') quarterlyData[quarter].upi += amount;
          else if (method === 'credit') quarterlyData[quarter].credit += amount;
          else quarterlyData[quarter].cash += amount;
        }
      });
      
      const result = Object.entries(quarterlyData).map(([quarter, data]) => ({
        quarter,
        year,
        ...data
      }));
      
      res.json(result);
    } catch (error) {
      console.error("Quarterly collections error:", error);
      res.status(500).json({ error: "Failed to fetch quarterly collections" });
    }
  });

  app.get("/api/reports/collections/yearly", async (req, res) => {
    try {
      const allSales = await storage.getSales(10000);
      
      const yearlyData: Record<number, { cash: number; card: number; upi: number; credit: number; total: number }> = {};
      
      allSales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        const year = saleDate.getFullYear();
        
        if (!yearlyData[year]) {
          yearlyData[year] = { cash: 0, card: 0, upi: 0, credit: 0, total: 0 };
        }
        
        const amount = parseFloat(String(sale.total));
        const method = sale.paymentMethod?.toLowerCase() || 'cash';
        
        yearlyData[year].total += amount;
        if (method === 'cash') yearlyData[year].cash += amount;
        else if (method === 'card') yearlyData[year].card += amount;
        else if (method === 'upi') yearlyData[year].upi += amount;
        else if (method === 'credit') yearlyData[year].credit += amount;
        else yearlyData[year].cash += amount;
      });
      
      const result = Object.entries(yearlyData).map(([year, data]) => ({
        year: parseInt(year),
        ...data
      })).sort((a, b) => b.year - a.year);
      
      res.json(result);
    } catch (error) {
      console.error("Yearly collections error:", error);
      res.status(500).json({ error: "Failed to fetch yearly collections" });
    }
  });

  app.get("/api/reports/collections/by-item", async (req, res) => {
    try {
      const { from, to } = req.query;
      const allSales = await storage.getSales(10000);
      
      const fromDate = from ? new Date(from as string) : new Date();
      const toDate = to ? new Date(to as string) : new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= fromDate && saleDate <= toDate;
      });
      
      const itemData: Record<string, { name: string; qty: number; total: number }> = {};
      
      for (const sale of filteredSales) {
        const items = await storage.getSaleItems(sale.id);
        items.forEach((item: any) => {
          const key = item.medicineName || `Item-${item.medicineId}`;
          if (!itemData[key]) {
            itemData[key] = { name: key, qty: 0, total: 0 };
          }
          itemData[key].qty += item.quantity || 0;
          itemData[key].total += parseFloat(String(item.total || "0"));
        });
      }
      
      const result = Object.values(itemData).sort((a, b) => b.total - a.total);
      res.json(result);
    } catch (error) {
      console.error("Item collections error:", error);
      res.status(500).json({ error: "Failed to fetch item collections" });
    }
  });

  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post("/api/locations", async (req, res) => {
    try {
      const data = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(data);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create location" });
    }
  });

  app.put("/api/locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(id, data);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.delete("/api/locations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLocation(id);
      if (!deleted) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete location" });
    }
  });

  app.post("/api/locations/import", async (req, res) => {
    try {
      const { locations } = req.body;
      if (!Array.isArray(locations)) {
        return res.status(400).json({ error: "Invalid data format" });
      }
      
      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      for (const loc of locations) {
        try {
          const data = insertLocationSchema.parse({
            rack: loc.rack,
            row: loc.row,
            bin: loc.bin,
            description: loc.description || null,
          });
          await storage.createLocation(data);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to import locations" });
    }
  });

  app.get("/api/audit-logs", requireRole("owner"), async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const logs = await storage.getAuditLogs(from, to);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.post("/api/audit-logs", async (req, res) => {
    try {
      const data = insertAuditLogSchema.parse(req.body);
      const log = await storage.createAuditLog(data);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create audit log" });
    }
  });

  app.get("/api/credit-payments", async (req, res) => {
    try {
      const saleId = req.query.saleId ? parseInt(req.query.saleId as string) : undefined;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const payments = await storage.getCreditPayments(saleId, customerId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credit payments" });
    }
  });

  app.post("/api/credit-payments", async (req, res) => {
    try {
      const data = insertCreditPaymentSchema.parse(req.body);
      const payment = await storage.createCreditPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create credit payment" });
    }
  });

  app.post("/api/credit-billing/payment", async (req, res) => {
    try {
      const { customerId, amount, paymentMethod, reference } = req.body;
      
      if (!customerId || amount === undefined || !paymentMethod) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const paymentAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ error: "Payment amount must be greater than zero" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const currentBalance = parseFloat(customer.outstandingBalance || "0");

      if (paymentAmount > currentBalance + 0.01) {
        return res.status(400).json({ error: "Payment cannot exceed outstanding balance" });
      }

      const sales = await storage.getSales();
      const customerCreditSales = sales
        .filter(s => s.customerId === customerId && s.paymentMethod === "Credit")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const saleId = customerCreditSales.length > 0 ? customerCreditSales[0].id : 1;

      const newBalance = Math.max(0, currentBalance - paymentAmount);
      
      await storage.updateCustomer(customerId, {
        outstandingBalance: newBalance.toFixed(2),
      });

      const payment = await storage.createCreditPayment({
        saleId,
        customerId,
        amount: paymentAmount.toFixed(2),
        paymentMethod,
        notes: reference || null,
      });

      res.status(201).json({ 
        payment, 
        newBalance: newBalance.toFixed(2),
        message: "Payment recorded successfully" 
      });
    } catch (error) {
      console.error("Credit billing payment error:", error);
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  app.get("/api/held-bills", async (req, res) => {
    try {
      const bills = await storage.getHeldBills();
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch held bills" });
    }
  });

  app.get("/api/held-bills/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bill = await storage.getHeldBill(id);
      if (!bill) {
        return res.status(404).json({ error: "Held bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch held bill" });
    }
  });

  app.post("/api/held-bills", async (req, res) => {
    try {
      const data = insertHeldBillSchema.parse(req.body);
      const bill = await storage.createHeldBill(data);
      res.status(201).json(bill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create held bill" });
    }
  });

  app.delete("/api/held-bills/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHeldBill(id);
      if (!deleted) {
        return res.status(404).json({ error: "Held bill not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete held bill" });
    }
  });

  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Supplier creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create supplier", details: errorMessage });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, data);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSupplier(id);
      if (!deleted) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  app.post("/api/suppliers/import", async (req, res) => {
    try {
      const { suppliers } = req.body;
      if (!Array.isArray(suppliers)) {
        return res.status(400).json({ error: "Invalid data format" });
      }
      
      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      for (const sup of suppliers) {
        try {
          const data = insertSupplierSchema.parse({
            name: sup.name,
            code: sup.code || `SUP-${Date.now()}`,
            contact: sup.contact || null,
            phone: sup.phone || null,
            email: sup.email || null,
            address: sup.address || null,
            gstNo: sup.gstNo || null,
            drugLicenseNo: sup.drugLicenseNo || null,
            paymentTerms: sup.paymentTerms || null,
          });
          await storage.createSupplier(data);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Row ${results.success + results.failed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to import suppliers" });
    }
  });

  app.get("/api/supplier-rates", async (req, res) => {
    try {
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;
      const rates = await storage.getSupplierRates(supplierId);
      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier rates" });
    }
  });

  app.get("/api/suppliers/:id/rates", async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const rates = await storage.getSupplierRates(supplierId);
      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier rates" });
    }
  });

  app.post("/api/supplier-rates", async (req, res) => {
    try {
      const data = insertSupplierRateSchema.parse(req.body);
      const rate = await storage.createSupplierRate(data);
      res.status(201).json(rate);
    } catch (error) {
      console.error("Supplier rate creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create supplier rate", details: errorMessage });
    }
  });

  app.put("/api/supplier-rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertSupplierRateSchema.partial().parse(req.body);
      const rate = await storage.updateSupplierRate(id, data);
      if (!rate) {
        return res.status(404).json({ error: "Supplier rate not found" });
      }
      res.json(rate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update supplier rate" });
    }
  });

  app.delete("/api/supplier-rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSupplierRate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Supplier rate not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier rate" });
    }
  });

  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const purchaseOrders = await storage.getPurchaseOrders();
      res.json(purchaseOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const po = await storage.getPurchaseOrder(id);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(po);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order" });
    }
  });

  app.get("/api/purchase-orders/:id/items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getPurchaseOrderItems(id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order items" });
    }
  });

  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const { items, ...poData } = req.body;
      const po = insertPurchaseOrderSchema.parse(poData);
      const poItems = z.array(insertPurchaseOrderItemSchema.omit({ poId: true })).parse(items || []);
      const itemsWithDummyPoId = poItems.map(item => ({ ...item, poId: 0 }));
      
      const createdPo = await storage.createPurchaseOrder(po, itemsWithDummyPoId);
      res.status(201).json(createdPo);
    } catch (error) {
      console.error("Purchase order creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create purchase order", details: errorMessage });
    }
  });

  app.patch("/api/purchase-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const existingPO = await storage.getPurchaseOrder(id);
      if (!existingPO) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      if (existingPO.status !== "Draft") {
        return res.status(400).json({ 
          error: "Purchase Order cannot be edited once it is approved/issued/completed." 
        });
      }
      
      const { items, ...poData } = req.body;
      const data = insertPurchaseOrderSchema.partial().parse(poData);
      const po = await storage.updatePurchaseOrder(id, data);
      
      if (items && Array.isArray(items)) {
        await storage.deletePurchaseOrderItems(id);
        const poItems = z.array(insertPurchaseOrderItemSchema.omit({ poId: true })).parse(items);
        const itemsWithPoId = poItems.map(item => ({ ...item, poId: id }));
        await storage.createPurchaseOrderItems(itemsWithPoId);
      }
      
      res.json(po);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update purchase order" });
    }
  });

  app.post("/api/purchase-orders/:id/issue", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const po = await storage.updatePurchaseOrder(id, { status: "Issued" });
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(po);
    } catch (error) {
      res.status(500).json({ error: "Failed to issue purchase order" });
    }
  });

  app.get("/api/goods-receipts", async (req, res) => {
    try {
      const receipts = await storage.getGoodsReceipts();
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goods receipts" });
    }
  });

  app.get("/api/goods-receipts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const grn = await storage.getGoodsReceipt(id);
      if (!grn) {
        return res.status(404).json({ error: "Goods receipt not found" });
      }
      res.json(grn);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goods receipt" });
    }
  });

  app.get("/api/goods-receipts/:id/items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getGoodsReceiptItems(id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goods receipt items" });
    }
  });

  app.post("/api/goods-receipts", async (req, res) => {
    try {
      const { items, ...grnData } = req.body;
      const grn = insertGoodsReceiptSchema.parse(grnData);
      const grnItems = z.array(insertGoodsReceiptItemSchema.omit({ grnId: true })).parse(items || []);
      const itemsWithDummyGrnId = grnItems.map(item => ({ ...item, grnId: 0 }));
      
      const createdGrn = await storage.createGoodsReceipt(grn, itemsWithDummyGrnId);
      
      if (grn.poId) {
        const poItems = await storage.getPurchaseOrderItems(grn.poId);
        const allReceived = poItems.every(item => item.receivedQty >= item.quantity);
        const someReceived = poItems.some(item => item.receivedQty > 0);
        
        if (allReceived) {
          await storage.updatePurchaseOrder(grn.poId, { status: "Received" });
        } else if (someReceived) {
          await storage.updatePurchaseOrder(grn.poId, { status: "PartiallyReceived" });
        }
      }
      
      res.status(201).json(createdGrn);
    } catch (error) {
      console.error("Goods receipt creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create goods receipt", details: errorMessage });
    }
  });

  app.get("/api/sales-returns", async (req, res) => {
    try {
      const returns = await storage.getSalesReturns();
      res.json(returns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales returns" });
    }
  });

  app.get("/api/sales-returns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesReturn = await storage.getSalesReturn(id);
      if (!salesReturn) {
        return res.status(404).json({ error: "Sales return not found" });
      }
      res.json(salesReturn);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales return" });
    }
  });

  app.get("/api/sales-returns/:id/items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getSalesReturnItems(id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales return items" });
    }
  });

  app.get("/api/sales/:id/with-returns", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.getSaleWithReturns(id);
      if (!result) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sale with returns" });
    }
  });

  app.post("/api/sales-returns", async (req, res) => {
    try {
      const { items, ...returnData } = req.body;
      
      if (!returnData.originalSaleId) {
        return res.status(400).json({ error: "Original sale ID is required" });
      }
      
      const saleWithReturns = await storage.getSaleWithReturns(returnData.originalSaleId);
      if (!saleWithReturns) {
        return res.status(404).json({ error: "Original sale not found" });
      }
      
      const originalPaymentMethod = saleWithReturns.sale.paymentMethod?.toLowerCase();
      const requestedRefundMode = returnData.refundMode?.toLowerCase();
      
      if (originalPaymentMethod === "credit") {
        const allowedCreditRefundModes = ["credit", "adjustment", "credit_adjustment"];
        if (!allowedCreditRefundModes.includes(requestedRefundMode)) {
          return res.status(400).json({ 
            error: "Credit bill refunds must be processed as credit adjustments, not cash/card/UPI." 
          });
        }
      }
      
      const returnItems = items || [];
      let totalRefundAmount = 0;
      
      for (const returnItem of returnItems) {
        const saleItem = saleWithReturns.items.find(item => item.id === returnItem.saleItemId);
        if (!saleItem) {
          return res.status(400).json({ error: `Sale item ${returnItem.saleItemId} not found` });
        }
        
        const maxReturnable = saleItem.quantity - saleItem.returnedQty;
        if (returnItem.quantityReturned > maxReturnable) {
          return res.status(400).json({ 
            error: `Cannot return ${returnItem.quantityReturned} of ${saleItem.medicineName}. Maximum returnable: ${maxReturnable}` 
          });
        }
        
        const pricePerUnit = parseFloat(String(saleItem.price));
        returnItem.pricePerUnit = pricePerUnit;
        returnItem.refundAmount = pricePerUnit * returnItem.quantityReturned;
        returnItem.medicineName = saleItem.medicineName;
        returnItem.batchNumber = saleItem.batchNumber;
        totalRefundAmount += returnItem.refundAmount;
      }
      
      const parsedReturnData = insertSalesReturnSchema.parse({
        ...returnData,
        invoiceNo: saleWithReturns.sale.invoiceNo,
        totalRefundAmount: totalRefundAmount.toFixed(2),
        customerName: saleWithReturns.sale.customerName,
        customerId: saleWithReturns.sale.customerId
      });
      
      const createdReturn = await storage.createSalesReturn(parsedReturnData, returnItems);
      res.status(201).json(createdReturn);
    } catch (error) {
      console.error("Sales return creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create sales return", details: errorMessage });
    }
  });

  // Settings routes
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      
      await storage.upsertMultipleSettings(settingsArray);
      res.json({ message: "Settings saved successfully" });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Menu Management Admin APIs
  app.get("/api/admin/menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      const menus = await storage.getMenus();
      res.json(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ error: "Failed to fetch menus" });
    }
  });

  app.post("/api/admin/menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      const menu = await storage.createMenu(req.body);
      res.status(201).json(menu);
    } catch (error) {
      console.error("Error creating menu:", error);
      res.status(500).json({ error: "Failed to create menu" });
    }
  });

  app.put("/api/admin/menus/:id", requireRole("owner", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menu = await storage.updateMenu(id, req.body);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      console.error("Error updating menu:", error);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  app.delete("/api/admin/menus/:id", requireRole("owner", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenu(id);
      if (!deleted) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu:", error);
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });

  // Menu Groups Admin APIs
  app.get("/api/admin/menu-groups", requireRole("owner", "admin"), async (req, res) => {
    try {
      const groups = await storage.getMenuGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching menu groups:", error);
      res.status(500).json({ error: "Failed to fetch menu groups" });
    }
  });

  app.post("/api/admin/menu-groups", requireRole("owner", "admin"), async (req, res) => {
    try {
      const group = await storage.createMenuGroup(req.body);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating menu group:", error);
      res.status(500).json({ error: "Failed to create menu group" });
    }
  });

  app.put("/api/admin/menu-groups/:id", requireRole("owner", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const group = await storage.updateMenuGroup(id, req.body);
      if (!group) {
        return res.status(404).json({ error: "Menu group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error updating menu group:", error);
      res.status(500).json({ error: "Failed to update menu group" });
    }
  });

  app.delete("/api/admin/menu-groups/:id", requireRole("owner", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenuGroup(id);
      if (!deleted) {
        return res.status(404).json({ error: "Menu group not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu group:", error);
      res.status(500).json({ error: "Failed to delete menu group" });
    }
  });

  app.get("/api/admin/menu-groups/:id/menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuLinks = await storage.getMenuGroupMenus(id);
      res.json(menuLinks);
    } catch (error) {
      console.error("Error fetching menu group menus:", error);
      res.status(500).json({ error: "Failed to fetch menu group menus" });
    }
  });

  app.put("/api/admin/menu-groups/:id/menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { menuIds } = req.body;
      if (!Array.isArray(menuIds)) {
        return res.status(400).json({ error: "menuIds must be an array" });
      }
      await storage.setMenuGroupMenus(id, menuIds);
      res.json({ message: "Menu group menus updated" });
    } catch (error) {
      console.error("Error setting menu group menus:", error);
      res.status(500).json({ error: "Failed to set menu group menus" });
    }
  });

  // User Menu Access Admin APIs
  app.get("/api/admin/users/:id/menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      const userId = req.params.id;
      const [directMenus, userGroups] = await Promise.all([
        storage.getUserMenus(userId),
        storage.getUserMenuGroups(userId)
      ]);
      res.json({ menus: directMenus, groups: userGroups });
    } catch (error) {
      console.error("Error fetching user menus:", error);
      res.status(500).json({ error: "Failed to fetch user menus" });
    }
  });

  app.put("/api/admin/users/:id/menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      const userId = req.params.id;
      const { permissions, groupIds } = req.body;
      
      console.log("[User Menu Access] Saving for userId:", userId);
      console.log("[User Menu Access] Permissions:", JSON.stringify(permissions));
      console.log("[User Menu Access] Group IDs:", JSON.stringify(groupIds));
      
      if (permissions && Array.isArray(permissions)) {
        await storage.setUserMenus(userId, permissions);
      }
      
      if (groupIds && Array.isArray(groupIds)) {
        await storage.setUserMenuGroups(userId, groupIds);
      }
      
      // Verify what was saved
      const savedMenus = await storage.getUserMenus(userId);
      console.log("[User Menu Access] Saved menus count:", savedMenus.length);
      
      res.json({ message: "User menu access updated" });
    } catch (error) {
      console.error("Error updating user menus:", error);
      res.status(500).json({ error: "Failed to update user menus" });
    }
  });

  // Current user navigation endpoint
  app.get("/api/me/menus", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      console.log("[Navigation] Fetching for user:", user.id, "role:", user.role);
      const navigation = await storage.getUserNavigation(user.id, user.role);
      console.log("[Navigation] Returned menus count:", navigation.length);
      res.json(navigation);
    } catch (error) {
      console.error("Error fetching user navigation:", error);
      res.status(500).json({ error: "Failed to fetch navigation" });
    }
  });

  // Seed menus endpoint (for initial setup)
  app.post("/api/admin/seed-menus", requireRole("owner", "admin"), async (req, res) => {
    try {
      await storage.seedDefaultMenus();
      res.json({ message: "Default menus seeded successfully" });
    } catch (error) {
      console.error("Error seeding menus:", error);
      res.status(500).json({ error: "Failed to seed menus" });
    }
  });

  // ========== SUPPLIER LEDGER & PAYMENTS ==========
  
  // Get supplier ledger (all transactions)
  app.get("/api/suppliers/:id/ledger", requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const ledger = await storage.getSupplierLedger(supplierId);
      res.json(ledger);
    } catch (error) {
      console.error("Error fetching supplier ledger:", error);
      res.status(500).json({ error: "Failed to fetch supplier ledger" });
    }
  });

  // Get supplier balance
  app.get("/api/suppliers/:id/balance", requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const balance = await storage.getSupplierBalance(supplierId);
      res.json({ balance });
    } catch (error) {
      console.error("Error fetching supplier balance:", error);
      res.status(500).json({ error: "Failed to fetch supplier balance" });
    }
  });

  // Get all supplier payments (optionally filter by supplier)
  app.get("/api/supplier-payments", requireAuth, async (req, res) => {
    try {
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;
      const payments = await storage.getSupplierPayments(supplierId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching supplier payments:", error);
      res.status(500).json({ error: "Failed to fetch supplier payments" });
    }
  });

  // Create supplier payment
  app.post("/api/supplier-payments", requireAuth, async (req, res) => {
    try {
      const { supplierId, amount, paymentMode, referenceNo, remarks } = req.body;
      
      if (!supplierId || !amount || !paymentMode) {
        return res.status(400).json({ error: "supplierId, amount, and paymentMode are required" });
      }
      
      const payment = await storage.createSupplierPayment({
        supplierId: parseInt(supplierId),
        amount: String(amount),
        paymentMode,
        referenceNo: referenceNo || null,
        remarks: remarks || null,
        createdByUserId: req.session.userId || null,
      });
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating supplier payment:", error);
      res.status(500).json({ error: "Failed to create supplier payment" });
    }
  });

  // ========== PURCHASE RETURNS ==========
  
  // Get all purchase returns
  app.get("/api/purchase-returns", requireAuth, async (req, res) => {
    try {
      const returns = await storage.getPurchaseReturns();
      res.json(returns);
    } catch (error) {
      console.error("Error fetching purchase returns:", error);
      res.status(500).json({ error: "Failed to fetch purchase returns" });
    }
  });

  // Get single purchase return
  app.get("/api/purchase-returns/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const purchaseReturn = await storage.getPurchaseReturn(id);
      if (!purchaseReturn) {
        return res.status(404).json({ error: "Purchase return not found" });
      }
      res.json(purchaseReturn);
    } catch (error) {
      console.error("Error fetching purchase return:", error);
      res.status(500).json({ error: "Failed to fetch purchase return" });
    }
  });

  // Get purchase return items
  app.get("/api/purchase-returns/:id/items", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getPurchaseReturnItems(id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase return items:", error);
      res.status(500).json({ error: "Failed to fetch purchase return items" });
    }
  });

  // Create purchase return
  app.post("/api/purchase-returns", requireAuth, async (req, res) => {
    try {
      const { supplierId, supplierName, originalGrnId, reason, items } = req.body;
      
      if (!supplierId || !supplierName || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "supplierId, supplierName, and items are required" });
      }
      
      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      
      const processedItems = items.map((item: any) => {
        const itemTotal = parseFloat(item.rate) * item.quantityReturned;
        const itemTax = itemTotal * (parseFloat(item.gstRate || 18) / 100);
        subtotal += itemTotal;
        taxAmount += itemTax;
        
        return {
          grnItemId: item.grnItemId || null,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantityReturned: item.quantityReturned,
          rate: String(item.rate),
          gstRate: String(item.gstRate || 18),
          taxAmount: String(itemTax.toFixed(2)),
          totalAmount: String((itemTotal + itemTax).toFixed(2)),
        };
      });
      
      const totalAmount = subtotal + taxAmount;
      
      // Generate return number
      const returnNumber = await storage.getNextPurchaseReturnNumber();
      
      const purchaseReturn = await storage.createPurchaseReturn(
        {
          returnNumber,
          supplierId: parseInt(supplierId),
          supplierName,
          originalGrnId: originalGrnId ? parseInt(originalGrnId) : null,
          subtotal: String(subtotal.toFixed(2)),
          taxAmount: String(taxAmount.toFixed(2)),
          totalAmount: String(totalAmount.toFixed(2)),
          reason: reason || null,
          createdByUserId: req.session.userId || null,
        },
        processedItems
      );
      
      res.status(201).json(purchaseReturn);
    } catch (error) {
      console.error("Error creating purchase return:", error);
      res.status(500).json({ error: "Failed to create purchase return" });
    }
  });

  // ========== DAY CLOSING ==========
  
  // Get day closing for specific date
  app.get("/api/day-closing/:date", requireAuth, async (req, res) => {
    try {
      const businessDate = req.params.date;
      const dayClosing = await storage.getDayClosing(businessDate);
      if (!dayClosing) {
        return res.json(null);
      }
      
      // Add user names
      let openedByUserName = null;
      let closedByUserName = null;
      
      if (dayClosing.openedByUserId) {
        const openedByUser = await storage.getUser(dayClosing.openedByUserId);
        openedByUserName = openedByUser?.name || openedByUser?.username || null;
      }
      if (dayClosing.closedByUserId) {
        const closedByUser = await storage.getUser(dayClosing.closedByUserId);
        closedByUserName = closedByUser?.name || closedByUser?.username || null;
      }
      
      res.json({ ...dayClosing, openedByUserName, closedByUserName });
    } catch (error) {
      console.error("Error fetching day closing:", error);
      res.status(500).json({ error: "Failed to fetch day closing" });
    }
  });

  // Get list of day closings
  app.get("/api/day-closings", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const userId = req.query.userId as string | undefined;
      
      // Pass userId to storage for database-level filtering
      const dayClosings = await storage.getDayClosings(limit, userId);
      
      // Enrich with user names
      const allUsers = await storage.getUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u.name || u.username]));
      
      const enrichedClosings = dayClosings.map(dc => ({
        ...dc,
        openedByUserName: dc.openedByUserId ? userMap.get(dc.openedByUserId) || null : null,
        closedByUserName: dc.closedByUserId ? userMap.get(dc.closedByUserId) || null : null,
      }));
      
      res.json(enrichedClosings);
    } catch (error) {
      console.error("Error fetching day closings:", error);
      res.status(500).json({ error: "Failed to fetch day closings" });
    }
  });

  // Open day
  app.post("/api/day-closing/open", requireAuth, async (req, res) => {
    try {
      const { businessDate, openingCash } = req.body;
      
      if (!businessDate) {
        return res.status(400).json({ error: "businessDate is required" });
      }
      
      // Check if day is already open
      const existing = await storage.getDayClosing(businessDate);
      if (existing) {
        return res.status(400).json({ error: "Day is already opened" });
      }
      
      const dayClosing = await storage.openDay({
        businessDate,
        openingCash: String(openingCash || 0),
        openedByUserId: req.session.userId!,
      });
      
      res.status(201).json(dayClosing);
    } catch (error) {
      console.error("Error opening day:", error);
      res.status(500).json({ error: "Failed to open day" });
    }
  });

  // Close day
  app.post("/api/day-closing/close", requireAuth, async (req, res) => {
    try {
      const { businessDate, actualCash, notes } = req.body;
      
      if (!businessDate || actualCash === undefined) {
        return res.status(400).json({ error: "businessDate and actualCash are required" });
      }
      
      // Check if day exists and is open
      const existing = await storage.getDayClosing(businessDate);
      if (!existing) {
        return res.status(400).json({ error: "Day has not been opened" });
      }
      if (existing.status === 'CLOSED') {
        return res.status(400).json({ error: "Day is already closed" });
      }
      
      const dayClosing = await storage.closeDay(businessDate, {
        actualCash: String(actualCash),
        notes: notes || null,
        closedByUserId: req.session.userId!,
      });
      
      res.json(dayClosing);
    } catch (error) {
      console.error("Error closing day:", error);
      res.status(500).json({ error: "Failed to close day" });
    }
  });

  // Get expected cash for a date
  app.get("/api/day-closing/:date/expected-cash", requireAuth, async (req, res) => {
    try {
      const businessDate = req.params.date;
      const dayClosing = await storage.getDayClosing(businessDate);
      
      if (!dayClosing) {
        return res.status(404).json({ error: "Day not found" });
      }
      
      const cashBreakdown = await storage.computeExpectedCashWithBreakdown(
        businessDate, 
        dayClosing.openingCash || "0"
      );
      
      res.json(cashBreakdown);
    } catch (error) {
      console.error("Error computing expected cash:", error);
      res.status(500).json({ error: "Failed to compute expected cash" });
    }
  });

  // ========== ACTIVITY LOGS (Enhanced) ==========
  
  // Get activity logs with filters
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session.userId;
      const currentUserRole = req.session.userRole;
      const isOwnerOrAdmin = currentUserRole === "owner" || currentUserRole === "admin";
      
      const filters: {
        userId?: string;
        entityType?: string;
        action?: string;
        from?: Date;
        to?: Date;
      } = {};
      
      // Non-owners can only see their own logs
      if (!isOwnerOrAdmin) {
        filters.userId = currentUserId;
      } else if (req.query.userId) {
        filters.userId = req.query.userId as string;
      }
      
      if (req.query.entityType) {
        filters.entityType = req.query.entityType as string;
      }
      if (req.query.action) {
        filters.action = req.query.action as string;
      }
      if (req.query.from) {
        filters.from = new Date(req.query.from as string);
      }
      if (req.query.to) {
        filters.to = new Date(req.query.to as string);
      }
      
      const logs = await storage.getActivityLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // ========== PETTY CASH / EXPENSES ==========
  
  // Get expenses with optional filters
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const filters: { from?: string; to?: string; category?: string } = {};
      if (req.query.from) filters.from = req.query.from as string;
      if (req.query.to) filters.to = req.query.to as string;
      if (req.query.category) filters.category = req.query.category as string;
      
      const expenses = await storage.getPettyCashExpenses(filters);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });
  
  // Get expense by ID
  app.get("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expense = await storage.getPettyCashExpense(parseInt(req.params.id));
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });
  
  // Create new expense
  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const data = insertPettyCashExpenseSchema.parse({
        ...req.body,
        createdByUserId: req.session.userId,
        createdByUserName: user?.name || user?.username
      });
      
      const expense = await storage.createPettyCashExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });
  
  // Update expense
  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expense = await storage.updatePettyCashExpense(parseInt(req.params.id), req.body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });
  
  // Delete expense
  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deletePettyCashExpense(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });
  
  // Get daily expense summary
  app.get("/api/expenses/summary/:date", requireAuth, async (req, res) => {
    try {
      const summary = await storage.getPettyCashSummary(req.params.date);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching expense summary:", error);
      res.status(500).json({ error: "Failed to fetch expense summary" });
    }
  });

  // ========== APPROVAL REQUESTS ==========
  
  // Get approval requests with optional filters
  app.get("/api/approvals", requireAuth, async (req, res) => {
    try {
      const filters: { status?: string; type?: string; from?: Date; to?: Date } = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.type) filters.type = req.query.type as string;
      if (req.query.from) filters.from = new Date(req.query.from as string);
      if (req.query.to) filters.to = new Date(req.query.to as string);
      
      const requests = await storage.getApprovalRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      res.status(500).json({ error: "Failed to fetch approval requests" });
    }
  });
  
  // Get approval request by ID
  app.get("/api/approvals/:id", requireAuth, async (req, res) => {
    try {
      const request = await storage.getApprovalRequest(parseInt(req.params.id));
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching approval request:", error);
      res.status(500).json({ error: "Failed to fetch approval request" });
    }
  });
  
  // Create approval request
  app.post("/api/approvals", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const data = insertApprovalRequestSchema.parse({
        ...req.body,
        requestedByUserId: req.session.userId,
        requestedByUserName: user?.name || user?.username
      });
      
      const request = await storage.createApprovalRequest(data);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating approval request:", error);
      res.status(500).json({ error: "Failed to create approval request" });
    }
  });
  
  // Approve request (owner/admin only)
  app.post("/api/approvals/:id/approve", requireRole("owner", "admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const request = await storage.approveRequest(
        parseInt(req.params.id),
        req.session.userId!,
        user?.name || user?.username || "Unknown",
        req.body.notes
      );
      
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });
  
  // Reject request (owner/admin only)
  app.post("/api/approvals/:id/reject", requireRole("owner", "admin"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const request = await storage.rejectRequest(
        parseInt(req.params.id),
        req.session.userId!,
        user?.name || user?.username || "Unknown",
        req.body.notes
      );
      
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ error: "Failed to reject request" });
    }
  });

  // ========== STOCK ADJUSTMENTS ==========
  
  // Get stock adjustments with optional filters
  app.get("/api/stock-adjustments", requireAuth, async (req, res) => {
    try {
      const filters: { medicineId?: number; reasonCode?: string; from?: Date; to?: Date } = {};
      if (req.query.medicineId) filters.medicineId = parseInt(req.query.medicineId as string);
      if (req.query.reasonCode) filters.reasonCode = req.query.reasonCode as string;
      if (req.query.from) filters.from = new Date(req.query.from as string);
      if (req.query.to) filters.to = new Date(req.query.to as string);
      
      const adjustments = await storage.getStockAdjustments(filters);
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching stock adjustments:", error);
      res.status(500).json({ error: "Failed to fetch stock adjustments" });
    }
  });
  
  // Get stock adjustment by ID
  app.get("/api/stock-adjustments/:id", requireAuth, async (req, res) => {
    try {
      const adjustment = await storage.getStockAdjustment(parseInt(req.params.id));
      if (!adjustment) {
        return res.status(404).json({ error: "Stock adjustment not found" });
      }
      res.json(adjustment);
    } catch (error) {
      console.error("Error fetching stock adjustment:", error);
      res.status(500).json({ error: "Failed to fetch stock adjustment" });
    }
  });
  
  // Create stock adjustment
  app.post("/api/stock-adjustments", requireRole("owner", "admin", "pharmacist"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      // Get medicine details
      const medicine = await storage.getMedicine(req.body.medicineId);
      if (!medicine) {
        return res.status(404).json({ error: "Medicine not found" });
      }
      
      const data = insertStockAdjustmentSchema.parse({
        ...req.body,
        medicineName: medicine.name,
        batchNumber: req.body.batchNumber || medicine.batchNumber,
        createdByUserId: req.session.userId,
        createdByUserName: user?.name || user?.username
      });
      
      const adjustment = await storage.createStockAdjustment(data);
      res.status(201).json(adjustment);
    } catch (error) {
      console.error("Error creating stock adjustment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create stock adjustment";
      if (errorMessage.includes("Insufficient stock")) {
        res.status(400).json({ error: errorMessage });
      } else {
        res.status(500).json({ error: "Failed to create stock adjustment" });
      }
    }
  });

  return httpServer;
}
