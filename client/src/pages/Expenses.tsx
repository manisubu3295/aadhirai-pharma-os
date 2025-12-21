import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, IndianRupee, Calendar, Filter, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth } from "date-fns";

interface PettyCashExpense {
  id: number;
  expenseDate: string;
  category: string;
  amount: string;
  paymentMode: string;
  notes: string | null;
  createdByUserId: string;
  createdByUserName: string | null;
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  "Delivery",
  "Tea/Snacks",
  "Courier",
  "Stationery",
  "Maintenance",
  "Utility",
  "Misc"
];

const PAYMENT_MODES = ["CASH", "UPI", "CARD"];

export default function Expenses() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null);
  const [formData, setFormData] = useState({
    expenseDate: format(new Date(), "yyyy-MM-dd"),
    category: "",
    amount: "",
    paymentMode: "CASH",
    notes: ""
  });
  
  const [filterFrom, setFilterFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterTo, setFilterTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterCategory, setFilterCategory] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<PettyCashExpense[]>({
    queryKey: ["/api/expenses", filterFrom, filterTo, filterCategory],
    queryFn: async () => {
      let url = `/api/expenses?from=${filterFrom}&to=${filterTo}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Expense added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update expense");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Expense updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update expense", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Expense deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      category: "",
      amount: "",
      paymentMode: "CASH",
      notes: ""
    });
    setEditingExpense(null);
  };

  const handleEdit = (expense: PettyCashExpense) => {
    setEditingExpense(expense);
    setFormData({
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: expense.amount,
      paymentMode: expense.paymentMode,
      notes: expense.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.amount || !formData.expenseDate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Petty Cash / Expenses</h1>
            <p className="text-muted-foreground">Track daily expenses and petty cash</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-expense">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>From:</Label>
                <Input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-40"
                  data-testid="input-filter-from"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>To:</Label>
                <Input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="w-40"
                  data-testid="input-filter-to"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Category:</Label>
                <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40" data-testid="select-filter-category">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <IndianRupee className="h-5 w-5" />
                Total: ₹{totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {expenses.length} expense(s) found
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No expenses found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                      <TableCell>{expense.expenseDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">₹{parseFloat(expense.amount).toFixed(2)}</TableCell>
                      <TableCell>{expense.paymentMode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.notes || "-"}</TableCell>
                      <TableCell>{expense.createdByUserName || "Unknown"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(expense)}
                            data-testid={`button-edit-expense-${expense.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteMutation.mutate(expense.id)}
                            data-testid={`button-delete-expense-${expense.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    data-testid="input-expense-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger data-testid="select-expense-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-expense-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select 
                    value={formData.paymentMode} 
                    onValueChange={(val) => setFormData({ ...formData, paymentMode: val })}
                  >
                    <SelectTrigger data-testid="select-expense-payment-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  data-testid="input-expense-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-expense"
              >
                {editingExpense ? "Update" : "Add"} Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
