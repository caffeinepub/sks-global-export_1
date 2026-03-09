import { create } from "zustand";
import type {
  AWBSerialRange,
  AnyProduct,
  AppUser,
  Bill,
  Company,
  CompanySettings,
  CourierBrand,
  CourierPickup,
  Customer,
  DesignOrder,
  DesignPricingMaster,
  Expense,
  Invoice,
  PurchaseInvoice,
  Vendor,
} from "../types";
import {
  SHARED_DATA_ID,
  getAWBSerials,
  getActiveCompanyId,
  getActiveUser,
  getBills,
  getCompanies,
  getCustomers,
  getDesignOrders,
  getDesignPricing,
  getExpenses,
  getInvoices,
  getPickups,
  getProducts,
  getPurchaseInvoices,
  getSettings,
  getUsers,
  getVendors,
  setAWBSerials,
  setActiveCompanyId,
  setActiveUser,
  setBills,
  setCompanies,
  setCustomers,
  setDesignOrders,
  setDesignPricing,
  setExpenses,
  setInvoices,
  setPickups,
  setProducts,
  setPurchaseInvoices,
  setSettings,
  setUsers,
  setVendors,
} from "../utils/storage";

interface AppState {
  // Auth
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // Companies
  companies: Company[];
  activeCompanyId: string;
  activeCompany: Company | null;
  switchCompany: (companyId: string) => void;
  addCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
  deleteCompany: (companyId: string) => void;

  // Users
  users: AppUser[];
  loadUsers: () => void;
  addUser: (user: AppUser) => void;
  updateUser: (user: AppUser) => void;
  deleteUser: (userId: string) => void;

  // Products
  products: AnyProduct[];
  loadProducts: () => void;
  addProduct: (product: AnyProduct) => void;
  updateProduct: (product: AnyProduct) => void;
  deleteProduct: (productId: string) => void;

  // Customers
  customers: Customer[];
  loadCustomers: () => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;

  // Vendors
  vendors: Vendor[];
  loadVendors: () => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (vendorId: string) => void;

  // Bills
  bills: Bill[];
  loadBills: () => void;
  addBill: (bill: Bill) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (billId: string) => void;

  // Invoices
  invoices: Invoice[];
  loadInvoices: () => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (invoiceId: string) => void;

  // Purchase Invoices
  purchaseInvoices: PurchaseInvoice[];
  loadPurchaseInvoices: () => void;
  addPurchaseInvoice: (inv: PurchaseInvoice) => void;
  updatePurchaseInvoice: (inv: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: string) => void;

  // Pickups
  pickups: CourierPickup[];
  loadPickups: () => void;
  addPickup: (pickup: CourierPickup) => void;
  updatePickup: (pickup: CourierPickup) => void;
  deletePickup: (pickupId: string) => void;

  // AWB Serials
  awbSerials: AWBSerialRange[];
  loadAWBSerials: () => void;
  addAWBSerial: (serial: AWBSerialRange) => void;
  updateAWBSerial: (serial: AWBSerialRange) => void;
  deleteAWBSerial: (serialId: string) => void;

  // Settings
  settings: CompanySettings | null;
  loadSettings: () => void;
  updateSettings: (settings: CompanySettings) => void;

  // Expenses
  expenses: Expense[];
  loadExpenses: () => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;

  // Design Orders
  designOrders: DesignOrder[];
  loadDesignOrders: () => void;
  addDesignOrder: (order: DesignOrder) => void;
  updateDesignOrder: (id: string, updates: Partial<DesignOrder>) => void;
  deleteDesignOrder: (id: string) => void;

  // Design Pricing
  designPricing: DesignPricingMaster[];
  loadDesignPricing: () => void;
  addDesignPricing: (item: DesignPricingMaster) => void;
  updateDesignPricing: (
    id: string,
    updates: Partial<DesignPricingMaster>,
  ) => void;
  deleteDesignPricing: (id: string) => void;

  // Load all company data
  loadCompanyData: (companyId: string) => void;
}

