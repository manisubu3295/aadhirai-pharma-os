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
import { Badge } from "@/components/ui/badge";
import { NumericInput } from "@/components/ui/numeric-input";
import { Search, MoreHorizontal, Plus, Edit, Stethoscope, Phone, BadgeCheck, Crown, Lock, FileDown, Upload, Download, IndianRupee, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { useState, memo } from "react";
import { ImportDialog } from "@/components/ui/import-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/planContext";
import type { Doctor } from "@shared/schema";

type DoctorWithBalance = Doctor & { commissionBalance: string };

interface DoctorFormData {
  name: string;
  specialization: string;
  phone: string;
  registrationNo: string;
  commissionBasis: string;
  commissionRate: string;
  commissionFixedAmount: string;
  minSaleAmount: string;
}

const emptyForm: DoctorFormData = {
  name: "",
  specialization: "",
  phone: "",
  registrationNo: "",
  commissionBasis: "none",
  commissionRate: "",
  commissionFixedAmount: "",
  minSaleAmount: "",
};

const commissionBasisLabels: Record<string, string> = {
  subtotal_pretax: "of Subtotal (pre-tax)",
  total_with_gst: "of Total (incl. GST)",
  fixed: "Fixed per sale",
};

interface DoctorFormFieldsProps {
  formData: DoctorFormData;
  setFormData: React.Dispatch<React.SetStateAction<DoctorFormData>>;
}

const DoctorFormFields = memo(function DoctorFormFields({ formData, setFormData }: DoctorFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Doctor Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Dr. Name"
          data-testid="input-doctor-name"
        />
      </div>
      <div>
        <Label htmlFor="specialization">Specialization</Label>
        <Input
          id="specialization"
          value={formData.specialization}
          onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
          placeholder="e.g., General Physician, Cardiologist"
          data-testid="input-doctor-specialization"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="+91 98765 43210"
          data-testid="input-doctor-phone"
        />
      </div>
      <div>
        <Label htmlFor="registrationNo">Registration No.</Label>
        <Input
          id="registrationNo"
          value={formData.registrationNo}
          onChange={(e) => setFormData(prev => ({ ...prev, registrationNo: e.target.value }))}
          placeholder="MCI/State registration number"
          data-testid="input-doctor-registration"
        />
      </div>
      <div className="pt-2 border-t">
        <Label htmlFor="commissionBasis">Referral Commission</Label>
        <Select
          value={formData.commissionBasis}
          onValueChange={(value) => setFormData(prev => ({ ...prev, commissionBasis: value }))}
        >
          <SelectTrigger id="commissionBasis" data-testid="select-commission-basis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No commission</SelectItem>
            <SelectItem value="subtotal_pretax">% of Subtotal (pre-tax)</SelectItem>
            <SelectItem value="total_with_gst">% of Total (incl. GST)</SelectItem>
            <SelectItem value="fixed">Fixed amount per sale</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(formData.commissionBasis === "subtotal_pretax" || formData.commissionBasis === "total_with_gst") && (
        <div>
          <Label htmlFor="commissionRate">Commission Rate (%)</Label>
          <NumericInput
            min={0}
            allowDecimal={true}
            value={parseFloat(formData.commissionRate) || 0}
            onChange={(value) => setFormData(prev => ({ ...prev, commissionRate: String(value) }))}
            placeholder="e.g., 5"
            data-testid="input-commission-rate"
          />
        </div>
      )}
      {formData.commissionBasis === "fixed" && (
        <div>
          <Label htmlFor="commissionFixedAmount">Fixed Amount (₹)</Label>
          <NumericInput
            min={0}
            allowDecimal={true}
            value={parseFloat(formData.commissionFixedAmount) || 0}
            onChange={(value) => setFormData(prev => ({ ...prev, commissionFixedAmount: String(value) }))}
            placeholder="e.g., 50"
            data-testid="input-commission-fixed-amount"
          />
        </div>
      )}
      {formData.commissionBasis !== "none" && (
        <div>
          <Label htmlFor="minSaleAmount">Minimum Sale Amount (₹, optional)</Label>
          <NumericInput
            min={0}
            allowDecimal={true}
            value={parseFloat(formData.minSaleAmount) || 0}
            onChange={(value) => setFormData(prev => ({ ...prev, minSaleAmount: String(value) }))}
            placeholder="0 = always earns commission"
            data-testid="input-min-sale-amount"
          />
        </div>
      )}
    </div>
  );
});

