export interface Company {
  id: string;
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  logoUrl?: string;
  invoicePrefix: string;
  invoiceSeq: number;
  nonGstInvoicePrefix: string;
  nonGstInvoiceSeq: number;
  billPrefix: string;
  billSeq: number;
  state: string;
  pincode: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  upiName?: string;
}

export interface AppUser {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: "admin" | "manager" | "operator";
  companyIds: string[];
}

export type ProductType = "general" | "courier_awb" | "xerox" | "service";

// ─── Pricing Slabs (multi-tier quantity-based pricing) ────────────────────────
export interface PricingSlab {
  minQty: number;
  maxQty: number | null; // null means "and above" (unlimited)
  price: number;
}

// ─── Named Pricing Tiers (Retail / Super Retail / Wholesale / Super Wholesale) ─
export type PricingTierName =
  | "retail"
  | "super_retail"
  | "wholesale"
  | "super_wholesale";

export interface PricingTier {
  name: PricingTierName;
  minQty: number;
  maxQty: number | null; // null = unlimited
  mrp: number;
  sellingPrice: number;
}

export interface GeneralProduct {
  id: string;
  companyId: string;
  type: "general";
  name: string;
  category: string;
  unit: string;
  mrp?: number; // maximum retail price
  subUnit1?: { name: string; conversionRate: number };
  subUnit2?: { name: string; conversionRate: number };
  subUnit3?: { name: string; conversionRate: number };
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;
  hsnCode: string;
  currentStock: number;
  minStockAlert: number;
  isActive: boolean;
  usePricingSlabs?: boolean;
  pricingSlabs?: PricingSlab[];
  pricingTiers?: PricingTier[]; // named tier pricing (retail/super_retail/wholesale/super_wholesale)
  priceIncludesGST?: boolean; // if true (default), sellingPrice already includes GST
  productSubUnit1?: {
    unitId: string;
    name: string;
    conversionRate: number;
    mrp?: number;
    sellingPrice?: number;
    costPrice?: number;
  };
  productSubUnit2?: {
    unitId: string;
    name: string;
    conversionRate: number;
    mrp?: number;
    sellingPrice?: number;
    costPrice?: number;
  };
  productSubUnit3?: {
    unitId: string;
    name: string;
    conversionRate: number;
    mrp?: number;
    sellingPrice?: number;
    costPrice?: number;
  };
}

// Individual product under a courier brand (each brand can have many products)
export interface CourierProduct {
  id: string;
  productType: string; // e.g. "D Express", "Lite", "Priority", "Air Cargo", "Surface Cargo"
  category: "Courier" | "Cargo"; // Courier = document/small parcel, Cargo = heavy freight
  transportModes: "Air" | "Surface" | "Both";
  serviceModes: string[]; // e.g. ["Air", "Surface", "GEC"]
  serialLogic:
    | "sequential_prefix_first"
    | "sequential_prefix_second"
    | "custom_gap"
    | "sequential"
    | "own_brand_auto";
  serialPrefix?: string; // prefix letters/numbers that identify this product's AWB
  prefixPosition?: "first" | "second"; // where the prefix appears
  serialGap?: number;
  sellingPrice: number;
  gstRate: number;
  isActive: boolean;
  usePricingSlabs?: boolean;
  pricingSlabs?: PricingSlab[];
}

export interface CourierBrand {
  id: string;
  companyId: string;
  type: "courier_awb";
  brandName: string;
  brandSubtitle?: string; // e.g. "Domestic and International"
  category?: "Courier" | "Cargo" | "Both"; // brand-level category
  // Legacy top-level fields kept for backward compatibility
  productType: string;
  serviceModes: string[];
  transportModes: "Air" | "Surface" | "Both"; // fixed transport mode for this brand
  serialLogic:
    | "sequential_prefix_first"
    | "sequential_prefix_second"
    | "custom_gap"
    | "sequential"
    | "own_brand_auto"; // SKS own-brand: auto-generate AWB on booking
  serialGap?: number;
  serialPrefix?: string;
  prefixPosition?: "first" | "second";
  isOwnBrand?: boolean; // true for SKS Global Express
  sellingPrice: number;
  gstRate: number;
  isActive: boolean;
  // New: per-brand product list (each product has its own type, serial logic, prefix, etc.)
  courierProducts?: CourierProduct[];
}

export interface AWBSerialRange {
  id: string;
  companyId: string;
  brandId: string;
  brandName: string;
  productId?: string; // references CourierProduct.id within the brand
  productTypeName?: string; // display name of the product type
  fromSerial: string;
  toSerial: string;
  quantity: number;
  purchaseDate: string;
  vendorId?: string;
  usedSerials: string[];
  availableSerials: string[];
}

