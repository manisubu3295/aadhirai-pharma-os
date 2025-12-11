import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, Search, Receipt } from "lucide-react";
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

export default function MedicineRefund() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
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

    let matchesDate = true;
    if (dateFrom || dateTo) {
      const saleDate = new Date(sale.createdAt);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && saleDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && saleDate <= toDate;
      }
    }

    return matchesSearch && matchesDate;
  });

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
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoice List ({filteredSales.length} results)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8">Loading...</p>
            ) : filteredSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchTerm || dateFrom || dateTo 
                  ? "No invoices found matching your search criteria" 
                  : "Enter search criteria to find invoices for refund"}
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
      </div>

      <SalesReturnDialog
        saleId={selectedSaleId}
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
      />
    </AppLayout>
  );
}
