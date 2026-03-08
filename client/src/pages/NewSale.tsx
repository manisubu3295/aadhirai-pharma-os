import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Plus, 
  Trash2,
  UserPlus,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  Pause,
  Play,
  Clock,
  Package,
  Printer,
  Share2
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PrintableInvoice } from "@/components/PrintableInvoice";
import { useSettings } from "@/contexts/SettingsContext";
import { generateSaleInvoicePdfBlob } from "@/lib/pdfUtils";
import type { Customer, Doctor, Medicine, HeldBill, Sale, SaleItem as SaleItemSchema } from "@shared/schema";

interface SaleItem {
  id: string;
  medicineId: number;
  name: string;
  batchNumber: string;
  expiryDate: string;
  hsnCode: string | null;
  category: string;
  quantity: number;
  price: number;
  stripPrice: number;
  tabletPrice: number;
  mrp: number | null;
  gstRate: number;
  discount: number;
  availableQty: number;
  unitType: "STRIP" | "TABLET" | "BOTTLE";
  packSize: number;
  pricePerUnit: number | null;
  displayQty: number;
}

const getSafePackSize = (packSize: number) => Math.max(1, Number(packSize) || 1);
const getSafeAvailableQty = (availableQty: number) => Math.max(0, Number(availableQty) || 0);
const isStripUnit = (unitType: SaleItem["unitType"] | string | null | undefined) =>
  String(unitType || "").trim().toUpperCase() === "STRIP";

const getMaxDisplayQty = (item: Pick<SaleItem, "unitType" | "availableQty" | "packSize">) => {
  const availableQty = getSafeAvailableQty(item.availableQty);
  if (availableQty <= 0) {
    return 0;
  }
  if (isStripUnit(item.unitType)) {
    const packSize = getSafePackSize(item.packSize);
    return Math.floor(availableQty / packSize);
  }
  return availableQty;
};

const LIQUID_CATEGORIES = ["Syrups", "Drops", "Injections", "Cough & Cold"];
const isLiquidCategory = (category: string | undefined) => {
  if (!category) return false;
  return LIQUID_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase()));
};

function QuantityInput({ value, max, onChange, testId }: { value: number; max: number; onChange: (qty: number) => void; testId: string }) {
  const [inputValue, setInputValue] = useState(String(value));
  const hasStock = max > 0;
  
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);
  
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={inputValue}
      disabled={!hasStock}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '' || /^\d*$/.test(val)) {
          setInputValue(val);
        }
      }}
      onBlur={() => {
        const qty = parseInt(inputValue) || (hasStock ? 1 : 0);
        const clampedQty = hasStock
          ? Math.max(1, Math.min(qty, max))
          : 0;
        setInputValue(String(clampedQty));
        onChange(clampedQty);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className="w-16 text-center h-8"
      data-testid={testId}
    />
  );
}

