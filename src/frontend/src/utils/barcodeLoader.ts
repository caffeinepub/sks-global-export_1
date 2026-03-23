/**
 * Loaders for QRCode and JsBarcode.
 * QR: uses qrserver.com API for reliable rendering without CDN script dependency.
 * JsBarcode: CDN fallback.
 */

// ─── QR Code ─────────────────────────────────────────────────────────────────

export interface QROptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: string;
  type?: string;
  color?: { dark?: string; light?: string };
}

type QRCodeLib = {
  toCanvas: (
    canvas: HTMLCanvasElement,
    text: string,
    options?: QROptions,
  ) => Promise<void>;
  toDataURL: (text: string, options?: QROptions) => Promise<string>;
  toString: (text: string, options?: QROptions) => Promise<string>;
};

/** Build a qrserver.com image URL for a given value */
export function buildQRImageUrl(value: string, size = 128): string {
  if (!value) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&data=${encodeURIComponent(value)}`;
}

/**
 * Returns a pseudo-QRCodeLib that renders via img element and qrserver API.
 * Keeps the same interface so existing code works without changes.
 */
export async function loadQRCode(): Promise<QRCodeLib> {
  return {
    toCanvas: async (
      canvas: HTMLCanvasElement,
      text: string,
      options?: QROptions,
    ): Promise<void> => {
      const size = options?.width || 128;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No canvas context"));
            return;
          }
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          resolve();
        };
        img.onerror = () => reject(new Error("QR image load failed"));
        img.src = buildQRImageUrl(text, size);
      });
    },
    toDataURL: async (text: string, options?: QROptions): Promise<string> => {
      const size = options?.width || 128;
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(buildQRImageUrl(text, size)); // fallback to URL
        img.src = buildQRImageUrl(text, size);
      });
    },
    toString: async (text: string): Promise<string> => {
      return buildQRImageUrl(text, 128);
    },
  };
}

export type QRCodeCanvas = QRCodeLib;

/** Generate a QR code as a PNG data URL (for print popups). */
export async function generateQRDataUrl(
  value: string,
  size = 120,
): Promise<string> {
  if (!value) return "";
  // Return URL directly for print popup use (works with <img src=...>)
  return buildQRImageUrl(value, size);
}

// ─── JsBarcode via CDN ───────────────────────────────────────────────────────

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

let jsbarcodePromise: Promise<JsBarcodeLib> | null = null;

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
      "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
    ).then(() => {
      const lib = (window as unknown as Record<string, unknown>).JsBarcode;
      if (!lib) throw new Error("JsBarcode not found after script load");
      return lib as JsBarcodeLib;
    });
  }
  return jsbarcodePromise;
}
