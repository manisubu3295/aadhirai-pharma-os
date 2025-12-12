import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Plus, Pencil, Trash2, Settings2 } from "lucide-react";

interface MenuGroup {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface MenuItem {
  id: number;
  key: string;
  label: string;
  routePath: string;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface MenuGroupMenu {
  id: number;
  menuGroupId: number;
  menuId: number;
}

export default function MenuGroups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMenusDialogOpen, setIsMenusDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MenuGroup | null>(null);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const { data: groups = [], isLoading } = useQuery<MenuGroup[]>({
    queryKey: ["/api/admin/menu-groups"],
  });

  const { data: allMenus = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/admin/menus"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/menu-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-groups"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Menu group created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/admin/menu-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update group");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-groups"] });
      setIsDialogOpen(false);
      setEditingGroup(null);
      resetForm();
      toast({ title: "Menu group updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update group", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/menu-groups/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete group");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-groups"] });
      toast({ title: "Menu group deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete group", variant: "destructive" });
    },
  });

  const updateMenusMutation = useMutation({
    mutationFn: async ({ groupId, menuIds }: { groupId: number; menuIds: number[] }) => {
      const res = await fetch(`/api/admin/menu-groups/${groupId}/menus`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ menuIds }),
      });
      if (!res.ok) throw new Error("Failed to update menus");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      setIsMenusDialogOpen(false);
      setSelectedGroup(null);
      toast({ title: "Group menus updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update group menus", variant: "destructive" });
    },
  });

  const { data: groupMenus = [] } = useQuery<MenuGroupMenu[]>({
    queryKey: ["/api/admin/menu-groups", selectedGroup?.id, "menus"],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const res = await fetch(`/api/admin/menu-groups/${selectedGroup.id}/menus`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch group menus");
      return res.json();
    },
    enabled: !!selectedGroup,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: true,
    });
  };

  const handleEdit = (group: MenuGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      isActive: group.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleManageMenus = async (group: MenuGroup) => {
    setSelectedGroup(group);
    setIsMenusDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this menu group?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveMenus = () => {
    if (selectedGroup) {
      updateMenusMutation.mutate({ groupId: selectedGroup.id, menuIds: selectedMenuIds });
    }
  };

  const toggleMenuSelection = (menuId: number) => {
    setSelectedMenuIds(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  useState(() => {
    if (groupMenus.length > 0) {
      setSelectedMenuIds(groupMenus.map(gm => gm.menuId));
    }
  });

  return (
    <AppLayout title="Menu Groups">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Menu Groups
            </CardTitle>
            <Button
              onClick={() => {
                resetForm();
                setEditingGroup(null);
                setIsDialogOpen(true);
              }}
              data-testid="button-add-group"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No menu groups found. Groups help organize menu access for users.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-muted-foreground">{group.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? "default" : "secondary"}>
                          {group.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleManageMenus(group)}
                            title="Manage Menus"
                            data-testid={`button-manage-menus-${group.id}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(group)}
                            data-testid={`button-edit-group-${group.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(group.id)}
                            data-testid={`button-delete-group-${group.id}`}
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
            <DialogTitle>{editingGroup ? "Edit Menu Group" : "Add New Menu Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Operations"
                data-testid="input-group-name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Day-to-day operations menus"
                data-testid="input-group-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-group-active"
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
              data-testid="button-save-group"
            >
              {editingGroup ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMenusDialogOpen} onOpenChange={setIsMenusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Menus for {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {allMenus
                .filter(m => m.isActive)
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((menu) => (
                  <div
                    key={menu.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedMenuIds.includes(menu.id)}
                      onCheckedChange={() => toggleMenuSelection(menu.id)}
                      data-testid={`checkbox-menu-${menu.id}`}
                    />
                    <span className="text-sm">{menu.label}</span>
                    <span className="text-xs text-muted-foreground">({menu.key})</span>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMenusDialogOpen(false)} data-testid="button-cancel-menus">
              Cancel
            </Button>
            <Button
              onClick={handleSaveMenus}
              disabled={updateMenusMutation.isPending}
              data-testid="button-save-menus"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