export default function NewSale() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { settings: appSettings } = useSettings();
  const isGstEnabled = appSettings.autoGst;
  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineOpen, setMedicineOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [printInvoice, setPrintInvoice] = useState(false);
  const [sendViaEmail, setSendViaEmail] = useState(false);
  const [billDiscountPercent, setBillDiscountPercent] = useState("0");
  const [newCustomerDialog, setNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [heldBillsDialogOpen, setHeldBillsDialogOpen] = useState(false);
  const [newMedicineDialog, setNewMedicineDialog] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSaleData, setPrintSaleData] = useState<{sale: Sale; items: SaleItemSchema[]} | null>(null);
  const [invoiceSearchInput, setInvoiceSearchInput] = useState("");
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);
  const [lastSavedInvoiceNo, setLastSavedInvoiceNo] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const customerSearchRef = useRef<HTMLButtonElement>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const res = await fetch("/api/doctors");
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines/sale-list"],
    queryFn: async () => {
      const saleListResponse = await fetch("/api/medicines/sale-list");
      if (saleListResponse.ok) {
        return saleListResponse.json();
      }

      const fallbackResponse = await fetch("/api/medicines");
      if (!fallbackResponse.ok) throw new Error("Failed to fetch medicines");
      return fallbackResponse.json();
    },
  });

  const { data: locations = [] } = useQuery<{ id: number; rack: string; row: string; bin: string }[]>({
    queryKey: ["/api/locations"],
  });

  const getLocationDisplay = (locationId: number | null | undefined): string => {
    if (!locationId) return "-";
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return "-";
    return `${loc.rack}/${loc.row}/${loc.bin}`;
  };

  const { data: heldBills = [] } = useQuery<HeldBill[]>({
    queryKey: ["/api/held-bills"],
    queryFn: async () => {
      const res = await fetch("/api/held-bills");
      if (!res.ok) throw new Error("Failed to fetch held bills");
      return res.json();
    },
  });

  const { data: recentSales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales", { limit: 10 }],
    queryFn: async () => {
      const res = await fetch("/api/sales?limit=10");
      if (!res.ok) throw new Error("Failed to fetch recent sales");
      return res.json();
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomer(customer);
      setNewCustomerDialog(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      toast({ title: "Customer created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create customer", variant: "destructive" });
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let errorMessage = "Failed to create sale";
        try {
          const payload = await res.json();
          if (payload?.details && typeof payload.details === "string") {
            errorMessage = payload.details;
          } else if (payload?.error && typeof payload.error === "string") {
            errorMessage = payload.error;
          }
        } catch {
          // Keep fallback message when response is not JSON.
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: (saleResult: { sale: Sale; items: SaleItemSchema[] }, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/recent"] });
      
      const invoiceNo = saleResult.sale?.invoiceNo || "Generated";
      setLastSavedInvoiceNo(invoiceNo);
      toast({ 
        title: `Invoice ${invoiceNo} created!`,
        description: `Total: ₹${Number(saleResult.sale?.total || 0).toFixed(2)}`
      });
      
      const shouldPrint = variables.printInvoice || appSettings.printOnSave;
      if (shouldPrint && saleResult.sale && saleResult.items) {
        setPrintSaleData(saleResult);
        setPrintDialogOpen(true);
      }
      
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create sale",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const holdBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/held-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to hold bill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/held-bills"] });
      toast({ title: "Bill put on hold successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to hold bill", variant: "destructive" });
    },
  });

  const deleteHeldBillMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/held-bills/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to delete held bill");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/held-bills"] });
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        (c.phone && c.phone.includes(search))
    );
  }, [customers, customerSearch]);

  const getAvailableQty = (medicine: Medicine | undefined) => {
    if (!medicine) return 0;
    return Number((medicine as any).consolidatedQty ?? medicine.quantity ?? 0);
  };

  const filteredMedicines = useMemo(() => {
    if (!medicineSearch) return medicines.filter((m) => getAvailableQty(m) > 0);
    const search = medicineSearch.toLowerCase();
    return medicines.filter(
      (m) =>
        getAvailableQty(m) > 0 &&
        (m.name.toLowerCase().includes(search) ||
          ((m as any).genericName && String((m as any).genericName).toLowerCase().includes(search)) ||
          m.batchNumber.toLowerCase().includes(search))
    );
  }, [medicines, medicineSearch]);

  const addMedicine = (medicine: Medicine) => {
    const availableQty = getAvailableQty(medicine);
    if (availableQty <= 0) {
      toast({
        title: "Out of stock",
        description: `${medicine.name} has no available stock right now.`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = items.find(
      (item) => item.medicineId === medicine.id && item.batchNumber === medicine.batchNumber
    );

    if (existingItem) {
      if (existingItem.quantity < availableQty) {
        setItems(
          items.map((item) =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        toast({ title: "Insufficient stock", variant: "destructive" });
      }
    } else {
      const isLiquid = isLiquidCategory(medicine.category);
      const packSize = isLiquid ? 1 : Math.max(1, Number(medicine.packSize) || 1);
      const stripPrice = Number(medicine.price);
      const tabletPrice = medicine.pricePerUnit ? Number(medicine.pricePerUnit) : stripPrice / packSize;
      const defaultUnit = isLiquid ? "BOTTLE" : "STRIP";
      const newItem: SaleItem = {
        id: `${medicine.id}-${medicine.batchNumber}-${Date.now()}`,
        medicineId: medicine.id,
        name: medicine.name,
        batchNumber: medicine.batchNumber,
        expiryDate: medicine.expiryDate,
        hsnCode: medicine.hsnCode,
        category: medicine.category,
        quantity: isLiquid ? 1 : packSize,
        price: stripPrice,
        stripPrice: stripPrice,
        tabletPrice: tabletPrice,
        mrp: medicine.mrp ? Number(medicine.mrp) : null,
        gstRate: Number(medicine.gstRate),
        discount: 0,
        availableQty: availableQty,
        unitType: defaultUnit,
        packSize: packSize,
        pricePerUnit: tabletPrice,
        displayQty: 1,
      };
      setItems([...items, newItem]);
    }
    setMedicineSearch("");
    setMedicineOpen(false);
  };

  const updateItemQuantity = (itemId: string, qty: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(1, Math.min(qty, item.availableQty));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (itemId: string, discount: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return { ...item, discount: Math.max(0, discount) };
        }
        return item;
      })
    );
  };

  const updateItemPrice = (itemId: string, price: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return { ...item, price: Math.max(0, price) };
        }
        return item;
      })
    );
  };

  const updateItemUnit = (itemId: string, unitType: "STRIP" | "TABLET") => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          let newDisplayQty: number;
          let newPrice: number;
          let newQuantity: number;
          
          if (unitType === "STRIP") {
            if (item.unitType === "TABLET") {
              newDisplayQty = Math.max(1, Math.floor(item.displayQty / item.packSize));
            } else {
              newDisplayQty = item.displayQty;
            }
            newPrice = item.stripPrice;
            newQuantity = newDisplayQty * item.packSize;
          } else {
            if (item.unitType === "STRIP") {
              newDisplayQty = item.displayQty * item.packSize;
            } else {
              newDisplayQty = item.displayQty;
            }
            newPrice = item.tabletPrice;
            newQuantity = newDisplayQty;
          }
          
          const maxQty = getMaxDisplayQty({
            unitType,
            availableQty: item.availableQty,
            packSize: item.packSize,
          });
          const clampedDisplayQty = maxQty > 0 ? Math.max(1, Math.min(newDisplayQty, maxQty)) : 0;
          const clampedQuantity = unitType === "STRIP"
            ? clampedDisplayQty * getSafePackSize(item.packSize)
            : clampedDisplayQty;
          
          return { 
            ...item, 
            unitType, 
            displayQty: clampedDisplayQty,
            quantity: clampedQuantity,
            price: newPrice,
          };
        }
        return item;
      })
    );
  };

  const updateItemDisplayQty = (itemId: string, displayQty: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const maxDisplayQty = getMaxDisplayQty(item);
          const clampedQty = maxDisplayQty > 0 ? Math.max(1, Math.min(displayQty, maxDisplayQty)) : 0;
          const baseQty = isStripUnit(item.unitType)
            ? clampedQty * getSafePackSize(item.packSize)
            : clampedQty;
          return { ...item, displayQty: clampedQty, quantity: baseQty };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const isNearExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths && expiry > today;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry <= today;
  };

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalMRP = 0;
    let totalItemDiscount = 0;
    let itemLevelTaxTotal = 0;

    items.forEach((item) => {
      const mrpValue = item.mrp || item.price;
      totalMRP += mrpValue * item.displayQty;
      totalItemDiscount += item.discount;
      const itemTotal = item.price * item.displayQty - item.discount;
      subtotal += itemTotal;
      if (isGstEnabled) {
        itemLevelTaxTotal += itemTotal * (item.gstRate / 100);
      }
    });

    const discountPercent = Number(billDiscountPercent) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const taxAdjustmentFactor = subtotal > 0 ? discountedSubtotal / subtotal : 1;
    const tax = isGstEnabled ? itemLevelTaxTotal * taxAdjustmentFactor : 0;
    const cgst = tax / 2;
    const sgst = tax / 2;
    const netAmount = discountedSubtotal + tax;
    const roundedNet = Math.round(netAmount);
    const roundOff = roundedNet - netAmount;
    const received = Number(receivedAmount) || 0;
    const change = received - roundedNet;

    return {
      subtotal,
      cgst,
      sgst,
      tax,
      discountPercent,
      discount: discountAmount,
      netAmount: roundedNet,
      roundOff,
      received,
      change: change > 0 ? change : 0,
      totalMRP,
      totalItemDiscount,
    };
  }, [items, billDiscountPercent, receivedAmount, isGstEnabled]);

  const resetForm = () => {
    setItems([]);
    setSelectedCustomer(null);
    setSelectedDoctor(null);
    setCustomerSearch("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setReceivedAmount("");
    setPrintInvoice(false);
    setSendViaEmail(false);
    setBillDiscountPercent("0");
  };

  const handleGenerateInvoice = () => {
    if (items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    const validateLatestStockAndSubmit = async () => {
      try {
        const res = await fetch("/api/medicines");
        if (!res.ok) {
          throw new Error("Failed to validate latest stock");
        }

        const latestMedicines: Medicine[] = await res.json();
        const latestById = new Map<number, Medicine>(latestMedicines.map((medicine) => [medicine.id, medicine]));

        for (const item of items) {
          const latestMedicine = latestById.get(item.medicineId);
          const availableBase = getAvailableQty(latestMedicine);
          const requiredBase = Number(item.quantity || 0);
          if (!latestMedicine || availableBase < requiredBase) {
            toast({
              title: "Insufficient stock",
              description: `${item.name} has only ${availableBase} in stock, required ${requiredBase}. Please refresh items.`,
              variant: "destructive",
            });
            return;
          }
        }

        const customerName = selectedCustomer?.name || "Walk-in Customer";
        const customerPhone = selectedCustomer?.phone || "";

        const saleData = {
          customerId: selectedCustomer?.id || null,
          customerName,
          customerPhone,
          customerGstin: selectedCustomer?.gstin || null,
          doctorId: selectedDoctor?.id || null,
          doctorName: selectedDoctor?.name || null,
          subtotal: calculations.subtotal.toFixed(2),
          discount: calculations.discount.toFixed(2),
          discountPercent: calculations.discountPercent.toFixed(2),
          cgst: calculations.cgst.toFixed(2),
          sgst: calculations.sgst.toFixed(2),
          tax: calculations.tax.toFixed(2),
          total: calculations.netAmount.toFixed(2),
          roundOff: calculations.roundOff.toFixed(2),
          paymentMethod,
          paymentReference: paymentReference || null,
          receivedAmount: calculations.received.toFixed(2),
          changeAmount: calculations.change.toFixed(2),
          status: "Completed",
          printInvoice,
          sendViaEmail,
          items: items.map((item) => {
            const itemTotal = item.price * item.displayQty - item.discount;
            const itemDiscountPercent = Number(billDiscountPercent) || 0;
            const discountedItemTotal = itemTotal - (itemTotal * itemDiscountPercent) / 100;
            const itemTax = isGstEnabled ? discountedItemTotal * (item.gstRate / 100) : 0;
            const itemCgst = itemTax / 2;
            const itemSgst = itemTax / 2;
            return {
              medicineId: item.medicineId,
              medicineName: item.name,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              hsnCode: item.hsnCode,
              soldQty: item.displayQty,
              soldQtyBase: item.quantity,
              quantity: item.quantity,
              conversionFactorSnapshot: isStripUnit(item.unitType) ? getSafePackSize(item.packSize) : 1,
              unitType: item.unitType,
              packSize: getSafePackSize(item.packSize),
              price: item.price.toFixed(2),
              mrp: item.mrp?.toFixed(2) || null,
              gstRate: isGstEnabled ? item.gstRate.toFixed(2) : "0.00",
              cgst: itemCgst.toFixed(2),
              sgst: itemSgst.toFixed(2),
              discount: item.discount.toFixed(2),
              taxMode: "EXCLUSIVE",
              total: (discountedItemTotal + itemTax).toFixed(2),
            };
          }),
        };

        createSaleMutation.mutate(saleData);
      } catch {
        toast({
          title: "Unable to validate stock",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    };
    void validateLatestStockAndSubmit();
  };

  const handleInvoiceSearch = async () => {
    if (!invoiceSearchInput.trim()) return;
    
    setSearchingInvoice(true);
    try {
      // Search for sale by invoice number
      const res = await fetch(`/api/sales?invoiceNo=${encodeURIComponent(invoiceSearchInput.trim())}`);
      if (!res.ok) throw new Error("Failed to search");
      
      const sales = await res.json();
      if (sales.length === 0) {
        toast({ title: "Invoice not found", description: `No invoice found with number: ${invoiceSearchInput}`, variant: "destructive" });
        return;
      }
      
      const sale = sales[0];
      // Fetch sale items
      const itemsRes = await fetch(`/api/sales/${sale.id}/items`);
      if (!itemsRes.ok) throw new Error("Failed to fetch items");
      
      const items = await itemsRes.json();
      setPrintSaleData({ sale, items });
      setPrintDialogOpen(true);
      setInvoiceSearchInput("");
    } catch (error) {
      toast({ title: "Search failed", description: "Unable to find invoice", variant: "destructive" });
    } finally {
      setSearchingInvoice(false);
    }
  };

  const handleHoldBill = () => {
    if (items.length === 0) {
      toast({ title: "Please add at least one item to hold", variant: "destructive" });
      return;
    }

    const holdData = {
      customerName: selectedCustomer?.name || "Walk-in Customer",
      customerPhone: selectedCustomer?.phone || null,
      customerId: selectedCustomer?.id || null,
      doctorId: selectedDoctor?.id || null,
      doctorName: selectedDoctor?.name || null,
      items: JSON.stringify(items),
      subtotal: calculations.subtotal.toFixed(2),
      discount: calculations.discount.toFixed(2),
      discountPercent: billDiscountPercent,
      tax: calculations.tax.toFixed(2),
      total: calculations.netAmount.toFixed(2),
      notes: null,
      userId: null,
    };

    holdBillMutation.mutate(holdData);
  };

  const handleResumeBill = (heldBill: HeldBill) => {
    try {
      const rawItems = JSON.parse(heldBill.items as string);
      const parsedItems: SaleItem[] = rawItems.map((item: any) => ({
        id: String(item.id),
        medicineId: Number(item.medicineId),
        name: String(item.name),
        batchNumber: String(item.batchNumber),
        expiryDate: String(item.expiryDate),
        hsnCode: item.hsnCode ? String(item.hsnCode) : null,
        category: String(item.category || ""),
        quantity: Number(item.quantity),
        price: Number(item.price),
        stripPrice: Number(item.stripPrice || item.price || 0),
        tabletPrice: Number(item.tabletPrice || item.price || 0),
        mrp: item.mrp ? Number(item.mrp) : null,
        gstRate: Number(item.gstRate),
        discount: Number(item.discount),
        availableQty: Number(item.availableQty),
        unitType: (item.unitType as "STRIP" | "TABLET" | "BOTTLE") || "STRIP",
        packSize: Number(item.packSize || 1),
        pricePerUnit: item.pricePerUnit ? Number(item.pricePerUnit) : null,
        displayQty: Number(item.displayQty || item.quantity || 1),
      }));
      
      setItems(parsedItems);
      setBillDiscountPercent(heldBill.discountPercent ? String(heldBill.discountPercent) : "0");
      
      if (heldBill.customerId) {
        const customer = customers.find(c => c.id === heldBill.customerId);
        if (customer) {
          setSelectedCustomer(customer);
        } else {
          setSelectedCustomer(null);
        }
      } else {
        setSelectedCustomer(null);
      }
      
      if (heldBill.doctorId) {
        const doctor = doctors.find(d => d.id === heldBill.doctorId);
        if (doctor) {
          setSelectedDoctor(doctor);
        } else {
          setSelectedDoctor(null);
        }
      } else {
        setSelectedDoctor(null);
      }
      
      setHeldBillsDialogOpen(false);
      toast({ title: "Bill resumed successfully" });
      deleteHeldBillMutation.mutate(heldBill.id, {
        onError: () => {
          console.log("Note: Held bill entry may already be cleared");
        },
      });
    } catch (error) {
      console.error("Failed to parse held bill items:", error);
      toast({ title: "Failed to resume bill - invalid data", variant: "destructive" });
    }
  };

  const formatHeldBillTime = (createdAt: string | Date | null) => {
    if (!createdAt) return "Unknown";
    const date = new Date(createdAt);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault();
      setMedicineOpen(true);
      setTimeout(() => {
        const medicineInput = document.querySelector('[data-testid="input-medicine-search"]') as HTMLInputElement;
        medicineInput?.focus();
      }, 100);
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (items.length > 0) {
        const lastItemQtyInput = document.querySelector(`[data-testid="input-qty-${items[items.length - 1].id}"]`) as HTMLInputElement;
        lastItemQtyInput?.focus();
        lastItemQtyInput?.select();
      }
    } else if (e.key === 'F4') {
      e.preventDefault();
      const receivedInput = document.querySelector('[data-testid="input-received"]') as HTMLInputElement;
      receivedInput?.focus();
      receivedInput?.select();
    } else if (e.key === 'F5') {
      e.preventDefault();
      if (items.length > 0) {
        handleHoldBill();
      }
    } else if (e.key === 'F6') {
      e.preventDefault();
      setHeldBillsDialogOpen(true);
    } else if (e.key === 'F7') {
      e.preventDefault();
      setCustomerOpen(true);
      setTimeout(() => {
        const customerInput = document.querySelector('[data-testid="input-customer-search"]') as HTMLInputElement;
        customerInput?.focus();
      }, 100);
    } else if (e.key === 'F8') {
      e.preventDefault();
      const isDisabled = items.length === 0 || 
        createSaleMutation.isPending ||
        (paymentMethod !== "credit" && calculations.received < calculations.netAmount && calculations.netAmount > 0) ||
        (paymentMethod === "credit" && !selectedCustomer);
      if (!isDisabled) {
        handleGenerateInvoice();
      }
    }
  }, [items, paymentMethod, calculations, selectedCustomer, createSaleMutation.isPending]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [handleKeyboardShortcuts]);

  useEffect(() => {
    setTimeout(() => {
      customerSearchRef.current?.focus();
    }, 100);
  }, []);

  return (
    <AppLayout title="New Sale / Invoice">
      <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-120px)]">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center gap-2 mb-2">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded text-sm">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-mono font-semibold text-muted-foreground" data-testid="text-invoice-number">
                {lastSavedInvoiceNo || "Auto on save"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setReprintDialogOpen(true)}
                data-testid="button-reprint-bill"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Reprint Bill
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleHoldBill}
                disabled={items.length === 0 || holdBillMutation.isPending}
                data-testid="button-hold-bill"
              >
                <Pause className="h-3.5 w-3.5 mr-1" />
                Hold
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setHeldBillsDialogOpen(true)}
                data-testid="button-resume-bill"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Resume
                {heldBills.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {heldBills.length}
                  </span>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={resetForm}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-sm flex-1 flex flex-col min-h-0">
            <CardContent className="p-4 flex flex-col flex-1 min-h-0 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <div className="flex gap-2 mt-1">
                    <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          ref={customerSearchRef}
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerOpen}
                          className="flex-1 justify-between font-normal overflow-hidden"
                          data-testid="select-customer"
                        >
                          <span className="truncate">
                            {selectedCustomer
                              ? `${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ""}`
                              : "Search customer..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search by name or phone..."
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                            data-testid="input-customer-search"
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-2 text-center text-sm">
                                No customer found.
                                <Button
                                  variant="link"
                                  className="block mx-auto mt-1"
                                  onClick={() => {
                                    setNewCustomerDialog(true);
                                    setCustomerOpen(false);
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add New Customer
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredCustomers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.id.toString()}
                                  keywords={[customer.name, customer.phone || '']}
                                  onSelect={() => {
                                    setSelectedCustomer(customer);
                                    setCustomerSearch("");
                                    setCustomerOpen(false);
                                  }}
                                  className="flex items-start gap-2 py-2"
                                  data-testid={`customer-option-${customer.id}`}
                                >
                                  <Check
                                    className={cn(
                                      "mt-0.5 h-4 w-4 shrink-0",
                                      selectedCustomer?.id === customer.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{customer.name}</span>
                                    {customer.phone && (
                                      <span className="text-xs text-muted-foreground">
                                        {customer.phone}
                                        {Number(customer.outstandingBalance) > 0 && (
                                          <span className="ml-2 text-orange-600">
                                            Due: ₹{Number(customer.outstandingBalance).toFixed(2)}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNewCustomerDialog(true)}
                      data-testid="button-add-customer"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Doctor (Optional)</Label>
                  <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={doctorOpen}
                        className="w-full justify-between font-normal mt-1 h-9"
                        data-testid="select-doctor"
                      >
                        {selectedDoctor
                          ? `Dr. ${selectedDoctor.name}`
                          : "Select doctor..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search doctor..." data-testid="input-doctor-search" />
                        <CommandList>
                          <CommandEmpty>No doctor found.</CommandEmpty>
                          <CommandGroup>
                            {doctors.map((doctor) => (
                              <CommandItem
                                key={doctor.id}
                                value={doctor.name}
                                onSelect={() => {
                                  setSelectedDoctor(doctor);
                                  setDoctorOpen(false);
                                }}
                                data-testid={`doctor-option-${doctor.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedDoctor?.id === doctor.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div>
                                  <div className="font-medium">Dr. {doctor.name}</div>
                                  {doctor.specialization && (
                                    <div className="text-xs text-muted-foreground">
                                      {doctor.specialization}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Add/Search Medicine</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMedicineDialog(true)}
                      data-testid="button-quick-add-medicine"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                    <Popover open={medicineOpen} onOpenChange={setMedicineOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2" data-testid="button-add-medicine">
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Search by name, generic or batch..."
                          value={medicineSearch}
                          onValueChange={setMedicineSearch}
                          data-testid="input-medicine-search"
                        />
                        <CommandList>
                          <CommandEmpty>No medicine found in stock.</CommandEmpty>
                          <CommandGroup>
                            {filteredMedicines.slice(0, 10).map((medicine) => (
                              <CommandItem
                                key={`${medicine.id}-${medicine.batchNumber}`}
                                value={`${medicine.name} ${medicine.batchNumber}`}
                                onSelect={() => addMedicine(medicine)}
                                className="flex items-center justify-between"
                                data-testid={`medicine-option-${medicine.id}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{medicine.name}</span>
                                    {isNearExpiry(medicine.expiryDate) && (
                                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                                    )}
                                  </div>
                                  {!!(medicine as any).genericName && (
                                    <div className="text-xs text-muted-foreground">
                                      Generic: {String((medicine as any).genericName)}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    Batch: {medicine.batchNumber} | Exp: {medicine.expiryDate} | 
                                    Stock: {getAvailableQty(medicine)} | Loc: {getLocationDisplay((medicine as any).locationId)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">₹{Number(medicine.price).toFixed(2)}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  </div>
                </div>

                <div className="border rounded-lg overflow-auto flex-1 min-h-0">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[20%] py-2">Item</TableHead>
                        <TableHead className="py-2">Batch</TableHead>
                        <TableHead className="py-2">Expiry</TableHead>
                        <TableHead className="w-[90px] py-2">Unit</TableHead>
                        <TableHead className="text-right py-2">Price</TableHead>
                        <TableHead className="w-[70px] text-center py-2">Qty</TableHead>
                        <TableHead className="text-right py-2">Amount</TableHead>
                        <TableHead className="w-[40px] py-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                            No items added. Search and add medicines above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => {
                          const itemTotal = item.price * item.displayQty - item.discount;
                          const maxDisplayQty = getMaxDisplayQty(item);

                          return (
                            <TableRow key={item.id} data-testid={`sale-item-${item.id}`}>
                              <TableCell className="font-medium py-2">
                                <div className="text-sm">{item.name}</div>
                                {item.packSize > 1 && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {item.packSize}/strip
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {item.batchNumber}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                <span
                                  className={cn(
                                    isExpired(item.expiryDate) && "text-red-600 font-medium",
                                    isNearExpiry(item.expiryDate) && "text-orange-600 font-medium"
                                  )}
                                >
                                  {item.expiryDate}
                                </span>
                                {isNearExpiry(item.expiryDate) && (
                                  <AlertTriangle className="h-3 w-3 text-orange-500 inline ml-1" />
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                {isLiquidCategory(item.category) ? (
                                  <span className="text-xs font-medium px-1.5 py-0.5 bg-muted rounded">Bottle</span>
                                ) : (
                                  <Select
                                    value={item.unitType}
                                    onValueChange={(v) => updateItemUnit(item.id, v as "STRIP" | "TABLET")}
                                  >
                                    <SelectTrigger className="h-7 w-[80px] text-xs" data-testid={`select-unit-${item.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="STRIP">Strip</SelectItem>
                                      <SelectItem value="TABLET">Tablet</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-2">
                                {isOwnerOrAdmin ? (
                                  <NumericInput
                                    min={0}
                                    allowDecimal={true}
                                    value={item.price}
                                    onChange={(value) =>
                                      updateItemPrice(item.id, value)
                                    }
                                    className="w-20 text-right h-8"
                                    data-testid={`input-price-${item.id}`}
                                  />
                                ) : (
                                  <span>₹{item.price.toFixed(2)}</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                <QuantityInput
                                  value={item.displayQty}
                                  max={maxDisplayQty}
                                  onChange={(qty) => updateItemDisplayQty(item.id, qty)}
                                  testId={`input-qty-${item.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right py-2 font-medium text-sm">
                                ₹{itemTotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => removeItem(item.id)}
                                  data-testid={`button-remove-${item.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {items.length > 0 && (
                  <div className="flex justify-between items-center pt-1 px-1 text-sm">
                    <span className="font-medium">
                      {items.length} item{items.length > 1 ? "s" : ""}
                    </span>
                    <span className="font-bold" data-testid="text-subtotal">
                      Subtotal: ₹{calculations.subtotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-[340px] flex flex-col min-h-0">
          <Card className="border-0 shadow-sm flex-1 flex flex-col min-h-0 overflow-auto">
            <CardContent className="p-4 flex flex-col h-full">
              <h3 className="text-base font-semibold mb-3">Bill Summary</h3>

              <div className="space-y-2 mb-3 pb-3 border-b border-dashed text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium" data-testid="text-summary-subtotal">
                    ₹{calculations.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-1">
                    <NumericInput
                      min={0}
                      max={100}
                      allowDecimal={true}
                      value={parseFloat(billDiscountPercent) || 0}
                      onChange={(value) => setBillDiscountPercent(String(value))}
                      className="w-14 h-6 text-right text-xs"
                      data-testid="input-discount-percent"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                {isGstEnabled && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST</span>
                      <span className="font-medium">₹{calculations.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST</span>
                      <span className="font-medium">₹{calculations.sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {calculations.roundOff !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Round Off</span>
                    <span className="font-medium" data-testid="text-roundoff">
                      ₹{calculations.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-4 bg-primary/10 p-2 rounded">
                <span className="font-semibold">Net Amount</span>
                <span className="font-bold text-xl" data-testid="text-net-amount">
                  ₹{calculations.netAmount.toFixed(2)}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <Label className="text-sm font-medium">Payment</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-4 gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="cash" id="cash" data-testid="radio-cash" className="h-3.5 w-3.5" />
                    <Label htmlFor="cash" className="font-normal cursor-pointer text-xs">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="upi" id="upi" data-testid="radio-upi" className="h-3.5 w-3.5" />
                    <Label htmlFor="upi" className="font-normal cursor-pointer text-xs">UPI</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="card" id="card" data-testid="radio-card" className="h-3.5 w-3.5" />
                    <Label htmlFor="card" className="font-normal cursor-pointer text-xs">Card</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="credit" id="credit" data-testid="radio-credit" className="h-3.5 w-3.5" />
                    <Label htmlFor="credit" className="font-normal cursor-pointer text-xs">Credit</Label>
                  </div>
                </RadioGroup>

                {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "credit") && (
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Reference (optional)"
                    className="h-8 text-sm"
                    data-testid="input-payment-reference"
                  />
                )}
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-medium text-sm">Received</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">₹</span>
                    <NumericInput
                      min={0}
                      allowDecimal={true}
                      value={parseFloat(receivedAmount) || 0}
                      onChange={(value) => setReceivedAmount(String(value))}
                      placeholder="0"
                      className={cn(
                        "w-20 h-8 text-right",
                        paymentMethod !== "credit" && 
                        calculations.received < calculations.netAmount && 
                        calculations.netAmount > 0 &&
                        "border-red-500"
                      )}
                      data-testid="input-received"
                    />
                  </div>
                </div>
                {paymentMethod !== "credit" && 
                 calculations.received < calculations.netAmount && 
                 calculations.netAmount > 0 && (
                  <div className="text-xs text-red-500 text-right" data-testid="text-underpaid-error">
                    Pay full amount
                  </div>
                )}
                {calculations.change > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-medium text-green-600" data-testid="text-change">
                      ₹{calculations.change.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mb-4 text-xs">
                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="print"
                    checked={printInvoice}
                    onCheckedChange={(checked) => setPrintInvoice(checked as boolean)}
                    data-testid="checkbox-print"
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="print" className="font-normal cursor-pointer">Print</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="email"
                    checked={sendViaEmail}
                    onCheckedChange={(checked) => setSendViaEmail(checked as boolean)}
                    data-testid="checkbox-email"
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="email" className="font-normal cursor-pointer">Email/WhatsApp</Label>
                </div>
              </div>

              {paymentMethod === "credit" && !selectedCustomer && (
                <div className="text-xs text-red-500 text-center mb-2" data-testid="text-credit-customer-required">
                  Select customer for credit
                </div>
              )}
              <Button
                className="w-full bg-primary hover:bg-primary/90 h-10 text-sm mt-auto"
                onClick={handleGenerateInvoice}
                disabled={
                  items.length === 0 || 
                  createSaleMutation.isPending ||
                  (paymentMethod !== "credit" && calculations.received < calculations.netAmount && calculations.netAmount > 0) ||
                  (paymentMethod === "credit" && !selectedCustomer)
                }
                data-testid="button-generate-invoice"
              >
                {createSaleMutation.isPending ? "Generating..." : "Generate Invoice (F8)"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={newCustomerDialog} onOpenChange={setNewCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="mt-1.5"
                data-testid="input-new-customer-name"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
                className="mt-1.5"
                data-testid="input-new-customer-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newCustomerName.trim()) {
                  createCustomerMutation.mutate({
                    name: newCustomerName.trim(),
                    phone: newCustomerPhone.trim() || "",
                  });
                }
              }}
              disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
              data-testid="button-save-customer"
            >
              {createCustomerMutation.isPending ? "Saving..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newMedicineDialog} onOpenChange={setNewMedicineDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Medicine</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            <p className="mb-4">To add a new medicine, please use the Inventory page where you can add complete medicine details including batch, expiry, and stock information.</p>
            <Button 
              variant="outline"
              onClick={() => {
                setNewMedicineDialog(false);
                window.location.href = "/inventory";
              }}
              data-testid="button-go-to-inventory"
            >
              <Package className="h-4 w-4 mr-2" />
              Go to Inventory
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMedicineDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={heldBillsDialogOpen} onOpenChange={setHeldBillsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Held Bills</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {heldBills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bills on hold
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {heldBills.map((bill) => (
                  <div 
                    key={bill.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    data-testid={`held-bill-${bill.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{bill.customerName}</span>
                        {bill.customerPhone && (
                          <span className="text-sm text-muted-foreground">
                            ({bill.customerPhone})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatHeldBillTime(bill.createdAt)}
                        </span>
                        <span className="font-medium text-foreground">
                          ₹{Number(bill.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeBill(bill)}
                        data-testid={`button-resume-${bill.id}`}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          deleteHeldBillMutation.mutate(bill.id);
                        }}
                        data-testid={`button-delete-held-${bill.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeldBillsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Print Invoice</DialogTitle>
          </DialogHeader>
          {printSaleData && (
            <div ref={printRef}>
              <PrintableInvoice 
                sale={printSaleData.sale} 
                items={printSaleData.items}
                storeInfo={{
                  name: appSettings.storeName,
                  address: appSettings.storeAddress,
                  phone: appSettings.storePhone,
                  gstin: appSettings.gstin,
                  dlNo: appSettings.dlNo,
                }}
                invoiceSettings={{
                  showMrp: appSettings.showMrp,
                  showGstBreakup: appSettings.showGstBreakup,
                  showDoctor: appSettings.showDoctor,
                  hideTaxDetails: !isGstEnabled,
                  hideStoreGstin: true,
                }}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Close
            </Button>
            {printSaleData?.sale.customerPhone && (
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!printSaleData) return;

                  try {
                    const pdfBlob = await generateSaleInvoicePdfBlob(
                      printSaleData.sale,
                      printSaleData.items,
                      {
                        name: appSettings.storeName,
                        address: appSettings.storeAddress,
                        phone: appSettings.storePhone,
                        gstin: appSettings.gstin,
                        dlNo: appSettings.dlNo,
                      },
                      {
                        showMrp: appSettings.showMrp,
                        showGstBreakup: appSettings.showGstBreakup,
                        showDoctor: appSettings.showDoctor,
                        hideTaxDetails: !isGstEnabled,
                        hideStoreGstin: true,
                      },
                    );

                    const invoiceNo = printSaleData.sale.invoiceNo || `INV-${printSaleData.sale.id}`;
                    const fileName = `Invoice_${invoiceNo}.pdf`;
                    const shareText = `Invoice ${invoiceNo} from ${appSettings.storeName} is ready. Please find the attached PDF.`;
                    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

                    const nav = navigator as Navigator & {
                      canShare?: (data?: ShareData) => boolean;
                    };
                    const canShareWithFile = typeof nav.share === "function"
                      && typeof nav.canShare === "function"
                      && nav.canShare({ files: [pdfFile] });

                    if (canShareWithFile) {
                      await nav.share({
                        files: [pdfFile],
                        title: `Invoice ${invoiceNo}`,
                        text: shareText,
                      });
                      toast({
                        title: "Invoice ready to share",
                        description: "Share sheet opened with PDF and message.",
                      });
                      return;
                    }

                    const blobUrl = URL.createObjectURL(pdfBlob);
                    const anchor = document.createElement("a");
                    anchor.href = blobUrl;
                    anchor.download = fileName;
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(blobUrl);

                    const phoneNumber = printSaleData.sale.customerPhone?.replace(/\D/g, "");
                    if (phoneNumber) {
                      const invoiceNoText = printSaleData.sale.invoiceNo || `INV-${printSaleData.sale.id}`;
                      const message = encodeURIComponent(
                        `Invoice ${invoiceNoText} from ${appSettings.storeName} is ready. Please find the attached PDF.`
                      );

                      const localNumber = phoneNumber.startsWith("91") ? phoneNumber : `91${phoneNumber}`;
                      const appUrl = `whatsapp://send?phone=${localNumber}&text=${message}`;
                      const webUrl = `https://wa.me/${localNumber}?text=${message}`;

                      const popup = window.open(appUrl, "_blank");
                      if (!popup) {
                        window.open(webUrl, "_blank");
                      } else {
                        setTimeout(() => {
                          try {
                            if (popup.closed) return;
                            popup.location.href = webUrl;
                          } catch {
                            window.open(webUrl, "_blank");
                          }
                        }, 1200);
                      }
                    }

                    toast({
                      title: "Invoice PDF downloaded",
                      description: "WhatsApp chat opened. Attach the downloaded PDF and tap Send.",
                    });
                  } catch (error) {
                    toast({
                      title: "Unable to share invoice PDF",
                      description: "Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-whatsapp-share"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                WhatsApp
              </Button>
            )}
            <Button 
              onClick={() => {
                const printContent = printRef.current;
                if (!printContent) return;
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Invoice</title>
                        <style>
                          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 12px; }
                          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                          th, td { border: 1px solid black; padding: 8px; }
                          th { background-color: #f3f4f6; text-align: left; }
                          .text-center { text-align: center; }
                          .text-right { text-align: right; }
                          .font-bold { font-weight: bold; }
                          .mb-4 { margin-bottom: 16px; }
                          .mb-6 { margin-bottom: 24px; }
                          .mt-2 { margin-top: 8px; }
                          .border-b { border-bottom: 1px solid black; }
                          .border-t-2 { border-top: 2px solid black; }
                          .py-1 { padding-top: 4px; padding-bottom: 4px; }
                          .py-2 { padding-top: 8px; padding-bottom: 8px; }
                          @media print {
                            body { margin: 0; padding: 10mm; }
                            @page { margin: 10mm; size: A4; }
                          }
                        </style>
                      </head>
                      <body>
                        ${printContent.innerHTML}
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                  }, 250);
                }
              }}
              data-testid="button-print-invoice"
            >
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reprintDialogOpen} onOpenChange={setReprintDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reprint Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter invoice number..."
                value={invoiceSearchInput}
                onChange={(e) => setInvoiceSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvoiceSearch();
                    setReprintDialogOpen(false);
                  }
                }}
                data-testid="input-reprint-invoice-search"
              />
              <Button 
                onClick={() => {
                  handleInvoiceSearch();
                  setReprintDialogOpen(false);
                }}
                disabled={searchingInvoice || !invoiceSearchInput.trim()}
                data-testid="button-search-invoice"
              >
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
            
            <div className="border rounded-md">
              <div className="bg-muted/50 px-3 py-2 border-b">
                <h4 className="text-sm font-medium">Recent Invoices</h4>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {recentSales.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No recent invoices found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSales.map((sale) => (
                        <TableRow 
                          key={sale.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={async () => {
                            try {
                              const itemsRes = await fetch(`/api/sales/${sale.id}/items`);
                              if (!itemsRes.ok) throw new Error("Failed to fetch items");
                              const items = await itemsRes.json();
                              setPrintSaleData({ sale, items });
                              setReprintDialogOpen(false);
                              setPrintDialogOpen(true);
                            } catch (error) {
                              toast({ title: "Failed to load invoice", variant: "destructive" });
                            }
                          }}
                          data-testid={`row-recent-invoice-${sale.id}`}
                        >
                          <TableCell className="font-mono text-sm">{sale.invoiceNo}</TableCell>
                          <TableCell>{sale.customerName || "Walk-in"}</TableCell>
                          <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-medium">₹{parseFloat(sale.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprintDialogOpen(false)} data-testid="button-close-reprint">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 bg-muted/95 border-t backdrop-blur-sm py-2 px-4 z-50">
        <div className="flex justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F2</kbd>
            <span>Medicine</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F3</kbd>
            <span>Qty</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F4</kbd>
            <span>Payment</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F5</kbd>
            <span>Hold</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F6</kbd>
            <span>Resume</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F7</kbd>
            <span>Customer</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">F8</kbd>
            <span>Complete</span>
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
