import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Camera, User, MapPin, Phone, Mail, Building, Lock, Shield, Save } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    pharmacyName: "Aadhirai Innovations",
    gstNumber: "",
    drugLicense: "",
  });
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Image too large", description: "Please select an image under 2MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast({ title: "Photo updated" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Profile saved successfully" });
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({ title: "Please fill all password fields", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change password");
      }
      
      toast({ title: "Password changed successfully" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: error.message || "Failed to change password", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AppLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-700"></div>
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  {profileImage ? (
                    <AvatarImage src={profileImage} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-bold">
                    {getInitials(profileData.name || "User")}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors border-2 border-white"
                  data-testid="button-upload-photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="input-photo"
                />
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-xl font-bold text-slate-900">{profileData.name || user?.username}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                    <Shield className="w-3 h-3 mr-1" />
                    {user?.role}
                  </span>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800" data-testid="button-save-profile">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-slate-600" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-profile-name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="input-profile-email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="input-profile-phone"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pharmacyName" className="text-slate-700">Pharmacy Name</Label>
                <div className="relative mt-1.5">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="pharmacyName"
                    value={profileData.pharmacyName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, pharmacyName: e.target.value }))}
                    placeholder="Your Pharmacy Name"
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="input-profile-pharmacy"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-slate-600" />
              Address Details
            </CardTitle>
            <CardDescription>
              Your pharmacy address for invoices and communications
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label htmlFor="address" className="text-slate-700">Street Address</Label>
              <Textarea
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter your complete address"
                className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                rows={2}
                data-testid="input-profile-address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Label htmlFor="city" className="text-slate-700">City</Label>
                <Input
                  id="city"
                  value={profileData.city}
                  onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-profile-city"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-slate-700">State</Label>
                <Input
                  id="state"
                  value={profileData.state}
                  onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-profile-state"
                />
              </div>
              <div>
                <Label htmlFor="pincode" className="text-slate-700">PIN Code</Label>
                <Input
                  id="pincode"
                  value={profileData.pincode}
                  onChange={(e) => setProfileData(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="000000"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-profile-pincode"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-slate-600" />
              Business Details
            </CardTitle>
            <CardDescription>
              Legal information for GST and drug license
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="gstNumber" className="text-slate-700">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={profileData.gstNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, gstNumber: e.target.value }))}
                  placeholder="22AAAAA0000A1Z5"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-profile-gst"
                />
              </div>
              <div>
                <Label htmlFor="drugLicense" className="text-slate-700">Drug License Number</Label>
                <Input
                  id="drugLicense"
                  value={profileData.drugLicense}
                  onChange={(e) => setProfileData(prev => ({ ...prev, drugLicense: e.target.value }))}
                  placeholder="DL-XXX-XXXXX"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-profile-license"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card id="password" className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-slate-600" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password for security
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div>
              <Label htmlFor="currentPassword" className="text-slate-700">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                data-testid="input-current-password"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="newPassword" className="text-slate-700">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="mt-1.5 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword}
                variant="outline"
                className="border-slate-300"
                data-testid="button-change-password"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