export interface XeroxProduct {
  id: string;
  companyId: string;
  type: "xerox";
  name: string;
  paperProductId: string;
  inkChargePerPage: number;
  serviceChargePerPage: number;
  pricePerPage: number;
  gstRate: number;
  isActive: boolean;
  usePricingSlabs?: boolean;
  pricingSlabs?: PricingSlab[];
  xeroxRanges?: { from: number; to: number; price: number }[];
  useXeroxRanges?: boolean;
  materials?: Array<{ productId: string; quantity: number; label: string }>;
}

export interface ServiceProduct {
  id: string;
  companyId: string;
  type: "service";
  name: string;
  description: string;
  price: number;
  gstRate: number;
  sacCode: string;
  isActive: boolean;
}

export type AnyProduct =
  | GeneralProduct
  | CourierBrand
  | XeroxProduct
  | ServiceProduct;

export interface CustomerTariffAssignment {
  tariffId: string; // references CourierTariff.id
  brandName: string;
  productType: string;
  zone: string;
  customPrice: number; // customer-specific override price
}

export interface Customer {
  id: string;
  companyId: string;
  customerType: "registered" | "walking";
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  locationLink?: string;
  totalPurchases: number;
  isActive: boolean;
  tariffAssignments?: CustomerTariffAssignment[];
}

export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  totalPurchases: number;
  isActive: boolean;
}

export interface AdditionalCharge {
  id: string;
  label: string; // "Packing Charge" | "Pickup Charge" | "Old Balance" | "Wastage" | custom
  amount: number; // can be negative (deduction)
  showInBill: boolean; // if false, silently distribute into item totals
}

export interface BillItem {
  id: string;
  productId: string;
  productType: ProductType;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  awbSerial?: string;
  serviceMode?: string;
  brandName?: string;
  unitPrice: number;
  totalPrice: number;
  gstRate: number;
  discountType?: "amount" | "percent";
  discountValue?: number; // raw input value (e.g. 10 for 10% or ₹10)
  discountAmount?: number; // computed discount in ₹
  trackingStatus?:
    | "booked"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "rto"
    | "exception"
    | "hold";
  trackingNotes?: Array<{ date: string; note: string; status: string }>;
  // Courier slip fields
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverPincode?: string;
  actualWeightKg?: number;
  volumetricWeightKg?: number;
  chargeableWeightKg?: number;
}

export interface Bill {
  id: string;
  companyId: string;
  billNo: string;
  customerId: string;
  customerName: string;
  customerType: "registered" | "walking";
  date: string;
  items: BillItem[];
  subtotal: number;
  total: number;
  billDiscount?: number; // total bill-level discount in ₹
  additionalCharges?: AdditionalCharge[]; // visible charges saved on bill
  paymentMethod: "cash" | "upi" | "card" | "credit" | "mixed";
  paymentStatus: "paid" | "partial" | "pending";
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  isInvoiced: boolean;
  invoiceId?: string;
  paymentLogs?: PaymentLog[];
  createdBy?: string; // username of employee who created this bill
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNo: string;
  invoiceType: "gst" | "non_gst";
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerAddress?: string;
  billIds: string[];
  date: string;
  items: BillItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  createdBy?: string; // username of employee who generated this invoice
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  gstRate: number; // 0, 5, 12, 18, 28
  awbFrom?: string;
  awbTo?: string;
}

export interface PurchaseInvoice {
  id: string;
  companyId: string;
  invoiceNo: string;
  vendorId: string;
  vendorName: string;
  date: string;
  items: PurchaseInvoiceItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentStatus: "paid" | "partial" | "pending";
  notes?: string;
  amountPaid?: number;
  createdBy?: string;
}

export interface CourierPickup {
  id: string;
  companyId: string;
  courierBrand: string; // kept for backward compat (service/product label)
  serviceLabel?: string; // display label: brand name, product name, etc.
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerType?: "registered" | "walking";
  scheduledDate: string;
  scheduledTime: string;
  estimatedPieces: number;
  estimatedBoxes: number;
  status: "pending" | "confirmed" | "cancelled";
  confirmedPieces?: number;
  confirmedBoxes?: number;
  confirmedAt?: string;
  pickedQty?: number;
  pickedUnit?: "pieces" | "boxes";
  customerLocation?: string;
  notes?: string;
}

export interface PaymentLog {
  id: string;
  date: string;
  amount: number;
  method: "cash" | "upi" | "card" | "credit";
  notes?: string;
}

export interface Expense {
  id: string;
  companyId: string;
  date: string;
  category:
    | "Rent"
    | "Salary"
    | "Utilities"
    | "Stationery"
    | "Transport"
    | "Courier"
    | "Maintenance"
    | "Misc";
  description: string;
  amount: number;
  notes?: string;
}

export interface CompanySettings {
  gstInvoicePrefix: string;
  gstInvoiceSeq: number;
  nonGstInvoicePrefix: string;
  nonGstInvoiceSeq: number;
  billPrefix: string;
  billSeq: number;
  taxRates: number[];
  defaultPaymentMethod: string;
  autoBackup: boolean;
  backupFrequency: "daily" | "weekly";
  lastBackupTime?: string;
  invoiceFooter?: string;
  defaultGstRate?: number;
  invoiceTemplate?: "default" | "retail" | "courier";
}

