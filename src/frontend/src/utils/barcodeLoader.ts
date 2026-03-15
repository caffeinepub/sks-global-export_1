/**
 * Loaders for QRCode (npm) and JsBarcode (CDN).
 * QRCode is now loaded via the bundled npm package for reliability.
 */

import type QRCodeLib from "qrcode";

// ─── QR Code via npm ─────────────────────────────────────────────────────────

let qrCodePromise: Promise<typeof QRCodeLib> | null = null;

export async function loadQRCode(): Promise<typeof QRCodeLib> {
  if (!qrCodePromise) {
    qrCodePromise = import("qrcode").then((m) => m.default || m);
  }
  return qrCodePromise;
}

// ─── JsBarcode via CDN ────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Cache promise so we only load jsbarcode script once
let jsbarcodePromise: Promise<JsBarcodeLib> | null = null;

type JsBarcodeLib = (
  element: SVGSVGElement | HTMLCanvasElement | string,
  value: string,
  options?: {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    lineColor?: string;
    background?: string;
    fontSize?: number;
    margin?: number;
  },
) => void;

export async function loadJsBarcode(): Promise<JsBarcodeLib> {
  if (!jsbarcodePromise) {
    jsbarcodePromise = loadScript(
      "https://unpkg.com/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
    ).then(() => {
      const lib = (window as unknown as Record<string, unknown>).JsBarcode;
      if (!lib) throw new Error("JsBarcode not found after script load");
      return lib as JsBarcodeLib;
    });
  }
  return jsbarcodePromise;
}
