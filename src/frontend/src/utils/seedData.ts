import type {
  AWBSerialRange,
  AppUser,
  Bill,
  Company,
  CourierBrand,
  CourierPickup,
  Customer,
  GeneralProduct,
  ServiceProduct,
  Vendor,
  XeroxProduct,
} from "../types";
import {
  getBills,
  getCompanies,
  getCustomers,
  getPickups,
  getProducts,
  getSettings,
  getUsers,
  getVendors,
  setAWBSerials,
  setBills,
  setCompanies,
  setCustomers,
  setPickups,
  setProducts,
  setSettings,
  setUsers,
  setVendors,
} from "./storage";

const hashPassword = (pwd: string): string => btoa(pwd);

export const seedInitialData = (): void => {
  const companyId = "company_01";

  // Always ensure default users exist (even if companies were already seeded)
  const existingUsers = getUsers();
  const adminExists = existingUsers.some((u) => u.username === "admin");
  const operatorExists = existingUsers.some((u) => u.username === "operator");

  if (!adminExists || !operatorExists) {
    const baseUsers = existingUsers.filter(
      (u) => u.username !== "admin" && u.username !== "operator",
    );
    const defaultUsers: AppUser[] = [...baseUsers];
    if (!adminExists) {
      defaultUsers.unshift({
        id: "user_admin_01",
        name: "Admin User",
        username: "admin",
        passwordHash: hashPassword("admin123"),
        role: "admin",
        companyIds: [companyId],
      });
    }
    if (!operatorExists) {
      defaultUsers.push({
        id: "user_op_01",
        name: "Operator User",
        username: "operator",
        passwordHash: hashPassword("op123"),
        role: "operator",
        companyIds: [companyId],
      });
    }
    setUsers(defaultUsers);
  }

  // Only seed companies and related data if no companies exist
  const companies = getCompanies();

  // If companies already exist, skip re-seeding company data
  if (companies.length > 0) {
    return;
  }

  // Create company
  const company: Company = {
    id: companyId,
    name: "SKS Global Export",
    address: "123 Export House, Anna Salai, Chennai - 600001",
    gstin: "33AABCS1234A1Z5",
    phone: "9876543210",
    email: "info@sksglobalexport.com",
    invoicePrefix: "GST/",
    invoiceSeq: 1,
    nonGstInvoicePrefix: "INV/",
    nonGstInvoiceSeq: 1,
    billPrefix: "BILL/",
    billSeq: 1,
    state: "Tamil Nadu",
    pincode: "600001",
  };
  setCompanies([company]);

  // Products
  const existingProducts = getProducts(companyId);
  if (existingProducts.length === 0) {
    const paperProduct: GeneralProduct = {
      id: "prod_paper_01",
      companyId,
      type: "general",
      name: "A4 Paper",
      category: "Stationery",
      unit: "Ream",
      subUnit1: { name: "Sheet", conversionRate: 500 },
      sellingPrice: 280,
      purchasePrice: 220,
      gstRate: 12,
      hsnCode: "4802",
      currentStock: 100,
      minStockAlert: 20,
      isActive: true,
    };

    const inkProduct: GeneralProduct = {
      id: "prod_ink_01",
      companyId,
      type: "general",
      name: "Blue Ink Cartridge",
      category: "Stationery",
      unit: "Piece",
      sellingPrice: 480,
      purchasePrice: 350,
      gstRate: 18,
      hsnCode: "8443",
      currentStock: 20,
      minStockAlert: 5,
      isActive: true,
    };

    const envelopeProduct: GeneralProduct = {
      id: "prod_env_01",
      companyId,
      type: "general",
      name: "A4 Envelope",
      category: "Stationery",
      unit: "Pack",
      subUnit1: { name: "Piece", conversionRate: 50 },
      sellingPrice: 120,
      purchasePrice: 80,
      gstRate: 12,
      hsnCode: "4817",
      currentStock: 50,
      minStockAlert: 10,
      isActive: true,
    };

    const xeroxProduct: XeroxProduct = {
      id: "prod_xerox_01",
      companyId,
      type: "xerox",
      name: "Xerox A4",
      paperProductId: "prod_paper_01",
      inkChargePerPage: 0.3,
      serviceChargePerPage: 0.2,
      pricePerPage: 1.0,
      gstRate: 18,
      isActive: true,
    };

    const scanService: ServiceProduct = {
      id: "prod_scan_01",
      companyId,
      type: "service",
      name: "Document Scanning",
      description: "Scanning documents to PDF format",
      price: 10,
      gstRate: 18,
      sacCode: "998319",
      isActive: true,
    };

    const printService: ServiceProduct = {
      id: "prod_print_01",
      companyId,
      type: "service",
      name: "Color Printout",
      description: "High quality color printing",
      price: 15,
      gstRate: 18,
      sacCode: "998319",
      isActive: true,
    };

    const dtdcBrand: CourierBrand = {
      id: "brand_dtdc_01",
      companyId,
      type: "courier_awb",
      brandName: "DTDC",
      productType: "Courier",
      serviceModes: ["Air", "Surface", "GEC"],
      transportModes: "Both",
      serialLogic: "sequential",
      sellingPrice: 85,
      gstRate: 18,
      isActive: true,
    };

    const bluedartBrand: CourierBrand = {
      id: "brand_bluedart_01",
      companyId,
      type: "courier_awb",
      brandName: "BlueDart",
      productType: "Express Courier",
      serviceModes: ["Air", "Surface"],
      transportModes: "Both",
      serialLogic: "custom_gap",
      serialGap: 11,
      sellingPrice: 120,
      gstRate: 18,
      isActive: true,
    };

    const delhiverBrand: CourierBrand = {
      id: "brand_delhivery_01",
      companyId,
      type: "courier_awb",
      brandName: "Delhivery",
      productType: "Courier",
      serviceModes: ["Surface", "Air"],
      transportModes: "Both",
      serialLogic: "sequential_prefix_first",
      serialPrefix: "DL",
      prefixPosition: "first",
      sellingPrice: 75,
      gstRate: 18,
      isActive: true,
    };

    setProducts(companyId, [
      paperProduct,
      inkProduct,
      envelopeProduct,
      xeroxProduct,
      scanService,
      printService,
      dtdcBrand,
      bluedartBrand,
      delhiverBrand,
    ]);

    // Seed AWB serials
    const dtdcSerials: AWBSerialRange = {
      id: "awb_dtdc_01",
      companyId,
      brandId: "brand_dtdc_01",
      brandName: "DTDC",
      fromSerial: "D100001",
      toSerial: "D100200",
      quantity: 200,
      purchaseDate: new Date().toISOString().split("T")[0],
      usedSerials: ["D100001", "D100002", "D100003"],
      availableSerials: Array.from({ length: 197 }, (_, i) => `D${100004 + i}`),
    };

    const bluedartSerials: AWBSerialRange = {
      id: "awb_bluedart_01",
      companyId,
      brandId: "brand_bluedart_01",
      brandName: "BlueDart",
      fromSerial: "48064699185",
      toSerial: "48064699900",
      quantity: 64,
      purchaseDate: new Date().toISOString().split("T")[0],
      usedSerials: [],
      availableSerials: (() => {
        const nums = [
          48064699185, 48064699196, 48064699200, 48064699211, 48064699222,
          48064699233, 48064699244, 48064699255, 48064699266, 48064699270,
        ];
        return nums.map(String);
      })(),
    };

    setAWBSerials(companyId, [dtdcSerials, bluedartSerials]);
  }

  // Customers
  const existingCustomers = getCustomers(companyId);
  if (existingCustomers.length === 0) {
    const customers: Customer[] = [
      {
        id: "cust_01",
        companyId,
        customerType: "registered",
        name: "Rajesh Kumar",
        phone: "9876500001",
        email: "rajesh@example.com",
        address: "45 Gandhi Nagar, Chennai - 600020",
        totalPurchases: 4500,
        isActive: true,
      },
      {
        id: "cust_02",
        companyId,
        customerType: "registered",
        name: "Priya Traders",
        phone: "9876500002",
        email: "priya@priyatraders.com",
        address: "78 Commercial Street, Chennai - 600003",
        gstin: "33BBBCS5678B1Z5",
        totalPurchases: 12800,
        isActive: true,
      },
      {
        id: "cust_03",
        companyId,
        customerType: "registered",
        name: "Suresh Electronics",
        phone: "9876500003",
        address: "12 Tech Park, Chennai - 600028",
        totalPurchases: 8200,
        isActive: true,
      },
      {
        id: "cust_walk_01",
        companyId,
        customerType: "walking",
        name: "Walking Customer",
        phone: "0000000000",
        totalPurchases: 0,
        isActive: true,
      },
    ];
    setCustomers(companyId, customers);
  }

  // Vendors
  const existingVendors = getVendors(companyId);
  if (existingVendors.length === 0) {
    const vendors: Vendor[] = [
      {
        id: "vend_01",
        companyId,
        name: "Chennai Paper Mart",
        phone: "9876600001",
        email: "purchase@chennaipapermart.com",
        address: "55 Warehouse Road, Chennai - 600010",
        gstin: "33CCCPA1234C1Z5",
        totalPurchases: 45000,
        isActive: true,
      },
      {
        id: "vend_02",
        companyId,
        name: "DTDC Franchise",
        phone: "9876600002",
        address: "DTDC Hub, Chennai - 600030",
        totalPurchases: 18000,
        isActive: true,
      },
      {
        id: "vend_03",
        companyId,
        name: "BlueDart Distribution",
        phone: "9876600003",
        address: "BlueDart Center, Chennai - 600032",
        totalPurchases: 22000,
        isActive: true,
      },
    ];
    setVendors(companyId, vendors);
  }

  // Sample bills
  const existingBills = getBills(companyId);
  if (existingBills.length === 0) {
    const today = new Date().toISOString().split("T")[0];
    const bills: Bill[] = [
      {
        id: "bill_01",
        companyId,
        billNo: "BILL/001",
        customerId: "cust_01",
        customerName: "Rajesh Kumar",
        customerType: "registered",
        date: today,
        items: [
          {
            id: "item_01",
            productId: "prod_paper_01",
            productType: "general",
            productName: "A4 Paper",
            quantity: 2,
            unit: "Ream",
            unitPrice: 280,
            totalPrice: 560,
            gstRate: 12,
          },
          {
            id: "item_02",
            productId: "prod_scan_01",
            productType: "service",
            productName: "Document Scanning",
            description: "10 pages A4 scanning",
            quantity: 10,
            unit: "Page",
            unitPrice: 10,
            totalPrice: 100,
            gstRate: 18,
          },
        ],
        subtotal: 660,
        total: 660,
        paymentMethod: "cash",
        paymentStatus: "paid",
        amountPaid: 660,
        balanceDue: 0,
        isInvoiced: false,
      },
      {
        id: "bill_02",
        companyId,
        billNo: "BILL/002",
        customerId: "cust_02",
        customerName: "Priya Traders",
        customerType: "registered",
        date: today,
        items: [
          {
            id: "item_03",
            productId: "brand_dtdc_01",
            productType: "courier_awb",
            productName: "DTDC Courier",
            quantity: 3,
            unit: "Piece",
            awbSerial: "D100004",
            serviceMode: "Air",
            brandName: "DTDC",
            unitPrice: 85,
            totalPrice: 255,
            gstRate: 18,
          },
        ],
        subtotal: 255,
        total: 255,
        paymentMethod: "upi",
        paymentStatus: "paid",
        amountPaid: 255,
        balanceDue: 0,
        isInvoiced: false,
      },
      {
        id: "bill_03",
        companyId,
        billNo: "BILL/003",
        customerId: "cust_03",
        customerName: "Suresh Electronics",
        customerType: "registered",
        date: today,
        items: [
          {
            id: "item_04",
            productId: "prod_ink_01",
            productType: "general",
            productName: "Blue Ink Cartridge",
            quantity: 2,
            unit: "Piece",
            unitPrice: 480,
            totalPrice: 960,
            gstRate: 18,
          },
          {
            id: "item_05",
            productId: "prod_xerox_01",
            productType: "xerox",
            productName: "Xerox A4",
            quantity: 50,
            unit: "Page",
            unitPrice: 1.0,
            totalPrice: 50,
            gstRate: 18,
          },
        ],
        subtotal: 1010,
        total: 1010,
        paymentMethod: "credit",
        paymentStatus: "pending",
        amountPaid: 0,
        balanceDue: 1010,
        isInvoiced: false,
      },
    ];
    setBills(companyId, bills);

    // Update settings bill sequence
    const settings = getSettings(companyId);
    setSettings(companyId, { ...settings, billSeq: 4 });
  }

  // Sample pickups
  const existingPickups = getPickups(companyId);
  if (existingPickups.length === 0) {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];
    const pickups: CourierPickup[] = [
      {
        id: "pickup_01",
        companyId,
        courierBrand: "DTDC",
        scheduledDate: today,
        scheduledTime: "14:00",
        estimatedPieces: 15,
        estimatedBoxes: 3,
        status: "pending",
        notes: "Regular daily pickup",
      },
      {
        id: "pickup_02",
        companyId,
        courierBrand: "BlueDart",
        scheduledDate: today,
        scheduledTime: "16:30",
        estimatedPieces: 8,
        estimatedBoxes: 2,
        status: "pending",
      },
      {
        id: "pickup_03",
        companyId,
        courierBrand: "Delhivery",
        scheduledDate: tomorrow,
        scheduledTime: "10:00",
        estimatedPieces: 20,
        estimatedBoxes: 4,
        status: "pending",
      },
    ];
    setPickups(companyId, pickups);
  }
};
