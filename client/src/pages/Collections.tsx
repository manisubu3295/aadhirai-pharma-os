import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSpreadsheet, FileText, CreditCard, Banknote, Wallet, QrCode, RotateCcw, Printer } from "lucide-react";
import { usePlan } from "@/lib/planContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { SalesReturnDialog } from "@/components/SalesReturnDialog";
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

export default function Collections() {
  const { isPro } = usePlan();
  const { settings: appSettings } = useSettings();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(today, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [printItems, setPrintItems] = useState<SaleItem[]>([]);

  const openReturnDialog = (saleId: number) => {
    setSelectedSaleId(saleId);
    setReturnDialogOpen(true);
  };

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

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
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

  const exportToCSV = () => {
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
    a.download = `collections_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Collections Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1e40af; color: white; }
          .totals { margin-top: 20px; background: #f5f5f5; padding: 15px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <h1>Collections Report</h1>
        <p>Period: ${format(new Date(dateFrom), "dd MMM yyyy")} - ${format(new Date(dateTo), "dd MMM yyyy")}</p>
        <table>
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Payment Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map(sale => `
              <tr>
                <td>${sale.invoiceNo || `INV-${sale.id}`}</td>
                <td>${format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}</td>
                <td>${sale.customerName}</td>
                <td>${sale.paymentMethod}</td>
                <td>₹${parseFloat(sale.total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <h3>Summary by Payment Method</h3>
          ${Object.entries(paymentTotals).map(([method, total]) => 
            `<p>${method}: ₹${total.toFixed(2)}</p>`
          ).join('')}
          <p class="grand-total">Grand Total: ₹${grandTotal.toFixed(2)}</p>
        </div>
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

  return (
    <AppLayout title="Collections">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Collection Filters
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
                <Button onClick={exportToCSV} variant="outline" className="flex-1" data-testid="button-export-csv">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={exportToPDF} variant="outline" className="flex-1" data-testid="button-export-pdf">
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
            {isLoading ? (
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReprint(sale)}
                            data-testid={`button-reprint-${sale.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReturnDialog(sale.id)}
                            data-testid={`button-return-${sale.id}`}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Return
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <SalesReturnDialog
        saleId={selectedSaleId}
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
      />

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
