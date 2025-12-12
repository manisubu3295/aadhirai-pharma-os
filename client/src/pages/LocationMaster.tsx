import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Edit, Trash2, LayoutGrid, FileDown, Upload, Download } from "lucide-react";
import { usePlan } from "@/lib/planContext";
import { ImportDialog } from "@/components/ui/import-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Location {
  id: number;
  rack: string;
  row: string;
  bin: string;
  description: string;
}

export default function LocationMaster() {
  const { isPro } = usePlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    rack: "",
    row: "",
    bin: "",
    description: ""
  });

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    enabled: isPro,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Location created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create location", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest("PUT", `/api/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      toast({ title: "Location updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update location", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({ title: "Location deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete location", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ rack: "", row: "", bin: "", description: "" });
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      rack: location.rack,
      row: location.row,
      bin: location.bin,
      description: location.description || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!isPro) {
    return (
      <AppLayout title="Location Master">
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PRO Feature</h3>
              <p className="text-muted-foreground">
                Location Master (Rack/Row/Bin) is available in the PRO plan. Switch to PRO to manage storage locations and track medicine positions.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Location Master">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Storage Locations</h2>
            <p className="text-muted-foreground">Manage rack, row, and bin locations for inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-locations">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingLocation(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-location">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rack">Rack</Label>
                    <Input
                      id="rack"
                      value={formData.rack}
                      onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                      placeholder="A"
                      required
                      data-testid="input-rack"
                    />
                  </div>
                  <div>
                    <Label htmlFor="row">Row/Shelf</Label>
                    <Input
                      id="row"
                      value={formData.row}
                      onChange={(e) => setFormData({ ...formData, row: e.target.value })}
                      placeholder="3"
                      required
                      data-testid="input-row"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bin">Bin</Label>
                    <Input
                      id="bin"
                      value={formData.bin}
                      onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                      placeholder="2"
                      required
                      data-testid="input-bin"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Near entrance, cold storage area"
                    data-testid="input-description"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save-location">
                    {editingLocation ? "Update" : "Create"} Location
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              All Locations ({locations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No locations defined yet</p>
                <p className="text-sm text-muted-foreground">Add your first rack/row/bin location</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location Code</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead>Row/Shelf</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id} data-testid={`row-location-${location.id}`}>
                      <TableCell className="font-mono font-medium">
                        {location.rack}-{location.row}-{location.bin}
                      </TableCell>
                      <TableCell>{location.rack}</TableCell>
                      <TableCell>{location.row}</TableCell>
                      <TableCell>{location.bin}</TableCell>
                      <TableCell className="text-muted-foreground">{location.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(location)}
                          data-testid={`button-edit-location-${location.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(location.id)}
                          data-testid={`button-delete-location-${location.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Locations"
        templateHeaders={["Rack", "Row", "Bin", "Description"]}
        templateSampleData={[["A", "1", "01", "First shelf section"]]}
        templateFilename="locations_import"
        entityName="locations"
        onImport={async (data) => {
          const locations = data.map(row => ({
            rack: row.rack || 'A',
            row: row.row || '1',
            bin: row.bin || '01',
            description: row.description || null,
          }));
          const res = await fetch('/api/locations/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locations }),
          });
          if (!res.ok) throw new Error('Import failed');
          return res.json();
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/locations"] })}
      />
    </AppLayout>
  );
}
