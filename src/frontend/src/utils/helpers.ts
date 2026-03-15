// Format currency in Indian number system
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (n: number): string => {
  return new Intl.NumberFormat("en-IN").format(n);
};

// Format date
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Simple password hash (btoa for demo)
export const hashPassword = (pwd: string): string => btoa(pwd);
export const verifyPassword = (pwd: string, hash: string): boolean =>
  btoa(pwd) === hash;

// Generate sequential IDs
export const generateId = (): string => crypto.randomUUID();

// Generate bill/invoice numbers
export const generateBillNo = (prefix: string, seq: number): string => {
  return `${prefix}${String(seq).padStart(4, "0")}`;
};

// AWB serial generation
export const generateNextAWBSerial = (
  currentSerial: string,
  logic: string,
  gap?: number,
  prefix?: string,
  _prefixPosition?: string,
): string => {
  if (logic === "sequential") {
    // Extract numeric part and increment
    const numMatch = currentSerial.match(/(\d+)$/);
    if (numMatch) {
      const num = Number.parseInt(numMatch[1]) + 1;
      const prefix_part = currentSerial.slice(
        0,
        currentSerial.length - numMatch[1].length,
      );
      return prefix_part + String(num).padStart(numMatch[1].length, "0");
    }
    return currentSerial;
  }

  if (logic === "custom_gap" && gap) {
    const num = Number.parseInt(currentSerial) + gap;
    return String(num);
  }

  if (logic === "sequential_prefix_first" && prefix) {
    const withoutPrefix = currentSerial.startsWith(prefix)
      ? currentSerial.slice(prefix.length)
      : currentSerial;
    const num = Number.parseInt(withoutPrefix) + 1;
    return prefix + String(num).padStart(withoutPrefix.length, "0");
  }

  if (logic === "sequential_prefix_second" && prefix) {
    const withoutPrefix = currentSerial.endsWith(prefix)
      ? currentSerial.slice(0, -prefix.length)
      : currentSerial;
    const num = Number.parseInt(withoutPrefix) + 1;
    return String(num).padStart(withoutPrefix.length, "0") + prefix;
  }

  return currentSerial;
};

// GST calculation
export const calculateGST = (
  amount: number,
  gstRate: number,
  type: "cgst" | "sgst" | "igst",
) => {
  const halfRate = gstRate / 2;
  if (type === "igst") {
    return (amount * gstRate) / 100;
  }
  return (amount * halfRate) / 100;
};

// Calculate tax-inclusive breakdown
export const getTaxBreakdown = (
  taxInclusiveAmount: number,
  gstRate: number,
) => {
  const baseAmount = (taxInclusiveAmount * 100) / (100 + gstRate);
  const taxAmount = taxInclusiveAmount - baseAmount;
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    cgst: Math.round((taxAmount / 2) * 100) / 100,
    sgst: Math.round((taxAmount / 2) * 100) / 100,
  };
};

// Export to CSV
export const exportToCSV = (
  data: Record<string, unknown>[],
  filename: string,
): void => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Export to Excel / CSV
export const exportToExcel = async (
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string,
): Promise<void> => {
  // Build a multi-sheet CSV-style workbook as a single file.
  // Each sheet is separated by a blank line.
  const allLines: string[] = [];
  for (const sheet of sheets) {
    if (sheet.data.length === 0) continue;
    allLines.push(`=== ${sheet.name} ===`);
    const headers = Object.keys(sheet.data[0]);
    allLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));
    for (const row of sheet.data) {
      allLines.push(
        headers
          .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    allLines.push("");
  }

  const csvContent = allLines.join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.xlsx$/, ".csv");
  a.click();
  URL.revokeObjectURL(url);
};

// WhatsApp share
export const shareOnWhatsApp = (
  invoiceNo: string,
  total: number,
  companyName: string,
): void => {
  const text = encodeURIComponent(
    `Invoice #${invoiceNo}\nTotal: ₹${formatNumber(total)}\nFrom: ${companyName}\nThank you for your business!`,
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
};

// Truncate text
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

// Get today's date string
export const getTodayStr = (): string => new Date().toISOString().split("T")[0];

/**
 * Convert a yyyy-mm-dd date string to ddmmyy format used in SKS AWB numbers.
 * e.g. "2026-02-17" -> "170226"
 */
export const dateToDdMmYy = (dateStr: string): string => {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
};

/**
 * Generate an SKS Global Express AWB number.
 * Format: SKS + 3-digit serial + D/W + ddmmyy
 * e.g. SKS001D170226
 * @param serial - the daily counter value (1, 2, 3...)
 * @param dateStr - yyyy-mm-dd date
 * @param isInternational - true => 'W', false => 'D'
 */
export const buildSKSAWB = (
  serial: number,
  dateStr: string,
  isInternational: boolean,
): string => {
  const serialPart = String(serial).padStart(3, "0");
  const typePart = isInternational ? "W" : "D";
  const datePart = dateToDdMmYy(dateStr);
  return `SKS${serialPart}${typePart}${datePart}`;
};

// Check if date is today
export const isToday = (dateStr: string): boolean => {
  return dateStr === getTodayStr();
};

/**
 * Convert a number to Indian currency words.
 * e.g. 11308 → "Eleven Thousand Three Hundred Eight Only"
 */
export const amountToWords = (amount: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const numToWords = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return `${ones[n]} `;
    if (n < 100)
      return `${tens[Math.floor(n / 10)]} ${n % 10 !== 0 ? `${ones[n % 10]} ` : ""}`;
    if (n < 1000)
      return `${ones[Math.floor(n / 100)]} Hundred ${numToWords(n % 100)}`;
    if (n < 100000)
      return `${numToWords(Math.floor(n / 1000))}Thousand ${numToWords(n % 1000)}`;
    if (n < 10000000)
      return `${numToWords(Math.floor(n / 100000))}Lakh ${numToWords(n % 100000)}`;
    return `${numToWords(Math.floor(n / 10000000))}Crore ${numToWords(n % 10000000)}`;
  };

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = numToWords(rupees).trim();
  if (!result) result = "Zero";
  result += " Rupees";
  if (paise > 0) {
    result += ` and ${numToWords(paise).trim()} Paise`;
  }
  return `${result} Only`;
};

// Debounce
export const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): T => {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
};

// Generate company prefix from company name (max 3 chars)
export function generateCompanyPrefix(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  // Take first letter of each word, up to 3 letters
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Get current financial year code e.g. "25-26"
export function getCurrentFYCode(): string {
  const now = new Date();
  const month = now.getMonth(); // 0=Jan, 3=Apr
  const year = now.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;
  return `${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
}
