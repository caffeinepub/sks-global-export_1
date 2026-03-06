// GST Number verification utility
// Uses free public GST verification endpoint
// GSTIN format: 2-digit state code + 10-char PAN + 1-digit entity + Z + 1-check digit

export interface GSTData {
  gstin: string;
  businessName: string;
  tradeName?: string;
  address: string;
  state: string;
  status: string;
  registrationDate?: string;
}

// Validate GSTIN format (15 chars: 2 digits + 10 PAN + 1 digit + Z + 1 alphanum)
export function validateGSTINFormat(gstin: string): boolean {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.toUpperCase().trim());
}

// Map state codes to state names
const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

export function getStateFromGSTIN(gstin: string): string {
  const code = gstin.substring(0, 2);
  return STATE_CODES[code] || "";
}

export async function verifyGSTIN(gstin: string): Promise<GSTData | null> {
  const normalized = gstin.toUpperCase().trim();
  if (!validateGSTINFormat(normalized)) return null;

  // Try the free GST check API
  try {
    const res = await fetch(
      `https://sheet.gstincheck.co.in/check/apikey/${normalized}`,
      { method: "GET", headers: { Accept: "application/json" } },
    );

    if (res.ok) {
      const json = await res.json();
      if (json?.flag === true && json?.data) {
        const d = json.data;
        const address = [
          d.pradr?.addr?.bnm,
          d.pradr?.addr?.st,
          d.pradr?.addr?.loc,
          d.pradr?.addr?.dst,
          d.pradr?.addr?.stcd,
          d.pradr?.addr?.pncd,
        ]
          .filter(Boolean)
          .join(", ");
        return {
          gstin: normalized,
          businessName: d.lgnm || "",
          tradeName: d.tradeName || d.tradenam || "",
          address,
          state: getStateFromGSTIN(normalized),
          status: d.sts || "Active",
          registrationDate: d.rgdt || "",
        };
      }
    }
  } catch {
    // Fall through to offline approach
  }

  // Offline fallback: extract state from GSTIN code, return partial info
  const state = getStateFromGSTIN(normalized);
  if (state) {
    return {
      gstin: normalized,
      businessName: "",
      address: "",
      state,
      status: "Format Valid",
    };
  }

  return null;
}
