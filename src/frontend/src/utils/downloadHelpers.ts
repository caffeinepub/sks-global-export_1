/**
 * Download helpers — zero external dependencies, pure browser APIs only.
 *
 * PDF  → opens a clean print popup (browser "Save as PDF" from print dialog)
 * JPEG / PNG → serialises the element as an SVG foreignObject, draws it on a
 *              canvas, then downloads the canvas data URL.
 */

// ─── internal helpers ──────────────────────────────────────────────────────

/** Build a minimal print-popup HTML string from an element's innerHTML. */
function buildPrintHtml(element: HTMLElement, title: string): string {
  // Clone so we can mutate without affecting the live DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // Convert every <canvas> to <img> so it survives the popup serialisation
  const srcCanvases = element.querySelectorAll("canvas");
  const dstCanvases = clone.querySelectorAll("canvas");
  srcCanvases.forEach((src, i) => {
    try {
      const dataUrl = (src as HTMLCanvasElement).toDataURL("image/png");
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.width = `${src.clientWidth || src.width}px`;
      img.style.height = `${src.clientHeight || src.height}px`;
      dstCanvases[i]?.parentNode?.replaceChild(img, dstCanvases[i]);
    } catch {
      /* cross-origin canvas — skip */
    }
  });

  // Gather all <style> and <link rel="stylesheet"> from the host page
  const styleBlocks: string[] = [];
  for (const s of document.querySelectorAll("style")) {
    styleBlocks.push(`<style>${s.innerHTML}</style>`);
  }
  for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
    styleBlocks.push((l as HTMLLinkElement).outerHTML);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${styleBlocks.join("\n  ")}
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm 12mm 14mm; }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { border-collapse: collapse; }
    img { max-width: 100%; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${clone.innerHTML}</body>
</html>`;
}

/** Open a print popup, optionally auto-triggering print. */
function openPrintPopup(
  element: HTMLElement,
  title: string,
  autoPrint = false,
): void {
  const html = buildPrintHtml(element, title);
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) throw new Error("popup-blocked");
  w.document.write(html);
  w.document.close();
  w.focus();
  if (autoPrint) {
    // Give the browser time to render before triggering print
    setTimeout(() => {
      w.print();
    }, 700);
  }
}

// ─── public API ────────────────────────────────────────────────────────────

/**
 * Downloads a DOM element as PDF.
 * Opens a clean print popup; the user clicks "Save as PDF" in the print dialog.
 */
export async function downloadAsPDF(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  // filename hint shown in the browser's Save As dialog
  const title = filename.replace(/\.pdf$/i, "");
  openPrintPopup(element, title, true /* autoPrint */);
}

/**
 * Downloads a DOM element as a JPEG image.
 * Uses XMLSerializer + SVG foreignObject → Canvas → data URL (no libraries).
 */
export async function downloadAsJPEG(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await elementToDataUrl(element, "image/jpeg");
  triggerDownload(dataUrl, filename);
}

/**
 * Downloads a DOM element as a PNG image.
 */
export async function downloadAsPNG(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await elementToDataUrl(element, "image/png");
  triggerDownload(dataUrl, filename);
}

// ─── implementation details ────────────────────────────────────────────────

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Converts a DOM element to a data URL using SVG foreignObject + Canvas.
 * This is the only reliable zero-dependency way to screenshot a DOM element.
 */
async function elementToDataUrl(
  element: HTMLElement,
  mimeType: "image/jpeg" | "image/png",
): Promise<string> {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 794; // A4 @96dpi ≈ 794px
  const height = Math.ceil(rect.height) || 1123;

  // Clone the element to avoid mutating the live DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // Convert canvases to img tags
  const srcCanvases = element.querySelectorAll("canvas");
  const dstCanvases = clone.querySelectorAll("canvas");
  srcCanvases.forEach((src, i) => {
    try {
      const dataUrl = (src as HTMLCanvasElement).toDataURL("image/png");
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.width = `${src.clientWidth || src.width}px`;
      img.style.height = `${src.clientHeight || src.height}px`;
      dstCanvases[i]?.parentNode?.replaceChild(img, dstCanvases[i]);
    } catch {
      /* skip */
    }
  });

  // Gather all inline styles from the page
  let cssText = "";
  for (const s of document.querySelectorAll("style")) {
    cssText += s.innerHTML;
  }

  // Wrap in a <div> with explicit dimensions for the SVG viewport
  const wrapper = document.createElement("div");
  wrapper.style.width = `${width}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.background = "white";
  wrapper.style.fontFamily = "Arial, Helvetica, sans-serif";
  wrapper.style.fontSize = "11px";
  wrapper.style.color = "#111";
  wrapper.appendChild(clone);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xhtml", "http://www.w3.org/1999/xhtml");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  // Embed CSS
  const defs = document.createElementNS(svgNS, "defs");
  const styleEl = document.createElementNS(svgNS, "style");
  styleEl.textContent = cssText;
  defs.appendChild(styleEl);
  svg.appendChild(defs);

  // Add a white background rect
  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "white");
  svg.appendChild(bg);

  const fo = document.createElementNS(svgNS, "foreignObject");
  fo.setAttribute("x", "0");
  fo.setAttribute("y", "0");
  fo.setAttribute("width", String(width));
  fo.setAttribute("height", String(height));
  fo.appendChild(wrapper);
  svg.appendChild(fo);

  // Serialise SVG to a data URL
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = 2; // retina quality
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D context"));
          return;
        }
        ctx.scale(scale, scale);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(svgUrl);
        const quality = mimeType === "image/jpeg" ? 0.95 : undefined;
        resolve(canvas.toDataURL(mimeType, quality));
      } catch (err) {
        URL.revokeObjectURL(svgUrl);
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(svgUrl);
      reject(err);
    };
    img.src = svgUrl;
  });
}
