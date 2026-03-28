import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Search, FlaskConical, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Medicine } from "@shared/schema";

interface GenericNameItem {
  id: number;
  name: string;
  isActive: boolean;
}

interface GenericSummary {
  genericName: string;
  medicineCount: number;
  batchCount: number;
  totalStock: number;
}

export default function GenericStock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [newGenericName, setNewGenericName] = useState("");
  const [selectedGenericId, setSelectedGenericId] = useState<string>("");
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<GenericNameItem | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GenericNameItem | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const response = await fetch("/api/medicines");
      if (!response.ok) throw new Error("Failed to fetch medicines");
      return response.json();
    },
  });

  const { data: genericNames = [], isLoading: genericLoading } = useQuery<GenericNameItem[]>({
    queryKey: ["/api/generic-names", "all"],
    queryFn: async () => {
      const response = await fetch("/api/generic-names?includeInactive=true");
      if (!response.ok) throw new Error("Failed to fetch generic names");
      return response.json();
    },
  });

  const activeGenericNames = useMemo(
    () => genericNames.filter((item) => item.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [genericNames],
  );

  const genericSummaries = useMemo(() => {
    const grouped = new Map<string, { genericName: string; medicineNames: Set<string>; batchCount: number; totalStock: number }>();

    for (const item of medicines) {
      const rawGenericName = String((item as any).genericName || "").trim();
      const genericName = rawGenericName || "Unspecified";
      const key = genericName.toLowerCase();
      const existing = grouped.get(key);

      if (existing) {
        existing.medicineNames.add(item.name);
        existing.batchCount += 1;
        existing.totalStock += Number(item.quantity) || 0;
      } else {
        grouped.set(key, {
          genericName,
          medicineNames: new Set([item.name]),
          batchCount: 1,
          totalStock: Number(item.quantity) || 0,
        });
      }
    }

    return Array.from(grouped.values())
      .map<GenericSummary>((entry) => ({
        genericName: entry.genericName,
        medicineCount: entry.medicineNames.size,
        batchCount: entry.batchCount,
        totalStock: entry.totalStock,
      }))
      .sort((a, b) => a.genericName.localeCompare(b.genericName));
  }, [medicines]);

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/generic-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.details || payload?.error || "Failed to create generic name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic-names"] });
      setNewGenericName("");
      toast({ title: "Generic name created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create generic name", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await fetch(`/api/generic-names/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.details || payload?.error || "Failed to update generic name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic-names"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setEditingItem(null);
      setEditName("");
      toast({ title: "Generic name updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update generic name", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/generic-names/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.details || payload?.error || "Failed to delete generic name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic-names"] });
      setDeleteTarget(null);
      toast({ title: "Generic name soft deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete generic name", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ genericNameId, medicineId }: { genericNameId: number; medicineId: number }) => {
      const response = await fetch("/api/generic-names/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genericNameId, medicineId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.details || payload?.error || "Failed to assign generic name");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setSelectedMedicineId("");
      toast({ title: "Generic assigned to medicine" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign generic", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const value = newGenericName.trim();
    if (!value) {
      toast({ title: "Generic name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(value);
  };

  const handleUpdate = () => {
    if (!editingItem) return;
    const value = editName.trim();
    if (!value) {
      toast({ title: "Generic name is required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editingItem.id, name: value });
  };

  const handleAssign = () => {
    if (!selectedGenericId || !selectedMedicineId) {
      toast({ title: "Select both generic and medicine", variant: "destructive" });
      return;
    }
    assignMutation.mutate({ genericNameId: Number(selectedGenericId), medicineId: Number(selectedMedicineId) });
  };

  const filteredSummaries = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return genericSummaries.filter((item) => item.genericName.toLowerCase().includes(searchLower));
  }, [genericSummaries, searchTerm]);

  const filteredGenericNames = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return genericNames.filter((item) => item.name.toLowerCase().includes(searchLower));
  }, [genericNames, searchTerm]);

  const medicineOptions = useMemo(
    () => [...medicines].sort((a, b) => a.name.localeCompare(b.name)),
    [medicines],
  );

  return (
    <AppLayout title="Generic Stock Summary">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Generic Master
              </CardTitle>
              <CardDescription className="mt-1">
                Create, modify and soft delete generic names. Soft deleted items are hidden from dropdown assignment.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/inventory";
              }}
              data-testid="button-go-inventory-for-generic"
            >
              <Package className="h-4 w-4 mr-2" />
              Go to Inventory
            </Button>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-6">
              <Input
                placeholder="Enter generic name"
                value={newGenericName}
                onChange={(e) => setNewGenericName(e.target.value)}
                data-testid="input-create-generic"
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-create-generic">
                {createMutation.isPending ? "Creating..." : "Create Generic"}
              </Button>
            </div>

            <div className="relative w-full max-w-sm mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Search generic name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-generic-search"
              />
            </div>

            {genericLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading generic master...</div>
            ) : filteredGenericNames.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No generic names found.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Generic Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGenericNames.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.isActive ? "Active" : "Soft Deleted"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(item);
                                setEditName(item.name);
                              }}
                              disabled={updateMutation.isPending || !item.isActive}
                              data-testid={`button-edit-generic-${item.id}`}
                            >
                              Modify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteTarget(item)}
                              disabled={deleteMutation.isPending || !item.isActive}
                              data-testid={`button-delete-generic-${item.id}`}
                            >
                              Delete
                            </Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Medicine Dropdown Assignment</CardTitle>
            <CardDescription>Select medicine and generic name from dropdowns to assign quickly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Generic Name</Label>
              <Select value={selectedGenericId} onValueChange={setSelectedGenericId}>
                <SelectTrigger className="mt-1.5" data-testid="select-assign-generic">
                  <SelectValue placeholder="Select generic name" />
                </SelectTrigger>
                <SelectContent>
                  {activeGenericNames.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Medicine</Label>
              <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                <SelectTrigger className="mt-1.5" data-testid="select-assign-medicine">
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {medicineOptions.map((medicine) => (
                    <SelectItem key={`${medicine.id}-${medicine.batchNumber}`} value={String(medicine.id)}>
                      {medicine.name} - {medicine.batchNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={assignMutation.isPending}
              data-testid="button-assign-generic"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Generic"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Stock Count by Generic Name</CardTitle>
          <CardDescription>Total medicine/batch/stock grouped by generic name.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading generic summary...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No generic summary found.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generic Name</TableHead>
                    <TableHead className="text-right">Medicines</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Total Stock (Base)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((item) => (
                    <TableRow key={item.genericName}>
                      <TableCell className="font-medium">{item.genericName}</TableCell>
                      <TableCell className="text-right">{item.medicineCount}</TableCell>
                      <TableCell className="text-right">{item.batchCount}</TableCell>
                      <TableCell className="text-right font-semibold">{item.totalStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Generic Name</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="edit-generic-name">Generic Name</Label>
            <Input
              id="edit-generic-name"
              className="mt-1.5"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              data-testid="input-edit-generic-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-save-generic-edit">
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soft Delete Generic Name</AlertDialogTitle>
            <AlertDialogDescription>
              {`Do you want to soft delete "${deleteTarget?.name || ""}"? It will be hidden from dropdowns but existing medicine values are kept.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-soft-delete-generic"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
