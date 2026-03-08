import type {
  AWBSerialRange,
  AnyProduct,
  AppUser,
  Bill,
  Category,
  Company,
  CompanySettings,
  CourierBrand,
  CourierPickup,
  CourierTariff,
  Customer,
  CustomerTariffAssignment,
  DesignOrder,
  DesignPricingMaster,
  Expense,
  Invoice,
  ProductUnit,
  PurchaseInvoice,
  Vendor,
} from "../types";
import { emitSaved, emitSaving } from "./saveEvents";

/**
 * All transactional data (bills, products, customers, etc.) is shared
 * across all companies. Only company profile / invoice sequences are per-company.
 * Using "shared" as the fixed company-id for storage keys.
 */
export const SHARED_DATA_ID = "shared";

// Keys
export const KEYS = {
  COMPANIES: "sks_companies",
  ACTIVE_COMPANY: "sks_active_company",
  USERS: "sks_users",
  ACTIVE_USER: "sks_active_user",
  LAST_BACKUP: "sks_last_backup",
  bills: (cid: string) => `sks_bills_${cid}`,
  invoices: (cid: string) => `sks_invoices_${cid}`,
  products: (cid: string) => `sks_products_${cid}`,
  customers: (cid: string) => `sks_customers_${cid}`,
  vendors: (cid: string) => `sks_vendors_${cid}`,
  courierBrands: (cid: string) => `sks_courier_brands_${cid}`,
  awbSerials: (cid: string) => `sks_awb_serials_${cid}`,
  pickups: (cid: string) => `sks_pickups_${cid}`,
  purchaseInvoices: (cid: string) => `sks_purchase_invoices_${cid}`,
  settings: (cid: string) => `sks_settings_${cid}`,
  tariffs: (cid: string) => `sks_tariffs_${cid}`,
  costTariffs: (cid: string) => `sks_cost_tariffs_${cid}`,
  customerTariffs: (cid: string) => `sks_customer_tariffs_${cid}`,
  expenses: (cid: string) => `sks_expenses_${cid}`,
  designOrders: (cid: string) => `sks_design_orders_${cid}`,
  designPricing: (cid: string) => `sks_design_pricing_${cid}`,
};

function get<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  emitSaving();
  localStorage.setItem(key, JSON.stringify(value));
  emitSaved();
}

// Companies
export const getCompanies = (): Company[] => get<Company[]>(KEYS.COMPANIES, []);
export const setCompanies = (c: Company[]): void => set(KEYS.COMPANIES, c);
export const getActiveCompanyId = (): string =>
  get<string>(KEYS.ACTIVE_COMPANY, "");
export const setActiveCompanyId = (id: string): void =>
  set(KEYS.ACTIVE_COMPANY, id);
export const getActiveCompany = (): Company | null => {
  const id = getActiveCompanyId();
  if (!id) return null;
  return getCompanies().find((c) => c.id === id) ?? null;
};

// Users
export const getUsers = (): AppUser[] => get<AppUser[]>(KEYS.USERS, []);
export const setUsers = (u: AppUser[]): void => set(KEYS.USERS, u);
export const getActiveUser = (): AppUser | null =>
  get<AppUser | null>(KEYS.ACTIVE_USER, null);
export const setActiveUser = (u: AppUser | null): void =>
  set(KEYS.ACTIVE_USER, u);

// Per-company data
export const getBills = (cid: string): Bill[] =>
  get<Bill[]>(KEYS.bills(cid), []);
export const setBills = (cid: string, d: Bill[]): void =>
  set(KEYS.bills(cid), d);

export const getInvoices = (cid: string): Invoice[] =>
  get<Invoice[]>(KEYS.invoices(cid), []);
export const setInvoices = (cid: string, d: Invoice[]): void =>
  set(KEYS.invoices(cid), d);

export const getProducts = (cid: string): AnyProduct[] =>
  get<AnyProduct[]>(KEYS.products(cid), []);
export const setProducts = (cid: string, d: AnyProduct[]): void =>
  set(KEYS.products(cid), d);

export const getCustomers = (cid: string): Customer[] =>
  get<Customer[]>(KEYS.customers(cid), []);
export const setCustomers = (cid: string, d: Customer[]): void =>
  set(KEYS.customers(cid), d);

