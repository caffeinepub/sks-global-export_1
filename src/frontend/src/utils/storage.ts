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
  CourierQuery,
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
  courierQueries: (cid: string) => `sks_courier_queries_${cid}`,
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

export const getCourierQueries = (cid: string): CourierQuery[] =>
  get<CourierQuery[]>(KEYS.courierQueries(cid), []);
export const setCourierQueries = (cid: string, d: CourierQuery[]): void =>
  set(KEYS.courierQueries(cid), d);

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

/** Set the GST invoice sequence to a specific value (for manual editing). */
export const setGSTInvoiceSeq = (gstin: string, value: number): void => {
  localStorage.setItem(gstInvSeqKey(gstin), String(Math.max(1, value)));
};

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

/** Set the Non-GST invoice sequence to a specific value (for manual editing). */
export const setNonGSTInvoiceSeq = (companyId: string, value: number): void => {
  localStorage.setItem(nonGstInvSeqKey(companyId), String(Math.max(1, value)));
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
  productsCount: number;
  customersCount: number;
  vendorsCount: number;
  employeesCount: number;
  leadsCount: number;
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
    productsCount: Array.isArray(data[`products_${SHARED_DATA_ID}`])
      ? (data[`products_${SHARED_DATA_ID}`] as unknown[]).length
      : 0,
    customersCount: Array.isArray(data[`customers_${SHARED_DATA_ID}`])
      ? (data[`customers_${SHARED_DATA_ID}`] as unknown[]).length
      : 0,
    vendorsCount: Array.isArray(data[`vendors_${SHARED_DATA_ID}`])
      ? (data[`vendors_${SHARED_DATA_ID}`] as unknown[]).length
      : 0,
    employeesCount: Array.isArray(data[`employees_${SHARED_DATA_ID}`])
      ? (data[`employees_${SHARED_DATA_ID}`] as unknown[]).length
      : 0,
    leadsCount: Array.isArray(data[`leads_${SHARED_DATA_ID}`])
      ? (data[`leads_${SHARED_DATA_ID}`] as unknown[]).length
      : 0,
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      billsCount: Array.isArray(data[`bills_${SHARED_DATA_ID}`])
        ? (data[`bills_${SHARED_DATA_ID}`] as unknown[]).length
        : Array.isArray(data[`bills_${c.id}`])
          ? (data[`bills_${c.id}`] as unknown[]).length
          : 0,
      invoicesCount: Array.isArray(data[`invoices_${SHARED_DATA_ID}`])
        ? (data[`invoices_${SHARED_DATA_ID}`] as unknown[]).length
        : Array.isArray(data[`invoices_${c.id}`])
          ? (data[`invoices_${c.id}`] as unknown[]).length
          : 0,
      customersCount: Array.isArray(data[`customers_${SHARED_DATA_ID}`])
        ? (data[`customers_${SHARED_DATA_ID}`] as unknown[]).length
        : Array.isArray(data[`customers_${c.id}`])
          ? (data[`customers_${c.id}`] as unknown[]).length
          : 0,
    })),
  };
};