function toDoctorPayload(formData: DoctorFormData) {
  return {
    name: formData.name,
    specialization: formData.specialization || null,
    phone: formData.phone || null,
    registrationNo: formData.registrationNo || null,
    commissionBasis: formData.commissionBasis === "none" ? null : formData.commissionBasis,
    commissionRate:
      formData.commissionBasis === "subtotal_pretax" || formData.commissionBasis === "total_with_gst"
        ? (formData.commissionRate || "0")
        : null,
    commissionFixedAmount: formData.commissionBasis === "fixed" ? (formData.commissionFixedAmount || "0") : null,
    minSaleAmount: formData.commissionBasis === "none" ? "0" : (formData.minSaleAmount || "0"),
  };
}

export default function Doctors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithBalance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorWithBalance | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>(emptyForm);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [payoutNotes, setPayoutNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPro } = usePlan();

  if (!isPro) {
    return (
      <AppLayout title="Doctors">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">PRO Feature</h2>
            <p className="text-muted-foreground mb-4">
              Doctor management is available in PRO plan. Upgrade to manage referring doctors and link prescriptions to sales.
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Crown className="h-5 w-5" />
              <span className="font-medium">Upgrade to PRO</span>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const { data: doctors = [], isLoading } = useQuery<DoctorWithBalance[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const response = await fetch("/api/doctors");
      if (!response.ok) throw new Error("Failed to fetch doctors");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DoctorFormData) => {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toDoctorPayload(data)),
      });
      if (!res.ok) throw new Error("Failed to create doctor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      setAddDialogOpen(false);
      setFormData(emptyForm);
      toast({ title: "Doctor added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add doctor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DoctorFormData & { id: number }) => {
      const res = await fetch(`/api/doctors/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toDoctorPayload(data)),
      });
      if (!res.ok) throw new Error("Failed to update doctor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      setEditDialogOpen(false);
      setSelectedDoctor(null);
      setFormData(emptyForm);
      toast({ title: "Doctor updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update doctor", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/doctors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update doctor");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: variables.isActive ? "Doctor reactivated" : "Doctor marked inactive" });
    },
    onError: () => {
      toast({ title: "Failed to update doctor", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/doctors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to delete doctor");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      setDeleteTarget(null);
      toast({ title: "Doctor deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't delete doctor", description: error.message, variant: "destructive" });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async (data: { doctorId: number; amount: number; notes: string }) => {
      const res = await fetch("/api/doctor-commissions/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to record payout");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctor-commissions/transactions"] });
      setPayoutDialogOpen(false);
      setPayoutAmount(0);
      setPayoutNotes("");
      setSelectedDoctor(null);
      toast({ title: "Payout recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record payout", description: error.message, variant: "destructive" });
    },
  });

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doctor.phone && doctor.phone.includes(searchTerm)) ||
    (doctor.registrationNo && doctor.registrationNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditDialog = (doctor: DoctorWithBalance) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization || "",
      phone: doctor.phone || "",
      registrationNo: doctor.registrationNo || "",
      commissionBasis: doctor.commissionBasis || "none",
      commissionRate: doctor.commissionRate || "",
      commissionFixedAmount: doctor.commissionFixedAmount || "",
      minSaleAmount: doctor.minSaleAmount || "",
    });
    setEditDialogOpen(true);
  };

  const openPayoutDialog = (doctor: DoctorWithBalance) => {
    setSelectedDoctor(doctor);
    setPayoutAmount(parseFloat(doctor.commissionBalance) || 0);
    setPayoutNotes("");
    setPayoutDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Please enter doctor name", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!formData.name.trim() || !selectedDoctor) return;
    updateMutation.mutate({ ...formData, id: selectedDoctor.id });
  };

  const handleRecordPayout = () => {
    if (!selectedDoctor || payoutAmount <= 0) return;
    payoutMutation.mutate({ doctorId: selectedDoctor.id, amount: payoutAmount, notes: payoutNotes });
  };

  return (
    <AppLayout title="Doctors">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Doctors</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-doctors">
                  {doctors.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <BadgeCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Registration</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-registered-doctors">
                  {doctors.filter(d => d.registrationNo).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Phone</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-doctors-with-phone">
                  {doctors.filter(d => d.phone).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100">
                <IndianRupee className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission Owed</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-total-commission-owed">
                  ₹{doctors.reduce((sum, d) => sum + (parseFloat(d.commissionBalance) || 0), 0).toFixed(2)}
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
              <CardTitle>Doctor List</CardTitle>
              <CardDescription>Manage referring doctors for prescriptions</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search doctors..." 
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-doctors"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-doctors">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }} data-testid="button-add-doctor">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Doctor
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No doctors found</p>
              <p className="text-sm">Add your first doctor to link prescriptions to sales</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Balance Owed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => {
                    const balance = parseFloat(doctor.commissionBalance) || 0;
                    return (
                    <TableRow key={doctor.id} data-testid={`row-doctor-${doctor.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        DOC-{String(doctor.id).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                          </div>
                          {doctor.name}
                        </div>
                      </TableCell>
                      <TableCell>{doctor.specialization || "-"}</TableCell>
                      <TableCell>
                        {doctor.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {doctor.phone}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {doctor.registrationNo ? (
                          <div className="flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3 text-green-600" />
                            <span className="font-mono text-xs">{doctor.registrationNo}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {doctor.commissionBasis ? (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {doctor.commissionBasis === "fixed"
                              ? `₹${Number(doctor.commissionFixedAmount).toFixed(2)} / sale`
                              : `${Number(doctor.commissionRate).toFixed(2)}% ${commissionBasisLabels[doctor.commissionBasis]}`}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className={balance > 0 ? "font-medium text-amber-600" : "text-muted-foreground"}>
                        ₹{balance.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doctor.isActive ? "default" : "secondary"}>
                          {doctor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-doctor-${doctor.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(doctor)} data-testid={`menu-edit-doctor-${doctor.id}`}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {balance > 0 && (
                              <DropdownMenuItem onClick={() => openPayoutDialog(doctor)} data-testid={`menu-pay-commission-${doctor.id}`}>
                                <IndianRupee className="h-4 w-4 mr-2" /> Pay Commission
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => toggleActiveMutation.mutate({ id: doctor.id, isActive: !doctor.isActive })}
                              data-testid={`menu-toggle-active-doctor-${doctor.id}`}
                            >
                              {doctor.isActive ? (
                                <><Ban className="h-4 w-4 mr-2" /> Mark Inactive</>
                              ) : (
                                <><CheckCircle2 className="h-4 w-4 mr-2" /> Reactivate</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(doctor)}
                              data-testid={`menu-delete-doctor-${doctor.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
          </DialogHeader>
          <DoctorFormFields formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add-doctor">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-doctor">
              {createMutation.isPending ? "Saving..." : "Save Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
          </DialogHeader>
          <DoctorFormFields formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-doctor">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-update-doctor">
              {updateMutation.isPending ? "Updating..." : "Update Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Commission — {selectedDoctor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded">
              <span className="text-sm text-muted-foreground">Balance Owed</span>
              <span className="font-bold text-amber-600">
                ₹{selectedDoctor ? (parseFloat(selectedDoctor.commissionBalance) || 0).toFixed(2) : "0.00"}
              </span>
            </div>
            <div>
              <Label htmlFor="payoutAmount">Amount (₹)</Label>
              <NumericInput
                min={0}
                max={selectedDoctor ? parseFloat(selectedDoctor.commissionBalance) || 0 : 0}
                allowDecimal={true}
                value={payoutAmount}
                onChange={setPayoutAmount}
                data-testid="input-payout-amount"
              />
            </div>
            <div>
              <Label htmlFor="payoutNotes">Notes (optional)</Label>
              <Input
                id="payoutNotes"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="e.g., Paid via bank transfer"
                data-testid="input-payout-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} data-testid="button-cancel-payout">
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayout}
              disabled={payoutMutation.isPending || payoutAmount <= 0}
              data-testid="button-record-payout"
            >
              {payoutMutation.isPending ? "Recording..." : "Record Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Doctors"
        templateHeaders={["Name", "Specialization", "Phone", "RegistrationNo"]}
        templateSampleData={[["Dr. Smith", "General Physician", "9876543210", "MCI12345"]]}
        templateFilename="doctors_import"
        entityName="doctors"
        onImport={async (data) => {
          const doctors = data.map(row => ({
            name: row.name || 'Unknown',
            specialization: row.specialization || null,
            phone: row.phone || null,
            registrationNo: row.registrationno || null,
            email: null,
            address: null,
          }));
          const res = await fetch('/api/doctors/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctors }),
          });
          if (!res.ok) throw new Error('Import failed');
          return res.json();
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/doctors"] })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              {`Do you want to permanently delete "${deleteTarget?.name || ""}"? This cannot be undone. If this doctor has any sales or commission history, deletion will be blocked — mark them inactive instead.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete-doctor"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
