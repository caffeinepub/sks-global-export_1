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

export interface GeneralProduct {
  id: string;
  companyId: string;
  type: "general";
  name: string;
  category: string;
  unit: string;
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
}

export interface CourierBrand {
  id: string;
  companyId: string;
  type: "courier_awb";
  brandName: string;
  productType: string;
  serviceModes: string[];
  serialLogic:
    | "sequential_prefix_first"
    | "sequential_prefix_second"
    | "custom_gap"
    | "sequential";
  serialGap?: number;
  serialPrefix?: string;
  prefixPosition?: "first" | "second";
  sellingPrice: number;
  gstRate: number;
  isActive: boolean;
}

export interface AWBSerialRange {
  id: string;
  companyId: string;
  brandId: string;
  brandName: string;
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
  paymentMethod: "cash" | "upi" | "card" | "credit" | "mixed";
  paymentStatus: "paid" | "partial" | "pending";
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  isInvoiced: boolean;
  invoiceId?: string;
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
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
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
}

export interface CourierPickup {
  id: string;
  companyId: string;
  courierBrand: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedPieces: number;
  estimatedBoxes: number;
  status: "pending" | "confirmed" | "cancelled";
  confirmedPieces?: number;
  confirmedBoxes?: number;
  confirmedAt?: string;
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
}

export interface TariffWeightSlab {
  maxGrams: number | null; // null = "additional per 500g" slab
  price: number;
}

export interface CourierTariff {
  id: string;
  companyId: string;
  brandId: string;
  brandName: string;
  productType: string; // e.g. "Express", "Cargo Air", "Cargo Surface", "D Express", "Lite", "Priority", etc.
  zone: string; // e.g. "Within City", "Within State", etc.
  pricingMode: "slab" | "per_kg"; // slab = weight slabs, per_kg = minKg + ratePerKg
  slabs?: TariffWeightSlab[]; // used when pricingMode === "slab"
  minKg?: number; // used when pricingMode === "per_kg"
  ratePerKg?: number; // used when pricingMode === "per_kg"
  maxWeightKg?: number; // optional weight cap for warnings
  isGSTInclusive: boolean;
  isActive: boolean;
}
