import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  Package,
  Palette,
  Plus,
  Receipt,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { Bill, Invoice, PurchaseInvoice } from "../types";
import {
  formatCurrency,
  formatDate,
  getTodayStr,
  isToday,
} from "../utils/helpers";
import {
  SHARED_DATA_ID,
  getBills,
  getCustomers,
  getInvoices,
  getPurchaseInvoices,
  getVendors,
  setBills,
  setCustomers,
  setInvoices,
  setPurchaseInvoices,
} from "../utils/storage";
import { getEDDRules } from "../utils/storage";

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardProps) {
  const {
    bills,
    products,
    pickups,
    updatePickup,
    activeCompany,
    customers,
    designOrders,
  } = useAppStore();
  const [confirmPickupId, setConfirmPickupId] = useState<string | null>(null);
  const [confirmedPieces, setConfirmedPieces] = useState("");
  const [confirmedBoxes, setConfirmedBoxes] = useState("");
  const [payDialogMode, setPayDialogMode] = useState<
    "pay_in" | "pay_out" | null
  >(null);

  const today = getTodayStr();

  // EDD Follow List
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const eddItems = useMemo(() => {
    const allCourierItems = bills.flatMap((b) =>
      b.items
        .filter(
          (i) =>
            i.productType === "courier_awb" &&
            i.eddDate &&
            i.trackingStatus !== "delivered" &&
            i.trackingStatus !== "rto",
        )
        .map((i) => ({ ...i, billDate: b.date, billNo: b.billNo })),
    );
    return allCourierItems.map((i) => {
      let severity: "overdue" | "due_today" | "due_tomorrow" | "ok" = "ok";
      if (i.eddDate! < today) severity = "overdue";
      else if (i.eddDate === today) severity = "due_today";
      else if (i.eddDate === tomorrow) severity = "due_tomorrow";
      const daysOverdue =
        severity === "overdue"
          ? Math.floor(
              (new Date(today).getTime() - new Date(i.eddDate!).getTime()) /
                86400000,
            )
          : 0;
      return { ...i, severity, daysOverdue };
    });
  }, [bills, today, tomorrow]);

  const eddOverdue = eddItems.filter((i) => i.severity === "overdue");
  const eddDueToday = eddItems.filter((i) => i.severity === "due_today");
  const eddDueTomorrow = eddItems.filter((i) => i.severity === "due_tomorrow");

  const eddOverdueCount = eddOverdue.length;
  const eddDueTodayCount = eddDueToday.length;
  useEffect(() => {
    if (eddOverdueCount > 0) {
      toast.error(
        `⚠️ ${eddOverdueCount} shipment${eddOverdueCount > 1 ? "s" : ""} past EDD! Check EDD Follow List.`,
        { duration: 6000 },
      );
    } else if (eddDueTodayCount > 0) {
      toast.warning(
        `🕐 ${eddDueTodayCount} shipment${eddDueTodayCount > 1 ? "s" : ""} due for delivery today.`,
        { duration: 4000 },
      );
    }
  }, [eddOverdueCount, eddDueTodayCount]);

  // Today's stats
  const todayBills = bills.filter((b) => isToday(b.date));
  const todaySales = todayBills.reduce((sum, b) => sum + b.total, 0);
  const todayBillsCount = todayBills.length;
  const pendingPayments = bills
    .filter(
      (b) => b.paymentStatus === "pending" || b.paymentStatus === "partial",
    )
    .reduce((sum, b) => sum + b.balanceDue, 0);

  // Today's courier stats
  const todayCourierItems = todayBills.flatMap((b) =>
    b.items.filter((i) => i.productType === "courier_awb"),
  );
  const todayCourierCount = todayCourierItems.length;
  const todayCourierRevenue = todayCourierItems.reduce(
    (sum, i) => sum + i.totalPrice,
    0,
  );

  // Today's payment history
  const todayPayments = useMemo(() => {
    try {
      const history = JSON.parse(
        localStorage.getItem("sks_payment_history") || "[]",
      ) as Array<{
        id: string;
        date: string;
        type: string;
        entityName: string;
        amount: number;
        method: string;
      }>;
      const todayStr = getTodayStr();
      const todayRecs = history.filter((r) => r.date.startsWith(todayStr));
      const payIn = todayRecs
        .filter((r) => r.type === "pay_in")
        .reduce((s, r) => s + r.amount, 0);
      const payOut = todayRecs
        .filter((r) => r.type === "pay_out")
        .reduce((s, r) => s + r.amount, 0);
      return { payIn, payOut, count: todayRecs.length };
    } catch (_) {
      return { payIn: 0, payOut: 0, count: 0 };
    }
  }, []);

  // Outstanding dues top 5
  const outstandingDues = useMemo(() => {
    const custMap = new Map<
      string,
      { id: string; name: string; phone: string; balance: number }
    >();
    for (const inv of ([] as import("../types").Invoice[]).concat(
      (() => {
        try {
          return JSON.parse(
            localStorage.getItem("sks_data_shared_invoices") || "[]",
          );
        } catch {
          return [];
        }
      })(),
    )) {
      if ((inv as any).paymentStatus === "paid") continue;
      const bal = (inv as any).total - ((inv as any).amountPaid || 0);
      if (bal <= 0) continue;
      const cust = customers.find((c) => c.id === (inv as any).customerId);
      if (!cust) continue;
      const existing = custMap.get(cust.id);
      if (existing) {
        existing.balance += bal;
      } else {
        custMap.set(cust.id, {
          id: cust.id,
          name: cust.name,
          phone: cust.phone || "",
          balance: bal,
        });
      }
    }
    return [...custMap.values()]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [customers]);

  // Low stock
  const lowStockProducts = products.filter(
    (p) =>
      p.type === "general" &&
      (p as { currentStock: number; minStockAlert: number }).currentStock <=
        (p as { currentStock: number; minStockAlert: number }).minStockAlert,
  );

  // Pending pickups for today
  const pendingPickups = pickups.filter(
    (p) =>
      p.status === "pending" &&
      (p.scheduledDate === today || p.scheduledDate >= today),
  );

  const recentBills = useMemo(
    () =>
      [...bills]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [bills],
  );

  // 7-day revenue chart
  const sevenDayData = useMemo(() => {
    const days: { date: string; label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayBills = bills.filter((b) => b.date === dateStr);
      const revenue = dayBills.reduce((sum, b) => sum + b.total, 0);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
        }),
        revenue,
      });
    }
    return days;
  }, [bills]);

  // MoM comparison
  const momData = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthSales = bills
      .filter((b) => b.date.startsWith(thisMonth))
      .reduce((sum, b) => sum + b.total, 0);
    const lastMonthSales = bills
      .filter((b) => b.date.startsWith(lastMonth))
      .reduce((sum, b) => sum + b.total, 0);
    const change =
      lastMonthSales > 0
        ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100
        : 0;
    return { thisMonthSales, lastMonthSales, change };
  }, [bills]);

  // Outstanding dues (top 5 by balance)
  const outstandingCustomers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; balance: number; customerId: string }
    >();
    for (const bill of bills) {
      if (bill.balanceDue > 0) {
        const existing = map.get(bill.customerId);
        if (existing) {
          existing.balance += bill.balanceDue;
        } else {
          const cust = customers.find((c) => c.id === bill.customerId);
          map.set(bill.customerId, {
            name: bill.customerName,
            phone: cust?.phone || "",
            balance: bill.balanceDue,
            customerId: bill.customerId,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.balance - a.balance).slice(0, 5);
  }, [bills, customers]);

  const handleConfirmPickup = () => {
    if (!confirmPickupId) return;
    const pickup = pickups.find((p) => p.id === confirmPickupId);
    if (!pickup) return;

    updatePickup({
      ...pickup,
      status: "confirmed",
      confirmedPieces: Number(confirmedPieces) || pickup.estimatedPieces,
      confirmedBoxes: Number(confirmedBoxes) || pickup.estimatedBoxes,
      confirmedAt: new Date().toISOString(),
    });

    toast.success(
      `Pickup confirmed: ${confirmedPieces} pieces, ${confirmedBoxes} boxes`,
    );
    setConfirmPickupId(null);
    setConfirmedPieces("");
    setConfirmedBoxes("");
  };

  // Design Studio stats
  const pendingDesignOrders = (designOrders || []).filter(
    (o) => o.status !== "completed" && o.status !== "delivered",
  ).length;

  const statsCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(todaySales),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      borderColor: "border-l-green-500",
    },
    {
      title: "Today's Bills",
      value: String(todayBillsCount),
      icon: Receipt,
      color: "text-blue-600",
      bg: "bg-blue-50",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Pending Payments",
      value: formatCurrency(pendingPayments),
      icon: IndianRupee,
      color: "text-amber-600",
      bg: "bg-amber-50",
      borderColor: "border-l-amber-500",
    },
    {
      title: "Low Stock Alerts",
      value: String(lowStockProducts.length),
      icon: Package,
      color: "text-red-600",
      bg: "bg-red-50",
      borderColor: "border-l-red-500",
    },
    {
      title: "Today's Courier Bookings",
      value: String(todayCourierCount),
      icon: Truck,
      color: "text-purple-600",
      bg: "bg-purple-50",
      borderColor: "border-l-purple-500",
    },
    {
      title: "Today's Courier Revenue",
      value: formatCurrency(todayCourierRevenue),
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      borderColor: "border-l-indigo-500",
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Good{" "}
            {new Date().getHours() < 12
              ? "Morning"
              : new Date().getHours() < 17
                ? "Afternoon"
                : "Evening"}
            ! 👋
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCompany?.name} •{" "}
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setPayDialogMode("pay_in")}
            className="border-green-500 text-green-700 hover:bg-green-50"
            data-ocid="dashboard.pay_in.button"
          >
            <ArrowDownLeft className="w-4 h-4 mr-1.5" />
            Pay In
          </Button>
          <Button
            variant="outline"
            onClick={() => setPayDialogMode("pay_out")}
            className="border-blue-500 text-blue-700 hover:bg-blue-50"
            data-ocid="dashboard.pay_out.button"
          >
            <ArrowDownRight className="w-4 h-4 mr-1.5" />
            Pay Out
          </Button>
          <Button
            onClick={() => onNavigate("billing/new")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            data-ocid="dashboard.primary_button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={`border-l-4 ${card.borderColor} card-hover`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {card.title}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Payments Summary Row */}
      {todayPayments.count > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Today Pay In
              </p>
              <p className="text-lg font-bold text-emerald-700">
                {formatCurrency(todayPayments.payIn)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Today Pay Out
              </p>
              <p className="text-lg font-bold text-blue-700">
                {formatCurrency(todayPayments.payOut)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">
                Transactions Today
              </p>
              <p className="text-lg font-bold text-violet-700">
                {todayPayments.count}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outstanding Dues Quick Panel */}
      {outstandingDues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-amber-600" />
              Outstanding Dues — Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outstandingDues.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-700">
                      {formatCurrency(c.balance)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => {
                        setPayDialogMode("pay_in");
                      }}
                      data-ocid="dashboard.outstanding.pay_in.button"
                    >
                      Pay In
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* EDD Follow List Panel */}
      {(eddOverdue.length > 0 ||
        eddDueToday.length > 0 ||
        eddDueTomorrow.length > 0) && (
        <Card
          className="border-2 border-amber-200 dark:border-amber-800"
          data-ocid="dashboard.panel"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                EDD Follow List
              </div>
              <div className="flex gap-2">
                {eddOverdue.length > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-300">
                    {eddOverdue.length} Overdue
                  </Badge>
                )}
                {eddDueToday.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                    {eddDueToday.length} Due Today
                  </Badge>
                )}
                {eddDueTomorrow.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    {eddDueTomorrow.length} Due Tomorrow
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {eddOverdue.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-red-50 dark:bg-red-950/30 border-y border-red-200 dark:border-red-800">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> EDD Failures —
                      Overdue
                    </p>
                  </div>
                  {eddOverdue.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2 border-b border-border/50 hover:bg-muted/30"
                      data-ocid={`edd.item.${i + 1}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold text-foreground truncate">
                          {item.awbSerial || item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.receiverName}
                          {item.receiverCity ? ` • ${item.receiverCity}` : ""}{" "}
                          {item.brandName ? `• ${item.brandName}` : ""}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-xs font-semibold text-red-600">
                          EDD: {item.eddDate}
                        </p>
                        <Badge className="text-xs bg-red-100 text-red-700 border-red-300">
                          {item.daysOverdue}d overdue
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {eddDueToday.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-y border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due Today — Action Required
                    </p>
                  </div>
                  {eddDueToday.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2 border-b border-border/50 hover:bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold text-foreground truncate">
                          {item.awbSerial || item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.receiverName}
                          {item.receiverCity ? ` • ${item.receiverCity}` : ""}{" "}
                          {item.brandName ? `• ${item.brandName}` : ""}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                          Due Today
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {eddDueTomorrow.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-yellow-50 dark:bg-yellow-950/30 border-y border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due Tomorrow — Reminder
                    </p>
                  </div>
                  {eddDueTomorrow.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2 border-b border-border/50 hover:bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold text-foreground truncate">
                          {item.awbSerial || item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.receiverName}
                          {item.receiverCity ? ` • ${item.receiverCity}` : ""}{" "}
                          {item.brandName ? `• ${item.brandName}` : ""}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                          Due Tomorrow
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Revenue Chart + MoM Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              7-Day Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={sevenDayData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                  }
                  width={48}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Revenue",
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MoM Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="w-4 h-4 text-primary" />
              Month-on-Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">
                {formatCurrency(momData.thisMonthSales)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Month</p>
              <p className="text-lg font-semibold text-muted-foreground">
                {formatCurrency(momData.lastMonthSales)}
              </p>
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-semibold ${momData.change >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {momData.change >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(momData.change).toFixed(1)}% vs last month
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Pickups */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Courier Pickups
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("pickups")}
                className="text-xs text-primary"
                data-ocid="dashboard.pickups.link"
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingPickups.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="dashboard.pickups.empty_state"
              >
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All pickups confirmed for today!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPickups.slice(0, 4).map((pickup) => (
                  <div
                    key={pickup.id}
                    className="flex items-center justify-between p-3 bg-muted/40 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {pickup.customerName ||
                            pickup.serviceLabel ||
                            pickup.courierBrand}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pickup.serviceLabel || pickup.courierBrand} •{" "}
                          {formatDate(pickup.scheduledDate)} at{" "}
                          {pickup.scheduledTime} • {pickup.estimatedPieces} pcs
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfirmPickupId(pickup.id);
                        setConfirmedPieces(String(pickup.estimatedPieces));
                        setConfirmedBoxes(String(pickup.estimatedBoxes));
                      }}
                      className="text-xs border-green-500 text-green-700 hover:bg-green-50"
                      data-ocid="dashboard.pickup.confirm_button"
                    >
                      Confirm
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Dues Widget */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-amber-600" />
                Outstanding Dues
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("reports")}
                className="text-xs text-primary"
                data-ocid="dashboard.outstanding.link"
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {outstandingCustomers.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-ocid="dashboard.outstanding.empty_state"
              >
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No outstanding dues!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {outstandingCustomers.map((cust) => (
                  <div
                    key={cust.customerId}
                    className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-semibold">{cust.name}</p>
                      {cust.phone && (
                        <p className="text-xs text-muted-foreground">
                          {cust.phone}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-destructive">
                      {formatCurrency(cust.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {pendingDesignOrders > 0 && (
        <Card className="border-l-4 border-l-violet-500 bg-violet-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-violet-600" />
                Design Studio
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("design-studio")}
                className="text-xs text-violet-700"
                data-ocid="dashboard.design.link"
              >
                View Orders <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-100 rounded-xl">
                <Palette className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-700">
                  {pendingDesignOrders}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pending design order{pendingDesignOrders !== 1 ? "s" : ""} in
                  progress
                </p>
              </div>
              <Button
                size="sm"
                className="ml-auto bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => onNavigate("design-studio")}
                data-ocid="dashboard.design.primary_button"
              >
                View Design Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Recent Bills
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("bills")}
              className="text-xs text-primary"
              data-ocid="dashboard.bills.link"
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentBills.length === 0 ? (
            <div
              className="text-center py-8 text-muted-foreground"
              data-ocid="dashboard.bills.empty_state"
            >
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bills yet</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => onNavigate("billing/new")}
              >
                Create First Bill
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {recentBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold">{bill.billNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.customerName} • {formatDate(bill.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatCurrency(bill.total)}
                    </p>
                    <Badge
                      className={`text-xs ${
                        bill.paymentStatus === "paid"
                          ? "status-paid"
                          : bill.paymentStatus === "partial"
                            ? "status-partial"
                            : "status-pending"
                      }`}
                      variant="outline"
                    >
                      {bill.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {lowStockProducts.map((product) => {
                const p = product as {
                  id: string;
                  name: string;
                  currentStock: number;
                  minStockAlert: number;
                  unit?: string;
                };
                return (
                  <div
                    key={p.id}
                    className="p-3 bg-white rounded-lg border border-amber-200"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-red-600 font-bold mt-1">
                      {p.currentStock} {p.unit || "units"} left
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Min: {p.minStockAlert}
                    </p>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-amber-400 text-amber-800 hover:bg-amber-100"
              onClick={() => onNavigate("inventory")}
              data-ocid="dashboard.inventory.button"
            >
              Manage Inventory
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "New Bill",
                icon: Plus,
                page: "billing/new",
                color: "bg-primary",
              },
              {
                label: "New Invoice",
                icon: Receipt,
                page: "bills",
                color: "bg-accent",
              },
              {
                label: "Add Stock",
                icon: Package,
                page: "inventory",
                color: "bg-green-600",
              },
              {
                label: "Add Pickup",
                icon: Truck,
                page: "pickups",
                color: "bg-purple-600",
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => onNavigate(action.page)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                  data-ocid={`dashboard.${action.label.toLowerCase().replace(" ", "_")}.button`}
                >
                  <div
                    className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={!!confirmPickupId}
        onOpenChange={(open) => !open && setConfirmPickupId(null)}
      >
        <DialogContent data-ocid="dashboard.pickup.dialog">
          <DialogHeader>
            <DialogTitle>Confirm Courier Pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Confirmed Pieces</Label>
              <Input
                type="number"
                value={confirmedPieces}
                onChange={(e) => setConfirmedPieces(e.target.value)}
                placeholder="Enter actual pieces picked"
                className="mt-1"
                data-ocid="dashboard.pickup.input"
              />
            </div>
            <div>
              <Label>Confirmed Boxes</Label>
              <Input
                type="number"
                value={confirmedBoxes}
                onChange={(e) => setConfirmedBoxes(e.target.value)}
                placeholder="Enter actual boxes picked"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPickupId(null)}
              data-ocid="dashboard.pickup.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPickup}
              className="bg-green-600 hover:bg-green-700"
              data-ocid="dashboard.pickup.submit_button"
            >
              Confirm Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay In / Pay Out Dialog */}
      {payDialogMode && (
        <PaymentDialog
          open={true}
          mode={payDialogMode}
          onClose={() => setPayDialogMode(null)}
        />
      )}
    </div>
  );
}

// ── PaymentDialog Component ────────────────────────────────────────────────────
type MatchedInvoice = {
  id: string;
  invoiceNo: string;
  balanceDue: number;
  payFull: boolean;
  payAmount: number;
};

function PaymentDialog({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: "pay_in" | "pay_out";
  onClose: () => void;
}) {
  const title =
    mode === "pay_in" ? "Pay In (Sales Invoice)" : "Pay Out (Purchase Bill)";
  const { updateInvoice, updateBill, updatePurchaseInvoice, updateCustomer } =
    useAppStore();
  const [entityId, setEntityId] = useState("");
  const [entitySearch, setEntitySearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load entities
  const entities = useMemo(() => {
    if (mode === "pay_in") {
      return getCustomers(SHARED_DATA_ID).filter((c) => c.isActive);
    }
    return getVendors(SHARED_DATA_ID).filter((v) => v.isActive);
  }, [mode]);

  const filteredEntities = useMemo(() => {
    if (!entitySearch) return entities;
    const q = entitySearch.toLowerCase();
    return entities.filter(
      (e) => e.name.toLowerCase().includes(q) || e.phone?.includes(q),
    );
  }, [entities, entitySearch]);

  // Load unpaid invoices for selected entity
  const unpaidInvoices = useMemo(() => {
    if (!entityId) return [];
    if (mode === "pay_in") {
      const invoices = getInvoices(SHARED_DATA_ID);
      return invoices
        .filter(
          (inv) =>
            inv.customerId === entityId &&
            (inv.paymentStatus === "pending" ||
              inv.paymentStatus === "partial"),
        )
        .map((inv) => ({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          total: inv.total,
          amountPaid: inv.amountPaid || 0,
          balanceDue: inv.total - (inv.amountPaid || 0),
          date: inv.date,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
    }
    const purInvoices = getPurchaseInvoices(SHARED_DATA_ID);
    return purInvoices
      .filter(
        (pi) =>
          pi.vendorId === entityId &&
          (pi.paymentStatus === "pending" || pi.paymentStatus === "partial"),
      )
      .map((pi) => ({
        id: pi.id,
        invoiceNo: pi.invoiceNo,
        total: pi.total,
        amountPaid: pi.amountPaid || 0,
        balanceDue: pi.total - (pi.amountPaid || 0),
        date: pi.date,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entityId, mode]);

  // Compute matched invoices
  const matchResult = useMemo(() => {
    const amt = Number.parseFloat(amount) || 0;
    if (amt <= 0 || unpaidInvoices.length === 0)
      return { matched: [], advance: 0 };
    let remaining = amt;
    const matched: MatchedInvoice[] = [];
    for (const inv of unpaidInvoices) {
      if (remaining <= 0) break;
      if (remaining >= inv.balanceDue) {
        matched.push({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          balanceDue: inv.balanceDue,
          payFull: true,
          payAmount: inv.balanceDue,
        });
        remaining -= inv.balanceDue;
      } else {
        matched.push({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          balanceDue: inv.balanceDue,
          payFull: false,
          payAmount: remaining,
        });
        remaining = 0;
      }
    }
    const advance = remaining > 0 ? remaining : 0;
    return { matched, advance };
  }, [amount, unpaidInvoices]);

  const handleConfirm = () => {
    const amt = Number.parseFloat(amount) || 0;
    if (!entityId || amt <= 0) {
      toast.error("Please select a customer/vendor and enter amount");
      return;
    }
    if (matchResult.matched.length === 0) {
      toast.error("No unpaid invoices found to apply payment");
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === "pay_in") {
        // Update sales invoices
        const invoices = getInvoices(SHARED_DATA_ID);
        const updatedInvoices = invoices.map((inv) => {
          const m = matchResult.matched.find((x) => x.id === inv.id);
          if (!m) return inv;
          const newAmountPaid = (inv.amountPaid || 0) + m.payAmount;
          return {
            ...inv,
            amountPaid: newAmountPaid,
            paymentStatus: m.payFull
              ? "paid"
              : ("partial" as Invoice["paymentStatus"]),
            paymentMethod,
          };
        });
        setInvoices(SHARED_DATA_ID, updatedInvoices);
        // Sync to Zustand store
        for (const inv of updatedInvoices) {
          const m = matchResult.matched.find((x) => x.id === inv.id);
          if (m) updateInvoice(inv);
        }

        // Update related bills
        const matchedIds = matchResult.matched.map((m) => m.id);
        const invoicesForBills = updatedInvoices.filter((inv) =>
          matchedIds.includes(inv.id),
        );
        const bills = getBills(SHARED_DATA_ID);
        const allBillIds = invoicesForBills.flatMap((inv) => inv.billIds || []);
        const updatedBills = bills.map((bill) => {
          if (!allBillIds.includes(bill.id)) return bill;
          const relatedInv = invoicesForBills.find((inv) =>
            (inv.billIds || []).includes(bill.id),
          );
          if (!relatedInv) return bill;
          return {
            ...bill,
            paymentStatus: relatedInv.paymentStatus as Bill["paymentStatus"],
            amountPaid: relatedInv.amountPaid || 0,
            balanceDue: Math.max(0, bill.total - (relatedInv.amountPaid || 0)),
            paymentMethod: paymentMethod as Bill["paymentMethod"],
          };
        });
        setBills(SHARED_DATA_ID, updatedBills);
        // Sync to Zustand store
        for (const bill of updatedBills) {
          if (allBillIds.includes(bill.id)) updateBill(bill);
        }

        // Store advance if any
        if (matchResult.advance > 0) {
          const custs = getCustomers(SHARED_DATA_ID);
          const updatedCusts = custs.map((c) => {
            if (c.id !== entityId) return c;
            return {
              ...c,
              advanceBalance:
                ((c as any).advanceBalance || 0) + matchResult.advance,
            };
          });
          setCustomers(SHARED_DATA_ID, updatedCusts);
          const updCust = updatedCusts.find((c) => c.id === entityId);
          if (updCust) updateCustomer(updCust);
          toast.success(
            `Payment of ₹${amt.toFixed(2)} applied to ${matchResult.matched.length} invoice(s). ₹${matchResult.advance.toFixed(2)} stored as advance.`,
          );
        } else {
          toast.success(
            `Payment of ₹${amt.toFixed(2)} applied to ${matchResult.matched.length} invoice(s)`,
          );
        }
      } else {
        // Update purchase invoices
        const purInvoices = getPurchaseInvoices(SHARED_DATA_ID);
        const updatedPurInvoices = purInvoices.map((pi) => {
          const m = matchResult.matched.find((x) => x.id === pi.id);
          if (!m) return pi;
          const newAmountPaid = (pi.amountPaid || 0) + m.payAmount;
          return {
            ...pi,
            amountPaid: newAmountPaid,
            paymentStatus: m.payFull
              ? "paid"
              : ("partial" as PurchaseInvoice["paymentStatus"]),
          };
        });
        setPurchaseInvoices(SHARED_DATA_ID, updatedPurInvoices);
        // Sync to Zustand store
        for (const pi of updatedPurInvoices) {
          const m = matchResult.matched.find((x) => x.id === pi.id);
          if (m) updatePurchaseInvoice(pi);
        }
        toast.success(
          `Payment of ₹${amt.toFixed(2)} applied to ${matchResult.matched.length} purchase invoice(s)`,
        );
      }

      // Save payment history record
      const payRecord = {
        id: `pay_${Date.now()}`,
        date: new Date().toISOString(),
        type: mode,
        entityId,
        entityName: entitySearch,
        amount: amt,
        method: paymentMethod,
        matchedInvoices: matchResult.matched.map((m) => m.invoiceNo),
        advance: matchResult.advance,
      };
      try {
        const existing = JSON.parse(
          localStorage.getItem("sks_payment_history") || "[]",
        );
        existing.push(payRecord);
        localStorage.setItem("sks_payment_history", JSON.stringify(existing));
      } catch (_) {}

      onClose();
    } catch (_e) {
      toast.error("Failed to apply payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEntity = entities.find((e) => e.id === entityId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] flex flex-col"
        data-ocid="dashboard.payment.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "pay_in" ? (
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-blue-600" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-4 py-2">
            {/* Entity Search */}
            <div>
              <Label className="text-sm font-medium">
                {mode === "pay_in" ? "Customer Name" : "Vendor Name"}
              </Label>
              <Input
                placeholder={`Search ${mode === "pay_in" ? "customer" : "vendor"}...`}
                value={entitySearch}
                onChange={(e) => {
                  setEntitySearch(e.target.value);
                  setEntityId("");
                }}
                className="mt-1"
                data-ocid="dashboard.payment.entity.input"
              />
              {entitySearch && !entityId && filteredEntities.length > 0 && (
                <div className="border rounded-md mt-1 bg-background shadow-sm max-h-36 overflow-y-auto">
                  {filteredEntities.map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setEntityId(e.id);
                        setEntitySearch(e.name);
                      }}
                    >
                      <span className="font-medium">{e.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {e.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {entitySearch && !entityId && filteredEntities.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No results found
                </p>
              )}
              {selectedEntity && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Selected: {selectedEntity.name}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger
                  className="mt-1"
                  data-ocid="dashboard.payment.method.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Cash", "UPI", "NEFT", "RTGS", "Cheque", "Card"].map(
                    (m) => (
                      <SelectItem key={m} value={m.toLowerCase()}>
                        {m}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-sm font-medium">Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter payment amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                data-ocid="dashboard.payment.amount.input"
              />
            </div>

            {/* Unpaid Invoice List */}
            {entityId && unpaidInvoices.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Unpaid Invoices ({unpaidInvoices.length})
                </Label>
                <div className="mt-1 border rounded-md overflow-hidden">
                  {unpaidInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex justify-between items-center px-3 py-2 text-sm border-b last:border-b-0 bg-muted/20"
                    >
                      <span className="font-mono font-medium text-xs">
                        {inv.invoiceNo}
                      </span>
                      <span className="text-amber-700 font-semibold text-xs">
                        ₹{inv.balanceDue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {entityId && unpaidInvoices.length === 0 && (
              <p
                className="text-sm text-green-600 text-center py-2"
                data-ocid="dashboard.payment.empty_state"
              >
                ✓ No unpaid invoices for this{" "}
                {mode === "pay_in" ? "customer" : "vendor"}
              </p>
            )}

            {/* Matched Invoices Preview */}
            {matchResult.matched.length > 0 && (
              <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50">
                <p className="text-xs font-semibold text-green-700 mb-2">
                  Payment Allocation Preview
                </p>
                {matchResult.matched.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center text-xs py-1"
                  >
                    <span className="font-mono text-green-800">
                      {m.invoiceNo}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-700">
                        ₹{m.payAmount.toFixed(2)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${m.payFull ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800"}`}
                      >
                        {m.payFull ? "FULL" : "PARTIAL"}
                      </span>
                    </div>
                  </div>
                ))}
                {matchResult.advance > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-300 text-xs text-blue-700 font-medium">
                    ₹{matchResult.advance.toFixed(2)} will be stored as advance
                    credit
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="dashboard.payment.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isSubmitting ||
              !entityId ||
              !amount ||
              matchResult.matched.length === 0
            }
            className={
              mode === "pay_in"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }
            data-ocid="dashboard.payment.confirm_button"
          >
            {isSubmitting ? "Applying..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
