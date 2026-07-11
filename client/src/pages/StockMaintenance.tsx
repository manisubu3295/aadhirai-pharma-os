import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Layers,
  BarChart3,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Medicine } from "@shared/schema";

// ── Types ────────────────────────────────────────────────────────────────────

interface InventoryBatch {
  id: number;
  medicineId: number;
  medicineName: string;
  genericName: string | null;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  availableQtyBase: number;
  totalInwardQtyBase: number;
  packSize: number;
  purchaseRateSnapshot: string | null;
  mrpSnapshot: string | null;
  defaultSaleRateSnapshot: string | null;
  locationId: number | null;
}

interface StockSummary {
  medicineId: number;
  medicineName: string;
  genericName: string | null;
  manufacturer: string;
  totalAvailableQty: number;
  batchCount: number;
}

interface Location {
  id: number;
  rack: string;
  row: string;
  bin: string;
}

interface OpeningStockForm {
  medicineId: number | null;
  batchNumber: string;
  expiryDate: string;
  qtyBase: number;
  costPrice: string;
  mrp: string;
  sellingPrice: string;
  packSize: number;
  locationId: number | null;
}

const emptyForm: OpeningStockForm = {
  medicineId: null,
  batchNumber: "",
  expiryDate: "",
  qtyBase: 0,
  costPrice: "",
  mrp: "",
  sellingPrice: "",
  packSize: 10,
  locationId: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNearExpiry(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return expiry <= threeMonths && expiry > new Date();
}

function isExpired(expiryDate: string): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) <= new Date();
}

