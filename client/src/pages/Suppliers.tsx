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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Plus, Edit, Building2, Phone, Mail, CheckCircle2, XCircle, FileDown, Upload, Download } from "lucide-react";
import { useState, memo } from "react";
import { ImportDialog } from "@/components/ui/import-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Supplier } from "@shared/schema";

interface SupplierFormData {
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  panNumber: string;
  paymentTermsDays: number;
  bankName: string;
  bankAccount: string;
  ifscCode: string;
}

const emptyForm: SupplierFormData = {
  name: "",
  code: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
  panNumber: "",
  paymentTermsDays: 30,
  bankName: "",
  bankAccount: "",
  ifscCode: "",
};

interface SupplierFormFieldsProps {
  formData: SupplierFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierFormData>>;
}

const SupplierFormFields = memo(function SupplierFormFields({ formData, setFormData }: SupplierFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <Label htmlFor="name">Supplier Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Supplier Company Name"
          data-testid="input-supplier-name"
        />
      </div>
      <div>
        <Label htmlFor="code">Supplier Code *</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
          placeholder="SUP001"
          data-testid="input-supplier-code"
        />
      </div>
      <div>
        <Label htmlFor="contactPerson">Contact Person</Label>
        <Input
          id="contactPerson"
          value={formData.contactPerson}
          onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
          placeholder="Contact name"
          data-testid="input-supplier-contact"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="+91 98765 43210"
          data-testid="input-supplier-phone"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="supplier@company.com"
          data-testid="input-supplier-email"
        />
      </div>
      <div>
        <Label htmlFor="paymentTermsDays">Payment Terms (Days)</Label>
        <NumericInput
          min={0}
          value={formData.paymentTermsDays}
          onChange={(value) => setFormData(prev => ({ ...prev, paymentTermsDays: value }))}
          defaultValue={30}
          data-testid="input-supplier-payment-terms"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Full address"
          data-testid="input-supplier-address"
        />
      </div>
      <div>
        <Label htmlFor="gstin">GSTIN</Label>
        <Input
          id="gstin"
          value={formData.gstin}
          onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
          placeholder="22AAAAA0000A1Z5"
          data-testid="input-supplier-gstin"
        />
      </div>
      <div>
        <Label htmlFor="panNumber">PAN Number</Label>
        <Input
          id="panNumber"
          value={formData.panNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
          placeholder="AAAAA0000A"
          data-testid="input-supplier-pan"
        />
      </div>
      <div>
        <Label htmlFor="bankName">Bank Name</Label>
        <Input
          id="bankName"
          value={formData.bankName}
          onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
          placeholder="Bank name"
          data-testid="input-supplier-bank"
        />
      </div>
      <div>
        <Label htmlFor="bankAccount">Account Number</Label>
        <Input
          id="bankAccount"
          value={formData.bankAccount}
          onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
          placeholder="Account number"
          data-testid="input-supplier-account"
        />
      </div>
      <div>
        <Label htmlFor="ifscCode">IFSC Code</Label>
        <Input
          id="ifscCode"
          value={formData.ifscCode}
          onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
          placeholder="SBIN0001234"
          data-testid="input-supplier-ifsc"
        />
      </div>
    </div>
  );
});

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Failed to create supplier");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      toast({ title: "Supplier added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormData & { id: number }) => {
      const res = await fetch(`/api/suppliers/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update supplier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setEditDialogOpen(false);
      setSelectedSupplier(null);
      setFormData(emptyForm);
      toast({ title: "Supplier updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update supplier", variant: "destructive" });
    },
  });

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.phone && supplier.phone.includes(searchTerm)) ||
    (supplier.gstin && supplier.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstin: supplier.gstin || "",
      panNumber: supplier.panNumber || "",
      paymentTermsDays: supplier.paymentTermsDays || 30,
      bankName: supplier.bankName || "",
      bankAccount: supplier.bankAccount || "",
      ifscCode: supplier.ifscCode || "",
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Please enter supplier name", variant: "destructive" });
      return;
    }
    if (!formData.code.trim()) {
      toast({ title: "Please enter supplier code", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!formData.name.trim() || !selectedSupplier) return;
    updateMutation.mutate({ ...formData, id: selectedSupplier.id });
  };

  const activeSuppliers = suppliers.filter(s => s.isActive);

  return (
    <AppLayout title="Suppliers">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-suppliers">
                  {suppliers.length}
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
                <p className="text-sm text-muted-foreground">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-active-suppliers">
                  {activeSuppliers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With GSTIN</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-suppliers-with-gstin">
                  {suppliers.filter(s => s.gstin).length}
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
              <CardTitle>Supplier List</CardTitle>
              <CardDescription>Manage your suppliers and vendors</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search suppliers..." 
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-suppliers"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-suppliers">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }} data-testid="button-add-supplier">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No suppliers found</p>
              <p className="text-sm">Add your first supplier to start managing purchases</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div>{supplier.name}</div>
                            {supplier.contactPerson && (
                              <div className="text-xs text-muted-foreground">{supplier.contactPerson}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{supplier.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {supplier.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{supplier.gstin || "-"}</span>
                      </TableCell>
                      <TableCell>{supplier.paymentTermsDays || 30} days</TableCell>
                      <TableCell>
                        {supplier.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-supplier-${supplier.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(supplier)} data-testid={`menu-edit-supplier-${supplier.id}`}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
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
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <SupplierFormFields formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add-supplier">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-supplier">
              {createMutation.isPending ? "Saving..." : "Save Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <SupplierFormFields formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-supplier">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-update-supplier">
              {updateMutation.isPending ? "Updating..." : "Update Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Suppliers"
        templateHeaders={["Name", "Code", "Contact", "Phone", "Email", "Address", "GSTNo", "DrugLicenseNo"]}
        templateSampleData={[["ABC Pharma", "SUP001", "John", "9876543210", "abc@pharma.com", "Mumbai", "22AAAAA0000A1Z5", "DL-12345"]]}
        templateFilename="suppliers_import"
        entityName="suppliers"
        onImport={async (data) => {
          const suppliers = data.map(row => ({
            name: row.name || 'Unknown',
            code: row.code || `SUP-${Date.now()}`,
            contact: row.contact || null,
            phone: row.phone || null,
            email: row.email || null,
            address: row.address || null,
            gstNo: row.gstno || null,
            drugLicenseNo: row.druglicenseno || null,
            paymentTerms: null,
          }));
          const res = await fetch('/api/suppliers/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suppliers }),
          });
          if (!res.ok) throw new Error('Import failed');
          return res.json();
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] })}
      />
    </AppLayout>
  );
}
