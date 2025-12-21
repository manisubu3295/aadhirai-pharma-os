import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { PlanProvider } from "@/lib/planContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
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
import Doctors from "@/pages/Doctors";
import OwnerDashboard from "@/pages/OwnerDashboard";
import Suppliers from "@/pages/Suppliers";
import SupplierRates from "@/pages/SupplierRates";
import PurchaseOrders from "@/pages/PurchaseOrders";
import GoodsReceipts from "@/pages/GoodsReceipts";
import PurchaseReturns from "@/pages/PurchaseReturns";
import DayClosing from "@/pages/DayClosing";
import Profile from "@/pages/Profile";
import CreditBilling from "@/pages/CreditBilling";
import MedicineRefund from "@/pages/MedicineRefund";
import MenuManagement from "@/pages/admin/MenuManagement";
import MenuGroups from "@/pages/admin/MenuGroups";
import UserMenuAccess from "@/pages/admin/UserMenuAccess";
import NoAccess from "@/pages/NoAccess";
import Expenses from "@/pages/Expenses";
import Approvals from "@/pages/Approvals";
import StockAdjustments from "@/pages/StockAdjustments";
import ShiftHandover from "@/pages/ShiftHandover";
import MyActivity from "@/pages/MyActivity";

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
        <ProtectedRoute>
          <AuditLog />
        </ProtectedRoute>
      </Route>
      <Route path="/tally-export">
        <ProtectedRoute>
          <TallyExport />
        </ProtectedRoute>
      </Route>
      <Route path="/doctors">
        <ProtectedRoute>
          <Doctors />
        </ProtectedRoute>
      </Route>
      <Route path="/owner-dashboard">
        <ProtectedRoute>
          <OwnerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute>
          <Suppliers />
        </ProtectedRoute>
      </Route>
      <Route path="/supplier-rates">
        <ProtectedRoute>
          <SupplierRates />
        </ProtectedRoute>
      </Route>
      <Route path="/purchase-orders">
        <ProtectedRoute>
          <PurchaseOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/goods-receipts">
        <ProtectedRoute>
          <GoodsReceipts />
        </ProtectedRoute>
      </Route>
      <Route path="/purchase-returns">
        <ProtectedRoute>
          <PurchaseReturns />
        </ProtectedRoute>
      </Route>
      <Route path="/day-closing">
        <ProtectedRoute>
          <DayClosing />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/credit-billing">
        <ProtectedRoute>
          <CreditBilling />
        </ProtectedRoute>
      </Route>
      <Route path="/medicine-refund">
        <ProtectedRoute>
          <MedicineRefund />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/menus">
        <ProtectedRoute allowedRoles={["owner"]}>
          <MenuManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/menu-groups">
        <ProtectedRoute allowedRoles={["owner"]}>
          <MenuGroups />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/user-access">
        <ProtectedRoute allowedRoles={["owner"]}>
          <UserMenuAccess />
        </ProtectedRoute>
      </Route>
      <Route path="/expenses">
        <ProtectedRoute>
          <Expenses />
        </ProtectedRoute>
      </Route>
      <Route path="/approvals">
        <ProtectedRoute>
          <Approvals />
        </ProtectedRoute>
      </Route>
      <Route path="/stock-adjustments">
        <ProtectedRoute>
          <StockAdjustments />
        </ProtectedRoute>
      </Route>
      <Route path="/shift-handover">
        <ProtectedRoute>
          <ShiftHandover />
        </ProtectedRoute>
      </Route>
      <Route path="/my-activity">
        <ProtectedRoute>
          <MyActivity />
        </ProtectedRoute>
      </Route>
      <Route path="/no-access" component={NoAccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanProvider>
        <SettingsProvider>
          <AuthProvider>
            <NavigationProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </NavigationProvider>
          </AuthProvider>
        </SettingsProvider>
      </PlanProvider>
    </QueryClientProvider>
  );
}

export default App;