export const getVendors = (cid: string): Vendor[] =>
  get<Vendor[]>(KEYS.vendors(cid), []);
export const setVendors = (cid: string, d: Vendor[]): void =>
  set(KEYS.vendors(cid), d);

export const getCourierBrands = (cid: string): CourierBrand[] =>
  get<CourierBrand[]>(KEYS.courierBrands(cid), []);
export const setCourierBrands = (cid: string, d: CourierBrand[]): void =>
  set(KEYS.courierBrands(cid), d);

export const getAWBSerials = (cid: string): AWBSerialRange[] =>
  get<AWBSerialRange[]>(KEYS.awbSerials(cid), []);
export const setAWBSerials = (cid: string, d: AWBSerialRange[]): void =>
  set(KEYS.awbSerials(cid), d);

export const getPickups = (cid: string): CourierPickup[] =>
  get<CourierPickup[]>(KEYS.pickups(cid), []);
export const setPickups = (cid: string, d: CourierPickup[]): void =>
  set(KEYS.pickups(cid), d);

export const getPurchaseInvoices = (cid: string): PurchaseInvoice[] =>
  get<PurchaseInvoice[]>(KEYS.purchaseInvoices(cid), []);
export const setPurchaseInvoices = (cid: string, d: PurchaseInvoice[]): void =>
  set(KEYS.purchaseInvoices(cid), d);

export const getSettings = (cid: string): CompanySettings =>
  get<CompanySettings>(KEYS.settings(cid), {
    gstInvoicePrefix: "GST/",
    gstInvoiceSeq: 1,
    nonGstInvoicePrefix: "INV/",
    nonGstInvoiceSeq: 1,
    billPrefix: "BILL/",
    billSeq: 1,
    taxRates: [0, 5, 12, 18, 28],
    defaultPaymentMethod: "cash",
    autoBackup: true,
    backupFrequency: "daily",
  });
export const setSettings = (cid: string, d: CompanySettings): void =>
  set(KEYS.settings(cid), d);

export const getTariffs = (cid: string): CourierTariff[] =>
  get<CourierTariff[]>(KEYS.tariffs(cid), []);
export const setTariffs = (cid: string, d: CourierTariff[]): void =>
  set(KEYS.tariffs(cid), d);

export const getCostTariffs = (cid: string): CourierTariff[] =>
  get<CourierTariff[]>(KEYS.costTariffs(cid), []);
export const setCostTariffs = (cid: string, d: CourierTariff[]): void =>
  set(KEYS.costTariffs(cid), d);

export const getCustomerTariffMap = (
  cid: string,
): Record<string, CustomerTariffAssignment[]> =>
  get<Record<string, CustomerTariffAssignment[]>>(
    KEYS.customerTariffs(cid),
    {},
  );
export const setCustomerTariffMap = (
  cid: string,
  d: Record<string, CustomerTariffAssignment[]>,
): void => set(KEYS.customerTariffs(cid), d);

export const getExpenses = (cid: string): Expense[] =>
  get<Expense[]>(KEYS.expenses(cid), []);
export const setExpenses = (cid: string, d: Expense[]): void =>
  set(KEYS.expenses(cid), d);

export const getDesignOrders = (cid: string): DesignOrder[] =>
  get<DesignOrder[]>(KEYS.designOrders(cid), []);
export const setDesignOrders = (cid: string, d: DesignOrder[]): void =>
  set(KEYS.designOrders(cid), d);

export const getDesignPricing = (cid: string): DesignPricingMaster[] =>
  get<DesignPricingMaster[]>(KEYS.designPricing(cid), []);
export const setDesignPricing = (cid: string, d: DesignPricingMaster[]): void =>
  set(KEYS.designPricing(cid), d);

// SKS Own-Brand Daily AWB Counter
// Key: sks_awb_daily_{companyId}_{dateStr}  (dateStr = ddmmyy)
const sksDailyKey = (cid: string, dateStr: string) =>
  `sks_awb_daily_${cid}_${dateStr}`;

export const getSKSDailyCounter = (cid: string, dateStr: string): number => {
  const val = localStorage.getItem(sksDailyKey(cid, dateStr));
  return val ? Number.parseInt(val, 10) : 0;
};

