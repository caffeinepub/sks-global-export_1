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
import { Separator } from "@/components/ui/separator";
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
  Building2,
  Eye,
  FileDown,
  FileImage,
  FileSpreadsheet,
  IndianRupee,
  Pencil,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  Company,
  GeneralProduct,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  Vendor,
} from "../types";
import { downloadAsJPEG, downloadAsPDF } from "../utils/downloadHelpers";
import {
  amountToWords,
  exportToExcel,
  formatCurrency,
  formatDate,
  generateId,
} from "../utils/helpers";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PurchaseInvoice["paymentStatus"] }) {
  const cls =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "partial"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <Badge variant="outline" className={`text-xs capitalize ${cls}`}>
      {status}
    </Badge>
  );
}

// ─── Print HTML builder ───────────────────────────────────────────────────────
function buildPurchaseInvoicePrintHtml(
  inv: PurchaseInvoice,
  company: Company | null,
  vendor: Vendor | undefined,
): string {
  const itemRows = inv.items
    .map(
      (item, idx) => `
    <tr>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${idx + 1}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">
        ${item.productName}
        ${item.awbFrom ? `<br><span style="font-size:9px;color:#6b7280;">AWB: ${item.awbFrom} → ${item.awbTo}</span>` : ""}
      </td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.unit}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.gstRate ?? 0}%</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${((item.totalPrice * (item.gstRate ?? 0)) / (100 + (item.gstRate ?? 0))).toFixed(2)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">₹${item.totalPrice.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const balance =
    inv.paymentStatus === "partial"
      ? inv.total - (inv.amountPaid ?? 0)
      : inv.paymentStatus === "pending"
        ? inv.total
        : 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Invoice ${inv.invoiceNo}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="border:1px solid #d1d5db;border-radius:6px;overflow:hidden;">
    <!-- Header -->
    <div style="background:#1e3a8a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:16px;font-weight:700;">${company?.name ?? "SKS Global Export"}</div>
        <div style="font-size:9px;opacity:.85;margin-top:2px;">${company?.address ?? ""}</div>
        ${company?.phone ? `<div style="font-size:9px;opacity:.85;">Ph: ${company.phone}</div>` : ""}
        ${company?.gstin ? `<div style="font-size:9px;opacity:.85;">GSTIN: ${company.gstin}</div>` : ""}
      </div>
      <div style="text-align:right;">
        <div style="font-size:18px;font-weight:800;letter-spacing:1px;">PURCHASE INVOICE</div>
        <div style="font-size:13px;font-weight:700;margin-top:4px;">${inv.invoiceNo}</div>
        <div style="font-size:9px;opacity:.85;margin-top:2px;">Date: ${formatDate(inv.date)}</div>
      </div>
    </div>

    <!-- Vendor + Status -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #e5e7eb;">
      <div style="padding:10px 16px;border-right:1px solid #e5e7eb;">
        <div style="font-size:9px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Vendor</div>
        <div style="font-weight:700;font-size:11px;">${inv.vendorName}</div>
        ${vendor?.address ? `<div style="font-size:9px;color:#555;margin-top:1px;">${vendor.address}</div>` : ""}
        ${vendor?.phone ? `<div style="font-size:9px;color:#555;">Ph: ${vendor.phone}</div>` : ""}
        ${vendor?.gstin ? `<div style="font-size:9px;color:#555;">GSTIN: ${vendor.gstin}</div>` : ""}
      </div>
      <div style="padding:10px 16px;">
        <div style="font-size:9px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Payment</div>
        <div style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;${inv.paymentStatus === "paid" ? "background:#d1fae5;color:#065f46;" : inv.paymentStatus === "partial" ? "background:#fef3c7;color:#92400e;" : "background:#fee2e2;color:#991b1b;"}">${inv.paymentStatus.toUpperCase()}</div>
        ${inv.paymentStatus === "partial" ? `<div style="font-size:9px;color:#555;margin-top:4px;">Paid: ₹${(inv.amountPaid ?? 0).toFixed(2)} | Balance: ₹${balance.toFixed(2)}</div>` : ""}
        ${inv.createdBy ? `<div style="font-size:9px;color:#6b7280;margin-top:4px;">Created by: ${inv.createdBy}</div>` : ""}
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;color:#374151;width:30px;">#</th>
          <th style="padding:6px 8px;text-align:left;font-size:9px;font-weight:700;color:#374151;">Product</th>
          <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;color:#374151;width:45px;">Qty</th>
          <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;color:#374151;width:45px;">Unit</th>
          <th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;color:#374151;width:70px;">Rate</th>
          <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;color:#374151;width:45px;">GST%</th>
          <th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;color:#374151;width:70px;">GST Amt</th>
          <th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;color:#374151;width:80px;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;padding:10px 16px;border-top:2px solid #e5e7eb;">
      <div style="width:220px;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:#555;">
          <span>Subtotal</span><span>₹${inv.subtotal.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:#555;">
          <span>Total GST</span><span>₹${inv.gstAmount.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;font-weight:700;border-top:2px solid #1e3a8a;margin-top:3px;">
          <span>Grand Total</span><span>₹${inv.total.toFixed(2)}</span>
        </div>
        ${inv.paymentStatus === "partial" ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:#065f46;"><span>Amount Paid</span><span>₹${(inv.amountPaid ?? 0).toFixed(2)}</span></div>` : ""}
        ${balance > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:#991b1b;font-weight:600;"><span>Balance Due</span><span>₹${balance.toFixed(2)}</span></div>` : ""}
      </div>
    </div>

    <!-- Amount in words -->
    <div style="padding:6px 16px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:9px;color:#555;">
      <strong>Amount in Words:</strong> ${amountToWords(inv.total)}
    </div>

    ${inv.notes ? `<div style="padding:8px 16px;border-top:1px solid #e5e7eb;font-size:9px;color:#555;"><strong>Notes:</strong> ${inv.notes}</div>` : ""}

    <!-- Footer -->
    <div style="display:grid;grid-template-columns:1fr 1fr;padding:10px 16px;border-top:1px solid #e5e7eb;margin-top:4px;">
      <div style="font-size:9px;color:#6b7280;">Received By (Vendor Seal)</div>
      <div style="text-align:right;font-size:9px;color:#6b7280;">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── View Invoice Component ────────────────────────────────────────────────────
function PurchaseInvoiceView({
  inv,
  company,
  vendors,
  onClose,
}: {
  inv: PurchaseInvoice;
  company: Company | null;
  vendors: Vendor[];
  onClose: () => void;
}) {
  const viewRef = useRef<HTMLDivElement>(null);
  const vendor = vendors.find((v) => v.id === inv.vendorId);
  const balance =
    inv.paymentStatus === "partial"
      ? inv.total - (inv.amountPaid ?? 0)
      : inv.paymentStatus === "pending"
        ? inv.total
        : 0;

  const handlePrint = () => {
    const html = buildPurchaseInvoicePrintHtml(inv, company, vendor);
    const w = window.open("", "_blank", "width=860,height=1200");
    if (!w) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  const handlePDF = () => {
    if (viewRef.current) {
      downloadAsPDF(viewRef.current, `PurchaseInv_${inv.invoiceNo}.pdf`).catch(
        () => toast.error("PDF failed. Use Print > Save as PDF instead."),
      );
    }
  };

  const handleJPEG = () => {
    if (viewRef.current) {
      downloadAsJPEG(viewRef.current, `PurchaseInv_${inv.invoiceNo}.jpg`).catch(
        () => toast.error("JPEG download failed."),
      );
    }
  };

  return (
    <div data-ocid="purchase_invoices.view.dialog" className="space-y-4">
      {/* Action bar */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrint}
          data-ocid="purchase_invoices.view.print.button"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePDF}
          data-ocid="purchase_invoices.view.pdf.button"
        >
          <FileDown className="w-3.5 h-3.5 mr-1.5" /> PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleJPEG}
          data-ocid="purchase_invoices.view.jpeg.button"
        >
          <FileImage className="w-3.5 h-3.5 mr-1.5" /> JPEG
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportToExcel(
              [
                {
                  name: "Items",
                  data: inv.items.map((item) => ({
                    Product: item.productName,
                    Qty: item.quantity,
                    Unit: item.unit,
                    "Unit Price": item.unitPrice,
                    "GST%": item.gstRate ?? 0,
                    Total: item.totalPrice,
                  })),
                },
              ],
              `PurchaseInv_${inv.invoiceNo}.csv`,
            )
          }
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Excel
        </Button>
      </div>

      {/* Invoice content (ref for download) */}
      <div
        ref={viewRef}
        className="border border-border rounded-lg overflow-hidden bg-white text-[11px]"
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111" }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-start p-4"
          style={{ background: "#1e3a8a", color: "#fff" }}
        >
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              {company?.name ?? "SKS Global Export"}
            </div>
            <div style={{ fontSize: "9px", opacity: 0.85, marginTop: 2 }}>
              {company?.address}
            </div>
            {company?.phone && (
              <div style={{ fontSize: "9px", opacity: 0.85 }}>
                Ph: {company.phone}
              </div>
            )}
            {company?.gstin && (
              <div style={{ fontSize: "9px", opacity: 0.85 }}>
                GSTIN: {company.gstin}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              PURCHASE INVOICE
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, marginTop: 4 }}>
              {inv.invoiceNo}
            </div>
            <div style={{ fontSize: "9px", opacity: 0.85, marginTop: 2 }}>
              Date: {formatDate(inv.date)}
            </div>
          </div>
        </div>

        {/* Vendor + status */}
        <div
          className="grid grid-cols-2"
          style={{ borderBottom: "1px solid #e5e7eb" }}
        >
          <div className="p-3" style={{ borderRight: "1px solid #e5e7eb" }}>
            <div
              style={{
                fontSize: "8px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#6b7280",
                marginBottom: 3,
              }}
            >
              Vendor
            </div>
            <div style={{ fontWeight: 700, fontSize: "11px" }}>
              {inv.vendorName}
            </div>
            {vendor?.address && (
              <div style={{ fontSize: "9px", color: "#555", marginTop: 1 }}>
                {vendor.address}
              </div>
            )}
            {vendor?.phone && (
              <div style={{ fontSize: "9px", color: "#555" }}>
                Ph: {vendor.phone}
              </div>
            )}
            {vendor?.gstin && (
              <div style={{ fontSize: "9px", color: "#555" }}>
                GSTIN: {vendor.gstin}
              </div>
            )}
          </div>
          <div className="p-3">
            <div
              style={{
                fontSize: "8px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#6b7280",
                marginBottom: 3,
              }}
            >
              Payment Status
            </div>
            <StatusBadge status={inv.paymentStatus} />
            {inv.paymentStatus === "partial" && (
              <div style={{ fontSize: "9px", color: "#555", marginTop: 4 }}>
                Paid: {formatCurrency(inv.amountPaid ?? 0)} | Balance:{" "}
                {formatCurrency(balance)}
              </div>
            )}
            {inv.createdBy && (
              <div style={{ fontSize: "9px", color: "#6b7280", marginTop: 4 }}>
                Created by: {inv.createdBy}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {[
                "#",
                "Product",
                "Qty",
                "Unit",
                "Rate",
                "GST%",
                "GST Amt",
                "Total",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "5px 8px",
                    textAlign:
                      h === "#" || h === "Qty" || h === "Unit" || h === "GST%"
                        ? "center"
                        : h === "Product"
                          ? "left"
                          : "right",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#374151",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item, idx) => {
              const gstAmt =
                (item.totalPrice * (item.gstRate ?? 0)) /
                (100 + (item.gstRate ?? 0));
              return (
                <tr key={`${item.productId}-${idx}`}>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {item.productName}
                    {item.awbFrom && (
                      <div style={{ fontSize: "8px", color: "#6b7280" }}>
                        AWB: {item.awbFrom} → {item.awbTo}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {item.unit}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    ₹{item.unitPrice.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {item.gstRate ?? 0}%
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    ₹{gstAmt.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      textAlign: "right",
                      borderBottom: "1px solid #e5e7eb",
                      fontWeight: 600,
                    }}
                  >
                    ₹{item.totalPrice.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div
          className="flex justify-end p-3"
          style={{ borderTop: "2px solid #e5e7eb" }}
        >
          <div style={{ width: 220 }}>
            {[
              { label: "Subtotal", val: inv.subtotal },
              { label: "Total GST", val: inv.gstAmount },
            ].map(({ label, val }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  fontSize: "10px",
                  color: "#555",
                }}
              >
                <span>{label}</span>
                <span>{formatCurrency(val)}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                fontSize: "13px",
                fontWeight: 700,
                borderTop: "2px solid #1e3a8a",
                marginTop: 3,
              }}
            >
              <span>Grand Total</span>
              <span>{formatCurrency(inv.total)}</span>
            </div>
            {inv.paymentStatus === "partial" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  fontSize: "10px",
                  color: "#065f46",
                }}
              >
                <span>Amount Paid</span>
                <span>{formatCurrency(inv.amountPaid ?? 0)}</span>
              </div>
            )}
            {balance > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  fontSize: "10px",
                  color: "#991b1b",
                  fontWeight: 600,
                }}
              >
                <span>Balance Due</span>
                <span>{formatCurrency(balance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount in words */}
        <div
          className="px-3 py-2"
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e5e7eb",
            fontSize: "9px",
            color: "#555",
          }}
        >
          <strong>Amount in Words:</strong> {amountToWords(inv.total)}
        </div>

        {/* Notes */}
        {inv.notes && (
          <div
            className="px-3 py-2"
            style={{
              borderTop: "1px solid #e5e7eb",
              fontSize: "9px",
              color: "#555",
            }}
          >
            <strong>Notes:</strong> {inv.notes}
          </div>
        )}

        {/* Signature footer */}
        <div
          className="grid grid-cols-2 px-3 py-3"
          style={{ borderTop: "1px solid #e5e7eb", marginTop: 4 }}
        >
          <div style={{ fontSize: "9px", color: "#6b7280" }}>
            Received By (Vendor Seal)
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: "9px",
              color: "#6b7280",
            }}
          >
            Authorised Signatory
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function PurchaseInvoicesPage() {
  const {
    purchaseInvoices,
    vendors,
    products,
    addPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    updateProduct,
    activeCompanyId,
    activeCompany,
    currentUser,
  } = useAppStore();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<PurchaseInvoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [quickPayInv, setQuickPayInv] = useState<PurchaseInvoice | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState("");
  const [quickPayMethod, setQuickPayMethod] = useState("cash");

  // ── Form state ────────────────────────────────────────────────────────────
  const [fVendorId, setFVendorId] = useState("");
  const [fInvoiceNo, setFInvoiceNo] = useState("");
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0]);
  const [fStatus, setFStatus] =
    useState<PurchaseInvoice["paymentStatus"]>("paid");
  const [fAmountPaid, setFAmountPaid] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fItems, setFItems] = useState<PurchaseInvoiceItem[]>([]);

  // New-item form
  const [newProductId, setNewProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [newGst, setNewGst] = useState("18");
  const [newUnit, setNewUnit] = useState("");
  const [newAwbFrom, setNewAwbFrom] = useState("");
  const [newAwbTo, setNewAwbTo] = useState("");

  const generalProducts = useMemo(
    () => products.filter((p) => p.type === "general") as GeneralProduct[],
    [products],
  );

  // ── Filtered invoices ─────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return [...purchaseInvoices]
      .filter((inv) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.vendorName.toLowerCase().includes(q);
        const matchStatus =
          statusFilter === "all" || inv.paymentStatus === statusFilter;
        const matchFrom = !dateFrom || inv.date >= dateFrom;
        const matchTo = !dateTo || inv.date <= dateTo;
        return matchSearch && matchStatus && matchFrom && matchTo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchaseInvoices, search, statusFilter, dateFrom, dateTo]);

  // ── Summary cards ─────────────────────────────────────────────────────────
  const totalValue = purchaseInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = purchaseInvoices.reduce((s, i) => {
    if (i.paymentStatus === "paid") return s + i.total;
    if (i.paymentStatus === "partial") return s + (i.amountPaid ?? 0);
    return s;
  }, 0);
  const totalPending = totalValue - totalPaid;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditInvoice(null);
    setFVendorId("");
    setFInvoiceNo("");
    setFDate(new Date().toISOString().split("T")[0]);
    setFStatus("paid");
    setFAmountPaid("");
    setFNotes("");
    setFItems([]);
    clearNewItem();
    setShowForm(true);
  };

  const openEditForm = (inv: PurchaseInvoice) => {
    setEditInvoice(inv);
    setFVendorId(inv.vendorId);
    setFInvoiceNo(inv.invoiceNo);
    setFDate(inv.date);
    setFStatus(inv.paymentStatus);
    setFAmountPaid(inv.amountPaid ? String(inv.amountPaid) : "");
    setFNotes(inv.notes ?? "");
    setFItems(inv.items);
    clearNewItem();
    setShowForm(true);
  };

  const clearNewItem = () => {
    setNewProductId("");
    setNewQty("1");
    setNewPrice("");
    setNewGst("18");
    setNewUnit("");
    setNewAwbFrom("");
    setNewAwbTo("");
  };

  const handleProductSelect = (pId: string) => {
    setNewProductId(pId);
    const product = products.find((p) => p.id === pId);
    if (!product) return;
    if (product.type === "general") {
      const gp = product as GeneralProduct;
      setNewUnit(gp.unit);
      setNewPrice(String(gp.purchasePrice || ""));
      setNewGst(String(gp.gstRate || 18));
    } else if (product.type === "courier_awb") {
      setNewUnit("Piece");
    }
  };

  const addItem = () => {
    const product = products.find((p) => p.id === newProductId);
    if (!product || !newQty || !newPrice) {
      toast.error("Please fill all item fields");
      return;
    }
    const qty = Number(newQty);
    const price = Number(newPrice);
    const gstRate = Number(newGst);
    const subtotalBase = qty * price;
    const gstAmt = (subtotalBase * gstRate) / 100;
    const item: PurchaseInvoiceItem = {
      productId: product.id,
      productName:
        product.type === "general"
          ? (product as GeneralProduct).name
          : ((product as { brandName?: string }).brandName ?? "Unknown"),
      productType: product.type,
      quantity: qty,
      unit: newUnit || "Piece",
      unitPrice: price,
      gstRate,
      totalPrice: subtotalBase + gstAmt,
      awbFrom: newAwbFrom || undefined,
      awbTo: newAwbTo || undefined,
    };
    setFItems((prev) => [...prev, item]);
    clearNewItem();
  };

  const removeItem = (idx: number) =>
    setFItems((prev) => prev.filter((_, i) => i !== idx));

  const itemSubtotal = fItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const itemGst = fItems.reduce(
    (s, i) => s + (i.quantity * i.unitPrice * (i.gstRate ?? 0)) / 100,
    0,
  );
  const itemTotal = itemSubtotal + itemGst;

  const handleSave = () => {
    if (!fVendorId || !fInvoiceNo || fItems.length === 0) {
      toast.error("Fill required fields and add at least one item");
      return;
    }
    const vendor = vendors.find((v) => v.id === fVendorId);
    const amtPaid =
      fStatus === "partial" ? Number(fAmountPaid) || 0 : undefined;

    if (editInvoice) {
      // Reverse old stock changes
      for (const oldItem of editInvoice.items) {
        if (oldItem.productType === "general") {
          const p = generalProducts.find((gp) => gp.id === oldItem.productId);
          if (p) {
            updateProduct({
              ...p,
              currentStock: Math.max(0, p.currentStock - oldItem.quantity),
            });
          }
        }
      }
      const updated: PurchaseInvoice = {
        ...editInvoice,
        vendorId: fVendorId,
        vendorName: vendor?.name ?? editInvoice.vendorName,
        invoiceNo: fInvoiceNo,
        date: fDate,
        items: fItems,
        subtotal: itemSubtotal,
        gstAmount: itemGst,
        total: itemTotal,
        paymentStatus: fStatus,
        amountPaid: amtPaid,
        notes: fNotes || undefined,
      };
      updatePurchaseInvoice(updated);
    } else {
      const inv: PurchaseInvoice = {
        id: generateId(),
        companyId: activeCompanyId,
        invoiceNo: fInvoiceNo,
        vendorId: fVendorId,
        vendorName: vendor?.name ?? "Unknown Vendor",
        date: fDate,
        items: fItems,
        subtotal: itemSubtotal,
        gstAmount: itemGst,
        total: itemTotal,
        paymentStatus: fStatus,
        amountPaid: amtPaid,
        notes: fNotes || undefined,
        createdBy: currentUser?.username,
      };
      addPurchaseInvoice(inv);
    }

    // Apply new stock changes
    for (const item of fItems) {
      if (item.productType === "general") {
        const p = generalProducts.find((gp) => gp.id === item.productId);
        if (p) {
          updateProduct({ ...p, currentStock: p.currentStock + item.quantity });
        }
      }
    }

    toast.success(
      editInvoice ? "Purchase invoice updated" : "Purchase invoice saved",
    );
    setShowForm(false);
    setEditInvoice(null);
  };

  const handleDelete = (id: string) => {
    const inv = purchaseInvoices.find((i) => i.id === id);
    if (inv) {
      for (const item of inv.items) {
        if (item.productType === "general") {
          const p = generalProducts.find((gp) => gp.id === item.productId);
          if (p) {
            updateProduct({
              ...p,
              currentStock: Math.max(0, p.currentStock - item.quantity),
            });
          }
        }
      }
    }
    deletePurchaseInvoice(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success("Purchase invoice deleted");
    setDeleteId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const handleBulkMarkPaid = () => {
    for (const id of selectedIds) {
      const inv = purchaseInvoices.find((i) => i.id === id);
      if (inv) {
        updatePurchaseInvoice({
          ...inv,
          paymentStatus: "paid",
          amountPaid: undefined,
        });
      }
    }
    toast.success(`${selectedIds.size} invoice(s) marked as paid`);
    setSelectedIds(new Set());
  };

  const handleExportAll = () => {
    const data = filteredInvoices.map((inv) => ({
      "Invoice No": inv.invoiceNo,
      Date: formatDate(inv.date),
      Vendor: inv.vendorName,
      Items: inv.items.length,
      Subtotal: inv.subtotal,
      "GST Amount": inv.gstAmount,
      Total: inv.total,
      "Amount Paid":
        inv.amountPaid ?? (inv.paymentStatus === "paid" ? inv.total : 0),
      Balance:
        inv.paymentStatus === "paid"
          ? 0
          : inv.paymentStatus === "partial"
            ? inv.total - (inv.amountPaid ?? 0)
            : inv.total,
      Status: inv.paymentStatus,
      Employee: inv.createdBy ?? "",
    }));
    exportToExcel(
      [{ name: "Purchase Invoices", data }],
      "PurchaseInvoices.csv",
    );
  };

  const handleExportSelected = () => {
    const sel = filteredInvoices.filter((i) => selectedIds.has(i.id));
    const data = sel.map((inv) => ({
      "Invoice No": inv.invoiceNo,
      Date: formatDate(inv.date),
      Vendor: inv.vendorName,
      Items: inv.items.length,
      Total: inv.total,
      Status: inv.paymentStatus,
    }));
    exportToExcel(
      [{ name: "Selected Invoices", data }],
      "SelectedInvoices.csv",
    );
  };

  const handleSingleExcel = (inv: PurchaseInvoice) => {
    exportToExcel(
      [
        {
          name: "Items",
          data: inv.items.map((item) => ({
            Product: item.productName,
            Qty: item.quantity,
            Unit: item.unit,
            "Unit Price": item.unitPrice,
            "GST%": item.gstRate ?? 0,
            Total: item.totalPrice,
          })),
        },
      ],
      `PurchaseInv_${inv.invoiceNo}.csv`,
    );
  };

  const handleSinglePrint = (inv: PurchaseInvoice) => {
    const vendor = vendors.find((v) => v.id === inv.vendorId);
    const html = buildPurchaseInvoicePrintHtml(inv, activeCompany, vendor);
    const w = window.open("", "_blank", "width=860,height=1200");
    if (!w) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="p-6 space-y-5 max-w-full"
      data-ocid="purchase_invoices.page"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Purchase Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {purchaseInvoices.length} total invoices
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          data-ocid="purchase_invoices.new.button"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase Invoice
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
            <p className="text-xl font-bold">{purchaseInvoices.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-rose-700">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoice no or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-52 text-sm h-9"
            data-ocid="purchase_invoices.search_input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-36 h-9 text-sm"
            data-ocid="purchase_invoices.status_filter.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36 h-9 text-sm"
          data-ocid="purchase_invoices.date_from.input"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36 h-9 text-sm"
          data-ocid="purchase_invoices.date_to.input"
        />
        <div className="ml-auto flex gap-2">
          {(dateFrom || dateTo || search || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            data-ocid="purchase_invoices.export_all.button"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export All
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {selectedIds.size} selected
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkMarkPaid}
            data-ocid="purchase_invoices.bulk_mark_paid.button"
          >
            Mark as Paid
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportSelected}
            data-ocid="purchase_invoices.bulk_export.button"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        data-ocid="purchase_invoices.table"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={
                      filteredInvoices.length > 0 &&
                      selectedIds.size === filteredInvoices.length
                    }
                    onCheckedChange={toggleSelectAll}
                    data-ocid="purchase_invoices.select_all.checkbox"
                  />
                </TableHead>
                <TableHead className="text-xs">Invoice No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs text-right">Items</TableHead>
                <TableHead className="text-xs text-right">Subtotal</TableHead>
                <TableHead className="text-xs text-right">GST</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs text-right pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="py-16 text-center"
                    data-ocid="purchase_invoices.empty_state"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="w-8 h-8 opacity-40" />
                      <p className="text-sm font-medium">
                        No purchase invoices found
                      </p>
                      <p className="text-xs">
                        Create your first purchase invoice to get started
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv, rowIdx) => {
                  const rowNum = rowIdx + 1;
                  const balance =
                    inv.paymentStatus === "paid"
                      ? 0
                      : inv.paymentStatus === "partial"
                        ? inv.total - (inv.amountPaid ?? 0)
                        : inv.total;
                  const paid =
                    inv.paymentStatus === "paid"
                      ? inv.total
                      : (inv.amountPaid ?? 0);
                  return (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-muted/20"
                      data-ocid={`purchase_invoices.row.${rowNum}`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedIds.has(inv.id)}
                          onCheckedChange={() => toggleSelect(inv.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-primary">
                        {inv.invoiceNo}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(inv.date)}
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[120px] truncate">
                        {inv.vendorName}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {inv.items.length}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatCurrency(inv.subtotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                        {formatCurrency(inv.gstAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold">
                        {formatCurrency(inv.total)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-emerald-700">
                        {formatCurrency(paid)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-rose-700">
                        {balance > 0 ? formatCurrency(balance) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.createdBy ?? "—"}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="View"
                            onClick={() => setViewInvoice(inv)}
                            data-ocid={`purchase_invoices.view.button.${rowNum}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => openEditForm(inv)}
                            data-ocid={`purchase_invoices.edit.button.${rowNum}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Print"
                            onClick={() => handleSinglePrint(inv)}
                            data-ocid={`purchase_invoices.print.button.${rowNum}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Excel"
                            onClick={() => handleSingleExcel(inv)}
                            data-ocid={`purchase_invoices.pdf.button.${rowNum}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </Button>
                          {inv.paymentStatus !== "paid" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Quick Pay"
                              onClick={() => {
                                setQuickPayInv(inv);
                                setQuickPayAmount(
                                  String(
                                    (inv.total - (inv.amountPaid || 0)).toFixed(
                                      2,
                                    ),
                                  ),
                                );
                                setQuickPayMethod("cash");
                              }}
                              data-ocid={`purchase_invoices.pay.button.${rowNum}`}
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => setDeleteId(inv.id)}
                            data-ocid={`purchase_invoices.delete.button.${rowNum}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── View Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={!!viewInvoice}
        onOpenChange={(open) => !open && setViewInvoice(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Purchase Invoice: {viewInvoice?.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            {viewInvoice && (
              <PurchaseInvoiceView
                inv={viewInvoice}
                company={activeCompany}
                vendors={vendors}
                onClose={() => setViewInvoice(null)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditInvoice(null);
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] flex flex-col"
          data-ocid="purchase_invoices.form.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editInvoice ? "Edit Purchase Invoice" : "New Purchase Invoice"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-5 pb-2">
              {/* Basic info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label className="text-xs font-medium">
                    Vendor <span className="text-destructive">*</span>
                  </Label>
                  <Select value={fVendorId} onValueChange={setFVendorId}>
                    <SelectTrigger
                      className="mt-1 text-sm"
                      data-ocid="purchase_invoices.vendor.select"
                    >
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">
                    Invoice No <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={fInvoiceNo}
                    onChange={(e) => setFInvoiceNo(e.target.value)}
                    className="mt-1 text-sm"
                    placeholder="e.g. VND/001"
                    data-ocid="purchase_invoices.invoice_no.input"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Date</Label>
                  <Input
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    className="mt-1 text-sm"
                    data-ocid="purchase_invoices.date.input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Payment Status</Label>
                  <Select
                    value={fStatus}
                    onValueChange={(v) =>
                      setFStatus(v as PurchaseInvoice["paymentStatus"])
                    }
                  >
                    <SelectTrigger
                      className="mt-1 text-sm"
                      data-ocid="purchase_invoices.payment_status.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fStatus === "partial" && (
                  <div>
                    <Label className="text-xs font-medium">
                      Amount Paid (₹)
                    </Label>
                    <Input
                      type="number"
                      value={fAmountPaid}
                      onChange={(e) => setFAmountPaid(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="0.00"
                      data-ocid="purchase_invoices.amount_paid.input"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium">Notes / Remarks</Label>
                <Textarea
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={2}
                  placeholder="Optional notes about this purchase"
                  data-ocid="purchase_invoices.notes.textarea"
                />
              </div>

              <Separator />

              {/* Add items */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Add Items</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <Label className="text-xs">Product</Label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        className="border rounded px-2 py-1.5 text-sm w-full"
                        placeholder="Search product..."
                        value={
                          productSearch ||
                          (products.find((p) => p.id === newProductId)
                            ? products.find((p) => p.id === newProductId)!
                                .type === "general"
                              ? (
                                  products.find(
                                    (p) => p.id === newProductId,
                                  ) as GeneralProduct
                                ).name
                              : (
                                  products.find(
                                    (p) => p.id === newProductId,
                                  ) as { brandName?: string }
                                ).brandName || "Unknown"
                            : "")
                        }
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setNewProductId("");
                        }}
                        data-ocid="purchase_invoices.product.search_input"
                      />
                      {productSearch && (
                        <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border rounded bg-white shadow-lg">
                          {products
                            .filter((p) => {
                              const name =
                                p.type === "general"
                                  ? (p as GeneralProduct).name
                                  : (p as { brandName?: string }).brandName ||
                                    "";
                              return name
                                .toLowerCase()
                                .includes(productSearch.toLowerCase());
                            })
                            .map((p) => {
                              const name =
                                p.type === "general"
                                  ? (p as GeneralProduct).name
                                  : (p as { brandName?: string }).brandName ||
                                    "Unknown";
                              return (
                                <div
                                  key={p.id}
                                  className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10"
                                  onClick={() => {
                                    handleProductSelect(p.id);
                                    setProductSearch("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      handleProductSelect(p.id);
                                      setProductSearch("");
                                    }
                                  }}
                                >
                                  {name}
                                </div>
                              );
                            })}
                          {products.filter((p) => {
                            const name =
                              p.type === "general"
                                ? (p as GeneralProduct).name
                                : (p as { brandName?: string }).brandName || "";
                            return name
                              .toLowerCase()
                              .includes(productSearch.toLowerCase());
                          }).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No products found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      className="mt-1 text-sm"
                      min="1"
                      data-ocid="purchase_invoices.item_qty.input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price (₹)</Label>
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="0.00"
                      data-ocid="purchase_invoices.item_price.input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GST Rate %</Label>
                    <Select value={newGst} onValueChange={setNewGst}>
                      <SelectTrigger
                        className="mt-1 text-sm"
                        data-ocid="purchase_invoices.item_gst.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newProductId &&
                    products.find((p) => p.id === newProductId)?.type ===
                      "courier_awb" && (
                      <>
                        <div>
                          <Label className="text-xs">AWB From</Label>
                          <Input
                            value={newAwbFrom}
                            onChange={(e) => setNewAwbFrom(e.target.value)}
                            placeholder="Start serial"
                            className="mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">AWB To</Label>
                          <Input
                            value={newAwbTo}
                            onChange={(e) => setNewAwbTo(e.target.value)}
                            placeholder="End serial"
                            className="mt-1 text-sm"
                          />
                        </div>
                      </>
                    )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addItem}
                  data-ocid="purchase_invoices.add_item.button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>

              {/* Items list */}
              {fItems.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        {[
                          "#",
                          "Product",
                          "Qty",
                          "Unit Price",
                          "GST%",
                          "Total",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-medium text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fItems.map((item, idx) => (
                        <tr
                          key={`${item.productId}-${idx}`}
                          className="border-t border-border hover:bg-muted/20"
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {item.productName}
                            {item.awbFrom && (
                              <div className="text-[10px] text-muted-foreground">
                                AWB: {item.awbFrom} → {item.awbTo}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2 tabular-nums">
                            ₹{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">{item.gstRate ?? 0}%</td>
                          <td className="px-3 py-2 tabular-nums font-semibold">
                            ₹{item.totalPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => removeItem(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Running totals */}
                  <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">
                        {formatCurrency(itemSubtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total GST</span>
                      <span className="tabular-nums">
                        {formatCurrency(itemGst)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1">
                      <span>Grand Total</span>
                      <span className="tabular-nums text-primary">
                        {formatCurrency(itemTotal)}
                      </span>
                    </div>
                    {fStatus === "partial" && fAmountPaid && (
                      <>
                        <div className="flex justify-between text-xs text-emerald-700">
                          <span>Amount Paid</span>
                          <span className="tabular-nums">
                            {formatCurrency(Number(fAmountPaid))}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-700 font-semibold">
                          <span>Balance Due</span>
                          <span className="tabular-nums">
                            {formatCurrency(
                              Math.max(0, itemTotal - Number(fAmountPaid)),
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-3 border-t border-border pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditInvoice(null);
              }}
              data-ocid="purchase_invoices.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              data-ocid="purchase_invoices.save.button"
            >
              {editInvoice ? "Update Invoice" : "Save Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick Pay Dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={!!quickPayInv}
        onOpenChange={(o) => !o && setQuickPayInv(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="purchase_invoices.quick_pay.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              Quick Pay Out
            </DialogTitle>
          </DialogHeader>
          {quickPayInv && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Invoice:</span>{" "}
                  <span className="font-semibold">{quickPayInv.invoiceNo}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Vendor:</span>{" "}
                  {quickPayInv.vendorName}
                </p>
                <p>
                  <span className="text-muted-foreground">Balance Due:</span>{" "}
                  <span className="font-bold text-amber-600">
                    ₹
                    {(
                      quickPayInv.total - (quickPayInv.amountPaid || 0)
                    ).toFixed(2)}
                  </span>
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs" htmlFor="qp-amount">
                    Payment Amount
                  </Label>
                  <Input
                    id="qp-amount"
                    type="number"
                    min="0"
                    value={quickPayAmount}
                    onChange={(e) => setQuickPayAmount(e.target.value)}
                    className="mt-1"
                    data-ocid="purchase_invoices.quick_pay.input"
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="qp-method">
                    Payment Method
                  </Label>
                  <Select
                    value={quickPayMethod}
                    onValueChange={setQuickPayMethod}
                  >
                    <SelectTrigger
                      id="qp-method"
                      className="mt-1 text-xs"
                      data-ocid="purchase_invoices.quick_pay.method.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickPayInv(null)}
              data-ocid="purchase_invoices.quick_pay.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!quickPayInv) return;
                const amt = Number.parseFloat(quickPayAmount) || 0;
                if (amt <= 0) {
                  toast.error("Enter a valid amount");
                  return;
                }
                const balance =
                  quickPayInv.total - (quickPayInv.amountPaid || 0);
                const payAmt = Math.min(amt, balance);
                const newPaid = (quickPayInv.amountPaid || 0) + payAmt;
                const newStatus: PurchaseInvoice["paymentStatus"] =
                  newPaid >= quickPayInv.total ? "paid" : "partial";
                updatePurchaseInvoice({
                  ...quickPayInv,
                  amountPaid: newPaid,
                  paymentStatus: newStatus,
                });
                try {
                  const history = JSON.parse(
                    localStorage.getItem("sks_payment_history") || "[]",
                  );
                  history.push({
                    id: `pay_${Date.now()}`,
                    date: new Date().toISOString(),
                    type: "pay_out",
                    entityId: quickPayInv.vendorId,
                    entityName: quickPayInv.vendorName,
                    amount: payAmt,
                    method: quickPayMethod,
                    matchedInvoices: [quickPayInv.invoiceNo],
                    advance: 0,
                  });
                  localStorage.setItem(
                    "sks_payment_history",
                    JSON.stringify(history),
                  );
                } catch (_e) {}
                toast.success(`Payment of ₹${payAmt.toFixed(2)} recorded`);
                setQuickPayInv(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-ocid="purchase_invoices.quick_pay.confirm.button"
            >
              Confirm Pay Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="purchase_invoices.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the invoice and reverse any stock
              changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="purchase_invoices.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
              data-ocid="purchase_invoices.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
