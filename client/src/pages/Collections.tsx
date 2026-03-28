import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSpreadsheet, FileText, CreditCard, Banknote, Wallet, QrCode, Printer, Calendar, CalendarDays, CalendarRange, Users, Package, RotateCcw, Search, Share2 } from "lucide-react";
import { usePlan } from "@/lib/planContext";
import { format } from "date-fns";
import { PrintableInvoice } from "@/components/PrintableInvoice";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { generateSaleInvoicePdfBlob } from "@/lib/pdfUtils";
import { endOfLocalDay, formatAppDate, formatAppDateTime, parseServerDate, startOfLocalDay } from "@/lib/dateTime";
import type { Sale as SaleType, SaleItem } from "@shared/schema";

interface Sale {
  id: number;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  customerGstin: string | null;
  doctorName: string | null;
  subtotal: string;
  discount: string;
  cgst: string;
  sgst: string;
  tax: string;
  total: string;
  roundOff: string;
  paymentMethod: string;
  receivedAmount: string;
  changeAmount: string;
  createdAt: string;
  userId: string | null;
}

interface SalesReturn {
  id: number;
  saleId: number;
  invoiceNo: string;
  returnDate: string;
  totalRefund: string;
  refundMode: string;
  reason: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface ItemCollection {
  name: string;
  qty: number;
  total: number;
}

interface MonthlyData {
  month: string;
  year: number;
  monthName: string;
  cash: number;
  card: number;
  upi: number;
  credit: number;
  total: number;
}

interface QuarterlyData {
  quarter: string;
  year: number;
  cash: number;
  card: number;
  upi: number;
  credit: number;
  total: number;
}

interface YearlyData {
  year: number;
  cash: number;
  card: number;
  upi: number;
  credit: number;
  total: number;
}

export default function Collections() {
  const { isPro } = usePlan();
  const { settings: appSettings } = useSettings();
  const { toast } = useToast();
  const today = new Date();
  const currentYear = today.getFullYear();
  const [activeTab, setActiveTab] = useState("daily");
  const [dateFrom, setDateFrom] = useState(format(today, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [searchTerm, setSearchTerm] = useState("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [printItems, setPrintItems] = useState<SaleItem[]>([]);

  const handleReprint = async (sale: Sale) => {
    try {
      const res = await fetch(`/api/sales/${sale.id}/items`);
      if (res.ok) {
        const items = await res.json();
        setPrintSale(sale);
        setPrintItems(items);
        setPrintDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch sale items:", error);
    }
  };

  const executePrint = () => {
    const printContent = document.getElementById("reprint-invoice-content");
    if (!printContent) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid black; padding: 8px; }
            th { background-color: #f3f4f6; text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            @media print {
              body { margin: 0; padding: 10mm; }
              @page { margin: 10mm; size: A4; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: salesReturns = [] } = useQuery<SalesReturn[]>({
    queryKey: ["/api/sales-returns"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: monthlyData = [], isLoading: monthlyLoading } = useQuery<MonthlyData[]>({
    queryKey: ["/api/reports/collections/monthly", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/reports/collections/monthly?year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch monthly data");
      return res.json();
    },
    enabled: activeTab === "monthly",
  });

  const { data: quarterlyData = [], isLoading: quarterlyLoading } = useQuery<QuarterlyData[]>({
    queryKey: ["/api/reports/collections/quarterly", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/reports/collections/quarterly?year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch quarterly data");
      return res.json();
    },
    enabled: activeTab === "quarterly",
  });

  const { data: yearlyData = [], isLoading: yearlyLoading } = useQuery<YearlyData[]>({
    queryKey: ["/api/reports/collections/yearly"],
    queryFn: async () => {
      const res = await fetch("/api/reports/collections/yearly");
      if (!res.ok) throw new Error("Failed to fetch yearly data");
      return res.json();
    },
    enabled: activeTab === "yearly",
  });

  if (!isPro) {
    return (
      <AppLayout title="Collections">
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PRO Feature</h3>
              <p className="text-muted-foreground">
                Collections module is available in the PRO plan.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const filterByDateRange = <T extends { createdAt?: string; returnDate?: string }>(items: T[]) => {
    return items.filter((item) => {
      const itemDate = parseServerDate(item.createdAt || item.returnDate || "");
      if (isNaN(itemDate.getTime())) return false;
      
      // Guard against empty/invalid date strings
      if (!dateFrom || !dateTo) return true;
      
      const from = startOfLocalDay(dateFrom);
      const to = endOfLocalDay(dateTo);
      
      // Check if parsed dates are valid
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return true;
      
      return itemDate >= from && itemDate <= to;
    });
  };

  const filteredSales = filterByDateRange(sales).filter((sale) => {
    const paymentMatch = paymentFilter === "all" || sale.paymentMethod.toLowerCase() === paymentFilter.toLowerCase();
    const searchMatch = !searchTerm || 
      sale.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return paymentMatch && searchMatch;
  });

  const filteredReturns = filterByDateRange(salesReturns).filter((ret) => {
    return !searchTerm || ret.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const safeParseFloat = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  };

  const totalRefundAmount = filteredReturns.reduce((s, r) => s + safeParseFloat(r.totalRefund), 0);
  const formattedTotalRefund = `${totalRefundAmount > 0 ? "-" : ""}₹${totalRefundAmount.toFixed(2)}`;

  const paymentTotals = filteredSales.reduce((acc, sale) => {
    const method = sale.paymentMethod || 'Unknown';
    acc[method] = (acc[method] || 0) + safeParseFloat(sale.total);
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(paymentTotals).reduce((a, b) => a + b, 0);

  const staffCollections = filteredSales.reduce((acc, sale) => {
    const staffId = sale.userId || 0;
    const staff = users.find(u => u.id === staffId);
    const staffName = staff?.name || staff?.username || "Unknown";
    
    if (!acc[staffName]) {
      acc[staffName] = { name: staffName, cash: 0, card: 0, upi: 0, credit: 0, total: 0, count: 0 };
    }
    
    const amount = safeParseFloat(sale.total);
    const method = sale.paymentMethod?.toLowerCase() || 'unknown';
    acc[staffName].total += amount;
    acc[staffName].count += 1;
    if (method === 'cash') acc[staffName].cash += amount;
    else if (method === 'card') acc[staffName].card += amount;
    else if (method === 'upi') acc[staffName].upi += amount;
    else if (method === 'credit') acc[staffName].credit += amount;
    
    return acc;
  }, {} as Record<string, { name: string; cash: number; card: number; upi: number; credit: number; total: number; count: number }>);

  const staffCollectionsList = Object.values(staffCollections).filter(s => 
    !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { data: itemCollections = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery<ItemCollection[]>({
    queryKey: ["/api/reports/collections/by-item", dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/reports/collections/by-item?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error("Failed to fetch item collections");
      return res.json();
    },
    enabled: activeTab === "by-item",
  });

  const itemCollectionsList = itemCollections.filter(i => 
    !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const exportToPDF = (title: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1e40af; color: white; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Period: ${format(new Date(dateFrom), "dd MMM yyyy")} - ${format(new Date(dateTo), "dd MMM yyyy")}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash": return <Banknote className="w-4 h-4" />;
      case "card": return <CreditCard className="w-4 h-4" />;
      case "upi": return <QrCode className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const DateFilters = ({ showPayment = true, showSearch = true }: { showPayment?: boolean; showSearch?: boolean }) => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
      {showSearch && (
        <div>
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>
      )}
      <div>
        <Label>From Date</Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          data-testid="input-date-from"
        />
      </div>
      <div>
        <Label>To Date</Label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          data-testid="input-date-to"
        />
      </div>
      {showPayment && (
        <div>
          <Label>Payment Mode</Label>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger data-testid="select-payment-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout title="Collections">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchTerm(""); }}>
          <TabsList className="grid w-full grid-cols-7 max-w-4xl">
            <TabsTrigger value="daily" data-testid="tab-daily">
              <Calendar className="w-4 h-4 mr-1" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="refunds" data-testid="tab-refunds">
              <RotateCcw className="w-4 h-4 mr-1" />
              Refunds
            </TabsTrigger>
            <TabsTrigger value="by-staff" data-testid="tab-by-staff">
              <Users className="w-4 h-4 mr-1" />
              By Staff
            </TabsTrigger>
            <TabsTrigger value="by-item" data-testid="tab-by-item">
              <Package className="w-4 h-4 mr-1" />
              By Item
            </TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">
              <CalendarDays className="w-4 h-4 mr-1" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="quarterly" data-testid="tab-quarterly">
              <CalendarRange className="w-4 h-4 mr-1" />
              Quarterly
            </TabsTrigger>
            <TabsTrigger value="yearly" data-testid="tab-yearly">
              <CalendarRange className="w-4 h-4 mr-1" />
              Yearly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Daily Collections
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => exportToCSV(
                        `collections_daily_${dateFrom}_to_${dateTo}.csv`,
                        ["Invoice No", "Date", "Customer", "Payment Method", "Amount"],
                        filteredSales.map(s => [s.invoiceNo || `INV-${s.id}`, formatAppDateTime(s.createdAt, "dd/MM/yyyy HH:mm"), s.customerName, s.paymentMethod, s.total])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        "Daily Collections Report",
                        ["Invoice No", "Date", "Customer", "Payment", "Amount"],
                        filteredSales.map(s => [s.invoiceNo || `INV-${s.id}`, formatAppDate(s.createdAt, "dd/MM/yyyy"), s.customerName, s.paymentMethod, `₹${safeParseFloat(s.total).toFixed(2)}`])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DateFilters />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(paymentTotals).map(([method, total]) => (
                    <Card key={method}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          {getPaymentIcon(method)}
                          {method}
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{total.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-primary text-primary-foreground">
                    <CardContent className="pt-4">
                      <div className="text-sm opacity-80">Gross Sales</div>
                      <p className="text-2xl font-bold mt-1">₹{grandTotal.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <RotateCcw className="w-4 h-4" />
                        Refunds
                      </div>
                      <p className="text-2xl font-bold text-red-600 mt-1" data-testid="text-daily-refunds">
                        {formattedTotalRefund}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-green-600 text-sm">Net Collection</div>
                      <p className="text-2xl font-bold text-green-700 mt-1" data-testid="text-net-collection">
                        ₹{(grandTotal - filteredReturns.reduce((s, r) => s + safeParseFloat(r.totalRefund), 0)).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {salesLoading ? (
                  <p>Loading...</p>
                ) : filteredSales.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No collections found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id} data-testid={`row-collection-${sale.id}`}>
                          <TableCell className="font-medium">{sale.invoiceNo || `INV-${sale.id}`}</TableCell>
                          <TableCell>{formatAppDateTime(sale.createdAt, "dd MMM yyyy, hh:mm a")}</TableCell>
                          <TableCell>{sale.customerName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentIcon(sale.paymentMethod)}
                              {sale.paymentMethod}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">₹{safeParseFloat(sale.total).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleReprint(sale)} data-testid={`button-reprint-${sale.id}`}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Refund List ({filteredReturns.length})
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => exportToCSV(
                        `refunds_${dateFrom}_to_${dateTo}.csv`,
                        ["Return No", "Invoice", "Date", "Refund Mode", "Amount", "Reason"],
                        filteredReturns.map(r => [`RET-${r.id}`, r.invoiceNo, formatAppDate(r.createdAt, "dd/MM/yyyy"), r.refundMode, r.totalRefund, r.reason || ""])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-refunds-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        "Refunds Report",
                        ["Return No", "Invoice", "Date", "Mode", "Amount"],
                        filteredReturns.map(r => [`RET-${r.id}`, r.invoiceNo, formatAppDate(r.createdAt, "dd/MM/yyyy"), r.refundMode, `₹${safeParseFloat(r.totalRefund).toFixed(2)}`])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-refunds-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DateFilters showPayment={false} />
                
                <div className="mb-4">
                  <Card className="bg-red-50">
                    <CardContent className="pt-4">
                      <div className="text-sm text-red-600">Total Refunds</div>
                      <p className="text-2xl font-bold text-red-700">
                        {formattedTotalRefund}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {filteredReturns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No refunds found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Return No</TableHead>
                        <TableHead>Original Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Refund Mode</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReturns.map((ret) => (
                        <TableRow key={ret.id} data-testid={`row-refund-${ret.id}`}>
                          <TableCell className="font-medium">RET-{ret.id}</TableCell>
                          <TableCell>{ret.invoiceNo}</TableCell>
                          <TableCell>{formatAppDateTime(ret.createdAt, "dd MMM yyyy, hh:mm a")}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              {ret.refundMode}
                            </span>
                          </TableCell>
                          <TableCell>{ret.reason || "-"}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            -₹{safeParseFloat(ret.totalRefund).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Collection by Staff
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => exportToCSV(
                        `collections_by_staff_${dateFrom}_to_${dateTo}.csv`,
                        ["Staff Name", "Invoices", "Cash", "Card", "UPI", "Credit", "Total"],
                        staffCollectionsList.map(s => [s.name, s.count.toString(), s.cash.toFixed(2), s.card.toFixed(2), s.upi.toFixed(2), s.credit.toFixed(2), s.total.toFixed(2)])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-staff-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        "Collection by Staff Report",
                        ["Staff Name", "Invoices", "Cash", "Card", "UPI", "Credit", "Total"],
                        staffCollectionsList.map(s => [s.name, s.count.toString(), `₹${s.cash.toFixed(2)}`, `₹${s.card.toFixed(2)}`, `₹${s.upi.toFixed(2)}`, `₹${s.credit.toFixed(2)}`, `₹${s.total.toFixed(2)}`])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-staff-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DateFilters showPayment={false} />
                
                {staffCollectionsList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No staff collections found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">UPI</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffCollectionsList.map((staff) => (
                        <TableRow key={staff.name} data-testid={`row-staff-${staff.name}`}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell className="text-right">{staff.count}</TableCell>
                          <TableCell className="text-right">₹{staff.cash.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{staff.card.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{staff.upi.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{staff.credit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{staff.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{staffCollectionsList.reduce((s, st) => s + st.count, 0)}</TableCell>
                        <TableCell className="text-right">₹{staffCollectionsList.reduce((s, st) => s + st.cash, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{staffCollectionsList.reduce((s, st) => s + st.card, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{staffCollectionsList.reduce((s, st) => s + st.upi, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{staffCollectionsList.reduce((s, st) => s + st.credit, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{staffCollectionsList.reduce((s, st) => s + st.total, 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-item" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Collection by Item
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={() => refetchItems()} variant="outline" size="sm" data-testid="button-refresh-items">
                      Refresh
                    </Button>
                    <Button 
                      onClick={() => exportToCSV(
                        `collections_by_item_${dateFrom}_to_${dateTo}.csv`,
                        ["Item Name", "Quantity Sold", "Total Amount"],
                        itemCollectionsList.map(i => [i.name, i.qty.toString(), i.total.toFixed(2)])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-item-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        "Collection by Item Report",
                        ["Item Name", "Qty Sold", "Total Amount"],
                        itemCollectionsList.map(i => [i.name, i.qty.toString(), `₹${i.total.toFixed(2)}`])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-item-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DateFilters showPayment={false} />
                
                {itemsLoading ? (
                  <p className="text-center py-8">Loading items...</p>
                ) : itemCollectionsList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No items sold in the selected date range</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Quantity Sold</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemCollectionsList.map((item) => (
                        <TableRow key={item.name} data-testid={`row-item-${item.name}`}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right font-semibold">₹{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{itemCollectionsList.reduce((s, i) => s + i.qty, 0)}</TableCell>
                        <TableCell className="text-right">₹{itemCollectionsList.reduce((s, i) => s + i.total, 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Monthly Collections - {selectedYear}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-32" data-testid="select-year-monthly">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => exportToCSV(
                        `collections_monthly_${selectedYear}.csv`,
                        ["Month", "Cash", "Card", "UPI", "Credit", "Total"],
                        monthlyData.map(d => [d.monthName, d.cash.toFixed(2), d.card.toFixed(2), d.upi.toFixed(2), d.credit.toFixed(2), d.total.toFixed(2)])
                      )}
                      variant="outline" size="sm" data-testid="button-export-monthly-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        `Monthly Collections - ${selectedYear}`,
                        ["Month", "Cash", "Card", "UPI", "Credit", "Total"],
                        monthlyData.map(d => [d.monthName, `₹${d.cash.toFixed(2)}`, `₹${d.card.toFixed(2)}`, `₹${d.upi.toFixed(2)}`, `₹${d.credit.toFixed(2)}`, `₹${d.total.toFixed(2)}`])
                      )}
                      variant="outline" size="sm" data-testid="button-export-monthly-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyLoading ? (
                  <p>Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">UPI</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((row) => (
                        <TableRow key={row.month} data-testid={`row-monthly-${row.month}`}>
                          <TableCell className="font-medium">{row.monthName}</TableCell>
                          <TableCell className="text-right">₹{row.cash.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.card.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.upi.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.credit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{row.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Year Total</TableCell>
                        <TableCell className="text-right">₹{monthlyData.reduce((s, d) => s + d.cash, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{monthlyData.reduce((s, d) => s + d.card, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{monthlyData.reduce((s, d) => s + d.upi, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{monthlyData.reduce((s, d) => s + d.credit, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{monthlyData.reduce((s, d) => s + d.total, 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quarterly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarRange className="w-5 h-5" />
                    Quarterly Collections - {selectedYear}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-32" data-testid="select-year-quarterly">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => exportToCSV(
                        `collections_quarterly_${selectedYear}.csv`,
                        ["Quarter", "Cash", "Card", "UPI", "Credit", "Total"],
                        quarterlyData.map(d => [d.quarter, d.cash.toFixed(2), d.card.toFixed(2), d.upi.toFixed(2), d.credit.toFixed(2), d.total.toFixed(2)])
                      )}
                      variant="outline" size="sm" data-testid="button-export-quarterly-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        `Quarterly Collections - ${selectedYear}`,
                        ["Quarter", "Cash", "Card", "UPI", "Credit", "Total"],
                        quarterlyData.map(d => [d.quarter, `₹${d.cash.toFixed(2)}`, `₹${d.card.toFixed(2)}`, `₹${d.upi.toFixed(2)}`, `₹${d.credit.toFixed(2)}`, `₹${d.total.toFixed(2)}`])
                      )}
                      variant="outline" size="sm" data-testid="button-export-quarterly-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quarterlyLoading ? (
                  <p>Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quarter</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">UPI</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quarterlyData.map((row) => (
                        <TableRow key={row.quarter} data-testid={`row-quarterly-${row.quarter}`}>
                          <TableCell className="font-medium">{row.quarter}</TableCell>
                          <TableCell className="text-right">₹{row.cash.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.card.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.upi.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.credit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{row.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Year Total</TableCell>
                        <TableCell className="text-right">₹{quarterlyData.reduce((s, d) => s + d.cash, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{quarterlyData.reduce((s, d) => s + d.card, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{quarterlyData.reduce((s, d) => s + d.upi, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{quarterlyData.reduce((s, d) => s + d.credit, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{quarterlyData.reduce((s, d) => s + d.total, 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarRange className="w-5 h-5" />
                    Yearly Collections Summary
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => exportToCSV(
                        "collections_yearly.csv",
                        ["Year", "Cash", "Card", "UPI", "Credit", "Total"],
                        yearlyData.map(d => [d.year.toString(), d.cash.toFixed(2), d.card.toFixed(2), d.upi.toFixed(2), d.credit.toFixed(2), d.total.toFixed(2)])
                      )}
                      variant="outline" size="sm" data-testid="button-export-yearly-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        "Yearly Collections Report",
                        ["Year", "Cash", "Card", "UPI", "Credit", "Total"],
                        yearlyData.map(d => [d.year.toString(), `₹${d.cash.toFixed(2)}`, `₹${d.card.toFixed(2)}`, `₹${d.upi.toFixed(2)}`, `₹${d.credit.toFixed(2)}`, `₹${d.total.toFixed(2)}`])
                      )}
                      variant="outline" size="sm" data-testid="button-export-yearly-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {yearlyLoading ? (
                  <p>Loading...</p>
                ) : yearlyData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No yearly data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">UPI</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearlyData.map((row) => (
                        <TableRow key={row.year} data-testid={`row-yearly-${row.year}`}>
                          <TableCell className="font-medium">{row.year}</TableCell>
                          <TableCell className="text-right">₹{row.cash.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.card.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.upi.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.credit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{row.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Grand Total</TableCell>
                        <TableCell className="text-right">₹{yearlyData.reduce((s, d) => s + d.cash, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{yearlyData.reduce((s, d) => s + d.card, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{yearlyData.reduce((s, d) => s + d.upi, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{yearlyData.reduce((s, d) => s + d.credit, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{yearlyData.reduce((s, d) => s + d.total, 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {printSale && (
            <div id="reprint-invoice-content">
              <PrintableInvoice 
                sale={printSale as unknown as SaleType} 
                items={printItems}
                storeInfo={{
                  name: appSettings.storeName,
                  address: appSettings.storeAddress,
                  phone: appSettings.storePhone,
                  gstin: appSettings.gstin,
                  dlNo: appSettings.dlNo,
                }}
                invoiceSettings={{
                  showMrp: appSettings.showMrp,
                  showGstBreakup: appSettings.showGstBreakup,
                  showDoctor: appSettings.showDoctor,
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Close
            </Button>
            {printSale?.customerPhone && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!printSale) return;

                  try {
                    const pdfBlob = await generateSaleInvoicePdfBlob(
                      printSale as unknown as SaleType,
                      printItems,
                      {
                        name: appSettings.storeName,
                        address: appSettings.storeAddress,
                        phone: appSettings.storePhone,
                        gstin: appSettings.gstin,
                        dlNo: appSettings.dlNo,
                      },
                      {
                        showMrp: appSettings.showMrp,
                        showGstBreakup: appSettings.showGstBreakup,
                        showDoctor: appSettings.showDoctor,
                        hideStoreGstin: true,
                      },
                    );

                    const invoiceNo = printSale.invoiceNo || `INV-${printSale.id}`;
                    const fileName = `Invoice_${invoiceNo}.pdf`;
                    const shareText = `Invoice ${invoiceNo} from ${appSettings.storeName} is ready. Please find the attached PDF.`;
                    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

                    const nav = navigator as Navigator & {
                      canShare?: (data?: ShareData) => boolean;
                    };
                    const canShareWithFile = typeof nav.share === "function"
                      && typeof nav.canShare === "function"
                      && nav.canShare({ files: [pdfFile] });

                    if (canShareWithFile) {
                      await nav.share({
                        files: [pdfFile],
                        title: `Invoice ${invoiceNo}`,
                        text: shareText,
                      });
                      toast({
                        title: "Invoice ready to share",
                        description: "Share sheet opened with PDF and message.",
                      });
                      return;
                    }

                    const blobUrl = URL.createObjectURL(pdfBlob);
                    const anchor = document.createElement("a");
                    anchor.href = blobUrl;
                    anchor.download = fileName;
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(blobUrl);

                    const phoneNumber = printSale.customerPhone?.replace(/\D/g, "");
                    if (phoneNumber) {
                      const message = encodeURIComponent(
                        `Invoice ${invoiceNo} from ${appSettings.storeName} is ready. Please find the attached PDF.`
                      );

                      const localNumber = phoneNumber.startsWith("91") ? phoneNumber : `91${phoneNumber}`;
                      const appUrl = `whatsapp://send?phone=${localNumber}&text=${message}`;
                      const webUrl = `https://wa.me/${localNumber}?text=${message}`;

                      const popup = window.open(appUrl, "_blank");
                      if (!popup) {
                        window.open(webUrl, "_blank");
                      } else {
                        setTimeout(() => {
                          try {
                            if (popup.closed) return;
                            popup.location.href = webUrl;
                          } catch {
                            window.open(webUrl, "_blank");
                          }
                        }, 1200);
                      }
                    }

                    toast({
                      title: "Invoice PDF downloaded",
                      description: "WhatsApp chat opened. Attach the downloaded PDF and tap Send.",
                    });
                  } catch {
                    toast({
                      title: "Unable to share invoice PDF",
                      description: "Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-whatsapp-share-reprint"
              >
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
            <Button onClick={executePrint} data-testid="button-print-invoice">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