/** Increments the daily counter and returns the NEW value (1-based). */
export const incrementSKSDailyCounter = (
  cid: string,
  dateStr: string,
): number => {
  const current = getSKSDailyCounter(cid, dateStr);
  const next = current + 1;
  localStorage.setItem(sksDailyKey(cid, dateStr), String(next));
  return next;
};

// ─── GST Invoice Sequence (shared across companies with same GSTIN) ───────────
// Key: sks_gst_inv_seq_{normalised_gstin}
// Returns the NEXT seq number to use and increments it atomically.
const gstInvSeqKey = (gstin: string) =>
  `sks_gst_inv_seq_${gstin.trim().toUpperCase()}`;

export const getGSTInvoiceSeq = (gstin: string): number => {
  const val = localStorage.getItem(gstInvSeqKey(gstin));
  return val ? Number.parseInt(val, 10) : 1;
};

/** Returns the current seq without incrementing (for preview). */
export const peekGSTInvoiceSeq = (gstin: string): number =>
  getGSTInvoiceSeq(gstin);

/** Increments and returns the NEW seq number after increment. */
export const nextGSTInvoiceSeq = (gstin: string): number => {
  const current = getGSTInvoiceSeq(gstin);
  localStorage.setItem(gstInvSeqKey(gstin), String(current + 1));
  return current;
};

// ─── Non-GST Invoice Sequence (per company, since no GSTIN ties them) ─────────
// Key: sks_nongst_inv_seq_{companyId}
const nonGstInvSeqKey = (companyId: string) =>
  `sks_nongst_inv_seq_${companyId}`;

export const getNonGSTInvoiceSeq = (companyId: string): number => {
  const val = localStorage.getItem(nonGstInvSeqKey(companyId));
  return val ? Number.parseInt(val, 10) : 1;
};

export const nextNonGSTInvoiceSeq = (companyId: string): number => {
  const current = getNonGSTInvoiceSeq(companyId);
  localStorage.setItem(nonGstInvSeqKey(companyId), String(current + 1));
  return current;
};

// ─── Global Categories (not company-scoped) ───────────────────────────────────
const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-stationery", name: "Stationery", type: "General", parentId: null },
  { id: "cat-courier", name: "Courier", type: "Courier", parentId: null },
  { id: "cat-general", name: "General", type: "Both", parentId: null },
  { id: "cat-cargo", name: "Cargo", type: "Courier", parentId: null },
  {
    id: "cat-print",
    name: "Printing & Xerox",
    type: "General",
    parentId: null,
  },
];

