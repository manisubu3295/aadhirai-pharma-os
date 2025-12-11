import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp, TrendingDown, ArrowUpRight, Package, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const chartData = [
  { name: "Mon", sales: 4000 },
  { name: "Tue", sales: 3000 },
  { name: "Wed", sales: 2000 },
  { name: "Thu", sales: 2780 },
  { name: "Fri", sales: 1890 },
  { name: "Sat", sales: 2390 },
  { name: "Sun", sales: 3490 },
];

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: recentSales = [] } = useQuery({
    queryKey: ["recent-sales"],
    queryFn: async () => {
      const response = await fetch("/api/sales?limit=5");
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines-alerts"],
    queryFn: async () => {
      const response = await fetch("/api/medicines");
      if (!response.ok) throw new Error("Failed to fetch medicines");
      return response.json();
    },
  });

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const lowStockMedicines = medicines.filter((m: any) => m.quantity <= m.reorderLevel && m.quantity > 0);
  const outOfStockMedicines = medicines.filter((m: any) => m.quantity === 0);
  const expiringMedicines = medicines.filter((m: any) => {
    if (!m.expiryDate) return false;
    const expiryDate = new Date(m.expiryDate);
    return expiryDate <= thirtyDaysFromNow && expiryDate > today;
  });
  const expiredMedicines = medicines.filter((m: any) => {
    if (!m.expiryDate) return false;
    const expiryDate = new Date(m.expiryDate);
    return expiryDate <= today;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const dashboardStats = [
    {
      title: "Net Revenue",
      value: stats?.netRevenue ? `₹${parseFloat(stats.netRevenue).toFixed(2)}` : (stats ? `₹${parseFloat(stats.totalRevenue).toFixed(2)}` : "₹0.00"),
      change: "+15%",
      trend: "up",
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      title: "Total Returns",
      value: stats?.totalReturns ? `₹${parseFloat(stats.totalReturns).toFixed(2)}` : "₹0.00",
      change: "",
      trend: "down",
      icon: RotateCcw,
      color: "from-rose-500 to-pink-600",
      bgColor: "bg-rose-50",
      textColor: "text-rose-600",
    },
    {
      title: "Low Stock Items",
      value: stats ? stats.lowStockItems.toString() : "0",
      change: "-2",
      trend: "down",
      icon: AlertTriangle,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      title: "Customers Today",
      value: stats ? stats.customersToday.toString() : "0",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "from-indigo-500 to-blue-600",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
    },
  ];

  const hasAlerts = lowStockMedicines.length > 0 || outOfStockMedicines.length > 0 || expiringMedicines.length > 0 || expiredMedicines.length > 0;

  return (
    <AppLayout title="Dashboard Overview">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-all duration-200" data-testid={`stat-card-${i}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900" data-testid={`stat-value-${i}`}>{stat.value}</p>
                    {stat.change && (
                      <div className="flex items-center text-xs">
                        {stat.trend === "up" ? (
                          <TrendingUp className="text-emerald-500 w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="text-rose-500 w-3 h-3 mr-1" />
                        )}
                        <span className={stat.trend === "up" ? "text-emerald-600" : "text-rose-600"}>
                          {stat.change}
                        </span>
                        <span className="text-slate-400 ml-1">from last month</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasAlerts && (
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-base text-slate-800">Stock Alerts</CardTitle>
                </div>
                <Link href="/inventory" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
                  View Inventory <ArrowUpRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {outOfStockMedicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="text-xs">Out of Stock ({outOfStockMedicines.length})</Badge>
                  </div>
                  <div className="space-y-1">
                    {outOfStockMedicines.slice(0, 3).map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2" data-testid={`alert-out-stock-${med.id}`}>
                        <span className="font-medium text-rose-600">{med.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{med.batchNumber}</span>
                      </div>
                    ))}
                    {outOfStockMedicines.length > 3 && (
                      <p className="text-xs text-slate-500 pl-3">+{outOfStockMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}
              
              {lowStockMedicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">Low Stock ({lowStockMedicines.length})</Badge>
                  </div>
                  <div className="space-y-1">
                    {lowStockMedicines.slice(0, 3).map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2" data-testid={`alert-low-stock-${med.id}`}>
                        <span className="font-medium text-slate-700">{med.name}</span>
                        <span className="text-xs">
                          <span className="text-amber-600 font-semibold">{med.quantity}</span>
                          <span className="text-slate-400"> / {med.reorderLevel} min</span>
                        </span>
                      </div>
                    ))}
                    {lowStockMedicines.length > 3 && (
                      <p className="text-xs text-slate-500 pl-3">+{lowStockMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}

              {outOfStockMedicines.length === 0 && lowStockMedicines.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">All stock levels are healthy</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <CardTitle className="text-base text-slate-800">Expiry Alerts</CardTitle>
                </div>
                <Link href="/inventory" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
                  View Inventory <ArrowUpRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiredMedicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Expired ({expiredMedicines.length})
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {expiredMedicines.slice(0, 3).map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2" data-testid={`alert-expired-${med.id}`}>
                        <span className="font-medium text-rose-600">{med.name}</span>
                        <span className="text-xs text-rose-500 font-medium">{formatDate(med.expiryDate)}</span>
                      </div>
                    ))}
                    {expiredMedicines.length > 3 && (
                      <p className="text-xs text-slate-500 pl-3">+{expiredMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}
              
              {expiringMedicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">Expiring Soon ({expiringMedicines.length})</Badge>
                  </div>
                  <div className="space-y-1">
                    {expiringMedicines.slice(0, 3).map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2" data-testid={`alert-expiring-${med.id}`}>
                        <span className="font-medium text-slate-700">{med.name}</span>
                        <span className="text-xs text-orange-600 font-medium">{formatDate(med.expiryDate)}</span>
                      </div>
                    ))}
                    {expiringMedicines.length > 3 && (
                      <p className="text-xs text-slate-500 pl-3">+{expiringMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}

              {expiredMedicines.length === 0 && expiringMedicines.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No expiry concerns</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4 border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-lg text-slate-800">Revenue Overview</CardTitle>
            <CardDescription>
              Weekly sales performance
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-800">Recent Transactions</CardTitle>
              <Link href="/reports" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <CardDescription>
              Latest sales from today
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentSales.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No sales yet</p>
              ) : (
                recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors" data-testid={`recent-sale-${sale.id}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                        {sale.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{sale.customerName}</p>
                        <p className="text-xs text-slate-500 capitalize">{sale.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">₹{parseFloat(sale.total).toFixed(2)}</p>
                      <p className={`text-[10px] uppercase font-semibold ${
                        sale.status === "Completed" ? "text-emerald-600" : 
                        sale.status === "Pending" ? "text-amber-600" : "text-rose-600"
                      }`}>
                        {sale.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
