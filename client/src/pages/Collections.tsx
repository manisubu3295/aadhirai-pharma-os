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
import { FileSpreadsheet, FileText, CreditCard, Banknote, Wallet, QrCode, Printer, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { usePlan } from "@/lib/planContext";
import { format } from "date-fns";
import { PrintableInvoice } from "@/components/PrintableInvoice";
import { useSettings } from "@/contexts/SettingsContext";
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
  const today = new Date();
  const currentYear = today.getFullYear();
  const [activeTab, setActiveTab] = useState("daily");
  const [dateFrom, setDateFrom] = useState(format(today, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
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
                Collections module is available in the PRO plan. Switch to PRO to access detailed collection reports with CSV/PDF exports.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    const dateMatch = saleDate >= fromDate && saleDate <= toDate;
    const paymentMatch = paymentFilter === "all" || sale.paymentMethod.toLowerCase() === paymentFilter.toLowerCase();
    
    return dateMatch && paymentMatch;
  });

  const paymentTotals = filteredSales.reduce((acc, sale) => {
    const method = sale.paymentMethod;
    acc[method] = (acc[method] || 0) + parseFloat(sale.total);
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(paymentTotals).reduce((a, b) => a + b, 0);

  const exportDailyToCSV = () => {
    const headers = ["Invoice No", "Date", "Customer", "Payment Method", "Amount"];
    const rows = filteredSales.map(sale => [
      sale.invoiceNo || `INV-${sale.id}`,
      format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm"),
      sale.customerName,
      sale.paymentMethod,
      sale.total
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collections_daily_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  const exportMonthlyToCSV = () => {
    const headers = ["Month", "Year", "Cash", "Card", "UPI", "Credit", "Total"];
    const rows = monthlyData.map(d => [
      d.monthName,
      d.year,
      d.cash.toFixed(2),
      d.card.toFixed(2),
      d.upi.toFixed(2),
      d.credit.toFixed(2),
      d.total.toFixed(2)
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collections_monthly_${selectedYear}.csv`;
    a.click();
  };

  const exportQuarterlyToCSV = () => {
    const headers = ["Quarter", "Year", "Cash", "Card", "UPI", "Credit", "Total"];
    const rows = quarterlyData.map(d => [
      d.quarter,
      d.year,
      d.cash.toFixed(2),
      d.card.toFixed(2),
      d.upi.toFixed(2),
      d.credit.toFixed(2),
      d.total.toFixed(2)
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collections_quarterly_${selectedYear}.csv`;
    a.click();
  };

  const exportYearlyToCSV = () => {
    const headers = ["Year", "Cash", "Card", "UPI", "Credit", "Total"];
    const rows = yearlyData.map(d => [
      d.year,
      d.cash.toFixed(2),
      d.card.toFixed(2),
      d.upi.toFixed(2),
      d.credit.toFixed(2),
      d.total.toFixed(2)
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collections_yearly.csv`;
    a.click();
  };

  const exportToPDF = (title: string, headers: string[], rows: string[][], totals?: Record<string, number>) => {
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
          .totals { margin-top: 20px; background: #f5f5f5; padding: 15px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, i) => `<td class="${i >= row.length - 5 ? 'text-right' : ''}">${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${totals ? `
          <div class="totals">
            <h3>Summary by Payment Method</h3>
            ${Object.entries(totals).map(([method, total]) => 
              `<p>${method}: ₹${total.toFixed(2)}</p>`
            ).join('')}
          </div>
        ` : ''}
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

  return (
    <AppLayout title="Collections">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="daily" data-testid="tab-daily">
              <Calendar className="w-4 h-4 mr-2" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">
              <CalendarDays className="w-4 h-4 mr-2" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="quarterly" data-testid="tab-quarterly">
              <CalendarRange className="w-4 h-4 mr-2" />
              Quarterly
            </TabsTrigger>
            <TabsTrigger value="yearly" data-testid="tab-yearly">
              <CalendarRange className="w-4 h-4 mr-2" />
              Yearly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Daily Collection Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="flex items-end gap-2">
                    <Button onClick={exportDailyToCSV} variant="outline" className="flex-1" data-testid="button-export-csv">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        `Collections Report - ${format(new Date(dateFrom), "dd MMM yyyy")} to ${format(new Date(dateTo), "dd MMM yyyy")}`,
                        ["Invoice No", "Date", "Customer", "Payment Method", "Amount"],
                        filteredSales.map(sale => [
                          sale.invoiceNo || `INV-${sale.id}`,
                          format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm"),
                          sale.customerName,
                          sale.paymentMethod,
                          `₹${parseFloat(sale.total).toFixed(2)}`
                        ]),
                        paymentTotals
                      )} 
                      variant="outline" 
                      className="flex-1" 
                      data-testid="button-export-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-4">
                  <div className="text-sm opacity-80">Grand Total</div>
                  <p className="text-2xl font-bold mt-1">₹{grandTotal.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Collection Details ({filteredSales.length} transactions)</CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <p>Loading...</p>
                ) : filteredSales.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No collections found for the selected period</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id} data-testid={`row-collection-${sale.id}`}>
                          <TableCell className="font-medium">{sale.invoiceNo || `INV-${sale.id}`}</TableCell>
                          <TableCell>{format(new Date(sale.createdAt), "dd MMM yyyy, hh:mm a")}</TableCell>
                          <TableCell>{sale.customerName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentIcon(sale.paymentMethod)}
                              {sale.paymentMethod}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">₹{parseFloat(sale.total).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReprint(sale)}
                              data-testid={`button-reprint-${sale.id}`}
                            >
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
                    <Button onClick={exportMonthlyToCSV} variant="outline" size="sm" data-testid="button-export-monthly-csv">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        `Monthly Collections Report - ${selectedYear}`,
                        ["Month", "Cash", "Card", "UPI", "Credit", "Total"],
                        monthlyData.map(d => [
                          d.monthName,
                          `₹${d.cash.toFixed(2)}`,
                          `₹${d.card.toFixed(2)}`,
                          `₹${d.upi.toFixed(2)}`,
                          `₹${d.credit.toFixed(2)}`,
                          `₹${d.total.toFixed(2)}`
                        ])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-monthly-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
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
                    <Button onClick={exportQuarterlyToCSV} variant="outline" size="sm" data-testid="button-export-quarterly-csv">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        `Quarterly Collections Report - ${selectedYear}`,
                        ["Quarter", "Cash", "Card", "UPI", "Credit", "Total"],
                        quarterlyData.map(d => [
                          d.quarter,
                          `₹${d.cash.toFixed(2)}`,
                          `₹${d.card.toFixed(2)}`,
                          `₹${d.upi.toFixed(2)}`,
                          `₹${d.credit.toFixed(2)}`,
                          `₹${d.total.toFixed(2)}`
                        ])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-quarterly-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
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
                          <TableCell className="font-medium">{row.quarter} ({selectedYear})</TableCell>
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
                    <Button onClick={exportYearlyToCSV} variant="outline" size="sm" data-testid="button-export-yearly-csv">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => exportToPDF(
                        "Yearly Collections Report",
                        ["Year", "Cash", "Card", "UPI", "Credit", "Total"],
                        yearlyData.map(d => [
                          d.year.toString(),
                          `₹${d.cash.toFixed(2)}`,
                          `₹${d.card.toFixed(2)}`,
                          `₹${d.upi.toFixed(2)}`,
                          `₹${d.credit.toFixed(2)}`,
                          `₹${d.total.toFixed(2)}`
                        ])
                      )} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-export-yearly-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
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
