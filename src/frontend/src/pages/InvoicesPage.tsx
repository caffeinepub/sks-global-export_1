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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Pencil,
  Printer,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { Bill, BillItem, Invoice } from "../types";
import {
  exportToExcel,
  formatCurrency,
  formatDate,
  generateBillNo,
  generateId,
  shareOnWhatsApp,
} from "../utils/helpers";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface FlatBillItem extends BillItem {
  billId: string;
  billNo: string;
  billDate: string;
  customerId: string;
  customerName: string;
  paymentStatus: string;
}

// ──────────────────────────────────────────────
// Helper components
// ──────────────────────────────────────────────

const getTypeBadge = (type: string) => (
  <Badge
    variant="outline"
    className={
      type === "gst"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-purple-50 text-purple-700 border-purple-200"
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

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  general: "General",
  courier_awb: "Courier AWB",
  xerox: "Xerox/Printout",
  service: "Service",
};

// ──────────────────────────────────────────────
// InvoiceViewDialog
// ──────────────────────────────────────────────

interface InvoiceViewDialogProps {
  invoice: Invoice | null;
  activeCompanyName: string;
  onClose: () => void;
  onExcelExport: (inv: Invoice) => void;
}

function InvoiceViewDialog({
  invoice,
  activeCompanyName,
  onClose,
  onExcelExport,
}: InvoiceViewDialogProps) {
  const { activeCompany } = useAppStore();
  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice {invoice?.invoiceNo}</DialogTitle>
        </DialogHeader>
        {invoice && (
          <div className="print-invoice space-y-4" id="invoice-print">
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-xl font-bold text-foreground">
                {activeCompany?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeCompany?.address}
              </p>
              <p className="text-sm text-muted-foreground">
                Phone: {activeCompany?.phone} | Email: {activeCompany?.email}
              </p>
              {invoice.invoiceType === "gst" && (
                <p className="text-sm font-semibold mt-1">
                  GSTIN: {activeCompany?.gstin}
                </p>
              )}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold uppercase tracking-wide">
                {invoice.invoiceType === "gst" ? "TAX INVOICE" : "INVOICE"}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Invoice No:</p>
                <p className="font-semibold">{invoice.invoiceNo}</p>
                <p className="text-muted-foreground">Date:</p>
                <p className="font-semibold">{formatDate(invoice.date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Bill To:</p>
                <p className="font-semibold">{invoice.customerName}</p>
                {invoice.customerAddress && (
                  <p className="text-muted-foreground text-xs">
                    {invoice.customerAddress}
                  </p>
                )}
                {invoice.customerGstin && (
                  <p className="text-xs">GSTIN: {invoice.customerGstin}</p>
                )}
              </div>
            </div>

            <Separator />

            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Qty</TableHead>
                  <TableHead className="text-xs">Rate</TableHead>
                  {invoice.invoiceType === "gst" && (
                    <>
                      <TableHead className="text-xs">GST%</TableHead>
                      <TableHead className="text-xs">CGST</TableHead>
                      <TableHead className="text-xs">SGST</TableHead>
                    </>
                  )}
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => {
                  const taxableAmt =
                    (item.totalPrice * 100) / (100 + item.gstRate);
                  const cgst = (item.totalPrice - taxableAmt) / 2;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">
                        <p className="font-medium">{item.productName}</p>
                        {item.description && (
                          <p className="text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {item.awbSerial && (
                          <p className="text-muted-foreground">
                            AWB: {item.awbSerial}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      {invoice.invoiceType === "gst" && (
                        <>
                          <TableCell className="text-xs">
                            {item.gstRate}%
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatCurrency(cgst)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatCurrency(cgst)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-xs font-semibold text-right">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Separator />

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                {invoice.invoiceType === "gst" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST</span>
                      <span>{formatCurrency(invoice.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST</span>
                      <span>{formatCurrency(invoice.sgst)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-border">
              <div className="text-center">
                <div className="h-12 border-b border-dashed border-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  Customer Signature
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 border-b border-dashed border-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  For {activeCompanyName}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-4 no-print">
          <Button onClick={() => window.print()} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
          {invoice && (
            <>
              <Button variant="outline" onClick={() => onExcelExport(invoice)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  shareOnWhatsApp(
                    invoice.invoiceNo,
                    invoice.total,
                    activeCompanyName,
                  )
                }
              >
                <Share2 className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Billed Products Tab
// ──────────────────────────────────────────────

interface BilledProductsTabProps {
  onInvoiceGenerated: () => void;
}

function BilledProductsTab({ onInvoiceGenerated }: BilledProductsTabProps) {
  const {
    bills,
    customers,
    addInvoice,
    updateBill,
    settings,
    updateSettings,
    activeCompanyId,
    activeCompany,
  } = useAppStore();

  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingInvoiceType, setPendingInvoiceType] = useState<
    "gst" | "non_gst"
  >("gst");

  // Flatten all bill items
  const flatItems = useMemo<FlatBillItem[]>(() => {
    return bills.flatMap((bill) =>
      bill.items.map((item) => ({
        ...item,
        billId: bill.id,
        billNo: bill.billNo,
        billDate: bill.date,
        customerId: bill.customerId,
        customerName: bill.customerName,
        paymentStatus: bill.paymentStatus,
      })),
    );
  }, [bills]);

  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const item of flatItems) {
      if (!seen.has(item.customerId)) {
        seen.add(item.customerId);
        list.push({ id: item.customerId, name: item.customerName });
      }
    }
    return list;
  }, [flatItems]);

  const filteredItems = useMemo(() => {
    return flatItems.filter((item) => {
      const matchCustomer =
        filterCustomer === "all" || item.customerId === filterCustomer;
      const matchDateFrom = !filterDateFrom || item.billDate >= filterDateFrom;
      const matchDateTo = !filterDateTo || item.billDate <= filterDateTo;
      const matchCategory =
        filterCategory === "all" || item.productType === filterCategory;
      return matchCustomer && matchDateFrom && matchDateTo && matchCategory;
    });
  }, [flatItems, filterCustomer, filterDateFrom, filterDateTo, filterCategory]);

  // row key = `${billId}_${itemId}`
  const rowKey = (item: FlatBillItem) => `${item.billId}_${item.id}`;

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleAll = () => {
    const allKeys = filteredItems.map(rowKey);
    if (selectedKeys.length === allKeys.length && allKeys.length > 0) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(allKeys);
    }
  };

  const selectedItems = filteredItems.filter((item) =>
    selectedKeys.includes(rowKey(item)),
  );

  const allSameCustomer =
    selectedItems.length > 0 &&
    selectedItems.every((i) => i.customerId === selectedItems[0].customerId);

  const clearFilters = () => {
    setFilterCustomer("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterCategory("all");
  };

  const hasFilters =
    filterCustomer !== "all" ||
    filterDateFrom ||
    filterDateTo ||
    filterCategory !== "all";

  const handleGenerateInvoice = (type: "gst" | "non_gst") => {
    if (!allSameCustomer) return;
    setPendingInvoiceType(type);
    setShowConfirm(true);
  };

  const doGenerate = () => {
    if (!settings || !activeCompany || selectedItems.length === 0) return;

    const firstItem = selectedItems[0];
    const customer = customers.find((c) => c.id === firstItem.customerId);

    const allBillItems = selectedItems as BillItem[];
    const subtotal = allBillItems.reduce((sum, i) => sum + i.totalPrice, 0);

    const cgst =
      pendingInvoiceType === "gst"
        ? allBillItems.reduce(
            (sum, i) =>
              sum + (i.totalPrice * i.gstRate) / (100 + i.gstRate) / 2,
            0,
          )
        : 0;
    const sgst = cgst;

    const invoiceNo =
      pendingInvoiceType === "gst"
        ? generateBillNo(settings.gstInvoicePrefix, settings.gstInvoiceSeq)
        : generateBillNo(
            settings.nonGstInvoicePrefix,
            settings.nonGstInvoiceSeq,
          );

    // Unique bill IDs from selected items
    const billIds = [...new Set(selectedItems.map((i) => i.billId))];

    const invoice: Invoice = {
      id: generateId(),
      companyId: activeCompanyId,
      invoiceNo,
      invoiceType: pendingInvoiceType,
      customerId: firstItem.customerId,
      customerName: firstItem.customerName,
      customerGstin: customer?.gstin,
      customerAddress: customer?.address,
      billIds,
      date: new Date().toISOString().split("T")[0],
      items: allBillItems,
      subtotal,
      cgst,
      sgst,
      igst: 0,
      total: subtotal,
      paymentMethod: "cash",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    addInvoice(invoice);

    // Mark associated bills as invoiced
    for (const billId of billIds) {
      const bill = bills.find((b) => b.id === billId);
      if (bill) {
        updateBill({ ...bill, isInvoiced: true, invoiceId: invoice.id });
      }
    }

    // Update sequence
    const newSettings = {
      ...settings,
      ...(pendingInvoiceType === "gst"
        ? { gstInvoiceSeq: settings.gstInvoiceSeq + 1 }
        : { nonGstInvoiceSeq: settings.nonGstInvoiceSeq + 1 }),
    };
    updateSettings(newSettings);

    toast.success(`Invoice ${invoiceNo} generated successfully!`);
    setSelectedKeys([]);
    setShowConfirm(false);
    onInvoiceGenerated();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-wrap gap-3">
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger className="text-sm w-full sm:w-48">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {uniqueCustomers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="text-sm w-40"
              placeholder="From"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="text-sm w-40"
              placeholder="To"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="text-sm w-full sm:w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General Product</SelectItem>
              <SelectItem value="courier_awb">Courier AWB</SelectItem>
              <SelectItem value="xerox">Xerox/Printout</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {filteredItems.length} product line(s) found
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      filteredItems.length > 0 &&
                      selectedKeys.length === filteredItems.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-xs">Bill No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Qty</TableHead>
                <TableHead className="text-xs">Rate</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No billed products found. Adjust filters or create new
                    bills.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const key = rowKey(item);
                  return (
                    <TableRow
                      key={key}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedKeys.includes(key)}
                          onCheckedChange={() => toggleSelect(key)}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {item.billNo}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(item.billDate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium">{item.productName}</p>
                        {item.description && (
                          <p className="text-muted-foreground text-xs">
                            {item.description}
                          </p>
                        )}
                        {item.awbSerial && (
                          <p className="text-muted-foreground text-xs">
                            AWB: {item.awbSerial}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {PRODUCT_TYPE_LABELS[item.productType] ||
                            item.productType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-xs font-bold">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.paymentStatus)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Sticky Action Bar */}
      {selectedKeys.length > 0 && (
        <div className="sticky bottom-4 bg-white border border-border shadow-lg rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {selectedItems.length} item(s) selected
            </p>
            {!allSameCustomer ? (
              <p className="text-xs text-destructive mt-0.5">
                ⚠️ Selected items belong to different customers. Please select
                items from a single customer.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer: <strong>{selectedItems[0]?.customerName}</strong> ·
                Total:{" "}
                <strong>
                  {formatCurrency(
                    selectedItems.reduce((s, i) => s + i.totalPrice, 0),
                  )}
                </strong>
              </p>
            )}
          </div>
          {allSameCustomer && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => handleGenerateInvoice("gst")}
                className="bg-primary text-white"
              >
                <FileText className="w-4 h-4 mr-1" />
                GST Invoice
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateInvoice("non_gst")}
              >
                <FileText className="w-4 h-4 mr-1" />
                Non-GST Invoice
              </Button>
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedKeys([])}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Generate {pendingInvoiceType === "gst" ? "GST" : "Non-GST"}{" "}
              Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              You are about to generate a{" "}
              <strong>
                {pendingInvoiceType === "gst" ? "GST" : "Non-GST"} Invoice
              </strong>{" "}
              for:
            </p>
            <div className="bg-muted/30 p-3 rounded-lg space-y-1">
              <p>
                <span className="text-muted-foreground">Customer: </span>
                <strong>{selectedItems[0]?.customerName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Items: </span>
                <strong>{selectedItems.length}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Total: </span>
                <strong>
                  {formatCurrency(
                    selectedItems.reduce((s, i) => s + i.totalPrice, 0),
                  )}
                </strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={doGenerate}>Generate Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────
// Invoice History Tab
// ──────────────────────────────────────────────

function InvoiceHistoryTab() {
  const { invoices, activeCompany, updateInvoice, deleteInvoice } =
    useAppStore();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  // Edit form state
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const filteredInvoices = useMemo(() => {
    return [...invoices]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((inv) => {
        const matchSearch =
          inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
          inv.customerName.toLowerCase().includes(search.toLowerCase());
        const matchDate = !filterDate || inv.date === filterDate;
        const matchType =
          filterType === "all" || inv.invoiceType === filterType;
        const matchStatus =
          filterStatus === "all" || inv.paymentStatus === filterStatus;
        return matchSearch && matchDate && matchType && matchStatus;
      });
  }, [invoices, search, filterDate, filterType, filterStatus]);

  const handleExportExcel = async (invoice: Invoice) => {
    const data = invoice.items.map((item) => ({
      Product: item.productName,
      Description: item.description || "",
      Qty: item.quantity,
      Unit: item.unit,
      "Rate (₹)": item.unitPrice,
      "Amount (₹)": item.totalPrice,
      "GST %": item.gstRate,
      ...(invoice.invoiceType === "gst" && {
        "CGST (₹)": (
          (item.totalPrice * item.gstRate) /
          (100 + item.gstRate) /
          2
        ).toFixed(2),
        "SGST (₹)": (
          (item.totalPrice * item.gstRate) /
          (100 + item.gstRate) /
          2
        ).toFixed(2),
      }),
    }));

    await exportToExcel(
      [{ name: "Invoice Items", data }],
      `${invoice.invoiceNo.replace("/", "_")}.xlsx`,
    );
  };

  const openEditDialog = (inv: Invoice) => {
    setEditInvoice(inv);
    setEditPaymentStatus(inv.paymentStatus);
    setEditPaymentMethod(inv.paymentMethod);
    setEditNotes(inv.notes || "");
  };

  const saveEdit = () => {
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

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteInvoice(deleteTarget.id);
    toast.success(`Invoice ${deleteTarget.invoiceNo} deleted`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-border shadow-xs flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="pl-9 text-sm"
          />
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="text-sm w-full sm:w-40"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="text-sm w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="gst">GST</SelectItem>
            <SelectItem value="non_gst">Non-GST</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="text-sm w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        {(search ||
          filterDate ||
          filterType !== "all" ||
          filterStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterDate("");
              setFilterType("all");
              setFilterStatus("all");
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Table */}
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
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No invoices found. Generate invoices from the Billed
                    Products tab.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono font-semibold">
                      {inv.invoiceNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-medium">{inv.customerName}</p>
                      {inv.customerGstin && (
                        <p className="text-muted-foreground">
                          GSTIN: {inv.customerGstin}
                        </p>
                      )}
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
                          onClick={() => openEditDialog(inv)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Download Excel"
                          onClick={() => handleExportExcel(inv)}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="WhatsApp Share"
                          onClick={() =>
                            shareOnWhatsApp(
                              inv.invoiceNo,
                              inv.total,
                              activeCompany?.name || "SKS Global Export",
                            )
                          }
                        >
                          <Share2 className="w-3.5 h-3.5" />
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

      {/* View Invoice Dialog */}
      <InvoiceViewDialog
        invoice={viewInvoice}
        activeCompanyName={activeCompany?.name || "SKS Global Export"}
        onClose={() => setViewInvoice(null)}
        onExcelExport={handleExportExcel}
      />

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
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              <strong>{deleteTarget?.invoiceNo}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

// ──────────────────────────────────────────────
// Main InvoicesPage
// ──────────────────────────────────────────────

export function InvoicesPage() {
  const { invoices } = useAppStore();
  const [activeTab, setActiveTab] = useState("billed");

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Invoices</h2>
        <p className="text-sm text-muted-foreground">
          {invoices.length} total invoices
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="billed">Billed Products</TabsTrigger>
          <TabsTrigger value="history">
            Invoice History ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billed">
          <BilledProductsTab
            onInvoiceGenerated={() => setActiveTab("history")}
          />
        </TabsContent>

        <TabsContent value="history">
          <InvoiceHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
