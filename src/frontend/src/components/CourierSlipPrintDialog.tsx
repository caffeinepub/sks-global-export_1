import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Printer, X } from "lucide-react";
import { useState } from "react";
import type { BillItem } from "../types";

// ─── Brand Color Config ────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, { bg: string; initials: string }> = {
  DTDC: { bg: "#f97316", initials: "DT" },
  BlueDart: { bg: "#dc2626", initials: "BD" },
  Delhivery: { bg: "#2563eb", initials: "DL" },
  FedEx: { bg: "#7c3aed", initials: "FX" },
  "India Post": { bg: "#b91c1c", initials: "IP" },
  Ecom: { bg: "#16a34a", initials: "EC" },
  Xpressbees: { bg: "#eab308", initials: "XB" },
};

const getBrandStyle = (brandName: string) => {
  const key = Object.keys(BRAND_COLORS).find((k) =>
    brandName.toLowerCase().includes(k.toLowerCase()),
  );
  return key
    ? BRAND_COLORS[key]
    : { bg: "#0d9488", initials: brandName.slice(0, 2).toUpperCase() };
};

const isDTDCBrand = (brandName: string) =>
  brandName.toLowerCase().includes("dtdc");

// ─── Copy Keys ───────────────────────────────────────────────────────────────

type CopyKey = "sender" | "account" | "pod";

interface SelectedCopies {
  sender: boolean;
  account: boolean;
  pod: boolean;
}

const COPY_LABELS: Record<CopyKey, { dtdc: string; generic: string }> = {
  sender: { dtdc: "Sender's Copy", generic: "SENDER COPY" },
  account: { dtdc: "Account Copy", generic: "ACCOUNT COPY" },
  pod: { dtdc: "POD Copy", generic: "POD COPY" },
};

const COPY_KEYS: CopyKey[] = ["sender", "account", "pod"];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CourierSlipPrintDialogProps {
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
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

function extractOrigin(address?: string): string {
  if (!address) return "—";
  const parts = address.split(",").map((s) => s.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part && !/^\d{6}$/.test(part) && part.length > 1) {
      return part.split(" ")[0] || part;
    }
  }
  return parts[0] || "—";
}

// ─── DTDC Official Booking Slip ───────────────────────────────────────────────

interface DTDCSlipProps {
  copyLabel: string;
  copyKey: CopyKey;
  item: BillItem;
  billNo: string;
  billDate: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
  companyGstin?: string;
  companyEmail?: string;
}

