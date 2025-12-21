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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Calendar,
  Search,
  Receipt,
  IndianRupee
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface Sale {
  id: number;
  invoiceNo: string | null;
  customerId: number | null;
  customerName: string;
  customerPhone: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function MySales() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sales = [], isLoading, refetch } = useQuery<Sale[]>({
    queryKey: ["/api/my-sales", fromDate, toDate, searchQuery],
    queryFn: async () => {
      let url = `/api/my-sales?from=${fromDate}&to=${toDate}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
  });

  const totalSales = sales.length;
  const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total || "0"), 0);
  const cashSales = sales.filter(s => s.paymentMethod === "cash").length;
  const creditSales = sales.filter(s => s.paymentMethod === "credit").length;

  const getPaymentBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: "bg-green-100 text-green-800",
      upi: "bg-blue-100 text-blue-800",
      card: "bg-purple-100 text-purple-800",
      credit: "bg-orange-100 text-orange-800",
    };
    return colors[method.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <ShoppingCart className="h-6 w-6" />
            My Sales History
          </h1>
          <p className="text-muted-foreground mt-1">
            View all transactions created by you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold" data-testid="text-total-sales">{totalSales}</p>
                </div>
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold" data-testid="text-total-amount">₹{totalAmount.toFixed(2)}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cash Sales</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-cash-sales">{cashSales}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credit Sales</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-credit-sales">{creditSales}</p>
                </div>
                <Receipt className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-10"
                    data-testid="input-from-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-10"
                    data-testid="input-to-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Invoice, customer, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={() => refetch()} className="w-full" data-testid="button-apply-filter">
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Transactions</CardTitle>
            <CardDescription>
              Showing {sales.length} transaction(s) from {fromDate} to {toDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sales found for the selected period
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-invoice-${sale.id}`}>
                          {sale.invoiceNo || `INV-${String(sale.id).padStart(4, '0')}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(sale.createdAt), "dd/MM/yyyy hh:mm a")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sale.customerName}</div>
                            {sale.customerPhone && (
                              <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">₹{parseFloat(sale.subtotal).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {parseFloat(sale.discount) > 0 ? `-₹${parseFloat(sale.discount).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">₹{parseFloat(sale.tax).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">₹{parseFloat(sale.total).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getPaymentBadge(sale.paymentMethod)} data-testid={`badge-payment-${sale.id}`}>
                            {sale.paymentMethod.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
