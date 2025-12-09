export interface InventoryItem {
  id: string;
  name: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  quantity: number;
  price: number;
  category: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

export const inventoryData: InventoryItem[] = [
  {
    id: "INV-001",
    name: "Amoxicillin 500mg",
    batchNumber: "AMX-2024-001",
    manufacturer: "Pfizer",
    expiryDate: "2025-12-31",
    quantity: 1250,
    price: 12.50,
    category: "Antibiotics",
    status: "In Stock",
  },
  {
    id: "INV-002",
    name: "Paracetamol 500mg",
    batchNumber: "PCM-2024-089",
    manufacturer: "GSK",
    expiryDate: "2026-05-15",
    quantity: 5000,
    price: 3.00,
    category: "Analgesics",
    status: "In Stock",
  },
  {
    id: "INV-003",
    name: "Ibuprofen 400mg",
    batchNumber: "IBU-2023-112",
    manufacturer: "Abbott",
    expiryDate: "2024-11-20",
    quantity: 45,
    price: 5.50,
    category: "Analgesics",
    status: "Low Stock",
  },
  {
    id: "INV-004",
    name: "Cetirizine 10mg",
    batchNumber: "CTZ-2024-045",
    manufacturer: "Cipla",
    expiryDate: "2025-08-10",
    quantity: 800,
    price: 4.20,
    category: "Antihistamines",
    status: "In Stock",
  },
  {
    id: "INV-005",
    name: "Metformin 500mg",
    batchNumber: "MET-2024-022",
    manufacturer: "Sun Pharma",
    expiryDate: "2026-01-30",
    quantity: 0,
    price: 8.00,
    category: "Antidiabetic",
    status: "Out of Stock",
  },
  {
    id: "INV-006",
    name: "Omeprazole 20mg",
    batchNumber: "OMP-2024-331",
    manufacturer: "AstraZeneca",
    expiryDate: "2025-09-15",
    quantity: 320,
    price: 15.00,
    category: "Gastrointestinal",
    status: "In Stock",
  },
  {
    id: "INV-007",
    name: "Atorvastatin 10mg",
    batchNumber: "ATV-2024-101",
    manufacturer: "Pfizer",
    expiryDate: "2025-11-01",
    quantity: 15,
    price: 18.50,
    category: "Cardiovascular",
    status: "Low Stock",
  },
];

export interface SaleTransaction {
  id: string;
  customerName: string;
  date: string;
  items: number;
  total: number;
  status: "Completed" | "Pending" | "Refunded";
  paymentMethod: "Cash" | "Card" | "Insurance";
}

export const recentSales: SaleTransaction[] = [
  {
    id: "TXN-78901",
    customerName: "John Doe",
    date: "2024-10-24 10:30 AM",
    items: 3,
    total: 45.50,
    status: "Completed",
    paymentMethod: "Card",
  },
  {
    id: "TXN-78902",
    customerName: "Jane Smith",
    date: "2024-10-24 11:15 AM",
    items: 1,
    total: 12.50,
    status: "Completed",
    paymentMethod: "Cash",
  },
  {
    id: "TXN-78903",
    customerName: "Michael Johnson",
    date: "2024-10-24 11:45 AM",
    items: 5,
    total: 120.00,
    status: "Pending",
    paymentMethod: "Insurance",
  },
  {
    id: "TXN-78904",
    customerName: "Emily Davis",
    date: "2024-10-23 04:20 PM",
    items: 2,
    total: 25.00,
    status: "Refunded",
    paymentMethod: "Card",
  },
];

export const dashboardStats = [
  {
    title: "Total Revenue",
    value: "$12,345.00",
    change: "+15%",
    trend: "up",
    icon: "DollarSign",
  },
  {
    title: "Active Orders",
    value: "24",
    change: "+5%",
    trend: "up",
    icon: "ShoppingCart",
  },
  {
    title: "Low Stock Items",
    value: "12",
    change: "-2",
    trend: "down",
    icon: "AlertTriangle",
  },
  {
    title: "Customers Today",
    value: "156",
    change: "+12%",
    trend: "up",
    icon: "Users",
  },
];