import { verifyPassword } from "../utils/helpers";

export const useAppStore = create<AppState>((set, get) => {
  const loadCompanyData = (companyId: string) => {
    if (!companyId) return;
    // Transactional data is always shared (SHARED_DATA_ID)
    // Only settings (invoice sequences, prefixes) are per-company
    set({
      bills: getBills(SHARED_DATA_ID),
      invoices: getInvoices(SHARED_DATA_ID),
      products: getProducts(SHARED_DATA_ID),
      customers: getCustomers(SHARED_DATA_ID),
      vendors: getVendors(SHARED_DATA_ID),
      pickups: getPickups(SHARED_DATA_ID),
      purchaseInvoices: getPurchaseInvoices(SHARED_DATA_ID),
      awbSerials: getAWBSerials(SHARED_DATA_ID),
      settings: getSettings(companyId), // per-company: invoice sequences, prefixes
      expenses: getExpenses(SHARED_DATA_ID),
      designOrders: getDesignOrders(SHARED_DATA_ID),
      designPricing: getDesignPricing(SHARED_DATA_ID),
    });
  };

  // Initialize from localStorage
  const savedUser = getActiveUser();
  const savedCompanyId = getActiveCompanyId();
  const companies = getCompanies();
  const activeCompany = companies.find((c) => c.id === savedCompanyId) ?? null;

  return {
    // Auth
    currentUser: savedUser,
    isAuthenticated: savedUser !== null,

    login: (username: string, password: string) => {
      const users = getUsers();
      const user = users.find(
        (u) =>
          u.username === username && verifyPassword(password, u.passwordHash),
      );
      if (user) {
        setActiveUser(user);
        // Set first available company
        const firstCompanyId = user.companyIds[0] || "";
        if (firstCompanyId && !getActiveCompanyId()) {
          setActiveCompanyId(firstCompanyId);
        }
        const activeId = getActiveCompanyId() || firstCompanyId;
        const comps = getCompanies();
        const company = comps.find((c) => c.id === activeId) ?? null;
        set({
          currentUser: user,
          isAuthenticated: true,
          companies: comps,
          activeCompanyId: activeId,
          activeCompany: company,
        });
        loadCompanyData(activeId);
        return true;
      }
      return false;
    },

    logout: () => {
      setActiveUser(null);
      set({
        currentUser: null,
        isAuthenticated: false,
      });
    },

    // Companies
    companies,
    activeCompanyId: savedCompanyId,
    activeCompany,

    switchCompany: (companyId: string) => {
      setActiveCompanyId(companyId);
      const comps = getCompanies();
      const company = comps.find((c) => c.id === companyId) ?? null;
      // Update company identity + per-company settings; shared data stays as-is
      set({
        activeCompanyId: companyId,
        activeCompany: company,
        settings: getSettings(companyId),
      });
    },

    addCompany: (company: Company) => {
      const comps = [...getCompanies(), company];
      setCompanies(comps);
      set({ companies: comps });
    },

    updateCompany: (company: Company) => {
      const comps = getCompanies().map((c) =>
        c.id === company.id ? company : c,
      );
      setCompanies(comps);
      const activeId = get().activeCompanyId;
      set({
        companies: comps,
        activeCompany: comps.find((c) => c.id === activeId) ?? null,
      });
    },

    deleteCompany: (companyId: string) => {
      const comps = getCompanies().filter((c) => c.id !== companyId);
      setCompanies(comps);
      set({ companies: comps });
    },

    // Users
    users: getUsers(),
    loadUsers: () => set({ users: getUsers() }),

    addUser: (user: AppUser) => {
      const users = [...getUsers(), user];
      setUsers(users);
      set({ users });
    },

    updateUser: (user: AppUser) => {
      // The caller is responsible for hashing. Store as-is.
      const users = getUsers().map((u) => (u.id === user.id ? user : u));
      setUsers(users);
      set({ users });
    },

    deleteUser: (userId: string) => {
      const users = getUsers().filter((u) => u.id !== userId);
      setUsers(users);
      set({ users });
    },

    // Products — shared across all companies
    products: getProducts(SHARED_DATA_ID),
    loadProducts: () => {
      set({ products: getProducts(SHARED_DATA_ID) });
    },

    addProduct: (product: AnyProduct) => {
      const products = [...getProducts(SHARED_DATA_ID), product];
      setProducts(SHARED_DATA_ID, products);
      set({ products });
    },

    updateProduct: (product: AnyProduct) => {
      const products = getProducts(SHARED_DATA_ID).map((p) =>
        p.id === product.id ? product : p,
      );
      setProducts(SHARED_DATA_ID, products);
      set({ products });
    },

    deleteProduct: (productId: string) => {
      const products = getProducts(SHARED_DATA_ID).filter(
        (p) => p.id !== productId,
      );
      setProducts(SHARED_DATA_ID, products);
      set({ products });
    },

    // Customers — shared across all companies
    customers: getCustomers(SHARED_DATA_ID),
    loadCustomers: () => {
      set({ customers: getCustomers(SHARED_DATA_ID) });
    },

    addCustomer: (customer: Customer) => {
      const customers = [...getCustomers(SHARED_DATA_ID), customer];
      setCustomers(SHARED_DATA_ID, customers);
      set({ customers });
    },

    updateCustomer: (customer: Customer) => {
      const customers = getCustomers(SHARED_DATA_ID).map((c) =>
        c.id === customer.id ? customer : c,
      );
      setCustomers(SHARED_DATA_ID, customers);
      set({ customers });
    },

    deleteCustomer: (customerId: string) => {
      const customers = getCustomers(SHARED_DATA_ID).filter(
        (c) => c.id !== customerId,
      );
      setCustomers(SHARED_DATA_ID, customers);
      set({ customers });
    },

    // Vendors — shared across all companies
    vendors: getVendors(SHARED_DATA_ID),
    loadVendors: () => {
      set({ vendors: getVendors(SHARED_DATA_ID) });
    },

    addVendor: (vendor: Vendor) => {
      const vendors = [...getVendors(SHARED_DATA_ID), vendor];
      setVendors(SHARED_DATA_ID, vendors);
      set({ vendors });
    },

    updateVendor: (vendor: Vendor) => {
      const vendors = getVendors(SHARED_DATA_ID).map((v) =>
        v.id === vendor.id ? vendor : v,
      );
      setVendors(SHARED_DATA_ID, vendors);
      set({ vendors });
    },

    deleteVendor: (vendorId: string) => {
      const vendors = getVendors(SHARED_DATA_ID).filter(
        (v) => v.id !== vendorId,
      );
      setVendors(SHARED_DATA_ID, vendors);
      set({ vendors });
    },

    // Bills — shared across all companies
    bills: getBills(SHARED_DATA_ID),
    loadBills: () => {
      set({ bills: getBills(SHARED_DATA_ID) });
    },

    addBill: (bill: Bill) => {
      const bills = [...getBills(SHARED_DATA_ID), bill];
      setBills(SHARED_DATA_ID, bills);
      set({ bills });
    },

    updateBill: (bill: Bill) => {
      const bills = getBills(SHARED_DATA_ID).map((b) =>
        b.id === bill.id ? bill : b,
      );
      setBills(SHARED_DATA_ID, bills);
      set({ bills });
    },

    deleteBill: (billId: string) => {
      const bills = getBills(SHARED_DATA_ID).filter((b) => b.id !== billId);
      setBills(SHARED_DATA_ID, bills);
      set({ bills });
    },

    // Invoices — shared across all companies
    invoices: getInvoices(SHARED_DATA_ID),
    loadInvoices: () => {
      set({ invoices: getInvoices(SHARED_DATA_ID) });
    },

    addInvoice: (invoice: Invoice) => {
      const invoices = [...getInvoices(SHARED_DATA_ID), invoice];
      setInvoices(SHARED_DATA_ID, invoices);
      set({ invoices });
    },

    updateInvoice: (invoice: Invoice) => {
      const invoices = getInvoices(SHARED_DATA_ID).map((inv) =>
        inv.id === invoice.id ? invoice : inv,
      );
      setInvoices(SHARED_DATA_ID, invoices);
      set({ invoices });
    },

    deleteInvoice: (invoiceId: string) => {
      // Find the invoice being deleted to get its associated bill IDs
      const invoiceToDelete = getInvoices(SHARED_DATA_ID).find(
        (inv) => inv.id === invoiceId,
      );
      // Remove the invoice
      const invoices = getInvoices(SHARED_DATA_ID).filter(
        (inv) => inv.id !== invoiceId,
      );
      setInvoices(SHARED_DATA_ID, invoices);
      set({ invoices });
      // Revert associated bills back to un-invoiced state (preserve billed products)
      if (invoiceToDelete?.billIds?.length) {
        const bills = getBills(SHARED_DATA_ID).map((b) => {
          if (invoiceToDelete.billIds.includes(b.id)) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { invoiceId: _removed, ...rest } = b;
            return { ...rest, isInvoiced: false };
          }
          return b;
        });
        setBills(SHARED_DATA_ID, bills);
        set({ bills });
      }
    },

    // Purchase Invoices — shared across all companies
    purchaseInvoices: getPurchaseInvoices(SHARED_DATA_ID),
    loadPurchaseInvoices: () => {
      set({ purchaseInvoices: getPurchaseInvoices(SHARED_DATA_ID) });
    },

    addPurchaseInvoice: (inv: PurchaseInvoice) => {
      const purchaseInvoices = [...getPurchaseInvoices(SHARED_DATA_ID), inv];
      setPurchaseInvoices(SHARED_DATA_ID, purchaseInvoices);
      set({ purchaseInvoices });
    },

    updatePurchaseInvoice: (inv: PurchaseInvoice) => {
      const purchaseInvoices = getPurchaseInvoices(SHARED_DATA_ID).map((i) =>
        i.id === inv.id ? inv : i,
      );
      setPurchaseInvoices(SHARED_DATA_ID, purchaseInvoices);
      set({ purchaseInvoices });
    },

    deletePurchaseInvoice: (id: string) => {
      const purchaseInvoices = getPurchaseInvoices(SHARED_DATA_ID).filter(
        (i) => i.id !== id,
      );
      setPurchaseInvoices(SHARED_DATA_ID, purchaseInvoices);
      set({ purchaseInvoices });
    },

    // Pickups — shared across all companies
    pickups: getPickups(SHARED_DATA_ID),
    loadPickups: () => {
      set({ pickups: getPickups(SHARED_DATA_ID) });
    },

    addPickup: (pickup: CourierPickup) => {
      const pickups = [...getPickups(SHARED_DATA_ID), pickup];
      setPickups(SHARED_DATA_ID, pickups);
      set({ pickups });
    },

    updatePickup: (pickup: CourierPickup) => {
      const pickups = getPickups(SHARED_DATA_ID).map((p) =>
        p.id === pickup.id ? pickup : p,
      );
      setPickups(SHARED_DATA_ID, pickups);
      set({ pickups });
    },

    deletePickup: (pickupId: string) => {
      const pickups = getPickups(SHARED_DATA_ID).filter(
        (p) => p.id !== pickupId,
      );
      setPickups(SHARED_DATA_ID, pickups);
      set({ pickups });
    },

    // AWB Serials — shared across all companies
    awbSerials: getAWBSerials(SHARED_DATA_ID),
    loadAWBSerials: () => {
      set({ awbSerials: getAWBSerials(SHARED_DATA_ID) });
    },

    addAWBSerial: (serial: AWBSerialRange) => {
      const awbSerials = [...getAWBSerials(SHARED_DATA_ID), serial];
      setAWBSerials(SHARED_DATA_ID, awbSerials);
      set({ awbSerials });
    },

    updateAWBSerial: (serial: AWBSerialRange) => {
      const awbSerials = getAWBSerials(SHARED_DATA_ID).map((s) =>
        s.id === serial.id ? serial : s,
      );
      setAWBSerials(SHARED_DATA_ID, awbSerials);
      set({ awbSerials });
    },

    deleteAWBSerial: (serialId: string) => {
      const awbSerials = getAWBSerials(SHARED_DATA_ID).filter(
        (s) => s.id !== serialId,
      );
      setAWBSerials(SHARED_DATA_ID, awbSerials);
      set({ awbSerials });
    },

    // Settings
    settings: savedCompanyId ? getSettings(savedCompanyId) : null,
    loadSettings: () => {
      const cid = get().activeCompanyId;
      set({ settings: getSettings(cid) });
    },

    updateSettings: (settings: CompanySettings) => {
      const cid = get().activeCompanyId;
      setSettings(cid, settings);
      set({ settings });
    },

    // Expenses — shared across all companies
    expenses: getExpenses(SHARED_DATA_ID),
    loadExpenses: () => {
      set({ expenses: getExpenses(SHARED_DATA_ID) });
    },

    addExpense: (expense: Expense) => {
      const expenses = [...getExpenses(SHARED_DATA_ID), expense];
      setExpenses(SHARED_DATA_ID, expenses);
      set({ expenses });
    },

    updateExpense: (expense: Expense) => {
      const expenses = getExpenses(SHARED_DATA_ID).map((e) =>
        e.id === expense.id ? expense : e,
      );
      setExpenses(SHARED_DATA_ID, expenses);
      set({ expenses });
    },

    deleteExpense: (expenseId: string) => {
      const expenses = getExpenses(SHARED_DATA_ID).filter(
        (e) => e.id !== expenseId,
      );
      setExpenses(SHARED_DATA_ID, expenses);
      set({ expenses });
    },

    // Design Orders — shared across all companies
    designOrders: getDesignOrders(SHARED_DATA_ID),
    loadDesignOrders: () => {
      set({ designOrders: getDesignOrders(SHARED_DATA_ID) });
    },
    addDesignOrder: (order: DesignOrder) => {
      const designOrders = [...getDesignOrders(SHARED_DATA_ID), order];
      setDesignOrders(SHARED_DATA_ID, designOrders);
      set({ designOrders });
    },
    updateDesignOrder: (id: string, updates: Partial<DesignOrder>) => {
      const designOrders = getDesignOrders(SHARED_DATA_ID).map((o) =>
        o.id === id
          ? { ...o, ...updates, updatedAt: new Date().toISOString() }
          : o,
      );
      setDesignOrders(SHARED_DATA_ID, designOrders);
      set({ designOrders });
    },
    deleteDesignOrder: (id: string) => {
      const designOrders = getDesignOrders(SHARED_DATA_ID).filter(
        (o) => o.id !== id,
      );
      setDesignOrders(SHARED_DATA_ID, designOrders);
      set({ designOrders });
    },

    // Design Pricing — shared across all companies
    designPricing: getDesignPricing(SHARED_DATA_ID),
    loadDesignPricing: () => {
      set({ designPricing: getDesignPricing(SHARED_DATA_ID) });
    },
    addDesignPricing: (item: DesignPricingMaster) => {
      const designPricing = [...getDesignPricing(SHARED_DATA_ID), item];
      setDesignPricing(SHARED_DATA_ID, designPricing);
      set({ designPricing });
    },
    updateDesignPricing: (
      id: string,
      updates: Partial<DesignPricingMaster>,
    ) => {
      const designPricing = getDesignPricing(SHARED_DATA_ID).map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      );
      setDesignPricing(SHARED_DATA_ID, designPricing);
      set({ designPricing });
    },
    deleteDesignPricing: (id: string) => {
      const designPricing = getDesignPricing(SHARED_DATA_ID).filter(
        (p) => p.id !== id,
      );
      setDesignPricing(SHARED_DATA_ID, designPricing);
      set({ designPricing });
    },

    // Load all company data
    loadCompanyData,
  };
});