function expiryClass(expiryDate: string): string {
  if (isExpired(expiryDate)) return "text-red-600 font-medium";
  if (isNearExpiry(expiryDate)) return "text-amber-600 font-medium";
  return "";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StockMaintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"batches" | "summary">("batches");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<OpeningStockForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OpeningStockForm, string>>>({});
  const [medicineSearch, setMedicineSearch] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: batches = [], isLoading: batchesLoading } = useQuery<InventoryBatch[]>({
    queryKey: ["/api/inventory/batches"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/batches");
      if (!res.ok) throw new Error("Failed to fetch inventory batches");
      return res.json();
    },
  });

  const { data: summary = [], isLoading: summaryLoading } = useQuery<StockSummary[]>({
    queryKey: ["/api/inventory/stock-summary"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/stock-summary");
      if (!res.ok) throw new Error("Failed to fetch stock summary");
      return res.json();
    },
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const res = await fetch("/api/medicines");
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const filteredBatches = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return batches.filter(
      (b) =>
        b.medicineName.toLowerCase().includes(q) ||
        (b.genericName || "").toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q),
    );
  }, [batches, searchTerm]);

  const filteredSummary = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return summary.filter(
      (s) =>
        s.medicineName.toLowerCase().includes(q) ||
        (s.genericName || "").toLowerCase().includes(q) ||
        s.manufacturer.toLowerCase().includes(q),
    );
  }, [summary, searchTerm]);

  const filteredMedicineOptions = useMemo(() => {
    const q = medicineSearch.toLowerCase();
    return medicines
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          ((m as any).genericName || "").toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, medicineSearch]);

  // ── Mutation ──────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: OpeningStockForm) => {
      const res = await fetch("/api/inventory/opening-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: data.medicineId,
          batchNumber: data.batchNumber.trim(),
          expiryDate: data.expiryDate.trim(),
          qtyBase: data.qtyBase,
          costPrice: data.costPrice || null,
          mrp: data.mrp || null,
          sellingPrice: data.sellingPrice || null,
          packSize: data.packSize,
          locationId: data.locationId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || payload?.details || "Failed to save opening stock");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines/sale-list"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      setFormErrors({});
      setMedicineSearch("");
      toast({ title: "Opening stock saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save opening stock", description: error.message, variant: "destructive" });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleMedicineSelect = (medicineId: string) => {
    const id = Number(medicineId);
    const med = medicines.find((m) => m.id === id);
    setFormData((prev) => ({
      ...prev,
      medicineId: id,
      packSize: (med as any)?.packSize || prev.packSize,
      mrp: (med as any)?.mrp ? String((med as any).mrp) : prev.mrp,
      sellingPrice: (med as any)?.price ? String((med as any).price) : prev.sellingPrice,
      costPrice: (med as any)?.costPrice ? String((med as any).costPrice) : prev.costPrice,
    }));
  };

  const handleSubmit = () => {
    const errors: Partial<Record<keyof OpeningStockForm, string>> = {};
    if (!formData.medicineId) errors.medicineId = "Medicine is required";
    if (!formData.batchNumber.trim()) errors.batchNumber = "Batch number is required";
    if (!formData.expiryDate.trim()) errors.expiryDate = "Expiry date is required";
    if (!formData.qtyBase || formData.qtyBase <= 0) errors.qtyBase = "Quantity must be > 0";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setFormErrors({});
    createMutation.mutate(formData);
  };

  const openAddDialog = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setMedicineSearch("");
    setAddDialogOpen(true);
  };

  const selectedMedicine = medicines.find((m) => m.id === formData.medicineId);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Opening Stock Maintenance">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Opening Stock Maintenance
            </CardTitle>
            <CardDescription className="mt-1">
              Set up initial batch-level stock for medicines. Use PO &amp; GRN for all ongoing restocking.
            </CardDescription>
          </div>
          <Button size="sm" className="h-9" onClick={openAddDialog} data-testid="button-add-opening-stock">
            <Plus className="mr-2 h-4 w-4" /> Add Opening Stock
          </Button>
        </CardHeader>

        <CardContent>
          {/* Search + Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by medicine, generic, batch…"
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "batches" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("batches")}
              >
                <Package className="mr-1 h-4 w-4" /> Batch List
              </Button>
              <Button
                variant={activeTab === "summary" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("summary")}
              >
                <BarChart3 className="mr-1 h-4 w-4" /> Stock Summary
              </Button>
            </div>
          </div>

          {/* ─── Batch List Tab ─────────────────────────────────────────────── */}
          {activeTab === "batches" && (
            batchesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading batches…</div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No batches found. {searchTerm ? "Try a different search." : "Add opening stock to get started."}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Generic Name</TableHead>
                      <TableHead>Batch No.</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Available (units)</TableHead>
                      <TableHead className="text-right">Total Received</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">
                          <div>{batch.medicineName}</div>
                          <div className="text-xs text-muted-foreground">{batch.manufacturer}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {batch.genericName || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{batch.batchNumber}</TableCell>
                        <TableCell>
                          <span className={`text-xs ${expiryClass(batch.expiryDate)}`}>
                            {batch.expiryDate}
                            {isExpired(batch.expiryDate) && (
                              <AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" />
                            )}
                            {isNearExpiry(batch.expiryDate) && !isExpired(batch.expiryDate) && (
                              <AlertTriangle className="h-3 w-3 inline ml-1 text-amber-500" />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {batch.availableQtyBase}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {batch.totalInwardQtyBase}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {batch.purchaseRateSnapshot ? `₹${parseFloat(batch.purchaseRateSnapshot).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {batch.mrpSnapshot ? `₹${parseFloat(batch.mrpSnapshot).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          {batch.availableQtyBase <= 0 ? (
                            <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                          ) : isExpired(batch.expiryDate) ? (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          ) : isNearExpiry(batch.expiryDate) ? (
                            <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">Near Expiry</Badge>
                          ) : (
                            <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}

          {/* ─── Stock Summary Tab ───────────────────────────────────────────── */}
          {activeTab === "summary" && (
            summaryLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading summary…</div>
            ) : filteredSummary.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No stock found. {searchTerm ? "Try a different search." : "Add opening stock to get started."}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Generic Name</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead className="text-right">Active Batches</TableHead>
                      <TableHead className="text-right">Total Available (units)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummary.map((item) => (
                      <TableRow key={item.medicineId}>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.genericName || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.manufacturer}</TableCell>
                        <TableCell className="text-right">{item.batchCount}</TableCell>
                        <TableCell className="text-right font-semibold">{item.totalAvailableQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            {activeTab === "batches"
              ? `Showing ${filteredBatches.length} of ${batches.length} batches`
              : `Showing ${filteredSummary.length} of ${summary.length} medicines`}
          </div>
        </CardContent>
      </Card>

      {/* ── Add Opening Stock Dialog ───────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opening Stock</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Medicine selector */}
            <div>
              <Label>
                Medicine <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Search medicine by name or generic…"
                value={medicineSearch}
                onChange={(e) => setMedicineSearch(e.target.value)}
                className={`mt-1.5 mb-1 ${formErrors.medicineId ? "border-destructive" : ""}`}
              />
              {formErrors.medicineId && (
                <p className="text-xs text-destructive mb-1">{formErrors.medicineId}</p>
              )}
              {medicineSearch.trim().length > 0 && filteredMedicineOptions.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto text-sm">
                  {filteredMedicineOptions.slice(0, 20).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                        formData.medicineId === m.id ? "bg-muted font-medium" : ""
                      }`}
                      onClick={() => {
                        handleMedicineSelect(String(m.id));
                        setMedicineSearch(m.name);
                        setFormErrors((prev) => ({ ...prev, medicineId: undefined }));
                      }}
                    >
                      <span className="font-medium">{m.name}</span>
                      {(m as any).genericName && (
                        <span className="text-muted-foreground ml-2 text-xs">({(m as any).genericName})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedMedicine && (
                <p className="text-xs text-emerald-600 mt-1">
                  Selected: <strong>{selectedMedicine.name}</strong>
                  {(selectedMedicine as any).genericName && ` · ${(selectedMedicine as any).genericName}`}
                </p>
              )}
            </div>

            {/* Batch Number */}
            <div>
              <Label>
                Batch Number <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., BT-2025-001"
                value={formData.batchNumber}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, batchNumber: e.target.value }));
                  setFormErrors((prev) => ({ ...prev, batchNumber: undefined }));
                }}
                className={`mt-1.5 ${formErrors.batchNumber ? "border-destructive" : ""}`}
              />
              {formErrors.batchNumber && (
                <p className="text-xs text-destructive mt-1">{formErrors.batchNumber}</p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <Label>
                Expiry Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="month"
                value={formData.expiryDate}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, expiryDate: e.target.value }));
                  setFormErrors((prev) => ({ ...prev, expiryDate: undefined }));
                }}
                className={`mt-1.5 ${formErrors.expiryDate ? "border-destructive" : ""}`}
              />
              {formErrors.expiryDate && (
                <p className="text-xs text-destructive mt-1">{formErrors.expiryDate}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Label>
                Quantity (base units) <span className="text-destructive">*</span>
              </Label>
              <NumericInput
                min={1}
                value={formData.qtyBase}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, qtyBase: value }));
                  setFormErrors((prev) => ({ ...prev, qtyBase: undefined }));
                }}
                className={`mt-1.5 ${formErrors.qtyBase ? "border-destructive" : ""}`}
                data-testid="input-qty-base"
              />
              {formErrors.qtyBase && (
                <p className="text-xs text-destructive mt-1">{formErrors.qtyBase}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Enter the total number of individual units (tablets/vials/etc.).
              </p>
            </div>

            {/* Pack Size */}
            <div>
              <Label>Pack Size (units per strip/pack)</Label>
              <NumericInput
                min={1}
                value={formData.packSize}
                onChange={(value) => setFormData((prev) => ({ ...prev, packSize: value }))}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                e.g., 10 for a strip of 10 tablets
              </p>
            </div>

            {/* Pricing — optional */}
            <div className="border rounded-md p-3 bg-muted/30 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pricing (optional — pre-fills from medicine master if set)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Cost Price (₹)</Label>
                  <NumericInput
                    min={0}
                    allowDecimal
                    value={parseFloat(formData.costPrice) || 0}
                    onChange={(value) => setFormData((prev) => ({ ...prev, costPrice: String(value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">MRP (₹)</Label>
                  <NumericInput
                    min={0}
                    allowDecimal
                    value={parseFloat(formData.mrp) || 0}
                    onChange={(value) => setFormData((prev) => ({ ...prev, mrp: String(value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Selling Price (₹)</Label>
                  <NumericInput
                    min={0}
                    allowDecimal
                    value={parseFloat(formData.sellingPrice) || 0}
                    onChange={(value) => setFormData((prev) => ({ ...prev, sellingPrice: String(value) }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            {locations.length > 0 && (
              <div>
                <Label>Storage Location (optional)</Label>
                <Select
                  value={formData.locationId ? String(formData.locationId) : "none"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      locationId: v === "none" ? null : parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.rack} / {loc.row} / {loc.bin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save Opening Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
