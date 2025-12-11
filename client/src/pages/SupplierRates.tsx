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
import { NumericInput } from "@/components/ui/numeric-input";
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Plus, Edit, Trash2, Tag, Package, IndianRupee } from "lucide-react";
import { useState, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Supplier, SupplierRate, Medicine } from "@shared/schema";

interface RateFormData {
  supplierId: number;
  medicineId: number;
  rate: string;
  mrp: string;
  discountPercent: string;
  gstRate: string;
  minOrderQty: number;
  leadTimeDays: number;
}

const emptyForm: RateFormData = {
  supplierId: 0,
  medicineId: 0,
  rate: "",
  mrp: "",
  discountPercent: "0",
  gstRate: "18",
  minOrderQty: 1,
  leadTimeDays: 3,
};

interface RateFormFieldsProps {
  formData: RateFormData;
  setFormData: React.Dispatch<React.SetStateAction<RateFormData>>;
  suppliers: Supplier[];
  medicines: Medicine[];
  isEdit?: boolean;
}

const RateFormFields = memo(function RateFormFields({ formData, setFormData, suppliers, medicines, isEdit }: RateFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="supplierId">Supplier *</Label>
        <Select
          value={formData.supplierId.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: parseInt(value) }))}
          disabled={isEdit}
        >
          <SelectTrigger data-testid="select-rate-supplier">
            <SelectValue placeholder="Select supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name} ({supplier.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="medicineId">Medicine *</Label>
        <Select
          value={formData.medicineId.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, medicineId: parseInt(value) }))}
          disabled={isEdit}
        >
          <SelectTrigger data-testid="select-rate-medicine">
            <SelectValue placeholder="Select medicine" />
          </SelectTrigger>
          <SelectContent>
            {medicines.map((medicine) => (
              <SelectItem key={medicine.id} value={medicine.id.toString()}>
                {medicine.name} - {medicine.manufacturer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="rate">Purchase Rate *</Label>
        <NumericInput
          min={0}
          allowDecimal={true}
          value={parseFloat(formData.rate) || 0}
          onChange={(value) => setFormData(prev => ({ ...prev, rate: String(value) }))}
          placeholder="0.00"
          data-testid="input-rate-price"
        />
      </div>
      <div>
        <Label htmlFor="mrp">MRP</Label>
        <NumericInput
          min={0}
          allowDecimal={true}
          value={parseFloat(formData.mrp) || 0}
          onChange={(value) => setFormData(prev => ({ ...prev, mrp: String(value) }))}
          placeholder="0.00"
          data-testid="input-rate-mrp"
        />
      </div>
      <div>
        <Label htmlFor="discountPercent">Discount %</Label>
        <NumericInput
          min={0}
          allowDecimal={true}
          value={parseFloat(formData.discountPercent) || 0}
          onChange={(value) => setFormData(prev => ({ ...prev, discountPercent: String(value) }))}
          placeholder="0"
          data-testid="input-rate-discount"
        />
      </div>
      <div>
        <Label htmlFor="gstRate">GST Rate %</Label>
        <Select
          value={formData.gstRate}
          onValueChange={(value) => setFormData(prev => ({ ...prev, gstRate: value }))}
        >
          <SelectTrigger data-testid="select-rate-gst">
            <SelectValue placeholder="Select GST rate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0%</SelectItem>
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="12">12%</SelectItem>
            <SelectItem value="18">18%</SelectItem>
            <SelectItem value="28">28%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="minOrderQty">Min Order Qty</Label>
        <NumericInput
          min={1}
          value={formData.minOrderQty}
          onChange={(value) => setFormData(prev => ({ ...prev, minOrderQty: value }))}
          defaultValue={1}
          data-testid="input-rate-min-qty"
        />
      </div>
      <div>
        <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
        <NumericInput
          min={0}
          value={formData.leadTimeDays}
          onChange={(value) => setFormData(prev => ({ ...prev, leadTimeDays: value }))}
          defaultValue={3}
          data-testid="input-rate-lead-time"
        />
      </div>
    </div>
  );
});

export default function SupplierRates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SupplierRate | null>(null);
  const [formData, setFormData] = useState<RateFormData>(emptyForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const response = await fetch("/api/medicines");
      if (!response.ok) throw new Error("Failed to fetch medicines");
      return response.json();
    },
  });

  const { data: rates = [], isLoading } = useQuery<SupplierRate[]>({
    queryKey: ["/api/supplier-rates", selectedSupplierId],
    queryFn: async () => {
      const url = selectedSupplierId !== "all" 
        ? `/api/supplier-rates?supplierId=${selectedSupplierId}`
        : "/api/supplier-rates";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch supplier rates");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RateFormData) => {
      const res = await fetch("/api/supplier-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Failed to create rate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-rates"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      toast({ title: "Rate added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RateFormData & { id: number }) => {
      const res = await fetch(`/api/supplier-rates/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update rate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-rates"] });
      setEditDialogOpen(false);
      setSelectedRate(null);
      setFormData(emptyForm);
      toast({ title: "Rate updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update rate", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/supplier-rates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-rates"] });
      toast({ title: "Rate deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete rate", variant: "destructive" });
    },
  });

  const getMedicineName = (id: number) => medicines.find(m => m.id === id)?.name || "Unknown";
  const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.name || "Unknown";

  const filteredRates = rates.filter((rate) => {
    const medicineName = getMedicineName(rate.medicineId);
    const supplierName = getSupplierName(rate.supplierId);
    return medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const openEditDialog = (rate: SupplierRate) => {
    setSelectedRate(rate);
    setFormData({
      supplierId: rate.supplierId,
      medicineId: rate.medicineId,
      rate: rate.rate,
      mrp: rate.mrp || "",
      discountPercent: rate.discountPercent || "0",
      gstRate: rate.gstRate || "18",
      minOrderQty: rate.minOrderQty || 1,
      leadTimeDays: rate.leadTimeDays || 3,
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.supplierId || !formData.medicineId || !formData.rate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedRate) return;
    updateMutation.mutate({ ...formData, id: selectedRate.id });
  };

  return (
    <AppLayout title="Supplier Rate Master">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Tag className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rate Entries</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-rates">
                  {rates.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products Mapped</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-mapped-products">
                  {new Set(rates.map(r => r.medicineId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <IndianRupee className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suppliers with Rates</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-suppliers-with-rates">
                  {new Set(rates.map(r => r.supplierId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Rate Master</CardTitle>
              <CardDescription>Link products to suppliers with specific pricing</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="w-48" data-testid="filter-supplier">
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-rates"
                />
              </div>
              <Button onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }} data-testid="button-add-rate">
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredRates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No rates found</p>
              <p className="text-sm">Add supplier-item rate mappings to streamline purchase orders</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead className="text-right">GST %</TableHead>
                    <TableHead>Min Qty</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRates.map((rate) => (
                    <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                      <TableCell className="font-medium">{getMedicineName(rate.medicineId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSupplierName(rate.supplierId)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">₹{rate.rate}</TableCell>
                      <TableCell className="text-right font-mono">{rate.mrp ? `₹${rate.mrp}` : "-"}</TableCell>
                      <TableCell className="text-right">{rate.discountPercent || 0}%</TableCell>
                      <TableCell className="text-right">{rate.gstRate || 18}%</TableCell>
                      <TableCell>{rate.minOrderQty || 1}</TableCell>
                      <TableCell>{rate.leadTimeDays || 3} days</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-rate-${rate.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(rate)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(rate.id)}
                              className="text-destructive"
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
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Supplier Rate</DialogTitle>
          </DialogHeader>
          <RateFormFields 
            formData={formData} 
            setFormData={setFormData} 
            suppliers={suppliers}
            medicines={medicines}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-rate">
              {createMutation.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Supplier Rate</DialogTitle>
          </DialogHeader>
          <RateFormFields 
            formData={formData} 
            setFormData={setFormData} 
            suppliers={suppliers}
            medicines={medicines}
            isEdit
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
