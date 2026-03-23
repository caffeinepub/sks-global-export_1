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
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
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
  Copy,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Mail,
  Pencil,
  Printer,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PaymentQRCode } from "../components/PaymentQRCode";
import { buildUpiUrl } from "../components/PaymentQRCode";
import { generateQRDataUrl } from "../components/QRCodeDisplay";
import { useAppStore } from "../hooks/useAppStore";
import type {
  Bill,
  BillItem,
  Company,
  CompanySettings,
  Invoice,
} from "../types";
import { downloadAsJPEG, downloadAsPDF } from "../utils/downloadHelpers";
import {
  amountToWords,
  exportToExcel,
  formatCurrency,
  formatDate,
  generateBillNo,
  generateId,
  shareOnWhatsApp,
} from "../utils/helpers";
import { nextGSTInvoiceSeq, nextNonGSTInvoiceSeq } from "../utils/storage";

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
  isInvoiced: boolean;
  invoiceNo?: string;
}

type InvoiceTemplateKey = "default" | "retail" | "courier";

interface TemplateProps {
  invoice: Invoice;
  company: Company | null;
  settings: CompanySettings | null;
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

// HSN summary helper — group items by HSN + GST rate
interface HsnRow {
  hsn: string;
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
}

function buildHsnSummary(items: BillItem[]): HsnRow[] {
  const map: Record<string, HsnRow> = {};
  for (const item of items) {
    const key = `${item.productType === "service" ? "service" : "goods"}_${item.gstRate}`;
    const taxable = (item.totalPrice * 100) / (100 + item.gstRate);
    const taxAmt = item.totalPrice - taxable;
    if (!map[key]) {
      map[key] = {
        hsn: item.productType === "service" ? "998" : "9967",
        gstRate: item.gstRate,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
      };
    }
    map[key].taxableValue += taxable;
    map[key].cgst += taxAmt / 2;
    map[key].sgst += taxAmt / 2;
  }
  return Object.values(map);
}

// ──────────────────────────────────────────────
// Template: Default (Classic Professional GST Invoice)
// ──────────────────────────────────────────────

function TemplateDefault({ invoice, company, settings }: TemplateProps) {
  const hsnRows = useMemo(
    () => buildHsnSummary(invoice.items),
    [invoice.items],
  );

  const freight = invoice.freightCharges ?? 0;
  const disc = invoice.discount ?? 0;
  const itemsBaseSubtotal = invoice.items.reduce((s, i) => {
    return s + (i.totalPrice * 100) / (100 + i.gstRate);
  }, 0);
  const subtotal = itemsBaseSubtotal - disc + freight;
  const totalTax = invoice.total - subtotal;
  const rounded = Math.round(invoice.total) - invoice.total;
  const finalTotal = invoice.total + rounded;

  const S: Record<string, React.CSSProperties> = {
    wrap: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "10px",
      color: "#111",
      background: "#fff",
      width: "100%",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottom: "3px solid #1e3a8a",
      paddingBottom: "10px",
      marginBottom: "10px",
    },
    companyName: {
      fontWeight: "bold",
      fontSize: "16px",
      color: "#1e3a8a",
      marginBottom: "2px",
    },
    companyDetail: { fontSize: "9px", color: "#555", lineHeight: "1.4" },
    invoiceTitle: { textAlign: "right" as const },
    invoiceTitleText: {
      fontWeight: "bold",
      fontSize: "20px",
      color: "#1e3a8a",
      letterSpacing: "2px",
      textTransform: "uppercase" as const,
    },
    invoiceNo: {
      fontSize: "13px",
      fontWeight: "bold",
      color: "#111",
      marginTop: "2px",
    },
    invoiceDate: { fontSize: "10px", color: "#555", marginTop: "2px" },
    metaBox: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "3px 20px",
      background: "#eef2ff",
      border: "1px solid #c7d7f0",
      borderRadius: "4px",
      padding: "6px 10px",
      marginBottom: "8px",
      fontSize: "10px",
    },
    billToBox: {
      border: "1px solid #c7d7f0",
      borderRadius: "4px",
      marginBottom: "8px",
      overflow: "hidden",
    },
    billToHeader: {
      background: "#1e3a8a",
      color: "#fff",
      fontWeight: "bold",
      fontSize: "10px",
      padding: "4px 8px",
    },
    billToBody: { padding: "6px 8px", fontSize: "10px" },
    customerName: { fontWeight: "bold", fontSize: "13px", marginBottom: "2px" },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "10px",
      marginBottom: "8px",
    },
    th: {
      background: "#1e3a8a",
      color: "#fff",
      padding: "5px 6px",
      fontWeight: "bold",
      textAlign: "left" as const,
      borderRight: "1px solid #2d4fad",
    },
    thR: {
      background: "#1e3a8a",
      color: "#fff",
      padding: "5px 6px",
      fontWeight: "bold",
      textAlign: "right" as const,
      borderRight: "1px solid #2d4fad",
    },
    td: {
      padding: "4px 6px",
      borderBottom: "1px solid #e8edf8",
      verticalAlign: "top" as const,
    },
    tdR: {
      padding: "4px 6px",
      borderBottom: "1px solid #e8edf8",
      textAlign: "right" as const,
      verticalAlign: "top" as const,
    },
    tdC: {
      padding: "4px 6px",
      borderBottom: "1px solid #e8edf8",
      textAlign: "center" as const,
      verticalAlign: "top" as const,
    },
    totalRow: { background: "#e8eeff", fontWeight: "bold" },
    bottomGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 220px",
      gap: "12px",
      alignItems: "start",
      marginBottom: "8px",
    },
    hsnTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "9px",
      border: "1px solid #c7d7f0",
    },
    hsnTh: {
      background: "#c7d7f0",
      color: "#222",
      padding: "3px 5px",
      textAlign: "left" as const,
      fontWeight: "bold",
    },
    hsnThR: {
      background: "#c7d7f0",
      color: "#222",
      padding: "3px 5px",
      textAlign: "right" as const,
      fontWeight: "bold",
    },
    hsnTd: { padding: "3px 5px", borderBottom: "1px solid #e8edf8" },
    hsnTdR: {
      padding: "3px 5px",
      borderBottom: "1px solid #e8edf8",
      textAlign: "right" as const,
    },
    totalsBox: {
      border: "1px solid #c7d7f0",
      borderRadius: "4px",
      overflow: "hidden",
      fontSize: "10px",
    },
    totalsRow: {
      display: "flex",
      justifyContent: "space-between",
      padding: "4px 8px",
      borderBottom: "1px solid #e8edf8",
    },
    totalsFinal: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 8px",
      background: "#1e3a8a",
      color: "#fff",
      fontWeight: "bold",
      fontSize: "12px",
    },
    amountWords: {
      background: "#eef2ff",
      border: "1px solid #c7d7f0",
      borderRadius: "4px",
      padding: "5px 10px",
      fontSize: "10px",
      marginBottom: "8px",
    },
    footerGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
      marginBottom: "8px",
      fontSize: "10px",
    },
    sectionLabel: { fontWeight: "bold", marginBottom: "3px", fontSize: "10px" },
    detailBox: {
      border: "1px solid #c7d7f0",
      borderRadius: "4px",
      padding: "5px 8px",
      fontSize: "9px",
      color: "#444",
    },
    sigGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      borderTop: "2px solid #1e3a8a",
      paddingTop: "8px",
      fontSize: "10px",
      marginBottom: "4px",
    },
    sigLine: {
      height: "40px",
      borderBottom: "1px dashed #999",
      marginBottom: "3px",
    },
    pageFooter: {
      display: "flex",
      justifyContent: "space-between",
      borderTop: "1px solid #e8edf8",
      paddingTop: "4px",
      fontSize: "8px",
      color: "#999",
      marginTop: "4px",
    },
  };

  const isGst = invoice.invoiceType === "gst";

  return (
    <div style={S.wrap}>
      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          {company?.logoUrl ? (
            <img
              src={company.logoUrl}
              alt="Logo"
              style={{
                height: "100px",
                objectFit: "contain",
                marginRight: "6px",
              }}
            />
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "#1e3a8a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "18px",
                borderRadius: "6px",
                flexShrink: 0,
              }}
            >
              {(company?.name || "C").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={S.companyName}>{company?.name || "Company Name"}</div>
            {company?.address && (
              <div style={S.companyDetail}>{company.address}</div>
            )}
            {(company?.phone || company?.email) && (
              <div style={S.companyDetail}>
                {company.phone ? `Ph: ${company.phone}` : ""}
                {company.phone && company.email ? " | " : ""}
                {company.email || ""}
              </div>
            )}
            {isGst && company?.gstin && (
              <div style={{ ...S.companyDetail, fontWeight: "bold" }}>
                GSTIN: {company.gstin}
              </div>
            )}
          </div>
        </div>
        <div style={S.invoiceTitle}>
          <div style={{ fontSize: "9px", color: "#888", marginBottom: "2px" }}>
            (Original Copy)
          </div>
          <div style={S.invoiceTitleText}>
            {isGst ? "TAX INVOICE" : "INVOICE"}
          </div>
          <div style={S.invoiceNo}>#{invoice.invoiceNo}</div>
          <div style={S.invoiceDate}>Date: {formatDate(invoice.date)}</div>
          <div
            style={{
              ...S.invoiceDate,
              textTransform: "capitalize",
              color: invoice.paymentStatus === "paid" ? "#16a34a" : "#b45309",
            }}
          >
            {invoice.paymentStatus}
          </div>
        </div>
      </div>

      {/* ── META + BILL TO ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div style={S.billToBox}>
          <div style={S.billToHeader}>Bill To</div>
          <div style={S.billToBody}>
            <div style={S.customerName}>{invoice.customerName}</div>
            {invoice.customerAddress && (
              <div style={{ color: "#444", fontSize: "9px" }}>
                {invoice.customerAddress}
              </div>
            )}
            {invoice.customerGstin && (
              <div style={{ fontSize: "9px" }}>
                <strong>GSTIN:</strong> {invoice.customerGstin}
              </div>
            )}
          </div>
        </div>
        <div style={{ ...S.billToBox }}>
          <div style={S.billToHeader}>Invoice Details</div>
          <div style={{ padding: "6px 8px", fontSize: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ color: "#555" }}>Invoice No:</span>
              <strong>{invoice.invoiceNo}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ color: "#555" }}>Date:</span>
              <strong>{formatDate(invoice.date)}</strong>
            </div>
            {company?.state && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "3px",
                }}
              >
                <span style={{ color: "#555" }}>Place of Supply:</span>
                <strong>{company.state}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#555" }}>Payment:</span>
              <strong
                style={{
                  textTransform: "capitalize",
                  color:
                    invoice.paymentStatus === "paid" ? "#16a34a" : "#b45309",
                }}
              >
                {invoice.paymentStatus}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── PERIOD (if set) ── */}
      {(invoice.fromDate || invoice.toDate) && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "4px",
            padding: "4px 8px",
            marginBottom: "6px",
            fontSize: "10px",
            color: "#1e40af",
            fontWeight: "bold",
          }}
        >
          For the period:{" "}
          {invoice.fromDate
            ? new Date(invoice.fromDate).toLocaleDateString("en-IN")
            : ""}
          {invoice.fromDate && invoice.toDate ? " to " : ""}
          {invoice.toDate
            ? new Date(invoice.toDate).toLocaleDateString("en-IN")
            : ""}
        </div>
      )}

      {/* ── ITEMS TABLE ── */}
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: "30px", textAlign: "center" }}>
              S.No
            </th>
            <th style={S.th}>Particulars / Description</th>
            <th style={{ ...S.th, width: "58px" }}>HSN/SAC</th>
            <th style={{ ...S.th, width: "50px" }}>Qty</th>
            <th style={{ ...S.thR, width: "72px" }}>Unit Price</th>
            {isGst && <th style={{ ...S.thR, width: "44px" }}>GST%</th>}
            <th style={{ ...S.thR, width: "78px" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const longText =
              item.productName.length + (item.description?.length || 0) > 80;
            const descFontSize = longText ? "8px" : "9px";
            return (
              <tr
                key={item.id}
                style={{ background: idx % 2 === 0 ? "#fff" : "#f7f9ff" }}
              >
                <td style={{ ...S.tdC, fontSize: "10px" }}>{idx + 1}</td>
                <td style={{ ...S.td, maxWidth: "240px" }}>
                  {item.productType === "courier_awb" && item.brandName && (
                    <div
                      style={{
                        fontSize: "8.5px",
                        color: "#1e3a8a",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.brandName}
                      {item.serviceMode ? ` · ${item.serviceMode}` : ""}
                      {invoice.showCourierStatus !== false &&
                        (item as BillItem & { trackingStatus?: string })
                          .trackingStatus && (
                          <span
                            style={{
                              color: "#b45309",
                              fontWeight: "bold",
                              marginLeft: "4px",
                            }}
                          >
                            ·{" "}
                            {(
                              item as BillItem & { trackingStatus?: string }
                            ).trackingStatus
                              ?.replace(/_/g, " ")
                              .toUpperCase()}
                          </span>
                        )}
                    </div>
                  )}
                  <div
                    style={{
                      fontWeight: "bold",
                      fontFamily: "Courier New, monospace",
                      fontSize: "10px",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.productName}
                  </div>
                  {item.description && (
                    <div
                      style={{
                        color: "#666",
                        fontSize: descFontSize,
                        marginTop: "1px",
                        wordBreak: "break-word",
                        lineHeight: "1.3",
                      }}
                    >
                      {item.description}
                    </div>
                  )}
                </td>
                <td style={{ ...S.td, fontSize: "9px" }}>
                  {(item as { hsnCode?: string }).hsnCode ||
                    (item.productType === "service" ? "9983" : "9967")}
                </td>
                <td style={{ ...S.td, fontSize: "10px" }}>
                  {item.quantity} {item.unit}
                </td>
                <td style={{ ...S.tdR, fontSize: "10px" }}>
                  {isGst
                    ? formatCurrency(
                        item.totalPrice /
                          item.quantity /
                          (1 + (item.gstRate || 0) / 100),
                      )
                    : formatCurrency(item.unitPrice)}
                </td>
                {isGst && (
                  <td style={{ ...S.tdR, fontSize: "10px" }}>
                    {item.gstRate > 0 ? `${item.gstRate}%` : "Nil"}
                  </td>
                )}
                <td style={{ ...S.tdR, fontWeight: "bold", fontSize: "10px" }}>
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            );
          })}
          <tr style={S.totalRow}>
            <td
              colSpan={isGst ? 4 : 3}
              style={{
                ...S.td,
                textAlign: "right",
                fontWeight: "bold",
                borderTop: "2px solid #c7d7f0",
              }}
            >
              TOTAL
            </td>
            <td
              style={{
                ...S.td,
                fontWeight: "bold",
                borderTop: "2px solid #c7d7f0",
              }}
            >
              {invoice.items.reduce((s, i) => s + i.quantity, 0)}
            </td>
            {isGst && (
              <td style={{ ...S.td, borderTop: "2px solid #c7d7f0" }} />
            )}
            <td
              style={{
                ...S.tdR,
                fontWeight: "bold",
                borderTop: "2px solid #c7d7f0",
              }}
            >
              {formatCurrency(invoice.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── BOTTOM: HSN summary + Totals ── */}
      {isGst ? (
        <div style={S.bottomGrid}>
          <div>
            <div style={S.sectionLabel}>HSN/SAC Summary</div>
            <table style={S.hsnTable}>
              <thead>
                <tr>
                  <th style={S.hsnTh}>HSN/SAC</th>
                  <th style={S.hsnThR}>GST%</th>
                  <th style={S.hsnThR}>Taxable Amt</th>
                  <th style={S.hsnThR}>CGST</th>
                  <th style={S.hsnThR}>SGST</th>
                  <th style={S.hsnThR}>Total</th>
                </tr>
              </thead>
              <tbody>
                {hsnRows.map((row) => (
                  <tr key={`${row.hsn}-${row.gstRate}`}>
                    <td style={S.hsnTd}>{row.hsn}</td>
                    <td style={S.hsnTdR}>{row.gstRate}%</td>
                    <td style={S.hsnTdR}>{formatCurrency(row.taxableValue)}</td>
                    <td style={S.hsnTdR}>{formatCurrency(row.cgst)}</td>
                    <td style={S.hsnTdR}>{formatCurrency(row.sgst)}</td>
                    <td style={S.hsnTdR}>
                      {formatCurrency(row.taxableValue + row.cgst + row.sgst)}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: "bold", background: "#e8eeff" }}>
                  <td colSpan={2} style={S.hsnTd}>
                    Total
                  </td>
                  <td style={S.hsnTdR}>{formatCurrency(subtotal)}</td>
                  <td style={S.hsnTdR}>{formatCurrency(totalTax / 2)}</td>
                  <td style={S.hsnTdR}>{formatCurrency(totalTax / 2)}</td>
                  <td style={S.hsnTdR}>{formatCurrency(invoice.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={S.totalsBox}>
            <div style={S.totalsRow}>
              <span style={{ color: "#555" }}>Items Subtotal</span>
              <strong>{formatCurrency(itemsBaseSubtotal)}</strong>
            </div>
            {disc > 0 && (
              <div style={S.totalsRow}>
                <span style={{ color: "#c00" }}>Discount (−)</span>
                <strong style={{ color: "#c00" }}>
                  −{formatCurrency(disc)}
                </strong>
              </div>
            )}
            {freight > 0 && (
              <div style={S.totalsRow}>
                <span style={{ color: "#555" }}>Freight Charges (+)</span>
                <strong>{formatCurrency(freight)}</strong>
              </div>
            )}
            {(disc > 0 || freight > 0) && (
              <div
                style={{
                  ...S.totalsRow,
                  background: "#f0f4ff",
                  fontWeight: "bold",
                }}
              >
                <span>Taxable Amount</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
            )}
            {hsnRows.map((row) => (
              <div key={`t-${row.hsn}-${row.gstRate}`}>
                <div style={S.totalsRow}>
                  <span style={{ color: "#555" }}>
                    CGST @ {row.gstRate / 2}%
                  </span>
                  <strong>{formatCurrency(row.cgst)}</strong>
                </div>
                <div style={S.totalsRow}>
                  <span style={{ color: "#555" }}>
                    SGST @ {row.gstRate / 2}%
                  </span>
                  <strong>{formatCurrency(row.sgst)}</strong>
                </div>
              </div>
            ))}
            {Math.abs(rounded) >= 0.01 && (
              <div style={S.totalsRow}>
                <span style={{ color: "#555" }}>Round Off</span>
                <strong>
                  {rounded >= 0 ? "+" : ""}
                  {rounded.toFixed(2)}
                </strong>
              </div>
            )}
            <div style={S.totalsFinal}>
              <span>Total Amount</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "8px",
          }}
        >
          <div style={S.totalsBox}>
            <div style={S.totalsFinal}>
              <span>Total Amount</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── AMOUNT IN WORDS ── */}
      <div style={S.amountWords}>
        <strong>Amount in Words:</strong>{" "}
        <em>{amountToWords(finalTotal)} Only</em>
      </div>

      {/* ── BANK + TERMS + QR ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
          marginBottom: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <div style={S.sectionLabel}>Terms &amp; Declaration</div>
          <div
            style={{
              ...S.detailBox,
              minHeight: "52px",
              whiteSpace: "pre-line",
            }}
          >
            {settings?.invoiceFooter ||
              "Thank you for your business.\nGoods once sold will not be taken back.\nAll disputes subject to local jurisdiction."}
          </div>
        </div>
        <div>
          <div style={S.sectionLabel}>Bank Details</div>
          <div style={{ ...S.detailBox, minHeight: "52px" }}>
            {company?.bankName ? (
              <>
                <div>
                  <strong>Bank:</strong> {company.bankName}
                </div>
                <div>
                  <strong>A/C No:</strong> {company.bankAccount}
                </div>
                <div>
                  <strong>Branch:</strong> {company.bankBranch || ""}
                </div>
                <div>
                  <strong>IFSC:</strong> {company.bankIfsc}
                </div>
              </>
            ) : (
              <span style={{ color: "#bbb" }}>
                No bank details. Add in Settings.
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={S.sectionLabel}>Scan to Pay</div>
          {company?.upiId ? (
            <PaymentQRCode
              upiId={company.upiId}
              upiName={company.upiName || company.name || ""}
              amount={invoice.total}
              note={`Invoice ${invoice.invoiceNo}`}
              size={90}
            />
          ) : (
            <div
              style={{
                border: "1px dashed #ccc",
                borderRadius: "4px",
                padding: "8px",
                fontSize: "9px",
                color: "#aaa",
                textAlign: "center",
              }}
            >
              Set UPI ID in Settings
              <br />
              to show Payment QR
            </div>
          )}
        </div>
      </div>

      {/* ── SIGNATURES ── */}
      <div style={S.sigGrid}>
        <div style={{ textAlign: "center" }}>
          <div style={S.sigLine} />
          <div style={{ color: "#555" }}>Receiver&apos;s Signature</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={S.sigLine} />
          <div style={{ color: "#555" }}>
            For {company?.name || ""}
            <br />
            <em>Authorised Signatory</em>
          </div>
        </div>
      </div>

      {/* ── PAGE FOOTER ── */}
      <div style={S.pageFooter}>
        <span>{invoice.invoiceNo}</span>
        <span>This is a computer generated invoice</span>
        {invoice.createdBy && (
          <span>
            Created by: <strong>{invoice.createdBy}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Template: Classic Retail (image-16 style)
// ──────────────────────────────────────────────

function TemplateRetail({ invoice, company, settings }: TemplateProps) {
  const hsnRows = useMemo(
    () => buildHsnSummary(invoice.items),
    [invoice.items],
  );

  const freight = invoice.freightCharges ?? 0;
  const disc = invoice.discount ?? 0;
  const itemsBaseSubtotal = invoice.items.reduce((s, i) => {
    return s + (i.totalPrice * 100) / (100 + i.gstRate);
  }, 0);
  const subtotal = itemsBaseSubtotal - disc + freight;
  const totalTax = invoice.total - subtotal;
  const rounded = Math.round(invoice.total) - invoice.total;
  const finalTotal = invoice.total + rounded;

  return (
    <div
      className="bg-white text-black"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "start",
          borderBottom: "2px solid #1e3a8a",
          paddingBottom: "8px",
          marginBottom: "8px",
        }}
      >
        {/* Left: Logo + Company name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {company?.logoUrl ? (
            <img
              src={company.logoUrl}
              alt="Logo"
              style={{ height: "100px", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "#1e3a8a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "14px",
                borderRadius: "4px",
              }}
            >
              {(company?.name || "C").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div
              style={{ fontWeight: "bold", fontSize: "15px", color: "#1e3a8a" }}
            >
              {company?.name}
            </div>
            <div style={{ color: "#555", fontSize: "10px" }}>
              {company?.address}
            </div>
            {company?.phone && (
              <div style={{ color: "#555", fontSize: "10px" }}>
                Ph: {company.phone}
                {company.email ? ` | ${company.email}` : ""}
              </div>
            )}
            {invoice.invoiceType === "gst" && company?.gstin && (
              <div style={{ fontWeight: "bold", fontSize: "10px" }}>
                GSTIN: {company.gstin}
              </div>
            )}
          </div>
        </div>
        {/* Right: invoice type label + copy */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "9px", color: "#888" }}>(Original Copy)</div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "16px",
              color: "#1e3a8a",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {invoice.invoiceType === "gst" ? "TAX INVOICE" : "INVOICE"}
          </div>
        </div>
      </div>

      {/* Metadata grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 12px",
          background: "#f0f4ff",
          border: "1px solid #c7d7f0",
          borderRadius: "4px",
          padding: "6px 10px",
          marginBottom: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <span style={{ color: "#555" }}>Invoice No: </span>
          <strong>{invoice.invoiceNo}</strong>
        </div>
        <div>
          <span style={{ color: "#555" }}>Place of Supply: </span>
          <strong>{company?.state || ""}</strong>
        </div>
        <div>
          <span style={{ color: "#555" }}>Date: </span>
          <strong>{formatDate(invoice.date)}</strong>
        </div>
        <div>
          <span style={{ color: "#555" }}>Payment Status: </span>
          <strong style={{ textTransform: "capitalize" }}>
            {invoice.paymentStatus}
          </strong>
        </div>
        <div>
          <span style={{ color: "#555" }}>Payment Method: </span>
          <strong style={{ textTransform: "capitalize" }}>
            {invoice.paymentMethod}
          </strong>
        </div>
        <div>
          <span style={{ color: "#555" }}>Sold By: </span>
          <strong>{company?.name}</strong>
        </div>
        {(invoice.fromDate || invoice.toDate) && (
          <div
            style={{ marginTop: "4px", color: "#1e40af", fontWeight: "bold" }}
          >
            Period:{" "}
            {invoice.fromDate
              ? new Date(invoice.fromDate).toLocaleDateString("en-IN")
              : ""}
            {invoice.fromDate && invoice.toDate ? " to " : ""}
            {invoice.toDate
              ? new Date(invoice.toDate).toLocaleDateString("en-IN")
              : ""}
          </div>
        )}
      </div>

      {/* Bill To */}
      <div
        style={{
          border: "1px solid #c7d7f0",
          borderRadius: "4px",
          marginBottom: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#1e3a8a",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "10px",
            padding: "3px 8px",
          }}
        >
          Bill To:
        </div>
        <div style={{ padding: "6px 8px", fontSize: "10px" }}>
          <div style={{ fontWeight: "bold", fontSize: "12px" }}>
            {invoice.customerName}
          </div>
          {invoice.customerAddress && (
            <div style={{ color: "#444" }}>{invoice.customerAddress}</div>
          )}
          {invoice.customerGstin && (
            <div>
              <strong>GSTIN:</strong> {invoice.customerGstin}
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px",
          marginBottom: "8px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#1e3a8a",
              color: "#fff",
              textAlign: "left",
            }}
          >
            <th style={{ padding: "4px 6px", width: "30px" }}>S.No</th>
            <th style={{ padding: "4px 6px" }}>Particulars</th>
            <th style={{ padding: "4px 6px", width: "60px" }}>HSN/SAC</th>
            <th style={{ padding: "4px 6px", width: "50px" }}>Qty</th>
            <th
              style={{ padding: "4px 6px", width: "70px", textAlign: "right" }}
            >
              Unit Price
            </th>
            <th
              style={{ padding: "4px 6px", width: "50px", textAlign: "right" }}
            >
              GST%
            </th>
            <th
              style={{ padding: "4px 6px", width: "75px", textAlign: "right" }}
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const longText =
              item.productName.length + (item.description?.length || 0) > 100;
            const cellFontSize = longText ? "8.5px" : "10px";
            const retailClampStyle: React.CSSProperties = {
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            };
            return (
              <tr
                key={item.id}
                style={{
                  background: idx % 2 === 0 ? "#fff" : "#f7f9ff",
                  borderBottom: "1px solid #e5eaf5",
                }}
              >
                <td style={{ padding: "4px 6px", textAlign: "center" }}>
                  {idx + 1}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    minWidth: "200px",
                    maxWidth: "260px",
                    fontSize: cellFontSize,
                  }}
                >
                  <div style={retailClampStyle}>
                    {item.productType === "courier_awb" && item.brandName && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#1e3a8a",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          display: "block",
                        }}
                      >
                        {item.brandName}
                        {item.serviceMode ? ` · ${item.serviceMode}` : ""}
                        {invoice.showCourierStatus !== false &&
                          (item as BillItem & { trackingStatus?: string })
                            .trackingStatus && (
                            <span
                              style={{ color: "#b45309", marginLeft: "4px" }}
                            >
                              ·{" "}
                              {(
                                item as BillItem & { trackingStatus?: string }
                              ).trackingStatus
                                ?.replace(/_/g, " ")
                                .toUpperCase()}
                            </span>
                          )}
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: "bold",
                        fontFamily: "monospace",
                        display: "block",
                      }}
                    >
                      {item.productName}
                    </span>
                    {item.description && (
                      <span
                        style={{
                          color: "#666",
                          fontSize: longText ? "7.5px" : "9px",
                          display: "block",
                        }}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "4px 6px" }}>
                  {item.productType === "service" ? "998" : "9967"}
                </td>
                <td style={{ padding: "4px 6px" }}>
                  {item.quantity} {item.unit}
                </td>
                <td style={{ padding: "4px 6px", textAlign: "right" }}>
                  {formatCurrency(
                    item.totalPrice /
                      item.quantity /
                      (1 + (item.gstRate || 0) / 100),
                  )}
                </td>
                <td style={{ padding: "4px 6px", textAlign: "right" }}>
                  {item.gstRate > 0 ? `${item.gstRate}%` : "0%"}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            );
          })}
          {/* Total row */}
          <tr style={{ background: "#e8eeff", fontWeight: "bold" }}>
            <td
              colSpan={3}
              style={{
                padding: "4px 6px",
                textAlign: "right",
                borderTop: "1px solid #c7d7f0",
              }}
            >
              TOTAL
            </td>
            <td style={{ padding: "4px 6px", borderTop: "1px solid #c7d7f0" }}>
              {invoice.items.reduce((s, i) => s + i.quantity, 0)}
            </td>
            <td
              style={{
                padding: "4px 6px",
                borderTop: "1px solid #c7d7f0",
              }}
            />
            <td
              style={{
                padding: "4px 6px",
                borderTop: "1px solid #c7d7f0",
              }}
            />
            <td
              style={{
                padding: "4px 6px",
                textAlign: "right",
                borderTop: "1px solid #c7d7f0",
              }}
            >
              {formatCurrency(invoice.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bottom section: HSN table (left) + totals (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "12px",
          alignItems: "start",
          marginBottom: "8px",
        }}
      >
        {/* HSN summary */}
        <div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "10px",
              marginBottom: "3px",
            }}
          >
            HSN/SAC Summary
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "9px",
              border: "1px solid #c7d7f0",
            }}
          >
            <thead>
              <tr style={{ background: "#c7d7f0" }}>
                <th style={{ padding: "3px 5px", textAlign: "left" }}>
                  HSN/SAC
                </th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>GST%</th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>
                  Amount
                </th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>
                  Taxable
                </th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>CGST</th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>SGST</th>
              </tr>
            </thead>
            <tbody>
              {hsnRows.map((row) => (
                <tr
                  key={`${row.hsn}-${row.gstRate}`}
                  style={{ borderBottom: "1px solid #e5eaf5" }}
                >
                  <td style={{ padding: "3px 5px" }}>{row.hsn}</td>
                  <td style={{ padding: "3px 5px", textAlign: "right" }}>
                    {row.gstRate}%
                  </td>
                  <td style={{ padding: "3px 5px", textAlign: "right" }}>
                    {formatCurrency(row.taxableValue + row.cgst + row.sgst)}
                  </td>
                  <td style={{ padding: "3px 5px", textAlign: "right" }}>
                    {formatCurrency(row.taxableValue)}
                  </td>
                  <td style={{ padding: "3px 5px", textAlign: "right" }}>
                    {formatCurrency(row.cgst)}
                  </td>
                  <td style={{ padding: "3px 5px", textAlign: "right" }}>
                    {formatCurrency(row.sgst)}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: "bold", background: "#e8eeff" }}>
                <td colSpan={2} style={{ padding: "3px 5px" }}>
                  Total
                </td>
                <td style={{ padding: "3px 5px", textAlign: "right" }}>
                  {formatCurrency(invoice.total)}
                </td>
                <td style={{ padding: "3px 5px", textAlign: "right" }}>
                  {formatCurrency(subtotal)}
                </td>
                <td style={{ padding: "3px 5px", textAlign: "right" }}>
                  {formatCurrency(totalTax / 2)}
                </td>
                <td style={{ padding: "3px 5px", textAlign: "right" }}>
                  {formatCurrency(totalTax / 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals box */}
        <div
          style={{
            minWidth: "200px",
            border: "1px solid #c7d7f0",
            borderRadius: "4px",
            overflow: "hidden",
            fontSize: "10px",
          }}
        >
          {disc > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 8px",
                borderBottom: "1px solid #e5eaf5",
              }}
            >
              <span style={{ color: "#555" }}>Items Subtotal</span>
              <strong>{formatCurrency(itemsBaseSubtotal)}</strong>
            </div>
          )}
          {disc > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 8px",
                borderBottom: "1px solid #e5eaf5",
              }}
            >
              <span style={{ color: "#c00" }}>Discount (−)</span>
              <strong style={{ color: "#c00" }}>−{formatCurrency(disc)}</strong>
            </div>
          )}
          {freight > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 8px",
                borderBottom: "1px solid #e5eaf5",
              }}
            >
              <span style={{ color: "#555" }}>Freight Charges (+)</span>
              <strong>{formatCurrency(freight)}</strong>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "3px 8px",
              borderBottom: "1px solid #e5eaf5",
            }}
          >
            <span style={{ color: "#555" }}>Taxable Amount</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "3px 8px",
              borderBottom: "1px solid #e5eaf5",
            }}
          >
            <span style={{ color: "#555" }}>Tax Amount (+)</span>
            <strong>{formatCurrency(totalTax)}</strong>
          </div>
          {Math.abs(rounded) >= 0.01 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 8px",
                borderBottom: "1px solid #e5eaf5",
              }}
            >
              <span style={{ color: "#555" }}>
                Round Off ({rounded >= 0 ? "+" : ""}
                {rounded.toFixed(2)})
              </span>
              <strong>{formatCurrency(rounded)}</strong>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 8px",
              background: "#1e3a8a",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            <span>Total Amount</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div
        style={{
          background: "#f0f4ff",
          border: "1px solid #c7d7f0",
          borderRadius: "4px",
          padding: "5px 10px",
          fontSize: "10px",
          marginBottom: "8px",
        }}
      >
        <strong>Amount (in words):</strong> <em>{amountToWords(finalTotal)}</em>
      </div>

      {/* Terms / Bank details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
            Terms &amp; Declaration
          </div>
          <div
            style={{
              border: "1px solid #c7d7f0",
              borderRadius: "4px",
              padding: "5px 8px",
              color: "#555",
              fontSize: "9px",
              whiteSpace: "pre-line",
            }}
          >
            {settings?.invoiceFooter ||
              "Thank you for your business.\nGoods once sold will not be taken back.\nAll disputes subject to local jurisdiction."}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
            Bank Details
          </div>
          <div
            style={{
              border: "1px solid #c7d7f0",
              borderRadius: "4px",
              padding: "5px 8px",
              fontSize: "9px",
            }}
          >
            {company?.bankName ? (
              <>
                <div>
                  <strong>Bank:</strong> {company.bankName}
                </div>
                <div>
                  <strong>Account No:</strong> {company.bankAccount}
                </div>
                <div>
                  <strong>Branch &amp; IFSC:</strong>{" "}
                  {company.bankBranch ? `${company.bankBranch} / ` : ""}
                  {company.bankIfsc}
                </div>
              </>
            ) : (
              <span style={{ color: "#aaa" }}>
                Bank details not configured. Add in Settings.
              </span>
            )}
          </div>
          {/* Payment QR Code */}
          {company?.upiId && (
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <PaymentQRCode
                upiId={company.upiId}
                upiName={company.upiName || company.name}
                amount={invoice.total}
                note={`Invoice ${invoice.invoiceNo}`}
                size={90}
              />
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          borderTop: "1px solid #c7d7f0",
          paddingTop: "8px",
          fontSize: "10px",
          marginBottom: "4px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              height: "36px",
              borderBottom: "1px dashed #aaa",
              marginBottom: "3px",
            }}
          />
          <div style={{ color: "#555" }}>Receiver&apos;s Signature</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              height: "36px",
              borderBottom: "1px dashed #aaa",
              marginBottom: "3px",
            }}
          />
          <div style={{ color: "#555" }}>
            For {company?.name}
            <br />
            <em>Authorised Signatory</em>
          </div>
        </div>
      </div>

      {/* Page footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #e5eaf5",
          paddingTop: "4px",
          fontSize: "8px",
          color: "#aaa",
        }}
      >
        <span>{invoice.invoiceNo} | Page: 1 / 1</span>
        {invoice.createdBy && <span>Created by: {invoice.createdBy}</span>}
        <span>Powered by caffeine.ai</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Template: Courier Style (image-17/18 DTDC style)
// ──────────────────────────────────────────────

function TemplateCourier({ invoice, company, settings }: TemplateProps) {
  const hsnRows = useMemo(
    () => buildHsnSummary(invoice.items),
    [invoice.items],
  );

  const freight = invoice.freightCharges ?? 0;
  const disc = invoice.discount ?? 0;
  const itemsBaseSubtotal = invoice.items.reduce((s, i) => {
    return s + (i.totalPrice * 100) / (100 + i.gstRate);
  }, 0);
  const subtotal = itemsBaseSubtotal - disc + freight;
  const totalTax = invoice.total - subtotal;
  const rounded = Math.round(invoice.total) - invoice.total;
  const finalTotal = invoice.total + rounded;
  const totalQty = invoice.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className="bg-white text-black"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "start",
          borderBottom: "3px solid #1d4ed8",
          paddingBottom: "10px",
          marginBottom: "10px",
          gap: "12px",
        }}
      >
        {/* Left: Logo + company info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          {company?.logoUrl ? (
            <img
              src={company.logoUrl}
              alt="Logo"
              style={{ height: "100px", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "#1d4ed8",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "16px",
                borderRadius: "6px",
                flexShrink: 0,
              }}
            >
              {(company?.name || "C").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div
              style={{ fontWeight: "bold", fontSize: "14px", color: "#1d4ed8" }}
            >
              {company?.name}
            </div>
            <div
              style={{ fontSize: "9px", color: "#1d4ed8", marginBottom: "2px" }}
            >
              Courier Domestic &amp; International
            </div>
            {company?.address && (
              <div style={{ fontSize: "9px", color: "#444" }}>
                {company.address}
              </div>
            )}
            {company?.phone && (
              <div style={{ fontSize: "9px", color: "#444" }}>
                Ph: {company.phone}
                {company.email ? ` | ${company.email}` : ""}
              </div>
            )}
            {invoice.invoiceType === "gst" && company?.gstin && (
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>
                GSTIN: {company.gstin}
              </div>
            )}
          </div>
        </div>
        {/* Right: Invoice info */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "9px", color: "#888" }}>(Original Copy)</div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              color: "#1d4ed8",
              lineHeight: 1.2,
            }}
          >
            INVOICE
          </div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#111" }}>
            {invoice.invoiceNo}
          </div>
          <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
            Date: {formatDate(invoice.date)}
          </div>
          {(invoice.fromDate || invoice.toDate) && (
            <div
              style={{
                fontSize: "9px",
                color: "#1d4ed8",
                fontWeight: "bold",
                marginTop: "2px",
              }}
            >
              Period:{" "}
              {invoice.fromDate
                ? new Date(invoice.fromDate).toLocaleDateString("en-IN")
                : ""}
              {invoice.fromDate && invoice.toDate ? " – " : ""}
              {invoice.toDate
                ? new Date(invoice.toDate).toLocaleDateString("en-IN")
                : ""}
            </div>
          )}
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            background: "#1d4ed8",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "10px",
            padding: "4px 10px",
            borderRadius: "4px 4px 0 0",
          }}
        >
          Bill To:
        </div>
        <div
          style={{
            border: "1px solid #1d4ed8",
            borderTop: "none",
            padding: "6px 10px",
            borderRadius: "0 0 4px 4px",
            fontSize: "10px",
          }}
        >
          <div style={{ fontWeight: "bold", fontSize: "12px" }}>
            {invoice.customerName}
          </div>
          {invoice.customerAddress && (
            <div style={{ color: "#444" }}>{invoice.customerAddress}</div>
          )}
          {invoice.customerGstin && (
            <div>
              <strong>GSTIN:</strong> {invoice.customerGstin}
            </div>
          )}
          {company?.state && (
            <div>
              <strong>PoS:</strong> {company.state}
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px",
          marginBottom: "8px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#1d4ed8",
              color: "#fff",
              textAlign: "left",
            }}
          >
            <th style={{ padding: "5px 7px", width: "30px" }}>S.No</th>
            <th style={{ padding: "5px 7px" }}>PARTICULARS</th>
            <th style={{ padding: "5px 7px", width: "60px" }}>HSN/SAC</th>
            <th style={{ padding: "5px 7px", width: "50px" }}>QTY</th>
            <th
              style={{ padding: "5px 7px", width: "75px", textAlign: "right" }}
            >
              UNIT PRICE
            </th>
            <th
              style={{ padding: "5px 7px", width: "50px", textAlign: "right" }}
            >
              GST
            </th>
            <th
              style={{ padding: "5px 7px", width: "80px", textAlign: "right" }}
            >
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const longText =
              item.productName.length + (item.description?.length || 0) > 100;
            const cellFontSize = longText ? "8.5px" : "10px";
            const courierClampStyle: React.CSSProperties = {
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            };
            return (
              <tr
                key={item.id}
                style={{
                  background: idx % 2 === 0 ? "#fff" : "#f0f5ff",
                  borderBottom: "1px solid #dde8ff",
                }}
              >
                <td style={{ padding: "5px 7px", textAlign: "center" }}>
                  {idx + 1}
                </td>
                <td
                  style={{
                    padding: "5px 7px",
                    minWidth: "200px",
                    maxWidth: "260px",
                    fontSize: cellFontSize,
                  }}
                >
                  <div style={courierClampStyle}>
                    {item.productType === "courier_awb" && item.brandName && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#1d4ed8",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          display: "block",
                        }}
                      >
                        {item.brandName}
                        {item.serviceMode ? ` · ${item.serviceMode}` : ""}
                        {invoice.showCourierStatus !== false &&
                          (item as BillItem & { trackingStatus?: string })
                            .trackingStatus && (
                            <span
                              style={{ color: "#b45309", marginLeft: "4px" }}
                            >
                              ·{" "}
                              {(
                                item as BillItem & { trackingStatus?: string }
                              ).trackingStatus
                                ?.replace(/_/g, " ")
                                .toUpperCase()}
                            </span>
                          )}
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: "bold",
                        fontFamily: "monospace",
                        letterSpacing: "0.3px",
                        display: "block",
                      }}
                    >
                      {item.productName}
                    </span>
                    {item.description && (
                      <span
                        style={{
                          fontSize: longText ? "7.5px" : "9px",
                          color: "#666",
                          marginTop: "1px",
                          display: "block",
                        }}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "5px 7px" }}>
                  {item.productType === "service" ? "998" : "9967"}
                </td>
                <td style={{ padding: "5px 7px" }}>
                  {item.quantity} {item.unit}
                </td>
                <td style={{ padding: "5px 7px", textAlign: "right" }}>
                  {formatCurrency(
                    item.totalPrice /
                      item.quantity /
                      (1 + (item.gstRate || 0) / 100),
                  )}
                </td>
                <td style={{ padding: "5px 7px", textAlign: "right" }}>
                  {item.gstRate > 0 ? `${item.gstRate}%` : "0%"}
                </td>
                <td
                  style={{
                    padding: "5px 7px",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            );
          })}
          {/* Total qty row */}
          <tr
            style={{
              background: "#e0eaff",
              fontWeight: "bold",
              borderTop: "2px solid #1d4ed8",
            }}
          >
            <td colSpan={3} style={{ padding: "5px 7px" }}>
              Total Qty: {totalQty}
            </td>
            <td colSpan={3} style={{ padding: "5px 7px" }} />
            <td
              style={{
                padding: "5px 7px",
                textAlign: "right",
                fontSize: "11px",
              }}
            >
              {formatCurrency(invoice.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* HSN Summary + Totals side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "12px",
          marginBottom: "8px",
          alignItems: "start",
        }}
      >
        {/* HSN table */}
        <div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "9px",
              border: "1px solid #dde8ff",
            }}
          >
            <thead>
              <tr style={{ background: "#1d4ed8", color: "#fff" }}>
                <th style={{ padding: "3px 6px", textAlign: "left" }}>
                  HSN/SAC
                </th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>GST%</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>
                  Amount
                </th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>CGST</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>SGST</th>
              </tr>
            </thead>
            <tbody>
              {hsnRows.map((row) => (
                <tr
                  key={`${row.hsn}-${row.gstRate}`}
                  style={{ borderBottom: "1px solid #dde8ff" }}
                >
                  <td style={{ padding: "3px 6px" }}>{row.hsn}</td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {row.gstRate}%
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {formatCurrency(row.taxableValue + row.cgst + row.sgst)}
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {formatCurrency(row.cgst)}
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {formatCurrency(row.sgst)}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: "bold", background: "#e0eaff" }}>
                <td colSpan={2} style={{ padding: "3px 6px" }}>
                  Total
                </td>
                <td style={{ padding: "3px 6px", textAlign: "right" }}>
                  {formatCurrency(invoice.total)}
                </td>
                <td style={{ padding: "3px 6px", textAlign: "right" }}>
                  {formatCurrency(totalTax / 2)}
                </td>
                <td style={{ padding: "3px 6px", textAlign: "right" }}>
                  {formatCurrency(totalTax / 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div
          style={{
            minWidth: "200px",
            border: "1px solid #dde8ff",
            borderRadius: "4px",
            overflow: "hidden",
            fontSize: "10px",
          }}
        >
          {disc > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderBottom: "1px solid #dde8ff",
              }}
            >
              <span style={{ color: "#555" }}>Items Subtotal</span>
              <strong>{formatCurrency(itemsBaseSubtotal)}</strong>
            </div>
          )}
          {disc > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderBottom: "1px solid #dde8ff",
              }}
            >
              <span style={{ color: "#c00" }}>Discount (−)</span>
              <strong style={{ color: "#c00" }}>−{formatCurrency(disc)}</strong>
            </div>
          )}
          {freight > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderBottom: "1px solid #dde8ff",
              }}
            >
              <span style={{ color: "#555" }}>Freight Charges (+)</span>
              <strong>{formatCurrency(freight)}</strong>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 8px",
              borderBottom: "1px solid #dde8ff",
            }}
          >
            <span style={{ color: "#555" }}>Taxable Amount</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 8px",
              borderBottom: "1px solid #dde8ff",
            }}
          >
            <span style={{ color: "#555" }}>Tax Amount (+)</span>
            <strong>{formatCurrency(totalTax)}</strong>
          </div>
          {Math.abs(rounded) >= 0.01 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderBottom: "1px solid #dde8ff",
              }}
            >
              <span style={{ color: "#555" }}>Round Off</span>
              <strong>{formatCurrency(rounded)}</strong>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 8px",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            <span>TOTAL AMOUNT</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div
        style={{
          background: "#f0f5ff",
          border: "1px solid #dde8ff",
          borderRadius: "4px",
          padding: "5px 10px",
          fontSize: "10px",
          marginBottom: "8px",
        }}
      >
        <strong>Amount (in words):</strong> <em>{amountToWords(finalTotal)}</em>
      </div>

      {/* Delivery terms + Terms / Bank */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
            Terms &amp; Declaration
          </div>
          <div
            style={{
              border: "1px solid #dde8ff",
              borderRadius: "4px",
              padding: "5px 8px",
              color: "#555",
              fontSize: "9px",
              whiteSpace: "pre-line",
            }}
          >
            {settings?.invoiceFooter ||
              "Delivery Terms: As per mutual agreement.\nAll disputes are subject to local court jurisdiction.\nE. &amp; O.E."}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
            Bank Details
          </div>
          <div
            style={{
              border: "1px solid #dde8ff",
              borderRadius: "4px",
              padding: "5px 8px",
              fontSize: "9px",
            }}
          >
            {company?.bankName ? (
              <>
                <div>
                  <strong>Bank:</strong> {company.bankName}
                </div>
                <div>
                  <strong>Account No:</strong> {company.bankAccount}
                </div>
                <div>
                  <strong>Branch &amp; IFSC:</strong>{" "}
                  {company.bankBranch ? `${company.bankBranch} / ` : ""}
                  {company.bankIfsc}
                </div>
              </>
            ) : (
              <span style={{ color: "#aaa" }}>
                Bank details not configured. Add in Settings.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Payment QR + Signature */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
          borderTop: "1px solid #dde8ff",
          paddingTop: "8px",
          fontSize: "10px",
        }}
      >
        <div />
        {/* Payment QR */}
        <div style={{ textAlign: "center" }}>
          {company?.upiId ? (
            <PaymentQRCode
              upiId={company.upiId}
              upiName={company.upiName || company.name}
              amount={invoice.total}
              note={`Invoice ${invoice.invoiceNo}`}
              size={80}
            />
          ) : (
            <div
              style={{
                fontSize: "8px",
                color: "#aaa",
                border: "1px dashed #dde8ff",
                padding: "6px",
                borderRadius: "4px",
              }}
            >
              Set UPI in Settings
              <br />
              to show Payment QR
            </div>
          )}
        </div>
        {/* Authorised signatory */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              height: "36px",
              borderBottom: "1px dashed #aaa",
              marginBottom: "3px",
            }}
          />
          <div style={{ color: "#555" }}>
            For {company?.name}
            <br />
            <em>Authorised Signatory</em>
          </div>
        </div>
      </div>

      {/* Page footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "6px",
          borderTop: "1px solid #dde8ff",
          paddingTop: "4px",
          fontSize: "8px",
          color: "#aaa",
        }}
      >
        <span>{invoice.invoiceNo} | Page: 1 / 1</span>
        {invoice.createdBy && <span>Created by: {invoice.createdBy}</span>}
        <span>Powered by caffeine.ai</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Template Switcher component
// ──────────────────────────────────────────────

interface TemplateSwitcherProps {
  selected: InvoiceTemplateKey;
  onChange: (t: InvoiceTemplateKey) => void;
}

function TemplateSwitcher({ selected, onChange }: TemplateSwitcherProps) {
  const templates: {
    key: InvoiceTemplateKey;
    label: string;
    desc: string;
    preview: React.ReactNode;
  }[] = [
    {
      key: "default",
      label: "Default",
      desc: "Clean & minimal",
      preview: (
        <div className="w-full h-10 flex flex-col gap-0.5 p-1">
          <div className="h-2 bg-primary/40 rounded w-2/3 mx-auto" />
          <div className="h-1 bg-muted rounded w-full" />
          <div className="h-1 bg-muted rounded w-4/5" />
          <div className="h-2 bg-primary/20 rounded w-full mt-0.5" />
        </div>
      ),
    },
    {
      key: "retail",
      label: "Classic Retail",
      desc: "GST invoice layout",
      preview: (
        <div className="w-full h-10 flex flex-col gap-0.5 p-1">
          <div className="h-2 bg-blue-800 rounded w-full" />
          <div className="h-1 bg-blue-200 rounded w-full" />
          <div className="h-1 bg-muted rounded w-full" />
          <div className="h-1 bg-muted rounded w-3/4" />
          <div className="h-1.5 bg-blue-800 rounded w-full mt-0.5" />
        </div>
      ),
    },
    {
      key: "courier",
      label: "Courier Style",
      desc: "DTDC-style layout",
      preview: (
        <div className="w-full h-10 flex flex-col gap-0.5 p-1">
          <div className="flex gap-1">
            <div className="h-4 bg-blue-600 rounded w-4" />
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              <div className="h-1 bg-blue-800 rounded w-3/4" />
              <div className="h-0.5 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="h-1.5 bg-blue-600 rounded w-full" />
          <div className="h-1 bg-muted rounded w-full" />
          <div className="h-1.5 bg-blue-600 rounded w-full mt-0.5" />
        </div>
      ),
    },
  ];

  return (
    <div className="no-print flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border border-border">
      <span className="text-xs text-muted-foreground self-center mr-1 shrink-0">
        Template:
      </span>
      {templates.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          data-ocid="invoice.template.toggle"
          className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-left cursor-pointer ${
            selected === t.key
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-border bg-white hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          <div className="w-full">{t.preview}</div>
          <div className="text-center">
            <div className="text-xs font-semibold leading-tight">{t.label}</div>
            <div className="text-[9px] text-muted-foreground">{t.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// EmailInvoiceDialog
// ──────────────────────────────────────────────

type EmailTemplate = "standard" | "friendly" | "reminder";

interface EmailInvoiceDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
}

function EmailInvoiceDialog({ invoice, onClose }: EmailInvoiceDialogProps) {
  const { customers, activeCompany } = useAppStore();

  const customer = useMemo(
    () => customers.find((c) => c.id === invoice?.customerId),
    [customers, invoice?.customerId],
  );

  const buildTemplate = (tmpl: EmailTemplate, inv: Invoice): string => {
    const customerName = inv.customerName || "Valued Customer";
    const invoiceNo = inv.invoiceNo;
    const date = formatDate(inv.date);
    const total = formatCurrency(inv.total);
    const paymentStatus =
      inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1);
    const companyName = activeCompany?.name || "SKS Global Export";
    const companyPhone = activeCompany?.phone || "";
    const companyEmail = activeCompany?.email || "";

    switch (tmpl) {
      case "standard":
        return `Dear ${customerName},

Please find attached the invoice ${invoiceNo} dated ${date} for your records.

Invoice Details:
- Invoice No: ${invoiceNo}
- Date: ${date}
- Amount: ${total}
- Status: ${paymentStatus}

Please process the payment at your earliest convenience.

For any queries, please feel free to contact us.

Thank you for your business.

Best regards,
${companyName}${companyPhone ? `\n${companyPhone}` : ""}${companyEmail ? `\n${companyEmail}` : ""}`;

      case "friendly":
        return `Hi ${customerName},

Hope you're doing well! I'm sending across invoice ${invoiceNo} for ${total}.

Quick summary:
• Invoice No: ${invoiceNo}
• Date: ${date}
• Total Amount: ${total}
• Payment Status: ${paymentStatus}

Let me know if you have any questions. Always happy to help!

Thanks,
${companyName}`;

      case "reminder":
        return `Dear ${customerName},

This is a friendly reminder regarding invoice ${invoiceNo} dated ${date}.

Outstanding Amount: ${total}
Invoice No: ${invoiceNo}
Due Status: ${paymentStatus}

We would appreciate prompt payment to keep our records updated.

If you have already processed the payment, please disregard this message.

Regards,
${companyName}${companyPhone ? `\n${companyPhone}` : ""}`;
    }
  };

  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate>("standard");
  const [toEmail, setToEmail] = useState(customer?.email || "");
  const [ccEmail, setCcEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Reset form fields when the invoice changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset only when invoice id changes
  useEffect(() => {
    if (!invoice) return;
    setToEmail(customer?.email || "");
    setCcEmail("");
    setSubject(
      `Invoice ${invoice.invoiceNo} from ${activeCompany?.name || "SKS Global Export"}`,
    );
    setMessage(buildTemplate("standard", invoice));
    setSelectedTemplate("standard");
  }, [invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTemplateChange = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl);
    if (invoice) {
      setMessage(buildTemplate(tmpl, invoice));
    }
  };

  const handleOpenInEmailApp = () => {
    if (!invoice) return;
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?${ccEmail ? `cc=${encodeURIComponent(ccEmail)}&` : ""}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, "_blank");
  };

  const handleCopyMessage = () => {
    const content = `Subject: ${subject}\n\n${message}`;
    navigator.clipboard
      .writeText(content)
      .then(() => toast.success("Message copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  if (!invoice) return null;

  const templateButtons: { key: EmailTemplate; label: string }[] = [
    { key: "standard", label: "Standard" },
    { key: "friendly", label: "Friendly" },
    { key: "reminder", label: "Reminder" },
  ];

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        data-ocid="invoice.email.dialog"
      >
        <DialogHeader className="pb-2 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Send Invoice via Email
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invoice{" "}
            <span className="font-mono font-semibold text-foreground">
              {invoice.invoiceNo}
            </span>{" "}
            · {formatCurrency(invoice.total)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4 min-h-0">
          {/* Info banner */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700">
            <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Email will open in your default email client (Gmail, Outlook,
              etc.). <strong>Download the PDF separately</strong> to attach it
              to the email.
            </span>
          </div>

          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Message Template
            </Label>
            <div
              className="flex gap-2"
              data-ocid="invoice.email.template.select"
            >
              {templateButtons.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTemplateChange(t.key)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-all ${
                    selectedTemplate === t.key
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* To field */}
          <div className="space-y-1.5">
            <Label htmlFor="email-to" className="text-sm font-medium">
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-to"
              type="email"
              placeholder="customer@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              data-ocid="invoice.email.to.input"
            />
          </div>

          {/* CC field */}
          <div className="space-y-1.5">
            <Label htmlFor="email-cc" className="text-sm font-medium">
              CC{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="email-cc"
              type="email"
              placeholder="cc@example.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              data-ocid="invoice.email.cc.input"
            />
          </div>

          {/* Subject field */}
          <div className="space-y-1.5">
            <Label htmlFor="email-subject" className="text-sm font-medium">
              Subject
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-ocid="invoice.email.subject.input"
            />
          </div>

          {/* Message body */}
          <div className="space-y-1.5">
            <Label htmlFor="email-message" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="email-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="font-mono text-xs leading-relaxed resize-none"
              data-ocid="invoice.email.message.textarea"
            />
          </div>

          {/* Attachment note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-dashed border-border">
            <span className="text-base">📎</span>
            <span>
              Invoice PDF will be attached when downloaded separately using the
              PDF button.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border shrink-0 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 text-xs text-muted-foreground self-center hidden sm:block">
            Opens your default email app (Gmail, Outlook, etc.)
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              data-ocid="invoice.email.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyMessage}
              data-ocid="invoice.email.copy.button"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copy Message
            </Button>
            <Button
              onClick={handleOpenInEmailApp}
              data-ocid="invoice.email.send.button"
            >
              <Mail className="w-4 h-4 mr-1.5" />
              Open in Email App
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const { activeCompany, settings, updateSettings } = useAppStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "jpeg" | "png" | null>(
    null,
  );
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateKey>(
    () => (settings?.invoiceTemplate ?? "default") as InvoiceTemplateKey,
  );

  const handleTemplateChange = (t: InvoiceTemplateKey) => {
    setSelectedTemplate(t);
    if (settings) {
      updateSettings({ ...settings, invoiceTemplate: t });
    }
  };

  const handlePrint = async () => {
    if (!invoice || !printRef.current) return;
    setPrinting(true);
    try {
      // Clone the print area so we can mutate it for print without affecting the UI
      const clone = printRef.current.cloneNode(true) as HTMLElement;

      // Replace every <canvas> in the clone with an <img> using its pixel data
      const canvases = printRef.current.querySelectorAll("canvas");
      const cloneCanvases = clone.querySelectorAll("canvas");
      canvases.forEach((canvas, i) => {
        try {
          const dataUrl = canvas.toDataURL("image/png");
          const img = document.createElement("img");
          img.src = dataUrl;
          img.width = canvas.width || 100;
          img.height = canvas.height || 100;
          img.style.display = "block";
          cloneCanvases[i]?.parentNode?.replaceChild(img, cloneCanvases[i]);
        } catch {
          // ignore cross-origin canvas errors
        }
      });

      // If no canvas was found (QR not yet drawn), generate QR data URL as fallback
      if (canvases.length === 0 && activeCompany?.upiId) {
        const upiUrl = buildUpiUrl(
          activeCompany.upiId,
          activeCompany.upiName || activeCompany.name,
          invoice.total,
          `Invoice ${invoice.invoiceNo}`,
        );
        const qrDataUrl = await generateQRDataUrl(upiUrl, 100);
        if (qrDataUrl) {
          // Find the payment QR section and inject the image
          const qrSection = clone.querySelector(
            '[data-ocid="payment_qr.section"]',
          );
          if (qrSection) {
            const img = document.createElement("img");
            img.src = qrDataUrl;
            img.width = 100;
            img.height = 100;
            img.style.display = "block";
            qrSection.innerHTML = "";
            qrSection.appendChild(img);
          }
        }
      }

      const html = clone.innerHTML;

      const printWindow = window.open("", "_blank", "width=900,height=1200");
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups for this site.");
        return;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { border-collapse: collapse; }
    img { max-width: 100%; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
${html}
</body>
</html>`);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 600);
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !printRef.current) return;
    setDownloading("pdf");
    try {
      await downloadAsPDF(printRef.current, `Invoice-${invoice.invoiceNo}.pdf`);
    } catch {
      toast.error("PDF download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadJPEG = async () => {
    if (!invoice || !printRef.current) return;
    setDownloading("jpeg");
    try {
      await downloadAsJPEG(
        printRef.current,
        `Invoice-${invoice.invoiceNo}.jpg`,
      );
    } catch {
      toast.error("JPEG download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Invoice {invoice?.invoiceNo}</DialogTitle>
        </DialogHeader>

        {invoice && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Template switcher */}
            <TemplateSwitcher
              selected={selectedTemplate}
              onChange={handleTemplateChange}
            />

            {/* Printable invoice area */}
            <div
              ref={printRef}
              id="invoice-print"
              style={{ background: "white" }}
            >
              {selectedTemplate === "default" && (
                <TemplateDefault
                  invoice={invoice}
                  company={activeCompany}
                  settings={settings}
                />
              )}
              {selectedTemplate === "retail" && (
                <TemplateRetail
                  invoice={invoice}
                  company={activeCompany}
                  settings={settings}
                />
              )}
              {selectedTemplate === "courier" && (
                <TemplateCourier
                  invoice={invoice}
                  company={activeCompany}
                  settings={settings}
                />
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={handlePrint}
            variant="outline"
            disabled={printing || !!downloading}
          >
            <Printer className="w-4 h-4 mr-2" />
            {printing ? "Preparing..." : "Print"}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={printing || !!downloading}
            data-ocid="invoice.download_pdf.button"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading === "pdf" ? "Downloading..." : "PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadJPEG}
            disabled={printing || !!downloading}
            data-ocid="invoice.download_jpeg.button"
          >
            <FileImage className="w-4 h-4 mr-2" />
            {downloading === "jpeg" ? "Downloading..." : "JPEG"}
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
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(true)}
                data-ocid="invoice.email.button"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </>
          )}
        </div>

        {/* Email Dialog (nested inside view dialog) */}
        {showEmailDialog && invoice && (
          <EmailInvoiceDialog
            invoice={invoice}
            onClose={() => setShowEmailDialog(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Searchable Customer Select ─────────────────────────────────────────────

interface SearchCustomerOption {
  id: string;
  name: string;
}

function CustomerSearchSelect({
  value,
  onChange,
  customers,
}: {
  value: string;
  onChange: (v: string) => void;
  customers: SearchCustomerOption[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedName =
    customers.find((c) => c.id === value)?.name ?? (value === "all" ? "" : "");
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full sm:w-48">
      <div
        className="flex items-center border rounded-md px-3 py-2 text-sm bg-background cursor-text gap-1"
        onClick={() => setOpen(true)}
        onKeyUp={() => setOpen(true)}
      >
        <input
          className="flex-1 outline-none bg-transparent text-sm placeholder:text-muted-foreground min-w-0"
          placeholder="All Customers"
          value={open ? query : selectedName || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value !== "all" && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground ml-1"
            onClick={(e) => {
              e.stopPropagation();
              onChange("all");
              setQuery("");
              setOpen(false);
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-border rounded-md shadow-lg mt-1 max-h-52 overflow-y-auto">
          <div
            className="px-3 py-2 text-sm hover:bg-muted cursor-pointer text-muted-foreground"
            onMouseDown={() => {
              onChange("all");
              setQuery("");
              setOpen(false);
            }}
          >
            All Customers
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No customers found
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`px-3 py-2 text-sm hover:bg-muted cursor-pointer ${value === c.id ? "bg-primary/10 font-medium" : ""}`}
                onMouseDown={() => {
                  onChange(c.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {c.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
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
    invoices,
    customers,
    addInvoice,
    updateBill,
    settings,
    updateSettings,
    activeCompanyId,
    activeCompany,
    currentUser,
  } = useAppStore();

  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterInvoiced, setFilterInvoiced] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingInvoiceType, setPendingInvoiceType] = useState<
    "gst" | "non_gst"
  >("gst");
  const [invoiceFromDate, setInvoiceFromDate] = useState("");
  const [invoiceToDate, setInvoiceToDate] = useState("");
  const [showCourierStatusInInvoice, setShowCourierStatusInInvoice] =
    useState(true);
  const [genFreightCharges, setGenFreightCharges] = useState("");
  const [genDiscount, setGenDiscount] = useState("");

  // Build a map from billId -> invoiceNo for quick lookup
  const billInvoiceMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const inv of invoices) {
      for (const bid of inv.billIds || []) {
        map[bid] = inv.invoiceNo;
      }
    }
    return map;
  }, [invoices]);

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
        isInvoiced: !!(bill.isInvoiced || billInvoiceMap[bill.id]),
        invoiceNo: billInvoiceMap[bill.id],
      })),
    );
  }, [bills, billInvoiceMap]);

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
      const matchInvoiced =
        filterInvoiced === "all" ||
        (filterInvoiced === "invoiced" && item.isInvoiced) ||
        (filterInvoiced === "not_invoiced" && !item.isInvoiced);
      return (
        matchCustomer &&
        matchDateFrom &&
        matchDateTo &&
        matchCategory &&
        matchInvoiced
      );
    });
  }, [
    flatItems,
    filterCustomer,
    filterDateFrom,
    filterDateTo,
    filterCategory,
    filterInvoiced,
  ]);

  // row key = `${billId}_${itemId}`
  const rowKey = (item: FlatBillItem) => `${item.billId}_${item.id}`;

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleAll = () => {
    const selectableKeys = filteredItems
      .filter((i) => !i.isInvoiced)
      .map(rowKey);
    if (
      selectableKeys.every((k) => selectedKeys.includes(k)) &&
      selectableKeys.length > 0
    ) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(selectableKeys);
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
    setFilterInvoiced("all");
  };

  const hasFilters =
    filterCustomer !== "all" ||
    filterDateFrom ||
    filterDateTo ||
    filterCategory !== "all" ||
    filterInvoiced !== "all";

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
    // Taxable base (excl. GST) — reverse-calculate from GST-inclusive totalPrice
    const subtotal = allBillItems.reduce(
      (sum, i) => sum + (i.totalPrice * 100) / (100 + (i.gstRate || 0)),
      0,
    );
    // Grand total = sum of all GST-inclusive item totals
    const grandTotal = allBillItems.reduce((sum, i) => sum + i.totalPrice, 0);

    const cgst =
      pendingInvoiceType === "gst"
        ? allBillItems.reduce(
            (sum, i) =>
              sum + (i.totalPrice * i.gstRate) / (100 + i.gstRate) / 2,
            0,
          )
        : 0;
    const sgst = cgst;

    // ── Sequence logic ──────────────────────────────────────────────────────
    let invoiceNo: string;
    if (pendingInvoiceType === "gst") {
      const companyGstin = activeCompany?.gstin?.trim();
      if (companyGstin) {
        const seq = nextGSTInvoiceSeq(companyGstin);
        invoiceNo = generateBillNo(settings.gstInvoicePrefix, seq);
      } else {
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
      const seq = nextNonGSTInvoiceSeq(activeCompanyId);
      invoiceNo = generateBillNo(settings.nonGstInvoicePrefix, seq);
    }

    const billIds = [...new Set(selectedItems.map((i) => i.billId))];

    const genFreight = Number(genFreightCharges) || 0;
    const genDisc = Number(genDiscount) || 0;
    // Adjust totals with freight and discount
    const adjTotal = grandTotal + genFreight - genDisc;
    const adjSubtotal = subtotal - genDisc + genFreight;

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
      subtotal: adjSubtotal,
      cgst,
      sgst,
      igst: 0,
      total: adjTotal,
      paymentMethod: "cash",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username,
      fromDate: invoiceFromDate || undefined,
      toDate: invoiceToDate || undefined,
      showCourierStatus: showCourierStatusInInvoice,
      freightCharges: genFreight > 0 ? genFreight : undefined,
      discount: genDisc > 0 ? genDisc : undefined,
    };

    addInvoice(invoice);

    for (const billId of billIds) {
      const bill = bills.find((b) => b.id === billId);
      if (bill) {
        updateBill({ ...bill, isInvoiced: true, invoiceId: invoice.id });
      }
    }

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
          <CustomerSearchSelect
            value={filterCustomer}
            onChange={setFilterCustomer}
            customers={uniqueCustomers}
          />
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
          <Select value={filterInvoiced} onValueChange={setFilterInvoiced}>
            <SelectTrigger className="text-sm w-full sm:w-40">
              <SelectValue placeholder="Invoice Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
              <SelectItem value="invoiced">Already Invoiced</SelectItem>
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
          {filteredItems.filter((i) => i.isInvoiced).length > 0 && (
            <span className="ml-2 text-blue-600">
              · {filteredItems.filter((i) => i.isInvoiced).length} already
              invoiced
            </span>
          )}
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
                      filteredItems.filter((i) => !i.isInvoiced).length > 0 &&
                      filteredItems
                        .filter((i) => !i.isInvoiced)
                        .every((i) => selectedKeys.includes(rowKey(i)))
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-xs">Bill No / Invoice No</TableHead>
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
                      className={`hover:bg-muted/20 transition-colors ${item.isInvoiced ? "bg-blue-50/40" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedKeys.includes(key)}
                          onCheckedChange={() =>
                            !item.isInvoiced && toggleSelect(key)
                          }
                          disabled={item.isInvoiced}
                          title={
                            item.isInvoiced
                              ? "Invoice generated — delete invoice first to re-select"
                              : undefined
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs min-w-[120px]">
                        <p className="font-mono font-semibold text-xs">
                          {item.billNo}
                        </p>
                        {item.isInvoiced && item.invoiceNo && (
                          <div className="mt-0.5">
                            <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200 font-mono">
                              {item.invoiceNo}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(item.billDate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.customerName}
                      </TableCell>
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
                          <p className="text-muted-foreground text-xs break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                        {item.awbSerial &&
                          item.productName !== item.awbSerial && (
                            <p className="text-muted-foreground text-xs break-words whitespace-normal">
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
                Selected items belong to different customers. Please select
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
            {/* Invoice Period (optional) */}
            <div className="space-y-2">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Invoice Period (optional)
              </p>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={invoiceFromDate}
                    onChange={(e) => setInvoiceFromDate(e.target.value)}
                    className="mt-1 text-xs h-8"
                    data-ocid="invoice.generate.from_date.input"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={invoiceToDate}
                    onChange={(e) => setInvoiceToDate(e.target.value)}
                    className="mt-1 text-xs h-8"
                    data-ocid="invoice.generate.to_date.input"
                  />
                </div>
              </div>
              {invoiceFromDate && invoiceToDate && (
                <p className="text-xs text-primary font-medium">
                  Period:{" "}
                  {new Date(invoiceFromDate).toLocaleDateString("en-IN")} to{" "}
                  {new Date(invoiceToDate).toLocaleDateString("en-IN")} will be
                  shown on the invoice.
                </p>
              )}
            </div>
            {/* Courier Status toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Show Courier Status</p>
                <p className="text-xs text-muted-foreground">
                  Show tracking status next to brand & mode in invoice
                </p>
              </div>
              <Switch
                checked={showCourierStatusInInvoice}
                onCheckedChange={setShowCourierStatusInInvoice}
                data-ocid="invoice.generate.courier_status.switch"
              />
            </div>
            {/* Freight & Discount */}
            {pendingInvoiceType === "gst" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
                <p className="text-sm font-semibold text-blue-800">
                  Adjustments (before GST)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">
                      Discount (₹)
                    </Label>
                    <Input
                      type="number"
                      value={genDiscount}
                      onChange={(e) => setGenDiscount(e.target.value)}
                      placeholder="0.00"
                      className="text-sm bg-white"
                      data-ocid="invoice.gen_discount.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">
                      Freight Charges (₹)
                    </Label>
                    <Input
                      type="number"
                      value={genFreightCharges}
                      onChange={(e) => setGenFreightCharges(e.target.value)}
                      placeholder="0.00"
                      className="text-sm bg-white"
                      data-ocid="invoice.gen_freight.input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={doGenerate}
              data-ocid="invoice.generate.confirm_button"
            >
              Generate Invoice
            </Button>
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
  const {
    invoices,
    bills,
    activeCompany,
    updateInvoice,
    updateBill,
    deleteInvoice,
  } = useAppStore();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);

  // Edit form state
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editInvoiceNo, setEditInvoiceNo] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerAddress, setEditCustomerAddress] = useState("");
  const [editCustomerGstin, setEditCustomerGstin] = useState("");
  const [editFreightCharges, setEditFreightCharges] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editItems, setEditItems] = useState<BillItem[]>([]);

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
    setEditDate(inv.date);
    setEditInvoiceNo(inv.invoiceNo);
    setEditCustomerName(inv.customerName);
    setEditCustomerAddress(inv.customerAddress || "");
    setEditCustomerGstin(inv.customerGstin || "");
    setEditFreightCharges(String(inv.freightCharges ?? ""));
    setEditDiscount(String(inv.discount ?? ""));
    setEditAmountPaid(String(inv.amountPaid ?? ""));
    setEditItems(inv.items.map((i) => ({ ...i })));
  };

  const recalcInvoiceTotals = (
    items: BillItem[],
    freight: number,
    disc: number,
    invType: "gst" | "non_gst",
  ) => {
    const itemsSubtotal = items.reduce(
      (s, i) => s + (i.totalPrice * 100) / (100 + (i.gstRate || 0)),
      0,
    );
    const afterDiscount = itemsSubtotal - disc;
    const taxableAmount = afterDiscount + freight;
    const cgst =
      invType === "gst"
        ? items.reduce(
            (s, i) => s + (i.totalPrice * i.gstRate) / (100 + i.gstRate) / 2,
            0,
          )
        : 0;
    const sgst = cgst;
    const itemsTotal = items.reduce((s, i) => s + i.totalPrice, 0);
    const total = itemsTotal + freight - disc;
    return { subtotal: taxableAmount, cgst, sgst, total };
  };

  const saveEdit = () => {
    if (!editInvoice) return;
    const freight = Number(editFreightCharges) || 0;
    const disc = Number(editDiscount) || 0;
    const amtPaid = Number(editAmountPaid) || 0;
    const { subtotal, cgst, sgst, total } = recalcInvoiceTotals(
      editItems,
      freight,
      disc,
      editInvoice.invoiceType,
    );
    const updatedInvoice = {
      ...editInvoice,
      date: editDate,
      invoiceNo: editInvoiceNo,
      customerName: editCustomerName,
      customerAddress: editCustomerAddress,
      customerGstin: editCustomerGstin,
      paymentStatus: editPaymentStatus,
      paymentMethod: editPaymentMethod,
      notes: editNotes,
      freightCharges: freight > 0 ? freight : undefined,
      discount: disc > 0 ? disc : undefined,
      amountPaid: amtPaid > 0 ? amtPaid : undefined,
      items: editItems,
      subtotal,
      cgst,
      sgst,
      total,
    };
    updateInvoice(updatedInvoice);
    // Sync payment info to linked bills
    if (updatedInvoice.billIds && updatedInvoice.billIds.length > 0) {
      for (const billId of updatedInvoice.billIds) {
        const bill = bills.find((b) => b.id === billId);
        if (bill) {
          updateBill({
            ...bill,
            paymentStatus: updatedInvoice.paymentStatus as
              | "paid"
              | "partial"
              | "pending",
            paymentMethod: (updatedInvoice.paymentMethod ||
              bill.paymentMethod) as
              | "cash"
              | "upi"
              | "card"
              | "credit"
              | "mixed",
            amountPaid: updatedInvoice.amountPaid ?? bill.amountPaid,
            balanceDue: Math.max(
              0,
              bill.total - (updatedInvoice.amountPaid ?? bill.amountPaid ?? 0),
            ),
          });
        }
      }
    }
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
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {inv.createdBy || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View"
                          onClick={() => setViewInvoice(inv)}
                          data-ocid="invoice.history.button"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEditDialog(inv)}
                          data-ocid="invoice.edit_button"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Send Email"
                          onClick={() => setEmailInvoice(inv)}
                          data-ocid="invoice.email.button"
                        >
                          <Mail className="w-3.5 h-3.5" />
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
                          data-ocid="invoice.delete_button"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice — {editInvoice?.invoiceNo}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update invoice details, charges, and line items
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="basic" className="text-xs">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs">
                Customer
              </TabsTrigger>
              <TabsTrigger value="items" className="text-xs">
                Items & Charges
              </TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Date</Label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="text-sm"
                    data-ocid="invoice.date.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <Input
                    value={editInvoiceNo}
                    onChange={(e) => setEditInvoiceNo(e.target.value)}
                    className="text-sm"
                    data-ocid="invoice.number.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Status</Label>
                  <Select
                    value={editPaymentStatus}
                    onValueChange={setEditPaymentStatus}
                  >
                    <SelectTrigger className="text-sm">
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
                    onValueChange={setEditPaymentMethod}
                  >
                    <SelectTrigger className="text-sm">
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
              </div>
              {editPaymentStatus === "partial" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount Paid (₹)</Label>
                  <Input
                    type="number"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                    className="text-sm"
                    placeholder="0.00"
                    data-ocid="invoice.amount_paid.input"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </TabsContent>
            <TabsContent value="customer" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Name</Label>
                <Input
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="text-sm"
                  data-ocid="invoice.customer_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Address</Label>
                <Textarea
                  value={editCustomerAddress}
                  onChange={(e) => setEditCustomerAddress(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              {editInvoice?.invoiceType === "gst" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Customer GSTIN</Label>
                  <Input
                    value={editCustomerGstin}
                    onChange={(e) => setEditCustomerGstin(e.target.value)}
                    className="text-sm"
                    placeholder="15-digit GSTIN"
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="items" className="space-y-3 mt-3">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 text-xs font-semibold">
                  Line Items
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left p-2">Product</th>
                        <th className="text-right p-2 w-16">Qty</th>
                        <th className="text-right p-2 w-24">Rate (₹)</th>
                        <th className="text-right p-2 w-16">GST%</th>
                        <th className="text-right p-2 w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, idx) => (
                        <tr
                          key={`item-${item.productId ?? idx}-${idx}`}
                          className="border-b border-border/50"
                        >
                          <td className="p-2 text-xs">{item.productName}</td>
                          <td className="p-1">
                            <Input
                              type="number"
                              value={item.quantity}
                              className="h-6 text-xs text-right"
                              onChange={(e) => {
                                const updated = [...editItems];
                                const q = Number(e.target.value) || 1;
                                updated[idx] = {
                                  ...updated[idx],
                                  quantity: q,
                                  totalPrice: q * updated[idx].unitPrice,
                                };
                                setEditItems(updated);
                              }}
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              className="h-6 text-xs text-right"
                              onChange={(e) => {
                                const updated = [...editItems];
                                const p = Number(e.target.value) || 0;
                                updated[idx] = {
                                  ...updated[idx],
                                  unitPrice: p,
                                  totalPrice: updated[idx].quantity * p,
                                };
                                setEditItems(updated);
                              }}
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              value={item.gstRate}
                              className="h-6 text-xs text-right"
                              onChange={(e) => {
                                const updated = [...editItems];
                                updated[idx] = {
                                  ...updated[idx],
                                  gstRate: Number(e.target.value) || 0,
                                };
                                setEditItems(updated);
                              }}
                            />
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {editInvoice?.invoiceType === "gst" && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                  <p className="text-xs font-semibold text-blue-800">
                    Adjustments (applied before GST calculation)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-700">
                        Discount (₹) — deducted before GST
                      </Label>
                      <Input
                        type="number"
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                        placeholder="0.00"
                        className="text-sm bg-white"
                        data-ocid="invoice.discount.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-700">
                        Freight Charges (₹) — added before GST
                      </Label>
                      <Input
                        type="number"
                        value={editFreightCharges}
                        onChange={(e) => setEditFreightCharges(e.target.value)}
                        placeholder="0.00"
                        className="text-sm bg-white"
                        data-ocid="invoice.freight.input"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-200">
                    {(() => {
                      const freight = Number(editFreightCharges) || 0;
                      const disc = Number(editDiscount) || 0;
                      const itemsBase = editItems.reduce(
                        (s, i) =>
                          s + (i.totalPrice * 100) / (100 + (i.gstRate || 0)),
                        0,
                      );
                      const taxable = itemsBase - disc + freight;
                      const cgst = editItems.reduce(
                        (s, i) =>
                          s +
                          (i.totalPrice * i.gstRate) / (100 + i.gstRate) / 2,
                        0,
                      );
                      const grandTotal =
                        editItems.reduce((s, i) => s + i.totalPrice, 0) +
                        freight -
                        disc;
                      return (
                        <div className="grid grid-cols-2 gap-1 text-xs text-blue-800">
                          <span>Items Subtotal:</span>
                          <span className="text-right font-medium">
                            {formatCurrency(itemsBase)}
                          </span>
                          {disc > 0 && (
                            <>
                              <span className="text-red-600">− Discount:</span>
                              <span className="text-right text-red-600">
                                −{formatCurrency(disc)}
                              </span>
                            </>
                          )}
                          {freight > 0 && (
                            <>
                              <span className="text-green-700">+ Freight:</span>
                              <span className="text-right text-green-700">
                                +{formatCurrency(freight)}
                              </span>
                            </>
                          )}
                          <span className="font-semibold border-t border-blue-200 pt-1">
                            Taxable Amount:
                          </span>
                          <span className="text-right font-semibold border-t border-blue-200 pt-1">
                            {formatCurrency(taxable)}
                          </span>
                          <span>CGST + SGST:</span>
                          <span className="text-right">
                            {formatCurrency(cgst * 2)}
                          </span>
                          <span className="font-bold text-blue-900 text-sm">
                            Grand Total:
                          </span>
                          <span className="text-right font-bold text-blue-900 text-sm">
                            {formatCurrency(grandTotal)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditInvoice(null)}
              data-ocid="invoice.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} data-ocid="invoice.save_button">
              Save Changes
            </Button>
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

      {/* Email Invoice Dialog */}
      <EmailInvoiceDialog
        invoice={emailInvoice}
        onClose={() => setEmailInvoice(null)}
      />
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
