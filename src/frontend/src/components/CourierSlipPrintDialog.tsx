import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
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
}

// ─── Single Slip Copy ─────────────────────────────────────────────────────────

interface SlipCopyProps {
  label: string;
  item: BillItem;
  billNo: string;
  billDate: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
}

function SlipCopy({
  label,
  item,
  billNo,
  billDate,
  companyName,
  companyAddress,
  companyPhone,
  companyLogoUrl,
}: SlipCopyProps) {
  const brandName = item.brandName || "Courier";
  const style = getBrandStyle(brandName);

  return (
    <div
      className="slip-copy"
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        padding: "12px",
        backgroundColor: "#ffffff",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
          paddingBottom: "8px",
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        {/* Brand info */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: style.bg,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "12px",
              flexShrink: 0,
            }}
          >
            {style.initials}
          </div>
          <div>
            <p
              style={{
                fontSize: "13px",
                fontWeight: "700",
                margin: 0,
                color: "#111827",
              }}
            >
              {brandName}
            </p>
            {item.serviceMode && (
              <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>
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
                height: "32px",
                objectFit: "contain",
                marginBottom: "2px",
              }}
            />
          ) : null}
          <p
            style={{
              fontSize: "11px",
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
          margin: "8px 0",
          padding: "6px",
          backgroundColor: "#f9fafb",
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 2px",
          }}
        >
          AWB Number
        </p>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "20px",
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
          margin: "8px 0",
        }}
      />

      {/* Sender & Receiver Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        {/* FROM */}
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f9ff",
            borderRadius: "4px",
            border: "1px solid #bae6fd",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#0369a1",
              margin: "0 0 4px",
            }}
          >
            ▶ FROM (Sender)
          </p>
          <p
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 2px",
            }}
          >
            {item.senderName || "—"}
          </p>
          {item.senderPhone && (
            <p
              style={{ fontSize: "10px", color: "#374151", margin: "0 0 2px" }}
            >
              📞 {item.senderPhone}
            </p>
          )}
          {item.senderAddress && (
            <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>
              {item.senderAddress}
            </p>
          )}
        </div>

        {/* TO */}
        <div
          style={{
            padding: "8px",
            backgroundColor: "#fff7ed",
            borderRadius: "4px",
            border: "1px solid #fed7aa",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#c2410c",
              margin: "0 0 4px",
            }}
          >
            ▶ TO (Receiver)
          </p>
          <p
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 2px",
            }}
          >
            {item.receiverName || "—"}
          </p>
          {item.receiverPhone && (
            <p
              style={{ fontSize: "10px", color: "#374151", margin: "0 0 2px" }}
            >
              📞 {item.receiverPhone}
            </p>
          )}
          {item.receiverAddress && (
            <p
              style={{ fontSize: "10px", color: "#6b7280", margin: "0 0 2px" }}
            >
              {item.receiverAddress}
            </p>
          )}
          {item.receiverPincode && (
            <p
              style={{
                fontSize: "10px",
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
          gap: "8px",
          padding: "6px 8px",
          backgroundColor: "#f9fafb",
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
          fontSize: "10px",
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
                  // Extract product type from description (e.g. "Parcel" or "Document")
                  const match = item.description.match(
                    /\b(Document|Parcel|Heavy Parcel|Fragile)\b/,
                  );
                  return match ? match[0] : "Courier";
                })()
              : "Courier"}
          </span>
        )}
        <span>
          <strong>Date:</strong> {(() => {
            try {
              return new Date(billDate).toLocaleDateString("en-IN");
            } catch {
              return billDate;
            }
          })()}
        </span>
        <span>
          <strong>Bill:</strong> {billNo}
        </span>
        {companyAddress && (
          <span style={{ fontSize: "9px", color: "#9ca3af", width: "100%" }}>
            From Office: {companyAddress}
          </span>
        )}
      </div>

      {/* Copy label */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "6px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            backgroundColor: style.bg,
            color: "#ffffff",
            fontSize: "9px",
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
}: CourierSlipPrintDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const slipProps = {
    item,
    billNo,
    billDate,
    companyName,
    companyAddress,
    companyPhone,
    companyLogoUrl,
  };

  const copies = ["SENDER COPY", "ACCOUNT COPY", "POD COPY"] as const;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .courier-slip-print-area,
          .courier-slip-print-area * { visibility: visible !important; }
          .courier-slip-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            z-index: 9999 !important;
            background: white !important;
            padding: 16px !important;
          }
          .slip-cut-line { page-break-inside: avoid; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="courier_slip.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Courier Booking Slip — AWB {item.awbSerial || "N/A"}
            </DialogTitle>
          </DialogHeader>

          {/* 3-copy slips area */}
          <div className="courier-slip-print-area space-y-0 bg-white">
            {copies.map((label, idx) => (
              <div key={label}>
                {idx > 0 && (
                  <div
                    className="slip-cut-line"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px 0",
                      color: "#9ca3af",
                      fontSize: "11px",
                      borderTop: "2px dashed #9ca3af",
                      borderBottom: "2px dashed #9ca3af",
                      margin: "6px 0",
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
                        fontSize: "9px",
                      }}
                    >
                      Cut Here
                    </span>
                    <span>✂</span>
                  </div>
                )}
                <SlipCopy label={label} {...slipProps} />
              </div>
            ))}
          </div>

          <DialogFooter className="no-print gap-2">
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
              data-ocid="courier_slip.primary_button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print All 3 Copies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