export const getCategories = (): Category[] => {
  const stored = get<Category[] | null>("sks_categories", null);
  if (!stored || stored.length === 0) {
    localStorage.setItem("sks_categories", JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return stored;
};

export const setCategories = (cats: Category[]): void =>
  set("sks_categories", cats);

// ─── Global Units (not company-scoped) ───────────────────────────────────────
const DEFAULT_UNITS: ProductUnit[] = [
  {
    id: "unit-piece",
    name: "Piece",
    symbol: "pcs",
    subUnit1: { name: "Box", conversionRate: 12 },
    subUnit2: { name: "Carton", conversionRate: 144 },
  },
  { id: "unit-sheet", name: "Sheet", symbol: "sht" },
  {
    id: "unit-ream",
    name: "Ream",
    symbol: "ream",
    subUnit1: { name: "Sheet", conversionRate: 500 },
  },
  {
    id: "unit-kg",
    name: "Kilogram",
    symbol: "kg",
    subUnit1: { name: "Gram", conversionRate: 1000 },
  },
  {
    id: "unit-meter",
    name: "Meter",
    symbol: "m",
    subUnit1: { name: "Centimeter", conversionRate: 100 },
  },
  { id: "unit-set", name: "Set", symbol: "set" },
  { id: "unit-pack", name: "Pack", symbol: "pk" },
  { id: "unit-roll", name: "Roll", symbol: "roll" },
];

export const getUnits = (): ProductUnit[] => {
  const stored = get<ProductUnit[] | null>("sks_units", null);
  if (!stored || stored.length === 0) {
    localStorage.setItem("sks_units", JSON.stringify(DEFAULT_UNITS));
    return DEFAULT_UNITS;
  }
  return stored;
};

export const setUnits = (units: ProductUnit[]): void => set("sks_units", units);

// Last backup
export const getLastBackupTime = (): string | null =>
  localStorage.getItem(KEYS.LAST_BACKUP);
export const setLastBackupTime = (): void =>
  localStorage.setItem(KEYS.LAST_BACKUP, new Date().toISOString());

// ─── Backup Metadata ─────────────────────────────────────────────────────────
export const BACKUP_VERSION = 2;

export interface BackupSummary {
  version: number;
  exportedAt: string;
  companiesCount: number;
  usersCount: number;
  companies: {
    id: string;
    name: string;
    billsCount: number;
    invoicesCount: number;
    customersCount: number;
  }[];
}

/** Scan backup JSON and return a summary (no writes). Throws if invalid. */
export const parseBackupSummary = (jsonString: string): BackupSummary => {
  const data = JSON.parse(jsonString) as Record<string, unknown>;
  if (!data.companies || !Array.isArray(data.companies)) {
    throw new Error("Invalid backup file: missing companies array");
  }
  const companies = data.companies as Company[];
  return {
    version: (data.__version as number) ?? 1,
    exportedAt: (data.__exportedAt as string) ?? "unknown",
    companiesCount: companies.length,
    usersCount: Array.isArray(data.users)
      ? (data.users as unknown[]).length
      : 0,
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      billsCount: Array.isArray(data[`bills_${c.id}`])
        ? (data[`bills_${c.id}`] as unknown[]).length
        : 0,
      invoicesCount: Array.isArray(data[`invoices_${c.id}`])
        ? (data[`invoices_${c.id}`] as unknown[]).length
        : 0,
      customersCount: Array.isArray(data[`customers_${c.id}`])
        ? (data[`customers_${c.id}`] as unknown[]).length
        : 0,
    })),
  };
};

// Export all data as JSON
export const exportAllData = (): string => {
  const companies = getCompanies();
  const users = getUsers();
  const allData: Record<string, unknown> = {
    __version: BACKUP_VERSION,
    __exportedAt: new Date().toISOString(),
    companies,
    users,
    // Global (non-company-scoped) data
    categories: getCategories(),
    units: getUnits(),
    activeCompanyId: getActiveCompanyId(),
  };

  for (const company of companies) {
    const cid = company.id;
    allData[`bills_${cid}`] = getBills(cid);
    allData[`invoices_${cid}`] = getInvoices(cid);
    allData[`products_${cid}`] = getProducts(cid);
    allData[`customers_${cid}`] = getCustomers(cid);
    allData[`vendors_${cid}`] = getVendors(cid);
    allData[`courierBrands_${cid}`] = getCourierBrands(cid);
    allData[`awbSerials_${cid}`] = getAWBSerials(cid);
    allData[`pickups_${cid}`] = getPickups(cid);
    allData[`purchaseInvoices_${cid}`] = getPurchaseInvoices(cid);
    allData[`settings_${cid}`] = getSettings(cid);
    allData[`tariffs_${cid}`] = getTariffs(cid);
    allData[`costTariffs_${cid}`] = getCostTariffs(cid);
    allData[`customerTariffs_${cid}`] = getCustomerTariffMap(cid);
    allData[`expenses_${cid}`] = getExpenses(cid);
    allData[`designOrders_${cid}`] = getDesignOrders(cid);
    allData[`designPricing_${cid}`] = getDesignPricing(cid);

    // Preserve invoice sequences per company
    if (company.gstin) {
      const gstKey = `sks_gst_inv_seq_${company.gstin.trim().toUpperCase()}`;
      const gstVal = localStorage.getItem(gstKey);
      if (gstVal)
        allData[`__gst_seq_${company.gstin.trim().toUpperCase()}`] =
          Number.parseInt(gstVal, 10);
    }
    const nonGstVal = localStorage.getItem(`sks_nongst_inv_seq_${cid}`);
    if (nonGstVal)
      allData[`__nongst_seq_${cid}`] = Number.parseInt(nonGstVal, 10);
  }

  return JSON.stringify(allData, null, 2);
};

