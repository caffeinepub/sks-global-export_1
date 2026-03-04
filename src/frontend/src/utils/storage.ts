import type {
  AWBSerialRange,
  AnyProduct,
  AppUser,
  Bill,
  Company,
  CompanySettings,
  CourierBrand,
  CourierPickup,
  CourierTariff,
  Customer,
  CustomerTariffAssignment,
  Invoice,
  PurchaseInvoice,
  Vendor,
} from "../types";
import { emitSaved, emitSaving } from "./saveEvents";

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
  customerTariffs: (cid: string) => `sks_customer_tariffs_${cid}`,
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

// Last backup
export const getLastBackupTime = (): string | null =>
  localStorage.getItem(KEYS.LAST_BACKUP);
export const setLastBackupTime = (): void =>
  localStorage.setItem(KEYS.LAST_BACKUP, new Date().toISOString());

// Export all data as JSON
export const exportAllData = (): string => {
  const companies = getCompanies();
  const users = getUsers();
  const allData: Record<string, unknown> = { companies, users };

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
    allData[`customerTariffs_${cid}`] = getCustomerTariffMap(cid);
  }

  return JSON.stringify(allData, null, 2);
};

// Import all data from JSON
export const importAllData = (jsonString: string): void => {
  const data = JSON.parse(jsonString) as Record<string, unknown>;

  if (data.companies) setCompanies(data.companies as Company[]);
  if (data.users) setUsers(data.users as AppUser[]);

  const companies = (data.companies as Company[]) || getCompanies();
  for (const company of companies) {
    const cid = company.id;
    if (data[`bills_${cid}`]) setBills(cid, data[`bills_${cid}`] as Bill[]);
    if (data[`invoices_${cid}`])
      setInvoices(cid, data[`invoices_${cid}`] as Invoice[]);
    if (data[`products_${cid}`])
      setProducts(cid, data[`products_${cid}`] as AnyProduct[]);
    if (data[`customers_${cid}`])
      setCustomers(cid, data[`customers_${cid}`] as Customer[]);
    if (data[`vendors_${cid}`])
      setVendors(cid, data[`vendors_${cid}`] as Vendor[]);
    if (data[`courierBrands_${cid}`])
      setCourierBrands(cid, data[`courierBrands_${cid}`] as CourierBrand[]);
    if (data[`awbSerials_${cid}`])
      setAWBSerials(cid, data[`awbSerials_${cid}`] as AWBSerialRange[]);
    if (data[`pickups_${cid}`])
      setPickups(cid, data[`pickups_${cid}`] as CourierPickup[]);
    if (data[`purchaseInvoices_${cid}`])
      setPurchaseInvoices(
        cid,
        data[`purchaseInvoices_${cid}`] as PurchaseInvoice[],
      );
    if (data[`settings_${cid}`])
      setSettings(cid, data[`settings_${cid}`] as CompanySettings);
    if (data[`tariffs_${cid}`])
      setTariffs(cid, data[`tariffs_${cid}`] as CourierTariff[]);
    if (data[`customerTariffs_${cid}`])
      setCustomerTariffMap(
        cid,
        data[`customerTariffs_${cid}`] as Record<
          string,
          CustomerTariffAssignment[]
        >,
      );
  }
};
