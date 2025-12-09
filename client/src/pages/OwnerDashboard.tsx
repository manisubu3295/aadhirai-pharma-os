import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Crown, 
  BarChart3, 
  Package, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  Users,
  Pill,
  Target,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/lib/planContext";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { Sale, Medicine, Customer } from "@shared/schema";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OwnerDashboard() {
  const { isPro } = usePlan();

  if (!isPro) {
    return (
      <AppLayout title="Owner Analytics">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">PRO Feature</h2>
            <p className="text-muted-foreground mb-4">
              Owner Analytics Dashboard is available in PRO plan. Upgrade to access sales trends, business health metrics, and advanced analytics.
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Crown className="h-5 w-5" />
              <span className="font-medium">Upgrade to PRO</span>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    queryFn: async () => {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
    queryFn: async () => {
      const res = await fetch("/api/medicines");
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const last30DaysSales = sales.filter(s => new Date(s.createdAt) >= thirtyDaysAgo);
  const last7DaysSales = sales.filter(s => new Date(s.createdAt) >= sevenDaysAgo);
  const todaySales = sales.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === todayStr);

  const totalRevenue30Days = last30DaysSales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalRevenue7Days = last7DaysSales.reduce((sum, s) => sum + Number(s.total), 0);
  const revenueToday = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const avgDailySales = totalRevenue30Days / 30;

  const salesByDay = last7DaysSales.reduce((acc, sale) => {
    const day = new Date(sale.createdAt).toLocaleDateString('en-IN', { weekday: 'short' });
    acc[day] = (acc[day] || 0) + Number(sale.total);
    return acc;
  }, {} as Record<string, number>);

  const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    name: day,
    sales: salesByDay[day] || 0
  }));

  const paymentMethodBreakdown = last30DaysSales.reduce((acc, sale) => {
    const method = sale.paymentMethod;
    acc[method] = (acc[method] || 0) + Number(sale.total);
    return acc;
  }, {} as Record<string, number>);

  const paymentData = Object.entries(paymentMethodBreakdown).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  const topSellingMedicines = medicines
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const isNearExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expiry <= threeMonths && expiry > new Date();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) <= new Date();
  };

  const expiringMedicines = medicines.filter(m => isNearExpiry(m.expiryDate));
  const expiredMedicines = medicines.filter(m => isExpired(m.expiryDate));
  const lowStockMedicines = medicines.filter(m => m.status === "Low Stock" || m.status === "Out of Stock");

  const expiryRiskValue = expiredMedicines.reduce((sum, m) => sum + Number(m.price) * m.quantity, 0);
  const expiringRiskValue = expiringMedicines.reduce((sum, m) => sum + Number(m.price) * m.quantity, 0);

  const totalInventoryValue = medicines.reduce((sum, m) => sum + Number(m.price) * m.quantity, 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);

  return (
    <AppLayout title="Owner Dashboard">
      <div className="mb-4 flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
          <Crown className="w-3 h-3 mr-1" />
          PRO Analytics
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-today-revenue">
                  ₹{revenueToday.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{todaySales.length} sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-30day-revenue">
                  ₹{totalRevenue30Days.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Avg ₹{avgDailySales.toFixed(0)}/day</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-inventory-value">
                  ₹{totalInventoryValue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{medicines.length} products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Outstanding</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-outstanding">
                  ₹{totalOutstanding.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{customers.filter(c => Number(c.outstandingBalance || 0) > 0).length} customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Sales Trend
            </CardTitle>
            <CardDescription>Revenue over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Sales']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Revenue by payment method (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {paymentData.length === 0 ? (
                <p className="text-muted-foreground">No sales data</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Expiry Risk
            </CardTitle>
            <CardDescription>Products at risk of expiry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-800">Expired</p>
                  <p className="text-sm text-red-600">{expiredMedicines.length} items</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-700">₹{expiryRiskValue.toFixed(2)}</p>
                  <p className="text-xs text-red-600">at risk</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium text-orange-800">Expiring (3 months)</p>
                  <p className="text-sm text-orange-600">{expiringMedicines.length} items</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-700">₹{expiringRiskValue.toFixed(2)}</p>
                  <p className="text-xs text-orange-600">at risk</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="font-medium text-amber-800">Low Stock</p>
                  <p className="text-sm text-amber-600">{lowStockMedicines.length} items</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-600">Needs reorder</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Top Products by Stock
            </CardTitle>
            <CardDescription>Highest quantity in inventory</CardDescription>
          </CardHeader>
          <CardContent>
            {topSellingMedicines.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No products in inventory</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellingMedicines.map((med, idx) => (
                    <TableRow key={med.id} data-testid={`row-top-medicine-${med.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-xs text-muted-foreground">{med.manufacturer}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{med.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{med.quantity}</TableCell>
                      <TableCell className="text-right">₹{(Number(med.price) * med.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Business Health
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Inventory Health</span>
                  <span className="text-sm font-medium">
                    {medicines.length > 0 ? Math.round((medicines.filter(m => m.status === "In Stock").length / medicines.length) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={medicines.length > 0 ? (medicines.filter(m => m.status === "In Stock").length / medicines.length) * 100 : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Credit Risk</span>
                  <span className="text-sm font-medium text-red-600">
                    {totalOutstanding > 0 ? `₹${totalOutstanding.toFixed(0)} due` : 'No dues'}
                  </span>
                </div>
                <Progress 
                  value={Math.min((totalOutstanding / 100000) * 100, 100)} 
                  className="h-2 bg-red-100 [&>*]:bg-red-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Expiry Risk</span>
                  <span className="text-sm font-medium text-orange-600">
                    {expiringMedicines.length + expiredMedicines.length} items
                  </span>
                </div>
                <Progress 
                  value={medicines.length > 0 ? ((expiringMedicines.length + expiredMedicines.length) / medicines.length) * 100 : 0} 
                  className="h-2 bg-orange-100 [&>*]:bg-orange-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quick Stats
            </CardTitle>
            <CardDescription>Summary metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{medicines.length}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Sales (30d)</p>
                <p className="text-2xl font-bold">{last30DaysSales.length}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  ₹{last30DaysSales.length > 0 ? (totalRevenue30Days / last30DaysSales.length).toFixed(0) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
