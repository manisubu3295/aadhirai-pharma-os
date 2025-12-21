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
import { Plus, ArrowUp, ArrowDown, Filter, Package } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth } from "date-fns";

interface StockAdjustment {
  id: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  adjustmentQty: number;
  adjustmentType: string;
  reasonCode: string;
  notes: string | null;
  createdByUserId: string;
  createdByUserName: string | null;
  createdAt: string;
}

interface Medicine {
  id: number;
  name: string;
  batchNumber: string;
  quantity: number;
}

const REASON_CODES = [
  { value: "DAMAGE", label: "Damage" },
  { value: "EXPIRY", label: "Expiry" },
  { value: "THEFT", label: "Theft/Loss" },
  { value: "MANUAL_CORRECTION", label: "Manual Correction" },
  { value: "STOCK_TAKE", label: "Stock Take Variance" },
  { value: "RETURN_TO_SUPPLIER", label: "Return to Supplier" },
  { value: "FREE_SAMPLE", label: "Free Sample" }
];

const ADJUSTMENT_TYPES = [
  { value: "INCREASE", label: "Increase (+)" },
  { value: "DECREASE", label: "Decrease (-)" }
];

export default function StockAdjustments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    medicineId: "",
    batchNumber: "",
    adjustmentQty: "",
    adjustmentType: "DECREASE",
    reasonCode: "",
    notes: ""
  });
  
  const [filterReasonCode, setFilterReasonCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adjustments = [], isLoading } = useQuery<StockAdjustment[]>({
    queryKey: ["/api/stock-adjustments", filterReasonCode],
    queryFn: async () => {
      let url = `/api/stock-adjustments?`;
      if (filterReasonCode) url += `reasonCode=${filterReasonCode}&`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch stock adjustments");
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

  const createMutation = useMutation({
    mutationFn: async (data: {
      medicineId: number;
      batchNumber: string;
      adjustmentQty: number;
      adjustmentType: string;
      reasonCode: string;
      notes: string;
    }) => {
      const res = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create stock adjustment");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Stock adjustment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record stock adjustment", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      medicineId: "",
      batchNumber: "",
      adjustmentQty: "",
      adjustmentType: "DECREASE",
      reasonCode: "",
      notes: ""
    });
  };

  const handleMedicineSelect = (medicineId: string) => {
    const medicine = medicines.find(m => m.id === parseInt(medicineId));
    setFormData({
      ...formData,
      medicineId,
      batchNumber: medicine?.batchNumber || ""
    });
  };

  const handleSubmit = () => {
    if (!formData.medicineId || !formData.adjustmentQty || !formData.reasonCode) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const qty = parseInt(formData.adjustmentQty);
    const adjustedQty = formData.adjustmentType === "DECREASE" ? -Math.abs(qty) : Math.abs(qty);

    createMutation.mutate({
      medicineId: parseInt(formData.medicineId),
      batchNumber: formData.batchNumber,
      adjustmentQty: adjustedQty,
      adjustmentType: formData.adjustmentType,
      reasonCode: formData.reasonCode,
      notes: formData.notes
    });
  };

  const getReasonLabel = (code: string) => {
    return REASON_CODES.find(r => r.value === code)?.label || code;
  };

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMedicine = medicines.find(m => m.id === parseInt(formData.medicineId));

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Stock Adjustments</h1>
            <p className="text-muted-foreground">Adjust stock for damage, expiry, or corrections</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-adjustment">
            <Plus className="h-4 w-4 mr-2" />
            New Adjustment
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>Reason:</Label>
                <Select value={filterReasonCode} onValueChange={setFilterReasonCode}>
                  <SelectTrigger className="w-48" data-testid="select-filter-reason">
                    <SelectValue placeholder="All Reasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Reasons</SelectItem>
                    {REASON_CODES.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : adjustments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No stock adjustments found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Adjustment</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adjustment) => (
                    <TableRow key={adjustment.id} data-testid={`row-adjustment-${adjustment.id}`}>
                      <TableCell>{format(new Date(adjustment.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{adjustment.medicineName}</TableCell>
                      <TableCell>{adjustment.batchNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {adjustment.adjustmentQty > 0 ? (
                            <Badge className="bg-green-100 text-green-800">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              +{adjustment.adjustmentQty}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <ArrowDown className="h-3 w-3 mr-1" />
                              {adjustment.adjustmentQty}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getReasonLabel(adjustment.reasonCode)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{adjustment.notes || "-"}</TableCell>
                      <TableCell>{adjustment.createdByUserName || "Unknown"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Stock Adjustment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search Medicine *</Label>
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or batch..."
                  data-testid="input-search-medicine"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Select Medicine *</Label>
                <Select 
                  value={formData.medicineId} 
                  onValueChange={handleMedicineSelect}
                >
                  <SelectTrigger data-testid="select-medicine">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMedicines.slice(0, 50).map(medicine => (
                      <SelectItem key={medicine.id} value={String(medicine.id)}>
                        {medicine.name} - {medicine.batchNumber} (Qty: {medicine.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMedicine && (
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{selectedMedicine.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Current Stock: {selectedMedicine.quantity} | Batch: {selectedMedicine.batchNumber}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adjustment Type *</Label>
                  <Select 
                    value={formData.adjustmentType} 
                    onValueChange={(val) => setFormData({ ...formData, adjustmentType: val })}
                  >
                    <SelectTrigger data-testid="select-adjustment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADJUSTMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.adjustmentQty}
                    onChange={(e) => setFormData({ ...formData, adjustmentQty: e.target.value })}
                    placeholder="0"
                    data-testid="input-adjustment-qty"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select 
                  value={formData.reasonCode} 
                  onValueChange={(val) => setFormData({ ...formData, reasonCode: val })}
                >
                  <SelectTrigger data-testid="select-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_CODES.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  data-testid="input-adjustment-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending}
                data-testid="button-save-adjustment"
              >
                Record Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
