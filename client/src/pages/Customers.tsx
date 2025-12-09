import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Plus, Edit, Users, Phone, Mail, CreditCard, Clock, History, Crown, Receipt } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/planContext";
import type { Customer, CreditPayment, Sale } from "@shared/schema";

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  creditLimit: string;
  creditPeriodDays: number;
}

const emptyForm: CustomerFormData = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
  creditLimit: "0",
  creditPeriodDays: 30,
};

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPro } = usePlan();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const { data: creditPayments = [] } = useQuery<CreditPayment[]>({
    queryKey: ["/api/credit-payments", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const response = await fetch(`/api/credit-payments?customerId=${selectedCustomer.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedCustomer && paymentHistoryDialogOpen,
  });

  const { data: creditSales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales", "credit", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const response = await fetch(`/api/sales`);
      if (!response.ok) return [];
      const allSales = await response.json();
      return allSales.filter((s: Sale) => 
        s.customerId === selectedCustomer.id && 
        s.paymentMethod === "Credit"
      );
    },
    enabled: !!selectedCustomer && paymentHistoryDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      toast({ title: "Customer added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add customer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormData }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditDialogOpen(false);
      setSelectedCustomer(null);
      setFormData(emptyForm);
      toast({ title: "Customer updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update customer", variant: "destructive" });
    },
  });

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      gstin: customer.gstin || "",
      creditLimit: String(customer.creditLimit || "0"),
      creditPeriodDays: customer.creditPeriodDays || 30,
    });
    setEditDialogOpen(true);
  };

  const openPaymentHistoryDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentHistoryDialogOpen(true);
  };

  const calculateDueDate = (saleDate: string | Date, creditDays: number) => {
    const date = new Date(saleDate);
    date.setDate(date.getDate() + creditDays);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = (saleDate: string | Date, creditDays: number) => {
    const dueDate = new Date(saleDate);
    dueDate.setDate(dueDate.getDate() + creditDays);
    return new Date() > dueDate;
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Please enter customer name", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);
  const customersWithCredit = customers.filter((c) => Number(c.creditLimit || 0) > 0).length;

  const customerFormFields = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Customer Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter customer name"
          className="mt-1.5"
          data-testid="input-customer-name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+91 98765 43210"
            className="mt-1.5"
            data-testid="input-phone"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="customer@email.com"
            className="mt-1.5"
            data-testid="input-email"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter address"
          className="mt-1.5"
          rows={2}
          data-testid="input-address"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gstin">GSTIN</Label>
          <Input
            id="gstin"
            value={formData.gstin}
            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
            placeholder="e.g., 33AABCU9603R1ZM"
            className="mt-1.5"
            data-testid="input-gstin"
          />
        </div>
        <div>
          <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
          <Input
            id="creditLimit"
            type="number"
            min={0}
            value={formData.creditLimit}
            onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
            placeholder="0"
            className="mt-1.5"
            data-testid="input-credit-limit"
          />
        </div>
      </div>
      {isPro && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-600">PRO Features</span>
          </div>
          <div>
            <Label htmlFor="creditPeriodDays">Credit Period (Days)</Label>
            <Input
              id="creditPeriodDays"
              type="number"
              min={0}
              value={formData.creditPeriodDays}
              onChange={(e) => setFormData({ ...formData, creditPeriodDays: parseInt(e.target.value) || 30 })}
              placeholder="30"
              className="mt-1.5"
              data-testid="input-credit-period"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default credit period for calculating bill due dates
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout title="Customer Management">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold" data-testid="text-total-customers">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Customers</p>
                <p className="text-2xl font-bold" data-testid="text-credit-customers">{customersWithCredit}</p>
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
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-total-outstanding">
                  ₹{totalOutstanding.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customers
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your pharmacy's customer database and credit accounts.
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            className="h-9"
            onClick={() => {
              setFormData(emptyForm);
              setAddDialogOpen(true);
            }}
            data-testid="button-add-customer"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No customers found. {searchTerm && "Try adjusting your search."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    {isPro && <TableHead className="text-center">Credit Period</TableHead>}
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                      <TableCell className="font-medium">
                        <div>{customer.name}</div>
                        {customer.address && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {customer.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {customer.gstin || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(customer.creditLimit || 0) > 0 ? (
                          <span className="text-primary font-medium">
                            ₹{Number(customer.creditLimit).toFixed(2)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      {isPro && (
                        <TableCell className="text-center">
                          {Number(customer.creditLimit || 0) > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{customer.creditPeriodDays || 30} days</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {Number(customer.outstandingBalance || 0) > 0 ? (
                          <span className="text-red-600 font-medium">
                            ₹{Number(customer.outstandingBalance).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-green-600">₹0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${customer.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                              <Edit className="h-4 w-4 mr-2" /> View / Edit
                            </DropdownMenuItem>
                            {isPro && Number(customer.outstandingBalance || 0) > 0 && (
                              <DropdownMenuItem onClick={() => openPaymentHistoryDialog(customer)}>
                                <History className="h-4 w-4 mr-2" /> Payment History
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {customerFormFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              data-testid="button-save-customer"
            >
              {createMutation.isPending ? "Saving..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {customerFormFields}
            {selectedCustomer && Number(selectedCustomer.outstandingBalance || 0) > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{Number(selectedCustomer.outstandingBalance).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedCustomer) {
                  updateMutation.mutate({ id: selectedCustomer.id, data: formData });
                }
              }}
              disabled={updateMutation.isPending}
              data-testid="button-update-customer"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPro && (
        <Dialog open={paymentHistoryDialogOpen} onOpenChange={setPaymentHistoryDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History - {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">Outstanding Balance</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{Number(selectedCustomer?.outstandingBalance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700">Credit Period</p>
                  <p className="text-xl font-bold text-blue-600">
                    {selectedCustomer?.creditPeriodDays || 30} Days
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Credit Sales
                </h4>
                {creditSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No credit sales found</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-sm">{sale.invoiceNo || `INV-${sale.id}`}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(sale.createdAt).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right font-medium">₹{Number(sale.total).toFixed(2)}</TableCell>
                            <TableCell className="text-sm">
                              {calculateDueDate(sale.createdAt, selectedCustomer?.creditPeriodDays || 30)}
                            </TableCell>
                            <TableCell>
                              {isOverdue(sale.createdAt, selectedCustomer?.creditPeriodDays || 30) ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  Overdue
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                  Pending
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Records
                </h4>
                {creditPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No payments recorded yet</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm">
                              {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              ₹{Number(payment.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentHistoryDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