// Export all data as JSON
// NOTE: All transactional data is stored under SHARED_DATA_ID ("shared"), not per-company IDs.
// We export both the shared key AND per-company keys (for backwards compatibility with old backups).
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
    // Manual contacts (global)
    manualContacts: getManualContacts(),
    manualPickupContacts: getManualPickupContacts(),
  };

  // Export shared data (the actual data store used by the app)
  allData[`bills_${SHARED_DATA_ID}`] = getBills(SHARED_DATA_ID);
  allData[`invoices_${SHARED_DATA_ID}`] = getInvoices(SHARED_DATA_ID);
  allData[`products_${SHARED_DATA_ID}`] = getProducts(SHARED_DATA_ID);
  allData[`customers_${SHARED_DATA_ID}`] = getCustomers(SHARED_DATA_ID);
  allData[`vendors_${SHARED_DATA_ID}`] = getVendors(SHARED_DATA_ID);
  allData[`courierBrands_${SHARED_DATA_ID}`] = getCourierBrands(SHARED_DATA_ID);
  allData[`awbSerials_${SHARED_DATA_ID}`] = getAWBSerials(SHARED_DATA_ID);
  allData[`pickups_${SHARED_DATA_ID}`] = getPickups(SHARED_DATA_ID);
  allData[`purchaseInvoices_${SHARED_DATA_ID}`] =
    getPurchaseInvoices(SHARED_DATA_ID);
  allData[`settings_${SHARED_DATA_ID}`] = getSettings(SHARED_DATA_ID);
  allData[`tariffs_${SHARED_DATA_ID}`] = getTariffs(SHARED_DATA_ID);
  allData[`costTariffs_${SHARED_DATA_ID}`] = getCostTariffs(SHARED_DATA_ID);
  allData[`customerTariffs_${SHARED_DATA_ID}`] =
    getCustomerTariffMap(SHARED_DATA_ID);
  allData[`expenses_${SHARED_DATA_ID}`] = getExpenses(SHARED_DATA_ID);
  allData[`designOrders_${SHARED_DATA_ID}`] = getDesignOrders(SHARED_DATA_ID);
  allData[`designPricing_${SHARED_DATA_ID}`] = getDesignPricing(SHARED_DATA_ID);
  allData[`courierQueries_${SHARED_DATA_ID}`] =
    getCourierQueries(SHARED_DATA_ID);

  allData[`leads_${SHARED_DATA_ID}`] = getLeads(SHARED_DATA_ID);
  allData[DM_AUTOMATIONS_KEY] = getAutomations();
  allData[DM_API_SETTINGS_KEY] = getDMApiSettings();
  allData[`campaigns_${SHARED_DATA_ID}`] = getCampaigns(SHARED_DATA_ID);
  allData[`employees_${SHARED_DATA_ID}`] = getEmployees(SHARED_DATA_ID);
  allData[`attendance_${SHARED_DATA_ID}`] = getAttendance(SHARED_DATA_ID);
  allData[`leaveRequests_${SHARED_DATA_ID}`] = getLeaveRequests(SHARED_DATA_ID);
  allData[`assets_${SHARED_DATA_ID}`] = getAssets(SHARED_DATA_ID);
  allData[`purchaseOrders_${SHARED_DATA_ID}`] =
    getPurchaseOrders(SHARED_DATA_ID);
  allData[`stockRequisitions_${SHARED_DATA_ID}`] =
    getStockRequisitions(SHARED_DATA_ID);

  // Also export per-company settings for each company (these are legitimately per-company)
  for (const company of companies) {
    const cid = company.id;
    allData[`settings_${cid}`] = getSettings(cid);

    // Preserve invoice sequences per company/GSTIN
    if (company.gstin) {
      const gstin = company.gstin.trim().toUpperCase();
      const gstVal =
        localStorage.getItem(`sks_gst_inv_seq_${gstin}`) ??
        String(company.invoiceSeq ?? 1);
      allData[`__gst_seq_${gstin}`] = Number.parseInt(gstVal, 10);
    }
    const nonGstVal =
      localStorage.getItem(`sks_nongst_inv_seq_${cid}`) ??
      String(company.nonGstInvoiceSeq ?? 1);
    allData[`__nongst_seq_${cid}`] = Number.parseInt(nonGstVal, 10);
  }

  // Also export bill sequence counter
  const billSeqVal = localStorage.getItem("sks_bill_seq_shared") ?? String(1);
  allData.__bill_seq_shared = Number.parseInt(billSeqVal, 10);

  // Export FY archives
  const fyArchivesData = localStorage.getItem(FY_ARCHIVES_KEY);
  if (fyArchivesData) allData.fyArchives = JSON.parse(fyArchivesData);

  // Export all SKS daily AWB counters (scan all keys)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("sks_awb_daily_")) {
      allData[`__awb_daily_${key}`] = localStorage.getItem(key);
    }
  }

  // Export theme, designations, permissions
  const themeData = localStorage.getItem("sks_theme");
  if (themeData) allData.__theme_settings = JSON.parse(themeData);
  const desigData = localStorage.getItem("sks_designations");
  if (desigData) allData.__user_designations = JSON.parse(desigData);
  const permsData = localStorage.getItem("sks_role_permissions");
  if (permsData) allData.__role_permissions = JSON.parse(permsData);

  // Export tasks
  allData.__tasks = getTasks();

  // _rawSnapshot: capture ALL sks_ prefixed localStorage keys for future-proofing
  // Any new data type added in the future will automatically be included in backup
  const rawSnapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("sks_")) {
      rawSnapshot[k] = localStorage.getItem(k) ?? "";
    }
  }
  allData._rawSnapshot = rawSnapshot;
  allData.__exportVersion = "3.0";
  allData.__appLabel = "SKS Global Export";

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
 * Handles both new format (SHARED_DATA_ID) and old format (per-company IDs).
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

  // Merge manual contacts
  const incomingContacts = Array.isArray(data.manualContacts)
    ? (data.manualContacts as Array<{
        id: string;
        name: string;
        phone: string;
      }>)
    : [];
  if (incomingContacts.length > 0) {
    const localContacts = getManualContacts();
    const localContactIds = new Set(localContacts.map((c) => c.id));
    const newContacts = incomingContacts.filter(
      (c) => !localContactIds.has(c.id),
    );
    if (newContacts.length > 0) {
      setManualContacts([...localContacts, ...newContacts]);
    }
  }

  // Merge manual pickup contacts
  const incomingPickupContacts = Array.isArray(data.manualPickupContacts)
    ? (data.manualPickupContacts as ManualPickupContact[])
    : [];
  if (incomingPickupContacts.length > 0) {
    const localPickupContacts = getManualPickupContacts();
    const localIds = new Set(localPickupContacts.map((c) => c.id));
    const newPcs = incomingPickupContacts.filter((c) => !localIds.has(c.id));
    if (newPcs.length > 0) {
      setManualPickupContacts([...localPickupContacts, ...newPcs]);
    }
  }

  // Helper: get incoming array from backup, checking SHARED_DATA_ID first then per-company keys
  const getIncoming = <T>(baseKey: string, companyId: string): T[] => {
    if (Array.isArray(data[`${baseKey}_${SHARED_DATA_ID}`])) {
      return data[`${baseKey}_${SHARED_DATA_ID}`] as T[];
    }
    if (Array.isArray(data[`${baseKey}_${companyId}`])) {
      return data[`${baseKey}_${companyId}`] as T[];
    }
    return [];
  };

  // Merge shared transactional data into SHARED_DATA_ID
  // We only need to run this once (data is shared across all companies)
  const firstCid = incomingCompanies[0]?.id ?? "";

  const mergeSharedArray = <T extends { id: string }>(
    getter: (id: string) => T[],
    setter: (id: string, d: T[]) => void,
    baseKey: string,
  ): number => {
    const incoming = getIncoming<T>(baseKey, firstCid);
    if (incoming.length === 0) return 0;
    const local = getter(SHARED_DATA_ID);
    const localIds = new Set(local.map((x) => x.id));
    const newItems = incoming.filter((x) => !localIds.has(x.id));
    if (newItems.length > 0) setter(SHARED_DATA_ID, [...local, ...newItems]);
    return newItems.length;
  };

  summary.billsAdded += mergeSharedArray(getBills, setBills, "bills");
  summary.invoicesAdded += mergeSharedArray(
    getInvoices,
    setInvoices,
    "invoices",
  );
  summary.customersAdded += mergeSharedArray(
    getCustomers,
    setCustomers,
    "customers",
  );
  summary.vendorsAdded += mergeSharedArray(getVendors, setVendors, "vendors");
  summary.productsAdded += mergeSharedArray(
    getProducts,
    setProducts,
    "products",
  );
  summary.purchaseInvoicesAdded += mergeSharedArray(
    getPurchaseInvoices,
    setPurchaseInvoices,
    "purchaseInvoices",
  );
  summary.expensesAdded += mergeSharedArray(
    getExpenses,
    setExpenses,
    "expenses",
  );
  mergeSharedArray(getCourierBrands, setCourierBrands, "courierBrands");
  mergeSharedArray(getTariffs, setTariffs, "tariffs");
  mergeSharedArray(getCostTariffs, setCostTariffs, "costTariffs");
  mergeSharedArray(getAWBSerials, setAWBSerials, "awbSerials");
  mergeSharedArray(getPickups, setPickups, "pickups");
  mergeSharedArray(getDesignOrders, setDesignOrders, "designOrders");
  mergeSharedArray(getDesignPricing, setDesignPricing, "designPricing");
  mergeSharedArray(getCourierQueries, setCourierQueries, "courierQueries");

  mergeSharedArray(getLeads, (id, d) => setLeads(d, id), "leads");
  mergeSharedArray(getCampaigns, (id, d) => setCampaigns(d, id), "campaigns");
  mergeSharedArray(getEmployees, (id, d) => setEmployees(d, id), "employees");
  mergeSharedArray(
    getAttendance,
    (id, d) => setAttendance(d, id),
    "attendance",
  );
  mergeSharedArray(
    getLeaveRequests,
    (id, d) => setLeaveRequests(d, id),
    "leaveRequests",
  );
  mergeSharedArray(getAssets, (id, d) => setAssets(d, id), "assets");
  mergeSharedArray(
    getPurchaseOrders,
    (id, d) => setPurchaseOrders(d, id),
    "purchaseOrders",
  );
  mergeSharedArray(
    getStockRequisitions,
    (id, d) => setStockRequisitions(d, id),
    "stockRequisitions",
  );

  // Merge customer tariffs (Record<customerId, assignments[]>)
  const getIncomingMap = (
    baseKey: string,
    companyId: string,
  ): Record<string, CustomerTariffAssignment[]> => {
    const sharedKey = `${baseKey}_${SHARED_DATA_ID}`;
    const perKey = `${baseKey}_${companyId}`;
    if (
      data[sharedKey] &&
      typeof data[sharedKey] === "object" &&
      !Array.isArray(data[sharedKey])
    ) {
      return data[sharedKey] as Record<string, CustomerTariffAssignment[]>;
    }
    if (
      data[perKey] &&
      typeof data[perKey] === "object" &&
      !Array.isArray(data[perKey])
    ) {
      return data[perKey] as Record<string, CustomerTariffAssignment[]>;
    }
    return {};
  };

  const incomingCustTariffs = getIncomingMap("customerTariffs", firstCid);
  if (Object.keys(incomingCustTariffs).length > 0) {
    const local = getCustomerTariffMap(SHARED_DATA_ID);
    let changed = false;
    for (const [custId, assignments] of Object.entries(incomingCustTariffs)) {
      if (!local[custId]) {
        local[custId] = assignments;
        changed = true;
      }
    }
    if (changed) setCustomerTariffMap(SHARED_DATA_ID, local);
  }

  // Merge FY archives
  if (Array.isArray(data.fyArchives)) {
    const localArchives = getFYArchives();
    const localIds = new Set(localArchives.map((a) => a.id));
    const newArchives = (data.fyArchives as FinanceYearArchive[]).filter(
      (a) => !localIds.has(a.id),
    );
    if (newArchives.length > 0)
      setFYArchives([...localArchives, ...newArchives]);
  }

  // Update sequences on existing companies if incoming > local
  {
    const updatedLocalCompanies = getCompanies();
    let companiesChanged = false;
    for (const incoming of incomingCompanies) {
      const local = updatedLocalCompanies.find((c) => c.id === incoming.id);
      if (local) {
        let changed = false;
        if ((incoming.invoiceSeq ?? 1) > (local.invoiceSeq ?? 1)) {
          local.invoiceSeq = incoming.invoiceSeq;
          changed = true;
        }
        if ((incoming.nonGstInvoiceSeq ?? 1) > (local.nonGstInvoiceSeq ?? 1)) {
          local.nonGstInvoiceSeq = incoming.nonGstInvoiceSeq;
          changed = true;
        }
        if ((incoming.billSeq ?? 1) > (local.billSeq ?? 1)) {
          local.billSeq = incoming.billSeq;
          changed = true;
        }
        if (changed) companiesChanged = true;
      }
    }
    if (companiesChanged) setCompanies(updatedLocalCompanies);
  }

  // Merge invoice sequences (take the MAX to avoid going backwards)
  for (const [key, val] of Object.entries(data)) {
    let storageKey: string | null = null;
    if (key.startsWith("__gst_seq_")) {
      storageKey = `sks_gst_inv_seq_$key.replace("__gst_seq_", "")`;
    } else if (key.startsWith("__nongst_seq_")) {
      storageKey = `sks_nongst_inv_seq_$key.replace("__nongst_seq_", "")`;
    } else if (key === "__bill_seq_shared") {
      storageKey = "sks_bill_seq_shared";
    }
    if (storageKey) {
      const current = Number.parseInt(
        localStorage.getItem(storageKey) || "0",
        10,
      );
      const backup = Number.parseInt(String(val) || "0", 10);
      if (backup > current) localStorage.setItem(storageKey, String(backup));
    }
  }

  // Merge tasks
  if (Array.isArray(data.__tasks)) {
    const localTasks = getTasks();
    const localTaskIds = new Set(localTasks.map((t) => t.id));
    const newTasks = (data.__tasks as Task[]).filter(
      (t) => !localTaskIds.has(t.id),
    );
    if (newTasks.length > 0) saveTasks([...localTasks, ...newTasks]);
  }

  // Apply _rawSnapshot for keys that don't exist locally (merge only)
  if (data._rawSnapshot && typeof data._rawSnapshot === "object") {
    const snapshot = data._rawSnapshot as Record<string, string>;
    for (const [k, v] of Object.entries(snapshot)) {
      if (k.startsWith("sks_") && v && !localStorage.getItem(k)) {
        localStorage.setItem(k, v);
      }
    }
  }

  return summary;
};

