import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useNavigation } from "@/contexts/NavigationContext";
import { Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const { login, user } = useAuth();
  const { getDefaultRoute, isLoading: navLoading, refetch } = useNavigation();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !navLoading && pendingRedirect) {
      const route = getDefaultRoute();
      setLocation(route);
      setPendingRedirect(false);
    } else if (user && !pendingRedirect) {
      setLocation(getDefaultRoute());
    }
  }, [user, navLoading, pendingRedirect, getDefaultRoute, setLocation]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      sessionStorage.removeItem("nav-scroll-position");
      refetch();
      setPendingRedirect(true);
    } else {
      setError(result.error || "Login failed");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">Medora+</h1>
              <p className="text-sm text-slate-400">Pharmacy Management</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Streamline your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              pharmacy operations
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            Complete ERP solution for inventory management, billing, and business analytics.
          </p>
          <div className="flex gap-8 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">99.9%</p>
              <p className="text-sm text-slate-500">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-sm text-slate-500">Accuracy</p>
            </div>
          </div>
        </div>

        <div className="text-sm">
          <p className="text-slate-400">Aadhirai Innovations</p>
          <p className="text-slate-500">www.aadhiraiinnovations.com</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Medora+</h1>
              <p className="text-sm text-slate-500">Pharmacy Management</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900" data-testid="text-login-title">Welcome back</h2>
            <p className="text-slate-500 mt-2">Sign in to continue to your dashboard</p>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2" data-testid="text-error-message">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      data-testid="input-username"
                      autoComplete="username"
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="input-password"
                      autoComplete="current-password"
                      className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
