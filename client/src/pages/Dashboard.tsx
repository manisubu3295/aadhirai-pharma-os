import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp, TrendingDown, ArrowUpRight, Package, Clock, AlertCircle } from "lucide-react";
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
      title: "Total Revenue",
      value: stats ? `₹${parseFloat(stats.totalRevenue).toFixed(2)}` : "₹0.00",
      change: "+15%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Active Orders",
      value: stats ? stats.activeOrders.toString() : "0",
      change: "+5%",
      trend: "up",
      icon: ShoppingCart,
    },
    {
      title: "Low Stock Items",
      value: stats ? stats.lowStockItems.toString() : "0",
      change: "-2",
      trend: "down",
      icon: AlertTriangle,
    },
    {
      title: "Customers Today",
      value: stats ? stats.customersToday.toString() : "0",
      change: "+12%",
      trend: "up",
      icon: Users,
    },
  ];

  const hasAlerts = lowStockMedicines.length > 0 || outOfStockMedicines.length > 0 || expiringMedicines.length > 0 || expiredMedicines.length > 0;

  return (
    <AppLayout title="Dashboard Overview">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-shadow" data-testid={`stat-card-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`stat-value-${i}`}>{stat.value}</div>
                <div className="flex items-center text-xs mt-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="text-emerald-500 w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="text-destructive w-3 h-3 mr-1" />
                  )}
                  <span className={stat.trend === "up" ? "text-emerald-500" : "text-destructive"}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasAlerts && (
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base text-amber-800">Stock Alerts</CardTitle>
                </div>
                <Link href="/inventory" className="text-xs text-primary hover:underline flex items-center">
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
                      <div key={med.id} className="flex items-center justify-between text-sm bg-white/80 rounded px-2 py-1" data-testid={`alert-out-stock-${med.id}`}>
                        <span className="font-medium text-destructive">{med.name}</span>
                        <span className="text-xs text-muted-foreground">{med.batchNumber}</span>
                      </div>
                    ))}
                    {outOfStockMedicines.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{outOfStockMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}
              
              {lowStockMedicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-500 text-xs">Low Stock ({lowStockMedicines.length})</Badge>
                  </div>
                  <div className="space-y-1">
                    {lowStockMedicines.slice(0, 3).map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between text-sm bg-white/80 rounded px-2 py-1" data-testid={`alert-low-stock-${med.id}`}>
                        <span className="font-medium">{med.name}</span>
                        <span className="text-xs">
                          <span className="text-amber-600 font-semibold">{med.stock}</span>
                          <span className="text-muted-foreground"> / {med.minStock} min</span>
                        </span>
                      </div>
                    ))}
                    {lowStockMedicines.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{lowStockMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}

              {outOfStockMedicines.length === 0 && lowStockMedicines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">All stock levels are healthy</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base text-orange-800">Expiry Alerts</CardTitle>
                </div>
                <Link href="/inventory" className="text-xs text-primary hover:underline flex items-center">
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
                      <div key={med.id} className="flex items-center justify-between text-sm bg-white/80 rounded px-2 py-1" data-testid={`alert-expired-${med.id}`}>
                        <span className="font-medium text-destructive">{med.name}</span>
                        <span className="text-xs text-destructive">{formatDate(med.expiryDate)}</span>
                      </div>
                    ))}
                    {expiredMedicines.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{expiredMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}
              
              {expiringMedicines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-orange-500 text-xs">Expiring Soon ({expiringMedicines.length})</Badge>
                  </div>
                  <div className="space-y-1">
                    {expiringMedicines.slice(0, 3).map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between text-sm bg-white/80 rounded px-2 py-1" data-testid={`alert-expiring-${med.id}`}>
                        <span className="font-medium">{med.name}</span>
                        <span className="text-xs text-orange-600">{formatDate(med.expiryDate)}</span>
                      </div>
                    ))}
                    {expiringMedicines.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{expiringMedicines.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}

              {expiredMedicines.length === 0 && expiringMedicines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No expiry concerns</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Weekly sales performance
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link href="/sales" className="text-xs text-primary hover:underline flex items-center">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
            <CardDescription>
              Latest sales from today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentSales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No sales yet</p>
              ) : (
                recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between" data-testid={`recent-sale-${sale.id}`}>
                    <div className="flex items-center space-x-4">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                        {sale.customerName.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{sale.customerName}</p>
                        <p className="text-xs text-muted-foreground">{sale.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">₹{parseFloat(sale.total).toFixed(2)}</p>
                      <p className={`text-[10px] uppercase font-semibold ${
                        sale.status === "Completed" ? "text-emerald-500" : 
                        sale.status === "Pending" ? "text-amber-500" : "text-destructive"
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
