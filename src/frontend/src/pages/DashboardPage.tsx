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
import {
  AlertTriangle,
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
import { useMemo, useState } from "react";
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
import {
  formatCurrency,
  formatDate,
  getTodayStr,
  isToday,
} from "../utils/helpers";

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

  const today = getTodayStr();

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
        <div className="flex gap-2">
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
                          {pickup.courierBrand}
                        </p>
                        <p className="text-xs text-muted-foreground">
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

      {/* Design Studio Widget */}
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

      {/* Recent Bills */}
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

      {/* Low Stock Alert */}
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

      {/* Quick Actions */}
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

      {/* Confirm Pickup Dialog */}
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
    </div>
  );
}
