import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw } from "lucide-react";

interface SaleItem {
  id: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  price: string;
  total: string;
  returnedQty: number;
}

interface SaleWithReturns {
  sale: {
    id: number;
    invoiceNo: string;
    customerName: string;
    total: string;
    paymentMethod: string;
  };
  items: SaleItem[];
  returns: any[];
}

interface ReturnItem {
  saleItemId: number;
  medicineId: number;
  quantityReturned: number;
}

interface SalesReturnDialogProps {
  saleId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesReturnDialog({ saleId, open, onOpenChange }: SalesReturnDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [refundMode, setRefundMode] = useState("cash");
  const [reason, setReason] = useState("");

  const { data: saleData, isLoading } = useQuery<SaleWithReturns>({
    queryKey: [`/api/sales/${saleId}/with-returns`],
    queryFn: async () => {
      const res = await fetch(`/api/sales/${saleId}/with-returns`);
      if (!res.ok) throw new Error("Failed to fetch sale");
      return res.json();
    },
    enabled: !!saleId && open,
  });

  useEffect(() => {
    if (saleData) {
      const initialQty: Record<number, number> = {};
      saleData.items.forEach(item => {
        initialQty[item.id] = 0;
      });
      setReturnQuantities(initialQty);
      
      if (saleData.sale.paymentMethod?.toLowerCase() === "credit") {
        setRefundMode("adjustment");
      }
    }
  }, [saleData]);

  const isCreditBill = saleData?.sale.paymentMethod?.toLowerCase() === "credit";

  const createReturnMutation = useMutation({
    mutationFn: async (data: { originalSaleId: number; refundMode: string; reason: string; items: ReturnItem[] }) => {
      const res = await fetch("/api/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create return");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${saleId}/with-returns`] });
      toast({ title: "Return saved, stock updated" });
      onOpenChange(false);
      setReturnQuantities({});
      setReason("");
      setRefundMode("cash");
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleQuantityChange = (itemId: number, value: string) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleSubmit = () => {
    if (!saleId || !saleData) return;

    const items: ReturnItem[] = saleData.items
      .filter(item => (returnQuantities[item.id] || 0) > 0)
      .map(item => ({
        saleItemId: item.id,
        medicineId: item.medicineId,
        quantityReturned: returnQuantities[item.id],
      }));

    if (items.length === 0) {
      toast({ title: "Please select at least one item to return", variant: "destructive" });
      return;
    }

    for (const item of items) {
      const saleItem = saleData.items.find(i => i.id === item.saleItemId);
      if (saleItem) {
        const maxReturnable = saleItem.quantity - saleItem.returnedQty;
        if (item.quantityReturned > maxReturnable) {
          toast({ 
            title: `Cannot return ${item.quantityReturned} of ${saleItem.medicineName}. Max: ${maxReturnable}`, 
            variant: "destructive" 
          });
          return;
        }
      }
    }

    createReturnMutation.mutate({
      originalSaleId: saleId,
      refundMode,
      reason,
      items,
    });
  };

  const totalRefund = saleData?.items.reduce((sum, item) => {
    const qty = returnQuantities[item.id] || 0;
    return sum + qty * parseFloat(item.price);
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Sales Return / Refund
          </DialogTitle>
          <DialogDescription>
            {saleData && `Invoice: ${saleData.sale.invoiceNo || `INV-${saleData.sale.id}`} | Customer: ${saleData.sale.customerName}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">Loading invoice details...</div>
        ) : saleData ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Sold Qty</TableHead>
                  <TableHead className="text-right">Already Returned</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleData.items.map((item) => {
                  const maxReturnable = item.quantity - item.returnedQty;
                  const returnQty = returnQuantities[item.id] || 0;
                  const lineTotal = returnQty * parseFloat(item.price);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medicineName}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.returnedQty}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={maxReturnable}
                          value={returnQty}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-20 ml-auto text-right"
                          disabled={maxReturnable === 0}
                          data-testid={`input-return-qty-${item.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{lineTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Refund Mode</Label>
                <Select 
                  value={refundMode} 
                  onValueChange={setRefundMode}
                  disabled={isCreditBill}
                >
                  <SelectTrigger data-testid="select-refund-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!isCreditBill && (
                      <>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </>
                    )}
                    <SelectItem value="adjustment">Credit Adjustment</SelectItem>
                  </SelectContent>
                </Select>
                {isCreditBill && (
                  <p className="text-xs text-amber-600 mt-1">
                    This is a credit bill; refund will be adjusted in credit, not paid in cash.
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <div className="w-full text-right">
                  <span className="text-sm text-muted-foreground">Total Refund:</span>
                  <p className="text-2xl font-bold text-primary">₹{totalRefund.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for return..."
                className="mt-1"
                data-testid="input-return-reason"
              />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">No data found</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createReturnMutation.isPending || totalRefund === 0}
            data-testid="button-submit-return"
          >
            {createReturnMutation.isPending ? "Processing..." : "Process Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
