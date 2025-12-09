import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, AlertTriangle, Users, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";

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

  return (
    <AppLayout title="Dashboard Overview">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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
              <a href="#" className="text-xs text-primary hover:underline flex items-center">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </a>
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
                  <div key={sale.id} className="flex items-center justify-between">
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
