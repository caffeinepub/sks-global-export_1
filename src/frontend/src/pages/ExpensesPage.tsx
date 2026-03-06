import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FileSpreadsheet, Pencil, Plus, Trash2, Wallet } from "lucide-react";
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
import type { Expense } from "../types";
import {
  exportToExcel,
  formatCurrency,
  formatDate,
  generateId,
} from "../utils/helpers";

const EXPENSE_CATEGORIES: Expense["category"][] = [
  "Rent",
  "Salary",
  "Utilities",
  "Stationery",
  "Transport",
  "Courier",
  "Maintenance",
  "Misc",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "bg-red-100 text-red-700",
  Salary: "bg-blue-100 text-blue-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  Stationery: "bg-green-100 text-green-700",
  Transport: "bg-indigo-100 text-indigo-700",
  Courier: "bg-purple-100 text-purple-700",
  Maintenance: "bg-orange-100 text-orange-700",
  Misc: "bg-gray-100 text-gray-700",
};

export function ExpensesPage() {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    activeCompanyId,
  } = useAppStore();

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(now.toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState<Expense["category"]>("Rent");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const openAdd = () => {
    setEditingExpense(null);
    setFormDate(now.toISOString().split("T")[0]);
    setFormCategory("Rent");
    setFormDescription("");
    setFormAmount("");
    setFormNotes("");
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormDate(expense.date);
    setFormCategory(expense.category);
    setFormDescription(expense.description);
    setFormAmount(String(expense.amount));
    setFormNotes(expense.notes || "");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formDescription) {
      toast.error("Description is required");
      return;
    }
    const amount = Number.parseFloat(formAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const expense: Expense = {
      id: editingExpense?.id || generateId(),
      companyId: activeCompanyId,
      date: formDate,
      category: formCategory,
      description: formDescription,
      amount,
      notes: formNotes || undefined,
    };

    if (editingExpense) {
      updateExpense(expense);
      toast.success("Expense updated");
    } else {
      addExpense(expense);
      toast.success("Expense added");
    }
    setShowForm(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteExpense(deleteId);
    toast.success("Expense deleted");
    setDeleteId(null);
  };

  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .filter((e) => {
        const monthMatch = e.date.startsWith(`${filterYear}-${filterMonth}`);
        const catMatch =
          filterCategory === "all" || e.category === filterCategory;
        return monthMatch && catMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterMonth, filterYear, filterCategory]);

  // Summary
  const thisMonthTotal = useMemo(() => {
    const ym = `${filterYear}-${filterMonth}`;
    return expenses
      .filter((e) => e.date.startsWith(ym))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, filterMonth, filterYear]);

  const thisYearTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(filterYear))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, filterYear]);

  const topCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const e of expenses.filter((e) =>
      e.date.startsWith(`${filterYear}-${filterMonth}`),
    )) {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    }
    const entries = Object.entries(catMap);
    if (entries.length === 0) return "N/A";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [expenses, filterMonth, filterYear]);

  // Monthly bar chart for current year
  const monthlyChartData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months.map((label, i) => {
      const mStr = String(i + 1).padStart(2, "0");
      const total = expenses
        .filter((e) => e.date.startsWith(`${filterYear}-${mStr}`))
        .reduce((s, e) => s + e.amount, 0);
      return { month: label, total };
    });
  }, [expenses, filterYear]);

  const years = useMemo(() => {
    const set = new Set(expenses.map((e) => e.date.slice(0, 4)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }, [expenses]);

  const handleExport = () => {
    exportToExcel(
      [
        {
          name: "Expenses",
          data: filteredExpenses.map((e) => ({
            Date: formatDate(e.date),
            Category: e.category,
            Description: e.description,
            Amount: e.amount,
            Notes: e.notes || "",
          })),
        },
      ],
      `expenses_${filterYear}_${filterMonth}.csv`,
    );
  };

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Expenses
          </h2>
          <p className="text-sm text-muted-foreground">
            Track business expenses and costs
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button size="sm" onClick={openAdd} data-ocid="expenses.add.button">
            <Plus className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              This Month
            </p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(thisMonthTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              This Year ({filterYear})
            </p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(thisYearTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Top Category
            </p>
            <p className="text-2xl font-bold mt-1">{topCategory}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Monthly Expenses — {filterYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={monthlyChartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
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
                  "Expenses",
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger
            className="text-xs w-36"
            data-ocid="expenses.month.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger
            className="text-xs w-28"
            data-ocid="expenses.year.select"
          >
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
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger
            className="text-xs w-40"
            data-ocid="expenses.category.select"
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {filteredExpenses.length} entries ·{" "}
          {formatCurrency(filteredExpenses.reduce((s, e) => s + e.amount, 0))}{" "}
          total
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="expenses.table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="expenses.empty_state"
                  >
                    No expenses found for this period
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense, idx) => (
                  <TableRow
                    key={expense.id}
                    className="hover:bg-muted/20"
                    data-ocid={`expenses.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${CATEGORY_COLORS[expense.category] || ""}`}
                      >
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      <p className="truncate">{expense.description}</p>
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-destructive">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px]">
                      <p className="truncate">{expense.notes || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(expense)}
                          data-ocid={`expenses.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(expense.id)}
                          data-ocid={`expenses.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" data-ocid="expenses.form.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  data-ocid="expenses.form.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select
                  value={formCategory}
                  onValueChange={(v) =>
                    setFormCategory(v as Expense["category"])
                  }
                >
                  <SelectTrigger data-ocid="expenses.form.category.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Office rent for March"
                data-ocid="expenses.form.description.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                data-ocid="expenses.form.amount.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                data-ocid="expenses.form.notes.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              data-ocid="expenses.form.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="expenses.form.save_button">
              {editingExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="expenses.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="expenses.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="expenses.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
