// Type declarations for packages used via CDN/dynamic import without npm types

declare module "qrcode" {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: {
      dark?: string;
      light?: string;
    };
  }
  interface QRCodeStringOptions extends QRCodeOptions {
    type?: "svg" | "terminal" | "utf8";
  }
  function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions,
  ): Promise<void>;
  function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  // biome-ignore lint/suspicious/noShadowRestrictedNames: required for qrcode module declaration
  function toString(
    text: string,
    options?: QRCodeStringOptions,
  ): Promise<string>;
  const _default: {
    toCanvas: typeof toCanvas;
    toDataURL: typeof toDataURL;
    // biome-ignore lint/suspicious/noShadowRestrictedNames: required for qrcode module declaration
    toString: typeof toString;
  };
  export default _default;
}

declare module "jsbarcode" {
  interface JsBarcodeOptions {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    lineColor?: string;
    background?: string;
    fontSize?: number;
    margin?: number;
  }
  function JsBarcode(
    element: SVGSVGElement | HTMLCanvasElement | string,
    value: string,
    options?: JsBarcodeOptions,
  ): void;
  export default JsBarcode;
}
