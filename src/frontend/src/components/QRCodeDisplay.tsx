import { useEffect, useRef, useState } from "react";
import { loadQRCode } from "../utils/barcodeLoader";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  darkColor?: string;
  lightColor?: string;
  className?: string;
}

export function QRCodeDisplay({
  value,
  size = 128,
  errorCorrectionLevel = "M",
  darkColor = "#000000",
  lightColor = "#ffffff",
  className,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    let cancelled = false;
    loadQRCode()
      .then((QRCode) => {
        if (cancelled || !canvasRef.current) return;
        return QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          errorCorrectionLevel,
          color: { dark: darkColor, light: lightColor },
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, errorCorrectionLevel, darkColor, lightColor]);

  if (!value || error) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: "#f3f4f6",
          border: "1px dashed #d1d5db",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 11,
          borderRadius: 4,
        }}
      >
        {error ? "QR unavailable" : "No data"}
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} />;
}

/**
 * Generate a QR code as a PNG data URL (for print popups).
 */
export async function generateQRDataUrl(
  value: string,
  size = 120,
): Promise<string> {
  if (!value) return "";
  try {
    const QRCode = await loadQRCode();
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}
