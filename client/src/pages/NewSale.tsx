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
  Printer
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PrintableInvoice } from "@/components/PrintableInvoice";
import { useSettings } from "@/contexts/SettingsContext";
import type { Customer, Doctor, Medicine, HeldBill, Sale, SaleItem as SaleItemSchema } from "@shared/schema";

interface SaleItem {
  id: string;
  medicineId: number;
  name: string;
  batchNumber: string;
  expiryDate: string;
  hsnCode: string | null;
  quantity: number;
  price: number;
  mrp: number | null;
  gstRate: number;
  discount: number;
  availableQty: number;
  unitType: "STRIP" | "TABLET";
  packSize: number;
  pricePerUnit: number | null;
  displayQty: number;
}

function QuantityInput({ value, max, onChange, testId }: { value: number; max: number; onChange: (qty: number) => void; testId: string }) {
  const [inputValue, setInputValue] = useState(String(value));
  
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);
  
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={inputValue}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '' || /^\d*$/.test(val)) {
          setInputValue(val);
        }
      }}
      onBlur={() => {
        const qty = parseInt(inputValue) || 1;
        const clampedQty = Math.max(1, Math.min(qty, max));
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
  const printRef = useRef<HTMLDivElement>(null);
  const generateInvoiceNumber = () => `INV-${Date.now()}`;
  const [invoiceNumber, setInvoiceNumber] = useState<string>(generateInvoiceNumber());

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
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const res = await fetch("/api/medicines");
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
  });

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
      if (!res.ok) throw new Error("Failed to create sale");
      return res.json();
    },
    onSuccess: (saleResult: { sale: Sale; items: SaleItemSchema[] }, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({ title: "Invoice generated successfully!" });
      
      const shouldPrint = variables.printInvoice || appSettings.printOnSave;
      if (shouldPrint && saleResult.sale && saleResult.items) {
        setPrintSaleData(saleResult);
        setPrintDialogOpen(true);
      }
      
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create sale", variant: "destructive" });
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

  const filteredMedicines = useMemo(() => {
    if (!medicineSearch) return medicines.filter((m) => Number(m.quantity) > 0);
    const search = medicineSearch.toLowerCase();
    return medicines.filter(
      (m) =>
        Number(m.quantity) > 0 &&
        (m.name.toLowerCase().includes(search) ||
          m.batchNumber.toLowerCase().includes(search))
    );
  }, [medicines, medicineSearch]);

  const addMedicine = (medicine: Medicine) => {
    const existingItem = items.find(
      (item) => item.medicineId === medicine.id && item.batchNumber === medicine.batchNumber
    );

    if (existingItem) {
      if (existingItem.quantity < Number(medicine.quantity)) {
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
      const packSize = medicine.packSize || 1;
      const pricePerUnit = medicine.pricePerUnit ? Number(medicine.pricePerUnit) : Number(medicine.price) / packSize;
      const newItem: SaleItem = {
        id: `${medicine.id}-${medicine.batchNumber}-${Date.now()}`,
        medicineId: medicine.id,
        name: medicine.name,
        batchNumber: medicine.batchNumber,
        expiryDate: medicine.expiryDate,
        hsnCode: medicine.hsnCode,
        quantity: 1,
        price: Number(medicine.price),
        mrp: medicine.mrp ? Number(medicine.mrp) : null,
        gstRate: Number(medicine.gstRate),
        discount: 0,
        availableQty: Number(medicine.quantity),
        unitType: packSize > 1 ? "STRIP" : "TABLET",
        packSize: packSize,
        pricePerUnit: pricePerUnit,
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
          const displayQty = item.displayQty;
          let newQuantity: number;
          let newPrice: number;
          
          if (unitType === "STRIP") {
            newQuantity = displayQty * item.packSize;
            newPrice = item.price;
          } else {
            newQuantity = displayQty;
            newPrice = item.pricePerUnit || item.price / item.packSize;
          }
          
          const maxQty = Math.floor(item.availableQty / (unitType === "STRIP" ? item.packSize : 1));
          const clampedDisplayQty = Math.min(displayQty, maxQty);
          
          return { 
            ...item, 
            unitType, 
            displayQty: clampedDisplayQty,
            quantity: unitType === "STRIP" ? clampedDisplayQty * item.packSize : clampedDisplayQty,
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
          const maxDisplayQty = item.unitType === "STRIP" 
            ? Math.floor(item.availableQty / item.packSize)
            : item.availableQty;
          const clampedQty = Math.max(1, Math.min(displayQty, maxDisplayQty));
          const baseQty = item.unitType === "STRIP" ? clampedQty * item.packSize : clampedQty;
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
    let totalCgst = 0;
    let totalSgst = 0;
    let totalMRP = 0;
    let totalItemDiscount = 0;

    items.forEach((item) => {
      const mrpValue = item.mrp || item.price;
      totalMRP += mrpValue * item.quantity;
      totalItemDiscount += item.discount;
      const itemTotal = item.price * item.quantity - item.discount;
      subtotal += itemTotal;
      const gstAmount = (itemTotal * item.gstRate) / 100;
      totalCgst += gstAmount / 2;
      totalSgst += gstAmount / 2;
    });

    const discountPercent = Number(billDiscountPercent) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const tax = totalCgst + totalSgst;
    const netAmount = subtotal - discountAmount + tax;
    const roundedNet = Math.round(netAmount);
    const roundOff = roundedNet - netAmount;
    const received = Number(receivedAmount) || 0;
    const change = received - roundedNet;

    return {
      subtotal,
      cgst: totalCgst,
      sgst: totalSgst,
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
  }, [items, billDiscountPercent, receivedAmount]);

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
    setInvoiceNumber(generateInvoiceNumber());
  };

  const handleGenerateInvoice = () => {
    if (items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    const customerName = selectedCustomer?.name || "Walk-in Customer";
    const customerPhone = selectedCustomer?.phone || "";

    const saleData = {
      invoiceNo: invoiceNumber || `INV-${Date.now()}`,
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
        const itemTotal = item.price * item.quantity - item.discount;
        const gstAmount = (itemTotal * item.gstRate) / 100;
        return {
          medicineId: item.medicineId,
          medicineName: item.name,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          mrp: item.mrp?.toFixed(2) || null,
          gstRate: item.gstRate.toFixed(2),
          cgst: (gstAmount / 2).toFixed(2),
          sgst: (gstAmount / 2).toFixed(2),
          discount: item.discount.toFixed(2),
          total: (itemTotal + gstAmount).toFixed(2),
        };
      }),
    };

    createSaleMutation.mutate(saleData);
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
        quantity: Number(item.quantity),
        price: Number(item.price),
        mrp: item.mrp ? Number(item.mrp) : null,
        gstRate: Number(item.gstRate),
        discount: Number(item.discount),
        availableQty: Number(item.availableQty),
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

  return (
    <AppLayout title="New Sale / Invoice">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 space-y-6">
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              className="h-9"
              onClick={handleHoldBill}
              disabled={items.length === 0 || holdBillMutation.isPending}
              data-testid="button-hold-bill"
            >
              <Pause className="h-4 w-4 mr-1.5" />
              {holdBillMutation.isPending ? "Holding..." : "Hold Bill"}
            </Button>
            <Button 
              variant="outline" 
              className="h-9"
              onClick={() => setHeldBillsDialogOpen(true)}
              data-testid="button-resume-bill"
            >
              <Play className="h-4 w-4 mr-1.5" />
              Resume Bill
              {heldBills.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {heldBills.length}
                </span>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="h-9 text-destructive hover:text-destructive"
              onClick={resetForm}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-lg mb-4">
                <span className="text-sm text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-semibold text-primary" data-testid="text-invoice-number">
                  {invoiceNumber}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium">Customer</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                      <PopoverTrigger asChild>
                        <Button
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
                  <Label className="text-base font-medium">Doctor (Optional)</Label>
                  <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={doctorOpen}
                        className="w-full justify-between font-normal mt-1.5"
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

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Add/Search Medicine</Label>
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
                          placeholder="Search by name or batch..."
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
                                  <div className="text-xs text-muted-foreground">
                                    Batch: {medicine.batchNumber} | Exp: {medicine.expiryDate} | 
                                    Stock: {medicine.quantity}
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

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[20%]">Item</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="w-[100px]">Unit</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-[80px] text-center">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No items added. Search and add medicines above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => {
                          const itemTotal = item.price * item.displayQty - item.discount;
                          const maxDisplayQty = item.unitType === "STRIP" 
                            ? Math.floor(item.availableQty / item.packSize)
                            : item.availableQty;

                          return (
                            <TableRow key={item.id} data-testid={`sale-item-${item.id}`}>
                              <TableCell className="font-medium py-3">
                                <div>{item.name}</div>
                                {item.packSize > 1 && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.packSize} units/strip
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-3">
                                {item.batchNumber}
                              </TableCell>
                              <TableCell className="py-3">
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
                              <TableCell className="py-3">
                                {item.packSize > 1 ? (
                                  <Select
                                    value={item.unitType}
                                    onValueChange={(v) => updateItemUnit(item.id, v as "STRIP" | "TABLET")}
                                  >
                                    <SelectTrigger className="h-8 w-[90px]" data-testid={`select-unit-${item.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="STRIP">Strip</SelectItem>
                                      <SelectItem value="TABLET">Tablet</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Unit</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-3">
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
                              <TableCell className="py-3">
                                <QuantityInput
                                  value={item.displayQty}
                                  max={maxDisplayQty}
                                  onChange={(qty) => updateItemDisplayQty(item.id, qty)}
                                  testId={`input-qty-${item.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right py-3 font-medium">
                                ₹{itemTotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="py-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeItem(item.id)}
                                  data-testid={`button-remove-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                  <div className="flex justify-between items-center pt-2 px-2">
                    <span className="text-sm font-medium">
                      {items.length} item{items.length > 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-8 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold" data-testid="text-subtotal">
                        ₹{calculations.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-[380px]">
          <Card className="border-0 shadow-sm h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-6">Bill Summary</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-dashed">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total MRP</span>
                  <span className="font-medium" data-testid="text-total-mrp">
                    ₹{calculations.totalMRP.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium" data-testid="text-summary-subtotal">
                    ₹{calculations.subtotal.toFixed(2)}
                  </span>
                </div>
                {calculations.totalItemDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Item Discount</span>
                    <span className="font-medium text-green-600" data-testid="text-item-discount">
                      -₹{calculations.totalItemDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Bill Discount (%)</span>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      min={0}
                      max={100}
                      allowDecimal={true}
                      value={parseFloat(billDiscountPercent) || 0}
                      onChange={(value) => setBillDiscountPercent(String(value))}
                      className="w-16 h-7 text-right text-sm"
                      data-testid="input-discount-percent"
                    />
                    <span>%</span>
                  </div>
                </div>
                {calculations.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bill Discount Amount</span>
                    <span className="font-medium text-green-600" data-testid="text-discount-amount">
                      -₹{calculations.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-medium" data-testid="text-cgst">
                    ₹{calculations.cgst.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-medium" data-testid="text-sgst">
                    ₹{calculations.sgst.toFixed(2)}
                  </span>
                </div>
                {calculations.roundOff !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Round Off</span>
                    <span className="font-medium" data-testid="text-roundoff">
                      ₹{calculations.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-8">
                <span className="font-semibold text-lg">Net Amount</span>
                <span className="font-bold text-2xl" data-testid="text-net-amount">
                  ₹{calculations.netAmount.toFixed(2)}
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <Label className="text-base font-medium">Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" data-testid="radio-cash" />
                    <Label htmlFor="cash" className="font-normal cursor-pointer">
                      Cash
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upi" id="upi" data-testid="radio-upi" />
                    <Label htmlFor="upi" className="font-normal cursor-pointer">
                      UPI / QR
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" data-testid="radio-card" />
                    <Label htmlFor="card" className="font-normal cursor-pointer">
                      Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="credit" id="credit" data-testid="radio-credit" />
                    <Label htmlFor="credit" className="font-normal cursor-pointer">
                      Credit
                    </Label>
                  </div>
                </RadioGroup>

                {(paymentMethod === "upi" || paymentMethod === "card" || paymentMethod === "credit") && (
                  <div className="mt-4">
                    <Label htmlFor="paymentRef" className="text-sm text-muted-foreground">
                      Reference (Optional)
                    </Label>
                    <Input
                      id="paymentRef"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={
                        paymentMethod === "upi" ? "UPI Transaction ID" :
                        paymentMethod === "card" ? "Card approval code" :
                        "Credit reference"
                      }
                      className="mt-1.5"
                      data-testid="input-payment-reference"
                    />
                  </div>
                )}
              </div>

              <div className="mb-8 space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="font-medium">Received Amount</Label>
                  <div className="flex items-center gap-1">
                    <span>₹</span>
                    <NumericInput
                      min={0}
                      allowDecimal={true}
                      value={parseFloat(receivedAmount) || 0}
                      onChange={(value) => setReceivedAmount(String(value))}
                      placeholder="0"
                      className="w-24 text-right"
                      data-testid="input-received"
                    />
                  </div>
                </div>
                {calculations.change > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-medium text-green-600" data-testid="text-change">
                      ₹{calculations.change.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="print"
                    checked={printInvoice}
                    onCheckedChange={(checked) => setPrintInvoice(checked as boolean)}
                    data-testid="checkbox-print"
                  />
                  <Label htmlFor="print" className="font-normal text-sm cursor-pointer">
                    Print invoice
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email"
                    checked={sendViaEmail}
                    onCheckedChange={(checked) => setSendViaEmail(checked as boolean)}
                    data-testid="checkbox-email"
                  />
                  <Label htmlFor="email" className="font-normal text-sm cursor-pointer">
                    Send via Email or WhatsApp
                  </Label>
                </div>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90 h-12 text-base mt-auto"
                onClick={handleGenerateInvoice}
                disabled={items.length === 0 || createSaleMutation.isPending}
                data-testid="button-generate-invoice"
              >
                {createSaleMutation.isPending ? "Generating..." : "Generate Invoice"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-0 shadow-sm mt-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Reprint Invoice</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter invoice number (e.g., INV-1234567890)"
              value={invoiceSearchInput}
              onChange={(e) => setInvoiceSearchInput(e.target.value)}
              className="max-w-md"
              data-testid="input-invoice-search"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInvoiceSearch();
                }
              }}
            />
            <Button 
              onClick={handleInvoiceSearch}
              disabled={!invoiceSearchInput.trim() || searchingInvoice}
              data-testid="button-search-invoice"
            >
              {searchingInvoice ? "Searching..." : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search & Print
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {recentSales.length > 0 && (
        <Card className="border-0 shadow-sm mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.slice(0, 10).map((sale) => (
                    <TableRow key={sale.id} data-testid={`recent-sale-${sale.id}`}>
                      <TableCell className="font-medium">
                        {sale.invoiceNo}
                      </TableCell>
                      <TableCell>
                        {new Date(sale.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {sale.customerName || 'Walk-in Customer'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{Number(sale.total).toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {sale.paymentMethod}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/sales/${sale.id}/items`);
                              if (res.ok) {
                                const items = await res.json();
                                setPrintSaleData({ sale, items });
                                setPrintDialogOpen(true);
                              }
                            } catch (error) {
                              console.error("Failed to fetch sale items:", error);
                            }
                          }}
                          data-testid={`button-reprint-${sale.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                }}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Close
            </Button>
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
    </AppLayout>
  );
}
