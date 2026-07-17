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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Settings as SettingsIcon,
  Store,
  FileText,
  Plus,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Key,
  DatabaseBackup,
  UserCog,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  roleId: number | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

interface UserFormData {
  username: string;
  password: string;
  name: string;
  roleId: number | null;
  email: string;
  phone: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  systemRole: string;
  isActive: boolean;
}

interface SettingsData {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeEmail: string;
  dlNo: string;
  gstin: string;
  stateCode: string;
  autoGst: string;
  invoicePrefix: string;
  startNumber: string;
  showMrp: string;
  showGstBreakup: string;
  showDoctor: string;
  printOnSave: string;
  defaultGrnDiscountRate: string;
  defaultGrnGstMode: "item" | "header";
  enableCardPayment: string;
  enableCreditBilling: string;
}

const defaultSettings: SettingsData = {
  storeName: "Aadhirai Innovations Pharmacy",
  storePhone: "+91 98765 43210",
  storeAddress: "123 Main Street, Chennai, Tamil Nadu - 600001",
  storeEmail: "contact@aadhiraipharmacy.com",
  dlNo: "TN-01-123456",
  gstin: "33AABCU9603R1ZM",
  stateCode: "33",
  autoGst: "true",
  invoicePrefix: "INV-",
  startNumber: "1001",
  showMrp: "true",
  showGstBreakup: "true",
  showDoctor: "true",
  printOnSave: "false",
  defaultGrnDiscountRate: "5",
  defaultGrnGstMode: "item",
  enableCardPayment: "false",
  enableCreditBilling: "false",
};

const emptyUserForm: UserFormData = {
  username: "",
  password: "",
  name: "",
  roleId: null,
  email: "",
  phone: "",
};

