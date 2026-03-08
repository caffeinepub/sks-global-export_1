// PDF / Image download helpers using bundled html2canvas + jsPDF (no CDN fallback needed)
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Captures the element as a canvas and returns its data URL.
 */
async function captureElement(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    allowTaint: true,
  });
}

/**
 * Downloads the given DOM element as a PDF file (direct download, no print dialog).
 */
export async function downloadAsPDF(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  try {
    const canvas = await captureElement(element);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.error("PDF download failed:", err);
    throw err;
  }
}

/**
 * Downloads the given DOM element as a JPEG image file.
 */
export async function downloadAsJPEG(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  try {
    const canvas = await captureElement(element);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("JPEG download failed:", err);
    throw err;
  }
}

/**
 * Downloads the given DOM element as a PNG image file.
 */
export async function downloadAsPNG(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  try {
    const canvas = await captureElement(element);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("PNG download failed:", err);
    throw err;
  }
}