export interface TariffWeightSlab {
  maxGrams: number | null; // null = "additional per unit" slab
  price: number;
  unitGrams?: number; // for additional slab: the unit size in grams (default 500)
}

export interface CourierTariff {
  id: string;
  companyId: string;
  brandId: string;
  brandName: string;
  productType: string; // e.g. "Express", "Cargo Air", "Cargo Surface", "D Express", "Lite", "Priority", etc.
  zone: string; // e.g. "Within City", "Within State", etc.
  transportMode: "Air" | "Surface" | "Both"; // transport mode for this tariff entry
  tariffKind: "selling" | "cost"; // distinguish selling vs cost price tariffs
  pricingMode: "slab" | "per_kg"; // slab = weight slabs, per_kg = minKg + ratePerKg
  slabs?: TariffWeightSlab[]; // used when pricingMode === "slab"
  aboveSlabRatePerKg?: number; // per-kg rate for weights above all fixed slabs
  minKg?: number; // used when pricingMode === "per_kg"
  ratePerKg?: number; // used when pricingMode === "per_kg"
  maxWeightKg?: number; // optional weight cap for warnings
  isGSTInclusive: boolean;
  isActive: boolean;
  tariffName?: string; // e.g. "SPL Rate", "SPL1 Rate", "Standard"
  showInBilling?: boolean; // if false, hidden from POS billing
  billingCategory?: string; // e.g. "Common", "Special Rates", "Customer Specific"
}

// ─── Design Studio ────────────────────────────────────────────────────────────
export type DesignStatus =
  | "pending"
  | "designing"
  | "ready_print"
  | "printing"
  | "completed"
  | "delivered";

export type DesignType =
  | "id_card"
  | "visiting_card"
  | "passport_photo"
  | "stamp_photo"
  | "banner"
  | "letterhead"
  | "envelope"
  | "certificate"
  | "custom";

export interface DesignOrder {
  id: string;
  companyId: string;
  orderNo: string; // e.g. DS001
  date: string; // ISO
  customerId?: string;
  customerName: string;
  customerPhone: string;
  designType: DesignType;
  subType: string;
  quantity: number;
  material: string;
  lamination: "None" | "Gloss" | "Matt" | "Soft Touch";
  colorMode: "Color" | "Black & White";
  designSource: "Customer File" | "We Design" | "Use Template";
  specialInstructions: string;
  deliveryDate: string; // ISO date
  price: number;
  gstIncluded: boolean;
  gstRate: number;
  advancePaid: number;
  status: DesignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DesignPricingMaster {
  id: string;
  companyId: string;
  serviceName: string;
  designType: DesignType;
  unit: "per piece" | "per sheet" | "per sqft" | "per set";
  basePrice: number;
  gstRate: number;
  isActive: boolean;
}

// ─── Categories ───────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  type: "General" | "Courier" | "Both";
  parentId: string | null; // null = top-level category
  color?: string;
}

// ─── Product Units ────────────────────────────────────────────────────────────
export interface ProductSubUnit {
  name: string;
  conversionRate: number; // how many of the base unit make 1 of this sub-unit
  mrp?: number;
  sellingPrice?: number;
  costPrice?: number;
}

export interface ProductUnit {
  id: string;
  name: string; // e.g. "Piece"
  symbol: string; // e.g. "pcs"
  mrp?: number; // MRP for the main unit
  sellingPrice?: number; // Selling price for the main unit
  subUnit1?: ProductSubUnit; // e.g. {name: "Box", conversionRate: 12}
  subUnit2?: ProductSubUnit; // e.g. {name: "Carton", conversionRate: 144}
  subUnit3?: ProductSubUnit; // e.g. {name: "Master Carton", conversionRate: 1440}
}

// ─── Courier Query / Follow-up Ticket ─────────────────────────────────────────
export type QueryPriority = "low" | "medium" | "high" | "urgent";
export type QueryStatus = "open" | "in_progress" | "resolved" | "closed";

export interface QueryFollowUpLog {
  id: string;
  date: string; // ISO
  note: string;
  by: string; // username
  status: QueryStatus; // status at time of log
}

export interface CourierQuery {
  id: string;
  companyId: string;
  ticketNo: string; // e.g. TKT001
  awbNo: string;
  brandName: string;
  billId?: string;
  billNo?: string;
  customerName: string;
  customerPhone?: string;
  subject: string;
  description: string;
  priority: QueryPriority;
  status: QueryStatus;
  raisedBy: string; // username
  assignedTo?: string; // username
  createdAt: string; // ISO
  updatedAt: string; // ISO
  followUpLogs: QueryFollowUpLog[];
}
