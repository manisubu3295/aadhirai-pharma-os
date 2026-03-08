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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImportDialog } from "@/components/ui/import-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, MoreHorizontal, Plus, FileDown, Edit, Trash2, AlertTriangle, Package, Barcode, Printer, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Download, MapPin, Upload } from "lucide-react";
import { downloadFile, generateCSV, parseCSV } from "@/lib/exportUtils";
import { useState, memo, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/planContext";
import type { Medicine } from "@shared/schema";

interface Location {
  id: number;
  rack: string;
  row: string;
  bin: string;
  description: string | null;
}

interface GenericNameOption {
  id: number;
  name: string;
  isActive: boolean;
}

const CATEGORIES = ["Tablets", "Capsules", "Syrups", "Injections", "Drops", "Ointments", "Creams", "Powders", "Other"];
const GST_RATES = ["5", "12", "18"];

interface MedicineFormData {
  name: string;
  genericName: string;
  skuName: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  quantity: number;
  packSize: number;
  price: string;
  costPrice: string;
  mrp: string;
  gstRate: string;
  hsnCode: string;
  category: string;
  reorderLevel: number;
  barcode: string;
  minStock: number;
  maxStock: number;
  locationId: number | null;
}

const emptyForm: MedicineFormData = {
  name: "",
  genericName: "",
  skuName: "",
  batchNumber: "",
  manufacturer: "",
  expiryDate: "",
  quantity: 0,
  packSize: 10,
  price: "",
  costPrice: "",
  mrp: "",
  gstRate: "18",
  hsnCode: "",
  category: "Tablets",
  reorderLevel: 100,
  barcode: "",
  minStock: 10,
  maxStock: 500,
  locationId: null,
};

interface MedicineFormFieldsProps {
  formData: MedicineFormData;
  setFormData: React.Dispatch<React.SetStateAction<MedicineFormData>>;
  isPro: boolean;
  locations: Location[];
  genericOptions: string[];
  fieldErrors: Partial<Record<keyof MedicineFormData, string>>;
  clearFieldError: (field: keyof MedicineFormData) => void;
}

const MedicineFormFields = memo(function MedicineFormFields({ formData, setFormData, isPro, locations, genericOptions, fieldErrors, clearFieldError }: MedicineFormFieldsProps) {
  const safeQuantity = Math.max(0, Number(formData.quantity) || 0);
  const safePackSize = Math.max(1, Number(formData.packSize) || 1);
  const fullStrips = Math.floor(safeQuantity / safePackSize);
  const remainingUnits = safeQuantity % safePackSize;
  const getFieldClass = (field: keyof MedicineFormData, baseClass = "mt-1.5") =>
    `${baseClass}${fieldErrors[field] ? " border-destructive focus-visible:ring-destructive" : ""}`;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="name">Medicine Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            clearFieldError("name");
            setFormData(prev => ({ ...prev, name: e.target.value }));
          }}
          placeholder="e.g., Paracetamol 500mg"
          className={getFieldClass("name")}
          data-testid="input-medicine-name"
        />
        {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
      </div>
      <div className="col-span-2">
        <Label htmlFor="genericName">Generic Name</Label>
        <Input
          id="genericName"
          list="generic-name-options"
          value={formData.genericName}
          onChange={(e) => {
            clearFieldError("genericName");
            setFormData(prev => ({ ...prev, genericName: e.target.value }));
          }}
          placeholder="Type new generic or select existing"
          className={getFieldClass("genericName")}
          data-testid="input-generic-name"
        />
        <datalist id="generic-name-options">
          {genericOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        {fieldErrors.genericName && <p className="text-xs text-destructive mt-1">{fieldErrors.genericName}</p>}
      </div>
      <div>
        <Label htmlFor="batchNumber">Batch Number *</Label>
        <Input
          id="batchNumber"
          value={formData.batchNumber}
          onChange={(e) => {
            clearFieldError("batchNumber");
            setFormData(prev => ({ ...prev, batchNumber: e.target.value }));
          }}
          placeholder="e.g., BT2024001"
          className={getFieldClass("batchNumber")}
          data-testid="input-batch-number"
        />
        {fieldErrors.batchNumber && <p className="text-xs text-destructive mt-1">{fieldErrors.batchNumber}</p>}
      </div>
      <div>
        <Label htmlFor="expiryDate">Expiry Date *</Label>
        <Input
          id="expiryDate"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => {
            clearFieldError("expiryDate");
            setFormData(prev => ({ ...prev, expiryDate: e.target.value }));
          }}
          className={getFieldClass("expiryDate")}
          data-testid="input-expiry-date"
        />
        {fieldErrors.expiryDate && <p className="text-xs text-destructive mt-1">{fieldErrors.expiryDate}</p>}
      </div>
      <div>
        <Label htmlFor="manufacturer">Manufacturer *</Label>
        <Input
          id="manufacturer"
          value={formData.manufacturer}
          onChange={(e) => {
            clearFieldError("manufacturer");
            setFormData(prev => ({ ...prev, manufacturer: e.target.value }));
          }}
          placeholder="e.g., Sun Pharma"
          className={getFieldClass("manufacturer")}
          data-testid="input-manufacturer"
        />
        {fieldErrors.manufacturer && <p className="text-xs text-destructive mt-1">{fieldErrors.manufacturer}</p>}
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
          <SelectTrigger className="mt-1.5" data-testid="select-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantity">Quantity (base units)</Label>
        <NumericInput
          min={0}
          value={formData.quantity}
          onChange={(value) => {
            clearFieldError("quantity");
            setFormData(prev => ({ ...prev, quantity: value }));
          }}
          className={getFieldClass("quantity")}
          data-testid="input-quantity"
        />
        {fieldErrors.quantity && <p className="text-xs text-destructive mt-1">{fieldErrors.quantity}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          Enter tablet/unit count, not strips.
        </p>
      </div>
      <div>
        <Label htmlFor="packSize">Pack Size (units per strip)</Label>
        <NumericInput
          min={1}
          value={formData.packSize}
          onChange={(value) => {
            clearFieldError("packSize");
            setFormData(prev => ({ ...prev, packSize: value }));
          }}
          className={getFieldClass("packSize")}
          data-testid="input-pack-size"
        />
        {fieldErrors.packSize && <p className="text-xs text-destructive mt-1">{fieldErrors.packSize}</p>}
        <p className="text-xs text-muted-foreground mt-1">Units per strip/pack (e.g., 10 tablets per strip)</p>
        <p className="text-xs text-muted-foreground mt-1">
          Current equivalent: {fullStrips} strips + {remainingUnits} units ({safeQuantity} base units)
        </p>
      </div>
      <div>
        <Label htmlFor="reorderLevel">Reorder Level</Label>
        <NumericInput
          min={0}
          value={formData.reorderLevel}
          onChange={(value) => {
            clearFieldError("reorderLevel");
            setFormData(prev => ({ ...prev, reorderLevel: value }));
          }}
          className={getFieldClass("reorderLevel")}
          data-testid="input-reorder-level"
        />
        {fieldErrors.reorderLevel && <p className="text-xs text-destructive mt-1">{fieldErrors.reorderLevel}</p>}
      </div>
      <div>
        <Label htmlFor="costPrice">Cost Price (₹)</Label>
        <NumericInput
          min={0}
          allowDecimal={true}
          value={parseFloat(formData.costPrice) || 0}
          onChange={(value) => {
            clearFieldError("costPrice");
            setFormData(prev => ({ ...prev, costPrice: String(value) }));
          }}
          placeholder="0.00"
          className={getFieldClass("costPrice")}
          data-testid="input-cost-price"
        />
        {fieldErrors.costPrice && <p className="text-xs text-destructive mt-1">{fieldErrors.costPrice}</p>}
      </div>
      <div>
        <Label htmlFor="price">Selling Price (₹) *</Label>
        <NumericInput
          min={0}
          allowDecimal={true}
          value={parseFloat(formData.price) || 0}
          onChange={(value) => {
            clearFieldError("price");
            setFormData(prev => ({ ...prev, price: String(value) }));
          }}
          placeholder="0.00"
          className={getFieldClass("price")}
          data-testid="input-price"
        />
        {fieldErrors.price && <p className="text-xs text-destructive mt-1">{fieldErrors.price}</p>}
      </div>
      <div>
        <Label htmlFor="mrp">MRP (₹)</Label>
        <NumericInput
          min={0}
          allowDecimal={true}
          value={parseFloat(formData.mrp) || 0}
          onChange={(value) => {
            clearFieldError("mrp");
            setFormData(prev => ({ ...prev, mrp: String(value) }));
          }}
          placeholder="0.00"
          className={getFieldClass("mrp")}
          data-testid="input-mrp"
        />
        {fieldErrors.mrp && <p className="text-xs text-destructive mt-1">{fieldErrors.mrp}</p>}
      </div>
      <div>
        <Label htmlFor="gstRate">GST Rate (%)</Label>
        <Select value={formData.gstRate} onValueChange={(v) => {
          clearFieldError("gstRate");
          setFormData(prev => ({ ...prev, gstRate: v }));
        }}>
          <SelectTrigger className={getFieldClass("gstRate")} data-testid="select-gst-rate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GST_RATES.map((rate) => (
              <SelectItem key={rate} value={rate}>{rate}%</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.gstRate && <p className="text-xs text-destructive mt-1">{fieldErrors.gstRate}</p>}
      </div>
      <div>
        <Label htmlFor="hsnCode">HSN Code</Label>
        <Input
          id="hsnCode"
          value={formData.hsnCode}
          onChange={(e) => setFormData(prev => ({ ...prev, hsnCode: e.target.value }))}
          placeholder="e.g., 3004"
          className="mt-1.5"
          data-testid="input-hsn-code"
        />
      </div>
      <div>
        <Label htmlFor="locationId">Storage Location</Label>
        <Select 
          value={formData.locationId ? String(formData.locationId) : "none"} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, locationId: v === "none" ? null : parseInt(v) }))}
        >
          <SelectTrigger className="mt-1.5" data-testid="select-location">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
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
      {isPro && (
        <>
          <div className="col-span-2 pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Barcode className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">PRO Features</span>
            </div>
          </div>
          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder="Scan or enter barcode"
              className="mt-1.5"
              data-testid="input-barcode"
            />
          </div>
          <div>
            <Label htmlFor="minStock">Min Stock Level</Label>
            <NumericInput
              min={0}
              value={formData.minStock}
              onChange={(value) => {
                clearFieldError("minStock");
                setFormData(prev => ({ ...prev, minStock: value }));
              }}
              className={getFieldClass("minStock")}
              data-testid="input-min-stock"
            />
            {fieldErrors.minStock && <p className="text-xs text-destructive mt-1">{fieldErrors.minStock}</p>}
          </div>
          <div>
            <Label htmlFor="maxStock">Max Stock Level</Label>
            <NumericInput
              min={0}
              value={formData.maxStock}
              onChange={(value) => {
                clearFieldError("maxStock");
                setFormData(prev => ({ ...prev, maxStock: value }));
              }}
              className={getFieldClass("maxStock")}
              data-testid="input-max-stock"
            />
            {fieldErrors.maxStock && <p className="text-xs text-destructive mt-1">{fieldErrors.maxStock}</p>}
          </div>
        </>
      )}
    </div>
  );
});

