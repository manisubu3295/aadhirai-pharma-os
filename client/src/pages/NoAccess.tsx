import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function NoAccess() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-no-access-title">
            No Access
          </h1>
          <p className="text-slate-500 mb-6" data-testid="text-no-access-message">
            You don't have access to any menus. Please contact your administrator to request access.
          </p>
          {user && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Logged in as: <span className="font-medium text-slate-600">{user.name || user.username}</span>
              </p>
              <Button 
                onClick={() => logout()} 
                variant="outline" 
                className="gap-2"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
