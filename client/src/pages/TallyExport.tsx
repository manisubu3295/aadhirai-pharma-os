import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, Download, Settings, ShoppingCart, Package, CreditCard, Calculator } from "lucide-react";
import { usePlan } from "@/lib/planContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { endOfLocalDay, formatAppDate, parseServerDate, startOfLocalDay } from "@/lib/dateTime";

interface Sale {
  id: number;
  invoiceNo: string;
  customerName: string;
  customerGstin: string | null;
  subtotal: string;
  cgst: string;
  sgst: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

export default function TallyExport() {
  const { isPro } = usePlan();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  
  const [ledgerConfig, setLedgerConfig] = useState({
    salesLedger: "Sales Account",
    purchaseLedger: "Purchase Account",
    cashLedger: "Cash",
    bankLedger: "Bank Account",
    cgstLedger: "CGST Payable",
    sgstLedger: "SGST Payable",
    debtorsLedger: "Sundry Debtors",
    creditorsLedger: "Sundry Creditors"
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    enabled: isPro,
  });

  if (!isPro) {
    return (
      <AppLayout title="Tally Export">
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PRO Feature</h3>
              <p className="text-muted-foreground">
                Tally Export is available in the PRO plan. Switch to PRO to export sales, purchase, and collection vouchers in Tally-compatible format.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const filteredSales = sales.filter((sale) => {
    const saleDate = parseServerDate(sale.createdAt);
    const fromDate = startOfLocalDay(dateFrom);
    const toDate = endOfLocalDay(dateTo);
    return saleDate >= fromDate && saleDate <= toDate;
  });

  const generateSalesVoucherCSV = () => {
    const headers = [
      "Voucher Type", "Voucher Date", "Voucher Number", "Party Ledger Name", 
      "Sales Ledger", "Amount", "CGST Ledger", "CGST Amount", "SGST Ledger", "SGST Amount"
    ];
    
    const rows = filteredSales.map(sale => [
      "Sales",
      formatAppDate(sale.createdAt, "dd-MM-yyyy"),
      sale.invoiceNo || `INV-${sale.id}`,
      sale.customerName,
      ledgerConfig.salesLedger,
      sale.subtotal,
      ledgerConfig.cgstLedger,
      sale.cgst,
      ledgerConfig.sgstLedger,
      sale.sgst
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    downloadCSV(csvContent, "tally_sales_vouchers");
  };

  const generateReceiptVoucherCSV = () => {
    const cashSales = filteredSales.filter(s => s.paymentMethod.toLowerCase() === "cash");
    const headers = [
      "Voucher Type", "Voucher Date", "Voucher Number", "Dr Ledger", "Cr Ledger", "Amount"
    ];
    
    const rows = cashSales.map(sale => [
      "Receipt",
      formatAppDate(sale.createdAt, "dd-MM-yyyy"),
      `RCP-${sale.id}`,
      ledgerConfig.cashLedger,
      sale.customerName,
      sale.total
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    downloadCSV(csvContent, "tally_receipt_vouchers");
  };

  const generateGSTSummaryCSV = () => {
    const headers = [
      "Invoice No", "Invoice Date", "Party Name", "GSTIN", "Taxable Value", "CGST", "SGST", "Total"
    ];
    
    const rows = filteredSales.map(sale => [
      sale.invoiceNo || `INV-${sale.id}`,
      formatAppDate(sale.createdAt, "dd-MM-yyyy"),
      sale.customerName,
      sale.customerGstin || "",
      sale.subtotal,
      sale.cgst,
      sale.sgst,
      sale.total
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    downloadCSV(csvContent, "tally_gst_summary");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  const totalSales = filteredSales.reduce((acc, s) => acc + parseFloat(s.total), 0);
  const totalCGST = filteredSales.reduce((acc, s) => acc + parseFloat(s.cgst || "0"), 0);
  const totalSGST = filteredSales.reduce((acc, s) => acc + parseFloat(s.sgst || "0"), 0);

  return (
    <AppLayout title="Tally Export">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Select the period for which you want to export Tally data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-tally-date-from"
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-tally-date-to"
                />
              </div>
              <div className="flex items-end">
                <div className="text-sm">
                  <p className="text-muted-foreground">Selected Period</p>
                  <p className="font-semibold">{filteredSales.length} invoices | ₹{totalSales.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Ledger Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Sales Vouchers
                  </CardTitle>
                  <CardDescription>
                    Export all sales invoices as Tally sales vouchers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">{filteredSales.length}</div>
                  <p className="text-sm text-muted-foreground mb-4">Total: ₹{totalSales.toFixed(2)}</p>
                  <Button onClick={generateSalesVoucherCSV} className="w-full" data-testid="button-export-sales-vouchers">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    Receipt Vouchers
                  </CardTitle>
                  <CardDescription>
                    Export cash/bank receipts as Tally receipt vouchers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {filteredSales.filter(s => s.paymentMethod.toLowerCase() === "cash").length}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Cash transactions</p>
                  <Button onClick={generateReceiptVoucherCSV} className="w-full" variant="outline" data-testid="button-export-receipt-vouchers">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    GST Summary
                  </CardTitle>
                  <CardDescription>
                    Export GST-wise summary for filing returns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm mb-2">
                    <span className="text-muted-foreground">CGST:</span> ₹{totalCGST.toFixed(2)}
                  </div>
                  <div className="text-sm mb-4">
                    <span className="text-muted-foreground">SGST:</span> ₹{totalSGST.toFixed(2)}
                  </div>
                  <Button onClick={generateGSTSummaryCSV} className="w-full" variant="outline" data-testid="button-export-gst-summary">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ledger Names Configuration</CardTitle>
                <CardDescription>
                  Configure ledger names to match your Tally master data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Sales Ledger</Label>
                    <Input
                      value={ledgerConfig.salesLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, salesLedger: e.target.value})}
                      data-testid="input-sales-ledger"
                    />
                  </div>
                  <div>
                    <Label>Purchase Ledger</Label>
                    <Input
                      value={ledgerConfig.purchaseLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, purchaseLedger: e.target.value})}
                      data-testid="input-purchase-ledger"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cash Ledger</Label>
                    <Input
                      value={ledgerConfig.cashLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, cashLedger: e.target.value})}
                      data-testid="input-cash-ledger"
                    />
                  </div>
                  <div>
                    <Label>Bank Ledger</Label>
                    <Input
                      value={ledgerConfig.bankLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, bankLedger: e.target.value})}
                      data-testid="input-bank-ledger"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>CGST Payable Ledger</Label>
                    <Input
                      value={ledgerConfig.cgstLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, cgstLedger: e.target.value})}
                      data-testid="input-cgst-ledger"
                    />
                  </div>
                  <div>
                    <Label>SGST Payable Ledger</Label>
                    <Input
                      value={ledgerConfig.sgstLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, sgstLedger: e.target.value})}
                      data-testid="input-sgst-ledger"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Sundry Debtors Group</Label>
                    <Input
                      value={ledgerConfig.debtorsLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, debtorsLedger: e.target.value})}
                      data-testid="input-debtors-ledger"
                    />
                  </div>
                  <div>
                    <Label>Sundry Creditors Group</Label>
                    <Input
                      value={ledgerConfig.creditorsLedger}
                      onChange={(e) => setLedgerConfig({...ledgerConfig, creditorsLedger: e.target.value})}
                      data-testid="input-creditors-ledger"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
