import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  const sampleMedicines = [
    {
      name: "Amoxicillin 500mg",
      batchNumber: "AMX-2024-001",
      manufacturer: "Pfizer",
      expiryDate: "2025-12-31",
      quantity: 1250,
      price: "12.50",
      category: "Antibiotics",
      status: "In Stock",
    },
    {
      name: "Paracetamol 500mg",
      batchNumber: "PCM-2024-089",
      manufacturer: "GSK",
      expiryDate: "2026-05-15",
      quantity: 5000,
      price: "3.00",
      category: "Analgesics",
      status: "In Stock",
    },
    {
      name: "Ibuprofen 400mg",
      batchNumber: "IBU-2023-112",
      manufacturer: "Abbott",
      expiryDate: "2024-11-20",
      quantity: 45,
      price: "5.50",
      category: "Analgesics",
      status: "Low Stock",
    },
    {
      name: "Cetirizine 10mg",
      batchNumber: "CTZ-2024-045",
      manufacturer: "Cipla",
      expiryDate: "2025-08-10",
      quantity: 800,
      price: "4.20",
      category: "Antihistamines",
      status: "In Stock",
    },
    {
      name: "Metformin 500mg",
      batchNumber: "MET-2024-022",
      manufacturer: "Sun Pharma",
      expiryDate: "2026-01-30",
      quantity: 0,
      price: "8.00",
      category: "Antidiabetic",
      status: "Out of Stock",
    },
    {
      name: "Omeprazole 20mg",
      batchNumber: "OMP-2024-331",
      manufacturer: "AstraZeneca",
      expiryDate: "2025-09-15",
      quantity: 320,
      price: "15.00",
      category: "Gastrointestinal",
      status: "In Stock",
    },
    {
      name: "Atorvastatin 10mg",
      batchNumber: "ATV-2024-101",
      manufacturer: "Pfizer",
      expiryDate: "2025-11-01",
      quantity: 15,
      price: "18.50",
      category: "Cardiovascular",
      status: "Low Stock",
    },
  ];

  for (const med of sampleMedicines) {
    await storage.createMedicine(med);
  }

  const doctors = [
    { name: "Dr. Sekar", specialization: "General Physician", phone: "+91 9876543210" },
    { name: "Dr. Priya", specialization: "Pediatrician", phone: "+91 9876543211" },
    { name: "Dr. Kumar", specialization: "Cardiologist", phone: "+91 9876543212" },
  ];

  for (const doc of doctors) {
    await storage.createDoctor(doc);
  }

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
