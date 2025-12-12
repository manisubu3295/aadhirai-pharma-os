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
import { Search, Plus, Eye, Package, Truck, CheckCircle2, Calendar, Printer, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfDay, startOfDay, parseISO } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";
import type { Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem } from "@shared/schema";

interface GRNItem {
  poItemId?: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  rate: string;
  mrp: string;
  gstRate: string;
  pendingQty?: number;
  locationId?: number;
}

export default function GoodsReceipts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null);
  const [grnItems, setGRNItems] = useState<GoodsReceiptItem[]>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedPOId, setSelectedPOId] = useState<string>("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [items, setItems] = useState<GRNItem[]>([]);
  
  const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

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

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
    queryFn: async () => {
      const response = await fetch("/api/purchase-orders");
      if (!response.ok) throw new Error("Failed to fetch purchase orders");
      return response.json();
    },
  });

  const { data: goodsReceipts = [], isLoading } = useQuery<GoodsReceipt[]>({
    queryKey: ["/api/goods-receipts"],
    queryFn: async () => {
      const response = await fetch("/api/goods-receipts");
      if (!response.ok) throw new Error("Failed to fetch goods receipts");
      return response.json();
    },
  });

  const { data: locations = [] } = useQuery<{ id: number; rack: string; row: string; bin: string }[]>({
    queryKey: ["/api/locations"],
  });

  const openPOs = purchaseOrders.filter(po => 
    po.status === "Issued" || po.status === "PartiallyReceived"
  );

  const supplierPOs = openPOs.filter(po => 
    !selectedSupplierId || po.supplierId === parseInt(selectedSupplierId)
  );

  const createMutation = useMutation({
    mutationFn: async (data: { 
      supplierId: number; 
      supplierName: string; 
      poId?: number;
      supplierInvoiceNo: string;
      items: GRNItem[] 
    }) => {
      const grnNumber = `GRN-${Date.now()}`;
      const subtotal = data.items.reduce((sum, item) => sum + (parseFloat(item.rate) * item.quantity), 0);
      const taxAmount = data.items.reduce((sum, item) => {
        const lineTotal = parseFloat(item.rate) * item.quantity;
        return sum + (lineTotal * parseFloat(item.gstRate || "18") / 100);
      }, 0);
      
      const res = await fetch("/api/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grnNumber,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          poId: data.poId || null,
          supplierInvoiceNo: data.supplierInvoiceNo || null,
          status: "Completed",
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: (subtotal + taxAmount).toFixed(2),
          items: data.items.map(item => ({
            poItemId: item.poItemId || null,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            rate: item.rate,
            mrp: item.mrp || null,
            gstRate: item.gstRate || "18",
            taxAmount: ((parseFloat(item.rate) * item.quantity) * parseFloat(item.gstRate || "18") / 100).toFixed(2),
            totalAmount: (parseFloat(item.rate) * item.quantity * (1 + parseFloat(item.gstRate || "18") / 100)).toFixed(2),
            locationId: item.locationId || null,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create goods receipt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goods-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: "Goods receipt created and inventory updated" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedSupplierId("");
    setSelectedPOId("");
    setSupplierInvoiceNo("");
    setItems([]);
  };

  const loadFromPO = async () => {
    if (!selectedPOId) return;
    const res = await fetch(`/api/purchase-orders/${selectedPOId}/items`);
    if (!res.ok) return;
    const poItems: PurchaseOrderItem[] = await res.json();
    
    const newItems: GRNItem[] = poItems
      .filter(item => item.quantity > item.receivedQty)
      .map(item => ({
        poItemId: item.id,
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchNumber: "",
        expiryDate: "",
        quantity: item.quantity - item.receivedQty,
        rate: item.rate,
        mrp: item.mrp || "",
        gstRate: item.gstRate || "18",
        pendingQty: item.quantity - item.receivedQty,
      }));
    
    setItems(newItems);
    
    const po = purchaseOrders.find(p => p.id === parseInt(selectedPOId));
    if (po) {
      setSelectedSupplierId(po.supplierId.toString());
    }
    
    toast({ title: `Loaded ${newItems.length} pending items from PO` });
  };

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!selectedSupplierId) {
      toast({ title: "Please select a supplier", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }
    
    const invalidItems = items.filter(item => !item.batchNumber || !item.expiryDate);
    if (invalidItems.length > 0) {
      toast({ title: "Please fill batch number and expiry date for all items", variant: "destructive" });
      return;
    }
    
    const supplier = suppliers.find(s => s.id === parseInt(selectedSupplierId));
    createMutation.mutate({
      supplierId: parseInt(selectedSupplierId),
      supplierName: supplier?.name || "",
      poId: selectedPOId ? parseInt(selectedPOId) : undefined,
      supplierInvoiceNo,
      items,
    });
  };

  const viewGRN = async (grn: GoodsReceipt) => {
    setSelectedGRN(grn);
    const res = await fetch(`/api/goods-receipts/${grn.id}/items`);
    if (res.ok) {
      const items = await res.json();
      setGRNItems(items);
    }
    setViewDialogOpen(true);
  };

  const filteredReceipts = goodsReceipts.filter((grn) => {
    const matchesSearch = searchTerm === "" || 
      grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grn.supplierInvoiceNo && grn.supplierInvoiceNo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const grnDate = new Date(grn.receiptDate);
    const from = fromDate ? startOfDay(parseISO(fromDate)) : null;
    const to = toDate ? endOfDay(parseISO(toDate)) : null;
    const matchesDateRange = (!from || grnDate >= from) && (!to || grnDate <= to);
    
    const matchesStatus = statusFilter === "all" || grn.status === statusFilter;
    const matchesSupplier = supplierFilter === "all" || grn.supplierId.toString() === supplierFilter;
    
    return matchesSearch && matchesDateRange && matchesStatus && matchesSupplier;
  });

  const handleExportGRNs = () => {
    const exportData = filteredReceipts.map(grn => ({
      "GRN Number": grn.grnNumber,
      "Receipt Date": format(new Date(grn.receiptDate), "dd/MM/yyyy"),
      "Supplier": grn.supplierName,
      "Supplier Invoice": grn.supplierInvoiceNo || "",
      "Status": grn.status,
      "Subtotal": grn.subtotal,
      "Tax": grn.taxAmount,
      "Total": grn.totalAmount,
    }));
    exportToCSV(exportData, `goods_receipts_${format(new Date(), "yyyyMMdd")}`);
    toast({ title: "Goods Receipts exported successfully" });
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.rate || "0") * item.quantity), 0);
    const tax = items.reduce((sum, item) => {
      const lineTotal = parseFloat(item.rate || "0") * item.quantity;
      return sum + (lineTotal * parseFloat(item.gstRate || "18") / 100);
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  };

  const totals = calculateTotal();

  return (
    <AppLayout title="Goods Receipts">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total GRNs</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-grns">
                  {goodsReceipts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {goodsReceipts.filter(g => g.status === "Completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending POs</p>
                <p className="text-2xl font-bold text-purple-600">
                  {openPOs.length}
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
              <CardTitle>Goods Receipts</CardTitle>
              <CardDescription>Record goods received and update inventory</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }} data-testid="button-create-grn">
                <Plus className="h-4 w-4 mr-2" />
                Create GRN
              </Button>
              <Button variant="outline" onClick={handleExportGRNs} data-testid="button-export-grns">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search GRN number, supplier..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-grns"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">From:</Label>
              <Input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
                data-testid="input-grn-from-date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">To:</Label>
              <Input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
                data-testid="input-grn-to-date"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-grn-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-40" data-testid="select-grn-supplier">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No goods receipts found</p>
              <p className="text-sm">Create a GRN to record goods received and update inventory</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Receipt Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((grn) => (
                    <TableRow key={grn.id} data-testid={`row-grn-${grn.id}`}>
                      <TableCell className="font-mono font-medium">{grn.grnNumber}</TableCell>
                      <TableCell>{grn.supplierName}</TableCell>
                      <TableCell>{grn.supplierInvoiceNo || "-"}</TableCell>
                      <TableCell>{format(new Date(grn.receiptDate), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right font-mono">₹{grn.totalAmount}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {grn.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => viewGRN(grn)} data-testid={`button-view-grn-${grn.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Goods Receipt Note</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Select PO (Optional)</Label>
                <div className="flex gap-2">
                  <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                    <SelectTrigger className="flex-1 min-w-0" data-testid="select-grn-po">
                      <SelectValue placeholder="Select PO" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierPOs.map((po) => (
                        <SelectItem key={po.id} value={po.id.toString()}>
                          {po.poNumber} - {po.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadFromPO} disabled={!selectedPOId} className="shrink-0" data-testid="button-load-po">
                    Load
                  </Button>
                </div>
              </div>
              <div>
                <Label>Supplier *</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger data-testid="select-grn-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supplier Invoice No.</Label>
                <Input 
                  value={supplierInvoiceNo} 
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)} 
                  placeholder="Invoice number"
                  data-testid="input-grn-invoice"
                />
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="w-28">Batch No. *</TableHead>
                      <TableHead className="w-32">Expiry *</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-24">Rate</TableHead>
                      <TableHead className="w-32">Location</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.medicineName}</span>
                            {item.pendingQty && (
                              <span className="text-xs text-muted-foreground ml-2">(Pending: {item.pendingQty})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.batchNumber}
                            onChange={(e) => updateItem(index, "batchNumber", e.target.value)}
                            placeholder="Batch"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="month"
                            value={item.expiryDate}
                            onChange={(e) => updateItem(index, "expiryDate", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            min={1}
                            max={item.pendingQty}
                            value={item.quantity}
                            onChange={(value) => updateItem(index, "quantity", value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            min={0}
                            allowDecimal={true}
                            value={parseFloat(item.rate) || 0}
                            onChange={(value) => updateItem(index, "rate", String(value))}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.locationId?.toString() || ""}
                            onValueChange={(v) => updateItem(index, "locationId", v ? parseInt(v) : undefined)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map(loc => (
                                <SelectItem key={loc.id} value={loc.id.toString()}>
                                  {loc.rack}/{loc.row}/{loc.bin}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{(parseFloat(item.rate || "0") * item.quantity * (1 + parseFloat(item.gstRate || "18") / 100)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-mono">₹{totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="font-mono">₹{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a PO and click Load to add items</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-grn">
              {createMutation.isPending ? "Creating..." : "Create GRN & Update Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Goods Receipt Details - {selectedGRN?.grnNumber}</DialogTitle>
          </DialogHeader>
          {selectedGRN && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedGRN.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice No:</span>
                  <p className="font-medium">{selectedGRN.supplierInvoiceNo || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Receipt Date:</span>
                  <p className="font-medium">{format(new Date(selectedGRN.receiptDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p><Badge className="bg-green-100 text-green-800">{selectedGRN.status}</Badge></p>
                </div>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.medicineName}</TableCell>
                        <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                        <TableCell>{item.expiryDate}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">₹{item.rate}</TableCell>
                        <TableCell className="text-right font-mono">₹{item.totalAmount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{selectedGRN.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-mono">₹{selectedGRN.taxAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="font-mono">₹{selectedGRN.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              const printWindow = window.open("", "_blank");
              if (!printWindow) return;
              
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Goods Receipt - ${selectedGRN?.grnNumber}</title>
                    <style>
                      body { margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 12px; }
                      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f3f4f6; }
                      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                      .header h1 { margin: 0 0 5px 0; }
                      .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; }
                      .text-right { text-align: right; }
                      .totals { margin-top: 16px; text-align: right; }
                      .totals div { margin: 4px 0; }
                      .total-line { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 8px; }
                      @media print {
                        body { margin: 0; padding: 10mm; }
                        @page { margin: 10mm; size: A4; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>Aadhirai Innovations Pharmacy</h1>
                      <p>123 Main Street, Chennai, Tamil Nadu - 600001</p>
                      <h2>GOODS RECEIPT NOTE</h2>
                    </div>
                    <div class="info-grid">
                      <div>
                        <p><strong>GRN Number:</strong> ${selectedGRN?.grnNumber}</p>
                        <p><strong>Receipt Date:</strong> ${selectedGRN ? format(new Date(selectedGRN.receiptDate), "dd MMM yyyy") : ""}</p>
                        <p><strong>Status:</strong> ${selectedGRN?.status}</p>
                      </div>
                      <div class="text-right">
                        <p><strong>Supplier:</strong> ${selectedGRN?.supplierName}</p>
                        ${selectedGRN?.supplierInvoiceNo ? `<p><strong>Invoice No:</strong> ${selectedGRN.supplierInvoiceNo}</p>` : ""}
                        ${selectedGRN?.poId ? `<p><strong>PO ID:</strong> ${selectedGRN.poId}</p>` : ""}
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Batch</th>
                          <th>Expiry</th>
                          <th class="text-right">Qty</th>
                          <th class="text-right">Rate</th>
                          <th class="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${grnItems.map(item => `
                          <tr>
                            <td>${item.medicineName}</td>
                            <td>${item.batchNumber}</td>
                            <td>${item.expiryDate}</td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">₹${item.rate}</td>
                            <td class="text-right">₹${item.totalAmount}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                    <div class="totals">
                      <div>Subtotal: ₹${selectedGRN?.subtotal}</div>
                      <div>Tax: ₹${selectedGRN?.taxAmount}</div>
                      <div class="total-line">Total: ₹${selectedGRN?.totalAmount}</div>
                    </div>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
                printWindow.close();
              }, 250);
            }} data-testid="button-print-grn">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
