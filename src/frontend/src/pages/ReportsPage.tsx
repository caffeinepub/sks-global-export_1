import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Download,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "../hooks/useAppStore";
import { exportToExcel, formatCurrency, formatDate } from "../utils/helpers";

// ──────────────────────────────────────────────
// Helper: Summary Card
// ──────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

function SummaryCard({
  label,
  value,
  sub,
  trend,
  color = "bg-primary/5",
}: SummaryCardProps) {
  return (
    <Card className={`${color} border-border`}>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            {trend === "up" && (
              <ArrowUpRight className="w-3 h-3 text-green-600" />
            )}
            {trend === "down" && (
              <ArrowDownRight className="w-3 h-3 text-red-600" />
            )}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Account Statement Tab
// ──────────────────────────────────────────────

function AccountStatementTab() {
  const { bills, customers } = useAppStore();
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState(false);

  const apply = () => setApplied(true);

  const statement = useMemo(() => {
    if (!applied && filterCustomer === "all" && !dateFrom && !dateTo)
      return null;

    // Build ledger entries from bills
    const entries: {
      date: string;
      description: string;
      type: "bill" | "payment";
      debit: number;
      credit: number;
      customerId: string;
      customerName: string;
    }[] = [];

    for (const bill of bills) {
      if (filterCustomer !== "all" && bill.customerId !== filterCustomer)
        continue;
      if (dateFrom && bill.date < dateFrom) continue;
      if (dateTo && bill.date > dateTo) continue;

      entries.push({
        date: bill.date,
        description: `Bill ${bill.billNo}`,
        type: "bill",
        debit: bill.total,
        credit: 0,
        customerId: bill.customerId,
        customerName: bill.customerName,
      });

      if (bill.amountPaid > 0) {
        entries.push({
          date: bill.date,
          description: `Payment for ${bill.billNo}`,
          type: "payment",
          debit: 0,
          credit: bill.amountPaid,
          customerId: bill.customerId,
          customerName: bill.customerName,
        });
      }
    }

    // Sort by date
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Running balance
    let balance = 0;
    const rows = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    const netBalance = totalDebit - totalCredit;

    return { rows, totalDebit, totalCredit, netBalance };
  }, [bills, filterCustomer, dateFrom, dateTo, applied]);

  const handleExport = async () => {
    if (!statement) return;
    const data = statement.rows.map((r) => ({
      Date: formatDate(r.date),
      Description: r.description,
      Customer: r.customerName,
      "Debit (₹)": r.debit || "",
      "Credit (₹)": r.credit || "",
      "Balance (₹)": r.balance,
    }));
    await exportToExcel(
      [{ name: "Account Statement", data }],
      "Account_Statement.xlsx",
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <Select value={filterCustomer} onValueChange={setFilterCustomer}>
              <SelectTrigger className="text-sm w-48">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <Button onClick={apply} className="bg-primary text-white">
            Apply
          </Button>
          {statement && (
            <Button variant="outline" onClick={handleExport}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {statement ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Debit"
              value={formatCurrency(statement.totalDebit)}
              color="bg-red-50"
            />
            <SummaryCard
              label="Total Credit"
              value={formatCurrency(statement.totalCredit)}
              color="bg-green-50"
            />
            <SummaryCard
              label="Net Balance"
              value={formatCurrency(statement.netBalance)}
              color={statement.netBalance > 0 ? "bg-amber-50" : "bg-primary/5"}
            />
          </div>

          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">
                      Debit (₹)
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Credit (₹)
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Balance (₹)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No transactions found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statement.rows.map((row, idx) => (
                      <TableRow
                        key={`${idx}-${row.date}`}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="text-xs">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.customerName}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.description}
                        </TableCell>
                        <TableCell className="text-xs text-right text-red-600">
                          {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right text-green-600">
                          {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-xs text-right font-semibold ${row.balance > 0 ? "text-amber-700" : "text-green-700"}`}
                        >
                          {formatCurrency(Math.abs(row.balance))}
                          {row.balance > 0
                            ? " Dr"
                            : row.balance < 0
                              ? " Cr"
                              : ""}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-xs p-12 text-center text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            Select filters and click Apply to generate account statement.
          </p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// GST Report Tab
// ──────────────────────────────────────────────

function GSTReportTab() {
  const { invoices } = useAppStore();

  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, "0"),
  );
  const [filterYear, setFilterYear] = useState(
    String(currentDate.getFullYear()),
  );
  const [applied, setApplied] = useState(false);

  const gstData = useMemo(() => {
    if (!applied) return null;

    const filtered = invoices.filter((inv) => {
      if (inv.invoiceType !== "gst") return false;
      const invDate = new Date(inv.date);
      return (
        String(invDate.getMonth() + 1).padStart(2, "0") === filterMonth &&
        String(invDate.getFullYear()) === filterYear
      );
    });

    // Aggregate by product
    const productMap = new Map<
      string,
      {
        productName: string;
        taxableAmt: number;
        cgstAmt: number;
        sgstAmt: number;
        totalAmt: number;
        gstRate: number;
      }
    >();

    for (const inv of filtered) {
      for (const item of inv.items) {
        const taxable = (item.totalPrice * 100) / (100 + item.gstRate);
        const cgst = (item.totalPrice - taxable) / 2;
        const existing = productMap.get(item.productName);
        if (existing) {
          existing.taxableAmt += taxable;
          existing.cgstAmt += cgst;
          existing.sgstAmt += cgst;
          existing.totalAmt += item.totalPrice;
        } else {
          productMap.set(item.productName, {
            productName: item.productName,
            taxableAmt: taxable,
            cgstAmt: cgst,
            sgstAmt: cgst,
            totalAmt: item.totalPrice,
            gstRate: item.gstRate,
          });
        }
      }
    }

    const rows = Array.from(productMap.values());
    const totalTaxable = rows.reduce((s, r) => s + r.taxableAmt, 0);
    const totalCGST = rows.reduce((s, r) => s + r.cgstAmt, 0);
    const totalSGST = rows.reduce((s, r) => s + r.sgstAmt, 0);
    const totalGST = totalCGST + totalSGST;
    const grandTotal = rows.reduce((s, r) => s + r.totalAmt, 0);

    return { rows, totalTaxable, totalCGST, totalSGST, totalGST, grandTotal };
  }, [invoices, filterMonth, filterYear, applied]);

  const handleExport = async () => {
    if (!gstData) return;
    const data = gstData.rows.map((r) => ({
      "Product / HSN": r.productName,
      "Taxable Amount (₹)": r.taxableAmt.toFixed(2),
      "CGST Rate": `${r.gstRate / 2}%`,
      "CGST Amount (₹)": r.cgstAmt.toFixed(2),
      "SGST Rate": `${r.gstRate / 2}%`,
      "SGST Amount (₹)": r.sgstAmt.toFixed(2),
      "Total Tax (₹)": (r.cgstAmt + r.sgstAmt).toFixed(2),
      "Invoice Total (₹)": r.totalAmt.toFixed(2),
    }));
    await exportToExcel([{ name: "GST Report", data }], "GST_Report.xlsx");
  };

  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const years = Array.from({ length: 5 }, (_, i) =>
    String(currentDate.getFullYear() - i),
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="text-sm w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={m} value={m}>
                    {monthNames[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="text-sm w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setApplied(true)}
            className="bg-primary text-white"
          >
            Apply
          </Button>
          {gstData && (
            <Button variant="outline" onClick={handleExport}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {gstData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryCard
              label="Taxable Value"
              value={formatCurrency(gstData.totalTaxable)}
              color="bg-slate-50"
            />
            <SummaryCard
              label="Total CGST"
              value={formatCurrency(gstData.totalCGST)}
              color="bg-blue-50"
            />
            <SummaryCard
              label="Total SGST"
              value={formatCurrency(gstData.totalSGST)}
              color="bg-indigo-50"
            />
            <SummaryCard
              label="Total GST"
              value={formatCurrency(gstData.totalGST)}
              color="bg-purple-50"
            />
            <SummaryCard
              label="Grand Total"
              value={formatCurrency(gstData.grandTotal)}
              color="bg-primary/5"
            />
          </div>

          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">HSN / Product</TableHead>
                    <TableHead className="text-xs text-right">
                      Taxable Amt
                    </TableHead>
                    <TableHead className="text-xs text-center">CGST%</TableHead>
                    <TableHead className="text-xs text-right">
                      CGST Amt
                    </TableHead>
                    <TableHead className="text-xs text-center">SGST%</TableHead>
                    <TableHead className="text-xs text-right">
                      SGST Amt
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Total Tax
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      Invoice Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstData.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No GST invoices for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    gstData.rows.map((row) => (
                      <TableRow
                        key={row.productName}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="text-xs font-medium">
                          {row.productName}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.taxableAmt)}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {row.gstRate / 2}%
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.cgstAmt)}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {row.gstRate / 2}%
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.sgstAmt)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(row.cgstAmt + row.sgstAmt)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold">
                          {formatCurrency(row.totalAmt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-xs p-12 text-center text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            Select a month/year and click Apply to generate GST report.
          </p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sales Report Tab
// ──────────────────────────────────────────────

function SalesReportTab() {
  const { bills, customers } = useAppStore();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const salesData = useMemo(() => {
    const filtered = bills.filter((bill) => {
      if (dateFrom && bill.date < dateFrom) return false;
      if (dateTo && bill.date > dateTo) return false;
      if (filterCustomer !== "all" && bill.customerId !== filterCustomer)
        return false;
      return true;
    });

    // Filter items by category too
    const filteredWithItems =
      filterCategory === "all"
        ? filtered
        : filtered
            .map((b) => ({
              ...b,
              items: b.items.filter((i) => i.productType === filterCategory),
            }))
            .filter((b) => b.items.length > 0);

    const totalSales = filteredWithItems.reduce((s, b) => s + b.total, 0);
    const totalBills = filteredWithItems.length;
    const avgBillValue = totalBills > 0 ? totalSales / totalBills : 0;

    // Top customer
    const customerTotals = new Map<string, { name: string; total: number }>();
    for (const bill of filteredWithItems) {
      const existing = customerTotals.get(bill.customerId);
      if (existing) {
        existing.total += bill.total;
      } else {
        customerTotals.set(bill.customerId, {
          name: bill.customerName,
          total: bill.total,
        });
      }
    }
    const topCustomer = Array.from(customerTotals.values()).sort(
      (a, b) => b.total - a.total,
    )[0];

    // Daily sales
    const dailyMap = new Map<
      string,
      { date: string; count: number; total: number }
    >();
    for (const bill of filteredWithItems) {
      const existing = dailyMap.get(bill.date);
      if (existing) {
        existing.count += 1;
        existing.total += bill.total;
      } else {
        dailyMap.set(bill.date, {
          date: bill.date,
          count: 1,
          total: bill.total,
        });
      }
    }
    const dailySales = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Category breakdown
    const categoryMap = new Map<string, { category: string; total: number }>();
    for (const bill of filteredWithItems) {
      for (const item of bill.items) {
        const key = item.productType;
        const existing = categoryMap.get(key);
        if (existing) {
          existing.total += item.totalPrice;
        } else {
          categoryMap.set(key, {
            category: key,
            total: item.totalPrice,
          });
        }
      }
    }
    const categoryBreakdown = Array.from(categoryMap.values());

    return {
      totalSales,
      totalBills,
      avgBillValue,
      topCustomer: topCustomer?.name || "—",
      dailySales,
      categoryBreakdown,
    };
  }, [bills, dateFrom, dateTo, filterCustomer, filterCategory]);

  const handleExport = async () => {
    const dailyData = salesData.dailySales.map((d) => ({
      Date: formatDate(d.date),
      "Bill Count": d.count,
      "Total Sales (₹)": d.total.toFixed(2),
    }));
    const catData = salesData.categoryBreakdown.map((c) => ({
      Category: c.category,
      "Total Sales (₹)": c.total.toFixed(2),
    }));
    await exportToExcel(
      [
        { name: "Daily Sales", data: dailyData },
        { name: "Category Wise", data: catData },
      ],
      "Sales_Report.xlsx",
    );
  };

  const CATEGORY_LABELS: Record<string, string> = {
    general: "General",
    courier_awb: "Courier AWB",
    xerox: "Xerox",
    service: "Service",
  };

  const chartData = salesData.dailySales.map((d) => ({
    date: formatDate(d.date),
    Sales: Math.round(d.total),
    Bills: d.count,
  }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <Select value={filterCustomer} onValueChange={setFilterCustomer}>
              <SelectTrigger className="text-sm w-44">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="text-sm w-44">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="courier_awb">Courier AWB</SelectItem>
                <SelectItem value="xerox">Xerox</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Sales"
          value={formatCurrency(salesData.totalSales)}
          color="bg-primary/5"
          trend="up"
        />
        <SummaryCard
          label="Total Bills"
          value={String(salesData.totalBills)}
          color="bg-blue-50"
        />
        <SummaryCard
          label="Avg Bill Value"
          value={formatCurrency(salesData.avgBillValue)}
          color="bg-indigo-50"
        />
        <SummaryCard
          label="Top Customer"
          value={salesData.topCustomer}
          color="bg-green-50"
        />
      </div>

      {/* Daily Sales Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-xs p-4">
          <h3 className="text-sm font-semibold mb-4">Daily Sales</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Sales"]}
              />
              <Bar
                dataKey="Sales"
                fill="oklch(0.28 0.08 255)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily Sales Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/20">
          <h3 className="text-sm font-semibold">Daily Sales Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-center">
                  Bill Count
                </TableHead>
                <TableHead className="text-xs text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.dailySales.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No sales data found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                salesData.dailySales.map((row) => (
                  <TableRow key={row.date} className="hover:bg-muted/20">
                    <TableCell className="text-xs">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Category Breakdown */}
      {salesData.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold">Category-wise Sales</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-right">
                    Total Sales (₹)
                  </TableHead>
                  <TableHead className="text-xs text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.categoryBreakdown.map((row) => {
                  const share =
                    salesData.totalSales > 0
                      ? ((row.total / salesData.totalSales) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <TableRow key={row.category} className="hover:bg-muted/20">
                      <TableCell className="text-xs">
                        <Badge variant="secondary">
                          {CATEGORY_LABELS[row.category] || row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {share}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Purchase Report Tab
// ──────────────────────────────────────────────

function PurchaseReportTab() {
  const { purchaseInvoices, vendors } = useAppStore();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");

  const purchaseData = useMemo(() => {
    const filtered = purchaseInvoices.filter((inv) => {
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;
      if (filterVendor !== "all" && inv.vendorId !== filterVendor) return false;
      return true;
    });

    const totalPurchases = filtered.reduce((s, i) => s + i.total, 0);
    const totalVendors = new Set(filtered.map((i) => i.vendorId)).size;
    const avgPurchase =
      filtered.length > 0 ? totalPurchases / filtered.length : 0;

    return { rows: filtered, totalPurchases, totalVendors, avgPurchase };
  }, [purchaseInvoices, dateFrom, dateTo, filterVendor]);

  const handleExport = async () => {
    const data = purchaseData.rows.map((inv) => ({
      Vendor: inv.vendorName,
      "Invoice No": inv.invoiceNo,
      Date: formatDate(inv.date),
      Items: inv.items.length,
      "Total (₹)": inv.total.toFixed(2),
      "Payment Status": inv.paymentStatus,
    }));
    await exportToExcel(
      [{ name: "Purchase Report", data }],
      "Purchase_Report.xlsx",
    );
  };

  const getStatusBadge = (status: string) => (
    <Badge
      variant="outline"
      className={`text-xs ${
        status === "paid"
          ? "status-paid"
          : status === "partial"
            ? "status-partial"
            : "status-pending"
      }`}
    >
      {status}
    </Badge>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vendor</Label>
            <Select value={filterVendor} onValueChange={setFilterVendor}>
              <SelectTrigger className="text-sm w-44">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Purchases"
          value={formatCurrency(purchaseData.totalPurchases)}
          color="bg-red-50"
        />
        <SummaryCard
          label="Total Vendors"
          value={String(purchaseData.totalVendors)}
          color="bg-blue-50"
        />
        <SummaryCard
          label="Avg Purchase"
          value={formatCurrency(purchaseData.avgPurchase)}
          color="bg-primary/5"
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">Invoice No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-center">Items</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseData.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No purchase invoices found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                purchaseData.rows.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {inv.vendorName}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {inv.invoiceNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {inv.items.length}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.paymentStatus)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Profit & Loss Tab
// ──────────────────────────────────────────────

function ProfitLossTab() {
  const { bills, purchaseInvoices } = useAppStore();

  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const plData = useMemo(() => {
    const filteredSales = bills.filter(
      (b) => b.date >= dateFrom && b.date <= dateTo,
    );
    const filteredPurchases = purchaseInvoices.filter(
      (p) => p.date >= dateFrom && p.date <= dateTo,
    );

    const totalSalesRevenue = filteredSales.reduce((s, b) => s + b.total, 0);
    const totalPurchaseCost = filteredPurchases.reduce(
      (s, p) => s + p.total,
      0,
    );
    const grossProfit = totalSalesRevenue - totalPurchaseCost;
    const profitMargin =
      totalSalesRevenue > 0
        ? ((grossProfit / totalSalesRevenue) * 100).toFixed(1)
        : "0.0";

    // Monthly breakdown
    const monthMap = new Map<
      string,
      { month: string; sales: number; purchases: number }
    >();

    for (const bill of filteredSales) {
      const d = new Date(bill.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.sales += bill.total;
      } else {
        monthMap.set(key, { month: key, sales: bill.total, purchases: 0 });
      }
    }

    for (const inv of filteredPurchases) {
      const d = new Date(inv.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.purchases += inv.total;
      } else {
        monthMap.set(key, { month: key, sales: 0, purchases: inv.total });
      }
    }

    const monthlyRows = Array.from(monthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    return {
      totalSalesRevenue,
      totalPurchaseCost,
      grossProfit,
      profitMargin,
      monthlyRows,
    };
  }, [bills, purchaseInvoices, dateFrom, dateTo]);

  const chartData = plData.monthlyRows.map((r) => ({
    month: r.month,
    Sales: Math.round(r.sales),
    Purchases: Math.round(r.purchases),
    Profit: Math.round(r.sales - r.purchases),
  }));

  const handleExport = async () => {
    const data = plData.monthlyRows.map((r) => ({
      Month: r.month,
      "Sales (₹)": r.sales.toFixed(2),
      "Purchases (₹)": r.purchases.toFixed(2),
      "Profit (₹)": (r.sales - r.purchases).toFixed(2),
    }));
    await exportToExcel(
      [{ name: "Profit & Loss", data }],
      "Profit_Loss_Report.xlsx",
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm w-40"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Sales Revenue"
          value={formatCurrency(plData.totalSalesRevenue)}
          color="bg-green-50"
          trend="up"
        />
        <SummaryCard
          label="Total Purchase Cost"
          value={formatCurrency(plData.totalPurchaseCost)}
          color="bg-red-50"
          trend="down"
        />
        <SummaryCard
          label="Gross Profit"
          value={formatCurrency(plData.grossProfit)}
          color={plData.grossProfit >= 0 ? "bg-primary/5" : "bg-amber-50"}
        />
        <SummaryCard
          label="Profit Margin"
          value={`${plData.profitMargin}%`}
          color="bg-indigo-50"
        />
      </div>

      {/* Profit Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-xs p-4">
          <h3 className="text-sm font-semibold mb-4">
            Monthly Profit / Loss Trend
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Sales"
                stroke="oklch(0.52 0.15 145)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Purchases"
                stroke="oklch(0.577 0.245 27)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Profit"
                stroke="oklch(0.28 0.08 255)"
                strokeWidth={2.5}
                strokeDasharray="5 3"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/20">
          <h3 className="text-sm font-semibold">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Month</TableHead>
                <TableHead className="text-xs text-right">Sales (₹)</TableHead>
                <TableHead className="text-xs text-right">
                  Purchases (₹)
                </TableHead>
                <TableHead className="text-xs text-right">Profit (₹)</TableHead>
                <TableHead className="text-xs text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plData.monthlyRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No data found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                plData.monthlyRows.map((row) => {
                  const profit = row.sales - row.purchases;
                  const margin =
                    row.sales > 0
                      ? ((profit / row.sales) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <TableRow key={row.month} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium">
                        {row.month}
                      </TableCell>
                      <TableCell className="text-xs text-right text-green-700 font-semibold">
                        {formatCurrency(row.sales)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-red-600">
                        {formatCurrency(row.purchases)}
                      </TableCell>
                      <TableCell
                        className={`text-xs text-right font-bold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}
                      >
                        {formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {margin}%
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Courier Report Tab
// ──────────────────────────────────────────────

function CourierReportTab() {
  const { bills } = useAppStore();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterMode, setFilterMode] = useState("all");

  // Extract all courier items from bills
  const courierRows = useMemo(() => {
    const rows: {
      awbNo: string;
      senderName: string;
      receiverName: string;
      receiverPincode: string;
      weightKg: number;
      mode: string;
      brand: string;
      price: number;
      date: string;
      billNo: string;
    }[] = [];
    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.productType !== "courier_awb") continue;
        rows.push({
          awbNo: item.awbSerial || item.productName,
          senderName: item.senderName || bill.customerName,
          receiverName: item.receiverName || "",
          receiverPincode: item.receiverPincode || "",
          weightKg: item.chargeableWeightKg || item.actualWeightKg || 0,
          mode: item.serviceMode || "",
          brand: item.brandName || "",
          price: item.totalPrice,
          date: bill.date,
          billNo: bill.billNo,
        });
      }
    }
    return rows;
  }, [bills]);

  const brands = useMemo(() => {
    const set = new Set(courierRows.map((r) => r.brand).filter(Boolean));
    return [...set];
  }, [courierRows]);

  const modes = useMemo(() => {
    const set = new Set(courierRows.map((r) => r.mode).filter(Boolean));
    return [...set];
  }, [courierRows]);

  const filtered = useMemo(() => {
    return courierRows.filter((r) => {
      const matchBrand = filterBrand === "all" || r.brand === filterBrand;
      const matchMode = filterMode === "all" || r.mode === filterMode;
      const matchFrom = !dateFrom || r.date >= dateFrom;
      const matchTo = !dateTo || r.date <= dateTo;
      return matchBrand && matchMode && matchFrom && matchTo;
    });
  }, [courierRows, filterBrand, filterMode, dateFrom, dateTo]);

  const totalRevenue = filtered.reduce((s, r) => s + r.price, 0);
  const totalWeight = filtered.reduce((s, r) => s + r.weightKg, 0);
  const avgPerBooking =
    filtered.length > 0 ? totalRevenue / filtered.length : 0;

  const handleExport = () => {
    exportToExcel(
      [
        {
          name: "Courier Report",
          data: filtered.map((r) => ({
            "Bill No": r.billNo,
            Date: formatDate(r.date),
            "AWB No": r.awbNo,
            Brand: r.brand,
            "Sender Name": r.senderName,
            "Receiver Name": r.receiverName,
            "Receiver Pincode": r.receiverPincode,
            "Weight (kg)": r.weightKg,
            Mode: r.mode,
            "Price (₹)": r.price,
          })),
        },
      ],
      `courier_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="text-xs w-40">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="text-xs w-40">
            <SelectValue placeholder="All Modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {modes.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs w-36"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="ml-auto"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Bookings" value={String(filtered.length)} />
        <SummaryCard
          label="Total Weight"
          value={`${totalWeight.toFixed(2)} kg`}
        />
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
        />
        <SummaryCard
          label="Avg per Booking"
          value={formatCurrency(avgPerBooking)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">AWB No</TableHead>
                <TableHead className="text-xs">Brand</TableHead>
                <TableHead className="text-xs">Sender</TableHead>
                <TableHead className="text-xs">Receiver</TableHead>
                <TableHead className="text-xs">Pincode</TableHead>
                <TableHead className="text-xs">Weight</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="courier_report.empty_state"
                  >
                    No courier bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, idx) => (
                  <TableRow
                    key={`${row.awbNo}-${idx}`}
                    className="hover:bg-muted/20"
                  >
                    <TableCell className="text-xs">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {row.awbNo}
                    </TableCell>
                    <TableCell className="text-xs">{row.brand}</TableCell>
                    <TableCell className="text-xs">{row.senderName}</TableCell>
                    <TableCell className="text-xs">
                      {row.receiverName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.receiverPincode}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.weightKg > 0 ? `${row.weightKg} kg` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{row.mode || "-"}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(row.price)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Outstanding Dues Tab
// ──────────────────────────────────────────────

function OutstandingDuesTab() {
  const { bills, customers } = useAppStore();

  const outstandingData = useMemo(() => {
    const today = new Date();
    const map = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        phone: string;
        totalBills: number;
        totalAmount: number;
        amountPaid: number;
        balanceDue: number;
        lastBillDate: string;
        aging0_30: number;
        aging31_60: number;
        aging61_90: number;
        aging90plus: number;
      }
    >();

    for (const bill of bills) {
      if (bill.balanceDue <= 0) continue;
      const existing = map.get(bill.customerId);
      const billDate = new Date(bill.date);
      const daysDiff = Math.floor(
        (today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const agingBucket =
        daysDiff <= 30
          ? "0_30"
          : daysDiff <= 60
            ? "31_60"
            : daysDiff <= 90
              ? "61_90"
              : "90plus";

      const cust = customers.find((c) => c.id === bill.customerId);
      if (existing) {
        existing.totalBills += 1;
        existing.totalAmount += bill.total;
        existing.amountPaid += bill.amountPaid;
        existing.balanceDue += bill.balanceDue;
        if (bill.date > existing.lastBillDate)
          existing.lastBillDate = bill.date;
        if (agingBucket === "0_30") existing.aging0_30 += bill.balanceDue;
        else if (agingBucket === "31_60")
          existing.aging31_60 += bill.balanceDue;
        else if (agingBucket === "61_90")
          existing.aging61_90 += bill.balanceDue;
        else existing.aging90plus += bill.balanceDue;
      } else {
        map.set(bill.customerId, {
          customerId: bill.customerId,
          customerName: bill.customerName,
          phone: cust?.phone || "",
          totalBills: 1,
          totalAmount: bill.total,
          amountPaid: bill.amountPaid,
          balanceDue: bill.balanceDue,
          lastBillDate: bill.date,
          aging0_30: agingBucket === "0_30" ? bill.balanceDue : 0,
          aging31_60: agingBucket === "31_60" ? bill.balanceDue : 0,
          aging61_90: agingBucket === "61_90" ? bill.balanceDue : 0,
          aging90plus: agingBucket === "90plus" ? bill.balanceDue : 0,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.balanceDue - a.balanceDue);
  }, [bills, customers]);

  const totalOutstanding = outstandingData.reduce(
    (s, r) => s + r.balanceDue,
    0,
  );
  const total0_30 = outstandingData.reduce((s, r) => s + r.aging0_30, 0);
  const total31_60 = outstandingData.reduce((s, r) => s + r.aging31_60, 0);
  const total60plus = outstandingData.reduce(
    (s, r) => s + r.aging61_90 + r.aging90plus,
    0,
  );

  const handleExport = () => {
    exportToExcel(
      [
        {
          name: "Outstanding Dues",
          data: outstandingData.map((r) => ({
            "Customer Name": r.customerName,
            Phone: r.phone,
            "Total Bills": r.totalBills,
            "Total Amount": r.totalAmount,
            "Amount Paid": r.amountPaid,
            "Balance Due": r.balanceDue,
            "Last Bill Date": formatDate(r.lastBillDate),
            "0-30 Days": r.aging0_30,
            "31-60 Days": r.aging31_60,
            "61-90 Days": r.aging61_90,
            "90+ Days": r.aging90plus,
          })),
        },
      ],
      `outstanding_dues_${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
          Export Excel
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          color="bg-red-50"
        />
        <SummaryCard
          label="0-30 Days"
          value={formatCurrency(total0_30)}
          color="bg-amber-50"
        />
        <SummaryCard
          label="31-60 Days"
          value={formatCurrency(total31_60)}
          color="bg-orange-50"
        />
        <SummaryCard
          label="60+ Days"
          value={formatCurrency(total60plus)}
          color="bg-red-100"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs text-right">Bills</TableHead>
                <TableHead className="text-xs text-right">Total Amt</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs text-right">
                  Balance Due
                </TableHead>
                <TableHead className="text-xs">Last Bill</TableHead>
                <TableHead className="text-xs text-right">0-30d</TableHead>
                <TableHead className="text-xs text-right">31-60d</TableHead>
                <TableHead className="text-xs text-right">60+d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstandingData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="outstanding.empty_state"
                  >
                    No outstanding dues — all customers are up to date!
                  </TableCell>
                </TableRow>
              ) : (
                outstandingData.map((row, idx) => (
                  <TableRow
                    key={row.customerId}
                    className="hover:bg-muted/20"
                    data-ocid={`outstanding.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs font-medium">
                      {row.customerName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.phone}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {row.totalBills}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(row.totalAmount)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-green-700">
                      {formatCurrency(row.amountPaid)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-destructive">
                      {formatCurrency(row.balanceDue)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(row.lastBillDate)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-amber-700">
                      {row.aging0_30 > 0 ? formatCurrency(row.aging0_30) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right text-orange-700">
                      {row.aging31_60 > 0
                        ? formatCurrency(row.aging31_60)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right text-red-700">
                      {row.aging61_90 + row.aging90plus > 0
                        ? formatCurrency(row.aging61_90 + row.aging90plus)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Reports Page
// ──────────────────────────────────────────────

export function ReportsPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          Financial analytics, GST returns, and business insights
        </p>
      </div>

      <Tabs defaultValue="account-statement">
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger
            value="account-statement"
            className="text-xs"
            data-ocid="reports.account_statement.tab"
          >
            Account Statement
          </TabsTrigger>
          <TabsTrigger
            value="gst-report"
            className="text-xs"
            data-ocid="reports.gst_report.tab"
          >
            GST Report
          </TabsTrigger>
          <TabsTrigger
            value="sales-report"
            className="text-xs"
            data-ocid="reports.sales_report.tab"
          >
            Sales Report
          </TabsTrigger>
          <TabsTrigger
            value="purchase-report"
            className="text-xs"
            data-ocid="reports.purchase_report.tab"
          >
            Purchase Report
          </TabsTrigger>
          <TabsTrigger
            value="profit-loss"
            className="text-xs"
            data-ocid="reports.profit_loss.tab"
          >
            Profit &amp; Loss
          </TabsTrigger>
          <TabsTrigger
            value="courier-report"
            className="text-xs"
            data-ocid="reports.courier_report.tab"
          >
            Courier Report
          </TabsTrigger>
          <TabsTrigger
            value="outstanding-dues"
            className="text-xs"
            data-ocid="reports.outstanding_dues.tab"
          >
            Outstanding Dues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account-statement">
          <AccountStatementTab />
        </TabsContent>
        <TabsContent value="gst-report">
          <GSTReportTab />
        </TabsContent>
        <TabsContent value="sales-report">
          <SalesReportTab />
        </TabsContent>
        <TabsContent value="purchase-report">
          <PurchaseReportTab />
        </TabsContent>
        <TabsContent value="profit-loss">
          <ProfitLossTab />
        </TabsContent>
        <TabsContent value="courier-report">
          <CourierReportTab />
        </TabsContent>
        <TabsContent value="outstanding-dues">
          <OutstandingDuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
