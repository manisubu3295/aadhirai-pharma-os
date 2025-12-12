import { useState } from "react";
import { Bell, HelpCircle, Package, AlertTriangle, CreditCard, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Medicine {
  id: number;
  name: string;
  quantity: string;
  expiryDate: string;
  status: string;
}

interface Sale {
  id: number;
  invoiceNo: string;
  customerName: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

interface Notification {
  id: string;
  type: "expired" | "low_stock" | "credit_bill";
  title: string;
  description: string;
  link: string;
}

export function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredMedicines = medicines.filter(m => {
    if (!m.expiryDate) return false;
    const expiry = new Date(m.expiryDate);
    return expiry < today;
  });

  const lowStockMedicines = medicines.filter(m => {
    const qty = parseInt(m.quantity) || 0;
    return qty > 0 && qty < 50;
  });

  const recentCreditBills = sales.filter(s => {
    if (s.paymentMethod?.toLowerCase() !== "credit") return false;
    const saleDate = new Date(s.createdAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return saleDate >= threeDaysAgo;
  });

  const notifications: Notification[] = [];

  if (expiredMedicines.length > 0) {
    notifications.push({
      id: "expired",
      type: "expired",
      title: "Expired Medicines",
      description: `${expiredMedicines.length} medicine(s) have expired`,
      link: "/inventory",
    });
  }

  if (lowStockMedicines.length > 0) {
    notifications.push({
      id: "low_stock",
      type: "low_stock",
      title: "Low Stock Alert",
      description: `${lowStockMedicines.length} medicine(s) running low`,
      link: "/inventory",
    });
  }

  if (recentCreditBills.length > 0) {
    notifications.push({
      id: "credit_bill",
      type: "credit_bill",
      title: "New Credit Bills",
      description: `${recentCreditBills.length} credit bill(s) in last 3 days`,
      link: "/collections",
    });
  }

  const handleNotificationClick = (notification: Notification) => {
    setOpen(false);
    navigate(notification.link);
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "expired":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "low_stock":
        return <Package className="w-4 h-4 text-amber-500" />;
      case "credit_bill":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "expired":
        return "bg-red-50 hover:bg-red-100";
      case "low_stock":
        return "bg-amber-50 hover:bg-amber-100";
      case "credit_bill":
        return "bg-blue-50 hover:bg-blue-100";
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative" 
              data-testid="button-notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {notifications.length > 0 && (
                <span className="text-xs text-muted-foreground">{notifications.length} alerts</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${getBgColor(notification.type)}`}
                      data-testid={`notification-${notification.type}`}
                    >
                      <div className="mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{notification.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" data-testid="button-help">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
