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
  Key
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

interface UserFormData {
  username: string;
  password: string;
  name: string;
  role: string;
  email: string;
  phone: string;
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
};

const emptyUserForm: UserFormData = {
  username: "",
  password: "",
  name: "",
  role: "cashier",
  email: "",
  phone: "",
};

export default function Settings() {
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<UserFormData>(emptyUserForm);
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

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
      setSettings({
        storeName: savedSettings.storeName || defaultSettings.storeName,
        storePhone: savedSettings.storePhone || defaultSettings.storePhone,
        storeAddress: savedSettings.storeAddress || defaultSettings.storeAddress,
        storeEmail: savedSettings.storeEmail || defaultSettings.storeEmail,
        dlNo: savedSettings.dlNo || defaultSettings.dlNo,
        gstin: savedSettings.gstin || defaultSettings.gstin,
        stateCode: savedSettings.stateCode || defaultSettings.stateCode,
        autoGst: savedSettings.autoGst || defaultSettings.autoGst,
        invoicePrefix: savedSettings.invoicePrefix || defaultSettings.invoicePrefix,
        startNumber: savedSettings.startNumber || defaultSettings.startNumber,
        showMrp: savedSettings.showMrp || defaultSettings.showMrp,
        showGstBreakup: savedSettings.showGstBreakup || defaultSettings.showGstBreakup,
        showDoctor: savedSettings.showDoctor || defaultSettings.showDoctor,
        printOnSave: savedSettings.printOnSave || defaultSettings.printOnSave,
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

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddUserDialogOpen(false);
      setUserFormData(emptyUserForm);
      toast({ title: "User created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
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

  return (
    <AppLayout title="Settings">
      <Tabs defaultValue="users" className="space-y-4">
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
                              {user.role}
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
                    <Label htmlFor="autoGst">Auto-calculate GST (split CGST/SGST for local sales)</Label>
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
      </Tabs>

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
              <Label htmlFor="userRole">Role</Label>
              <Select 
                value={userFormData.role} 
                onValueChange={(v) => setUserFormData({ ...userFormData, role: v })}
              >
                <SelectTrigger className="mt-1.5" data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
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
    </AppLayout>
  );
}