type SortField = 'name' | 'category' | 'batchNumber' | 'expiryDate' | 'quantity' | 'price' | 'status';
type SortDirection = 'asc' | 'desc';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<MedicineFormData>(emptyForm);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MedicineFormData, string>>>({});

  const fieldLabelToKey: Record<string, keyof MedicineFormData> = {
    name: "name",
    "generic name": "genericName",
    "batch number": "batchNumber",
    manufacturer: "manufacturer",
    "expiry date": "expiryDate",
    quantity: "quantity",
    "pack size": "packSize",
    "selling price": "price",
    "cost price": "costPrice",
    mrp: "mrp",
    "gst rate": "gstRate",
    "reorder level": "reorderLevel",
    "min stock": "minStock",
    "max stock": "maxStock",
    location: "locationId",
  };

  const clearFieldError = (field: keyof MedicineFormData) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const applyInlineFieldErrors = (message: string) => {
    const normalized = message.toLowerCase();
    const nextErrors: Partial<Record<keyof MedicineFormData, string>> = {};

    Object.entries(fieldLabelToKey).forEach(([label, key]) => {
      if (normalized.includes(label)) {
        nextErrors[key] = message;
      }
      if (normalized.includes(`${String(key).toLowerCase()}:`)) {
        nextErrors[key] = message;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, children, align = 'left' }: { field: SortField; children: React.ReactNode; align?: 'left' | 'right' | 'center' }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPro } = usePlan();

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const response = await fetch("/api/medicines");
      if (!response.ok) throw new Error("Failed to fetch medicines");
      return response.json();
    },
  });

  const { data: genericMaster = [] } = useQuery<GenericNameOption[]>({
    queryKey: ["/api/generic-names"],
    queryFn: async () => {
      const response = await fetch("/api/generic-names");
      if (!response.ok) throw new Error("Failed to fetch generic names");
      return response.json();
    },
  });

  const genericOptions = useMemo(() => {
    const values = new Set<string>();
    for (const generic of genericMaster) {
      const value = String(generic.name || "").trim();
      if (value && generic.isActive) values.add(value);
    }
    for (const item of medicines) {
      const value = String((item as any).genericName || "").trim();
      if (value) values.add(value);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [genericMaster, medicines]);

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const getLocationDisplay = (locationId: number | null | undefined): string => {
    if (!locationId) return "-";
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return "-";
    return `${loc.rack}/${loc.row}/${loc.bin}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: MedicineFormData) => {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status: data.quantity <= 0 ? "Out of Stock" : data.quantity <= (data.reorderLevel ?? 100) ? "Low Stock" : "In Stock",
        }),
      });
      if (!res.ok) {
        let errorMessage = "Failed to create medicine";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      setFieldErrors({});
      toast({ title: "Medicine added successfully" });
    },
    onError: (error: Error) => {
      applyInlineFieldErrors(error.message);
      toast({ title: "Failed to add medicine", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MedicineFormData> }) => {
      const res = await fetch(`/api/medicines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          status: Number(data.quantity) <= 0 ? "Out of Stock" : Number(data.quantity) <= (data.reorderLevel ?? 100) ? "Low Stock" : "In Stock",
        }),
      });
      if (!res.ok) {
        let errorMessage = "Failed to update medicine";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setEditDialogOpen(false);
      setSelectedMedicine(null);
      setFormData(emptyForm);
      setFieldErrors({});
      toast({ title: "Medicine updated successfully" });
    },
    onError: (error: Error) => {
      applyInlineFieldErrors(error.message);
      toast({ title: "Failed to update medicine", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/medicines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete medicine");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setDeleteDialogOpen(false);
      setSelectedMedicine(null);
      toast({ title: "Medicine deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete medicine", variant: "destructive" });
    },
  });

  const isNearExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths && expiry > new Date();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) <= new Date();
  };

  const filteredMedicines = useMemo(() => {
    const filtered = medicines.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(searchLower) ||
        ((item as any).genericName && String((item as any).genericName).toLowerCase().includes(searchLower)) ||
        item.batchNumber.toLowerCase().includes(searchLower) ||
        item.manufacturer.toLowerCase().includes(searchLower) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchLower));
      
      if (filterStatus === "all") return matchesSearch;
      if (filterStatus === "low") return matchesSearch && item.status === "Low Stock";
      if (filterStatus === "out") return matchesSearch && item.status === "Out of Stock";
      if (filterStatus === "expiring") return matchesSearch && isNearExpiry(item.expiryDate);
      if (filterStatus === "expired") return matchesSearch && isExpired(item.expiryDate);
      return matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'category':
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case 'batchNumber':
          aVal = a.batchNumber.toLowerCase();
          bVal = b.batchNumber.toLowerCase();
          break;
        case 'expiryDate':
          aVal = a.expiryDate;
          bVal = b.expiryDate;
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case 'price':
          aVal = parseFloat(String(a.price));
          bVal = parseFloat(String(b.price));
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [medicines, searchTerm, filterStatus, sortField, sortDirection]);

  const medicineTotals = useMemo(() => {
    const grouped = new Map<string, { name: string; genericName: string; totalQty: number; batchCount: number }>();

    for (const item of filteredMedicines) {
      const genericName = String((item as any).genericName || "").trim();
      const key = `${item.name.toLowerCase()}||${genericName.toLowerCase()}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.totalQty += Number(item.quantity) || 0;
        existing.batchCount += 1;
      } else {
        grouped.set(key, {
          name: item.name,
          genericName,
          totalQty: Number(item.quantity) || 0,
          batchCount: 1,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredMedicines]);

  const openEditDialog = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setFormData({
      name: medicine.name,
      genericName: (medicine as any).genericName || "",
      skuName: (medicine as any).skuName || "",
      batchNumber: medicine.batchNumber,
      manufacturer: medicine.manufacturer,
      expiryDate: medicine.expiryDate,
      quantity: medicine.quantity,
      packSize: medicine.packSize || 10,
      price: String(medicine.price),
      costPrice: medicine.costPrice ? String(medicine.costPrice) : "",
      mrp: medicine.mrp ? String(medicine.mrp) : "",
      gstRate: String(medicine.gstRate),
      hsnCode: medicine.hsnCode || "",
      category: medicine.category,
      reorderLevel: Number(medicine.reorderLevel ?? 100) || 100,
      barcode: medicine.barcode || "",
      minStock: medicine.minStock || 10,
      maxStock: medicine.maxStock || 500,
      locationId: medicine.locationId || null,
    });
    setEditDialogOpen(true);
    setFieldErrors({});
  };

  const printBarcodeLabel = (medicine: Medicine) => {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Barcode Label - ${medicine.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .label { border: 2px dashed #ccc; padding: 15px; width: 280px; text-align: center; }
            .name { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
            .barcode { font-family: 'Libre Barcode 128', monospace; font-size: 48px; margin: 10px 0; letter-spacing: 2px; }
            .barcode-text { font-size: 12px; font-family: monospace; margin-bottom: 8px; }
            .info { font-size: 11px; color: #666; }
            .price { font-size: 16px; font-weight: bold; margin-top: 8px; }
            @media print { .no-print { display: none; } }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="label">
            <div class="name">${medicine.name}</div>
            <div class="barcode">${medicine.barcode || medicine.batchNumber}</div>
            <div class="barcode-text">${medicine.barcode || medicine.batchNumber}</div>
            <div class="info">Batch: ${medicine.batchNumber} | Exp: ${medicine.expiryDate}</div>
            <div class="price">₹${parseFloat(String(medicine.price)).toFixed(2)}</div>
          </div>
          <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Print Label</button>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const openDeleteDialog = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (isEdit: boolean) => {
    const requiredErrors: Partial<Record<keyof MedicineFormData, string>> = {};
    if (!formData.name) requiredErrors.name = "Medicine Name is required";
    if (!formData.batchNumber) requiredErrors.batchNumber = "Batch Number is required";
    if (!formData.manufacturer) requiredErrors.manufacturer = "Manufacturer is required";
    if (!formData.expiryDate) requiredErrors.expiryDate = "Expiry Date is required";
    if (!formData.price) requiredErrors.price = "Selling Price is required";

    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors(requiredErrors);
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setFieldErrors({});

    if (isEdit && selectedMedicine) {
      updateMutation.mutate({ id: selectedMedicine.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const exportInventoryCSV = () => {
    const headers = ["ID", "Name", "Generic Name", "Batch Number", "Manufacturer", "Category", "Expiry Date", "Quantity", "Reorder Level", "Cost Price", "Selling Price", "MRP", "GST%", "HSN Code", "Barcode", "Min Stock", "Max Stock", "Status"];
    const rows = filteredMedicines.map(m => [
      m.id,
      m.name,
      (m as any).genericName || "",
      m.batchNumber,
      m.manufacturer,
      m.category,
      m.expiryDate,
      m.quantity,
      m.reorderLevel,
      m.costPrice || "",
      m.price,
      m.mrp || "",
      m.gstRate,
      m.hsnCode || "",
      m.barcode || "",
      m.minStock || "",
      m.maxStock || "",
      m.status
    ]);
    const csv = generateCSV(headers, rows);
    const today = new Date().toISOString().split('T')[0];
    downloadFile(csv, `inventory_${today}.csv`, "text/csv");
    toast({ title: "Inventory exported successfully" });
  };

  const downloadImportTemplate = () => {
    const headers = ["Name", "Generic Name", "Batch Number", "Manufacturer", "Category", "Expiry Date (YYYY-MM-DD)", "Quantity", "Reorder Level", "Cost Price", "Selling Price", "MRP", "GST%", "HSN Code", "Barcode", "Min Stock", "Max Stock"];
    const sampleRow = ["Crocin 500mg", "Paracetamol", "BT2024001", "XYZ Pharma", "Tablets", "2025-12-31", "100", "50", "8.50", "10.00", "12.00", "12", "30049099", "", "10", "500"];
    const csv = generateCSV(headers, [sampleRow]);
    downloadFile(csv, "inventory_import_template.csv", "text/csv");
    toast({ title: "Template downloaded" });
  };

  return (
    <AppLayout title="Inventory Management">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pharmaceutical Stock
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your pharmacy's medicine inventory, track expiry dates, and monitor stock levels.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                window.location.href = "/generic-stock";
              }}
              data-testid="button-generic-stock-summary"
            >
              Generic Summary
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" data-testid="button-export">
                  <FileDown className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportInventoryCSV} data-testid="menu-export-csv">
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadImportTemplate} data-testid="menu-download-template">
                  <Download className="mr-2 h-4 w-4" /> Download Import Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)} data-testid="menu-import-csv">
                  <Upload className="mr-2 h-4 w-4" /> Import from CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              size="sm" 
              className="h-9"
              onClick={() => {
                setFormData(emptyForm);
                setFieldErrors({});
                setAddDialogOpen(true);
              }}
              data-testid="button-add-medicine"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isPro ? "Search by name, generic, batch, barcode..." : "Search by name, generic, batch, manufacturer..."}
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9" data-testid="select-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
                <SelectItem value="expiring">Near Expiry</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No medicines found. {searchTerm && "Try adjusting your search."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <SortableHeader field="name">Medicine Name</SortableHeader>
                    <TableHead>Generic Name</TableHead>
                    <SortableHeader field="category">Category</SortableHeader>
                    <SortableHeader field="batchNumber">Batch No.</SortableHeader>
                    {isPro && <TableHead>Barcode</TableHead>}
                    <SortableHeader field="expiryDate">Expiry</SortableHeader>
                    <SortableHeader field="quantity" align="right">Stock</SortableHeader>
                    <SortableHeader field="price" align="right">Price</SortableHeader>
                    <TableHead className="text-center">GST</TableHead>
                    <TableHead>Location</TableHead>
                    <SortableHeader field="status">Status</SortableHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.map((item) => (
                    <TableRow key={item.id} data-testid={`row-medicine-${item.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        INV-{String(item.id).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.manufacturer}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(item as any).genericName || "—"}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                      {isPro && (
                        <TableCell className="font-mono text-xs">
                          {item.barcode ? (
                            <div className="flex items-center gap-1">
                              <Barcode className="h-3 w-3 text-muted-foreground" />
                              {item.barcode}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <span className={`text-xs ${isExpired(item.expiryDate) ? 'text-red-600 font-medium' : isNearExpiry(item.expiryDate) ? 'text-orange-600 font-medium' : ''}`}>
                          {item.expiryDate}
                          {isNearExpiry(item.expiryDate) && !isExpired(item.expiryDate) && (
                            <AlertTriangle className="h-3 w-3 inline ml-1 text-orange-500" />
                          )}
                          {isExpired(item.expiryDate) && (
                            <AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(item.packSize && item.packSize > 1) ? (
                          <div>
                            <div>{Math.floor(item.quantity / item.packSize)} strips + {item.quantity % item.packSize}</div>
                            <div className="text-xs text-muted-foreground">({item.quantity} units)</div>
                          </div>
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell className="text-right">₹{parseFloat(String(item.price)).toFixed(2)}</TableCell>
                      <TableCell className="text-center text-xs">{item.gstRate}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {getLocationDisplay((item as any).locationId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          item.status === "In Stock" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : item.status === "Low Stock"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${item.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {isPro && (
                              <DropdownMenuItem onClick={() => printBarcodeLabel(item)}>
                                <Printer className="h-4 w-4 mr-2" /> Print Label
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => openDeleteDialog(item)}
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
          {medicineTotals.length > 0 && (
            <div className="mt-6 rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Total Stock (All Batches)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicineTotals.map((item) => (
                    <TableRow key={`${item.name}-${item.genericName}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.genericName || "—"}</TableCell>
                      <TableCell className="text-right">{item.batchCount}</TableCell>
                      <TableCell className="text-right font-semibold">{item.totalQty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredMedicines.length} of {medicines.length} items
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MedicineFormFields formData={formData} setFormData={setFormData} isPro={isPro} locations={locations} genericOptions={genericOptions} fieldErrors={fieldErrors} clearFieldError={clearFieldError} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isPending}
              data-testid="button-save-medicine"
            >
              {createMutation.isPending ? "Saving..." : "Add Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MedicineFormFields formData={formData} setFormData={setFormData} isPro={isPro} locations={locations} genericOptions={genericOptions} fieldErrors={fieldErrors} clearFieldError={clearFieldError} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleSubmit(true)}
              disabled={updateMutation.isPending}
              data-testid="button-update-medicine"
            >
              {updateMutation.isPending ? "Saving..." : "Update Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMedicine?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedMedicine && deleteMutation.mutate(selectedMedicine.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Medicines"
        templateHeaders={["Name", "GenericName", "BatchNumber", "Manufacturer", "Category", "ExpiryDate", "Quantity", "ReorderLevel", "CostPrice", "Price", "MRP", "GSTRate", "HSNCode"]}
        templateSampleData={[["Crocin 500mg", "Paracetamol", "BT2024001", "XYZ Pharma", "Tablets", "2025-12-31", "100", "50", "8.50", "10.00", "12.00", "12", "30049099"]]}
        templateFilename="medicines_import"
        entityName="medicines"
        onImport={async (data) => {
          const medicines = data.map(row => ({
            name: row.name || '',
            genericName: row.genericname || null,
            batchNumber: row.batchnumber || `BATCH-${Date.now()}`,
            manufacturer: row.manufacturer || null,
            category: row.category || 'Tablets',
            expiryDate: row.expirydate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
            quantity: parseInt(row.quantity) || 0,
            reorderLevel: parseInt(row.reorderlevel) || 50,
            costPrice: row.costprice || '0',
            price: row.price || '0',
            mrp: row.mrp || row.price || '0',
            gstRate: row.gstrate || '12',
            hsnCode: row.hsncode || null,
            packSize: 1,
            unitType: 'STRIP',
          }));
          const res = await fetch('/api/medicines/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medicines }),
          });
          if (!res.ok) throw new Error('Import failed');
          return res.json();
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/medicines"] })}
      />
    </AppLayout>
  );
}
