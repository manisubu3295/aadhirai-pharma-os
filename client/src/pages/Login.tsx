import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Lock, User, ArrowRight } from "lucide-react";
import logoImage from '@assets/4809A98F-D4B8-4E8A-AEF1-11CDDF7D2FD6_1765274700818.png';

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      setLocation("/");
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center p-2 shadow-lg shadow-indigo-500/30">
              <img src={logoImage} alt="Aadhirai" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Aadhirai</h1>
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
        </div>

        <p className="text-slate-600 text-sm">
          Aadhirai Innovations
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center p-2 shadow-lg">
              <img src={logoImage} alt="Aadhirai" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aadhirai</h1>
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
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="input-password"
                      autoComplete="current-password"
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white"
                    />
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

          <div className="mt-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-2">Demo Credentials</p>
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-mono font-medium text-slate-700">owner</p>
                <p className="text-xs text-slate-400">username</p>
              </div>
              <div className="text-center">
                <p className="font-mono font-medium text-slate-700">password123</p>
                <p className="text-xs text-slate-400">password</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
