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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, MoreHorizontal, Plus, FileDown, Edit, Trash2, AlertTriangle, Package } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Medicine } from "@shared/schema";

const CATEGORIES = ["Tablets", "Capsules", "Syrups", "Injections", "Drops", "Ointments", "Creams", "Powders", "Other"];
const GST_RATES = ["5", "12", "18"];

interface MedicineFormData {
  name: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  quantity: number;
  price: string;
  costPrice: string;
  mrp: string;
  gstRate: string;
  hsnCode: string;
  category: string;
  reorderLevel: number;
}

const emptyForm: MedicineFormData = {
  name: "",
  batchNumber: "",
  manufacturer: "",
  expiryDate: "",
  quantity: 0,
  price: "",
  costPrice: "",
  mrp: "",
  gstRate: "18",
  hsnCode: "",
  category: "Tablets",
  reorderLevel: 50,
};

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<MedicineFormData>(emptyForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const response = await fetch("/api/medicines");
      if (!response.ok) throw new Error("Failed to fetch medicines");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MedicineFormData) => {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status: data.quantity <= 0 ? "Out of Stock" : data.quantity <= data.reorderLevel ? "Low Stock" : "In Stock",
        }),
      });
      if (!res.ok) throw new Error("Failed to create medicine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      toast({ title: "Medicine added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add medicine", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MedicineFormData> }) => {
      const res = await fetch(`/api/medicines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status: Number(data.quantity) <= 0 ? "Out of Stock" : Number(data.quantity) <= (data.reorderLevel || 50) ? "Low Stock" : "In Stock",
        }),
      });
      if (!res.ok) throw new Error("Failed to update medicine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setEditDialogOpen(false);
      setSelectedMedicine(null);
      setFormData(emptyForm);
      toast({ title: "Medicine updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update medicine", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/medicines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete medicine");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setDeleteDialogOpen(false);
      setSelectedMedicine(null);
      toast({ title: "Medicine deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete medicine", variant: "destructive" });
    },
  });

  const isNearExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths && expiry > new Date();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) <= new Date();
  };

  const filteredMedicines = medicines.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "low") return matchesSearch && item.status === "Low Stock";
    if (filterStatus === "out") return matchesSearch && item.status === "Out of Stock";
    if (filterStatus === "expiring") return matchesSearch && isNearExpiry(item.expiryDate);
    if (filterStatus === "expired") return matchesSearch && isExpired(item.expiryDate);
    return matchesSearch;
  });

  const openEditDialog = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setFormData({
      name: medicine.name,
      batchNumber: medicine.batchNumber,
      manufacturer: medicine.manufacturer,
      expiryDate: medicine.expiryDate,
      quantity: medicine.quantity,
      price: String(medicine.price),
      costPrice: medicine.costPrice ? String(medicine.costPrice) : "",
      mrp: medicine.mrp ? String(medicine.mrp) : "",
      gstRate: String(medicine.gstRate),
      hsnCode: medicine.hsnCode || "",
      category: medicine.category,
      reorderLevel: medicine.reorderLevel,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (isEdit: boolean) => {
    if (!formData.name || !formData.batchNumber || !formData.manufacturer || !formData.expiryDate || !formData.price) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (isEdit && selectedMedicine) {
      updateMutation.mutate({ id: selectedMedicine.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const MedicineFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="name">Medicine Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Paracetamol 500mg"
          className="mt-1.5"
          data-testid="input-medicine-name"
        />
      </div>
      <div>
        <Label htmlFor="batchNumber">Batch Number *</Label>
        <Input
          id="batchNumber"
          value={formData.batchNumber}
          onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
          placeholder="e.g., BT2024001"
          className="mt-1.5"
          data-testid="input-batch-number"
        />
      </div>
      <div>
        <Label htmlFor="expiryDate">Expiry Date *</Label>
        <Input
          id="expiryDate"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          className="mt-1.5"
          data-testid="input-expiry-date"
        />
      </div>
      <div>
        <Label htmlFor="manufacturer">Manufacturer *</Label>
        <Input
          id="manufacturer"
          value={formData.manufacturer}
          onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          placeholder="e.g., Sun Pharma"
          className="mt-1.5"
          data-testid="input-manufacturer"
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
          <SelectTrigger className="mt-1.5" data-testid="select-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          min={0}
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
          className="mt-1.5"
          data-testid="input-quantity"
        />
      </div>
      <div>
        <Label htmlFor="reorderLevel">Reorder Level</Label>
        <Input
          id="reorderLevel"
          type="number"
          min={0}
          value={formData.reorderLevel}
          onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
          className="mt-1.5"
          data-testid="input-reorder-level"
        />
      </div>
      <div>
        <Label htmlFor="costPrice">Cost Price (₹)</Label>
        <Input
          id="costPrice"
          type="number"
          step="0.01"
          min={0}
          value={formData.costPrice}
          onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
          placeholder="0.00"
          className="mt-1.5"
          data-testid="input-cost-price"
        />
      </div>
      <div>
        <Label htmlFor="price">Selling Price (₹) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min={0}
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="0.00"
          className="mt-1.5"
          data-testid="input-price"
        />
      </div>
      <div>
        <Label htmlFor="mrp">MRP (₹)</Label>
        <Input
          id="mrp"
          type="number"
          step="0.01"
          min={0}
          value={formData.mrp}
          onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
          placeholder="0.00"
          className="mt-1.5"
          data-testid="input-mrp"
        />
      </div>
      <div>
        <Label htmlFor="gstRate">GST Rate (%)</Label>
        <Select value={formData.gstRate} onValueChange={(v) => setFormData({ ...formData, gstRate: v })}>
          <SelectTrigger className="mt-1.5" data-testid="select-gst-rate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GST_RATES.map((rate) => (
              <SelectItem key={rate} value={rate}>{rate}%</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="hsnCode">HSN Code</Label>
        <Input
          id="hsnCode"
          value={formData.hsnCode}
          onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
          placeholder="e.g., 3004"
          className="mt-1.5"
          data-testid="input-hsn-code"
        />
      </div>
    </div>
  );

  return (
    <AppLayout title="Inventory Management">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pharmaceutical Stock
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your pharmacy's medicine inventory, track expiry dates, and monitor stock levels.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" data-testid="button-export">
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button 
              size="sm" 
              className="h-9"
              onClick={() => {
                setFormData(emptyForm);
                setAddDialogOpen(true);
              }}
              data-testid="button-add-medicine"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, batch, or manufacturer..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9" data-testid="select-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
                <SelectItem value="expiring">Near Expiry</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No medicines found. {searchTerm && "Try adjusting your search."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Batch No.</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">GST</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.map((item) => (
                    <TableRow key={item.id} data-testid={`row-medicine-${item.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        INV-{String(item.id).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.manufacturer}</div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                      <TableCell>
                        <span className={`text-xs ${isExpired(item.expiryDate) ? 'text-red-600 font-medium' : isNearExpiry(item.expiryDate) ? 'text-orange-600 font-medium' : ''}`}>
                          {item.expiryDate}
                          {isNearExpiry(item.expiryDate) && !isExpired(item.expiryDate) && (
                            <AlertTriangle className="h-3 w-3 inline ml-1 text-orange-500" />
                          )}
                          {isExpired(item.expiryDate) && (
                            <AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(String(item.price)).toFixed(2)}</TableCell>
                      <TableCell className="text-center text-xs">{item.gstRate}%</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          item.status === "In Stock" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : item.status === "Low Stock"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${item.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => openDeleteDialog(item)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
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
            Showing {filteredMedicines.length} of {medicines.length} items
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MedicineFormFields />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isPending}
              data-testid="button-save-medicine"
            >
              {createMutation.isPending ? "Saving..." : "Add Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MedicineFormFields />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleSubmit(true)}
              disabled={updateMutation.isPending}
              data-testid="button-update-medicine"
            >
              {updateMutation.isPending ? "Saving..." : "Update Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMedicine?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedMedicine && deleteMutation.mutate(selectedMedicine.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
