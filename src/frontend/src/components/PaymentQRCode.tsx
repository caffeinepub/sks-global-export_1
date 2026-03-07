import { QrCode } from "lucide-react";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface PaymentQRCodeProps {
  upiId: string;
  upiName: string;
  amount: number;
  note?: string;
  size?: number;
  className?: string;
}

export function PaymentQRCode({
  upiId,
  upiName,
  amount,
  note,
  size = 128,
  className,
}: PaymentQRCodeProps) {
  if (!upiId) return null;

  // Build UPI deep-link URL
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || "Payment")}`;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
      data-ocid="payment_qr.section"
    >
      <div
        style={{
          background: "#fff",
          border: "2px solid #e5e7eb",
          borderRadius: 8,
          padding: 8,
          display: "inline-flex",
        }}
      >
        <QRCodeDisplay value={upiUrl} size={size} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontSize: 11,
            color: "#6b7280",
            fontWeight: 600,
          }}
        >
          <QrCode size={12} />
          Scan to Pay
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#111827",
            marginTop: 2,
          }}
        >
          ₹{amount.toFixed(2)}
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>
          {upiId}
        </div>
      </div>
    </div>
  );
}

/**
 * Returns the UPI URL string for generating QR in print popups.
 */
export function buildUpiUrl(
  upiId: string,
  upiName: string,
  amount: number,
  note?: string,
): string {
  if (!upiId) return "";
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || "Payment")}`;
}