// ─── Merge Summary ────────────────────────────────────────────────────────────
export interface MergeSummary {
  companiesAdded: number;
  billsAdded: number;
  invoicesAdded: number;
  customersAdded: number;
  vendorsAdded: number;
  productsAdded: number;
  purchaseInvoicesAdded: number;
  expensesAdded: number;
}

/**
 * Merge import — non-destructive.
 * Only adds records that don't already exist locally (compared by ID).
 * Existing records are never overwritten or deleted.
 */
export const mergeImportData = (jsonString: string): MergeSummary => {
  const data = JSON.parse(jsonString) as Record<string, unknown>;

  if (!data.companies || !Array.isArray(data.companies)) {
    throw new Error("Invalid backup file: missing companies array");
  }

  const summary: MergeSummary = {
    companiesAdded: 0,
    billsAdded: 0,
    invoicesAdded: 0,
    customersAdded: 0,
    vendorsAdded: 0,
    productsAdded: 0,
    purchaseInvoicesAdded: 0,
    expensesAdded: 0,
  };

  const incomingCompanies = data.companies as Company[];
  const localCompanies = getCompanies();
  const localCompanyIds = new Set(localCompanies.map((c) => c.id));

  // Merge companies (add only new ones)
  const newCompanies = incomingCompanies.filter(
    (c) => !localCompanyIds.has(c.id),
  );
  if (newCompanies.length > 0) {
    setCompanies([...localCompanies, ...newCompanies]);
    summary.companiesAdded = newCompanies.length;
  }

  // Merge categories
  const incomingCats = Array.isArray(data.categories)
    ? (data.categories as Category[])
    : [];
  if (incomingCats.length > 0) {
    const localCats = getCategories();
    const localCatIds = new Set(localCats.map((c) => c.id));
    const newCats = incomingCats.filter((c) => !localCatIds.has(c.id));
    if (newCats.length > 0) {
      localStorage.setItem(
        "sks_categories",
        JSON.stringify([...localCats, ...newCats]),
      );
    }
  }

  // Merge units
  const incomingUnits = Array.isArray(data.units)
    ? (data.units as ProductUnit[])
    : [];
  if (incomingUnits.length > 0) {
    const localUnits = getUnits();
    const localUnitIds = new Set(localUnits.map((u) => u.id));
    const newUnits = incomingUnits.filter((u) => !localUnitIds.has(u.id));
    if (newUnits.length > 0) {
      localStorage.setItem(
        "sks_units",
        JSON.stringify([...localUnits, ...newUnits]),
      );
    }
  }

  // All companies from backup — merge per-company data
  // (includes both newly added companies and existing ones for data merge)
  for (const company of incomingCompanies) {
    const cid = company.id;

    const mergeArray = <T extends { id: string }>(
      getter: (id: string) => T[],
      setter: (id: string, d: T[]) => void,
      key: string,
    ): number => {
      const incoming = Array.isArray(data[key]) ? (data[key] as T[]) : [];
      if (incoming.length === 0) return 0;
      const local = getter(cid);
      const localIds = new Set(local.map((x) => x.id));
      const newItems = incoming.filter((x) => !localIds.has(x.id));
      if (newItems.length > 0) setter(cid, [...local, ...newItems]);
      return newItems.length;
    };

    summary.billsAdded += mergeArray(getBills, setBills, `bills_${cid}`);
    summary.invoicesAdded += mergeArray(
      getInvoices,
      setInvoices,
      `invoices_${cid}`,
    );
    summary.customersAdded += mergeArray(
      getCustomers,
      setCustomers,
      `customers_${cid}`,
    );
    summary.vendorsAdded += mergeArray(
      getVendors,
      setVendors,
      `vendors_${cid}`,
    );
    summary.productsAdded += mergeArray(
      getProducts,
      setProducts,
      `products_${cid}`,
    );
    summary.purchaseInvoicesAdded += mergeArray(
      getPurchaseInvoices,
      setPurchaseInvoices,
      `purchaseInvoices_${cid}`,
    );
    summary.expensesAdded += mergeArray(
      getExpenses,
      setExpenses,
      `expenses_${cid}`,
    );

    // Merge courier brands
    const incomingBrands = Array.isArray(data[`courierBrands_${cid}`])
      ? (data[`courierBrands_${cid}`] as CourierBrand[])
      : [];
    if (incomingBrands.length > 0) {
      const local = getCourierBrands(cid);
      const localIds = new Set(local.map((x) => x.id));
      const newItems = incomingBrands.filter((x) => !localIds.has(x.id));
      if (newItems.length > 0) setCourierBrands(cid, [...local, ...newItems]);
    }

    // Merge tariffs
    const incomingTariffs = Array.isArray(data[`tariffs_${cid}`])
      ? (data[`tariffs_${cid}`] as CourierTariff[])
      : [];
    if (incomingTariffs.length > 0) {
      const local = getTariffs(cid);
      const localIds = new Set(local.map((x) => x.id));
      const newItems = incomingTariffs.filter((x) => !localIds.has(x.id));
      if (newItems.length > 0) setTariffs(cid, [...local, ...newItems]);
    }
  }

  return summary;
};

