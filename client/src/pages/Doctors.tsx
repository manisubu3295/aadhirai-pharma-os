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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Plus, Edit, Stethoscope, Phone, BadgeCheck, Crown, Lock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/planContext";
import type { Doctor } from "@shared/schema";

interface DoctorFormData {
  name: string;
  specialization: string;
  phone: string;
  registrationNo: string;
}

const emptyForm: DoctorFormData = {
  name: "",
  specialization: "",
  phone: "",
  registrationNo: "",
};

export default function Doctors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>(emptyForm);

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

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
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
        body: JSON.stringify(data),
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
        body: JSON.stringify(data),
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

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doctor.phone && doctor.phone.includes(searchTerm)) ||
    (doctor.registrationNo && doctor.registrationNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditDialog = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization || "",
      phone: doctor.phone || "",
      registrationNo: doctor.registrationNo || "",
    });
    setEditDialogOpen(true);
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

  const DoctorFormFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Doctor Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Dr. Name"
          data-testid="input-doctor-name"
        />
      </div>
      <div>
        <Label htmlFor="specialization">Specialization</Label>
        <Input
          id="specialization"
          value={formData.specialization}
          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
          placeholder="e.g., General Physician, Cardiologist"
          data-testid="input-doctor-specialization"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+91 98765 43210"
          data-testid="input-doctor-phone"
        />
      </div>
      <div>
        <Label htmlFor="registrationNo">Registration No.</Label>
        <Input
          id="registrationNo"
          value={formData.registrationNo}
          onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
          placeholder="MCI/State registration number"
          data-testid="input-doctor-registration"
        />
      </div>
    </div>
  );

  return (
    <AppLayout title="Doctors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <Button onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }} data-testid="button-add-doctor">
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </Button>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id} data-testid={`row-doctor-${doctor.id}`}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
          </DialogHeader>
          <DoctorFormFields />
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
          <DoctorFormFields />
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
    </AppLayout>
  );
}
