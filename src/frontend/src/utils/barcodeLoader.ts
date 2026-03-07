/**
 * Loaders for QRCode and JsBarcode via CDN.
 * Uses CDN fallback for both since neither is a bundled npm dependency.
 */

// ─── QR Code via CDN ──────────────────────────────────────────────────────────

type QRCodeLib = {
  toCanvas: (
    canvas: HTMLCanvasElement,
    text: string,
    options?: {
      width?: number;
      errorCorrectionLevel?: string;
      color?: { dark?: string; light?: string };
    },
  ) => Promise<void>;
  toDataURL: (
    text: string,
    options?: {
      width?: number;
      margin?: number;
      errorCorrectionLevel?: string;
      color?: { dark?: string; light?: string };
    },
  ) => Promise<string>;
  toString: (
    text: string,
    options?: {
      type?: string;
      width?: number;
      margin?: number;
      errorCorrectionLevel?: string;
      color?: { dark?: string; light?: string };
    },
  ) => Promise<string>;
};

let qrPromise: Promise<QRCodeLib> | null = null;

export async function loadQRCode(): Promise<QRCodeLib> {
  if (!qrPromise) {
    qrPromise = loadScript(
      "https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js",
    ).then(() => {
      const lib = (window as unknown as Record<string, unknown>).QRCode;
      if (!lib) throw new Error("QRCode not found after script load");
      return lib as QRCodeLib;
    });
  }
  return qrPromise;
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
