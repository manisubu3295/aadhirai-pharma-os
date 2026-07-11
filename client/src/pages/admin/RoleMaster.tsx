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
import { UserCog, Plus, Pencil, Trash2, Settings2 } from "lucide-react";

interface Role {
  id: number;
  name: string;
  description: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
}

interface MenuGroup {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface RoleMenuGroup {
  id: number;
  roleId: number;
  menuGroupId: number;
}

export default function RoleMaster() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGroupsDialogOpen, setIsGroupsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isSuperAdmin: false,
    isActive: true,
  });

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: allGroups = [] } = useQuery<MenuGroup[]>({
    queryKey: ["/api/admin/menu-groups"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Role created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create role", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsDialogOpen(false);
      setEditingRole(null);
      resetForm();
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete role", variant: "destructive" });
    },
  });

  const updateGroupsMutation = useMutation({
    mutationFn: async ({ roleId, groupIds }: { roleId: number; groupIds: number[] }) => {
      const res = await fetch(`/api/admin/roles/${roleId}/menu-groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupIds }),
      });
      if (!res.ok) throw new Error("Failed to update menu groups");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      setIsGroupsDialogOpen(false);
      setSelectedRole(null);
      toast({ title: "Role menu groups updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role menu groups", variant: "destructive" });
    },
  });

  const { data: roleGroups = [] } = useQuery<RoleMenuGroup[]>({
    queryKey: ["/api/admin/roles", selectedRole?.id, "menu-groups"],
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/menu-groups`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch role menu groups");
      return res.json();
    },
    enabled: !!selectedRole,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isSuperAdmin: false,
      isActive: true,
    });
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      isSuperAdmin: role.isSuperAdmin,
      isActive: role.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleManageGroups = async (role: Role) => {
    setSelectedRole(role);
    setIsGroupsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this role?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveGroups = () => {
    if (selectedRole) {
      updateGroupsMutation.mutate({ roleId: selectedRole.id, groupIds: selectedGroupIds });
    }
  };

  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  useState(() => {
    if (roleGroups.length > 0) {
      setSelectedGroupIds(roleGroups.map(rg => rg.menuGroupId));
    }
  });

  return (
    <AppLayout title="Role Master">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Role Master
            </CardTitle>
            <Button
              onClick={() => {
                resetForm();
                setEditingRole(null);
                setIsDialogOpen(true);
              }}
              data-testid="button-add-role"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No roles found. Roles let you assign menu groups to many users at once.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28">Super Admin</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">{role.description || "-"}</TableCell>
                      <TableCell>
                        {role.isSuperAdmin && <Badge>Super Admin</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isActive ? "default" : "secondary"}>
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleManageGroups(role)}
                            title="Manage Menu Groups"
                            data-testid={`button-manage-groups-${role.id}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(role)}
                            data-testid={`button-edit-role-${role.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(role.id)}
                            data-testid={`button-delete-role-${role.id}`}
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
            <DialogTitle>{editingRole ? "Edit Role" : "Add New Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Pharmacy Owner"
                data-testid="input-role-name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Default limited access for the pharmacy owner"
                data-testid="input-role-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isSuperAdmin}
                onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked })}
                data-testid="switch-role-super-admin"
              />
              <Label>Super Admin (full access to everything)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-role-active"
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
              data-testid="button-save-role"
            >
              {editingRole ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupsDialogOpen} onOpenChange={setIsGroupsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Menu Groups for {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {allGroups
                .filter(g => g.isActive)
                .map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={() => toggleGroupSelection(group.id)}
                      data-testid={`checkbox-role-group-${group.id}`}
                    />
                    <span className="text-sm">{group.name}</span>
                    {group.description && (
                      <span className="text-xs text-muted-foreground">({group.description})</span>
                    )}
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupsDialogOpen(false)} data-testid="button-cancel-groups">
              Cancel
            </Button>
            <Button
              onClick={handleSaveGroups}
              disabled={updateGroupsMutation.isPending}
              data-testid="button-save-role-groups"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