/** Alias for getCustomerTariffMap — returns array-style for per-customer merge. */
export const getCustomerTariffAssignments = getCustomerTariffMap;

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

// ─── Manual Pickup Contacts (autocomplete for manual pickup entries) ──────────
export interface ManualPickupContact {
  id: string;
  name: string;
  phone: string;
  location?: string;
}

export const getManualPickupContacts = (): ManualPickupContact[] =>
  get<ManualPickupContact[]>("sks_manual_pickup_contacts", []);

export const setManualPickupContacts = (
  contacts: ManualPickupContact[],
): void => set("sks_manual_pickup_contacts", contacts);

// ─── Finance Year Archive ─────────────────────────────────────────────────────
export interface FinanceYearArchive {
  id: string;
  label: string; // e.g. "FY 2024-25"
  startDate: string; // ISO
  endDate: string; // ISO
  closedAt: string; // ISO
  summary: {
    totalBills: number;
    totalInvoices: number;
    totalRevenue: number;
    totalExpenses: number;
  };
  // Snapshot of key data
  bills: Bill[];
  invoices: Invoice[];
  expenses: Expense[];
}

export const FY_ARCHIVES_KEY = "sks_fy_archives";

export const getFYArchives = (): FinanceYearArchive[] =>
  get<FinanceYearArchive[]>(FY_ARCHIVES_KEY, []);