// ─── Manual Contacts (global, not per-company) ────────────────────────────────
export interface ManualContact {
  id: string;
  name: string;
  phone: string;
}

export const getManualContacts = (): ManualContact[] =>
  get<ManualContact[]>("sks_manual_contacts", []);

export const setManualContacts = (contacts: ManualContact[]): void =>
  set("sks_manual_contacts", contacts);

// ─── Migration: move per-company data into shared key ─────────────────────────
/**
 * One-time migration: if shared data is empty but per-company data exists,
 * merge all companies' data into the shared key.
 * Safe to call repeatedly — only runs when shared data is empty.
 */
export const migrateToSharedData = (): void => {
  const companies = getCompanies();
  if (companies.length === 0) return;

  // Check if shared data already has content
  const sharedBills = localStorage.getItem(KEYS.bills(SHARED_DATA_ID));
  if (sharedBills && JSON.parse(sharedBills).length > 0) return; // already migrated

  // Merge all per-company transactional data into shared key
  const mergedBills: Bill[] = [];
  const mergedInvoices: Invoice[] = [];
  const mergedProducts: AnyProduct[] = [];
  const mergedCustomers: Customer[] = [];
  const mergedVendors: Vendor[] = [];
  const mergedBrands: CourierBrand[] = [];
  const mergedAWB: AWBSerialRange[] = [];
  const mergedPickups: CourierPickup[] = [];
  const mergedPurchase: PurchaseInvoice[] = [];
  const mergedTariffs: CourierTariff[] = [];
  const mergedCostTariffs: CourierTariff[] = [];
  const mergedExpenses: Expense[] = [];
  const mergedOrders: DesignOrder[] = [];
  const mergedPricing: DesignPricingMaster[] = [];
  const mergedCustomerTariffs: Record<string, CustomerTariffAssignment[]> = {};

  const seenBillIds = new Set<string>();
  const seenInvoiceIds = new Set<string>();
  const seenProductIds = new Set<string>();
  const seenCustomerIds = new Set<string>();
  const seenVendorIds = new Set<string>();
  const seenBrandIds = new Set<string>();
  const seenAWBIds = new Set<string>();
  const seenPickupIds = new Set<string>();
  const seenPurchaseIds = new Set<string>();
  const seenTariffIds = new Set<string>();
  const seenCostTariffIds = new Set<string>();
  const seenExpenseIds = new Set<string>();
  const seenOrderIds = new Set<string>();
  const seenPricingIds = new Set<string>();

  for (const company of companies) {
    const cid = company.id;
    for (const b of getBills(cid)) {
      if (!seenBillIds.has(b.id)) {
        mergedBills.push(b);
        seenBillIds.add(b.id);
      }
    }
    for (const inv of getInvoices(cid)) {
      if (!seenInvoiceIds.has(inv.id)) {
        mergedInvoices.push(inv);
        seenInvoiceIds.add(inv.id);
      }
    }
    for (const p of getProducts(cid)) {
      if (!seenProductIds.has(p.id)) {
        mergedProducts.push(p);
        seenProductIds.add(p.id);
      }
    }
    for (const c of getCustomers(cid)) {
      if (!seenCustomerIds.has(c.id)) {
        mergedCustomers.push(c);
        seenCustomerIds.add(c.id);
      }
    }
    for (const v of getVendors(cid)) {
      if (!seenVendorIds.has(v.id)) {
        mergedVendors.push(v);
        seenVendorIds.add(v.id);
      }
    }
    for (const br of getCourierBrands(cid)) {
      if (!seenBrandIds.has(br.id)) {
        mergedBrands.push(br);
        seenBrandIds.add(br.id);
      }
    }
    for (const a of getAWBSerials(cid)) {
      if (!seenAWBIds.has(a.id)) {
        mergedAWB.push(a);
        seenAWBIds.add(a.id);
      }
    }
    for (const pu of getPickups(cid)) {
      if (!seenPickupIds.has(pu.id)) {
        mergedPickups.push(pu);
        seenPickupIds.add(pu.id);
      }
    }
    for (const pi of getPurchaseInvoices(cid)) {
      if (!seenPurchaseIds.has(pi.id)) {
        mergedPurchase.push(pi);
        seenPurchaseIds.add(pi.id);
      }
    }
    for (const t of getTariffs(cid)) {
      if (!seenTariffIds.has(t.id)) {
        mergedTariffs.push(t);
        seenTariffIds.add(t.id);
      }
    }
    for (const ct of getCostTariffs(cid)) {
      if (!seenCostTariffIds.has(ct.id)) {
        mergedCostTariffs.push(ct);
        seenCostTariffIds.add(ct.id);
      }
    }
    for (const ex of getExpenses(cid)) {
      if (!seenExpenseIds.has(ex.id)) {
        mergedExpenses.push(ex);
        seenExpenseIds.add(ex.id);
      }
    }
    for (const o of getDesignOrders(cid)) {
      if (!seenOrderIds.has(o.id)) {
        mergedOrders.push(o);
        seenOrderIds.add(o.id);
      }
    }
    for (const dp of getDesignPricing(cid)) {
      if (!seenPricingIds.has(dp.id)) {
        mergedPricing.push(dp);
        seenPricingIds.add(dp.id);
      }
    }
    const ctm = getCustomerTariffMap(cid);
    for (const [custId, assignments] of Object.entries(ctm)) {
      if (!mergedCustomerTariffs[custId]) {
        mergedCustomerTariffs[custId] = assignments;
      }
    }
  }

  // Write merged data to shared key
  if (mergedBills.length > 0) setBills(SHARED_DATA_ID, mergedBills);
  if (mergedInvoices.length > 0) setInvoices(SHARED_DATA_ID, mergedInvoices);
  if (mergedProducts.length > 0) setProducts(SHARED_DATA_ID, mergedProducts);
  if (mergedCustomers.length > 0) setCustomers(SHARED_DATA_ID, mergedCustomers);
  if (mergedVendors.length > 0) setVendors(SHARED_DATA_ID, mergedVendors);
  if (mergedBrands.length > 0) setCourierBrands(SHARED_DATA_ID, mergedBrands);
  if (mergedAWB.length > 0) setAWBSerials(SHARED_DATA_ID, mergedAWB);
  if (mergedPickups.length > 0) setPickups(SHARED_DATA_ID, mergedPickups);
  if (mergedPurchase.length > 0)
    setPurchaseInvoices(SHARED_DATA_ID, mergedPurchase);
  if (mergedTariffs.length > 0) setTariffs(SHARED_DATA_ID, mergedTariffs);
  if (mergedCostTariffs.length > 0)
    setCostTariffs(SHARED_DATA_ID, mergedCostTariffs);
  if (mergedExpenses.length > 0) setExpenses(SHARED_DATA_ID, mergedExpenses);
  if (mergedOrders.length > 0) setDesignOrders(SHARED_DATA_ID, mergedOrders);
  if (mergedPricing.length > 0) setDesignPricing(SHARED_DATA_ID, mergedPricing);
  if (Object.keys(mergedCustomerTariffs).length > 0) {
    setCustomerTariffMap(SHARED_DATA_ID, mergedCustomerTariffs);
  }
};

