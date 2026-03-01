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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Edit,
  Eye,
  FileText,
  KeyRound,
  Package,
  Pencil,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  AnyProduct,
  AppUser,
  Bill,
  Company,
  Customer,
  Invoice,
} from "../types";
import {
  formatCurrency,
  formatDate,
  generateId,
  hashPassword,
} from "../utils/helpers";

// ─────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────

interface OverviewTabProps {
  onTabChange: (tab: string) => void;
}

function OverviewTab({ onTabChange }: OverviewTabProps) {
  const { bills, invoices, products, customers, vendors, users, companies } =
    useAppStore();

  const stats = [
    {
      label: "Total Bills",
      value: bills.length,
      icon: Receipt,
      color: "text-blue-600",
      bg: "bg-blue-50",
      tab: "bills",
    },
    {
      label: "Total Invoices",
      value: invoices.length,
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-50",
      tab: "invoices",
    },
    {
      label: "Products",
      value: products.length,
      icon: Package,
      color: "text-green-600",
      bg: "bg-green-50",
      tab: "products",
    },
    {
      label: "Customers",
      value: customers.length,
      icon: User,
      color: "text-amber-600",
      bg: "bg-amber-50",
      tab: "customers",
    },
    {
      label: "Vendors",
      value: vendors.length,
      icon: TrendingUp,
      color: "text-rose-600",
      bg: "bg-rose-50",
      tab: "overview",
    },
    {
      label: "Users",
      value: users.length,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      tab: "users",
    },
    {
      label: "Companies",
      value: companies.length,
      icon: Building2,
      color: "text-teal-600",
      bg: "bg-teal-50",
      tab: "companies",
    },
  ];

  const totalRevenue = bills.reduce((s, b) => s + b.total, 0);
  const paidBills = bills.filter((b) => b.paymentStatus === "paid").length;
  const pendingBills = bills.filter(
    (b) => b.paymentStatus === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => s.tab !== "overview" && onTabChange(s.tab)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From {bills.length} bills
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Paid Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{paidBills}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.length > 0
                ? `${Math.round((paidBills / bills.length) * 100)}% collection rate`
                : "No bills yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Pending Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{pendingBills}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Bills Tab (Admin)
// ─────────────────────────────────────────────

function AdminBillsTab() {
  const { bills, updateBill, deleteBill } = useAppStore();

  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [viewBill, setViewBill] = useState<Bill | null>(null);

  // Edit form
  const [editPaymentStatus, setEditPaymentStatus] =
    useState<Bill["paymentStatus"]>("paid");
  const [editPaymentMethod, setEditPaymentMethod] =
    useState<Bill["paymentMethod"]>("cash");
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editBalanceDue, setEditBalanceDue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const sortedBills = useMemo(
    () =>
      [...bills].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [bills],
  );

  const openEdit = (bill: Bill) => {
    setEditBill(bill);
    setEditPaymentStatus(bill.paymentStatus);
    setEditPaymentMethod(bill.paymentMethod);
    setEditAmountPaid(String(bill.amountPaid));
    setEditBalanceDue(String(bill.balanceDue));
    setEditNotes(bill.notes || "");
  };

  const handleSave = () => {
    if (!editBill) return;
    updateBill({
      ...editBill,
      paymentStatus: editPaymentStatus,
      paymentMethod: editPaymentMethod,
      amountPaid: Number.parseFloat(editAmountPaid) || 0,
      balanceDue: Number.parseFloat(editBalanceDue) || 0,
      notes: editNotes,
    });
    toast.success(`Bill ${editBill.billNo} updated`);
    setEditBill(null);
  };

  const handleDelete = () => {
    if (!deleteBillId) return;
    const bill = bills.find((b) => b.id === deleteBillId);
    deleteBill(deleteBillId);
    toast.success(`Bill ${bill?.billNo || ""} deleted`);
    setDeleteBillId(null);
  };

  const getStatusBadge = (status: string) => {
    const cls =
      status === "paid"
        ? "status-paid"
        : status === "partial"
          ? "status-partial"
          : "status-pending";
    return (
      <Badge variant="outline" className={`text-xs ${cls}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sortedBills.length} bills total
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Bill No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Items</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBills.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No bills found
                  </TableCell>
                </TableRow>
              ) : (
                sortedBills.map((bill) => (
                  <TableRow key={bill.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono font-semibold">
                      {bill.billNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(bill.date)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {bill.customerName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bill.items.length} items
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {formatCurrency(bill.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {bill.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(bill.paymentStatus)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View"
                          onClick={() => setViewBill(bill)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEdit(bill)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteBillId(bill.id)}
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

      {/* View Dialog */}
      <Dialog
        open={!!viewBill}
        onOpenChange={(open) => !open && setViewBill(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill — {viewBill?.billNo}</DialogTitle>
          </DialogHeader>
          {viewBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Customer</p>
                  <p className="font-semibold">{viewBill.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-semibold">{formatDate(viewBill.date)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewBill.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between text-sm font-bold bg-muted/30 p-3 rounded-lg">
                <span>Total</span>
                <span>{formatCurrency(viewBill.total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewBill(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editBill}
        onOpenChange={(open) => !open && setEditBill(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bill — {editBill?.billNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Status</Label>
              <Select
                value={editPaymentStatus}
                onValueChange={(v) =>
                  setEditPaymentStatus(v as Bill["paymentStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select
                value={editPaymentMethod}
                onValueChange={(v) =>
                  setEditPaymentMethod(v as Bill["paymentMethod"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount Paid (₹)</Label>
                <Input
                  type="number"
                  value={editAmountPaid}
                  onChange={(e) => setEditAmountPaid(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Balance Due (₹)</Label>
                <Input
                  type="number"
                  value={editBalanceDue}
                  onChange={(e) => setEditBalanceDue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBill(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteBillId}
        onOpenChange={(open) => !open && setDeleteBillId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bill{" "}
              <strong>
                {bills.find((b) => b.id === deleteBillId)?.billNo}
              </strong>
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Invoices Tab (Admin)
// ─────────────────────────────────────────────

function AdminInvoicesTab() {
  const { invoices, updateInvoice, deleteInvoice } = useAppStore();

  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Edit form
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [invoices],
  );

  const openEdit = (inv: Invoice) => {
    setEditInvoice(inv);
    setEditPaymentStatus(inv.paymentStatus);
    setEditPaymentMethod(inv.paymentMethod);
    setEditNotes(inv.notes || "");
  };

  const handleSave = () => {
    if (!editInvoice) return;
    updateInvoice({
      ...editInvoice,
      paymentStatus: editPaymentStatus,
      paymentMethod: editPaymentMethod,
      notes: editNotes,
    });
    toast.success("Invoice updated");
    setEditInvoice(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteInvoice(deleteTarget.id);
    toast.success(`Invoice ${deleteTarget.invoiceNo} deleted`);
    setDeleteTarget(null);
  };

  const getTypeBadge = (type: string) => (
    <Badge
      variant="outline"
      className={
        type === "gst"
          ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
          : "bg-purple-50 text-purple-700 border-purple-200 text-xs"
      }
    >
      {type === "gst" ? "GST" : "Non-GST"}
    </Badge>
  );

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
      <p className="text-sm text-muted-foreground">
        {sortedInvoices.length} invoices total
      </p>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                sortedInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono font-semibold">
                      {inv.invoiceNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {inv.customerName}
                    </TableCell>
                    <TableCell>{getTypeBadge(inv.invoiceType)}</TableCell>
                    <TableCell className="text-xs font-bold">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.paymentStatus)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View"
                          onClick={() => setViewInvoice(inv)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEdit(inv)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteTarget(inv)}
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

      {/* View Dialog */}
      <Dialog
        open={!!viewInvoice}
        onOpenChange={(open) => !open && setViewInvoice(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice — {viewInvoice?.invoiceNo}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold">{viewInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">
                    {formatDate(viewInvoice.date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  {getTypeBadge(viewInvoice.invoiceType)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(viewInvoice.paymentStatus)}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewInvoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {viewInvoice.invoiceType === "gst" && (
                <div className="text-sm space-y-1 bg-muted/30 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST</span>
                    <span>{formatCurrency(viewInvoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST</span>
                    <span>{formatCurrency(viewInvoice.sgst)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-border">
                    <span>Total</span>
                    <span>{formatCurrency(viewInvoice.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewInvoice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editInvoice}
        onOpenChange={(open) => !open && setEditInvoice(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice — {editInvoice?.invoiceNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select
                value={editPaymentStatus}
                onValueChange={setEditPaymentStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select
                value={editPaymentMethod}
                onValueChange={setEditPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              <strong>{deleteTarget?.invoiceNo}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Products Tab (Admin)
// ─────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  general: "General",
  courier_awb: "Courier AWB",
  xerox: "Xerox/Print",
  service: "Service",
};

function AdminProductsTab() {
  const { products, updateProduct, deleteProduct } = useAppStore();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<AnyProduct | null>(null);

  // Simple edit — only name, category, selling price, stock for general products
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

  const openEdit = (product: AnyProduct) => {
    setEditProduct(product);
    setEditName(
      product.type === "general"
        ? product.name
        : "name" in product
          ? ((product as { name?: string }).name ?? "")
          : "",
    );
    setEditCategory(product.type === "general" ? product.category : "");
    setEditPrice(
      product.type === "general"
        ? String(product.sellingPrice)
        : product.type === "service"
          ? String(product.price)
          : product.type === "courier_awb"
            ? String(product.sellingPrice)
            : product.type === "xerox"
              ? String(product.pricePerPage)
              : "",
    );
    setEditStock(
      product.type === "general" ? String(product.currentStock) : "",
    );
  };

  const handleSave = () => {
    if (!editProduct) return;
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }

    let updated: AnyProduct;
    if (editProduct.type === "general") {
      updated = {
        ...editProduct,
        name: editName,
        category: editCategory,
        sellingPrice: Number.parseFloat(editPrice) || 0,
        currentStock: Number.parseFloat(editStock) || 0,
      };
    } else if (editProduct.type === "service") {
      updated = {
        ...editProduct,
        name: editName,
        price: Number.parseFloat(editPrice) || 0,
      };
    } else if (editProduct.type === "courier_awb") {
      updated = {
        ...editProduct,
        brandName: editName,
        sellingPrice: Number.parseFloat(editPrice) || 0,
      };
    } else {
      updated = {
        ...editProduct,
        name: editName,
        pricePerPage: Number.parseFloat(editPrice) || 0,
      };
    }

    updateProduct(updated);
    toast.success("Product updated");
    setEditProduct(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteProduct(deleteId);
    toast.success("Product deleted");
    setDeleteId(null);
  };

  const getProductName = (p: AnyProduct): string => {
    if (p.type === "courier_awb") return p.brandName;
    return (p as { name: string }).name;
  };

  const getProductCategory = (p: AnyProduct): string => {
    if (p.type === "general") return p.category;
    if (p.type === "courier_awb") return p.productType;
    return "—";
  };

  const getProductPrice = (p: AnyProduct): number => {
    if (p.type === "general") return p.sellingPrice;
    if (p.type === "courier_awb") return p.sellingPrice;
    if (p.type === "service") return p.price;
    if (p.type === "xerox") return p.pricePerPage;
    return 0;
  };

  const getProductStock = (p: AnyProduct): string => {
    if (p.type === "general") return String(p.currentStock);
    if (p.type === "courier_awb") return "—";
    return "—";
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {products.length} products total
      </p>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Price</TableHead>
                <TableHead className="text-xs">Stock</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {getProductName(product)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {PRODUCT_TYPE_LABELS[product.type] || product.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getProductCategory(product)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {formatCurrency(getProductPrice(product))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getProductStock(product)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEdit(product)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteId(product.id)}
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

      {/* Edit Dialog */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {editProduct?.type === "courier_awb" ? "Brand Name" : "Name"}*
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            {editProduct?.type === "general" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">
                {editProduct?.type === "xerox"
                  ? "Price Per Page (₹)"
                  : "Selling Price (₹)"}
              </Label>
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            {editProduct?.type === "general" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Current Stock</Label>
                <Input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customers Tab (Admin)
// ─────────────────────────────────────────────

function AdminCustomersTab() {
  const {
    customers,
    bills,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    activeCompanyId,
  } = useAppStore();

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [customerType, setCustomerType] = useState<"registered" | "walking">(
    "registered",
  );

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setCustomerType("registered");
    setEditCustomer(null);
  };

  const openEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email || "");
    setAddress(customer.address || "");
    setGstin(customer.gstin || "");
    setCustomerType(customer.customerType);
    setShowAdd(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const customer: Customer = {
      id: editCustomer?.id || generateId(),
      companyId: activeCompanyId,
      name,
      phone,
      email,
      address,
      gstin,
      customerType,
      totalPurchases: editCustomer?.totalPurchases || 0,
      isActive: true,
    };
    if (editCustomer) {
      updateCustomer(customer);
      toast.success("Customer updated");
    } else {
      addCustomer(customer);
      toast.success("Customer added");
    }
    setShowAdd(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteCustomer(deleteId);
    toast.success("Customer deleted");
    setDeleteId(null);
  };

  const getCustomerBillCount = (customerId: string) =>
    bills.filter((b) => b.customerId === customerId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {customers.length} customers total
        </p>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">City</TableHead>
                <TableHead className="text-xs">Bills</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-xs">{c.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.customerType === "registered"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs capitalize"
                      >
                        {c.customerType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.address?.split(",").pop()?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getCustomerBillCount(c.id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEdit(c)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteId(c.id)}
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
      <Dialog
        open={showAdd}
        onOpenChange={(open) => {
          if (!open) {
            setShowAdd(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit" : "Add"} Customer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Name*</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GSTIN</Label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={customerType}
                onValueChange={(v) =>
                  setCustomerType(v as "registered" | "walking")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editCustomer ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Users Tab (Admin)
// ─────────────────────────────────────────────

function AdminUsersTab() {
  const { users, currentUser, addUser, updateUser, deleteUser, companies } =
    useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [changePwdUser, setChangePwdUser] = useState<AppUser | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppUser["role"]>("operator");

  // Change password state
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setRole("operator");
    setEditingUser(null);
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPassword("");
    setRole(user.role);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name || !username) {
      toast.error("Name and username are required");
      return;
    }
    if (!editingUser && !password) {
      toast.error("Password is required for new users");
      return;
    }

    const user: AppUser = {
      id: editingUser?.id || generateId(),
      name,
      username,
      passwordHash: password
        ? hashPassword(password)
        : editingUser?.passwordHash || "",
      role,
      companyIds: editingUser?.companyIds || companies.map((c) => c.id),
    };

    if (editingUser) {
      updateUser(user);
      toast.success("User updated");
    } else {
      addUser(user);
      toast.success("User added");
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteUser(deleteId);
    toast.success("User deleted");
    setDeleteId(null);
  };

  const handleChangePassword = () => {
    if (!changePwdUser) return;
    if (!newPwd || !confirmPwd) {
      toast.error("All fields are required");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    updateUser({ ...changePwdUser, passwordHash: hashPassword(newPwd) });
    toast.success(`Password changed for ${changePwdUser.name}`);
    setChangePwdUser(null);
    setNewPwd("");
    setConfirmPwd("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} users total
        </p>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Username</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Companies</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/20">
                <TableCell className="text-xs font-semibold">
                  {user.name}
                  {user.id === currentUser?.id && (
                    <Badge className="ml-2 text-xs bg-primary/10 text-primary">
                      You
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {user.username}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      user.role === "admin"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : user.role === "manager"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.companyIds.length} companies
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit"
                      onClick={() => openEdit(user)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    {user.id !== currentUser?.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-600 hover:text-amber-700"
                          title="Change Password"
                          onClick={() => {
                            setChangePwdUser(user);
                            setNewPwd("");
                            setConfirmPwd("");
                          }}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteId(user.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit" : "Add"} User</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name*</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username*</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Password{editingUser ? " (leave blank to keep)" : "*"}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as AppUser["role"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingUser ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={!!changePwdUser}
        onOpenChange={(open) => !open && setChangePwdUser(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password — {changePwdUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePwdUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Companies Tab (Admin)
// ─────────────────────────────────────────────

function AdminCompaniesTab() {
  const {
    companies,
    activeCompany,
    addCompany,
    updateCompany,
    deleteCompany,
    switchCompany,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [compName, setCompName] = useState("");
  const [compAddress, setCompAddress] = useState("");
  const [compGstin, setCompGstin] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compEmail, setCompEmail] = useState("");
  const [compState, setCompState] = useState("");
  const [compPincode, setCompPincode] = useState("");

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setCompName(company.name);
    setCompAddress(company.address);
    setCompGstin(company.gstin);
    setCompPhone(company.phone);
    setCompEmail(company.email);
    setCompState(company.state);
    setCompPincode(company.pincode);
    setShowForm(true);
  };

  const openAdd = () => {
    setEditingCompany(null);
    setCompName("");
    setCompAddress("");
    setCompGstin("");
    setCompPhone("");
    setCompEmail("");
    setCompState("");
    setCompPincode("");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!compName.trim()) {
      toast.error("Company name is required");
      return;
    }
    const company: Company = {
      id: editingCompany?.id || generateId(),
      name: compName,
      address: compAddress,
      gstin: compGstin,
      phone: compPhone,
      email: compEmail,
      state: compState,
      pincode: compPincode,
      invoicePrefix: editingCompany?.invoicePrefix || "GST/",
      invoiceSeq: editingCompany?.invoiceSeq || 1,
      nonGstInvoicePrefix: editingCompany?.nonGstInvoicePrefix || "INV/",
      nonGstInvoiceSeq: editingCompany?.nonGstInvoiceSeq || 1,
      billPrefix: editingCompany?.billPrefix || "BILL/",
      billSeq: editingCompany?.billSeq || 1,
    };
    if (editingCompany) {
      updateCompany(company);
      toast.success("Company updated");
    } else {
      addCompany(company);
      toast.success("Company added");
    }
    setShowForm(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteCompany(deleteId);
    toast.success("Company deleted");
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {companies.length} companies total
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Company
        </Button>
      </div>

      <div className="space-y-3">
        {companies.map((company) => (
          <div
            key={company.id}
            className={`bg-white rounded-xl border p-4 shadow-xs transition-all ${
              company.id === activeCompany?.id
                ? "border-primary ring-1 ring-primary/20"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">{company.name}</h4>
                  {company.id === activeCompany?.id && (
                    <Badge className="text-xs bg-primary/10 text-primary">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <p>
                    GSTIN:{" "}
                    <span className="font-mono text-foreground">
                      {company.gstin || "N/A"}
                    </span>
                  </p>
                  <p>Phone: {company.phone}</p>
                  <p>State: {company.state}</p>
                  <p>Pincode: {company.pincode}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {company.address}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {company.id !== activeCompany?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => switchCompany(company.id)}
                    className="text-xs"
                  >
                    Switch
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(company)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                {company.id !== activeCompany?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(company.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit" : "Add"} Company</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Company Name*</Label>
              <Input
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Textarea
                value={compAddress}
                onChange={(e) => setCompAddress(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GSTIN</Label>
              <Input
                value={compGstin}
                onChange={(e) => setCompGstin(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input
                value={compState}
                onChange={(e) => setCompState(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pincode</Label>
              <Input
                value={compPincode}
                onChange={(e) => setCompPincode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCompany ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the company. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main AdminPage
// ─────────────────────────────────────────────

export function AdminPage() {
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-12 text-center">
        <div className="p-4 rounded-full bg-destructive/10">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">
            Full system management and CRUD operations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="bills" className="text-xs">
            Bills
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs">
            Products
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs">
            Customers
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs">
            Users
          </TabsTrigger>
          <TabsTrigger value="companies" className="text-xs">
            Companies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab onTabChange={setActiveTab} />
        </TabsContent>
        <TabsContent value="bills" className="mt-4">
          <AdminBillsTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <AdminInvoicesTab />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <AdminProductsTab />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <AdminCustomersTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <AdminUsersTab />
        </TabsContent>
        <TabsContent value="companies" className="mt-4">
          <AdminCompaniesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
