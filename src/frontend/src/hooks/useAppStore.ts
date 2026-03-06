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
  Expense,
  Invoice,
  PurchaseInvoice,
  Vendor,
} from "../types";
import {
  getAWBSerials,
  getActiveCompanyId,
  getActiveUser,
  getBills,
  getCompanies,
  getCustomers,
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

  // Load all company data
  loadCompanyData: (companyId: string) => void;
}

import { verifyPassword } from "../utils/helpers";

export const useAppStore = create<AppState>((set, get) => {
  const loadCompanyData = (companyId: string) => {
    if (!companyId) return;
    set({
      bills: getBills(companyId),
      invoices: getInvoices(companyId),
      products: getProducts(companyId),
      customers: getCustomers(companyId),
      vendors: getVendors(companyId),
      pickups: getPickups(companyId),
      purchaseInvoices: getPurchaseInvoices(companyId),
      awbSerials: getAWBSerials(companyId),
      settings: getSettings(companyId),
      expenses: getExpenses(companyId),
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
      set({ activeCompanyId: companyId, activeCompany: company });
      loadCompanyData(companyId);
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

    // Products
    products: savedCompanyId ? getProducts(savedCompanyId) : [],
    loadProducts: () => {
      const cid = get().activeCompanyId;
      set({ products: getProducts(cid) });
    },

    addProduct: (product: AnyProduct) => {
      const cid = get().activeCompanyId;
      const products = [...getProducts(cid), product];
      setProducts(cid, products);
      set({ products });
    },

    updateProduct: (product: AnyProduct) => {
      const cid = get().activeCompanyId;
      const products = getProducts(cid).map((p) =>
        p.id === product.id ? product : p,
      );
      setProducts(cid, products);
      set({ products });
    },

    deleteProduct: (productId: string) => {
      const cid = get().activeCompanyId;
      const products = getProducts(cid).filter((p) => p.id !== productId);
      setProducts(cid, products);
      set({ products });
    },

    // Customers
    customers: savedCompanyId ? getCustomers(savedCompanyId) : [],
    loadCustomers: () => {
      const cid = get().activeCompanyId;
      set({ customers: getCustomers(cid) });
    },

    addCustomer: (customer: Customer) => {
      const cid = get().activeCompanyId;
      const customers = [...getCustomers(cid), customer];
      setCustomers(cid, customers);
      set({ customers });
    },

    updateCustomer: (customer: Customer) => {
      const cid = get().activeCompanyId;
      const customers = getCustomers(cid).map((c) =>
        c.id === customer.id ? customer : c,
      );
      setCustomers(cid, customers);
      set({ customers });
    },

    deleteCustomer: (customerId: string) => {
      const cid = get().activeCompanyId;
      const customers = getCustomers(cid).filter((c) => c.id !== customerId);
      setCustomers(cid, customers);
      set({ customers });
    },

    // Vendors
    vendors: savedCompanyId ? getVendors(savedCompanyId) : [],
    loadVendors: () => {
      const cid = get().activeCompanyId;
      set({ vendors: getVendors(cid) });
    },

    addVendor: (vendor: Vendor) => {
      const cid = get().activeCompanyId;
      const vendors = [...getVendors(cid), vendor];
      setVendors(cid, vendors);
      set({ vendors });
    },

    updateVendor: (vendor: Vendor) => {
      const cid = get().activeCompanyId;
      const vendors = getVendors(cid).map((v) =>
        v.id === vendor.id ? vendor : v,
      );
      setVendors(cid, vendors);
      set({ vendors });
    },

    deleteVendor: (vendorId: string) => {
      const cid = get().activeCompanyId;
      const vendors = getVendors(cid).filter((v) => v.id !== vendorId);
      setVendors(cid, vendors);
      set({ vendors });
    },

    // Bills
    bills: savedCompanyId ? getBills(savedCompanyId) : [],
    loadBills: () => {
      const cid = get().activeCompanyId;
      set({ bills: getBills(cid) });
    },

    addBill: (bill: Bill) => {
      const cid = get().activeCompanyId;
      const bills = [...getBills(cid), bill];
      setBills(cid, bills);
      set({ bills });
    },

    updateBill: (bill: Bill) => {
      const cid = get().activeCompanyId;
      const bills = getBills(cid).map((b) => (b.id === bill.id ? bill : b));
      setBills(cid, bills);
      set({ bills });
    },

    deleteBill: (billId: string) => {
      const cid = get().activeCompanyId;
      const bills = getBills(cid).filter((b) => b.id !== billId);
      setBills(cid, bills);
      set({ bills });
    },

    // Invoices
    invoices: savedCompanyId ? getInvoices(savedCompanyId) : [],
    loadInvoices: () => {
      const cid = get().activeCompanyId;
      set({ invoices: getInvoices(cid) });
    },

    addInvoice: (invoice: Invoice) => {
      const cid = get().activeCompanyId;
      const invoices = [...getInvoices(cid), invoice];
      setInvoices(cid, invoices);
      set({ invoices });
    },

    updateInvoice: (invoice: Invoice) => {
      const cid = get().activeCompanyId;
      const invoices = getInvoices(cid).map((inv) =>
        inv.id === invoice.id ? invoice : inv,
      );
      setInvoices(cid, invoices);
      set({ invoices });
    },

    deleteInvoice: (invoiceId: string) => {
      const cid = get().activeCompanyId;
      const invoices = getInvoices(cid).filter((inv) => inv.id !== invoiceId);
      setInvoices(cid, invoices);
      set({ invoices });
    },

    // Purchase Invoices
    purchaseInvoices: savedCompanyId ? getPurchaseInvoices(savedCompanyId) : [],
    loadPurchaseInvoices: () => {
      const cid = get().activeCompanyId;
      set({ purchaseInvoices: getPurchaseInvoices(cid) });
    },

    addPurchaseInvoice: (inv: PurchaseInvoice) => {
      const cid = get().activeCompanyId;
      const purchaseInvoices = [...getPurchaseInvoices(cid), inv];
      setPurchaseInvoices(cid, purchaseInvoices);
      set({ purchaseInvoices });
    },

    updatePurchaseInvoice: (inv: PurchaseInvoice) => {
      const cid = get().activeCompanyId;
      const purchaseInvoices = getPurchaseInvoices(cid).map((i) =>
        i.id === inv.id ? inv : i,
      );
      setPurchaseInvoices(cid, purchaseInvoices);
      set({ purchaseInvoices });
    },

    // Pickups
    pickups: savedCompanyId ? getPickups(savedCompanyId) : [],
    loadPickups: () => {
      const cid = get().activeCompanyId;
      set({ pickups: getPickups(cid) });
    },

    addPickup: (pickup: CourierPickup) => {
      const cid = get().activeCompanyId;
      const pickups = [...getPickups(cid), pickup];
      setPickups(cid, pickups);
      set({ pickups });
    },

    updatePickup: (pickup: CourierPickup) => {
      const cid = get().activeCompanyId;
      const pickups = getPickups(cid).map((p) =>
        p.id === pickup.id ? pickup : p,
      );
      setPickups(cid, pickups);
      set({ pickups });
    },

    deletePickup: (pickupId: string) => {
      const cid = get().activeCompanyId;
      const pickups = getPickups(cid).filter((p) => p.id !== pickupId);
      setPickups(cid, pickups);
      set({ pickups });
    },

    // AWB Serials
    awbSerials: savedCompanyId ? getAWBSerials(savedCompanyId) : [],
    loadAWBSerials: () => {
      const cid = get().activeCompanyId;
      set({ awbSerials: getAWBSerials(cid) });
    },

    addAWBSerial: (serial: AWBSerialRange) => {
      const cid = get().activeCompanyId;
      const awbSerials = [...getAWBSerials(cid), serial];
      setAWBSerials(cid, awbSerials);
      set({ awbSerials });
    },

    updateAWBSerial: (serial: AWBSerialRange) => {
      const cid = get().activeCompanyId;
      const awbSerials = getAWBSerials(cid).map((s) =>
        s.id === serial.id ? serial : s,
      );
      setAWBSerials(cid, awbSerials);
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

    // Expenses
    expenses: savedCompanyId ? getExpenses(savedCompanyId) : [],
    loadExpenses: () => {
      const cid = get().activeCompanyId;
      set({ expenses: getExpenses(cid) });
    },

    addExpense: (expense: Expense) => {
      const cid = get().activeCompanyId;
      const expenses = [...getExpenses(cid), expense];
      setExpenses(cid, expenses);
      set({ expenses });
    },

    updateExpense: (expense: Expense) => {
      const cid = get().activeCompanyId;
      const expenses = getExpenses(cid).map((e) =>
        e.id === expense.id ? expense : e,
      );
      setExpenses(cid, expenses);
      set({ expenses });
    },

    deleteExpense: (expenseId: string) => {
      const cid = get().activeCompanyId;
      const expenses = getExpenses(cid).filter((e) => e.id !== expenseId);
      setExpenses(cid, expenses);
      set({ expenses });
    },

    // Load all company data
    loadCompanyData,
  };
});
