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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileDown,
  FileImage,
  FileSpreadsheet,
  FileText,
  MapPin,
  MessageCircle,
  Pencil,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CourierSlipPrintDialog } from "../components/CourierSlipPrintDialog";
import { PaymentQRCode } from "../components/PaymentQRCode";
import { useAppStore } from "../hooks/useAppStore";
import type { Bill, BillItem, Invoice, PaymentLog } from "../types";
import { downloadAsJPEG, downloadAsPDF } from "../utils/downloadHelpers";
import {
  exportToExcel,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateBillNo,
  generateId,
} from "../utils/helpers";
import { nextGSTInvoiceSeq, nextNonGSTInvoiceSeq } from "../utils/storage";

interface BillsPageProps {
  onNavigate: (page: string) => void;
}

const TRACKING_URLS: Record<string, string> = {
  DTDC: "https://www.dtdc.in/tracking/tracking.asp?Ttype=awb&strCNNo={awb}",
  BlueDart: "https://www.bluedart.com/tracking?trackFor=0&trackThis={awb}",
  Delhivery: "https://www.delhivery.com/tracking/?val={awb}",
  FedEx: "https://www.fedex.com/en-in/tracking.html?tracknumbers={awb}",
};

const TRACKING_STATUS_LABELS: Record<string, string> = {
  booked: "Booked",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  rto: "RTO",
};

const TRACKING_STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  in_transit: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  rto: "bg-red-100 text-red-700",
};

