import { useEffect, useRef } from "react";
import { loadJsBarcode } from "../utils/barcodeLoader";

interface BarcodeDisplayProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  lineColor?: string;
  background?: string;
  fontSize?: number;
  className?: string;
}

export function BarcodeDisplay({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  displayValue = true,
  lineColor = "#000000",
  background = "#ffffff",
  fontSize = 12,
  className,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    let cancelled = false;
    loadJsBarcode()
      .then((JsBarcode) => {
        if (cancelled || !svgRef.current) return;
        try {
          JsBarcode(svgRef.current, value, {
            format,
            width,
            height,
            displayValue,
            lineColor,
            background,
            fontSize,
            margin: 4,
          });
        } catch {
          // invalid value for format — silently ignored
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    value,
    format,
    width,
    height,
    displayValue,
    lineColor,
    background,
    fontSize,
  ]);

  if (!value) {
    return (
      <div
        className={className}
        style={{
          background: "#f3f4f6",
          border: "1px dashed #d1d5db",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height,
          color: "#9ca3af",
          fontSize: 11,
          borderRadius: 4,
        }}
      >
        No data
      </div>
    );
  }

  return <svg ref={svgRef} className={className} />;
}

/**
 * Generate a barcode as a base64 SVG data URL (for print popups).
 * Works outside React — creates a temp SVG, runs JsBarcode, serialises it.
 */
export async function generateBarcodeDataUrl(
  value: string,
  options?: {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
  },
): Promise<string> {
  if (!value) return "";
  try {
    const JsBarcode = await loadJsBarcode();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, {
      format: options?.format ?? "CODE128",
      width: options?.width ?? 1.5,
      height: options?.height ?? 35,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize ?? 9,
      margin: 2,
      background: "#ffffff",
      lineColor: "#000000",
    });
    const svgString = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;base64,${btoa(svgString)}`;
  } catch {
    return "";
  }
}
