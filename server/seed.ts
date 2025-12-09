import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import { users, medicines, customers, doctors } from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed() {
  console.log("Seeding database...");

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded. Skipping...");
    await pool.end();
    return;
  }

  const password = await bcrypt.hash("password123", 10);

  await db.insert(users).values([
    { username: "owner", password, name: "Rajesh Kumar", role: "owner", email: "rajesh@aadhirai.com", phone: "9876543210" },
    { username: "pharmacist", password, name: "Dr. Priya Sharma", role: "pharmacist", email: "priya@aadhirai.com", phone: "9876543211" },
    { username: "cashier", password, name: "Anand Patel", role: "cashier", email: "anand@aadhirai.com", phone: "9876543212" },
  ]);
  console.log("Users seeded");

  await db.insert(customers).values([
    { name: "Suresh Menon", phone: "9898989898", email: "suresh@email.com", address: "123 MG Road, Chennai", creditLimit: "10000", outstandingBalance: "2500" },
    { name: "Lakshmi Devi", phone: "9797979797", email: "lakshmi@email.com", address: "45 Anna Nagar, Chennai" },
    { name: "Mohammed Ismail", phone: "9696969696", email: "ismail@email.com", address: "78 T Nagar, Chennai" },
    { name: "Radha Krishnan", phone: "9595959595", email: "radha@email.com", address: "22 Adyar, Chennai" },
    { name: "Kavitha Sundaram", phone: "9494949494", email: "kavitha@email.com", address: "56 Velachery, Chennai" },
  ]);
  console.log("Customers seeded");

  await db.insert(doctors).values([
    { name: "Dr. Venkat Raman", specialization: "General Physician", phone: "9888888888", registrationNo: "TN12345" },
    { name: "Dr. Saranya Krishnan", specialization: "Dermatologist", phone: "9777777777", registrationNo: "TN12346" },
    { name: "Dr. Arun Kumar", specialization: "Cardiologist", phone: "9666666666", registrationNo: "TN12347" },
  ]);
  console.log("Doctors seeded");

  const today = new Date();
  const nearExpiry = new Date(today);
  nearExpiry.setMonth(nearExpiry.getMonth() + 2);
  const mediumExpiry = new Date(today);
  mediumExpiry.setMonth(mediumExpiry.getMonth() + 12);
  const longExpiry = new Date(today);
  longExpiry.setMonth(longExpiry.getMonth() + 24);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  await db.insert(medicines).values([
    { name: "Paracetamol 500mg", batchNumber: "PCM001", manufacturer: "Cipla", expiryDate: formatDate(longExpiry), quantity: 500, price: "2.50", costPrice: "1.80", mrp: "3.00", gstRate: "12", hsnCode: "30049099", category: "Antipyretic", status: "In Stock", reorderLevel: 100 },
    { name: "Paracetamol 500mg", batchNumber: "PCM002", manufacturer: "Cipla", expiryDate: formatDate(nearExpiry), quantity: 50, price: "2.50", costPrice: "1.80", mrp: "3.00", gstRate: "12", hsnCode: "30049099", category: "Antipyretic", status: "Low Stock", reorderLevel: 100 },
    { name: "Amoxicillin 500mg", batchNumber: "AMX001", manufacturer: "Ranbaxy", expiryDate: formatDate(mediumExpiry), quantity: 200, price: "8.00", costPrice: "5.50", mrp: "10.00", gstRate: "12", hsnCode: "30041090", category: "Antibiotic", status: "In Stock", reorderLevel: 50 },
    { name: "Amoxicillin 500mg", batchNumber: "AMX002", manufacturer: "Ranbaxy", expiryDate: formatDate(nearExpiry), quantity: 30, price: "8.00", costPrice: "5.50", mrp: "10.00", gstRate: "12", hsnCode: "30041090", category: "Antibiotic", status: "Low Stock", reorderLevel: 50 },
    { name: "Cetirizine 10mg", batchNumber: "CTZ001", manufacturer: "Dr. Reddy's", expiryDate: formatDate(longExpiry), quantity: 300, price: "3.00", costPrice: "2.00", mrp: "4.00", gstRate: "12", hsnCode: "30049099", category: "Antihistamine", status: "In Stock", reorderLevel: 75 },
    { name: "Omeprazole 20mg", batchNumber: "OMP001", manufacturer: "Sun Pharma", expiryDate: formatDate(mediumExpiry), quantity: 150, price: "5.00", costPrice: "3.50", mrp: "6.50", gstRate: "12", hsnCode: "30049099", category: "Antacid", status: "In Stock", reorderLevel: 50 },
    { name: "Omeprazole 20mg", batchNumber: "OMP002", manufacturer: "Sun Pharma", expiryDate: formatDate(nearExpiry), quantity: 25, price: "5.00", costPrice: "3.50", mrp: "6.50", gstRate: "12", hsnCode: "30049099", category: "Antacid", status: "Low Stock", reorderLevel: 50 },
    { name: "Metformin 500mg", batchNumber: "MTF001", manufacturer: "Lupin", expiryDate: formatDate(longExpiry), quantity: 400, price: "4.00", costPrice: "2.80", mrp: "5.00", gstRate: "5", hsnCode: "30049099", category: "Antidiabetic", status: "In Stock", reorderLevel: 100 },
    { name: "Atorvastatin 10mg", batchNumber: "ATV001", manufacturer: "Zydus", expiryDate: formatDate(mediumExpiry), quantity: 180, price: "12.00", costPrice: "8.50", mrp: "15.00", gstRate: "12", hsnCode: "30049099", category: "Cardiovascular", status: "In Stock", reorderLevel: 50 },
    { name: "Azithromycin 250mg", batchNumber: "AZT001", manufacturer: "Cipla", expiryDate: formatDate(longExpiry), quantity: 100, price: "25.00", costPrice: "18.00", mrp: "30.00", gstRate: "12", hsnCode: "30041090", category: "Antibiotic", status: "In Stock", reorderLevel: 30 },
    { name: "Vitamin D3 60K IU", batchNumber: "VTD001", manufacturer: "Mankind", expiryDate: formatDate(nearExpiry), quantity: 40, price: "35.00", costPrice: "25.00", mrp: "45.00", gstRate: "18", hsnCode: "29362910", category: "Vitamin", status: "Low Stock", reorderLevel: 50 },
    { name: "Cough Syrup 100ml", batchNumber: "CGH001", manufacturer: "Himalaya", expiryDate: formatDate(mediumExpiry), quantity: 75, price: "85.00", costPrice: "60.00", mrp: "100.00", gstRate: "12", hsnCode: "30049099", category: "Cough & Cold", status: "In Stock", reorderLevel: 25 },
  ]);
  console.log("Medicines seeded");

  console.log("Seeding complete!");
  await pool.end();
}

seed().catch(console.error);
