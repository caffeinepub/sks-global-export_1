// Indian Pincode lookup via India Post API (api.postalpincode.in)
// Returns area, city (district), state, and metro/non-metro classification

export interface PincodeData {
  area: string;
  city: string;
  state: string;
  isMetro: boolean;
  metroLabel: string;
}

// Major Indian metro cities (used for Metro vs Non-Metro classification)
const METRO_CITIES = new Set([
  "mumbai",
  "delhi",
  "new delhi",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "ahmedabad",
  "chennai",
  "kolkata",
  "calcutta",
  "surat",
  "pune",
  "jaipur",
  "lucknow",
  "kanpur",
  "nagpur",
  "indore",
  "thane",
  "bhopal",
  "visakhapatnam",
  "patna",
  "vadodara",
  "ghaziabad",
  "ludhiana",
  "agra",
  "nashik",
  "faridabad",
  "meerut",
  "rajkot",
  "kalyan",
  "dombivali",
  "vasai",
  "virar",
  "varanasi",
  "srinagar",
  "aurangabad",
  "dhanbad",
  "amritsar",
  "navi mumbai",
  "allahabad",
  "prayagraj",
  "ranchi",
  "howrah",
  "coimbatore",
  "jabalpur",
  "gwalior",
  "vijayawada",
  "jodhpur",
  "madurai",
  "raipur",
  "kota",
  "chandigarh",
  "guwahati",
  "thiruvananthapuram",
  "trivandrum",
  "kochi",
  "cochin",
  "solapur",
]);

function isMetroCity(city: string): boolean {
  const normalized = city.toLowerCase().trim();
  for (const metro of METRO_CITIES) {
    if (normalized.includes(metro) || metro.includes(normalized)) return true;
  }
  return false;
}

export async function fetchPincodeData(
  pincode: string,
): Promise<PincodeData | null> {
  if (!/^\d{6}$/.test(pincode)) return null;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return null;
    const json = await res.json();

    if (!Array.isArray(json) || json[0]?.Status !== "Success") return null;

    const postOffices = json[0]?.PostOffice;
    if (!Array.isArray(postOffices) || postOffices.length === 0) return null;

    const po = postOffices[0];
    const area = po.Name || "";
    const city = po.District || po.Block || po.Division || "";
    const state = po.State || "";
    const metro = isMetroCity(city);

    return {
      area,
      city,
      state,
      isMetro: metro,
      metroLabel: metro ? "Metro" : "Non-Metro",
    };
  } catch {
    return null;
  }
}

export function formatPincodeAddress(data: PincodeData): string {
  return [data.area, data.city, data.state].filter(Boolean).join(", ");
}
