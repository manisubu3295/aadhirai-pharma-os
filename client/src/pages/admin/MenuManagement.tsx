import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Menu, Plus, Pencil, Trash2, RefreshCw, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface MenuItem {
  id: number;
  key: string;
  label: string;
  routePath: string;
  icon: string | null;
  parentId: number | null;
  displayOrder: number;
  isActive: boolean;
}

const iconOptions = [
  "LayoutDashboard", "Package", "ShoppingCart", "Users", "FileText", "Settings",
  "Plus", "CreditCard", "MapPin", "Shield", "Calculator", "BarChart3", "Stethoscope",
  "Truck", "Tags", "ClipboardList", "PackageCheck", "Receipt", "RotateCcw", "Menu", "FolderOpen"
];

export default function MenuManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    label: "",
    routePath: "",
    icon: "Package",
    displayOrder: 0,
    isActive: true,
  });

  const { data: menus = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/admin/menus"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create menu");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Menu created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create menu", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/admin/menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update menu");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      setIsDialogOpen(false);
      setEditingMenu(null);
      resetForm();
      toast({ title: "Menu updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update menu", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/menus/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete menu");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      toast({ title: "Menu deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete menu", variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/seed-menus", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to seed menus");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      toast({ title: "Default menus seeded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to seed menus", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      label: "",
      routePath: "",
      icon: "Package",
      displayOrder: 0,
      isActive: true,
    });
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setFormData({
      key: menu.key,
      label: menu.label,
      routePath: menu.routePath,
      icon: menu.icon || "Package",
      displayOrder: menu.displayOrder,
      isActive: menu.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingMenu) {
      updateMutation.mutate({ id: editingMenu.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this menu?")) {
      deleteMutation.mutate(id);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-4 h-4" /> : null;
  };

  return (
    <AppLayout title="Menu Management">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              System Menus
            </CardTitle>
            <div className="flex gap-2">
              {menus.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed-menus"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`} />
                  Seed Default Menus
                </Button>
              )}
              <Button
                onClick={() => {
                  resetForm();
                  setEditingMenu(null);
                  setIsDialogOpen(true);
                }}
                data-testid="button-add-menu"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Menu
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading menus...</div>
            ) : menus.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No menus found. Click "Seed Default Menus" to create the default menu structure.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Order</TableHead>
                    <TableHead className="w-12">Icon</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((menu) => (
                      <TableRow key={menu.id} data-testid={`row-menu-${menu.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            {menu.displayOrder}
                          </div>
                        </TableCell>
                        <TableCell>{getIconComponent(menu.icon)}</TableCell>
                        <TableCell className="font-medium">{menu.label}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{menu.key}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{menu.routePath}</TableCell>
                        <TableCell>
                          <Badge variant={menu.isActive ? "default" : "secondary"}>
                            {menu.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(menu)}
                              data-testid={`button-edit-menu-${menu.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(menu.id)}
                              data-testid={`button-delete-menu-${menu.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMenu ? "Edit Menu" : "Add New Menu"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Key (unique identifier)</Label>
                <Input
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., sales.new"
                  data-testid="input-menu-key"
                />
              </div>
              <div>
                <Label>Label (display name)</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., New Sale"
                  data-testid="input-menu-label"
                />
              </div>
            </div>
            <div>
              <Label>Route Path</Label>
              <Input
                value={formData.routePath}
                onChange={(e) => setFormData({ ...formData, routePath: e.target.value })}
                placeholder="e.g., /new-sale"
                data-testid="input-menu-route"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="select-menu-icon"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-menu-order"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-menu-active"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-menu"
            >
              {editingMenu ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
