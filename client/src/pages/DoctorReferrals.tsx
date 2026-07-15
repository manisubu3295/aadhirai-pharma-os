import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, Stethoscope, Calendar, CalendarRange, Receipt } from "lucide-react";
import { format } from "date-fns";
import { formatAppDateTime, parseServerDate, startOfLocalDay, endOfLocalDay } from "@/lib/dateTime";

interface Sale {
  id: number;
  doctorId: number | null;
  doctorName: string | null;
  subtotal: string;
  total: string;
  createdAt: string;
}

interface Doctor {
  id: number;
  name: string;
  commissionBasis: string | null;
  commissionRate: string | null;
  commissionFixedAmount: string | null;
  commissionBalance: string;
}

interface CommissionTransaction {
  id: number;
  doctorId: number;
  saleId: number | null;
  type: "EARNED" | "PAID";
  amount: string;
  saleAmount: string | null;
  notes: string | null;
  createdAt: string;
}

interface PeriodRow {
  period: string;
  doctorId: number;
  doctorName: string;
  salesCount: number;
  salesValue: number;
  commissionEarned: number;
  commissionPaid: number;
}

export default function DoctorReferrals() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [activeTab, setActiveTab] = useState("summary");
  const [dateFrom, setDateFrom] = useState(format(today, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  // Report page: always refetch on open. The app-wide staleTime is Infinity,
  // and sales can be made elsewhere (POS, another terminal) without this
  // client seeing an invalidation — a stale cache here shows zero earned.
  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    refetchOnMount: "always",
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    refetchOnMount: "always",
  });

  const { data: transactions = [] } = useQuery<CommissionTransaction[]>({
    queryKey: ["/api/doctor-commissions/transactions"],
    refetchOnMount: "always",
  });

  const { data: monthlyData = [] } = useQuery<PeriodRow[]>({
    queryKey: ["/api/reports/doctor-referrals/monthly", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/reports/doctor-referrals/monthly?year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch monthly data");
      return res.json();
    },
    enabled: activeTab === "monthly",
    staleTime: 0,
  });

  const { data: quarterlyData = [] } = useQuery<PeriodRow[]>({
    queryKey: ["/api/reports/doctor-referrals/quarterly", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/reports/doctor-referrals/quarterly?year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch quarterly data");
      return res.json();
    },
    enabled: activeTab === "quarterly",
    staleTime: 0,
  });

  const { data: yearlyData = [] } = useQuery<PeriodRow[]>({
    queryKey: ["/api/reports/doctor-referrals/yearly"],
    queryFn: async () => {
      const res = await fetch("/api/reports/doctor-referrals/yearly");
      if (!res.ok) throw new Error("Failed to fetch yearly data");
      return res.json();
    },
    enabled: activeTab === "yearly",
    staleTime: 0,
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // parseServerDate treats the server's naive "…Z" timestamps as local wall
  // time; raw new Date() would shift evening sales into tomorrow and drop
  // them from today's range (earned would wrongly show zero).
  const inRange = (dateStr: string) => {
    const d = parseServerDate(dateStr);
    return d >= startOfLocalDay(dateFrom) && d <= endOfLocalDay(dateTo);
  };

  const salesInRange = sales.filter((s) => s.doctorId && inRange(s.createdAt));
  const txnsInRange = transactions.filter((t) => inRange(t.createdAt));

  const summaryRows = doctors
    .map((doctor) => {
      const docSales = salesInRange.filter((s) => s.doctorId === doctor.id);
      const docTxns = txnsInRange.filter((t) => t.doctorId === doctor.id);
      const earned = docTxns.filter((t) => t.type === "EARNED").reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const paid = docTxns.filter((t) => t.type === "PAID").reduce((sum, t) => sum + parseFloat(t.amount), 0);
      return {
        doctor,
        salesCount: docSales.length,
        salesValue: docSales.reduce((sum, s) => sum + parseFloat(s.subtotal), 0),
        earned,
        paid,
        balance: parseFloat(doctor.commissionBalance) || 0,
      };
    })
    .filter((row) => row.doctor.commissionBasis || row.balance > 0 || row.salesCount > 0);

  const filteredTransactions = transactions
    .filter((t) => doctorFilter === "all" || t.doctorId === parseInt(doctorFilter))
    .filter((t) => inRange(t.createdAt));

  const doctorNameById = new Map(doctors.map((d) => [d.id, d.name]));

  const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const exportToPDF = (title: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1e40af; color: white; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Period: ${format(new Date(dateFrom), "dd MMM yyyy")} - ${format(new Date(dateTo), "dd MMM yyyy")}</p>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const DateFilters = ({ showDoctor = false }: { showDoctor?: boolean }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div>
        <Label>From Date</Label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-date-from" />
      </div>
      <div>
        <Label>To Date</Label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-date-to" />
      </div>
      {showDoctor && (
        <div>
          <Label>Doctor</Label>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger data-testid="select-doctor-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const PeriodTable = ({ data }: { data: PeriodRow[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Doctor</TableHead>
          <TableHead className="text-right">Referred Sales</TableHead>
          <TableHead className="text-right">Sales Value</TableHead>
          <TableHead className="text-right">Commission Earned</TableHead>
          <TableHead className="text-right">Commission Paid</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
        ) : (
          data.map((row, i) => (
            <TableRow key={i} data-testid={`row-period-${i}`}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{row.doctorName}</TableCell>
              <TableCell className="text-right">{row.salesCount}</TableCell>
              <TableCell className="text-right">₹{row.salesValue.toFixed(2)}</TableCell>
              <TableCell className="text-right">₹{row.commissionEarned.toFixed(2)}</TableCell>
              <TableCell className="text-right">₹{row.commissionPaid.toFixed(2)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <AppLayout title="Doctor Referrals">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="summary" data-testid="tab-summary">
              <Stethoscope className="w-4 h-4 mr-1" />Summary
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <Receipt className="w-4 h-4 mr-1" />Transactions
            </TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">
              <Calendar className="w-4 h-4 mr-1" />Monthly
            </TabsTrigger>
            <TabsTrigger value="quarterly" data-testid="tab-quarterly">
              <CalendarRange className="w-4 h-4 mr-1" />Quarterly
            </TabsTrigger>
            <TabsTrigger value="yearly" data-testid="tab-yearly">
              <CalendarRange className="w-4 h-4 mr-1" />Yearly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />Referral Summary
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => exportToCSV(
                        `doctor_referrals_summary_${dateFrom}_to_${dateTo}.csv`,
                        ["Doctor", "Referred Sales", "Sales Value", "Commission Earned", "Commission Paid", "Balance Owed"],
                        summaryRows.map((r) => [r.doctor.name, r.salesCount.toString(), r.salesValue.toFixed(2), r.earned.toFixed(2), r.paid.toFixed(2), r.balance.toFixed(2)])
                      )}
                      data-testid="button-export-summary-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => exportToPDF(
                        "Doctor Referral Summary",
                        ["Doctor", "Referred Sales", "Sales Value", "Commission Earned", "Commission Paid", "Balance Owed"],
                        summaryRows.map((r) => [r.doctor.name, r.salesCount.toString(), `₹${r.salesValue.toFixed(2)}`, `₹${r.earned.toFixed(2)}`, `₹${r.paid.toFixed(2)}`, `₹${r.balance.toFixed(2)}`])
                      )}
                      data-testid="button-export-summary-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DateFilters />
                {summaryRows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No doctors with commission activity found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Referred Sales</TableHead>
                        <TableHead className="text-right">Sales Value</TableHead>
                        <TableHead className="text-right">Commission Earned</TableHead>
                        <TableHead className="text-right">Commission Paid</TableHead>
                        <TableHead className="text-right">Balance Owed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryRows.map((row) => (
                        <TableRow key={row.doctor.id} data-testid={`row-summary-${row.doctor.id}`}>
                          <TableCell className="font-medium">{row.doctor.name}</TableCell>
                          <TableCell className="text-right">{row.salesCount}</TableCell>
                          <TableCell className="text-right">₹{row.salesValue.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.earned.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{row.paid.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-medium ${row.balance > 0 ? "text-amber-600" : ""}`}>
                            ₹{row.balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />Commission Transactions
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => exportToCSV(
                        `doctor_commission_transactions_${dateFrom}_to_${dateTo}.csv`,
                        ["Date", "Doctor", "Type", "Amount", "Sale Amount", "Notes"],
                        filteredTransactions.map((t) => [
                          formatAppDateTime(t.createdAt, "dd/MM/yyyy HH:mm"),
                          doctorNameById.get(t.doctorId) || `Doctor ${t.doctorId}`,
                          t.type,
                          t.amount,
                          t.saleAmount || "",
                          t.notes || "",
                        ])
                      )}
                      data-testid="button-export-transactions-csv"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DateFilters showDoctor />
                {filteredTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t) => (
                        <TableRow key={t.id} data-testid={`row-transaction-${t.id}`}>
                          <TableCell>{formatAppDateTime(t.createdAt, "dd MMM yyyy, hh:mm a")}</TableCell>
                          <TableCell>{doctorNameById.get(t.doctorId) || `Doctor ${t.doctorId}`}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${t.type === "EARNED" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                              {t.type}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${t.type === "EARNED" ? "text-green-600" : "text-blue-600"}`}>
                            {t.type === "EARNED" ? "+" : "-"}₹{parseFloat(t.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{t.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {(["monthly", "quarterly", "yearly"] as const).map((period) => (
            <TabsContent key={period} value={period} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize flex items-center gap-2">
                      <CalendarRange className="w-5 h-5" />{period} Referral Report
                    </CardTitle>
                    {period !== "yearly" && (
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-32" data-testid={`select-year-${period}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <PeriodTable data={period === "monthly" ? monthlyData : period === "quarterly" ? quarterlyData : yearlyData} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
