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
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { SalePayment } from "@shared/schema";
import { getSaleCreditPortion } from "@shared/salePayments";
import { computeReturnRefund } from "@shared/salesReturns";

interface SaleItem {
  id: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  price: string;
  total: string;
  returnedQty: number;
  unitType: string;
  packSize: number;
}

const humanizeUnit = (unit: string): string => {
  const normalized = (unit || "").toUpperCase();
  const labels: Record<string, string> = {
    STRIP: "Strip", TABLET: "Tablet", CAPSULE: "Capsule", PACK: "Pack",
    BOTTLE: "Bottle", VIAL: "Vial", TUBE: "Tube", SACHET: "Sachet", PIECE: "Piece",
  };
  return labels[normalized] || (normalized.charAt(0) + normalized.slice(1).toLowerCase());
};

interface SaleWithReturns {
  sale: {
    id: number;
    invoiceNo: string;
    customerName: string;
    customerId?: number | null;
    total: string;
    paymentMethod: string;
    receivedAmount: string;
    payments?: SalePayment[];
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
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [returnUnits, setReturnUnits] = useState<Record<number, "PACK" | "BASE">>({});
  const [refundMode, setRefundMode] = useState("cash");
  const [reason, setReason] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);

  const printRefundReceipt = (refundId: number, invoiceNo: string, refundAmount: number, refundModeUsed: string, reasonText: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Refund Receipt - RET-${refundId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          .details { margin-bottom: 20px; }
          .details table { width: 100%; }
          .details td { padding: 5px 0; font-size: 14px; }
          .details td:first-child { font-weight: bold; width: 40%; }
          .amount { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; margin: 20px 0; }
          .amount .label { font-size: 12px; color: #666; }
          .amount .value { font-size: 24px; font-weight: bold; color: #dc2626; }
          .footer { text-align: center; font-size: 11px; color: #999; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }
          @media print {
            body { margin: 0; padding: 10mm; }
            @page { margin: 10mm; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REFUND RECEIPT</h1>
          <p>RET-${refundId}</p>
        </div>
        <div class="details">
          <table>
            <tr>
              <td>Original Invoice:</td>
              <td>${invoiceNo}</td>
            </tr>
            <tr>
              <td>Date:</td>
              <td>${format(new Date(), "dd MMM yyyy, hh:mm a")}</td>
            </tr>
            <tr>
              <td>Refund Mode:</td>
              <td>${refundModeUsed}</td>
            </tr>
            ${reasonText ? `
            <tr>
              <td>Reason:</td>
              <td>${reasonText}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        <div class="amount">
          <div class="label">REFUND AMOUNT</div>
          <div class="value">₹${refundAmount.toFixed(2)}</div>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Printed on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

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
      const initialQty: Record<number, string> = {};
      const initialUnits: Record<number, "PACK" | "BASE"> = {};
      saleData.items.forEach(item => {
        initialQty[item.id] = "";
        initialUnits[item.id] = item.packSize > 1 ? "PACK" : "BASE";
      });
      setReturnQuantities(initialQty);
      setReturnUnits(initialUnits);

      if (getSaleCreditPortion(saleData.sale, saleData.sale.payments) > 0) {
        setRefundMode("adjustment");
      }
    }
  }, [saleData]);

  const isCreditBill = saleData ? getSaleCreditPortion(saleData.sale, saleData.sale.payments) > 0 : false;

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${saleId}/with-returns`] });
      // Revenue/collection figures that read refunds from their own endpoints
      // (rather than deriving from /api/sales-returns above) — without these,
      // a refund wouldn't show up here until an unrelated refetch happened.
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/collections/monthly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/collections/quarterly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/collections/yearly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/collections/by-item"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-sales"] });
      toast({ title: "Return saved, stock updated" });
      
      if (autoPrint && data?.id && saleData?.sale?.invoiceNo) {
        printRefundReceipt(
          data.id,
          saleData.sale.invoiceNo || `INV-${saleData.sale.id}`,
          // Server-computed figure is authoritative for the printed receipt.
          parseFloat(data.totalRefundAmount) || totalRefund,
          refundMode,
          reason
        );
      }
      
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
    setReturnQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const handleUnitChange = (itemId: number, unit: "PACK" | "BASE") => {
    setReturnUnits(prev => ({ ...prev, [itemId]: unit }));
  };

  const getUnitFactor = (item: SaleItem): number => {
    return returnUnits[item.id] === "PACK" ? (item.packSize || 1) : 1;
  };

  // Converts the entered quantity (in whichever unit — pack or base — is
  // currently selected for this row) into base units, since sale_items and
  // inventory_batches both track stock in base units.
  const getReturnQtyBase = (item: SaleItem): number => {
    const val = returnQuantities[item.id];
    const enteredQty = val === "" || val === undefined ? 0 : parseFloat(val) || 0;
    return Math.round(enteredQty * getUnitFactor(item));
  };

  const handleSubmit = () => {
    if (!saleId || !saleData) return;

    const items: ReturnItem[] = saleData.items
      .filter(item => getReturnQtyBase(item) > 0)
      .map(item => ({
        saleItemId: item.id,
        medicineId: item.medicineId,
        quantityReturned: getReturnQtyBase(item),
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

  // Preview of the server's refund math: prorate the customer-paid line
  // total by base-unit quantity (item.price is per DISPLAY unit — per strip
  // for pack items — and must not be multiplied by a base-unit qty).
  const getLineRefund = (item: SaleItem): number =>
    computeReturnRefund({
      lineTotal: parseFloat(item.total),
      quantitySold: item.quantity,
      alreadyReturned: item.returnedQty,
      quantityReturned: getReturnQtyBase(item),
    }).refundAmount;

  const totalRefund = saleData?.items.reduce((sum, item) => sum + getLineRefund(item), 0) || 0;

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
                  const hasPack = item.packSize > 1;
                  const unit = returnUnits[item.id] || (hasPack ? "PACK" : "BASE");
                  const unitFactor = getUnitFactor(item);
                  const maxReturnableInUnit = unitFactor > 0 ? Math.floor(maxReturnable / unitFactor) : maxReturnable;
                  const lineTotal = getLineRefund(item);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medicineName}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                        {hasPack && (
                          <span className="text-xs text-muted-foreground block">
                            ({Math.floor(item.quantity / item.packSize)} {humanizeUnit(item.unitType)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.returnedQty}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={maxReturnableInUnit}
                            value={returnQuantities[item.id] ?? ""}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 text-right"
                            disabled={maxReturnable === 0}
                            data-testid={`input-return-qty-${item.id}`}
                          />
                          {hasPack ? (
                            <Select
                              value={unit}
                              onValueChange={(value) => handleUnitChange(item.id, value as "PACK" | "BASE")}
                              disabled={maxReturnable === 0}
                            >
                              <SelectTrigger className="w-24" data-testid={`select-return-unit-${item.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PACK">{humanizeUnit(item.unitType)}</SelectItem>
                                <SelectItem value="BASE">Unit</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground w-24">{humanizeUnit(item.unitType)}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Max: {maxReturnableInUnit} {unit === "PACK" ? humanizeUnit(item.unitType) : "unit"}(s)
                        </div>
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

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="auto-print"
                checked={autoPrint}
                onCheckedChange={(checked) => setAutoPrint(checked === true)}
                data-testid="checkbox-auto-print"
              />
              <label
                htmlFor="auto-print"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Print refund receipt after processing
              </label>
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