export const setFYArchives = (archives: FinanceYearArchive[]): void =>
  set(FY_ARCHIVES_KEY, archives);

/** Returns the current Indian financial year label and dates. April–March. */
export const getCurrentFYInfo = (): {
  label: string;
  start: Date;
  end: Date;
} => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const fyStartYear = month >= 4 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return {
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`,
    start: new Date(fyStartYear, 3, 1), // April 1
    end: new Date(fyEndYear, 2, 31, 23, 59, 59), // March 31
  };
};

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
// Handles both new format (SHARED_DATA_ID) and old format (per-company IDs) for backwards compat.
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

  // Restore manual contacts
  if (Array.isArray(data.manualContacts)) {
    localStorage.setItem(
      "sks_manual_contacts",
      JSON.stringify(data.manualContacts),
    );
  }
  if (Array.isArray(data.manualPickupContacts)) {
    localStorage.setItem(
      "sks_manual_pickup_contacts",
      JSON.stringify(data.manualPickupContacts),
    );
  }

  // Restore active company (only if that company exists in the backup)
  if (data.activeCompanyId && typeof data.activeCompanyId === "string") {
    const exists = (data.companies as Company[]).find(
      (c) => c.id === data.activeCompanyId,
    );
    if (exists) setActiveCompanyId(data.activeCompanyId as string);
  }

  // Helper: pick data from backup by trying SHARED_DATA_ID first, then per-company keys
  const pickArray = <T>(
    baseKey: string,
    companyId: string,
  ): T[] | undefined => {
    // Try shared key first (new format)
    if (data[`${baseKey}_${SHARED_DATA_ID}`] !== undefined) {
      return (data[`${baseKey}_${SHARED_DATA_ID}`] as T[]) ?? [];
    }
    // Fall back to per-company key (old format)
    if (data[`${baseKey}_${companyId}`] !== undefined) {
      return (data[`${baseKey}_${companyId}`] as T[]) ?? [];
    }
    return undefined;
  };

  const pickMap = <T>(
    baseKey: string,
    companyId: string,
  ): Record<string, T> | undefined => {
    if (data[`${baseKey}_${SHARED_DATA_ID}`] !== undefined) {
      return (data[`${baseKey}_${SHARED_DATA_ID}`] as Record<string, T>) ?? {};
    }
    if (data[`${baseKey}_${companyId}`] !== undefined) {
      return (data[`${baseKey}_${companyId}`] as Record<string, T>) ?? {};
    }
    return undefined;
  };

  // For shared data, we only need to restore once (using first company as fallback for old format)
  const companies = data.companies as Company[];
  const firstCid = companies[0]?.id ?? "";

  // Restore shared transactional data (write to SHARED_DATA_ID)
  const bills = pickArray<Bill>("bills", firstCid);
  if (bills !== undefined) setBills(SHARED_DATA_ID, bills);

  const invoices = pickArray<Invoice>("invoices", firstCid);
  if (invoices !== undefined) setInvoices(SHARED_DATA_ID, invoices);

  const products = pickArray<AnyProduct>("products", firstCid);
  if (products !== undefined) setProducts(SHARED_DATA_ID, products);

  const customers = pickArray<Customer>("customers", firstCid);
  if (customers !== undefined) setCustomers(SHARED_DATA_ID, customers);

  const vendors = pickArray<Vendor>("vendors", firstCid);
  if (vendors !== undefined) setVendors(SHARED_DATA_ID, vendors);

  const courierBrands = pickArray<CourierBrand>("courierBrands", firstCid);
  if (courierBrands !== undefined)
    setCourierBrands(SHARED_DATA_ID, courierBrands);

  const awbSerials = pickArray<AWBSerialRange>("awbSerials", firstCid);
  if (awbSerials !== undefined) setAWBSerials(SHARED_DATA_ID, awbSerials);

  const pickups = pickArray<CourierPickup>("pickups", firstCid);
  if (pickups !== undefined) setPickups(SHARED_DATA_ID, pickups);

  const purchaseInvoices = pickArray<PurchaseInvoice>(
    "purchaseInvoices",
    firstCid,
  );
  if (purchaseInvoices !== undefined)
    setPurchaseInvoices(SHARED_DATA_ID, purchaseInvoices);

  const tariffs = pickArray<CourierTariff>("tariffs", firstCid);
  if (tariffs !== undefined) setTariffs(SHARED_DATA_ID, tariffs);

  const costTariffs = pickArray<CourierTariff>("costTariffs", firstCid);
  if (costTariffs !== undefined) setCostTariffs(SHARED_DATA_ID, costTariffs);

  const customerTariffs = pickMap<CustomerTariffAssignment[]>(
    "customerTariffs",
    firstCid,
  );
  if (customerTariffs !== undefined)
    setCustomerTariffMap(SHARED_DATA_ID, customerTariffs);

  const expenses = pickArray<Expense>("expenses", firstCid);
  if (expenses !== undefined) setExpenses(SHARED_DATA_ID, expenses);

  const designOrders = pickArray<DesignOrder>("designOrders", firstCid);
  if (designOrders !== undefined) setDesignOrders(SHARED_DATA_ID, designOrders);

  const designPricing = pickArray<DesignPricingMaster>(
    "designPricing",
    firstCid,
  );
  if (designPricing !== undefined)
    setDesignPricing(SHARED_DATA_ID, designPricing);

  const courierQueries = pickArray<CourierQuery>("courierQueries", firstCid);
  if (courierQueries !== undefined)
    setCourierQueries(SHARED_DATA_ID, courierQueries);

  const leads = pickArray<Lead>("leads", firstCid);
  if (leads !== undefined) setLeads(leads, SHARED_DATA_ID);

  const campaigns = pickArray<Campaign>("campaigns", firstCid);
  if (campaigns !== undefined) setCampaigns(campaigns, SHARED_DATA_ID);

  const employees = pickArray<Employee>("employees", firstCid);
  if (employees !== undefined) setEmployees(employees, SHARED_DATA_ID);

  const attendance = pickArray<AttendanceRecord>("attendance", firstCid);
  if (attendance !== undefined) setAttendance(attendance, SHARED_DATA_ID);

  const leaveRequests = pickArray<LeaveRequest>("leaveRequests", firstCid);
  if (leaveRequests !== undefined)
    setLeaveRequests(leaveRequests, SHARED_DATA_ID);

  const assets = pickArray<Asset>("assets", firstCid);
  if (assets !== undefined) setAssets(assets, SHARED_DATA_ID);

  const purchaseOrders = pickArray<PurchaseOrder>("purchaseOrders", firstCid);
  if (purchaseOrders !== undefined)
    setPurchaseOrders(purchaseOrders, SHARED_DATA_ID);

  const stockRequisitions = pickArray<StockRequisition>(
    "stockRequisitions",
    firstCid,
  );
  if (stockRequisitions !== undefined)
    setStockRequisitions(stockRequisitions, SHARED_DATA_ID);

  // Restore settings (per-company settings are legitimate per-company)
  // Also restore shared settings
  if (data[`settings_${SHARED_DATA_ID}`] !== undefined) {
    setSettings(
      SHARED_DATA_ID,
      data[`settings_${SHARED_DATA_ID}`] as CompanySettings,
    );
  }

  // Restore FY archives
  if (Array.isArray(data.fyArchives)) {
    localStorage.setItem(FY_ARCHIVES_KEY, JSON.stringify(data.fyArchives));
  }

  // Restore per-company settings and invoice sequences
  for (const company of companies) {
    const cid = company.id;

    if (data[`settings_${cid}`] !== undefined) {
      setSettings(cid, data[`settings_${cid}`] as CompanySettings);
    }

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

  // Restore shared bill sequence
  if (data.__bill_seq_shared !== undefined) {
    localStorage.setItem("sks_bill_seq_shared", String(data.__bill_seq_shared));
  }

  // Restore theme, designations, permissions
  if (data.__theme_settings) {
    localStorage.setItem("sks_theme", JSON.stringify(data.__theme_settings));
  }
  if (Array.isArray(data.__user_designations)) {
    localStorage.setItem(
      "sks_designations",
      JSON.stringify(data.__user_designations),
    );
  }
  if (data.__role_permissions && typeof data.__role_permissions === "object") {
    localStorage.setItem(
      "sks_role_permissions",
      JSON.stringify(data.__role_permissions),
    );
  }
  // Restore tasks
  if (Array.isArray(data.__tasks)) {
    saveTasks(data.__tasks as Task[]);
  }

  // Apply _rawSnapshot for any sks_ keys that haven't been explicitly restored
  // This future-proofs import: any new data type will be restored automatically
  if (data._rawSnapshot && typeof data._rawSnapshot === "object") {
    const snapshot = data._rawSnapshot as Record<string, string>;
    for (const [k, v] of Object.entries(snapshot)) {
      if (k.startsWith("sks_") && v) {
        // Always overwrite with snapshot (full restore)
        localStorage.setItem(k, v);
      }
    }
  }
};

// ─── Digital Marketing ────────────────────────────────────────────────────────
export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  pincode?: string;
  city?: string;
  serviceType: "domestic-courier" | "international-courier" | "general-product";
  productInterest?: string;
  leadSource:
    | "Walk-in"
    | "Referral"
    | "WhatsApp"
    | "Online"
    | "Social Media"
    | "Cold Call"
    | "Other";
  status: "New" | "Contacted" | "Interested" | "Converted" | "Lost";
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  followUpDate?: string;
  followUpNote?: string;
  convertedBillId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: "WhatsApp" | "SMS" | "Email" | "Social Media" | "Flyer";
  targetService:
    | "domestic-courier"
    | "international-courier"
    | "general-product"
    | "all";
  description?: string;
  startDate: string;
  endDate?: string;
  status: "Draft" | "Active" | "Completed" | "Paused";
  reachCount: number;
  convertedCount: number;
  budget?: number;
  notes?: string;
  createdAt: string;
}

export const getLeads = (companyId = SHARED_DATA_ID): Lead[] =>
  get<Lead[]>(`leads_${companyId}`, []);
export const setLeads = (leads: Lead[], companyId = SHARED_DATA_ID): void =>
  set(`leads_${companyId}`, leads);

export const getCampaigns = (companyId = SHARED_DATA_ID): Campaign[] =>
  get<Campaign[]>(`campaigns_${companyId}`, []);
export const setCampaigns = (
  campaigns: Campaign[],
  companyId = SHARED_DATA_ID,
): void => set(`campaigns_${companyId}`, campaigns);

// ─── ERP ─────────────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  phone: string;
  email?: string;
  department: string;
  designation: string;
  joinDate: string;
  salary: number;
  salaryType: "Monthly" | "Daily" | "Hourly";
  address?: string;
  aadhar?: string;
  pan?: string;
  bankAccount?: string;
  bankIfsc?: string;
  status: "Active" | "Inactive" | "On Leave";
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: "Present" | "Absent" | "Half Day" | "Holiday" | "Leave";
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: "Casual" | "Sick" | "Annual" | "Unpaid" | "Other";
  fromDate: string;
  toDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  depreciationPercent: number;
  location: string;
  serialNumber?: string;
  vendor?: string;
  warrantyExpiry?: string;
  status: "Active" | "Under Maintenance" | "Disposed";
  notes?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId?: string;
  vendorName: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    gstRate: number;
    amount: number;
  }>;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  expectedDelivery?: string;
  status:
    | "Draft"
    | "Approved"
    | "Ordered"
    | "Partially Received"
    | "Received"
    | "Cancelled";
  notes?: string;
  createdAt: string;
  approvedBy?: string;
  linkedInvoiceId?: string;
}

export interface StockRequisition {
  id: string;
  reqNumber: string;
  department: string;
  requestedBy: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    reason: string;
  }>;
  status: "Pending" | "Approved" | "Rejected" | "Fulfilled";
  priority: "Low" | "Medium" | "High" | "Urgent";
  requiredBy?: string;
  notes?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export const getEmployees = (companyId = SHARED_DATA_ID): Employee[] =>
  get<Employee[]>(`employees_${companyId}`, []);
export const setEmployees = (
  employees: Employee[],
  companyId = SHARED_DATA_ID,
): void => set(`employees_${companyId}`, employees);

export const getAttendance = (companyId = SHARED_DATA_ID): AttendanceRecord[] =>
  get<AttendanceRecord[]>(`attendance_${companyId}`, []);
export const setAttendance = (
  records: AttendanceRecord[],
  companyId = SHARED_DATA_ID,
): void => set(`attendance_${companyId}`, records);

export const getLeaveRequests = (companyId = SHARED_DATA_ID): LeaveRequest[] =>
  get<LeaveRequest[]>(`leaveRequests_${companyId}`, []);
export const setLeaveRequests = (
  requests: LeaveRequest[],
  companyId = SHARED_DATA_ID,
): void => set(`leaveRequests_${companyId}`, requests);

export const getAssets = (companyId = SHARED_DATA_ID): Asset[] =>
  get<Asset[]>(`assets_${companyId}`, []);
export const setAssets = (assets: Asset[], companyId = SHARED_DATA_ID): void =>
  set(`assets_${companyId}`, assets);

export const getPurchaseOrders = (
  companyId = SHARED_DATA_ID,
): PurchaseOrder[] => get<PurchaseOrder[]>(`purchaseOrders_${companyId}`, []);
export const setPurchaseOrders = (
  orders: PurchaseOrder[],
  companyId = SHARED_DATA_ID,
): void => set(`purchaseOrders_${companyId}`, orders);

export const getStockRequisitions = (
  companyId = SHARED_DATA_ID,
): StockRequisition[] =>
  get<StockRequisition[]>(`stockRequisitions_${companyId}`, []);
export const setStockRequisitions = (
  reqs: StockRequisition[],
  companyId = SHARED_DATA_ID,
): void => set(`stockRequisitions_${companyId}`, reqs);

// ─── Automated Campaigns (Digital Marketing) ─────────────────────────────────
export interface AutomatedCampaign {
  id: string;
  name: string;
  channel:
    | "WhatsApp"
    | "Email"
    | "Facebook Post"
    | "Instagram Post"
    | "Telegram";
  messageTemplate: string;
  schedule: "One-time" | "Daily" | "Weekly" | "Monthly";
  targetAudience:
    | "All Customers"
    | "Domestic Courier Leads"
    | "International Leads"
    | "Converted Customers";
  startDateTime: string;
  status: "Active" | "Paused" | "Draft";
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

const DM_AUTOMATIONS_KEY = "dm_automations_shared";
const DM_API_SETTINGS_KEY = "dm_api_settings";

export interface DMApiSettings {
  whatsappApiKey?: string;
  facebookApiToken?: string;
  emailApiKey?: string;
  telegramBotToken?: string;
}

export const getAutomations = (): AutomatedCampaign[] =>
  get<AutomatedCampaign[]>(DM_AUTOMATIONS_KEY, []);
export const setAutomations = (items: AutomatedCampaign[]): void =>
  set(DM_AUTOMATIONS_KEY, items);

export const getDMApiSettings = (): DMApiSettings =>
  get<DMApiSettings>(DM_API_SETTINGS_KEY, {});
export const setDMApiSettings = (settings: DMApiSettings): void =>
  set(DM_API_SETTINGS_KEY, settings);

// ─── Task Management ──────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // username
  assignedBy: string; // username
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  status: "pending" | "noted" | "done";
  source: "manual" | "query" | "followup";
  sourceRef?: string; // query ID if from query
  createdAt: string;
  notedAt?: string;
  doneAt?: string;
}

const TASKS_KEY = "sks_tasks";

export const getTasks = (): Task[] => get<Task[]>(TASKS_KEY, []);

export const saveTasks = (tasks: Task[]): void => set(TASKS_KEY, tasks);

export const addTask = (task: Task): void => {
  const tasks = getTasks();
  set(TASKS_KEY, [...tasks, task]);
};

export const updateTask = (partial: Partial<Task> & { id: string }): void => {
  const tasks = getTasks().map((t) =>
    t.id === partial.id ? { ...t, ...partial } : t,
  );
  set(TASKS_KEY, tasks);
};

export const deleteTask = (id: string): void => {
  set(
    TASKS_KEY,
    getTasks().filter((t) => t.id !== id),
  );
};

// ─── Chartered Accounting ─────────────────────────────────────────────────────
export const ACCOUNTING_ACCOUNTS_KEY = "sks_chart_of_accounts_shared";
export const ACCOUNTING_JOURNAL_KEY = "sks_journal_entries_shared";
export const ACCOUNTING_RECONCILIATION_KEY = "sks_bank_reconciliation_shared";

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Capital" | "Income" | "Expense";
  openingBalance: number;
  currentBalance: number;
  isSystem?: boolean;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  narration: string;
  lines: JournalLine[];
  type:
    | "Manual"
    | "Auto-from-Bill"
    | "Auto-from-Invoice"
    | "Auto-from-Purchase";
  sourceId?: string; // bill/invoice id if auto
  createdAt: string;
}

export interface BankReconciliation {
  id: string;
  accountId: string;
  journalEntryId: string;
  reconciled: boolean;
  reconciledAt?: string;
}

const DEFAULT_ACCOUNTS: ChartAccount[] = [
  {
    id: "acc_1001",
    code: "1001",
    name: "Cash",
    type: "Asset",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_1002",
    code: "1002",
    name: "Bank",
    type: "Asset",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_1003",
    code: "1003",
    name: "Accounts Receivable",
    type: "Asset",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_1004",
    code: "1004",
    name: "Inventory",
    type: "Asset",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_2001",
    code: "2001",
    name: "Accounts Payable",
    type: "Liability",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_2002",
    code: "2002",
    name: "GST Payable",
    type: "Liability",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_3001",
    code: "3001",
    name: "Capital",
    type: "Capital",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_4001",
    code: "4001",
    name: "Sales Revenue",
    type: "Income",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_5001",
    code: "5001",
    name: "Purchase",
    type: "Expense",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
  {
    id: "acc_5002",
    code: "5002",
    name: "Expenses",
    type: "Expense",
    openingBalance: 0,
    currentBalance: 0,
    isSystem: true,
  },
];

export const getChartOfAccounts = (): ChartAccount[] => {
  const data = localStorage.getItem(ACCOUNTING_ACCOUNTS_KEY);
  if (!data) {
    localStorage.setItem(
      ACCOUNTING_ACCOUNTS_KEY,
      JSON.stringify(DEFAULT_ACCOUNTS),
    );
    return DEFAULT_ACCOUNTS;
  }
  try {
    return JSON.parse(data) as ChartAccount[];
  } catch {
    return DEFAULT_ACCOUNTS;
  }
};

export const saveChartOfAccounts = (accounts: ChartAccount[]): void => {
  localStorage.setItem(ACCOUNTING_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const getJournalEntries = (): JournalEntry[] => {
  const data = localStorage.getItem(ACCOUNTING_JOURNAL_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as JournalEntry[];
  } catch {
    return [];
  }
};

export const saveJournalEntries = (entries: JournalEntry[]): void => {
  localStorage.setItem(ACCOUNTING_JOURNAL_KEY, JSON.stringify(entries));
};

export const getBankReconciliations = (): BankReconciliation[] => {
  const data = localStorage.getItem(ACCOUNTING_RECONCILIATION_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as BankReconciliation[];
  } catch {
    return [];
  }
};

export const saveBankReconciliations = (recs: BankReconciliation[]): void => {
  localStorage.setItem(ACCOUNTING_RECONCILIATION_KEY, JSON.stringify(recs));
};
