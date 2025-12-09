import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { PlanProvider } from "@/lib/planContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import POS from "@/pages/POS";
import NewSale from "@/pages/NewSale";
import Customers from "@/pages/Customers";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Collections from "@/pages/Collections";
import LocationMaster from "@/pages/LocationMaster";
import AuditLog from "@/pages/AuditLog";
import TallyExport from "@/pages/TallyExport";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      </Route>
      <Route path="/pos">
        <ProtectedRoute>
          <POS />
        </ProtectedRoute>
      </Route>
      <Route path="/new-sale">
        <ProtectedRoute>
          <NewSale />
        </ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute allowedRoles={["owner"]}>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/collections">
        <ProtectedRoute>
          <Collections />
        </ProtectedRoute>
      </Route>
      <Route path="/locations">
        <ProtectedRoute>
          <LocationMaster />
        </ProtectedRoute>
      </Route>
      <Route path="/audit-log">
        <ProtectedRoute allowedRoles={["owner"]}>
          <AuditLog />
        </ProtectedRoute>
      </Route>
      <Route path="/tally-export">
        <ProtectedRoute allowedRoles={["owner"]}>
          <TallyExport />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </PlanProvider>
    </QueryClientProvider>
  );
}

export default App;
