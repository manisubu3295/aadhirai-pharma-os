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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Search, Plus, Eye, FileText, ShoppingCart, Clock, CheckCircle2, XCircle, Truck, Send, Printer } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Supplier, Medicine, PurchaseOrder, PurchaseOrderItem, SupplierRate } from "@shared/schema";

interface POItem {
  medicineId: number;
  medicineName: string;
  quantity: number;
  rate: string;
  mrp: string;
  gstRate: string;
  discountPercent: string;
  supplierRateId?: number;
}

const statusColors: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800",
  Issued: "bg-blue-100 text-blue-800",
  PartiallyReceived: "bg-yellow-100 text-yellow-800",
  Received: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  Draft: <FileText className="w-3 h-3 mr-1" />,
  Issued: <Send className="w-3 h-3 mr-1" />,
  PartiallyReceived: <Clock className="w-3 h-3 mr-1" />,
  Received: <CheckCircle2 className="w-3 h-3 mr-1" />,
  Cancelled: <XCircle className="w-3 h-3 mr-1" />,
};

export default function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPOItems] = useState<PurchaseOrderItem[]>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [poMode, setPOMode] = useState<"direct" | "rates">("direct");
  const [items, setItems] = useState<POItem[]>([]);
  const [notes, setNotes] = useState("");

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

  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
    queryFn: async () => {
      const response = await fetch("/api/purchase-orders");
      if (!response.ok) throw new Error("Failed to fetch purchase orders");
      return response.json();
    },
  });

  const { data: supplierRates = [] } = useQuery<SupplierRate[]>({
    queryKey: ["/api/supplier-rates", selectedSupplierId],
    queryFn: async () => {
      if (!selectedSupplierId) return [];
      const response = await fetch(`/api/suppliers/${selectedSupplierId}/rates`);
      if (!response.ok) throw new Error("Failed to fetch supplier rates");
      return response.json();
    },
    enabled: !!selectedSupplierId && poMode === "rates",
  });

  const createMutation = useMutation({
    mutationFn: async (data: { supplierId: number; supplierName: string; notes: string; items: POItem[] }) => {
      const poNumber = `PO-${Date.now()}`;
      const subtotal = data.items.reduce((sum, item) => sum + (parseFloat(item.rate) * item.quantity), 0);
      const taxAmount = data.items.reduce((sum, item) => {
        const lineTotal = parseFloat(item.rate) * item.quantity;
        return sum + (lineTotal * parseFloat(item.gstRate || "18") / 100);
      }, 0);
      
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNumber,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          notes: data.notes,
          status: "Draft",
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: (subtotal + taxAmount).toFixed(2),
          items: data.items.map(item => ({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            quantity: item.quantity,
            rate: item.rate,
            mrp: item.mrp || null,
            gstRate: item.gstRate || "18",
            discountPercent: item.discountPercent || "0",
            supplierRateId: item.supplierRateId || null,
            taxAmount: ((parseFloat(item.rate) * item.quantity) * parseFloat(item.gstRate || "18") / 100).toFixed(2),
            totalAmount: (parseFloat(item.rate) * item.quantity * (1 + parseFloat(item.gstRate || "18") / 100)).toFixed(2),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create purchase order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setCreateDialogOpen(false);
      resetForm();
      toast({ title: "Purchase order created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/purchase-orders/${id}/issue`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to issue purchase order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ title: "Purchase order issued successfully" });
    },
    onError: () => {
      toast({ title: "Failed to issue purchase order", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedSupplierId("");
    setPOMode("direct");
    setItems([]);
    setNotes("");
  };

  const loadFromRates = () => {
    if (!supplierRates.length) return;
    const newItems: POItem[] = supplierRates.map(rate => {
      const medicine = medicines.find(m => m.id === rate.medicineId);
      return {
        medicineId: rate.medicineId,
        medicineName: medicine?.name || "Unknown",
        quantity: rate.minOrderQty || 1,
        rate: rate.rate,
        mrp: rate.mrp || "",
        gstRate: rate.gstRate || "18",
        discountPercent: rate.discountPercent || "0",
        supplierRateId: rate.id,
      };
    });
    setItems(newItems);
    toast({ title: `Loaded ${newItems.length} items from supplier rate master` });
  };

  const addDirectItem = () => {
    setItems([...items, {
      medicineId: 0,
      medicineName: "",
      quantity: 1,
      rate: "",
      mrp: "",
      gstRate: "18",
      discountPercent: "0",
    }]);
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "medicineId") {
      const medicine = medicines.find(m => m.id === value);
      if (medicine) {
        newItems[index].medicineName = medicine.name;
        newItems[index].rate = medicine.costPrice || medicine.price;
        newItems[index].mrp = medicine.mrp || "";
        newItems[index].gstRate = medicine.gstRate || "18";
      }
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
    const supplier = suppliers.find(s => s.id === parseInt(selectedSupplierId));
    createMutation.mutate({
      supplierId: parseInt(selectedSupplierId),
      supplierName: supplier?.name || "",
      notes,
      items,
    });
  };

  const viewPO = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    const res = await fetch(`/api/purchase-orders/${po.id}/items`);
    if (res.ok) {
      const items = await res.json();
      setPOItems(items);
    }
    setViewDialogOpen(true);
  };

  const filteredOrders = purchaseOrders.filter((po) =>
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <AppLayout title="Purchase Orders">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total POs</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-pos">
                  {purchaseOrders.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {purchaseOrders.filter(p => p.status === "Draft").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Send className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issued</p>
                <p className="text-2xl font-bold text-purple-600">
                  {purchaseOrders.filter(p => p.status === "Issued").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold text-green-600">
                  {purchaseOrders.filter(p => p.status === "Received").length}
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
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage purchase orders to suppliers</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search POs..." 
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-pos"
                />
              </div>
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }} data-testid="button-create-po">
                <Plus className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No purchase orders found</p>
              <p className="text-sm">Create your first purchase order to start ordering from suppliers</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((po) => (
                    <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                      <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{format(new Date(po.orderDate), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right font-mono">₹{po.totalAmount}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[po.status]}>
                          {statusIcons[po.status]}
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => viewPO(po)} data-testid={`button-view-po-${po.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status === "Draft" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => issueMutation.mutate(po.id)}
                              data-testid={`button-issue-po-${po.id}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier *</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger data-testid="select-po-supplier">
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
                <Label>Notes</Label>
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Optional notes"
                  data-testid="input-po-notes"
                />
              </div>
            </div>

            <Tabs value={poMode} onValueChange={(v) => setPOMode(v as "direct" | "rates")}>
              <TabsList>
                <TabsTrigger value="direct" data-testid="tab-direct-po">Direct Entry</TabsTrigger>
                <TabsTrigger value="rates" data-testid="tab-rates-po">Load from Rate Master</TabsTrigger>
              </TabsList>
              <TabsContent value="direct" className="space-y-4">
                <Button variant="outline" onClick={addDirectItem} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </TabsContent>
              <TabsContent value="rates" className="space-y-4">
                <Button 
                  variant="outline" 
                  onClick={loadFromRates} 
                  disabled={!selectedSupplierId || supplierRates.length === 0}
                  data-testid="button-load-rates"
                >
                  Load Supplier Rates ({supplierRates.length} items)
                </Button>
              </TabsContent>
            </Tabs>

            {items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-28">Rate</TableHead>
                      <TableHead className="w-24">GST %</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {poMode === "rates" ? (
                            <span>{item.medicineName}</span>
                          ) : (
                            <Select
                              value={item.medicineId.toString()}
                              onValueChange={(v) => updateItem(index, "medicineId", parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select medicine" />
                              </SelectTrigger>
                              <SelectContent>
                                {medicines.map((m) => (
                                  <SelectItem key={m.id} value={m.id.toString()}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            min={1}
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
                            value={item.gstRate}
                            onValueChange={(v) => updateItem(index, "gstRate", v)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{(parseFloat(item.rate || "0") * item.quantity * (1 + parseFloat(item.gstRate || "18") / 100)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-po">
              {createMutation.isPending ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details - {selectedPO?.poNumber}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedPO.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Order Date:</span>
                  <p className="font-medium">{format(new Date(selectedPO.orderDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p><Badge className={statusColors[selectedPO.status]}>{selectedPO.status}</Badge></p>
                </div>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.medicineName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">₹{item.rate}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.receivedQty >= item.quantity ? "default" : "secondary"}>
                            {item.receivedQty} / {item.quantity}
                          </Badge>
                        </TableCell>
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
                    <span className="font-mono">₹{selectedPO.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-mono">₹{selectedPO.taxAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="font-mono">₹{selectedPO.totalAmount}</span>
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
                    <title>Purchase Order - ${selectedPO?.poNumber}</title>
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
                      <h2>PURCHASE ORDER</h2>
                    </div>
                    <div class="info-grid">
                      <div>
                        <p><strong>PO Number:</strong> ${selectedPO?.poNumber}</p>
                        <p><strong>Date:</strong> ${selectedPO ? format(new Date(selectedPO.orderDate), "dd MMM yyyy") : ""}</p>
                        <p><strong>Status:</strong> ${selectedPO?.status}</p>
                      </div>
                      <div class="text-right">
                        <p><strong>Supplier:</strong> ${selectedPO?.supplierName}</p>
                        ${selectedPO?.expectedDeliveryDate ? `<p><strong>Expected:</strong> ${format(new Date(selectedPO.expectedDeliveryDate), "dd MMM yyyy")}</p>` : ""}
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th class="text-right">Qty</th>
                          <th class="text-right">Rate</th>
                          <th class="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${poItems.map(item => `
                          <tr>
                            <td>${item.medicineName}</td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">₹${item.rate}</td>
                            <td class="text-right">₹${item.totalAmount}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                    <div class="totals">
                      <div>Subtotal: ₹${selectedPO?.subtotal}</div>
                      <div>Tax: ₹${selectedPO?.taxAmount}</div>
                      <div class="total-line">Total: ₹${selectedPO?.totalAmount}</div>
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
            }} data-testid="button-print-po">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