export default function Settings() {
  const [location] = useLocation();
  const isUserManagementRoute = location === "/admin/users";
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<UserFormData>(emptyUserForm);
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", phone: "", roleId: null as number | null });
  const [resetInvoicesDialogOpen, setResetInvoicesDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const { data: savedSettings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (savedSettings) {
      // A key is only absent (undefined) if it has never been saved — once
      // saved, even as "", that's a deliberate value and must not be
      // clobbered back to the placeholder default (savedSettings.x || y
      // would do exactly that, since "" is falsy).
      const withDefault = (value: string | undefined, fallback: string) =>
        value !== undefined ? value : fallback;
      setSettings({
        storeName: withDefault(savedSettings.storeName, defaultSettings.storeName),
        storePhone: withDefault(savedSettings.storePhone, defaultSettings.storePhone),
        storeAddress: withDefault(savedSettings.storeAddress, defaultSettings.storeAddress),
        storeEmail: withDefault(savedSettings.storeEmail, defaultSettings.storeEmail),
        dlNo: withDefault(savedSettings.dlNo, defaultSettings.dlNo),
        gstin: withDefault(savedSettings.gstin, defaultSettings.gstin),
        stateCode: withDefault(savedSettings.stateCode, defaultSettings.stateCode),
        autoGst: withDefault(savedSettings.autoGst, defaultSettings.autoGst),
        invoicePrefix: withDefault(savedSettings.invoicePrefix, defaultSettings.invoicePrefix),
        startNumber: withDefault(savedSettings.startNumber, defaultSettings.startNumber),
        showMrp: withDefault(savedSettings.showMrp, defaultSettings.showMrp),
        showGstBreakup: withDefault(savedSettings.showGstBreakup, defaultSettings.showGstBreakup),
        showDoctor: withDefault(savedSettings.showDoctor, defaultSettings.showDoctor),
        printOnSave: withDefault(savedSettings.printOnSave, defaultSettings.printOnSave),
        defaultGrnDiscountRate: withDefault(savedSettings.defaultGrnDiscountRate, defaultSettings.defaultGrnDiscountRate),
        defaultGrnGstMode: savedSettings.defaultGrnGstMode === "header" ? "header" : "item",
        enableCardPayment: withDefault(savedSettings.enableCardPayment, defaultSettings.enableCardPayment),
        enableCreditBilling: withDefault(savedSettings.enableCreditBilling, defaultSettings.enableCreditBilling),
      });
    }
  }, [savedSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SettingsData>) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const { data: backupStatus, isLoading: backupStatusLoading } = useQuery<{
    backups: { name: string; size: number; createdAt: string }[];
  }>({
    queryKey: ["/api/admin/backup/status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/backup/status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backup status");
      return res.json();
    },
  });

  const backupFrequencyMutation = useMutation({
    mutationFn: async (frequency: string) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_frequency: frequency }),
      });
      if (!res.ok) throw new Error("Failed to save backup frequency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Backup frequency updated" });
    },
    onError: () => {
      toast({ title: "Failed to update backup frequency", variant: "destructive" });
    },
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/backup/run", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run backup");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Backup completed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Backup failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: resetPreview, isLoading: resetPreviewLoading } = useQuery<{ sales: number; returns: number }>({
    queryKey: ["/api/admin/reset-invoices/preview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reset-invoices/preview", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load reset preview");
      return res.json();
    },
    enabled: resetInvoicesDialogOpen,
  });

  const resetInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reset-invoices", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset invoices");
      return data as { salesDeleted: number; returnsDeleted: number; backupFile: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "Invoices reset",
        description: `Deleted ${data.salesDeleted} invoice(s) and ${data.returnsDeleted} return(s). Next invoice starts at #1. A backup was saved first (${data.backupFile}).`,
      });
      setResetInvoicesDialogOpen(false);
      setResetConfirmText("");
    },
    onError: (error: Error) => {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddUserDialogOpen(false);
      setUserFormData(emptyUserForm);
      toast({ title: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error("Failed to reset password");
      return res.json();
    },
    onSuccess: () => {
      setResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
      setNewPassword("");
      toast({ title: "Password reset successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reset password", variant: "destructive" });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editUserForm }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUserDialogOpen(false);
      setEditUserTarget(null);
      toast({ title: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateUser = () => {
    if (!userFormData.username || !userFormData.password || !userFormData.name) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(userFormData);
  };

  const handleResetPassword = () => {
    if (!resetPasswordUser || !newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    resetPasswordMutation.mutate({ userId: resetPasswordUser.id, newPassword });
  };

  const openEditUserDialog = (user: User) => {
    setEditUserTarget(user);
    setEditUserForm({ name: user.name, email: user.email || "", phone: user.phone || "", roleId: user.roleId });
    setEditUserDialogOpen(true);
  };

  const handleEditUser = () => {
    if (!editUserTarget) return;
    if (!editUserForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    editUserMutation.mutate({ userId: editUserTarget.id, data: editUserForm });
  };

  const handleSaveStoreSettings = () => {
    saveSettingsMutation.mutate({
      storeName: settings.storeName,
      storePhone: settings.storePhone,
      storeAddress: settings.storeAddress,
      storeEmail: settings.storeEmail,
      dlNo: settings.dlNo,
    });
  };

  const handleSaveGstSettings = () => {
    saveSettingsMutation.mutate({
      gstin: settings.gstin,
      stateCode: settings.stateCode,
      autoGst: settings.autoGst,
    });
  };

  const handleSaveInvoiceSettings = () => {
    saveSettingsMutation.mutate({
      invoicePrefix: settings.invoicePrefix,
      startNumber: settings.startNumber,
      showMrp: settings.showMrp,
      showGstBreakup: settings.showGstBreakup,
      showDoctor: settings.showDoctor,
      printOnSave: settings.printOnSave,
      defaultGrnDiscountRate: settings.defaultGrnDiscountRate,
      defaultGrnGstMode: settings.defaultGrnGstMode,
      enableCardPayment: settings.enableCardPayment,
      enableCreditBilling: settings.enableCreditBilling,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner": return "bg-purple-100 text-purple-700 border-purple-200";
      case "pharmacist": return "bg-blue-100 text-blue-700 border-blue-200";
      case "cashier": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Show the Role Master role name; fall back to the tier text for users
  // without an assigned role.
  const getRoleName = (user: User) => {
    const assigned = roles.find((r) => r.id === user.roleId);
    return assigned ? assigned.name : user.role;
  };

  return (
    <AppLayout title={isUserManagementRoute ? "User Management" : "Settings"}>
      <Tabs key={location} defaultValue={isUserManagementRoute ? "users" : "store"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="store" data-testid="tab-store">
            <Store className="h-4 w-4 mr-2" /> Store Profile
          </TabsTrigger>
          <TabsTrigger value="gst" data-testid="tab-gst">
            <SettingsIcon className="h-4 w-4 mr-2" /> GST Settings
          </TabsTrigger>
          <TabsTrigger value="invoice" data-testid="tab-invoice">
            <FileText className="h-4 w-4 mr-2" /> Invoice Settings
          </TabsTrigger>
          <TabsTrigger value="backup" data-testid="tab-backup">
            <DatabaseBackup className="h-4 w-4 mr-2" /> Backup
          </TabsTrigger>
          <TabsTrigger value="reset" data-testid="tab-reset">
            <AlertTriangle className="h-4 w-4 mr-2" /> Reset
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage staff accounts and access permissions
                </CardDescription>
              </div>
              <Button 
                size="sm"
                onClick={() => {
                  setUserFormData(emptyUserForm);
                  setAddUserDialogOpen(true);
                }}
                data-testid="button-add-user"
              >
                <Plus className="h-4 w-4 mr-2" /> Add User
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading users...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="font-mono text-sm">{user.username}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border capitalize ${getRoleBadgeColor(user.role)}`}>
                              {getRoleName(user)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{user.phone || "-"}</div>
                            <div className="text-xs text-muted-foreground">{user.email || "-"}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {user.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-500 inline" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 inline" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {(currentUser?.role === "owner" || currentUser?.role === "admin") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditUserDialog(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <UserCog className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            )}
                            {(currentUser?.role === "owner" || currentUser?.role === "admin") && user.role !== "owner" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setResetPasswordUser(user);
                                  setNewPassword("");
                                  setResetPasswordDialogOpen(true);
                                }}
                                data-testid={`button-reset-password-${user.id}`}
                              >
                                <Key className="h-4 w-4 mr-1" />
                                Reset Password
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Profile
              </CardTitle>
              <CardDescription>
                Configure your pharmacy's business information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input
                        id="storeName"
                        value={settings.storeName}
                        onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-store-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storePhone">Phone Number</Label>
                      <Input
                        id="storePhone"
                        value={settings.storePhone}
                        onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-store-phone"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="storeAddress">Address</Label>
                      <Input
                        id="storeAddress"
                        value={settings.storeAddress}
                        onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-store-address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dlNo">Drug License Number</Label>
                      <Input
                        id="dlNo"
                        value={settings.dlNo}
                        onChange={(e) => setSettings({ ...settings, dlNo: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-dl-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storeEmail">Email</Label>
                      <Input
                        id="storeEmail"
                        type="email"
                        value={settings.storeEmail}
                        onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-store-email"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSaveStoreSettings}
                    disabled={saveSettingsMutation.isPending}
                    data-testid="button-save-store"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                GST Configuration
              </CardTitle>
              <CardDescription>
                Configure GST rates and tax settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="gstin">GSTIN Number</Label>
                      <Input
                        id="gstin"
                        value={settings.gstin}
                        onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-gstin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stateCode">State Code</Label>
                      <Input
                        id="stateCode"
                        value={settings.stateCode}
                        onChange={(e) => setSettings({ ...settings, stateCode: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-state-code"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Default GST Rates</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Standard Rate</p>
                        <p className="text-2xl font-bold">18%</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Reduced Rate</p>
                        <p className="text-2xl font-bold">12%</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Lower Rate</p>
                        <p className="text-2xl font-bold">5%</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="autoGst" 
                      checked={settings.autoGst === "true"}
                      onCheckedChange={(checked) => setSettings({ ...settings, autoGst: checked ? "true" : "false" })}
                      data-testid="switch-auto-gst" 
                    />
                    <Label htmlFor="autoGst">Enable GST in New Sale screen (split CGST/SGST for local sales)</Label>
                  </div>
                  <Button 
                    onClick={handleSaveGstSettings}
                    disabled={saveSettingsMutation.isPending}
                    data-testid="button-save-gst"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Settings
              </CardTitle>
              <CardDescription>
                Configure invoice format and numbering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                      <Input
                        id="invoicePrefix"
                        value={settings.invoicePrefix}
                        onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-invoice-prefix"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startNumber">Starting Number</Label>
                      <Input
                        id="startNumber"
                        type="number"
                        value={settings.startNumber}
                        onChange={(e) => setSettings({ ...settings, startNumber: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-start-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultGrnDiscountRate">Default GRN Discount Rate (%)</Label>
                      <Input
                        id="defaultGrnDiscountRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.defaultGrnDiscountRate}
                        onChange={(e) => setSettings({ ...settings, defaultGrnDiscountRate: e.target.value })}
                        className="mt-1.5"
                        data-testid="input-default-grn-discount-rate"
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultGrnGstMode">Default GRN GST Mode</Label>
                      <Select
                        value={settings.defaultGrnGstMode}
                        onValueChange={(value) => setSettings({ ...settings, defaultGrnGstMode: value as "item" | "header" })}
                      >
                        <SelectTrigger id="defaultGrnGstMode" className="mt-1.5" data-testid="select-default-grn-gst-mode">
                          <SelectValue placeholder="Select GST mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="item">Item-wise GST</SelectItem>
                          <SelectItem value="header">Header override GST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Invoice Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="showMrp" 
                          checked={settings.showMrp === "true"}
                          onCheckedChange={(checked) => setSettings({ ...settings, showMrp: checked ? "true" : "false" })}
                          data-testid="switch-show-mrp" 
                        />
                        <Label htmlFor="showMrp">Show MRP on invoice</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="showGstBreakup" 
                          checked={settings.showGstBreakup === "true"}
                          onCheckedChange={(checked) => setSettings({ ...settings, showGstBreakup: checked ? "true" : "false" })}
                          data-testid="switch-show-gst" 
                        />
                        <Label htmlFor="showGstBreakup">Show GST breakup (CGST/SGST)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="showDoctor" 
                          checked={settings.showDoctor === "true"}
                          onCheckedChange={(checked) => setSettings({ ...settings, showDoctor: checked ? "true" : "false" })}
                          data-testid="switch-show-doctor" 
                        />
                        <Label htmlFor="showDoctor">Show doctor name on invoice</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="printOnSave"
                          checked={settings.printOnSave === "true"}
                          onCheckedChange={(checked) => setSettings({ ...settings, printOnSave: checked ? "true" : "false" })}
                          data-testid="switch-print-on-save"
                        />
                        <Label htmlFor="printOnSave">Auto-print invoice on save</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Payment Methods at Checkout</h4>
                    <p className="text-sm text-muted-foreground">
                      Cash and UPI are always available. Card and Credit are off by default — turn them on here to offer them at New Sale checkout.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enableCardPayment"
                          checked={settings.enableCardPayment === "true"}
                          onCheckedChange={(checked) => setSettings({ ...settings, enableCardPayment: checked ? "true" : "false" })}
                          data-testid="switch-enable-card-payment"
                        />
                        <Label htmlFor="enableCardPayment">Enable Card payment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enableCreditBilling"
                          checked={settings.enableCreditBilling === "true"}
                          onCheckedChange={(checked) => setSettings({ ...settings, enableCreditBilling: checked ? "true" : "false" })}
                          data-testid="switch-enable-credit-billing"
                        />
                        <Label htmlFor="enableCreditBilling">Enable Credit billing</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveInvoiceSettings}
                    disabled={saveSettingsMutation.isPending}
                    data-testid="button-save-invoice"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5" />
                Database Backup
              </CardTitle>
              <CardDescription>
                Automatically back up your database on a schedule, or take a backup right now.
                Backups are saved as full database dumps in the "backup" folder next to the
                application, keeping the most recent 30.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="w-64">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select
                    value={savedSettings?.backup_frequency || "off"}
                    onValueChange={(value) => backupFrequencyMutation.mutate(value)}
                  >
                    <SelectTrigger id="backupFrequency" className="mt-1.5" data-testid="select-backup-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => runBackupMutation.mutate()}
                  disabled={runBackupMutation.isPending}
                  data-testid="button-backup-now"
                >
                  {runBackupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DatabaseBackup className="h-4 w-4 mr-2" />
                  )}
                  Backup Now
                </Button>
              </div>

              {savedSettings?.backup_last_run && (
                <p className="text-sm text-muted-foreground">
                  Last backup: {new Date(savedSettings.backup_last_run).toLocaleString()}
                  {savedSettings?.backup_last_status && (
                    <span className={savedSettings.backup_last_status === "success" ? "text-green-600" : "text-destructive"}>
                      {" "}({savedSettings.backup_last_status})
                    </span>
                  )}
                </p>
              )}

              <div>
                <Label className="mb-2 block">Recent Backups</Label>
                {backupStatusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !backupStatus?.backups.length ? (
                  <p className="text-sm text-muted-foreground py-4">No backups yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupStatus.backups.slice(0, 10).map((b) => (
                        <TableRow key={b.name} data-testid={`row-backup-${b.name}`}>
                          <TableCell className="font-mono text-xs">{b.name}</TableCell>
                          <TableCell>{(b.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                          <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reset">
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                Reset Invoices
              </CardTitle>
              <CardDescription>
                For onboarding a new client: once they're comfortable with the demo medicines and sales you walked them
                through, use this to permanently delete every invoice and return so real billing starts fresh at invoice #1.
                Medicines, stock, customers, doctors, locations, and all other settings are not affected. A full database
                backup is taken automatically before anything is deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setResetInvoicesDialogOpen(true)}
                data-testid="button-reset-invoices"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Invoices
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={resetInvoicesDialogOpen} onOpenChange={(open) => { setResetInvoicesDialogOpen(open); if (!open) setResetConfirmText(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Reset Invoices
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {resetPreviewLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <p className="text-sm">
                This will permanently delete{" "}
                <span className="font-semibold">{resetPreview?.sales ?? 0} invoice(s)</span> and{" "}
                <span className="font-semibold">{resetPreview?.returns ?? 0} return(s)</span>. The next sale will be
                invoiced as <span className="font-mono">#1</span>. Medicines, stock, customers, doctors, and all other
                data are not affected. This cannot be undone from within the app — a database backup is taken first.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Type RESET to confirm</Label>
              <Input
                id="reset-confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                data-testid="input-reset-confirm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetInvoicesDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetConfirmText !== "RESET" || resetInvoicesMutation.isPending}
              onClick={() => resetInvoicesMutation.mutate()}
              data-testid="button-confirm-reset-invoices"
            >
              {resetInvoicesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Permanently Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="userName">Full Name *</Label>
              <Input
                id="userName"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                placeholder="Enter full name"
                className="mt-1.5"
                data-testid="input-user-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userUsername">Username *</Label>
                <Input
                  id="userUsername"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="Enter username"
                  className="mt-1.5"
                  data-testid="input-user-username"
                />
              </div>
              <div>
                <Label htmlFor="userPassword">Password *</Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Enter password"
                  className="mt-1.5"
                  data-testid="input-user-password"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="userRoleId">Role</Label>
              <Select
                value={userFormData.roleId != null ? String(userFormData.roleId) : "none"}
                onValueChange={(v) =>
                  setUserFormData({ ...userFormData, roleId: v === "none" ? null : parseInt(v) })
                }
              >
                <SelectTrigger className="mt-1.5" data-testid="select-user-role-id">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (staff — menu-only access)</SelectItem>
                  {roles.filter((r) => r.isActive).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                      {r.systemRole === "owner" ? " (full access)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Controls both login permissions and menu visibility — manage roles in Role Master.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userPhone">Phone</Label>
                <Input
                  id="userPhone"
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1.5"
                  data-testid="input-user-phone"
                />
              </div>
              <div>
                <Label htmlFor="userEmail">Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="user@email.com"
                  className="mt-1.5"
                  data-testid="input-user-email"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              data-testid="button-save-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password for <span className="font-medium">{resetPasswordUser?.name}</span> ({resetPasswordUser?.username})
            </p>
            <div>
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="mt-1.5"
                data-testid="input-new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending || newPassword.length < 6}
              data-testid="button-confirm-reset-password"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Editing <span className="font-medium">{editUserTarget?.username}</span> (username can't be changed)
            </p>
            <div>
              <Label htmlFor="editUserName">Name</Label>
              <Input
                id="editUserName"
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                className="mt-1.5"
                data-testid="input-edit-user-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editUserPhone">Phone</Label>
                <Input
                  id="editUserPhone"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  className="mt-1.5"
                  data-testid="input-edit-user-phone"
                />
              </div>
              <div>
                <Label htmlFor="editUserEmail">Email</Label>
                <Input
                  id="editUserEmail"
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="mt-1.5"
                  data-testid="input-edit-user-email"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editUserRoleId">Role</Label>
              <Select
                value={editUserForm.roleId != null ? String(editUserForm.roleId) : "none"}
                onValueChange={(v) =>
                  setEditUserForm({ ...editUserForm, roleId: v === "none" ? null : parseInt(v) })
                }
              >
                <SelectTrigger className="mt-1.5" data-testid="select-edit-user-role-id">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (staff — menu-only access)</SelectItem>
                  {roles.filter((r) => r.isActive).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                      {r.systemRole === "owner" ? " (full access)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Controls both login permissions and menu visibility — manage roles in Role Master.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEditUser}
              disabled={editUserMutation.isPending}
              data-testid="button-save-edit-user"
            >
              {editUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