export function BillsPage({ onNavigate }: BillsPageProps) {
  const {
    bills,
    customers,
    addInvoice,
    updateBill,
    deleteBill,
    settings,
    updateSettings,
    activeCompanyId,
    activeCompany,
  } = useAppStore();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
  const [slipItem, setSlipItem] = useState<{
    item: BillItem;
    bill: Bill;
  } | null>(null);
  const [invoiceType, setInvoiceType] = useState<"gst" | "non_gst">("gst");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Record Payment
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "upi" | "card" | "credit"
  >("cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentNotes, setPaymentNotes] = useState("");

  // Bill PDF/image download
  const billPrintRef = useRef<HTMLDivElement>(null);
  const [billDownloading, setBillDownloading] = useState<
    "pdf" | "jpeg" | "png" | null
  >(null);

  // AWB Tracking
  const [trackItem, setTrackItem] = useState<{
    item: BillItem;
    bill: Bill;
  } | null>(null);
  const [trackStatus, setTrackStatus] =
    useState<BillItem["trackingStatus"]>("booked");

  // Edit form state

  const openEditBill = (bill: Bill) => {
    localStorage.setItem("pos_edit_bill_id", bill.id);
    onNavigate("billing/edit");
  };

  const handleDeleteBill = () => {
    if (!deleteBillId) return;
    const bill = bills.find((b) => b.id === deleteBillId);
    deleteBill(deleteBillId);
    toast.success(`Bill ${bill?.billNo || ""} deleted`);
    setDeleteBillId(null);
  };

  const handleBulkDelete = () => {
    for (const id of selectedIds) {
      deleteBill(id);
    }
    toast.success(`${selectedIds.length} bills deleted`);
    setSelectedIds([]);
    setDeleteBulkConfirm(false);
  };

  const handleBulkMarkPaid = () => {
    for (const id of selectedIds) {
      const bill = bills.find((b) => b.id === id);
      if (bill) {
        updateBill({
          ...bill,
          paymentStatus: "paid",
          amountPaid: bill.total,
          balanceDue: 0,
        });
      }
    }
    toast.success(`${selectedIds.length} bills marked as paid`);
    setSelectedIds([]);
  };

  // Record Payment Handler
  const openPaymentDialog = (bill: Bill) => {
    setPaymentBill(bill);
    setPaymentAmount(String(bill.balanceDue));
    setPaymentMethod("cash");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
  };

  const handleRecordPayment = () => {
    if (!paymentBill) return;
    const amount = Number.parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    const newAmountPaid = paymentBill.amountPaid + amount;
    const newBalanceDue = Math.max(0, paymentBill.total - newAmountPaid);
    const newStatus: Bill["paymentStatus"] =
      newBalanceDue === 0 ? "paid" : "partial";

    const log: PaymentLog = {
      id: generateId(),
      date: paymentDate,
      amount,
      method: paymentMethod,
      notes: paymentNotes || undefined,
    };

    updateBill({
      ...paymentBill,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      paymentStatus: newStatus,
      paymentLogs: [...(paymentBill.paymentLogs || []), log],
    });
    toast.success(`Payment of ${formatCurrency(amount)} recorded`);
    setPaymentBill(null);
  };

  // AWB Tracking handler
  const openTrackDialog = (item: BillItem, bill: Bill) => {
    setTrackItem({ item, bill });
    setTrackStatus(item.trackingStatus || "booked");
  };

  const handleSaveTrackStatus = () => {
    if (!trackItem) return;
    const updatedItems = trackItem.bill.items.map((i) =>
      i.id === trackItem.item.id ? { ...i, trackingStatus: trackStatus } : i,
    );
    updateBill({ ...trackItem.bill, items: updatedItems });
    toast.success("Tracking status updated");
    setTrackItem(null);
  };

  const getTrackingUrl = (brandName: string, awb: string): string => {
    const urlTemplate =
      TRACKING_URLS[brandName] ||
      "https://www.google.com/search?q=track+{awb}+courier";
    return urlTemplate.replace("{awb}", awb);
  };

  const filteredBills = useMemo(() => {
    return [...bills]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((bill) => {
        const matchSearch =
          bill.billNo.toLowerCase().includes(search.toLowerCase()) ||
          bill.customerName.toLowerCase().includes(search.toLowerCase());
        const matchDate = !filterDate || bill.date === filterDate;
        const matchStatus =
          filterStatus === "all" || bill.paymentStatus === filterStatus;
        return matchSearch && matchDate && matchStatus;
      });
  }, [bills, search, filterDate, filterStatus]);

  const selectedBills = bills.filter((b) => selectedIds.includes(b.id));
  const allSameCustomer =
    selectedBills.length > 0 &&
    selectedBills.every((b) => b.customerId === selectedBills[0].customerId);
  const canGenerateInvoice = selectedBills.length > 0 && allSameCustomer;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredBills.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBills.map((b) => b.id));
    }
  };

  const generateInvoice = () => {
    if (!canGenerateInvoice || !settings || !activeCompany) return;

    const firstBill = selectedBills[0];
    const customer = customers.find((c) => c.id === firstBill.customerId);

    const allItems = selectedBills.flatMap((b) => b.items);
    // GST-exclusive taxable base
    const subtotal = allItems.reduce((sum, i) => {
      const rate = i.gstRate || 0;
      return sum + (i.totalPrice * 100) / (100 + rate);
    }, 0);

    const cgst =
      invoiceType === "gst"
        ? allItems.reduce(
            (sum, i) =>
              sum +
              (i.totalPrice * (i.gstRate || 0)) / (100 + (i.gstRate || 0)) / 2,
            0,
          )
        : 0;
    const sgst = cgst;
    const igst = 0;
    // Grand total is sum of all GST-inclusive item prices
    const total = allItems.reduce((sum, i) => sum + i.totalPrice, 0);

    let invoiceNo: string;
    if (invoiceType === "gst") {
      // GST invoice: sequence is shared across all companies with the same GSTIN
      const companyGstin = activeCompany?.gstin?.trim();
      if (companyGstin) {
        const seq = nextGSTInvoiceSeq(companyGstin);
        invoiceNo = generateBillNo(settings.gstInvoicePrefix, seq);
      } else {
        // Fallback: no GSTIN set on company, use per-company settings seq
        invoiceNo = generateBillNo(
          settings.gstInvoicePrefix,
          settings.gstInvoiceSeq,
        );
        updateSettings({
          ...settings,
          gstInvoiceSeq: settings.gstInvoiceSeq + 1,
        });
      }
    } else {
      // Non-GST invoice: each company has its own independent sequence
      const seq = nextNonGSTInvoiceSeq(activeCompanyId);
      invoiceNo = generateBillNo(settings.nonGstInvoicePrefix, seq);
    }

    const invoice: Invoice = {
      id: generateId(),
      companyId: activeCompanyId,
      invoiceNo,
      invoiceType,
      customerId: firstBill.customerId,
      customerName: firstBill.customerName,
      customerGstin: customer?.gstin,
      customerAddress: customer?.address,
      billIds: selectedIds,
      date: new Date().toISOString().split("T")[0],
      items: allItems,
      subtotal,
      cgst,
      sgst,
      igst,
      total,
      paymentMethod: firstBill.paymentMethod,
      paymentStatus: selectedBills.every((b) => b.paymentStatus === "paid")
        ? "paid"
        : "partial",
      createdAt: new Date().toISOString(),
    };

    addInvoice(invoice);

    toast.success(`Invoice ${invoiceNo} generated successfully!`);
    setSelectedIds([]);
    setShowInvoiceDialog(false);
  };

  // ─── Print Bill Receipt (popup window) ────────────────────────────────────
  const printBillReceipt = (bill: Bill, mode: "print" | "pdf") => {
    const companyName = activeCompany?.name || "SKS Global Export";
    const companyAddress = activeCompany?.address || "";
    const companyPhone = activeCompany?.phone || "";

    const fmt = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(n);

    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    const logoHtml = activeCompany?.logoUrl
      ? `<div style="text-align:center;margin-bottom:4px;"><img src="${activeCompany.logoUrl}" alt="logo" style="height:44px;object-fit:contain;"/></div>`
      : "";

    const itemRows = bill.items
      .map(
        (item, idx) => `
      <tr>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;">${idx + 1}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;max-width:120px;word-wrap:break-word;">
          ${item.productName}
          ${item.description ? `<br/><span style="font-size:0.85em;color:#666;">${item.description}</span>` : ""}
        </td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.unitPrice)}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${fmt(item.totalPrice)}</td>
      </tr>`,
      )
      .join("");

    const chargeRows = (bill.additionalCharges || [])
      .filter((c) => c.amount !== 0)
      .map(
        (c) => `
      <tr>
        <td colspan="4" style="padding:2px 4px;text-align:right;color:#555;font-size:0.9em;">${c.label}:</td>
        <td style="padding:2px 4px;text-align:right;">${c.amount < 0 ? "–" : "+"}${fmt(Math.abs(c.amount))}</td>
      </tr>`,
      )
      .join("");

    const billDiscountRow =
      bill.billDiscount && bill.billDiscount > 0
        ? `<tr><td colspan="4" style="padding:2px 4px;text-align:right;color:#d97706;font-size:0.9em;">Bill Discount:</td><td style="padding:2px 4px;text-align:right;color:#d97706;">–${fmt(bill.billDiscount)}</td></tr>`
        : "";

    const pdfNote =
      mode === "pdf"
        ? `<p style="font-size:0.75em;color:#888;text-align:center;margin-top:4px;font-style:italic;">In print dialog, choose "Save as PDF"</p>`
        : "";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Bill ${bill.billNo}</title>
<style>
  @page { size: 105mm 148mm; margin: 5mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111; background: #fff; }
  h1 { font-size: 1.15em; font-weight: 700; text-align: center; margin-bottom: 2px; }
  .addr { text-align: center; color: #444; font-size: 0.88em; line-height: 1.4; }
  .divider { border: none; border-top: 1px dashed #aaa; margin: 5px 0; }
  .bill-meta { display: flex; justify-content: space-between; font-size: 0.88em; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #f3f4f6; font-size: 0.85em; padding: 3px 4px; text-align: left; border-bottom: 2px solid #ddd; }
  th.right { text-align: right; }
  th.center { text-align: center; }
  .total-row td { font-weight: 700; font-size: 1.05em; border-top: 1.5px solid #111; padding: 4px; }
  .total-row td:last-child { text-align: right; }
  .paid-row td { color: #16a34a; font-size: 0.92em; padding: 2px 4px; }
  .paid-row td:last-child { text-align: right; }
  .balance-row td { color: #dc2626; font-size: 0.92em; padding: 2px 4px; }
  .balance-row td:last-child { text-align: right; }
  .status-badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 0.8em; font-weight: 600; text-transform: uppercase; }
  .status-paid { background: #dcfce7; color: #16a34a; }
  .status-pending { background: #fef9c3; color: #854d0e; }
  .status-partial { background: #fef3c7; color: #92400e; }
  .footer-note { text-align: center; font-size: 0.8em; color: #666; margin-top: 6px; }
</style>
</head>
<body>
  ${logoHtml}
  <h1>${companyName}</h1>
  ${companyAddress ? `<p class="addr">${companyAddress}</p>` : ""}
  ${companyPhone ? `<p class="addr">Ph: ${companyPhone}</p>` : ""}
  <hr class="divider"/>
  <div class="bill-meta">
    <span><strong>Bill No:</strong> ${bill.billNo}</span>
    <span><strong>Date:</strong> ${fmtDate(bill.date)}</span>
  </div>
  <div class="bill-meta">
    <span><strong>Customer:</strong> ${bill.customerName}</span>
    <span><strong>Method:</strong> ${bill.paymentMethod.toUpperCase()}</span>
  </div>
  <div class="bill-meta">
    <span><strong>Status:</strong> <span class="status-badge status-${bill.paymentStatus}">${bill.paymentStatus}</span></span>
  </div>
  <hr class="divider"/>
  <table>
    <thead>
      <tr>
        <th style="width:18px;">#</th>
        <th>Item</th>
        <th class="center" style="width:30px;">Qty</th>
        <th class="right" style="width:55px;">Rate</th>
        <th class="right" style="width:60px;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${chargeRows}
      ${billDiscountRow}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4">Grand Total</td>
        <td>${fmt(bill.total)}</td>
      </tr>
      <tr class="paid-row">
        <td colspan="4">Amount Paid</td>
        <td>${fmt(bill.amountPaid)}</td>
      </tr>
      ${bill.balanceDue > 0 ? `<tr class="balance-row"><td colspan="4">Balance Due</td><td>${fmt(bill.balanceDue)}</td></tr>` : ""}
    </tfoot>
  </table>
  ${bill.notes ? `<hr class="divider"/><p style="font-size:0.85em;color:#555;margin-top:3px;"><em>Note: ${bill.notes}</em></p>` : ""}
  ${activeCompany?.upiId && bill.balanceDue > 0 ? `<p style="font-size:0.8em;text-align:center;margin-top:5px;color:#555;">UPI: ${activeCompany.upiId}</p>` : ""}
  ${bill.createdBy ? `<p style="font-size:0.8em;color:#666;text-align:right;margin-top:4px;">Billed by: <strong>${bill.createdBy}</strong></p>` : ""}
  <p class="footer-note">Thank you for your business!</p>
  ${pdfNote}
  <script>window.onload = function(){ window.focus(); window.print(); };<\/script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) {
      toast.error(
        "Popup blocked! Please allow popups for this site and try again.",
      );
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  // ─── Bill Direct Download Handlers ───────────────────────────────────────────
  const handleBillDownloadPDF = async () => {
    if (!viewBill || !billPrintRef.current) return;
    setBillDownloading("pdf");
    try {
      await downloadAsPDF(billPrintRef.current, `Bill-${viewBill.billNo}.pdf`);
    } catch {
      toast.error("PDF download failed. Please try again.");
    } finally {
      setBillDownloading(null);
    }
  };

  const handleBillDownloadJPEG = async () => {
    if (!viewBill || !billPrintRef.current) return;
    setBillDownloading("jpeg");
    try {
      await downloadAsJPEG(billPrintRef.current, `Bill-${viewBill.billNo}.jpg`);
    } catch {
      toast.error("JPEG download failed. Please try again.");
    } finally {
      setBillDownloading(null);
    }
  };

  // ─── Excel Export ────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const data = filteredBills.map((b) => ({
      "Bill No": b.billNo,
      Date: formatDate(b.date),
      Customer: b.customerName,
      "Items Count": b.items.length,
      Total: b.total,
      "Amount Paid": b.amountPaid,
      "Balance Due": b.balanceDue,
      "Payment Method": b.paymentMethod,
      "Payment Status": b.paymentStatus,
      "Invoice Status": b.isInvoiced ? "Invoiced" : "Not Invoiced",
    }));
    exportToExcel(
      [{ name: "Bills", data }],
      `bills_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    toast.success("Bills exported to Excel/CSV");
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      paid: "bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold",
      pending: "bg-amber-100 text-amber-700 border-amber-200 font-semibold",
      partial: "bg-blue-100 text-blue-700 border-blue-200 font-semibold",
    };
    const labels: Record<string, string> = {
      paid: "✅ Paid",
      pending: "⏳ Pending",
      partial: "🔄 Partial",
    };
    return (
      <Badge
        variant="outline"
        className={`text-xs ${classes[status] || "bg-gray-100 text-gray-700"}`}
      >
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold">Bills</h2>
          <p className="text-sm text-muted-foreground">
            {filteredBills.length} bills found
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canGenerateInvoice && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setInvoiceType("gst");
                  setShowInvoiceDialog(true);
                }}
                className="bg-primary"
                data-ocid="bills.gst_invoice.button"
              >
                <FileText className="w-4 h-4 mr-1" />
                GST Invoice ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInvoiceType("non_gst");
                  setShowInvoiceDialog(true);
                }}
                data-ocid="bills.non_gst_invoice.button"
              >
                <FileText className="w-4 h-4 mr-1" />
                Non-GST Invoice
              </Button>
            </>
          )}
          {selectedIds.length > 0 && !allSameCustomer && (
            <p className="text-xs text-destructive self-center">
              Select bills from same customer to generate invoice
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            title="Export bills to Excel/CSV"
            data-ocid="bills.export_excel.button"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 flex-wrap">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2 flex-wrap ml-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-400 hover:bg-green-50 text-xs"
              onClick={handleBulkMarkPaid}
              data-ocid="bills.bulk_mark_paid.button"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Mark as Paid
            </Button>
            {canGenerateInvoice && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setInvoiceType("gst");
                  setShowInvoiceDialog(true);
                }}
                data-ocid="bills.bulk_generate_invoice.button"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Generate Invoice
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/5 text-xs"
              onClick={() => setDeleteBulkConfirm(true)}
              data-ocid="bills.bulk_delete.button"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete ({selectedIds.length})
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-xs"
            onClick={() => setSelectedIds([])}
            data-ocid="bills.deselect_all.button"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Deselect
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills..."
            className="pl-9 text-sm"
            data-ocid="bills.search_input"
          />
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="text-sm w-full sm:w-40"
          data-ocid="bills.date.input"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            className="text-sm w-full sm:w-36"
            data-ocid="bills.status.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterDate || filterStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterDate("");
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
          <Table data-ocid="bills.table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedIds.length === filteredBills.length &&
                      filteredBills.length > 0
                    }
                    onCheckedChange={toggleAll}
                    data-ocid="bills.select_all.checkbox"
                  />
                </TableHead>
                <TableHead className="text-xs">Bill No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Items</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="bills.empty_state"
                  >
                    No bills found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBills.map((bill, idx) => (
                  <TableRow
                    key={bill.id}
                    className="hover:bg-muted/20 transition-colors"
                    data-ocid={`bills.item.${idx + 1}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(bill.id)}
                        onCheckedChange={() => toggleSelect(bill.id)}
                        data-ocid={`bills.checkbox.${idx + 1}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">
                      {bill.billNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(bill.date)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>
                        <p className="font-medium">{bill.customerName}</p>
                        <p className="text-muted-foreground capitalize">
                          {bill.customerType}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bill.items.length} items
                      {bill.items.some(
                        (i) => i.productType === "courier_awb",
                      ) && (
                        <span className="ml-1 text-purple-500 text-[10px]">
                          📦
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {formatCurrency(bill.total)}
                      {bill.balanceDue > 0 && (
                        <p className="text-[10px] text-destructive">
                          Due: {formatCurrency(bill.balanceDue)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {bill.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(bill.paymentStatus)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {bill.createdBy || "-"}
                    </TableCell>
                    <TableCell>
                      {bill.isInvoiced ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewBill(bill)}
                          className="text-xs h-7"
                          data-ocid={`bills.view.button.${idx + 1}`}
                        >
                          View
                        </Button>
                        {(bill.paymentStatus === "pending" ||
                          bill.paymentStatus === "partial") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Record Payment"
                            onClick={() => openPaymentDialog(bill)}
                            data-ocid={`bills.record_payment.button.${idx + 1}`}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {bill.items.some(
                          (i) => i.productType === "courier_awb",
                        ) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Track AWB"
                            onClick={() => {
                              const ci = bill.items.find(
                                (i) => i.productType === "courier_awb",
                              );
                              if (ci) openTrackDialog(ci, bill);
                            }}
                            data-ocid={`bills.track.button.${idx + 1}`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEditBill(bill)}
                          data-ocid={`bills.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteBillId(bill.id)}
                          data-ocid={`bills.delete_button.${idx + 1}`}
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

      {/* View Bill Dialog */}
      <Dialog
        open={!!viewBill}
        onOpenChange={(open) => !open && setViewBill(null)}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="bills.view.dialog"
        >
          <DialogHeader>
            <DialogTitle>Bill Details - {viewBill?.billNo}</DialogTitle>
          </DialogHeader>
          {viewBill && (
            <div className="space-y-4" ref={billPrintRef}>
              <div
                className="text-center border-b border-border pb-3"
                id="bill-print"
              >
                {activeCompany?.logoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={activeCompany.logoUrl}
                      alt="Company Logo"
                      className="h-14 object-contain"
                    />
                  </div>
                )}
                <p className="font-bold text-sm">{activeCompany?.name}</p>
                {activeCompany?.address && (
                  <p className="text-xs text-muted-foreground">
                    {activeCompany.address}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-semibold">{viewBill.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDate(viewBill.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-semibold capitalize">
                    {viewBill.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(viewBill.paymentStatus)}
                </div>
                {viewBill.createdBy && (
                  <div>
                    <p className="text-muted-foreground">
                      Billed By (Employee)
                    </p>
                    <p className="font-semibold font-mono text-primary">
                      {viewBill.createdBy}
                    </p>
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewBill.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs max-w-[220px]">
                        {item.productType === "courier_awb" &&
                          item.brandName && (
                            <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">
                              {item.brandName}
                              {item.serviceMode ? ` · ${item.serviceMode}` : ""}
                            </p>
                          )}
                        <p className="font-medium break-words whitespace-normal font-mono">
                          {item.productName}
                        </p>
                        {item.description && (
                          <p className="text-muted-foreground break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                        {item.awbSerial &&
                          item.productName !== item.awbSerial && (
                            <p className="text-muted-foreground break-words whitespace-normal">
                              AWB: {item.awbSerial}
                            </p>
                          )}
                        {item.trackingStatus && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TRACKING_STATUS_COLORS[item.trackingStatus]}`}
                          >
                            {TRACKING_STATUS_LABELS[item.trackingStatus]}
                          </span>
                        )}
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
                      <TableCell>
                        <div className="flex gap-1">
                          {item.productType === "courier_awb" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary"
                                title="Print Courier Slip"
                                onClick={() =>
                                  setSlipItem({ item, bill: viewBill })
                                }
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-purple-600"
                                title="Track AWB"
                                onClick={() => openTrackDialog(item, viewBill)}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total (incl. tax)
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(viewBill.total)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(viewBill.amountPaid)}
                  </span>
                </div>
                {viewBill.balanceDue > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="text-destructive font-medium">
                      {formatCurrency(viewBill.balanceDue)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment QR Code */}
              {activeCompany?.upiId && viewBill.balanceDue > 0 && (
                <div className="flex justify-center pt-2 pb-1">
                  <PaymentQRCode
                    upiId={activeCompany.upiId}
                    upiName={activeCompany.upiName || activeCompany.name}
                    amount={viewBill.balanceDue}
                    note={`Bill ${viewBill.billNo}`}
                    size={120}
                  />
                </div>
              )}

              {/* Payment Logs */}
              {viewBill.paymentLogs && viewBill.paymentLogs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2">Payment History</p>
                  <div className="space-y-1.5">
                    {viewBill.paymentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between text-xs bg-green-50 p-2 rounded"
                      >
                        <span className="text-muted-foreground">
                          {formatDate(log.date)} · {log.method}
                          {log.notes && ` · ${log.notes}`}
                        </span>
                        <span className="font-semibold text-green-700">
                          +{formatCurrency(log.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewBill.notes && (
                <p className="text-xs text-muted-foreground italic">
                  {viewBill.notes}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => viewBill && printBillReceipt(viewBill, "print")}
              data-ocid="bills.print.button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleBillDownloadPDF}
              disabled={!!billDownloading}
              data-ocid="bills.download_pdf.button"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {billDownloading === "pdf" ? "Downloading..." : "PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={handleBillDownloadJPEG}
              disabled={!!billDownloading}
              data-ocid="bills.download_jpeg.button"
            >
              <FileImage className="w-4 h-4 mr-2" />
              {billDownloading === "jpeg" ? "Downloading..." : "JPEG"}
            </Button>
            {viewBill &&
              (() => {
                const customer = customers.find(
                  (c) =>
                    c.phone &&
                    (c.name === viewBill.customerName ||
                      c.id === viewBill.customerId),
                );
                const phone = customer?.phone?.replace(/\D/g, "") || "";
                if (!phone) return null;
                const msg = `Dear ${viewBill.customerName},\nYour bill details from SKS Global Export:\n📄 Bill No: ${viewBill.billNo}\n📅 Date: ${new Date(viewBill.date).toLocaleDateString("en-IN")}\n💵 Amount: ₹${viewBill.total}\n✅ Paid: ₹${viewBill.amountPaid}\n🔴 Balance: ₹${viewBill.balanceDue}\n\nThank you for your business! 🙏`;
                return (
                  <Button
                    variant="outline"
                    className="border-green-400 text-green-700 hover:bg-green-50"
                    onClick={() =>
                      window.open(
                        `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`,
                        "_blank",
                      )
                    }
                    data-ocid="bills.whatsapp.button"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                );
              })()}
            <Button
              onClick={() => setViewBill(null)}
              data-ocid="bills.view.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={!!paymentBill}
        onOpenChange={(open) => !open && setPaymentBill(null)}
      >
        <DialogContent className="max-w-md" data-ocid="bills.payment.dialog">
          <DialogHeader>
            <DialogTitle>Record Payment — {paymentBill?.billNo}</DialogTitle>
          </DialogHeader>
          {paymentBill && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatCurrency(paymentBill.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(paymentBill.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="text-destructive font-semibold">
                    {formatCurrency(paymentBill.balanceDue)}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount Received (₹)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  data-ocid="bills.payment.amount.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    setPaymentMethod(v as typeof paymentMethod)
                  }
                >
                  <SelectTrigger data-ocid="bills.payment.method.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  data-ocid="bills.payment.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cheque no, UPI ref..."
                  data-ocid="bills.payment.notes.input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentBill(null)}
              data-ocid="bills.payment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              className="bg-green-600 hover:bg-green-700"
              data-ocid="bills.payment.submit_button"
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AWB Tracking Dialog */}
      <Dialog
        open={!!trackItem}
        onOpenChange={(open) => !open && setTrackItem(null)}
      >
        <DialogContent className="max-w-md" data-ocid="bills.tracking.dialog">
          <DialogHeader>
            <DialogTitle>
              AWB Tracking — {trackItem?.item.productName}
            </DialogTitle>
          </DialogHeader>
          {trackItem && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AWB No</span>
                  <span className="font-mono font-semibold">
                    {trackItem.item.awbSerial || trackItem.item.productName}
                  </span>
                </div>
                {trackItem.item.brandName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand</span>
                    <span className="font-medium">
                      {trackItem.item.brandName}
                    </span>
                  </div>
                )}
                {trackItem.item.receiverName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receiver</span>
                    <span>{trackItem.item.receiverName}</span>
                  </div>
                )}
                {trackItem.item.receiverPincode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination</span>
                    <span>{trackItem.item.receiverPincode}</span>
                  </div>
                )}
              </div>

              {/* Track on courier website */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const awb =
                    trackItem.item.awbSerial || trackItem.item.productName;
                  const brand = trackItem.item.brandName || "";
                  window.open(getTrackingUrl(brand, awb), "_blank");
                }}
                data-ocid="bills.tracking.track_online.button"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Track on {trackItem.item.brandName || "Courier"} Website
              </Button>

              {/* Manual status update */}
              <div className="space-y-1.5">
                <Label className="text-xs">Update Tracking Status</Label>
                <Select
                  value={trackStatus || "booked"}
                  onValueChange={(v) =>
                    setTrackStatus(v as BillItem["trackingStatus"])
                  }
                >
                  <SelectTrigger data-ocid="bills.tracking.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">
                      Out for Delivery
                    </SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="rto">RTO (Return)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTrackItem(null)}
              data-ocid="bills.tracking.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTrackStatus}
              data-ocid="bills.tracking.save_button"
            >
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bill Confirmation */}
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
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="bills.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBill}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="bills.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={deleteBulkConfirm} onOpenChange={setDeleteBulkConfirm}>
        <AlertDialogContent data-ocid="bills.bulk_delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} Bills?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} selected bills.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="bills.bulk_delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="bills.bulk_delete.confirm_button"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Courier Slip Print Dialog */}
      {slipItem && (
        <CourierSlipPrintDialog
          open={!!slipItem}
          onClose={() => setSlipItem(null)}
          item={slipItem.item}
          billNo={slipItem.bill.billNo}
          billDate={slipItem.bill.date}
          companyName={activeCompany?.name || "SKS Global Export"}
          companyAddress={activeCompany?.address}
          companyPhone={activeCompany?.phone}
          companyLogoUrl={activeCompany?.logoUrl}
        />
      )}

      {/* Invoice Generation Confirmation */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent data-ocid="bills.invoice_gen.dialog">
          <DialogHeader>
            <DialogTitle>
              Generate {invoiceType === "gst" ? "GST" : "Non-GST"} Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to generate a{" "}
              <strong>
                {invoiceType === "gst" ? "GST" : "Non-GST"} Invoice
              </strong>{" "}
              for:
            </p>
            <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Customer: </span>
                <strong>{selectedBills[0]?.customerName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Bills: </span>
                <strong>{selectedIds.length}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Total: </span>
                <strong>
                  {formatCurrency(
                    selectedBills.reduce((s, b) => s + b.total, 0),
                  )}
                </strong>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={invoiceType === "gst" ? "default" : "outline"}
                size="sm"
                onClick={() => setInvoiceType("gst")}
              >
                GST Invoice
              </Button>
              <Button
                variant={invoiceType === "non_gst" ? "default" : "outline"}
                size="sm"
                onClick={() => setInvoiceType("non_gst")}
              >
                Non-GST Invoice
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(false)}
              data-ocid="bills.invoice_gen.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={generateInvoice}
              data-ocid="bills.invoice_gen.confirm_button"
            >
              Generate Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