function DTDCSlipCopy({
  copyLabel,
  copyKey,
  item,
  billDate,
  companyName,
  companyAddress,
  companyPhone,
  companyLogoUrl,
  companyGstin,
  companyEmail,
}: DTDCSlipProps) {
  const actualWt =
    item.actualWeightKg != null ? `${item.actualWeightKg.toFixed(3)} kg` : "—";
  const chargedWt =
    item.chargeableWeightKg != null
      ? `${item.chargeableWeightKg.toFixed(3)} kg`
      : item.actualWeightKg != null
        ? `${item.actualWeightKg.toFixed(3)} kg`
        : "—";
  const origin = extractOrigin(companyAddress);
  const dest =
    item.receiverPincode || extractOrigin(item.receiverAddress) || "—";
  const formattedDate = formatDate(billDate);

  let dimStr = "—";
  if (item.volumetricWeightKg != null && item.volumetricWeightKg > 0) {
    dimStr = `${item.volumetricWeightKg.toFixed(3)} kg`;
  }

  // Common cell style
  const cell: React.CSSProperties = {
    border: "1px solid #000",
    padding: "3px 5px",
    verticalAlign: "top",
    fontSize: "9px",
    color: "#000",
    fontFamily: "Arial, sans-serif",
  };

  const innerCell: React.CSSProperties = {
    padding: "3px 6px",
    verticalAlign: "top",
    fontSize: "9px",
    color: "#000",
    fontFamily: "Arial, sans-serif",
  };

  const bold: React.CSSProperties = {
    fontWeight: "700",
    fontSize: "9px",
    color: "#000",
  };

  const val: React.CSSProperties = {
    fontWeight: "400",
    fontSize: "9px",
    color: "#000",
  };

  return (
    <div
      className={`slip-copy dtdc-slip slip-${copyKey}`}
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        width: "100%",
        /* Each slip occupies exactly 1/3 of A4 printable area */
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════
          MAIN TABLE — 3-column fixed layout, border-collapse
          Col widths: ~22% | ~35% | ~43%
      ═══════════════════════════════════════════════════════════ */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #000",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "22%" }} />
          <col style={{ width: "35%" }} />
          <col style={{ width: "43%" }} />
        </colgroup>

        <tbody>
          {/* ─────────────────────────────────────────────────────────
              ROW 1 — Header
              [Logo] | [DTDC name + address + AWB] | [Origin/Dest/Product/Type/Date]
          ───────────────────────────────────────────────────────── */}
          <tr>
            {/* CELL A — Company logo */}
            <td
              style={{
                ...cell,
                textAlign: "center",
                verticalAlign: "middle",
                padding: "6px 5px",
              }}
            >
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Logo"
                  style={{
                    maxHeight: "44px",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13px",
                    color: "#aaa",
                    fontStyle: "italic",
                    letterSpacing: "1px",
                  }}
                >
                  Here Logo
                </span>
              )}
            </td>

            {/* CELL B — DTDC address + AWB number */}
            <td
              style={{
                ...cell,
                verticalAlign: "middle",
                padding: "4px 7px",
              }}
            >
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "9.5px",
                  marginBottom: "1px",
                }}
              >
                DTDC Express Limited
              </div>
              <div style={{ fontSize: "8.5px", marginBottom: "1px" }}>
                Regd. Office No. 3, Victoria Road
              </div>
              <div style={{ fontSize: "8.5px", marginBottom: "4px" }}>
                Bengaluru - 560047
              </div>
              {/* AWB Number — large, centered, prominent */}
              <div style={{ textAlign: "center", marginTop: "2px" }}>
                <div
                  style={{
                    fontSize: "7.5px",
                    fontWeight: "600",
                    color: "#000",
                    marginBottom: "1px",
                    letterSpacing: "0.5px",
                  }}
                >
                  AWB No:
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "17px",
                    fontWeight: "900",
                    letterSpacing: "2px",
                    color: "#000",
                    lineHeight: "1.1",
                  }}
                >
                  {item.awbSerial || "—"}
                </div>
              </div>
            </td>

            {/* CELL C — 2-col × 3-row sub-table: Origin / Dest / Product / Type / Date */}
            <td style={{ ...cell, padding: "0" }}>
              <table
                style={{
                  width: "100%",
                  height: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  {/* Sub-row 1: Origin | Dest */}
                  <tr>
                    <td
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        borderRight: "1px solid #000",
                        width: "50%",
                        verticalAlign: "middle",
                      }}
                    >
                      <span style={bold}>Origin: </span>
                      <span style={val}>{origin}</span>
                    </td>
                    <td
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        width: "50%",
                        verticalAlign: "middle",
                      }}
                    >
                      <span style={bold}>Dest: </span>
                      <span style={val}>{dest}</span>
                    </td>
                  </tr>
                  {/* Sub-row 2: PRODUCT | Type */}
                  <tr>
                    <td
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        borderRight: "1px solid #000",
                        width: "50%",
                        verticalAlign: "middle",
                      }}
                    >
                      <span style={bold}>PRODUCT: </span>
                      <span style={val}>
                        {item.productType || item.brandName || "DTDC"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        width: "50%",
                        verticalAlign: "middle",
                      }}
                    >
                      <span style={bold}>Type: </span>
                      <span style={val}>{item.serviceMode || "—"}</span>
                    </td>
                  </tr>
                  {/* Sub-row 3: Date (spans both cols) */}
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        ...innerCell,
                        verticalAlign: "middle",
                      }}
                    >
                      <span style={bold}>Date: </span>
                      <span style={val}>{formattedDate}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ─────────────────────────────────────────────────────────
              ROW 2 — Consignor (left) | Consignee (right, spans 2 cols)
          ───────────────────────────────────────────────────────── */}
          <tr>
            {/* LEFT — Consignor */}
            <td
              style={{
                ...cell,
                verticalAlign: "top",
                padding: "4px 5px",
              }}
            >
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>Consignor's Name: </span>
                <span style={val}>{companyName}</span>
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>Consignor's Address: </span>
                <span style={val}>{companyAddress || "—"}</span>
              </div>
              <div style={{ marginBottom: "2px" }}>&nbsp;</div>
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>GSTIN No.: </span>
                <span style={val}>{companyGstin || "—"}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 6px" }}>
                <span>
                  <span style={bold}>Phone: </span>
                  <span style={val}>{companyPhone || "—"}</span>
                </span>
                <span>
                  <span style={bold}>Email: </span>
                  <span style={val}>{companyEmail || ""}</span>
                </span>
              </div>
            </td>

            {/* RIGHT — Consignee (spans 2 cols) */}
            <td
              colSpan={2}
              style={{
                ...cell,
                verticalAlign: "top",
                padding: "4px 5px",
              }}
            >
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>Customer Ref No: </span>
                <span style={val}>{item.awbSerial || "—"}</span>
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>Consignee's Name: </span>
                <span style={val}>{item.receiverName || "—"}</span>
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>Consignee's Address: </span>
                <span style={val}>
                  {item.receiverAddress || "—"}
                  {item.receiverPincode ? ` - ${item.receiverPincode}` : ""}
                </span>
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={bold}>GSTIN No.: </span>
                <span style={val}>—</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0 6px" }}>
                <span>
                  <span style={bold}>Phone: </span>
                  <span style={val}>{item.receiverPhone || "—"}</span>
                </span>
                <span>
                  <span style={bold}>Email: </span>
                  <span style={val} />
                </span>
              </div>
            </td>
          </tr>

          {/* ─────────────────────────────────────────────────────────
              ROW 3 — Content Spec | Shipment Details | Barcode + Risk Surcharge
          ───────────────────────────────────────────────────────── */}
          <tr>
            {/* LEFT — Content specification, declaration, signature */}
            <td
              style={{
                ...cell,
                verticalAlign: "top",
                padding: "4px 5px",
              }}
            >
              <div style={{ marginBottom: "3px" }}>
                <span style={{ ...bold, fontWeight: "700" }}>
                  Content Specification
                </span>
                <span style={bold}> :</span>
              </div>
              <div style={{ marginBottom: "5px" }}>
                <span style={{ ...bold, fontWeight: "700" }}>
                  Paperwork Enclosed
                </span>
                <span style={bold}> :</span>
              </div>
              <div
                style={{
                  fontSize: "7.5px",
                  color: "#000",
                  textAlign: "center",
                  lineHeight: "1.35",
                  marginBottom: "6px",
                  padding: "0 2px",
                }}
              >
                I/We declare that this consignment does not contain personal
                mail, cash, jewellery, contraband, illegal drugs, any prohibited
                items and commodities which can cause safety hazards while
                transporting
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: "7.5px",
                  fontWeight: "700",
                  textDecoration: "underline",
                  marginBottom: "4px",
                }}
              >
                Sender's Signature &amp; Seal
              </div>
              <div
                style={{
                  fontSize: "7px",
                  color: "#000",
                  textAlign: "center",
                  lineHeight: "1.3",
                }}
              >
                I have read and understood terms &amp; conditions of carriage
                mentioned on website www.dtdc.in, and I agree to the same.
              </div>
            </td>

            {/* MIDDLE — Shipment detail rows + receiver delivery address */}
            <td style={{ ...cell, padding: "0", verticalAlign: "top" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {(
                    [
                      [
                        "Declared Value:",
                        `\u20B9${item.totalPrice?.toFixed(2) ?? "\u2014"}`,
                      ],
                      ["No Of Pieces:", "1"],
                      ["Actual Weight:", actualWt],
                      ["Ewaybill Number:", "\u2014"],
                      ["Dim:", dimStr],
                      ["Charged weight:", chargedWt],
                    ] as [string, string][]
                  ).map(([lbl, v]) => (
                    <tr key={lbl}>
                      <td
                        style={{
                          ...innerCell,
                          borderBottom: "1px solid #000",
                        }}
                      >
                        <span style={bold}>{lbl}</span>
                        <span style={{ ...val, marginLeft: "4px" }}>{v}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Receiver delivery address block */}
                  <tr>
                    <td
                      style={{ ...innerCell, borderBottom: "1px solid #000" }}
                    >
                      <div>
                        <span style={bold}>Name : </span>
                        <span style={val}>{item.receiverName || "—"}</span>
                      </div>
                      <div style={{ marginTop: "2px" }}>
                        <span style={bold}>Address: </span>
                        <span style={val}>
                          {item.receiverAddress || "—"}
                          {item.receiverPincode
                            ? ` - ${item.receiverPincode}`
                            : ""}
                        </span>
                      </div>
                      <div style={{ marginTop: "6px" }}>&nbsp;</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...innerCell }}>
                      <span style={bold}>Phone : </span>
                      <span style={val}>{item.receiverPhone || "—"}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* RIGHT — Blank barcode area (top) + Risk Surcharge (bottom) */}
            <td style={{ ...cell, padding: "0", verticalAlign: "top" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  height: "100%",
                }}
              >
                <tbody>
                  {/* Blank area for barcode sticker */}
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        height: "58px",
                        verticalAlign: "top",
                        padding: "4px 6px",
                      }}
                    >
                      {/* intentionally blank */}
                    </td>
                  </tr>
                  {/* Risk Surcharge label row */}
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        textAlign: "center",
                        padding: "5px 4px",
                        verticalAlign: "middle",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "900",
                          color: "#000",
                          letterSpacing: "0.3px",
                        }}
                      >
                        Risk Surcharge
                      </span>
                    </td>
                  </tr>
                  {/* Owner row */}
                  <tr>
                    <td
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        borderRight: "1px solid #000",
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "5px 8px",
                        width: "65%",
                      }}
                    >
                      <span style={{ fontSize: "9px", fontWeight: "600" }}>
                        Owner
                      </span>
                    </td>
                    <td
                      style={{
                        ...innerCell,
                        borderBottom: "1px solid #000",
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "5px 8px",
                        width: "35%",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          border: "1px solid #000",
                          verticalAlign: "middle",
                        }}
                      />
                    </td>
                  </tr>
                  {/* Carrier row */}
                  <tr>
                    <td
                      style={{
                        ...innerCell,
                        borderRight: "1px solid #000",
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "5px 8px",
                        width: "65%",
                      }}
                    >
                      <span style={{ fontSize: "9px", fontWeight: "600" }}>
                        Carrier
                      </span>
                    </td>
                    <td
                      style={{
                        ...innerCell,
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "5px 8px",
                        width: "35%",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          border: "1px solid #000",
                          verticalAlign: "middle",
                        }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ─────────────────────────────────────────────────────────
              ROW 4 — Footer: contact info | Amount collected
          ───────────────────────────────────────────────────────── */}
          <tr>
            <td
              colSpan={2}
              style={{
                ...cell,
                padding: "3px 6px",
                verticalAlign: "middle",
              }}
            >
              <span style={{ fontSize: "8px", color: "#000" }}>
                https://www.dtdc.in
              </span>
              <span style={{ fontSize: "8px", color: "#000", margin: "0 4px" }}>
                |
              </span>
              <span style={{ fontSize: "8px", color: "#000" }}>
                customersupport@dtdc.com
              </span>
              <span style={{ fontSize: "8px", color: "#000", margin: "0 4px" }}>
                |
              </span>
              <span style={{ fontSize: "8px", color: "#000" }}>
                +91-9606911811
              </span>
            </td>
            <td
              style={{
                ...cell,
                padding: "3px 6px",
                verticalAlign: "middle",
                textAlign: "left",
              }}
            >
              <span style={{ ...bold, fontSize: "8.5px" }}>
                Amount collected (in Rs.):{" "}
              </span>
              <span style={{ ...val, fontWeight: "700", fontSize: "8.5px" }}>
                &#8377;{item.totalPrice?.toFixed(2) ?? "—"}
              </span>
            </td>
          </tr>

          {/* ─────────────────────────────────────────────────────────
              ROW 5 — Legal disclaimer (full width)
          ───────────────────────────────────────────────────────── */}
          <tr>
            <td
              colSpan={3}
              style={{
                ...cell,
                padding: "3px 6px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "7px",
                    fontWeight: "700",
                    color: "#000",
                    lineHeight: "1.3",
                  }}
                >
                  THIS DOCUMENT IS NOT A TAX INVOICE. WEIGHT CAPTURED BY DTDC
                  WILL BE USED FOR INVOICE GENERATION.
                </span>
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: "600",
                    color: "#000",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copyLabel}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Generic (Non-DTDC) Single Slip Copy ─────────────────────────────────────

