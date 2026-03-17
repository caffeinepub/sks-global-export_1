/**
 * Loaders for QRCode (CDN) and JsBarcode (CDN).
 * Both are loaded dynamically via CDN scripts for reliability without npm deps.
 */

import type QRCodeLib from "qrcode";

// ─── QR Code via CDN (qrcode.min.js) ─────────────────────────────────────────

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

type QRCodeCanvas = {
  toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: Record<string, unknown>,
  ): Promise<void>;
  toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
};

let qrCodePromise: Promise<QRCodeCanvas> | null = null;

export async function loadQRCode(): Promise<typeof QRCodeLib> {
  if (!qrCodePromise) {
    qrCodePromise = loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js",
    )
      .then(() => {
        const lib = (window as unknown as Record<string, unknown>).QRCode;
        if (!lib) throw new Error("QRCode not found after script load");
        return lib as unknown as QRCodeCanvas;
      })
      .catch(() => {
        // fallback stub
        return {
          toCanvas: async () => {},
          toDataURL: async () => "",
        } as QRCodeCanvas;
      });
  }
  return qrCodePromise as unknown as Promise<typeof QRCodeLib>;
}

// ─── JsBarcode via CDN ────────────────────────────────────────────────────────

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

// Cache promise so we only load jsbarcode script once
let jsbarcodePromise: Promise<JsBarcodeLib> | null = null;

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
