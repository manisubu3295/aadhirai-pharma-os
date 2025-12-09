import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Filter, FileSpreadsheet, DollarSign, Package, UserCog, XCircle, RefreshCw } from "lucide-react";
import { usePlan } from "@/lib/planContext";
import { format, subDays } from "date-fns";

interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  entityName: string;
  userId: string;
  userName: string;
  oldValue: string | null;
  newValue: string | null;
  details: string;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  price_change: "bg-yellow-100 text-yellow-800",
  stock_adjustment: "bg-blue-100 text-blue-800",
  bill_cancel: "bg-red-100 text-red-800",
  bill_return: "bg-orange-100 text-orange-800",
  credit_limit_change: "bg-purple-100 text-purple-800",
  user_role_change: "bg-green-100 text-green-800",
  medicine_create: "bg-emerald-100 text-emerald-800",
  medicine_update: "bg-sky-100 text-sky-800",
  medicine_delete: "bg-red-100 text-red-800",
};

const actionIcons: Record<string, React.ReactNode> = {
  price_change: <DollarSign className="w-4 h-4" />,
  stock_adjustment: <Package className="w-4 h-4" />,
  bill_cancel: <XCircle className="w-4 h-4" />,
  bill_return: <RefreshCw className="w-4 h-4" />,
  credit_limit_change: <DollarSign className="w-4 h-4" />,
  user_role_change: <UserCog className="w-4 h-4" />,
};

export default function AuditLog() {
  const { isPro } = usePlan();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");

  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-logs", dateFrom, dateTo],
    enabled: isPro,
  });

  if (!isPro) {
    return (
      <AppLayout title="Audit Log">
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PRO Feature</h3>
              <p className="text-muted-foreground">
                Audit Log is available in the PRO plan. Switch to PRO to track all changes including price modifications, stock adjustments, and user activities.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.createdAt);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    const dateMatch = logDate >= fromDate && logDate <= toDate;
    const actionMatch = actionFilter === "all" || log.action === actionFilter;
    const userMatch = !userFilter || log.userName.toLowerCase().includes(userFilter.toLowerCase());
    
    return dateMatch && actionMatch && userMatch;
  });

  const exportToCSV = () => {
    const headers = ["Date/Time", "Action", "Entity", "User", "Old Value", "New Value", "Details"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss"),
      log.action,
      `${log.entityType}: ${log.entityName}`,
      log.userName,
      log.oldValue || "",
      log.newValue || "",
      log.details
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  return (
    <AppLayout title="Audit Log">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-audit-date-from"
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-audit-date-to"
                />
              </div>
              <div>
                <Label>Action Type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger data-testid="select-action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="price_change">Price Changes</SelectItem>
                    <SelectItem value="stock_adjustment">Stock Adjustments</SelectItem>
                    <SelectItem value="bill_cancel">Bill Cancellations</SelectItem>
                    <SelectItem value="bill_return">Returns</SelectItem>
                    <SelectItem value="credit_limit_change">Credit Limit Changes</SelectItem>
                    <SelectItem value="user_role_change">User Role Changes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>User</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    placeholder="Search user..."
                    className="pl-9"
                    data-testid="input-user-filter"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={exportToCSV} variant="outline" className="w-full" data-testid="button-export-audit-csv">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Audit Trail ({filteredLogs.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit logs found for the selected filters</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd MMM yyyy")}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "hh:mm:ss a")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                            <span className="flex items-center gap-1">
                              {actionIcons[log.action]}
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{log.entityType}</span>
                          <br />
                          <span className="font-medium">{log.entityName}</span>
                        </TableCell>
                        <TableCell>{log.userName}</TableCell>
                        <TableCell className="max-w-xs">
                          {log.oldValue && log.newValue ? (
                            <div className="text-sm">
                              <span className="line-through text-red-500">{log.oldValue}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600">{log.newValue}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{log.details}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
