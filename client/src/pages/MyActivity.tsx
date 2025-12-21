import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Activity, 
  Filter, 
  User,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  Clock
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

interface ActivityLog {
  id: number;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  detailsBefore: string | null;
  detailsAfter: string | null;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

const ENTITY_TYPES = [
  { value: "MEDICINE", label: "Medicine", icon: Package },
  { value: "SALE", label: "Sale", icon: ShoppingCart },
  { value: "USER", label: "User", icon: Users },
  { value: "CUSTOMER", label: "Customer", icon: Users },
  { value: "SUPPLIER", label: "Supplier", icon: FileText },
  { value: "SETTINGS", label: "Settings", icon: Settings },
];

const ACTION_TYPES = [
  { value: "CREATE", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

function getEntityIcon(entityType: string) {
  const found = ENTITY_TYPES.find(e => e.value === entityType);
  return found ? found.icon : Activity;
}

export default function MyActivity() {
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { user: currentUser } = useAuth();
  const isOwnerOrAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isOwnerOrAdmin,
  });

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", filterEntityType, filterAction, filterUserId, filterFrom, filterTo],
    queryFn: async () => {
      let url = `/api/activity-logs?`;
      if (filterEntityType) url += `entityType=${filterEntityType}&`;
      if (filterAction) url += `action=${filterAction}&`;
      if (filterUserId) url += `userId=${filterUserId}&`;
      if (filterFrom) url += `from=${filterFrom}&`;
      if (filterTo) url += `to=${filterTo}&`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch activity logs");
      return response.json();
    },
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Activity className="h-6 w-6" />
            {isOwnerOrAdmin ? "Activity Log" : "My Activity"}
          </h1>
          <p className="text-muted-foreground">
            {isOwnerOrAdmin 
              ? "View all system activity and changes made by users"
              : "View your transactions and changes in the system"
            }
          </p>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              {isOwnerOrAdmin 
                ? "This log shows all actions performed in the system - when medicines are added or removed, users created, sales made, and more. Use the filters to find specific activities."
                : "This shows all your activities in the system - the sales you made, medicines you added or updated, and other changes you performed."
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>Type:</Label>
                <Select value={filterEntityType || "all"} onValueChange={(v) => setFilterEntityType(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40" data-testid="select-filter-entity-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {ENTITY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label>Action:</Label>
                <Select value={filterAction || "all"} onValueChange={(v) => setFilterAction(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-36" data-testid="select-filter-action">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {ACTION_TYPES.map(action => (
                      <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isOwnerOrAdmin && users.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label>User:</Label>
                  <Select value={filterUserId || "all"} onValueChange={(v) => setFilterUserId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-40" data-testid="select-filter-user">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label>From:</Label>
                <Input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-36"
                  data-testid="input-filter-from"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label>To:</Label>
                <Input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="w-36"
                  data-testid="input-filter-to"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity found. Activities will appear here when you make changes in the system.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    {isOwnerOrAdmin && <TableHead>User</TableHead>}
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const EntityIcon = getEntityIcon(log.entityType);
                    return (
                      <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                          </div>
                        </TableCell>
                        {isOwnerOrAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{log.userName}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <EntityIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{log.entityType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <span className="text-sm">{log.description}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
