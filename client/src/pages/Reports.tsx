import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CreditCard,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Crown,
  Printer
} from "lucide-react";
import { useState } from "react";
import { usePlan } from "@/lib/planContext";
import { useToast } from "@/hooks/use-toast";
import { formatAppDate, localDateKey, parseServerDate } from "@/lib/dateTime";
import type { Sale, Medicine, Customer } from "@shared/schema";

export default function Reports() {
  const { isPro } = usePlan();
  const { toast } = useToast();
  
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [fromDate, setFromDate] = useState(localDateKey(thirtyDaysAgo));
  const [toDate, setToDate] = useState(localDateKey(today));

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    queryFn: async () => {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const res = await fetch("/api/medicines");
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const todayStr = localDateKey(today);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todaySales = sales.filter(s => {
    const saleDate = localDateKey(s.createdAt);
    return saleDate === todayStr;
  });

  const weekSales = sales.filter(s => parseServerDate(s.createdAt) >= weekAgo);

  const filteredSales = sales.filter(s => {
    const saleDate = localDateKey(s.createdAt);
    return saleDate >= fromDate && saleDate <= toDate;
  });

  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const weekTotal = weekSales.reduce((sum, s) => sum + Number(s.total), 0);
  const filteredTotal = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);

  const isNearExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths && expiry > new Date();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) <= new Date();
  };

  const expiringMedicines = medicines.filter(m => isNearExpiry(m.expiryDate) && !isExpired(m.expiryDate));
  const expiredMedicines = medicines.filter(m => isExpired(m.expiryDate));
  const lowStockMedicines = medicines.filter(m => m.status === "Low Stock" || m.status === "Out of Stock");
  const customersWithDue = customers.filter(c => Number(c.outstandingBalance || 0) > 0);

  const totalDue = customersWithDue.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);

  const exportSalesCSV = () => {
    if (!isPro) {
      toast({ title: "PRO feature", description: "Upgrade to PRO to export reports", variant: "destructive" });
      return;
    }
    const headers = ["Invoice No", "Date", "Customer", "Subtotal", "Tax", "Total", "Payment Method"];
    const rows = filteredSales.map(s => [
      s.invoiceNo || `INV-${String(s.id).padStart(4, '0')}`,
      formatAppDate(s.createdAt, "dd/MM/yyyy"),
      s.customerName,
      Number(s.subtotal).toFixed(2),
      Number(s.tax).toFixed(2),
      Number(s.total).toFixed(2),
      s.paymentMethod
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFileLocal(csv, `sales_report_${fromDate}_to_${toDate}.csv`, "text/csv");
    toast({ title: "Sales report exported" });
  };

  const exportExpiryCSV = () => {
    if (!isPro) {
      toast({ title: "PRO feature", description: "Upgrade to PRO to export reports", variant: "destructive" });
      return;
    }
    const headers = ["Medicine", "Manufacturer", "Batch", "Expiry Date", "Quantity", "Value", "Status"];
    const data = [...expiredMedicines, ...expiringMedicines];
    const rows = data.map(m => [
      m.name,
      m.manufacturer,
      m.batchNumber,
      m.expiryDate,
      m.quantity,
      (Number(m.price) * m.quantity).toFixed(2),
      isExpired(m.expiryDate) ? "Expired" : "Expiring Soon"
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFileLocal(csv, `expiry_report_${todayStr}.csv`, "text/csv");
    toast({ title: "Expiry report exported" });
  };

  const exportStockCSV = () => {
    if (!isPro) {
      toast({ title: "PRO feature", description: "Upgrade to PRO to export reports", variant: "destructive" });
      return;
    }
    const headers = ["Medicine", "Manufacturer", "Category", "Current Stock", "Reorder Level", "Status"];
    const rows = lowStockMedicines.map(m => [
      m.name,
      m.manufacturer,
      m.category,
      m.quantity,
      m.reorderLevel,
      m.status
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFileLocal(csv, `stock_report_${todayStr}.csv`, "text/csv");
    toast({ title: "Stock report exported" });
  };

  const exportCreditCSV = () => {
    if (!isPro) {
      toast({ title: "PRO feature", description: "Upgrade to PRO to export reports", variant: "destructive" });
      return;
    }
    const headers = ["Customer", "Phone", "Credit Limit", "Outstanding", "Available"];
    const rows = customersWithDue.map(c => {
      const limit = Number(c.creditLimit || 0);
      const outstanding = Number(c.outstandingBalance || 0);
      const available = Math.max(0, limit - outstanding);
      return [
        c.name,
        c.phone || "-",
        limit.toFixed(2),
        outstanding.toFixed(2),
        available.toFixed(2)
      ];
    });
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    downloadFileLocal(csv, `credit_due_report_${todayStr}.csv`, "text/csv");
    toast({ title: "Credit due report exported" });
  };

  const downloadFileLocal = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printReport = (title: string, headers: string[], rows: string[][], subtitle?: string) => {
    if (!isPro) {
      toast({ title: "PRO feature", description: "Upgrade to PRO to print reports", variant: "destructive" });
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          @media print {
            body { padding: 10px; }
            h1 { font-size: 18px; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, i) => 
              `<td${i >= headers.length - 3 && headers[i]?.includes('₹') || headers[i]?.includes('Total') || headers[i]?.includes('Subtotal') ? ' class="text-right"' : ''}>${cell}</td>`
            ).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const printSalesReport = () => {
    const headers = ["Invoice No", "Date", "Customer", "Subtotal", "Tax", "Total", "Payment"];
    const rows = filteredSales.map(s => [
      s.invoiceNo || `INV-${String(s.id).padStart(4, '0')}`,
      formatAppDate(s.createdAt, "dd/MM/yyyy"),
      s.customerName,
      `₹${Number(s.subtotal).toFixed(2)}`,
      `₹${Number(s.tax).toFixed(2)}`,
      `₹${Number(s.total).toFixed(2)}`,
      s.paymentMethod
    ]);
    printReport("Sales Report", headers, rows, `${fromDate} to ${toDate} | Total: ₹${filteredTotal.toFixed(2)} | ${filteredSales.length} invoices`);
  };

  const printExpiryReport = () => {
    const headers = ["Medicine", "Batch", "Expiry Date", "Quantity", "Status"];
    const allExpiry = [...expiringMedicines.map(m => ({ ...m, expStatus: "Near Expiry" })), 
                       ...expiredMedicines.map(m => ({ ...m, expStatus: "Expired" }))];
    const rows = allExpiry.map(m => [m.name, m.batchNumber, m.expiryDate, String(m.quantity), m.expStatus]);
    printReport("Expiry Report", headers, rows, `${expiringMedicines.length} near expiry | ${expiredMedicines.length} expired`);
  };

  const printStockReport = () => {
    const headers = ["Medicine", "Manufacturer", "Category", "Quantity", "Reorder Level", "Status"];
    const rows = lowStockMedicines.map(m => [m.name, m.manufacturer, m.category, String(m.quantity), String(m.reorderLevel), m.status]);
    printReport("Stock Report", headers, rows, `${lowStockMedicines.length} items need attention`);
  };

  const printCreditReport = () => {
    const headers = ["Customer", "Phone", "Credit Limit", "Outstanding", "Available"];
    const rows = customersWithDue.map(c => {
      const limit = Number(c.creditLimit || 0);
      const outstanding = Number(c.outstandingBalance || 0);
      const available = Math.max(0, limit - outstanding);
      return [c.name, c.phone || "-", `₹${limit.toFixed(2)}`, `₹${outstanding.toFixed(2)}`, `₹${available.toFixed(2)}`];
    });
    printReport("Credit Due Report", headers, rows, `Total Due: ₹${totalDue.toFixed(2)} | ${customersWithDue.length} customers`);
  };

  return (
    <AppLayout title="Reports">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-today-sales">
                  ₹{todayTotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{todaySales.length} invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-week-sales">
                  ₹{weekTotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{weekSales.length} invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-expiring">
                  {expiringMedicines.length}
                </p>
                <p className="text-xs text-muted-foreground">items within 3 months</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credit Due</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-credit-due">
                  ₹{totalDue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{customersWithDue.length} customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales" data-testid="tab-sales">
            <BarChart3 className="h-4 w-4 mr-2" /> Sales Report
          </TabsTrigger>
          <TabsTrigger value="expiry" data-testid="tab-expiry">
            <AlertTriangle className="h-4 w-4 mr-2" /> Expiry Report
          </TabsTrigger>
          <TabsTrigger value="stock" data-testid="tab-stock">
            <Package className="h-4 w-4 mr-2" /> Stock Report
          </TabsTrigger>
          <TabsTrigger value="credit" data-testid="tab-credit">
            <CreditCard className="h-4 w-4 mr-2" /> Credit Due
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Sales Report
                    {isPro && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        PRO
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {filteredSales.length} sales ({fromDate} to {toDate}) • Total: ₹{filteredTotal.toFixed(2)}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="from-date" className="text-sm">From</Label>
                    <Input 
                      id="from-date"
                      type="date" 
                      value={fromDate} 
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-36"
                      data-testid="input-from-date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="to-date" className="text-sm">To</Label>
                    <Input 
                      id="to-date"
                      type="date" 
                      value={toDate} 
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-36"
                      data-testid="input-to-date"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportSalesCSV}
                    disabled={!isPro}
                    data-testid="button-export-sales-csv"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    CSV
                    {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={printSalesReport}
                    disabled={!isPro}
                    data-testid="button-print-sales"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    PDF
                    {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sales recorded in selected period.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.slice(0, 100).map((sale) => (
                        <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                          <TableCell className="font-mono text-xs">
                            {sale.invoiceNo || `INV-${String(sale.id).padStart(4, '0')}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatAppDate(sale.createdAt, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>{sale.customerName}</TableCell>
                          <TableCell className="text-right">₹{Number(sale.subtotal).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{Number(sale.tax).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{Number(sale.total).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                              {sale.paymentMethod.toUpperCase()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Expiry Report</CardTitle>
                  <CardDescription>Medicines expiring within 3 months or already expired</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportExpiryCSV}
                  disabled={!isPro}
                  data-testid="button-export-expiry-csv"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  CSV
                  {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={printExpiryReport}
                  disabled={!isPro}
                  data-testid="button-print-expiry"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  PDF
                  {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expiringMedicines.length === 0 && expiredMedicines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No medicines expiring soon.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...expiredMedicines, ...expiringMedicines].map((med) => (
                        <TableRow key={med.id} data-testid={`row-expiry-${med.id}`}>
                          <TableCell className="font-medium">
                            <div>{med.name}</div>
                            <div className="text-xs text-muted-foreground">{med.manufacturer}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{med.batchNumber}</TableCell>
                          <TableCell className={isExpired(med.expiryDate) ? "text-red-600 font-medium" : "text-orange-600 font-medium"}>
                            {med.expiryDate}
                          </TableCell>
                          <TableCell className="text-right">{med.quantity}</TableCell>
                          <TableCell className="text-right">
                            ₹{(Number(med.price) * med.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isExpired(med.expiryDate) 
                                ? "bg-red-100 text-red-700" 
                                : "bg-orange-100 text-orange-700"
                            }`}>
                              {isExpired(med.expiryDate) ? "Expired" : "Expiring Soon"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Stock Report</CardTitle>
                  <CardDescription>Low stock and out of stock items</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportStockCSV}
                  disabled={!isPro}
                  data-testid="button-export-stock-csv"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  CSV
                  {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={printStockReport}
                  disabled={!isPro}
                  data-testid="button-print-stock"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  PDF
                  {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lowStockMedicines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">All items are well stocked.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockMedicines.map((med) => (
                        <TableRow key={med.id} data-testid={`row-stock-${med.id}`}>
                          <TableCell className="font-medium">
                            <div>{med.name}</div>
                            <div className="text-xs text-muted-foreground">{med.manufacturer}</div>
                          </TableCell>
                          <TableCell>{med.category}</TableCell>
                          <TableCell className="text-right font-medium">{med.quantity}</TableCell>
                          <TableCell className="text-right">{med.reorderLevel}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              med.status === "Out of Stock" 
                                ? "bg-red-100 text-red-700" 
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {med.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Credit Due Report</CardTitle>
                  <CardDescription>Customers with outstanding balances</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportCreditCSV}
                  disabled={!isPro}
                  data-testid="button-export-credit-csv"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  CSV
                  {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={printCreditReport}
                  disabled={!isPro}
                  data-testid="button-print-credit"
                >
                  <Printer className="h-4 w-4 mr-1" />
                  PDF
                  {!isPro && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customersWithDue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No outstanding credit dues.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersWithDue.map((customer) => {
                        const limit = Number(customer.creditLimit || 0);
                        const outstanding = Number(customer.outstandingBalance || 0);
                        const available = Math.max(0, limit - outstanding);
                        return (
                          <TableRow key={customer.id} data-testid={`row-credit-${customer.id}`}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.phone || "-"}</TableCell>
                            <TableCell className="text-right">₹{limit.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              ₹{outstanding.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              ₹{available.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-800">Total Outstanding Amount</span>
                  <span className="text-2xl font-bold text-red-600">₹{totalDue.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
