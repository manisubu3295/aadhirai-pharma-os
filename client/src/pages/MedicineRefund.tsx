import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, Search, Receipt, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { SalesReturnDialog } from "@/components/SalesReturnDialog";

interface Sale {
  id: number;
  invoiceNo: string;
  customerName: string;
  customerPhone: string | null;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

interface SalesReturn {
  id: number;
  saleId: number;
  invoiceNo: string;
  returnDate: string;
  totalRefundAmount: string;
  refundMode: string;
  reason: string;
  createdAt: string;
}

export default function MedicineRefund() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: salesReturns = [] } = useQuery<SalesReturn[]>({
    queryKey: ["/api/sales-returns"],
  });

  const openReturnDialog = (saleId: number) => {
    setSelectedSaleId(saleId);
    setReturnDialogOpen(true);
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = 
      !searchTerm ||
      sale.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerPhone?.includes(searchTerm);

    const saleDate = new Date(sale.createdAt);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    const matchesDate = saleDate >= fromDate && saleDate <= toDate;

    return matchesSearch && matchesDate;
  });

  const filteredReturns = salesReturns.filter((ret) => {
    const matchesSearch = 
      !searchTerm ||
      ret.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase());

    const returnDate = new Date(ret.createdAt);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    const matchesDate = returnDate >= fromDate && returnDate <= toDate;

    return matchesSearch && matchesDate;
  });

  const exportToCSV = () => {
    const headers = ["Return Invoice", "Original Invoice", "Date", "Refund Amount", "Refund Mode", "Reason"];
    const rows = filteredReturns.map(ret => [
      `RET-${ret.id}`,
      ret.invoiceNo,
      format(new Date(ret.createdAt), "dd/MM/yyyy HH:mm"),
      ret.totalRefundAmount,
      ret.refundMode,
      ret.reason || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refunds_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Refunds Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1e40af; color: white; }
          .text-right { text-align: right; }
          .total { margin-top: 20px; font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Medicine Refunds Report</h1>
        <p>Period: ${format(new Date(dateFrom), "dd MMM yyyy")} - ${format(new Date(dateTo), "dd MMM yyyy")}</p>
        <table>
          <thead>
            <tr>
              <th>Return Invoice</th>
              <th>Original Invoice</th>
              <th>Date</th>
              <th>Refund Mode</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReturns.map(ret => `
              <tr>
                <td>RET-${ret.id}</td>
                <td>${ret.invoiceNo}</td>
                <td>${format(new Date(ret.createdAt), "dd/MM/yyyy HH:mm")}</td>
                <td>${ret.refundMode}</td>
                <td class="text-right">₹${parseFloat(ret.totalRefundAmount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="total">Total Refunds: ₹${filteredReturns.reduce((sum, r) => sum + parseFloat(r.totalRefundAmount), 0).toFixed(2)}</p>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <AppLayout title="Medicine Refund">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Search Invoice for Refund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label>Search Invoice / Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter invoice number, customer name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-invoice"
                  />
                </div>
              </div>
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-refund-date-from"
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-refund-date-to"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Invoices for Refund ({filteredSales.length} results)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8">Loading...</p>
            ) : filteredSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No invoices found for the selected date range
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} data-testid={`row-refund-invoice-${sale.id}`}>
                      <TableCell className="font-medium">
                        {sale.invoiceNo || `INV-${sale.id}`}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.createdAt), "dd MMM yyyy, hh:mm a")}
                      </TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell>{sale.customerPhone || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sale.paymentMethod?.toLowerCase() === "credit" 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{parseFloat(sale.total).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReturnDialog(sale.id)}
                          data-testid={`button-process-return-${sale.id}`}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Process Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Recent Refunds ({filteredReturns.length} results)
              </span>
              <div className="flex items-center gap-2">
                <Button onClick={exportToCSV} variant="outline" size="sm" data-testid="button-export-refunds-csv">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={exportToPDF} variant="outline" size="sm" data-testid="button-export-refunds-pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReturns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No refunds found for the selected date range
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return No</TableHead>
                    <TableHead>Original Invoice</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Refund Mode</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Refund Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((ret) => (
                    <TableRow key={ret.id} data-testid={`row-refund-${ret.id}`}>
                      <TableCell className="font-medium">RET-{ret.id}</TableCell>
                      <TableCell>{ret.invoiceNo}</TableCell>
                      <TableCell>
                        {format(new Date(ret.createdAt), "dd MMM yyyy, hh:mm a")}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {ret.refundMode}
                        </span>
                      </TableCell>
                      <TableCell>{ret.reason || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        -₹{parseFloat(ret.totalRefundAmount).toFixed(2)}
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
    </AppLayout>
  );
}
