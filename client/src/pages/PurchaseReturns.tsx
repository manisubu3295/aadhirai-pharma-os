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
import { Search, Plus, Eye, RotateCcw, Package, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import type { Supplier, GoodsReceipt, GoodsReceiptItem, PurchaseReturn, PurchaseReturnItem } from "@shared/schema";

interface ReturnItem {
  grnItemId?: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  quantityReturned: number;
  rate: string;
  gstRate: string;
}

export default function PurchaseReturns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedGRNId, setSelectedGRNId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([]);
  
  const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

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

  const { data: goodsReceipts = [] } = useQuery<GoodsReceipt[]>({
    queryKey: ["/api/goods-receipts"],
    queryFn: async () => {
      const response = await fetch("/api/goods-receipts");
      if (!response.ok) throw new Error("Failed to fetch goods receipts");
      return response.json();
    },
  });

  const { data: purchaseReturns = [], isLoading } = useQuery<PurchaseReturn[]>({
    queryKey: ["/api/purchase-returns"],
    queryFn: async () => {
      const response = await fetch("/api/purchase-returns");
      if (!response.ok) throw new Error("Failed to fetch purchase returns");
      return response.json();
    },
  });

  const supplierGRNs = goodsReceipts.filter(grn => 
    !selectedSupplierId || grn.supplierId === parseInt(selectedSupplierId)
  );

  const createMutation = useMutation({
    mutationFn: async (data: { 
      supplierId: number; 
      supplierName: string; 
      originalGrnId?: number;
      reason: string;
      items: ReturnItem[] 
    }) => {
      const returnNumber = `PRN-${Date.now()}`;
      const subtotal = data.items.reduce((sum, item) => sum + (parseFloat(item.rate) * item.quantityReturned), 0);
      const taxAmount = data.items.reduce((sum, item) => {
        const lineTotal = parseFloat(item.rate) * item.quantityReturned;
        return sum + (lineTotal * parseFloat(item.gstRate || "18") / 100);
      }, 0);
      
      const res = await fetch("/api/purchase-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnNumber,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          originalGrnId: data.originalGrnId || null,
          reason: data.reason || null,
          status: "Completed",
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: (subtotal + taxAmount).toFixed(2),
          items: data.items.map(item => ({
            grnItemId: item.grnItemId || null,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            quantityReturned: item.quantityReturned,
            rate: item.rate,
            gstRate: item.gstRate || "18",
            taxAmount: ((parseFloat(item.rate) * item.quantityReturned) * parseFloat(item.gstRate || "18") / 100).toFixed(2),
            totalAmount: (parseFloat(item.rate) * item.quantityReturned * (1 + parseFloat(item.gstRate || "18") / 100)).toFixed(2),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create purchase return");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: "Purchase return created and inventory updated" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedSupplierId("");
    setSelectedGRNId("");
    setReason("");
    setItems([]);
  };

  const loadFromGRN = async () => {
    if (!selectedGRNId) return;
    const res = await fetch(`/api/goods-receipts/${selectedGRNId}/items`);
    if (!res.ok) return;
    const grnItems: GoodsReceiptItem[] = await res.json();
    
    const newItems: ReturnItem[] = grnItems.map(item => ({
      grnItemId: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      availableQty: item.quantity,
      quantityReturned: 0,
      rate: item.rate,
      gstRate: item.gstRate || "18",
    }));
    
    setItems(newItems);
    
    const grn = goodsReceipts.find(g => g.id === parseInt(selectedGRNId));
    if (grn) {
      setSelectedSupplierId(grn.supplierId.toString());
    }
    
    toast({ title: `Loaded ${newItems.length} items from GRN` });
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!selectedSupplierId) {
      toast({ title: "Please select a supplier", variant: "destructive" });
      return;
    }
    
    const itemsToReturn = items.filter(item => item.quantityReturned > 0);
    if (itemsToReturn.length === 0) {
      toast({ title: "Please enter quantity to return for at least one item", variant: "destructive" });
      return;
    }
    
    const supplier = suppliers.find(s => s.id === parseInt(selectedSupplierId));
    createMutation.mutate({
      supplierId: parseInt(selectedSupplierId),
      supplierName: supplier?.name || "",
      originalGrnId: selectedGRNId ? parseInt(selectedGRNId) : undefined,
      reason,
      items: itemsToReturn,
    });
  };

  const viewReturn = async (pr: PurchaseReturn) => {
    setSelectedReturn(pr);
    const res = await fetch(`/api/purchase-returns/${pr.id}/items`);
    if (res.ok) {
      const items = await res.json();
      setReturnItems(items);
    }
    setViewDialogOpen(true);
  };

  const filteredReturns = purchaseReturns.filter((pr) => {
    const matchesSearch = searchTerm === "" || 
      pr.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const returnDate = new Date(pr.returnDate);
    const from = fromDate ? startOfDay(parseISO(fromDate)) : null;
    const to = toDate ? endOfDay(parseISO(toDate)) : null;
    const matchesDateRange = (!from || returnDate >= from) && (!to || returnDate <= to);
    
    return matchesSearch && matchesDateRange;
  });

  const calculateTotal = () => {
    const itemsToReturn = items.filter(item => item.quantityReturned > 0);
    const subtotal = itemsToReturn.reduce((sum, item) => sum + (parseFloat(item.rate || "0") * item.quantityReturned), 0);
    const tax = itemsToReturn.reduce((sum, item) => {
      const lineTotal = parseFloat(item.rate || "0") * item.quantityReturned;
      return sum + (lineTotal * parseFloat(item.gstRate || "18") / 100);
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  };

  const totals = calculateTotal();

  return (
    <AppLayout title="Purchase Returns">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <RotateCcw className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Returns</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-total-returns">
                  {purchaseReturns.length}
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
                  {purchaseReturns.filter(pr => pr.status === "Completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{purchaseReturns.reduce((sum, pr) => sum + parseFloat(pr.totalAmount || "0"), 0).toLocaleString()}
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
              <CardTitle>Purchase Returns</CardTitle>
              <CardDescription>Return goods to suppliers and update inventory</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }} data-testid="button-create-return">
              <Plus className="h-4 w-4 mr-2" />
              Create Return
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search return number, supplier..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-returns"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">From:</Label>
              <Input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
                data-testid="input-return-from-date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">To:</Label>
              <Input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
                data-testid="input-return-to-date"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No purchase returns found</p>
              <p className="text-sm">Create a return to send goods back to supplier</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((pr) => (
                    <TableRow key={pr.id} data-testid={`row-return-${pr.id}`}>
                      <TableCell className="font-mono font-medium">{pr.returnNumber}</TableCell>
                      <TableCell>{pr.supplierName}</TableCell>
                      <TableCell>{format(new Date(pr.returnDate), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right font-mono">₹{pr.totalAmount}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => viewReturn(pr)} data-testid={`button-view-return-${pr.id}`}>
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
            <DialogTitle>Create Purchase Return</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Select GRN (Optional)</Label>
                <div className="flex gap-2">
                  <Select value={selectedGRNId} onValueChange={setSelectedGRNId}>
                    <SelectTrigger className="flex-1 min-w-0" data-testid="select-return-grn">
                      <SelectValue placeholder="Select GRN" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierGRNs.map((grn) => (
                        <SelectItem key={grn.id} value={grn.id.toString()}>
                          {grn.grnNumber} - {grn.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadFromGRN} disabled={!selectedGRNId} className="shrink-0" data-testid="button-load-grn">
                    Load
                  </Button>
                </div>
              </div>
              <div>
                <Label>Supplier *</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger data-testid="select-return-supplier">
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
                <Label>Reason for Return</Label>
                <Input 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="e.g. Damaged goods, Near expiry"
                  data-testid="input-return-reason"
                />
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="w-24">Return Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                        <TableCell>{item.expiryDate}</TableCell>
                        <TableCell className="text-right">{item.availableQty}</TableCell>
                        <TableCell>
                          <NumericInput
                            min={0}
                            max={item.availableQty}
                            value={item.quantityReturned}
                            onChange={(value) => updateItem(index, "quantityReturned", value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">₹{item.rate}</TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{(parseFloat(item.rate || "0") * item.quantityReturned * (1 + parseFloat(item.gstRate || "18") / 100)).toFixed(2)}
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
                <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a GRN and click Load to add items for return</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-return">
              {createMutation.isPending ? "Creating..." : "Create Return & Update Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Purchase Return Details - {selectedReturn?.returnNumber}</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedReturn.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Return Date:</span>
                  <p className="font-medium">{format(new Date(selectedReturn.returnDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason:</span>
                  <p className="font-medium">{selectedReturn.reason || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p><Badge className="bg-green-100 text-green-800">{selectedReturn.status}</Badge></p>
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
                    {returnItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.medicineName}</TableCell>
                        <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                        <TableCell>{item.expiryDate}</TableCell>
                        <TableCell className="text-right">{item.quantityReturned}</TableCell>
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
                    <span className="font-mono">₹{selectedReturn.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-mono">₹{selectedReturn.taxAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="font-mono">₹{selectedReturn.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