// Import all data from JSON — restores EVERY key including sequences and globals
export const importAllData = (jsonString: string): void => {
  const data = JSON.parse(jsonString) as Record<string, unknown>;

  if (!data.companies || !Array.isArray(data.companies)) {
    throw new Error("Invalid backup file: missing companies array");
  }

  // Always write companies and users (even if empty arrays)
  setCompanies(data.companies as Company[]);
  if (Array.isArray(data.users)) setUsers(data.users as AppUser[]);

  // Restore global data
  if (Array.isArray(data.categories)) {
    localStorage.setItem("sks_categories", JSON.stringify(data.categories));
  }
  if (Array.isArray(data.units)) {
    localStorage.setItem("sks_units", JSON.stringify(data.units));
  }

  // Restore active company (only if that company exists in the backup)
  if (data.activeCompanyId && typeof data.activeCompanyId === "string") {
    const exists = (data.companies as Company[]).find(
      (c) => c.id === data.activeCompanyId,
    );
    if (exists) setActiveCompanyId(data.activeCompanyId as string);
  }

  const companies = data.companies as Company[];
  for (const company of companies) {
    const cid = company.id;

    // Restore each key whether the array is empty or not (undefined check only)
    if (data[`bills_${cid}`] !== undefined)
      setBills(cid, (data[`bills_${cid}`] as Bill[]) ?? []);
    if (data[`invoices_${cid}`] !== undefined)
      setInvoices(cid, (data[`invoices_${cid}`] as Invoice[]) ?? []);
    if (data[`products_${cid}`] !== undefined)
      setProducts(cid, (data[`products_${cid}`] as AnyProduct[]) ?? []);
    if (data[`customers_${cid}`] !== undefined)
      setCustomers(cid, (data[`customers_${cid}`] as Customer[]) ?? []);
    if (data[`vendors_${cid}`] !== undefined)
      setVendors(cid, (data[`vendors_${cid}`] as Vendor[]) ?? []);
    if (data[`courierBrands_${cid}`] !== undefined)
      setCourierBrands(
        cid,
        (data[`courierBrands_${cid}`] as CourierBrand[]) ?? [],
      );
    if (data[`awbSerials_${cid}`] !== undefined)
      setAWBSerials(cid, (data[`awbSerials_${cid}`] as AWBSerialRange[]) ?? []);
    if (data[`pickups_${cid}`] !== undefined)
      setPickups(cid, (data[`pickups_${cid}`] as CourierPickup[]) ?? []);
    if (data[`purchaseInvoices_${cid}`] !== undefined)
      setPurchaseInvoices(
        cid,
        (data[`purchaseInvoices_${cid}`] as PurchaseInvoice[]) ?? [],
      );
    if (data[`settings_${cid}`] !== undefined)
      setSettings(cid, data[`settings_${cid}`] as CompanySettings);
    if (data[`tariffs_${cid}`] !== undefined)
      setTariffs(cid, (data[`tariffs_${cid}`] as CourierTariff[]) ?? []);
    if (data[`costTariffs_${cid}`] !== undefined)
      setCostTariffs(
        cid,
        (data[`costTariffs_${cid}`] as CourierTariff[]) ?? [],
      );
    if (data[`customerTariffs_${cid}`] !== undefined)
      setCustomerTariffMap(
        cid,
        (data[`customerTariffs_${cid}`] as Record<
          string,
          CustomerTariffAssignment[]
        >) ?? {},
      );
    if (data[`expenses_${cid}`] !== undefined)
      setExpenses(cid, (data[`expenses_${cid}`] as Expense[]) ?? []);
    if (data[`designOrders_${cid}`] !== undefined)
      setDesignOrders(
        cid,
        (data[`designOrders_${cid}`] as DesignOrder[]) ?? [],
      );
    if (data[`designPricing_${cid}`] !== undefined)
      setDesignPricing(
        cid,
        (data[`designPricing_${cid}`] as DesignPricingMaster[]) ?? [],
      );

    // Restore invoice sequences
    if (company.gstin) {
      const gstin = company.gstin.trim().toUpperCase();
      const seqKey = `__gst_seq_${gstin}`;
      if (data[seqKey] !== undefined) {
        localStorage.setItem(`sks_gst_inv_seq_${gstin}`, String(data[seqKey]));
      }
    }
    const nonGstSeqKey = `__nongst_seq_${cid}`;
    if (data[nonGstSeqKey] !== undefined) {
      localStorage.setItem(
        `sks_nongst_inv_seq_${cid}`,
        String(data[nonGstSeqKey]),
      );
    }
  }
};
