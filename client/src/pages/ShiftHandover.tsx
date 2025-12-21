import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  Clock, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle, 
  PlayCircle, 
  StopCircle,
  ArrowRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth } from "date-fns";

interface DayClosing {
  id: number;
  businessDate: string;
  openedByUserId: string | null;
  openingCash: string;
  openingTime: string | null;
  closedByUserId: string | null;
  expectedCash: string | null;
  actualCash: string | null;
  difference: string | null;
  closingTime: string | null;
  notes: string | null;
  status: string;
}

interface ExpectedCashData {
  openingCash: number;
  cashSales: number;
  cashCollections: number;
  cashExpenses: number;
  expectedCash: number;
}

export default function ShiftHandover() {
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [expectedCashData, setExpectedCashData] = useState<ExpectedCashData | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayRecord, isLoading } = useQuery<DayClosing | null>({
    queryKey: ["/api/day-closing", todayStr],
    queryFn: async () => {
      const response = await fetch(`/api/day-closing/${todayStr}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch today's record");
      return response.json();
    },
  });

  const { data: recentClosings = [] } = useQuery<DayClosing[]>({
    queryKey: ["/api/day-closings-recent"],
    queryFn: async () => {
      const response = await fetch(`/api/day-closings?limit=7`);
      if (!response.ok) throw new Error("Failed to fetch recent closings");
      return response.json();
    },
  });

  const fetchExpectedCash = async () => {
    try {
      const res = await fetch(`/api/day-closing/${todayStr}/expected-cash`);
      if (res.ok) {
        const data = await res.json();
        setExpectedCashData(data);
      }
    } catch (error) {
      console.error("Failed to fetch expected cash", error);
    }
  };

  useEffect(() => {
    if (todayRecord?.status === "OPEN") {
      fetchExpectedCash();
    }
  }, [todayRecord]);

  const openDayMutation = useMutation({
    mutationFn: async (data: { openingCash: string }) => {
      const res = await fetch("/api/day-closing/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDate: todayStr, openingCash: data.openingCash }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to open shift");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift opened successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/day-closing"] });
      setOpenDialogOpen(false);
      setOpeningCash("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const closeDayMutation = useMutation({
    mutationFn: async (data: { actualCash: string; notes: string }) => {
      const res = await fetch("/api/day-closing/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDate: todayStr, actualCash: data.actualCash, notes: data.notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to close shift");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift closed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/day-closing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/day-closings-recent"] });
      setCloseDialogOpen(false);
      setActualCash("");
      setClosingNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleOpenShift = () => {
    if (!openingCash) {
      toast({ title: "Error", description: "Please enter opening cash amount", variant: "destructive" });
      return;
    }
    openDayMutation.mutate({ openingCash });
  };

  const handleCloseShift = () => {
    if (!actualCash) {
      toast({ title: "Error", description: "Please enter actual cash amount", variant: "destructive" });
      return;
    }
    closeDayMutation.mutate({ actualCash, notes: closingNotes });
  };

  const difference = expectedCashData && actualCash 
    ? parseFloat(actualCash) - expectedCashData.expectedCash 
    : null;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Shift Handover</h1>
          <p className="text-muted-foreground">Open and close daily shifts with cash reconciliation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Shift - {format(new Date(), "dd MMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : !todayRecord ? (
                <div className="text-center py-8 space-y-4">
                  <div className="flex justify-center">
                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                  </div>
                  <p className="text-muted-foreground">Shift not opened yet</p>
                  <Button onClick={() => setOpenDialogOpen(true)} data-testid="button-open-shift">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Open Shift
                  </Button>
                </div>
              ) : todayRecord.status === "OPEN" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-100 text-green-800 px-3 py-1">
                      <Clock className="h-3 w-3 mr-1" />
                      SHIFT OPEN
                    </Badge>
                    {todayRecord.openingTime && (
                      <span className="text-sm text-muted-foreground">
                        Since {format(new Date(todayRecord.openingTime), "HH:mm")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <Label className="text-muted-foreground text-sm">Opening Cash</Label>
                      <p className="text-xl font-bold">₹{parseFloat(todayRecord.openingCash || "0").toFixed(2)}</p>
                    </div>
                    {expectedCashData && (
                      <div className="bg-muted p-4 rounded-lg">
                        <Label className="text-muted-foreground text-sm">Expected Cash</Label>
                        <p className="text-xl font-bold">₹{expectedCashData.expectedCash.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {expectedCashData && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Cash Sales</span>
                        <span className="text-green-600">+₹{expectedCashData.cashSales.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash Collections</span>
                        <span className="text-green-600">+₹{expectedCashData.cashCollections.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash Expenses/Refunds</span>
                        <span className="text-red-600">-₹{expectedCashData.cashExpenses.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    variant="destructive" 
                    onClick={() => { fetchExpectedCash(); setCloseDialogOpen(true); }}
                    data-testid="button-close-shift"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Close Shift
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-gray-100 text-gray-800 px-3 py-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      SHIFT CLOSED
                    </Badge>
                    {todayRecord.closingTime && (
                      <span className="text-sm text-muted-foreground">
                        At {format(new Date(todayRecord.closingTime), "HH:mm")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <Label className="text-muted-foreground text-xs">Opening</Label>
                      <p className="font-bold">₹{parseFloat(todayRecord.openingCash || "0").toFixed(2)}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Label className="text-muted-foreground text-xs">Expected</Label>
                      <p className="font-bold">₹{parseFloat(todayRecord.expectedCash || "0").toFixed(2)}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Label className="text-muted-foreground text-xs">Actual</Label>
                      <p className="font-bold">₹{parseFloat(todayRecord.actualCash || "0").toFixed(2)}</p>
                    </div>
                  </div>

                  {todayRecord.difference && (
                    <div className={`p-3 rounded-lg ${parseFloat(todayRecord.difference) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <Label className="text-muted-foreground text-xs">Difference</Label>
                      <p className={`font-bold ${parseFloat(todayRecord.difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{parseFloat(todayRecord.difference).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {todayRecord.notes && (
                    <div className="text-sm">
                      <Label className="text-muted-foreground">Notes:</Label>
                      <p>{todayRecord.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Recent Shifts</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {recentClosings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent shifts</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentClosings.map((closing) => (
                      <TableRow key={closing.id} data-testid={`row-shift-${closing.id}`}>
                        <TableCell>{closing.businessDate}</TableCell>
                        <TableCell>
                          <Badge variant={closing.status === "OPEN" ? "default" : "secondary"}>
                            {closing.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {closing.difference ? (
                            <span className={parseFloat(closing.difference) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ₹{parseFloat(closing.difference).toFixed(2)}
                            </span>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Starting a new shift for {format(new Date(), "dd MMMM yyyy")}
              </p>
              <div className="space-y-2">
                <Label>Opening Cash Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-opening-cash"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleOpenShift}
                disabled={openDayMutation.isPending}
                data-testid="button-confirm-open"
              >
                Open Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {expectedCashData && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expected Cash:</span>
                    <span className="text-xl font-bold">₹{expectedCashData.expectedCash.toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Actual Cash in Drawer (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-actual-cash"
                />
              </div>

              {difference !== null && (
                <div className={`p-3 rounded-lg ${difference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex justify-between items-center">
                    <span>Difference:</span>
                    <span className={`font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{difference.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Any notes for this shift..."
                  data-testid="input-closing-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCloseShift}
                disabled={closeDayMutation.isPending}
                variant="destructive"
                data-testid="button-confirm-close"
              >
                Close Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
