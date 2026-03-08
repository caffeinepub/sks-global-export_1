// ─── CSV Export / Import Helpers ──────────────────────────────────────────────
// Pure browser-native implementation (no external libraries required)

/**
 * Export data as a CSV file download.
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): void {
  const escapeCSV = (
    v: string | number | boolean | null | undefined,
  ): string => {
    const s = String(v ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csvContent = [
    headers.map(escapeCSV),
    ...rows.map((r) => r.map(escapeCSV)),
  ]
    .map((r) => r.join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse a CSV string into a 2D array of strings.
 * Handles quoted fields, embedded commas, and escaped quotes.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let i = 0;
  const len = normalized.length;

  while (i < len) {
    const row: string[] = [];

    while (i < len && normalized[i] !== "\n") {
      if (normalized[i] === '"') {
        // Quoted field
        let field = "";
        i++; // skip opening quote
        while (i < len) {
          if (normalized[i] === '"') {
            if (i + 1 < len && normalized[i + 1] === '"') {
              // Escaped quote
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += normalized[i];
            i++;
          }
        }
        row.push(field);
        // Skip comma separator
        if (i < len && normalized[i] === ",") i++;
      } else {
        // Unquoted field
        let field = "";
        while (i < len && normalized[i] !== "," && normalized[i] !== "\n") {
          field += normalized[i];
          i++;
        }
        row.push(field.trim());
        // Skip comma separator
        if (i < len && normalized[i] === ",") i++;
      }
    }

    // Skip newline
    if (i < len && normalized[i] === "\n") i++;

    // Only add non-empty rows
    if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
      rows.push(row);
    }
  }

  return rows;
}

// ─── Sample CSV Templates ──────────────────────────────────────────────────────

export function getSampleCustomersCSV(): string {
  const lines = [
    "Name,Phone,Email,Address,GSTIN,Customer Type (registered/walking)",
    "Rajesh Kumar,9876543210,rajesh@email.com,123 Main St Chennai,29ABCDE1234F1Z5,registered",
    "Priya Traders,9876543211,priya@traders.com,45 Market Road Bangalore,29XYZPQ9876B1Z3,registered",
    "Suresh Electronics,9876543212,suresh@elec.com,78 Gandhi Nagar,29QWERT5678C2Z9,registered",
    "Walking Customer,9999999999,,,, walking",
  ];
  return lines.join("\n");
}

export function getSampleVendorsCSV(): string {
  const lines = [
    "Name,Phone,Email,Address,GSTIN",
    "ABC Paper Mart,9876543210,abc@email.com,456 Market Rd Chennai,29ABCDE1234F1Z5",
    "DTDC Supply Hub,9876543211,dtdc@supply.com,12 Courier Lane,29XYZAB1234C2Z6",
    "BlueDart Depot,9876543212,bluedart@depot.com,34 Express Road,29PQRST5678D3Z7",
    "Packaging Plus,9876543213,pack@plus.com,56 Industrial Area,,",
  ];
  return lines.join("\n");
}

export function getSampleProductsCSV(): string {
  const lines = [
    "Name,Category,Unit,MRP,Selling Price,Purchase Price,GST Rate (%),HSN Code,Min Stock Alert,Current Stock",
    "A4 Paper (Ream),Stationery,Ream,120,105,80,12,48202000,10,50",
    "Stapler,Stationery,Piece,150,130,90,18,83051000,5,20",
    "Bubble Wrap (Roll),Packaging,Roll,200,180,130,18,39219090,3,10",
    "Envelope (Pack of 50),Stationery,Pack,60,50,35,12,48171000,10,30",
    "Office Tape,Stationery,Piece,25,20,12,12,39191000,10,50",
  ];
  return lines.join("\n");
}

export function getSampleCategoriesCSV(): string {
  const lines = [
    "Name,Type (General/Courier/Both),Parent Category Name",
    "Office Supplies,General,",
    "Packaging Material,General,",
    "Paper Products,General,Office Supplies",
    "Courier Services,Courier,",
    "Air Courier,Courier,Courier Services",
    "Surface Courier,Courier,Courier Services",
  ];
  return lines.join("\n");
}

export function getSampleStockUpdateCSV(): string {
  const lines = [
    "Product Name,New Stock Quantity,Reason",
    "A4 Paper (Ream),100,Purchase received",
    "Stapler,25,Purchase received",
    "Bubble Wrap (Roll),15,Stock count correction",
    "Envelope (Pack of 50),40,Purchase received",
  ];
  return lines.join("\n");
}

export function getSampleAWBSerialsCSV(): string {
  const lines = [
    "Brand Name,Product Type,From Serial,To Serial,Purchase Date (DD/MM/YYYY)",
    "DTDC,D Express,1234567890,1234567999,15/01/2026",
    "BlueDart,Priority,9876543210,9876543299,20/01/2026",
    "Delhivery,Express,5555000001,5555000100,25/01/2026",
    "DTDC,Cargo Air,4800000001,4800000050,28/01/2026",
  ];
  return lines.join("\n");
}

/**
 * Trigger download of a CSV string as a file.
 */
export function downloadCSVString(filename: string, csvContent: string): void {
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