interface GenericSlipCopyProps {
  label: string;
  copyKey: CopyKey;
  item: BillItem;
  billNo: string;
  billDate: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
}

function GenericSlipCopy({
  label,
  copyKey,
  item,
  billNo,
  billDate,
  companyName,
  companyAddress,
  companyPhone,
  companyLogoUrl,
}: GenericSlipCopyProps) {
  const brandName = item.brandName || "Courier";
  const style = getBrandStyle(brandName);

  return (
    <div
      className={`slip-copy slip-${copyKey}`}
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        padding: "10px",
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        {/* Brand info */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: style.bg,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "11px",
              flexShrink: 0,
            }}
          >
            {style.initials}
          </div>
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: "700",
                margin: 0,
                color: "#111827",
              }}
            >
              {brandName}
            </p>
            {item.serviceMode && (
              <p style={{ fontSize: "9px", color: "#6b7280", margin: 0 }}>
                {item.serviceMode} Mode
              </p>
            )}
          </div>
        </div>

        {/* Company info / logo */}
        <div style={{ textAlign: "right" }}>
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              style={{
                height: "28px",
                objectFit: "contain",
                marginBottom: "2px",
              }}
            />
          ) : null}
          <p
            style={{
              fontSize: "10px",
              fontWeight: "600",
              color: "#374151",
              margin: 0,
            }}
          >
            {companyName}
          </p>
          {companyPhone && (
            <p style={{ fontSize: "9px", color: "#6b7280", margin: 0 }}>
              {companyPhone}
            </p>
          )}
        </div>
      </div>

      {/* AWB Number */}
      <div
        style={{
          textAlign: "center",
          margin: "6px 0",
          padding: "5px",
          backgroundColor: "#f9fafb",
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
        }}
      >
        <p
          style={{
            fontSize: "9px",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 1px",
          }}
        >
          AWB Number
        </p>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "18px",
            fontWeight: "700",
            color: "#111827",
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {item.awbSerial || "—"}
        </p>
      </div>

      {/* Separator */}
      <hr
        style={{
          border: "none",
          borderTop: "1px solid #e5e7eb",
          margin: "6px 0",
        }}
      />

      {/* Sender & Receiver Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "6px",
        }}
      >
        {/* FROM */}
        <div
          style={{
            padding: "6px 8px",
            backgroundColor: "#f0f9ff",
            borderRadius: "4px",
            border: "1px solid #bae6fd",
          }}
        >
          <p
            style={{
              fontSize: "8.5px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "#0369a1",
              margin: "0 0 3px",
            }}
          >
            ▶ FROM (Sender)
          </p>
          <p
            style={{
              fontSize: "10px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 2px",
            }}
          >
            {item.senderName || companyName || "—"}
          </p>
          {(item.senderPhone || companyPhone) && (
            <p style={{ fontSize: "9px", color: "#374151", margin: "0 0 1px" }}>
              📞 {item.senderPhone || companyPhone}
            </p>
          )}
          {(item.senderAddress || companyAddress) && (
            <p style={{ fontSize: "9px", color: "#6b7280", margin: 0 }}>
              {item.senderAddress || companyAddress}
            </p>
          )}
        </div>

        {/* TO */}
        <div
          style={{
            padding: "6px 8px",
            backgroundColor: "#fff7ed",
            borderRadius: "4px",
            border: "1px solid #fed7aa",
          }}
        >
          <p
            style={{
              fontSize: "8.5px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "#c2410c",
              margin: "0 0 3px",
            }}
          >
            ▶ TO (Receiver)
          </p>
          <p
            style={{
              fontSize: "10px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 2px",
            }}
          >
            {item.receiverName || "—"}
          </p>
          {item.receiverPhone && (
            <p style={{ fontSize: "9px", color: "#374151", margin: "0 0 1px" }}>
              📞 {item.receiverPhone}
            </p>
          )}
          {item.receiverAddress && (
            <p style={{ fontSize: "9px", color: "#6b7280", margin: "0 0 1px" }}>
              {item.receiverAddress}
            </p>
          )}
          {item.receiverPincode && (
            <p
              style={{
                fontSize: "9px",
                fontWeight: "600",
                color: "#374151",
                margin: 0,
              }}
            >
              PIN: {item.receiverPincode}
            </p>
          )}
        </div>
      </div>

      {/* Bottom info row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "5px 7px",
          backgroundColor: "#f9fafb",
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
          fontSize: "9px",
          color: "#374151",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>
          <strong>Wt:</strong>{" "}
          {item.chargeableWeightKg != null
            ? `${item.chargeableWeightKg.toFixed(3)} kg`
            : item.actualWeightKg != null
              ? `${item.actualWeightKg.toFixed(3)} kg`
              : "—"}
        </span>
        {item.serviceMode && (
          <span>
            <strong>Mode:</strong> {item.serviceMode}
          </span>
        )}
        {item.productType && (
          <span>
            <strong>Type:</strong>{" "}
            {item.description
              ? (() => {
                  const match = item.description.match(
                    /\b(Document|Parcel|Heavy Parcel|Fragile)\b/,
                  );
                  return match ? match[0] : "Courier";
                })()
              : "Courier"}
          </span>
        )}
        <span>
          <strong>Date:</strong> {formatDate(billDate)}
        </span>
        <span>
          <strong>Bill:</strong> {billNo}
        </span>
        {companyAddress && (
          <span style={{ fontSize: "8.5px", color: "#9ca3af", width: "100%" }}>
            From Office: {companyAddress}
          </span>
        )}
      </div>

      {/* Copy label */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "5px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 7px",
            backgroundColor: style.bg,
            color: "#ffffff",
            fontSize: "8.5px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderRadius: "3px",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Cut Line ─────────────────────────────────────────────────────────────────

function CutLine({ between }: { between: [CopyKey, CopyKey] }) {
  return (
    <div
      className={`slip-cut-line cut-between-${between[0]}-${between[1]}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 0",
        color: "#9ca3af",
        fontSize: "9px",
        borderTop: "1.5px dashed #9ca3af",
        borderBottom: "1.5px dashed #9ca3af",
        margin: "4px 0",
        gap: "8px",
        userSelect: "none",
      }}
    >
      <span>✂</span>
      <span
        style={{
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontSize: "7.5px",
        }}
      >
        Cut Here
      </span>
      <span>✂</span>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

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
  companyGstin,
  companyEmail,
}: CourierSlipPrintDialogProps) {
  const [selectedCopies, setSelectedCopies] = useState<SelectedCopies>({
    sender: true,
    account: true,
    pod: true,
  });

  const toggleCopy = (key: CopyKey) => {
    setSelectedCopies((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = Object.values(selectedCopies).filter(Boolean).length;

  const printLabel =
    selectedCount === 0
      ? "Nothing to Print"
      : selectedCount === 1
        ? "Print 1 Copy"
        : `Print ${selectedCount} Copies`;

  const handlePrint = () => {
    if (selectedCount === 0) return;

    // Build the slip HTML for selected copies
    const slipDivId = "sks-print-root";

    // Collect the HTML of the print area
    const printArea = document.querySelector(".courier-slip-print-area");
    if (!printArea) {
      window.print();
      return;
    }

    // Only include visible slips
    const visibleKeys = COPY_KEYS.filter((k) => selectedCopies[k]);
    const slipHeight = Math.floor(270 / visibleKeys.length); // mm per slip (270mm usable on A4 with 10mm margins)

    // Serialise the visible slips with inline styles so the new window has them
    const slipNodes: string[] = [];
    visibleKeys.forEach((key, idx) => {
      const el = printArea.querySelector(`.slip-${key}`) as HTMLElement | null;
      if (!el) return;

      // Get the wrapper (parent .slip-wrapper) if present, else el itself
      const wrapper = el.closest(".slip-wrapper") as HTMLElement | null;
      const html = (wrapper || el).outerHTML;
      const cutLine =
        idx < visibleKeys.length - 1
          ? `<div style="width:100%;border-top:1.5px dashed #9ca3af;border-bottom:1.5px dashed #9ca3af;text-align:center;font-size:9px;color:#9ca3af;padding:2px 0;box-sizing:border-box;font-family:Arial,sans-serif;">✂ &nbsp; CUT HERE &nbsp; ✂</div>`
          : "";
      slipNodes.push(`
        <div style="width:100%;height:${slipHeight}mm;overflow:hidden;box-sizing:border-box;display:block;">
          ${html}
        </div>
        ${cutLine}
      `);
    });

    const combinedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>DTDC Booking Slip</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background: white;
    }
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    @media print {
      html, body {
        width: 190mm;
      }
      .slip-wrapper, [class*="slip-wrapper"] {
        page-break-inside: avoid;
      }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 9px;
      color: #000;
    }
    #${slipDivId} {
      width: 190mm;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <div id="${slipDivId}">
    ${slipNodes.join("")}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 300);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      // Fallback to native print if popup blocked
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(combinedHtml);
    printWindow.document.close();
  };

  const brandName = item.brandName || "";
  const isDTDC = isDTDCBrand(brandName);

  const dtdcSlipProps = {
    item,
    billNo,
    billDate,
    companyName,
    companyAddress,
    companyPhone,
    companyLogoUrl,
    companyGstin,
    companyEmail,
  };

  const genericSlipProps = {
    item,
    billNo,
    billDate,
    companyName,
    companyAddress,
    companyPhone,
    companyLogoUrl,
  };

  return (
    <>
      {/* Screen-only styles — print is handled via popup window */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
          data-ocid="courier_slip.dialog"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              {isDTDC ? "DTDC Booking Slip" : "Courier Booking Slip"} — AWB{" "}
              {item.awbSerial || "N/A"}
            </DialogTitle>
          </DialogHeader>

          {/* Copy selection controls */}
          <div className="flex-shrink-0 flex items-center gap-3 px-1 py-2 border-b border-border">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Select copies:
            </span>
            <div className="flex gap-2 flex-wrap">
              {COPY_KEYS.map((key) => {
                const label = isDTDC
                  ? COPY_LABELS[key].dtdc
                  : COPY_LABELS[key].generic;
                const isSelected = selectedCopies[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCopy(key)}
                    data-ocid={`courier_slip.${key}.toggle`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: isSelected
                        ? "2px solid #f97316"
                        : "2px solid #e5e7eb",
                      backgroundColor: isSelected ? "#fff7ed" : "#f9fafb",
                      color: isSelected ? "#c2410c" : "#6b7280",
                      fontSize: "13px",
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      userSelect: "none",
                    }}
                  >
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        border: isSelected
                          ? "2px solid #f97316"
                          : "2px solid #d1d5db",
                        backgroundColor: isSelected ? "#f97316" : "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isSelected && (
                        <Check
                          style={{
                            width: "10px",
                            height: "10px",
                            color: "#fff",
                            strokeWidth: 3,
                          }}
                        />
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
            {selectedCount === 0 && (
              <span
                className="text-xs text-destructive font-medium"
                data-ocid="courier_slip.error_state"
              >
                Select at least one copy
              </span>
            )}
          </div>

          {/* 3-copy slips preview area — scrollable on screen */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div
              className="courier-slip-print-area bg-white"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                padding: "6px",
                width: "100%",
              }}
            >
              {isDTDC
                ? COPY_KEYS.map((key, idx) => {
                    const copyLabel = COPY_LABELS[key].dtdc;
                    const isVisible = selectedCopies[key];
                    // Show cut line between consecutive visible slips
                    const prevKey = idx > 0 ? COPY_KEYS[idx - 1] : null;
                    const prevVisible = prevKey
                      ? selectedCopies[prevKey]
                      : false;
                    const showCutLine = idx > 0 && (isVisible || prevVisible);
                    return (
                      <div key={key}>
                        {showCutLine && (
                          <CutLine between={[COPY_KEYS[idx - 1], key]} />
                        )}
                        {isVisible && (
                          <div className="slip-wrapper">
                            <DTDCSlipCopy
                              copyLabel={copyLabel}
                              copyKey={key}
                              {...dtdcSlipProps}
                            />
                          </div>
                        )}
                        {!isVisible && (
                          <div
                            className={`slip-${key}`}
                            style={{
                              display: "none",
                            }}
                          >
                            <DTDCSlipCopy
                              copyLabel={copyLabel}
                              copyKey={key}
                              {...dtdcSlipProps}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                : COPY_KEYS.map((key, idx) => {
                    const label = COPY_LABELS[key].generic;
                    const isVisible = selectedCopies[key];
                    const prevKey = idx > 0 ? COPY_KEYS[idx - 1] : null;
                    const prevVisible = prevKey
                      ? selectedCopies[prevKey]
                      : false;
                    const showCutLine = idx > 0 && (isVisible || prevVisible);
                    return (
                      <div key={key}>
                        {showCutLine && (
                          <CutLine between={[COPY_KEYS[idx - 1], key]} />
                        )}
                        {isVisible ? (
                          <div className="slip-wrapper">
                            <GenericSlipCopy
                              label={label}
                              copyKey={key}
                              {...genericSlipProps}
                            />
                          </div>
                        ) : (
                          <div
                            className={`slip-${key}`}
                            style={{ display: "none" }}
                          >
                            <GenericSlipCopy
                              label={label}
                              copyKey={key}
                              {...genericSlipProps}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>
          </div>

          <DialogFooter className="no-print gap-2 flex-shrink-0 border-t border-border pt-3">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="courier_slip.close_button"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={handlePrint}
              disabled={selectedCount === 0}
              data-ocid="courier_slip.primary_button"
            >
              <Printer className="w-4 h-4 mr-2" />
              {printLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
