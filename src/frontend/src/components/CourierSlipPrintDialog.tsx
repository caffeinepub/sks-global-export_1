import type React from "react";
import { useState } from "react";
import type { BillItem } from "../types";
import { BarcodeDisplay } from "./BarcodeDisplay";

interface CourierSlipPrintDialogProps {
  open: boolean;
  onClose: () => void;
  item: BillItem;
  billNo: string;
  billDate: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
  companyGstin?: string;
  companyEmail?: string;
  brandLogoUrl?: string;
}

const BRAND_INFO: Record<
  string,
  { website: string; email: string; phone: string; address: string }
> = {
  DTDC: {
    website: "www.dtdc.in",
    email: "customersupport@dtdc.com",
    phone: "+91-9606911811",
    address: "No. 3, Victoria Road, Bengaluru – 560047",
  },
  BlueDart: {
    website: "www.bluedart.com",
    email: "care@bluedart.com",
    phone: "1860-233-1234",
    address: "Sahar Airport Road, Andheri East, Mumbai – 400099",
  },
  Delhivery: {
    website: "www.delhivery.com",
    email: "support@delhivery.com",
    phone: "011-7170-6000",
    address: "NH 8, Bilaspur, Gurugram – 122413",
  },
  FedEx: {
    website: "www.fedex.com",
    email: "customer.service@fedex.com",
    phone: "1800-209-6161",
    address: "Koramangala, Bengaluru – 560034",
  },
  DHL: {
    website: "www.dhl.com",
    email: "customer.service@dhl.com",
    phone: "1800-111-345",
    address: "Andheri East, Mumbai – 400059",
  },
};

function formatSlipDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} ${d.getFullYear()}`;
}

function extractCity(address?: string): string {
  if (!address) return "—";
  const parts = address.split(",").map((s) => s.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part && !/^\d{5,6}$/.test(part) && part.length > 1) return part;
  }
  return parts[0] || "—";
}

type CopyKey = "sender" | "account" | "pod";
const COPY_LABELS: Record<CopyKey, string> = {
  sender: "SENDER COPY",
  account: "ACCOUNT COPY",
  pod: "POD COPY",
};

interface CourierSlipCopyProps {
  item: BillItem;
  billNo: string;
  billDate: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
  brandLogoUrl?: string;
  copyLabel: string;
}

function CourierSlipCopy({
  item,
  billNo,
  billDate,
  companyName,
  companyAddress,
  companyPhone,
  brandLogoUrl,
  copyLabel,
}: CourierSlipCopyProps) {
  const brandName = item.brandName || "Courier";
  const brandInfo = BRAND_INFO[brandName];
  const brandAddress = brandInfo ? brandInfo.address : brandName;
  const brandPhone = brandInfo ? brandInfo.phone : "";
  const brandWebsite = brandInfo ? brandInfo.website : "";
  const brandEmail = brandInfo ? brandInfo.email : "";

  const senderCity = extractCity(item.senderAddress);
  const receiverCity = item.receiverCity || extractCity(item.receiverAddress);

  const productLabel = item.serviceMode || item.brandName || "Standard";
  const isDocument = item.serviceMode?.toLowerCase().includes("doc");
  const typeLabel = isDocument ? "Document" : "Non Document (Parcel)";
  const contentSpec = isDocument ? "No Information" : "General Goods";

  const formattedDate = formatSlipDate(billDate);

  const cellStyle: React.CSSProperties = {
    border: "1px solid #1a1a1a",
    padding: "3px 4px",
    verticalAlign: "top",
    fontSize: "8px",
    fontFamily: "Arial, sans-serif",
  };
  const labelStyle: React.CSSProperties = { fontWeight: 700 };

  return (
    <div
      style={{
        border: "2px solid #000",
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        backgroundColor: "#fff",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <tbody>
          {/* ROW 1 */}
          <tr>
            {/* Col 1: Brand logo only */}
            <td style={{ ...cellStyle, width: "20%", textAlign: "center" }}>
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt="Brand Logo"
                  crossOrigin="anonymous"
                  style={{
                    maxHeight: 60,
                    maxWidth: 110,
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 60,
                    height: 60,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    fontSize: 9,
                    color: "#9ca3af",
                  }}
                >
                  {brandName}
                </div>
              )}
            </td>

            {/* Col 2: Brand address */}
            <td style={{ ...cellStyle, width: "30%" }}>
              <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2 }}>
                {brandName}
              </div>
              <div>{brandAddress}</div>
              {brandPhone && (
                <div>
                  <span style={labelStyle}>Ph: </span>
                  {brandPhone}
                </div>
              )}
            </td>

            {/* Col 3: Origin/Dest/Product/Type/Date */}
            <td style={{ ...cellStyle, width: "50%", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        ...cellStyle,
                        width: "50%",
                        border: "0",
                        borderBottom: "1px solid #1a1a1a",
                        borderRight: "1px solid #1a1a1a",
                      }}
                    >
                      <span style={labelStyle}>Origin: </span>
                      {senderCity}
                    </td>
                    <td
                      style={{
                        ...cellStyle,
                        width: "50%",
                        border: "0",
                        borderBottom: "1px solid #1a1a1a",
                      }}
                    >
                      <span style={labelStyle}>Dest: </span>
                      {receiverCity}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        ...cellStyle,
                        border: "0",
                        borderBottom: "1px solid #1a1a1a",
                        borderRight: "1px solid #1a1a1a",
                      }}
                    >
                      <span style={labelStyle}>Product: </span>
                      {productLabel}
                    </td>
                    <td
                      style={{
                        ...cellStyle,
                        border: "0",
                        borderBottom: "1px solid #1a1a1a",
                      }}
                    >
                      <span style={labelStyle}>Type: </span>
                      {typeLabel}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ ...cellStyle, border: "0" }}>
                      <span style={labelStyle}>Date: </span>
                      {formattedDate}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ROW 2: Sender / Receiver */}
          <tr>
            <td colSpan={2} style={{ ...cellStyle, width: "50%" }}>
              <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 9 }}>
                SENDER DETAILS
              </div>
              <div>
                <span style={labelStyle}>Name: </span>
                {item.senderName || "—"}
              </div>
              <div>
                <span style={labelStyle}>Address: </span>
                {item.senderAddress || "—"}
              </div>
              <div>
                <span style={labelStyle}>Phone: </span>
                {item.senderPhone || "—"}
              </div>
            </td>
            <td style={{ ...cellStyle, width: "50%" }}>
              <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 9 }}>
                RECEIVER DETAILS
              </div>
              <div>
                <span style={labelStyle}>Name: </span>
                {item.receiverName || "—"}
              </div>
              <div>
                <span style={labelStyle}>Address: </span>
                {item.receiverAddress || "—"}
                {item.receiverPincode ? ` - ${item.receiverPincode}` : ""}
                {item.intlCountry ? `, ${item.intlCountry}` : ""}
              </div>
              <div>
                <span style={labelStyle}>Phone: </span>
                {item.receiverPhone || "—"}
              </div>
            </td>
          </tr>

          {/* ROW 3 */}
          <tr>
            {/* Col 1: Content + Branch */}
            <td style={{ ...cellStyle, width: "20%", padding: 0 }}>
              <div
                style={{
                  padding: "3px 4px",
                  borderBottom: "1px solid #1a1a1a",
                  minHeight: "30px",
                }}
              >
                <div style={labelStyle}>Content Specification:</div>
                <div>{contentSpec}</div>
              </div>
              <div style={{ padding: "3px 4px" }}>
                <div style={labelStyle}>Branch/Franchise:</div>
                <div>{companyName}</div>
                {companyAddress && <div>{companyAddress}</div>}
                {companyPhone && <div>{companyPhone}</div>}
              </div>
            </td>

            {/* Col 2: 7 details */}
            <td style={{ ...cellStyle, width: "30%", padding: 0 }}>
              {[
                [
                  "Declared Value",
                  item.itemValue
                    ? `₹${item.itemValue.toLocaleString("en-IN")}`
                    : `₹${item.totalPrice.toFixed(2)}`,
                ],
                ["No. of Pieces", "1"],
                ["Actual Weight", `${item.actualWeightKg ?? "—"} kg`],
                [
                  "Dim",
                  item.volumetricWeightKg
                    ? `${item.volumetricWeightKg} kg`
                    : "—",
                ],
                [
                  "Charged Weight",
                  `${item.chargeableWeightKg ?? item.actualWeightKg ?? "—"} kg`,
                ],
                ["Eway Bill No", item.eWayBillNo || "—"],
                [
                  "Surcharge Charges",
                  item.riskSurchargeAmount
                    ? `₹${item.riskSurchargeAmount.toFixed(2)} (${item.riskSurchargeType === "owner" ? "Owner Risk" : "Carrier Risk"})`
                    : "—",
                ],
              ].map(([label, value], idx, arr) => (
                <div
                  key={label}
                  style={{
                    padding: "2px 4px",
                    borderBottom:
                      idx < arr.length - 1 ? "1px solid #1a1a1a" : undefined,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 8,
                  }}
                >
                  <span style={labelStyle}>{label}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </td>

            {/* Col 3: AWB barcode + Risk Surcharge */}
            <td style={{ ...cellStyle, width: "50%", padding: 0 }}>
              {/* AWB Barcode */}
              <div
                style={{
                  padding: "4px",
                  textAlign: "center",
                  borderBottom: "1px solid #1a1a1a",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    fontFamily: "monospace",
                    marginBottom: 2,
                  }}
                >
                  AWB No : {item.awbSerial || billNo}
                </div>
                {(item.awbSerial || billNo) && (
                  <BarcodeDisplay
                    value={item.awbSerial || billNo}
                    height={32}
                    width={1.3}
                    displayValue={false}
                  />
                )}
              </div>

              {/* Risk Surcharge label */}
              <div
                style={{
                  padding: "2px 4px",
                  borderBottom: "1px solid #1a1a1a",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 9,
                }}
              >
                Risk Surcharge
              </div>

              {/* Risk checkboxes + amount */}
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    flex: "0 0 60%",
                    padding: "3px 4px",
                    borderRight: "1px solid #1a1a1a",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "1px solid #000",
                        flexShrink: 0,
                        background:
                          item.riskSurchargeType === "owner"
                            ? "#000"
                            : "transparent",
                      }}
                    />
                    <span>Owner</span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "1px solid #000",
                        flexShrink: 0,
                        background:
                          item.riskSurchargeType === "carrier"
                            ? "#000"
                            : "transparent",
                      }}
                    />
                    <span>Carrier</span>
                  </div>
                </div>
                <div
                  style={{
                    flex: "0 0 40%",
                    padding: "3px 4px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 8 }}>
                    Risk Surcharge
                  </div>
                  <div>
                    {item.riskSurchargeAmount
                      ? `₹${item.riskSurchargeAmount.toFixed(2)}`
                      : "₹—"}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ROW 4: Footer */}
          <tr>
            <td colSpan={2} style={{ ...cellStyle, width: "50%" }}>
              {brandWebsite && (
                <div>
                  <span style={labelStyle}>Web: </span>
                  {brandWebsite}
                </div>
              )}
              {brandEmail && (
                <div>
                  <span style={labelStyle}>Email: </span>
                  {brandEmail}
                </div>
              )}
              {brandPhone && (
                <div>
                  <span style={labelStyle}>Phone: </span>
                  {brandPhone}
                </div>
              )}
            </td>
            <td style={{ ...cellStyle, width: "50%", textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 9 }}>
                Amount collected (in Rs.): ₹{item.totalPrice.toFixed(2)}
              </div>
              <div style={{ fontSize: 7, marginTop: 2, color: "#555" }}>
                {copyLabel}
              </div>
            </td>
          </tr>

          {/* ROW 5 (International only): Sub-Brand + AWB No */}
          {item.isInternational && (
            <tr>
              <td
                colSpan={2}
                style={{ ...cellStyle, width: "50%", background: "#eff6ff" }}
              >
                <span style={labelStyle}>Intl. Sub-Brand: </span>
                {item.intlSubBrand || "—"}
              </td>
              <td style={{ ...cellStyle, width: "50%", background: "#eff6ff" }}>
                <span style={labelStyle}>AWB No: </span>
                {item.intlManualAWB || item.awbSerial || "—"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CourierSlipPrintDialog({
  open,
  onClose,
  item,
  billNo,
  billDate,
  companyName,
  companyAddress,
  companyPhone,
  companyLogoUrl,
  brandLogoUrl,
}: CourierSlipPrintDialogProps) {
  const [selectedCopies, setSelectedCopies] = useState<Set<CopyKey>>(
    new Set(["sender", "account", "pod"]),
  );
  const isDownloading = false;

  if (!open) return null;

  const toggleCopy = (key: CopyKey) => {
    setSelectedCopies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handlePrint = () => {
    const copies = (["sender", "account", "pod"] as CopyKey[]).filter((k) =>
      selectedCopies.has(k),
    );
    const count = copies.length;
    const slipHeight = Math.floor(267 / count);

    const parts: string[] = [];
    copies.forEach((key, idx) => {
      const el = document.querySelector(`.slip-wrapper-${key}`);
      if (el) {
        parts.push(
          `<div style="height:${slipHeight}mm;overflow:hidden;">${el.innerHTML}</div>`,
        );
        if (idx < count - 1) {
          parts.push(
            `<div style="border-top:2px dashed #999;text-align:center;font-size:9px;color:#999;padding:1px 0;">✂ CUT HERE ✂</div>`,
          );
        }
      }
    });

    const html = `<!DOCTYPE html><html><head><title>Courier Slip</title><style>
      @page { size: A4; margin: 6mm; }
      body { margin: 0; font-family: Arial, sans-serif; }
      table { border-collapse: collapse; }
    </style></head><body>${parts.join("")}</body></html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleDownloadImage = () => {
    handlePrint();
  };

  const allKeys: CopyKey[] = ["sender", "account", "pod"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          width: "min(800px, 95vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0d9488",
            color: "#fff",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Courier Booking Slip
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {item.brandName} — AWB: {item.awbSerial || billNo}
              {item.isInternational && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#3b82f6",
                    borderRadius: 4,
                    padding: "1px 6px",
                    fontSize: 10,
                  }}
                >
                  ✈ International
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Select Copies:
          </span>
          {allKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleCopy(key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: "2px solid #0d9488",
                backgroundColor: selectedCopies.has(key) ? "#0d9488" : "#fff",
                color: selectedCopies.has(key) ? "#fff" : "#0d9488",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              {COPY_LABELS[key]}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              style={{
                padding: "6px 14px",
                backgroundColor: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: isDownloading ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
                opacity: isDownloading ? 0.7 : 1,
              }}
            >
              ⬇ Image
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              style={{
                padding: "6px 14px",
                backgroundColor: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: isDownloading ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
                opacity: isDownloading ? 0.7 : 1,
              }}
            >
              ⬇ PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: "6px 20px",
                backgroundColor: "#0d9488",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              🖨 Print ({selectedCopies.size} copies)
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
            backgroundColor: "#f3f4f6",
          }}
        >
          {allKeys.map((key) => (
            <div
              key={key}
              className={`slip-wrapper-${key}`}
              style={{
                marginBottom: 16,
                display: selectedCopies.has(key) ? "block" : "none",
              }}
            >
              <CourierSlipCopy
                item={item}
                billNo={billNo}
                billDate={billDate}
                companyName={companyName}
                companyAddress={companyAddress}
                companyPhone={companyPhone}
                companyLogoUrl={companyLogoUrl}
                brandLogoUrl={brandLogoUrl}
                copyLabel={COPY_LABELS[key]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CourierSlipPrintDialog;
