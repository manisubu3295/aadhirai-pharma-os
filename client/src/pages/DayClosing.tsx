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
import { Calendar, Clock, IndianRupee, CheckCircle2, AlertCircle, PlayCircle, StopCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";

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

export default function DayClosing() {
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [expectedCashData, setExpectedCashData] = useState<ExpectedCashData | null>(null);
  
  const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dayClosings = [], isLoading } = useQuery<DayClosing[]>({
    queryKey: ["/api/day-closings", fromDate, toDate],
    queryFn: async () => {
      const response = await fetch(`/api/day-closings?from=${fromDate}&to=${toDate}`);
      if (!response.ok) throw new Error("Failed to fetch day closings");
      return response.json();
    },
  });

  const { data: todayRecord } = useQuery<DayClosing | null>({
    queryKey: ["/api/day-closing", todayStr],
    queryFn: async () => {
      const response = await fetch(`/api/day-closing/${todayStr}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch today's record");
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
        throw new Error(error.message || "Failed to open day");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/day-closing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/day-closings"] });
      setOpenDialogOpen(false);
      setOpeningCash("");
      toast({ title: "Day opened successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
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
        throw new Error(error.message || "Failed to close day");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/day-closing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/day-closings"] });
      setCloseDialogOpen(false);
      setActualCash("");
      setClosingNotes("");
      toast({ title: "Day closed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleOpenDay = () => {
    if (!openingCash) {
      toast({ title: "Please enter opening cash amount", variant: "destructive" });
      return;
    }
    openDayMutation.mutate({ openingCash });
  };

  const handleCloseDay = () => {
    if (!actualCash) {
      toast({ title: "Please enter actual cash amount", variant: "destructive" });
      return;
    }
    closeDayMutation.mutate({ actualCash, notes: closingNotes });
  };

  const isDayOpen = todayRecord?.status === "OPEN";
  const isDayClosed = todayRecord?.status === "CLOSED";

  return (
    <AppLayout title="Day Closing">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-lg font-bold text-blue-600" data-testid="text-today-date">
                  {format(new Date(), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${isDayOpen ? "bg-green-100" : isDayClosed ? "bg-gray-100" : "bg-yellow-100"}`}>
                <Clock className={`h-6 w-6 ${isDayOpen ? "text-green-600" : isDayClosed ? "text-gray-600" : "text-yellow-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-lg font-bold ${isDayOpen ? "text-green-600" : isDayClosed ? "text-gray-600" : "text-yellow-600"}`}>
                  {isDayOpen ? "Day Open" : isDayClosed ? "Day Closed" : "Not Opened"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <IndianRupee className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opening Cash</p>
                <p className="text-lg font-bold text-purple-600">
                  ₹{todayRecord?.openingCash ? parseFloat(todayRecord.openingCash).toLocaleString() : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <IndianRupee className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Cash</p>
                <p className="text-lg font-bold text-orange-600">
                  ₹{expectedCashData?.expectedCash?.toLocaleString() || todayRecord?.expectedCash ? parseFloat(todayRecord?.expectedCash || "0").toLocaleString() : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!todayRecord && (
              <Button onClick={() => setOpenDialogOpen(true)} className="w-full" data-testid="button-open-day">
                <PlayCircle className="h-4 w-4 mr-2" />
                Open Day
              </Button>
            )}
            {isDayOpen && (
              <>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Day opened at {todayRecord.openingTime ? format(new Date(todayRecord.openingTime), "hh:mm a") : "-"}
                  </p>
                </div>
                <Button onClick={() => { fetchExpectedCash(); setCloseDialogOpen(true); }} variant="destructive" className="w-full" data-testid="button-close-day">
                  <StopCircle className="h-4 w-4 mr-2" />
                  Close Day
                </Button>
              </>
            )}
            {isDayClosed && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Day closed at {todayRecord.closingTime ? format(new Date(todayRecord.closingTime), "hh:mm a") : "-"}
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Expected</p>
                    <p className="font-mono font-medium">₹{parseFloat(todayRecord.expectedCash || "0").toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-mono font-medium">₹{parseFloat(todayRecord.actualCash || "0").toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Difference</p>
                    <p className={`font-mono font-medium ${parseFloat(todayRecord.difference || "0") < 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{parseFloat(todayRecord.difference || "0").toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isDayOpen && expectedCashData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cash Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opening Cash:</span>
                  <span className="font-mono">₹{expectedCashData.openingCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>+ Cash Sales:</span>
                  <span className="font-mono">₹{expectedCashData.cashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>+ Cash Collections:</span>
                  <span className="font-mono">₹{expectedCashData.cashCollections.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>- Cash Expenses:</span>
                  <span className="font-mono">₹{expectedCashData.cashExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Expected Cash:</span>
                  <span className="font-mono">₹{expectedCashData.expectedCash.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Day Closing History</CardTitle>
              <CardDescription>View past day opening and closing records</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">From:</Label>
                <Input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40"
                  data-testid="input-closing-from-date"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">To:</Label>
                <Input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                  data-testid="input-closing-to-date"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : dayClosings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No records found</p>
              <p className="text-sm">Day closing records will appear here</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Opening Time</TableHead>
                    <TableHead className="text-right">Opening Cash</TableHead>
                    <TableHead>Closing Time</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayClosings.map((dc) => (
                    <TableRow key={dc.id} data-testid={`row-dayclosing-${dc.id}`}>
                      <TableCell className="font-medium">{format(parseISO(dc.businessDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>{dc.openingTime ? format(new Date(dc.openingTime), "hh:mm a") : "-"}</TableCell>
                      <TableCell className="text-right font-mono">₹{parseFloat(dc.openingCash || "0").toLocaleString()}</TableCell>
                      <TableCell>{dc.closingTime ? format(new Date(dc.closingTime), "hh:mm a") : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{dc.expectedCash ? `₹${parseFloat(dc.expectedCash).toLocaleString()}` : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{dc.actualCash ? `₹${parseFloat(dc.actualCash).toLocaleString()}` : "-"}</TableCell>
                      <TableCell className={`text-right font-mono ${dc.difference && parseFloat(dc.difference) < 0 ? "text-red-600" : "text-green-600"}`}>
                        {dc.difference ? `₹${parseFloat(dc.difference).toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell>
                        {dc.status === "OPEN" ? (
                          <Badge className="bg-green-100 text-green-800">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Closed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open Day - {format(new Date(), "dd MMM yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Opening Cash *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  data-testid="input-opening-cash"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Enter the cash amount in the register at the start of the day</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOpenDay} disabled={openDayMutation.isPending} data-testid="button-confirm-open-day">
              {openDayMutation.isPending ? "Opening..." : "Open Day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Day - {format(new Date(), "dd MMM yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {expectedCashData && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-2">Cash Summary</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Opening:</span>
                    <span className="font-mono">₹{expectedCashData.openingCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ Sales:</span>
                    <span className="font-mono">₹{expectedCashData.cashSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ Collections:</span>
                    <span className="font-mono">₹{expectedCashData.cashCollections.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Expected:</span>
                    <span className="font-mono">₹{expectedCashData.expectedCash.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
            <div>
              <Label>Actual Cash in Register *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                  data-testid="input-actual-cash"
                />
              </div>
            </div>
            {actualCash && expectedCashData && (
              <div className={`p-3 rounded-lg ${parseFloat(actualCash) - expectedCashData.expectedCash < 0 ? "bg-red-50" : "bg-green-50"}`}>
                <div className="flex items-center gap-2">
                  {parseFloat(actualCash) - expectedCashData.expectedCash < 0 ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  <span className={`font-medium ${parseFloat(actualCash) - expectedCashData.expectedCash < 0 ? "text-red-700" : "text-green-700"}`}>
                    Difference: ₹{(parseFloat(actualCash) - expectedCashData.expectedCash).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            <div>
              <Label>Notes (Optional)</Label>
              <Input
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Any remarks about the difference"
                data-testid="input-closing-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCloseDay} disabled={closeDayMutation.isPending} variant="destructive" data-testid="button-confirm-close-day">
              {closeDayMutation.isPending ? "Closing..." : "Close Day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
