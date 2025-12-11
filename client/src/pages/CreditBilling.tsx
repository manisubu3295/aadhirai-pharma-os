import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  IndianRupee, 
  Users, 
  AlertTriangle, 
  CreditCard,
  Search,
  ArrowUpDown,
  Eye,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { NumericInput } from "@/components/ui/numeric-input";

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  creditLimit: string;
  outstandingBalance: string;
  creditPeriodDays: number;
}

interface Sale {
  id: number;
  invoiceNo: string;
  total: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  customerId: number | null;
}

interface CreditPayment {
  id: number;
  saleId: number;
  customerId: number;
  amount: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

export default function CreditBilling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "outstanding">("outstanding");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: creditPayments = [] } = useQuery<CreditPayment[]>({
    queryKey: ["/api/credit-payments"],
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { customerId: number; amount: string; paymentMethod: string; reference: string }) => {
      const res = await fetch("/api/credit-billing/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: data.customerId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          reference: data.reference || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-payments"] });
      setPaymentDialogOpen(false);
      setPaymentAmount(0);
      setPaymentReference("");
      setSelectedCustomer(null);
      toast({ title: "Payment recorded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to record payment", variant: "destructive" });
    },
  });

  const creditCustomers = customers.filter(c => parseFloat(c.outstandingBalance) > 0);

  const filteredCustomers = creditCustomers
    .filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortDir === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        const aVal = parseFloat(a.outstandingBalance);
        const bVal = parseFloat(b.outstandingBalance);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

  const totalOutstanding = creditCustomers.reduce(
    (sum, c) => sum + parseFloat(c.outstandingBalance), 0
  );

  const totalCreditLimit = creditCustomers.reduce(
    (sum, c) => sum + parseFloat(c.creditLimit), 0
  );

  const overdueCustomers = creditCustomers.filter(c => {
    const customerPayments = creditPayments.filter(p => p.customerId === c.id);
    if (customerPayments.length === 0) return true;
    const lastPayment = new Date(customerPayments[0].createdAt);
    const daysSincePayment = Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
    return daysSincePayment > c.creditPeriodDays;
  });

  const toggleSort = (column: "name" | "outstanding") => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const openPaymentDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(parseFloat(customer.outstandingBalance));
    setPaymentDialogOpen(true);
  };

  const openDetailDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailDialogOpen(true);
  };

  const handleRecordPayment = () => {
    if (!selectedCustomer || paymentAmount <= 0) {
      toast({ title: "Please enter payment amount", variant: "destructive" });
      return;
    }
    
    const outstanding = parseFloat(selectedCustomer.outstandingBalance);
    
    if (paymentAmount > outstanding) {
      toast({ title: "Payment cannot exceed outstanding balance", variant: "destructive" });
      return;
    }

    recordPaymentMutation.mutate({
      customerId: selectedCustomer.id,
      amount: paymentAmount.toFixed(2),
      paymentMethod,
      reference: paymentReference,
    });
  };

  const getCustomerCreditSales = (customerId: number) => {
    return sales.filter(s => s.customerId === customerId && s.paymentMethod === "Credit");
  };

  const getCustomerPayments = (customerId: number) => {
    return creditPayments.filter(p => p.customerId === customerId);
  };

  return (
    <AppLayout title="Credit Billing">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="text-total-outstanding">
                    ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credit Customers</p>
                  <p className="text-2xl font-bold" data-testid="text-credit-customers">
                    {creditCustomers.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Credit Limit</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-credit-limit">
                    ₹{totalCreditLimit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue Accounts</p>
                  <p className="text-2xl font-bold text-amber-600" data-testid="text-overdue-accounts">
                    {overdueCustomers.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Credit Customers
                </CardTitle>
                <CardDescription>
                  Customers with outstanding credit balances
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-credit"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No matching customers found" : "No customers with outstanding balance"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          Customer
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("outstanding")}
                      >
                        <div className="flex items-center gap-2">
                          Outstanding
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                      <TableHead>Credit Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const utilizationPercent = (parseFloat(customer.outstandingBalance) / parseFloat(customer.creditLimit)) * 100;
                      const isOverLimit = utilizationPercent > 100;
                      const isNearLimit = utilizationPercent > 80;
                      
                      return (
                        <TableRow key={customer.id} data-testid={`row-credit-customer-${customer.id}`}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone || "-"}</TableCell>
                          <TableCell>₹{parseFloat(customer.creditLimit).toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <span className={isOverLimit ? "text-red-600 font-semibold" : isNearLimit ? "text-amber-600 font-semibold" : ""}>
                              ₹{parseFloat(customer.outstandingBalance).toLocaleString("en-IN")}
                            </span>
                          </TableCell>
                          <TableCell>{customer.creditPeriodDays} days</TableCell>
                          <TableCell>
                            {isOverLimit ? (
                              <Badge variant="destructive">Over Limit</Badge>
                            ) : isNearLimit ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Near Limit</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openDetailDialog(customer)}
                                data-testid={`button-view-credit-${customer.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => openPaymentDialog(customer)}
                                data-testid={`button-record-payment-${customer.id}`}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Payment
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Outstanding: ₹{parseFloat(selectedCustomer.outstandingBalance).toLocaleString("en-IN")}
                </p>
              </div>
              
              <div>
                <Label>Payment Amount</Label>
                <NumericInput
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="0.00"
                  className="mt-1.5"
                  max={parseFloat(selectedCustomer.outstandingBalance)}
                  data-testid="input-payment-amount"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <div className="flex gap-2 mt-1.5">
                  {["Cash", "Card", "UPI", "Bank Transfer"].map((method) => (
                    <Button
                      key={method}
                      type="button"
                      variant={paymentMethod === method ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod(method)}
                      data-testid={`button-method-${method.toLowerCase()}`}
                    >
                      {method}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Reference (Optional)</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, cheque number, etc."
                  className="mt-1.5"
                  data-testid="input-payment-reference"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Credit Details - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Credit Limit</p>
                  <p className="text-lg font-semibold">
                    ₹{parseFloat(selectedCustomer.creditLimit).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-semibold text-red-600">
                    ₹{parseFloat(selectedCustomer.outstandingBalance).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{(parseFloat(selectedCustomer.creditLimit) - parseFloat(selectedCustomer.outstandingBalance)).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Credit Sales</h4>
                <div className="rounded-md border max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerCreditSales(selectedCustomer.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No credit sales found
                          </TableCell>
                        </TableRow>
                      ) : (
                        getCustomerCreditSales(selectedCustomer.id).map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>{sale.invoiceNo || `INV-${sale.id}`}</TableCell>
                            <TableCell>{format(new Date(sale.createdAt), "dd/MM/yyyy")}</TableCell>
                            <TableCell>₹{parseFloat(sale.total).toLocaleString("en-IN")}</TableCell>
                            <TableCell>
                              <Badge variant={sale.status === "Paid" ? "default" : "outline"}>
                                {sale.status || "Pending"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Payment History</h4>
                <div className="rounded-md border max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerPayments(selectedCustomer.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No payments recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        getCustomerPayments(selectedCustomer.id).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.createdAt), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-green-600">
                              +₹{parseFloat(payment.amount).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>{payment.notes || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setDetailDialogOpen(false);
              if (selectedCustomer) openPaymentDialog(selectedCustomer);
            }}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
