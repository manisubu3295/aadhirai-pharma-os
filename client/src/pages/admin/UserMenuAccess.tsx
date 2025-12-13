import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, FolderOpen, Save } from "lucide-react";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface MenuItem {
  id: number;
  key: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

interface MenuGroup {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface UserMenuPermission {
  menuId: number;
  canView: boolean;
  canEdit: boolean;
}

interface UserAccess {
  menus: { id: number; menuId: number; canView: boolean; canEdit: boolean }[];
  groups: { id: number; menuGroupId: number }[];
}

export default function UserMenuAccess() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [menuPermissions, setMenuPermissions] = useState<Map<number, { canView: boolean; canEdit: boolean }>>(new Map());
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMenus = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/admin/menus"],
  });

  const { data: allGroups = [] } = useQuery<MenuGroup[]>({
    queryKey: ["/api/admin/menu-groups"],
  });

  const { data: userAccess, isLoading: isLoadingAccess } = useQuery<UserAccess>({
    queryKey: ["/api/admin/users", selectedUserId, "menus"],
    queryFn: async () => {
      if (!selectedUserId) return { menus: [], groups: [] };
      const res = await fetch(`/api/admin/users/${selectedUserId}/menus`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user access");
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    if (userAccess) {
      const permMap = new Map<number, { canView: boolean; canEdit: boolean }>();
      userAccess.menus.forEach(m => {
        permMap.set(m.menuId, { canView: m.canView, canEdit: m.canEdit });
      });
      setMenuPermissions(permMap);
      setSelectedGroupIds(userAccess.groups.map(g => g.menuGroupId));
      setHasChanges(false);
    }
  }, [userAccess]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissions: UserMenuPermission[] = [];
      menuPermissions.forEach((perms, menuId) => {
        if (perms.canView || perms.canEdit) {
          permissions.push({ menuId, canView: perms.canView, canEdit: perms.canEdit });
        }
      });

      const res = await fetch(`/api/admin/users/${selectedUserId}/menus`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          permissions,
          groupIds: selectedGroupIds,
        }),
      });
      if (!res.ok) throw new Error("Failed to save access");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUserId, "menus"] });
      queryClient.invalidateQueries({ queryKey: ["navigation"] });
      setHasChanges(false);
      toast({ title: "User access saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save user access", variant: "destructive" });
    },
  });

  const selectedUser = users.find(u => u.id === selectedUserId);
  const isOwnerOrAdmin = selectedUser?.role === "owner" || selectedUser?.role === "admin";

  const toggleMenuPermission = (menuId: number, type: "canView" | "canEdit") => {
    setMenuPermissions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(menuId) || { canView: false, canEdit: false };
      if (type === "canView") {
        newMap.set(menuId, { canView: !current.canView, canEdit: current.canEdit && !current.canView ? false : current.canEdit });
      } else {
        const newCanEdit = !current.canEdit;
        newMap.set(menuId, { canView: newCanEdit ? true : current.canView, canEdit: newCanEdit });
      }
      return newMap;
    });
    setHasChanges(true);
  };

  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      }
      return [...prev, groupId];
    });
    setHasChanges(true);
  };

  const staffUsers = users.filter(u => u.role !== "owner" && u.role !== "admin" && u.isActive);

  return (
    <AppLayout title="User Menu Access">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Manage User Access
            </CardTitle>
            <CardDescription>
              Configure which menus each user can access. Owners and admins have full access by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-72">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.username} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasChanges && (
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-access"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </div>

            {!selectedUserId ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a user to manage their menu access.
              </div>
            ) : isOwnerOrAdmin ? (
              <div className="text-center py-12">
                <Badge variant="secondary" className="mb-2">Full Access</Badge>
                <p className="text-muted-foreground">
                  This user has the "{selectedUser?.role}" role and has full access to all menus.
                </p>
              </div>
            ) : isLoadingAccess ? (
              <div className="text-center py-12 text-muted-foreground">Loading user access...</div>
            ) : (
              <Tabs defaultValue="menus">
                <TabsList>
                  <TabsTrigger value="menus" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Individual Menus
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Menu Groups
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="menus" className="mt-4">
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="grid grid-cols-[1fr,100px,100px] bg-gradient-to-r from-muted/80 to-muted/40 border-b">
                      <div className="px-5 py-3.5 font-semibold text-sm tracking-wide">Menu Item</div>
                      <div className="px-4 py-3.5 font-semibold text-sm text-center tracking-wide">View</div>
                      <div className="px-4 py-3.5 font-semibold text-sm text-center tracking-wide">Edit</div>
                    </div>
                    <ScrollArea className="h-[380px]">
                      <div className="divide-y divide-border/50">
                        {allMenus
                          .filter(m => m.isActive)
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((menu, index) => {
                            const perms = menuPermissions.get(menu.id) || { canView: false, canEdit: false };
                            return (
                              <div
                                key={menu.id}
                                className={`grid grid-cols-[1fr,100px,100px] items-center transition-colors duration-150 hover:bg-primary/5 ${
                                  index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                }`}
                              >
                                <div className="px-5 py-3.5">
                                  <div className="font-medium text-sm">{menu.label}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{menu.key}</div>
                                </div>
                                <div className="px-4 py-3.5 flex justify-center">
                                  <div className={`p-2 rounded-lg transition-colors ${perms.canView ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                                    <Checkbox
                                      checked={perms.canView}
                                      onCheckedChange={() => toggleMenuPermission(menu.id, "canView")}
                                      className="h-5 w-5"
                                      data-testid={`checkbox-view-${menu.id}`}
                                    />
                                  </div>
                                </div>
                                <div className="px-4 py-3.5 flex justify-center">
                                  <div className={`p-2 rounded-lg transition-colors ${perms.canEdit ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                                    <Checkbox
                                      checked={perms.canEdit}
                                      onCheckedChange={() => toggleMenuPermission(menu.id, "canEdit")}
                                      className="h-5 w-5"
                                      data-testid={`checkbox-edit-${menu.id}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Assign menu groups to give the user access to all menus in that group.
                  </p>
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <ScrollArea className="h-[380px]">
                      <div className="divide-y divide-border/50">
                        {allGroups
                          .filter(g => g.isActive)
                          .map((group, index) => (
                            <div
                              key={group.id}
                              className={`flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-primary/5 ${
                                index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                              }`}
                            >
                              <div className={`p-2 rounded-lg transition-colors ${selectedGroupIds.includes(group.id) ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                                <Checkbox
                                  checked={selectedGroupIds.includes(group.id)}
                                  onCheckedChange={() => toggleGroupSelection(group.id)}
                                  className="h-5 w-5"
                                  data-testid={`checkbox-group-${group.id}`}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{group.name}</div>
                                {group.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                                )}
                              </div>
                              {selectedGroupIds.includes(group.id) && (
                                <Badge variant="secondary" className="text-xs">Assigned</Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
