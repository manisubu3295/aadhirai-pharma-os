import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, Filter, Eye } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth } from "date-fns";

interface ApprovalRequest {
  id: number;
  type: string;
  entityType: string;
  entityId: number | null;
  requestedByUserId: string;
  requestedByUserName: string | null;
  status: string;
  approvedByUserId: string | null;
  approvedByUserName: string | null;
  reason: string | null;
  payloadBefore: string | null;
  payloadAfter: string | null;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const APPROVAL_TYPES = [
  { value: "VOID_SALE", label: "Void Sale" },
  { value: "DISCOUNT_OVERRIDE", label: "Discount Override" },
  { value: "PRICE_OVERRIDE", label: "Price Override" },
  { value: "RETURN_APPROVAL", label: "Return Approval" }
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800"
};

export default function Approvals() {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [actionNotes, setActionNotes] = useState("");
  
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [filterType, setFilterType] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/approvals", filterStatus, filterType],
    queryFn: async () => {
      let url = `/api/approvals?`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterType) url += `type=${filterType}&`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch approval requests");
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await fetch(`/api/approvals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to approve request");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setActionDialogOpen(false);
      setActionNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve request", variant: "destructive" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to reject request");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setActionDialogOpen(false);
      setActionNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject request", variant: "destructive" });
    }
  });

  const handleAction = (request: ApprovalRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setActionNotes("");
    setActionDialogOpen(true);
  };

  const handleSubmitAction = () => {
    if (!selectedRequest) return;
    
    if (actionType === "approve") {
      approveMutation.mutate({ id: selectedRequest.id, notes: actionNotes });
    } else {
      rejectMutation.mutate({ id: selectedRequest.id, notes: actionNotes });
    }
  };

  const handleViewDetails = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    return APPROVAL_TYPES.find(t => t.value === type)?.label || type;
  };

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Approval Requests</h1>
            <p className="text-muted-foreground">Review and approve pending requests</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500 text-white px-3 py-1">
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>Status:</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40" data-testid="select-filter-status">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Type:</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48" data-testid="select-filter-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {APPROVAL_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No approval requests found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} data-testid={`row-approval-${request.id}`}>
                      <TableCell>{format(new Date(request.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                      </TableCell>
                      <TableCell>{request.requestedByUserName || "Unknown"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{request.reason || "-"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[request.status] || ""}>
                          {request.status === "PENDING" && <Clock className="h-3 w-3 mr-1" />}
                          {request.status === "APPROVED" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {request.status === "REJECTED" && <XCircle className="h-3 w-3 mr-1" />}
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewDetails(request)}
                            data-testid={`button-view-approval-${request.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === "PENDING" && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600"
                                onClick={() => handleAction(request, "approve")}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600"
                                onClick={() => handleAction(request, "reject")}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">{getTypeLabel(selectedRequest.type)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={STATUS_COLORS[selectedRequest.status] || ""}>
                      {selectedRequest.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Requested By</Label>
                    <p className="font-medium">{selectedRequest.requestedByUserName || "Unknown"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">{format(new Date(selectedRequest.createdAt), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="font-medium">{selectedRequest.reason || "-"}</p>
                </div>
                {selectedRequest.payloadBefore && (
                  <div>
                    <Label className="text-muted-foreground">Before</Label>
                    <pre className="bg-muted p-2 rounded text-sm overflow-auto max-h-40">
                      {selectedRequest.payloadBefore}
                    </pre>
                  </div>
                )}
                {selectedRequest.payloadAfter && (
                  <div>
                    <Label className="text-muted-foreground">After</Label>
                    <pre className="bg-muted p-2 rounded text-sm overflow-auto max-h-40">
                      {selectedRequest.payloadAfter}
                    </pre>
                  </div>
                )}
                {selectedRequest.status !== "PENDING" && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Reviewed By</Label>
                      <p className="font-medium">{selectedRequest.approvedByUserName || "Unknown"}</p>
                    </div>
                    {selectedRequest.approvalNotes && (
                      <div>
                        <Label className="text-muted-foreground">Review Notes</Label>
                        <p className="font-medium">{selectedRequest.approvalNotes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve Request" : "Reject Request"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to {actionType} this request?
              </p>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add any notes..."
                  data-testid="input-action-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmitAction}
                variant={actionType === "approve" ? "default" : "destructive"}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                data-testid={`button-confirm-${actionType}`}
              >
                {actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
