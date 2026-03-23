import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileDown,
  Package,
  PackageCheck,
  Plus,
  Printer,
  Save,
  Search,
  Tag,
  Trash2,
  Truck,
  User,
  Weight,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CourierSlipPrintDialog } from "../components/CourierSlipPrintDialog";
import { useAppStore } from "../hooks/useAppStore";
import type {
  AdditionalCharge,
  Bill,
  BillItem,
  CourierBrand,
  CourierTariff,
  Customer,
  GeneralProduct,
  Invoice,
  PricingSlab,
  ServiceProduct,
  XeroxProduct,
} from "../types";
import {
  buildSKSAWB,
  formatCurrency,
  generateBillNo,
  generateId,
  getTodayStr,
} from "../utils/helpers";
import {
  type PincodeData,
  fetchPincodeData,
  formatPincodeAddress,
} from "../utils/pincodeApi";
import {
  type ReceiverDetail,
  SHARED_DATA_ID,
  getCustomerTariffMap,
  getEDDRules,
  getSavedReceivers,
  getTariffs,
  incrementSKSDailyCounter,
  saveReceiver,
  setSettings,
} from "../utils/storage";

// ─── Pricing Slab Resolver ────────────────────────────────────────────────────

function resolveSlabPrice(
  slabs: PricingSlab[],
  qty: number,
  basePrice: number,
): number {
  if (!slabs || slabs.length === 0) return basePrice;
  const match = slabs.find(
    (s) => qty >= s.minQty && (s.maxQty === null || qty <= s.maxQty),
  );
  return match ? match.price : basePrice;
}

// ─── Pricing Tier Resolver ─────────────────────────────────────────────────────

function resolveTierPrice(
  tiers: import("../types").PricingTier[] | undefined,
  qty: number,
  basePrice: number,
): { price: number; tierName?: string } {
  if (!tiers || tiers.length === 0) return { price: basePrice };
  const match = tiers.find(
    (t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty),
  );
  if (match) return { price: match.sellingPrice, tierName: match.name };
  return { price: basePrice };
}

// ─── Generic Tariff Price Calculator ─────────────────────────────────────────

function calcTariffPrice(
  tariffs: CourierTariff[],
  brandName: string,
  productType: string,
  zone: string,
  weightKg: number,
): { price: number; breakdown: string; warning?: string } {
  const match = tariffs.find(
    (t) =>
      t.brandName.toLowerCase() === brandName.toLowerCase() &&
      t.productType.toLowerCase() === productType.toLowerCase() &&
      t.zone === zone &&
      t.isActive,
  );

  if (!match) {
    return {
      price: 0,
      breakdown: `No tariff found for ${brandName} – ${productType} (${zone})`,
    };
  }

  if (match.pricingMode === "slab") {
    const slabs = match.slabs ?? [];
    const grams = weightKg * 1000;

    const fixedSlabs = slabs.filter((s) => s.maxGrams !== null);
    const addlSlab = slabs.find((s) => s.maxGrams === null);

    let price = 0;
    let slabDesc = "";

    const matchedSlab = fixedSlabs.find(
      (s) => s.maxGrams !== null && grams <= s.maxGrams!,
    );

    if (matchedSlab) {
      price = matchedSlab.price;
      slabDesc = `0–${matchedSlab.maxGrams}g`;
    } else if (addlSlab) {
      const lastFixed = fixedSlabs[fixedSlabs.length - 1];
      const lastMaxG = lastFixed?.maxGrams ?? 500;
      const lastPrice = lastFixed?.price ?? 0;
      const addlUnits = Math.ceil((grams - lastMaxG) / 500);
      price = lastPrice + addlUnits * addlSlab.price;
      slabDesc = `${lastMaxG}g + ${addlUnits}×500g extra`;
    } else if (fixedSlabs.length > 0) {
      const lastFixed = fixedSlabs[fixedSlabs.length - 1];
      price = lastFixed.price;
      slabDesc = `>${fixedSlabs[fixedSlabs.length - 2]?.maxGrams ?? 0}g`;
    }

    const warning =
      match.maxWeightKg && weightKg > match.maxWeightKg
        ? `Max weight for ${productType} to ${zone} is ${match.maxWeightKg}kg`
        : undefined;

    return {
      price,
      breakdown: `${productType} | ${zone} | ${slabDesc}`,
      warning,
    };
  }

  if (match.pricingMode === "per_kg") {
    const minKg = match.minKg ?? 1;
    const ratePerKg = match.ratePerKg ?? 0;
    const chargeableKg = Math.max(weightKg, minKg);
    const price = chargeableKg * ratePerKg;
    return {
      price,
      breakdown: `${productType} | ${zone} | ${chargeableKg.toFixed(2)}kg × ₹${ratePerKg}/kg`,
    };
  }

  return { price: 0, breakdown: "" };
}

// ─────────────────────────────────────────────────────────────────────────────

// Brand color configuration
const BRAND_COLORS: Record<
  string,
  { bg: string; text: string; border: string; initials: string }
> = {
  DTDC: {
    bg: "bg-orange-500",
    text: "text-white",
    border: "border-orange-400",
    initials: "DT",
  },
  BlueDart: {
    bg: "bg-red-600",
    text: "text-white",
    border: "border-red-500",
    initials: "BD",
  },
  Delhivery: {
    bg: "bg-blue-600",
    text: "text-white",
    border: "border-blue-500",
    initials: "DL",
  },
  FedEx: {
    bg: "bg-purple-700",
    text: "text-white",
    border: "border-purple-600",
    initials: "FX",
  },
  "India Post": {
    bg: "bg-red-700",
    text: "text-white",
    border: "border-red-600",
    initials: "IP",
  },
  Ecom: {
    bg: "bg-green-600",
    text: "text-white",
    border: "border-green-500",
    initials: "EC",
  },
  Xpressbees: {
    bg: "bg-yellow-500",
    text: "text-white",
    border: "border-yellow-400",
    initials: "XB",
  },
};

const getBrandStyle = (brandName: string) => {
  const key = Object.keys(BRAND_COLORS).find((k) =>
    brandName.toLowerCase().includes(k.toLowerCase()),
  );
  return key
    ? BRAND_COLORS[key]
    : {
        bg: "bg-teal-600",
        text: "text-white",
        border: "border-teal-500",
        initials: brandName.slice(0, 2).toUpperCase(),
      };
};

interface CourierFormState {
  senderName: string;
  senderCompany: string;
  senderPhone: string;
  senderAddress: string;
  senderArea: string;
  senderCity: string;
  senderState: string;
  receiverName: string;
  receiverCompany: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverArea: string;
  receiverCity: string;
  receiverState: string;
  senderPincode: string;
  receiverPincode: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  productType: string;
  serviceMode: string;
  tariffZone: string;
  tariffProductType: string;
  useTariff: boolean;
}

// AWB check status for manual entry
type AWBStatus =
  | "idle"
  | "in_stock"
  | "not_in_stock"
  | "duplicate_bill"
  | "duplicate_current";

interface POSBillingPageProps {
  onNavigate: (page: string) => void;
  editMode?: boolean;
}

export function POSBillingPage({
  onNavigate,
  editMode = false,
}: POSBillingPageProps) {
  const {
    products,
    customers,
    bills,
    awbSerials,
    updateAWBSerial,
    addBill,
    updateBill,
    invoices,
    updateInvoice,
    settings,
    updateSettings,
    activeCompanyId,
    activeCompany,
    currentUser,
  } = useAppStore();

  const [paperSize, setPaperSize] = useState<"A6" | "A5">("A6");

  // Edit mode: load bill ID from localStorage
  const editBillId = editMode
    ? localStorage.getItem("pos_edit_bill_id") || ""
    : "";
  const editBillData = editBillId
    ? bills.find((b) => b.id === editBillId)
    : undefined;
  // If this bill is invoiced and the invoice still exists, lock items
  const editBillIsInvoiced =
    editMode &&
    editBillData?.isInvoiced &&
    !!(
      editBillData?.invoiceId &&
      invoices.find((inv) => inv.id === editBillData?.invoiceId)
    );
  const [billNoOverride, setBillNoOverride] = useState("");
  const [editLinkedInvoiceDialog, setEditLinkedInvoiceDialog] = useState(false);
  const [customerNameDialog, setCustomerNameDialog] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [walkingName, setWalkingName] = useState("");
  const [walkingPhone, setWalkingPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<Bill["paymentMethod"]>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [date, setDate] = useState(getTodayStr());
  const [productSearch, setProductSearch] = useState("");
  const [slipItem, setSlipItem] = useState<BillItem | null>(null);
  // Sub-unit selection dialog
  const [subUnitDialog, setSubUnitDialog] = useState<{
    product: GeneralProduct;
  } | null>(null);
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>("parent");

  // Bill-level discount
  const [billDiscount, setBillDiscount] = useState(0);

  // Additional charges
  const [additionalCharges, setAdditionalCharges] = useState<
    AdditionalCharge[]
  >([]);

  // SKS own-brand: Domestic (D) or International (W)
  const [sksIsInternational, setSksIsInternational] = useState(false);

  // Manual AWB entry for partner brands
  const [manualAWBInput, setManualAWBInput] = useState("");
  const [awbStatus, setAWBStatus] = useState<AWBStatus>("idle");
  const [awbDuplicateInfo, setAWBDuplicateInfo] = useState<{
    senderName: string;
    date: string;
  } | null>(null);

  // AWB duplicate warning: stores the duplicate bill item if detected
  const [duplicateAWBWarning, setDuplicateAWBWarning] = useState<{
    awb: string;
    senderName: string;
    date: string;
  } | null>(null);

  // Load tariffs for dynamic pricing (shared across all companies)
  const tariffs = getTariffs(SHARED_DATA_ID);

  // Brands with at least one active tariff entry
  const brandsWithTariffs = new Set(
    tariffs.filter((t) => t.isActive).map((t) => t.brandName.toLowerCase()),
  );

  // Load customer-specific tariff overrides (shared across all companies)
  const customerTariffMap = getCustomerTariffMap(SHARED_DATA_ID);
  const customerTariffAssignments = selectedCustomer
    ? (customerTariffMap[selectedCustomer.id] ?? [])
    : [];

  // Helper: get customer override for a tariff (brand + productType + zone)
  const getCustomerTariffOverride = (
    brandName: string,
    productType: string,
    zone: string,
  ): number | null => {
    const assignment = customerTariffAssignments.find(
      (a) =>
        a.brandName.toLowerCase() === brandName.toLowerCase() &&
        a.productType.toLowerCase() === productType.toLowerCase() &&
        a.zone === zone,
    );
    return assignment ? assignment.customPrice : null;
  };

  // Pincode lookup state (receiver)
  const [pincodeData, setPincodeData] = useState<PincodeData | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  // Pincode lookup state (sender)
  const [senderPincodeData, setSenderPincodeData] =
    useState<PincodeData | null>(null);
  const [senderPincodeLoading, setSenderPincodeLoading] = useState(false);
  // Saved receivers
  const [savedReceivers, setSavedReceivers] = useState<ReceiverDetail[]>([]);
  const [showSavedReceivers, setShowSavedReceivers] = useState(false);

  // Courier brand selection and detail form
  const [selectedBrand, setSelectedBrand] = useState<CourierBrand | null>(null);
  // Walking customer courier: simplified mode state
  const [walkingManualAmount, setWalkingManualAmount] = useState("");
  const [walkingPincodeError, setWalkingPincodeError] = useState(false);
  const [showCourierFullDetails, setShowCourierFullDetails] = useState(false);
  const [selectedCourierProductId, setSelectedCourierProductId] =
    useState<string>("");
  const [courierForm, setCourierForm] = useState<CourierFormState>({
    senderName: "",
    senderCompany: "",
    senderPhone: "",
    senderAddress: "",
    senderArea: "",
    senderCity: "",
    senderState: "",
    receiverName: "",
    receiverCompany: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverArea: "",
    receiverCity: "",
    receiverState: "",
    senderPincode: "",
    receiverPincode: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    productType: "Parcel",
    serviceMode: "",
    tariffZone: "Within City",
    tariffProductType: "Express",
    useTariff: false,
  });

  // Pre-populate fields when editing an existing bill
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (!editMode || !editBillData) return;
    setBillNoOverride(editBillData.billNo);
    setDate(editBillData.date);
    setBillItems(editBillData.items);
    setNotes(editBillData.notes || "");
    setPaymentMethod(editBillData.paymentMethod);
    setAmountPaid(String(editBillData.amountPaid));
    setBillDiscount(editBillData.billDiscount || 0);
    if (editBillData.additionalCharges)
      setAdditionalCharges(editBillData.additionalCharges);
    if (editBillData.customerType === "registered") {
      const cust = customers.find((c) => c.id === editBillData.customerId);
      if (cust) setSelectedCustomer(cust);
    } else {
      setWalkingName(editBillData.customerName);
    }
  }, []);

  // Auto-fill sender details when customer is selected and a brand is chosen.
  useEffect(() => {
    if (!selectedBrand) {
      setPincodeData(null);
      return;
    }
    if (selectedCustomer) {
      setShowCourierFullDetails(true);
      const addr =
        (selectedCustomer as { address?: string; addressLine1?: string })
          .address ||
        (selectedCustomer as { addressLine1?: string }).addressLine1 ||
        "";
      // Load saved receivers for this customer
      setSavedReceivers(getSavedReceivers(selectedCustomer.id));
      setCourierForm((prev) => ({
        ...prev,
        senderName: prev.senderName || selectedCustomer.name,
        senderPhone: prev.senderPhone || selectedCustomer.phone,
        senderAddress: prev.senderAddress || addr,
      }));
    } else if (walkingName) {
      // Load saved receivers for walking customer
      const walkId = `walking_${walkingName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      setSavedReceivers(getSavedReceivers(walkId));
      setCourierForm((prev) => ({
        ...prev,
        senderName: prev.senderName || walkingName,
        senderPhone: prev.senderPhone || walkingPhone,
      }));
    }
  }, [selectedBrand, selectedCustomer, walkingName, walkingPhone]);

  // Filter customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.isActive &&
      c.customerType === "registered" &&
      (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)),
  );

  // Products by type
  const generalProducts = products.filter(
    (p) =>
      p.type === "general" &&
      (p as GeneralProduct).isActive &&
      (p as GeneralProduct).name
        .toLowerCase()
        .includes(productSearch.toLowerCase()),
  ) as GeneralProduct[];

  const courierBrands = products.filter(
    (p) =>
      p.type === "courier_awb" &&
      (p as CourierBrand).isActive &&
      (p as CourierBrand).brandName
        .toLowerCase()
        .includes(productSearch.toLowerCase()),
  ) as CourierBrand[];

  const xeroxProducts = products.filter(
    (p) =>
      p.type === "xerox" &&
      (p as XeroxProduct).isActive &&
      (p as XeroxProduct).name
        .toLowerCase()
        .includes(productSearch.toLowerCase()),
  ) as XeroxProduct[];

  const serviceProducts = products.filter(
    (p) =>
      p.type === "service" &&
      (p as ServiceProduct).isActive &&
      (p as ServiceProduct).name
        .toLowerCase()
        .includes(productSearch.toLowerCase()),
  ) as ServiceProduct[];

  // Courier price calculation helpers
  const calcVolumetricWeight = (l: string, w: string, h: string): number => {
    const lv = Number.parseFloat(l) || 0;
    const wv = Number.parseFloat(w) || 0;
    const hv = Number.parseFloat(h) || 0;
    if (!lv || !wv || !hv) return 0;
    return (lv * wv * hv) / 5000;
  };

  const calcChargeableWeight = (
    actualWeight: string,
    l: string,
    w: string,
    h: string,
  ): number => {
    const actual = Number.parseFloat(actualWeight) || 0;
    const volumetric = calcVolumetricWeight(l, w, h);
    return Math.max(actual, volumetric);
  };

  // Helper: find if an AWB serial has already been used in any saved bill
  const findDuplicateAWBInBills = useCallback(
    (awb: string): { senderName: string; date: string } | null => {
      for (const bill of bills) {
        for (const item of bill.items) {
          if (item.productType === "courier_awb" && item.awbSerial === awb) {
            return {
              senderName: item.senderName || bill.customerName || "Unknown",
              date: bill.date,
            };
          }
        }
      }
      return null;
    },
    [bills],
  );

  // Helper: find if AWB is already in the current unsaved bill items
  const findDuplicateAWBInCurrentBill = useCallback(
    (awb: string): boolean => {
      return billItems.some(
        (i) => i.productType === "courier_awb" && i.awbSerial === awb,
      );
    },
    [billItems],
  );

  // Check if AWB is in inventory stock for a brand
  const checkAWBInStock = useCallback(
    (brandId: string, awb: string): boolean => {
      return awbSerials.some(
        (r) => r.brandId === brandId && r.availableSerials.includes(awb),
      );
    },
    [awbSerials],
  );

  // Run AWB validation checks on input change
  const validateManualAWB = useCallback(
    (awb: string, brandId: string) => {
      if (!awb.trim()) {
        setAWBStatus("idle");
        setAWBDuplicateInfo(null);
        return;
      }

      // Check duplicate in saved bills
      const dup = findDuplicateAWBInBills(awb.trim());
      if (dup) {
        setAWBStatus("duplicate_bill");
        setAWBDuplicateInfo(dup);
        return;
      }

      // Check duplicate in current bill
      if (findDuplicateAWBInCurrentBill(awb.trim())) {
        setAWBStatus("duplicate_current");
        setAWBDuplicateInfo(null);
        return;
      }

      // Check in stock
      const inStock = checkAWBInStock(brandId, awb.trim());
      setAWBStatus(inStock ? "in_stock" : "not_in_stock");
      setAWBDuplicateInfo(null);
    },
    [findDuplicateAWBInBills, findDuplicateAWBInCurrentBill, checkAWBInStock],
  );

  const addCourierWithDetails = () => {
    if (!selectedBrand) return;

    // For walking customers, validate pincodes are entered
    if (!selectedCustomer) {
      if (!courierForm.senderPincode || !courierForm.receiverPincode) {
        setWalkingPincodeError(true);
        toast.error(
          "From Pincode and To Pincode are required for courier booking",
        );
        return;
      }
      setWalkingPincodeError(false);
    }

    if (!selectedCustomer && !courierForm.receiverName) {
      // Walking customer - receiver name is not strictly required but AWB must be set
    } else if (selectedCustomer && !courierForm.senderName) {
      toast.error("Sender name is required");
      return;
    }

    const isOwnBrand = (selectedBrand as CourierBrand).isOwnBrand === true;

    let awbSerial: string;

    if (isOwnBrand) {
      // Auto-generate SKS AWB number
      const serial = incrementSKSDailyCounter(activeCompanyId, date);
      awbSerial = buildSKSAWB(serial, date, sksIsInternational);
    } else {
      // Manual AWB entry for partner brands
      const trimmed = manualAWBInput.trim();
      if (!trimmed) {
        toast.error("Please enter or scan the AWB number");
        return;
      }

      // Block if duplicate in saved bills
      if (awbStatus === "duplicate_bill") {
        toast.error(
          `AWB ${trimmed} already used by ${awbDuplicateInfo?.senderName}. Cannot book.`,
        );
        return;
      }

      // Block if duplicate in current bill
      if (awbStatus === "duplicate_current") {
        toast.error(`AWB ${trimmed} is already in the current bill.`);
        return;
      }

      awbSerial = trimmed;
    }

    // Duplicate AWB check — check saved bills (extra safety for own-brand)
    if (isOwnBrand) {
      const dupInBills = findDuplicateAWBInBills(awbSerial);
      if (dupInBills) {
        setDuplicateAWBWarning({ awb: awbSerial, ...dupInBills });
        toast.error(`AWB ${awbSerial} already used! Duplicate entry blocked.`);
        return;
      }
      if (findDuplicateAWBInCurrentBill(awbSerial)) {
        toast.error(`AWB ${awbSerial} is already added in the current bill.`);
        return;
      }
    }

    const brandTransportMode =
      (selectedBrand as CourierBrand & { transportModes?: string })
        .transportModes ?? "Both";
    const autoMode =
      brandTransportMode === "Air"
        ? "Air"
        : brandTransportMode === "Surface"
          ? "Surface"
          : null;
    // For SKS own-brand: mode is Domestic or International based on toggle
    const mode = isOwnBrand
      ? sksIsInternational
        ? "International"
        : "Domestic"
      : (autoMode ??
        (courierForm.serviceMode ||
          (selectedBrand.serviceModes ?? [])[0] ||
          ""));
    const chargeableWt = calcChargeableWeight(
      courierForm.weight,
      courierForm.length,
      courierForm.width,
      courierForm.height,
    );

    // Determine effective product (sub-product if selected, else brand defaults)
    const cpList = (selectedBrand as CourierBrand).courierProducts ?? [];
    const selectedCourierProduct =
      cpList.find((p) => p.id === selectedCourierProductId) ?? null;

    // Determine price — prefer sub-product price if set, else brand price
    const basePrice =
      selectedCourierProduct && selectedCourierProduct.sellingPrice > 0
        ? selectedCourierProduct.sellingPrice
        : selectedBrand.sellingPrice;
    let unitPrice =
      walkingManualAmount && !selectedCustomer
        ? Number(walkingManualAmount)
        : basePrice;
    let totalPrice = unitPrice;

    const customerOverride =
      courierForm.useTariff && courierForm.weight
        ? getCustomerTariffOverride(
            selectedBrand.brandName,
            courierForm.tariffProductType,
            courierForm.tariffZone,
          )
        : null;

    if (customerOverride !== null) {
      const matchedTariff = tariffs.find(
        (t) =>
          t.brandName.toLowerCase() === selectedBrand.brandName.toLowerCase() &&
          t.productType.toLowerCase() ===
            courierForm.tariffProductType.toLowerCase() &&
          t.zone === courierForm.tariffZone &&
          t.isActive,
      );
      const gstRate = selectedBrand.gstRate || 0;
      if (matchedTariff?.isGSTInclusive && gstRate > 0) {
        // tariff price already includes GST
        unitPrice = customerOverride; // GST-inclusive unit price
        totalPrice = customerOverride; // GST-inclusive total
      } else if (gstRate > 0) {
        // tariff price excludes GST — add GST; unitPrice = totalPrice so editable shows all-in amount
        totalPrice =
          Math.round(customerOverride * (1 + gstRate / 100) * 100) / 100;
        unitPrice = totalPrice;
      } else {
        unitPrice = customerOverride;
        totalPrice = customerOverride;
      }
    } else if (courierForm.useTariff && courierForm.weight) {
      const tariffResult = calcTariffPrice(
        tariffs,
        selectedBrand.brandName,
        courierForm.tariffProductType,
        courierForm.tariffZone,
        Number(courierForm.weight),
      );
      if (tariffResult.price > 0) {
        const matchedTariff = tariffs.find(
          (t) =>
            t.brandName.toLowerCase() ===
              selectedBrand.brandName.toLowerCase() &&
            t.productType.toLowerCase() ===
              courierForm.tariffProductType.toLowerCase() &&
            t.zone === courierForm.tariffZone &&
            t.isActive,
        );
        const gstRate = selectedBrand.gstRate || 0;
        if (matchedTariff?.isGSTInclusive && gstRate > 0) {
          // tariff price already includes GST
          unitPrice = tariffResult.price; // GST-inclusive unit price
          totalPrice = tariffResult.price; // GST-inclusive total
        } else if (gstRate > 0) {
          // tariff price excludes GST — add GST; unitPrice = totalPrice so editable shows all-in amount
          totalPrice =
            Math.round(tariffResult.price * (1 + gstRate / 100) * 100) / 100;
          unitPrice = totalPrice;
        } else {
          unitPrice = tariffResult.price;
          totalPrice = tariffResult.price;
        }
      }
    }

    // Weight display
    const actualWtKg = Number.parseFloat(courierForm.weight) || 0;
    const volWtKg = calcVolumetricWeight(
      courierForm.length,
      courierForm.width,
      courierForm.height,
    );
    const displayWeightKg = Math.max(actualWtKg, volWtKg);
    const weightLabel =
      displayWeightKg > 0 ? `${displayWeightKg.toFixed(3)} kg` : "";

    const bookingDateFormatted = (() => {
      try {
        return new Date(date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } catch {
        return date;
      }
    })();

    const description = [
      courierForm.receiverName,
      courierForm.receiverPincode || "",
      weightLabel,
      bookingDateFormatted,
    ]
      .filter(Boolean)
      .join(" - ");

    // Calculate EDD
    const calculateEDD = (
      pType: string,
      rCity: string,
      rState: string,
    ): string | undefined => {
      const rules = getEDDRules().filter((r) => r.isActive);
      // Sort by specificity: city+productType > city > state+productType > zone+productType > zone
      const score = (r: (typeof rules)[0]) => {
        let s = 0;
        if (r.city && rCity.toLowerCase().includes(r.city.toLowerCase()))
          s += 4;
        if (r.state && rState.toLowerCase().includes(r.state.toLowerCase()))
          s += 2;
        if (
          r.productType &&
          pType.toLowerCase().includes(r.productType.toLowerCase())
        )
          s += 1;
        return s;
      };
      const matching = rules
        .filter((r) => {
          const cityMatch =
            !r.city || rCity.toLowerCase().includes(r.city.toLowerCase());
          const stateMatch =
            !r.state || rState.toLowerCase().includes(r.state.toLowerCase());
          const ptMatch =
            !r.productType ||
            pType.toLowerCase().includes(r.productType.toLowerCase());
          return cityMatch && stateMatch && ptMatch;
        })
        .sort((a, b) => score(b) - score(a));
      if (matching.length === 0) return undefined;
      const best = matching[0];
      const d = new Date();
      let days = best.deliveryDays;
      while (days > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) days--; // skip Sundays
      }
      return d.toISOString().split("T")[0];
    };

    const receiverCityVal =
      courierForm.receiverCity ||
      courierForm.receiverAddress?.split(",")[0]?.trim() ||
      "";
    const receiverStateVal =
      courierForm.receiverState ||
      courierForm.receiverAddress?.split(",").pop()?.trim() ||
      "";
    const productTypeForEDD =
      selectedCourierProduct?.productType || courierForm.productType || "";
    const computedEDD = calculateEDD(
      productTypeForEDD,
      receiverCityVal,
      receiverStateVal,
    );

    const item: BillItem = {
      id: generateId(),
      productId: selectedBrand.id,
      productType: "courier_awb",
      productName: awbSerial,
      description,
      quantity: 1,
      unit: "Piece",
      awbSerial,
      serviceMode: mode,
      brandName: selectedBrand.brandName,
      unitPrice,
      totalPrice,
      gstRate: selectedCourierProduct
        ? selectedCourierProduct.gstRate
        : selectedBrand.gstRate,
      senderName: courierForm.senderName,
      senderPhone: courierForm.senderPhone,
      senderAddress: courierForm.senderAddress,
      receiverName: courierForm.receiverName,
      receiverPhone: courierForm.receiverPhone,
      receiverAddress: courierForm.receiverAddress,
      receiverPincode: courierForm.receiverPincode,
      receiverCity: receiverCityVal,
      receiverState: receiverStateVal,
      eddDate: computedEDD,
      actualWeightKg: actualWtKg,
      volumetricWeightKg: volWtKg,
      chargeableWeightKg: chargeableWt,
    };

    // Save receiver details for future auto-fill
    if (courierForm.receiverName && courierForm.receiverPincode) {
      const customerId = selectedCustomer
        ? selectedCustomer.id
        : `walking_${(walkingName || "guest").toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      saveReceiver(customerId, {
        id: generateId(),
        name: courierForm.receiverName,
        companyName: courierForm.receiverCompany || "",
        phone: courierForm.receiverPhone,
        address: courierForm.receiverAddress,
        pincode: courierForm.receiverPincode,
        area: courierForm.receiverArea,
        city: courierForm.receiverCity,
        state: courierForm.receiverState,
        savedAt: new Date().toISOString(),
      });
    }

    // Consume AWB from inventory for partner brands if in stock
    if (!isOwnBrand) {
      if (awbStatus === "in_stock") {
        consumeAWBSerial(selectedBrand.id, awbSerial);
      }
      // If not in stock, allow override without consuming
    }

    setBillItems((prev) => [...prev, item]);
    setDuplicateAWBWarning(null);
    const productLabel = selectedCourierProduct
      ? ` – ${selectedCourierProduct.productType}`
      : "";
    toast.success(
      `AWB ${awbSerial} added — ${selectedBrand.brandName}${productLabel}`,
    );

    // Reset courier form
    setSelectedBrand(null);
    setSelectedCourierProductId("");
    setPincodeData(null);
    setPincodeLoading(false);
    setSenderPincodeData(null);
    setSenderPincodeLoading(false);
    setShowSavedReceivers(false);
    setSksIsInternational(false);
    setManualAWBInput("");
    setAWBStatus("idle");
    setAWBDuplicateInfo(null);
    setDuplicateAWBWarning(null);
    setCourierForm({
      senderName: "",
      senderCompany: "",
      senderPhone: "",
      senderAddress: "",
      senderArea: "",
      senderCity: "",
      senderState: "",
      receiverName: "",
      receiverCompany: "",
      receiverPhone: "",
      receiverAddress: "",
      receiverArea: "",
      receiverCity: "",
      receiverState: "",
      senderPincode: "",
      receiverPincode: "",
      weight: "",
      length: "",
      width: "",
      height: "",
      productType: "Parcel",
      serviceMode: "",
      tariffZone: "Within City",
      tariffProductType: "Express",
      useTariff: false,
    });
  };

  const consumeAWBSerial = (brandId: string, serial: string) => {
    const range = awbSerials.find(
      (r) => r.brandId === brandId && r.availableSerials.includes(serial),
    );
    if (!range) return;
    updateAWBSerial({
      ...range,
      availableSerials: range.availableSerials.filter((s) => s !== serial),
      usedSerials: [...range.usedSerials, serial],
    });
  };

  const addGeneralProduct = (product: GeneralProduct) => {
    const existing = billItems.find((i) => i.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + 1;
      let resolvedPrice: number;
      let tierLabel: string | undefined;
      if (product.pricingTiers?.length) {
        const r = resolveTierPrice(
          product.pricingTiers,
          newQty,
          product.sellingPrice,
        );
        resolvedPrice = r.price;
        tierLabel = r.tierName;
      } else if (product.usePricingSlabs && product.pricingSlabs?.length) {
        resolvedPrice = resolveSlabPrice(
          product.pricingSlabs,
          newQty,
          product.sellingPrice,
        );
      } else {
        resolvedPrice = existing.unitPrice;
      }
      // If sellingPrice excludes GST, convert to GST-inclusive for billing
      const gstMult2 =
        product.priceIncludesGST === false
          ? 1 + (product.gstRate || 0) / 100
          : 1;
      const gstInclusivePrice2 = resolvedPrice * gstMult2;
      setBillItems(
        billItems.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: newQty,
                unitPrice: gstInclusivePrice2,
                totalPrice:
                  newQty * gstInclusivePrice2 - (i.discountAmount || 0),
                ...(tierLabel ? { tierLabel } : {}),
              }
            : i,
        ),
      );
    } else {
      let resolvedPrice: number;
      let tierLabel: string | undefined;
      if (product.pricingTiers?.length) {
        const r = resolveTierPrice(
          product.pricingTiers,
          1,
          product.sellingPrice,
        );
        resolvedPrice = r.price;
        tierLabel = r.tierName;
      } else if (product.usePricingSlabs && product.pricingSlabs?.length) {
        resolvedPrice = resolveSlabPrice(
          product.pricingSlabs,
          1,
          product.sellingPrice,
        );
      } else {
        resolvedPrice = product.sellingPrice;
      }
      // If sellingPrice excludes GST, convert to GST-inclusive for billing
      const gstMult =
        product.priceIncludesGST === false
          ? 1 + (product.gstRate || 0) / 100
          : 1;
      const gstInclusivePrice = resolvedPrice * gstMult;
      const item: BillItem = {
        id: generateId(),
        productId: product.id,
        productType: "general",
        productName: product.name,
        quantity: 1,
        unit: product.unit,
        unitPrice: gstInclusivePrice,
        totalPrice: gstInclusivePrice,
        gstRate: product.gstRate,
        ...(tierLabel ? { tierLabel } : {}),
      };
      setBillItems([...billItems, item]);
    }
  };

  const addXeroxProduct = (product: XeroxProduct) => {
    const resolvedPrice =
      product.usePricingSlabs && product.pricingSlabs?.length
        ? resolveSlabPrice(product.pricingSlabs, 1, product.pricePerPage)
        : product.pricePerPage;
    const item: BillItem = {
      id: generateId(),
      productId: product.id,
      productType: "xerox",
      productName: product.name,
      quantity: 1,
      unit: "Page",
      unitPrice: resolvedPrice,
      totalPrice: resolvedPrice,
      gstRate: product.gstRate,
    };
    setBillItems([...billItems, item]);
  };

  const addServiceProduct = (product: ServiceProduct) => {
    const item: BillItem = {
      id: generateId(),
      productId: product.id,
      productType: "service",
      productName: product.name,
      quantity: 1,
      unit: "Service",
      unitPrice: product.price,
      totalPrice: product.price,
      gstRate: product.gstRate,
    };
    setBillItems([...billItems, item]);
  };

  const updateItemQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setBillItems(
      billItems.map((i) => {
        if (i.id !== itemId) return i;
        // Re-resolve tier/slab price if applicable
        let unitPrice = i.unitPrice;
        let tierLabel: string | undefined = undefined;
        const prod = products.find((p) => p.id === i.productId);
        if (prod) {
          if (prod.type === "general") {
            const gp = prod as GeneralProduct;
            if (gp.pricingTiers?.length) {
              const r = resolveTierPrice(gp.pricingTiers, qty, gp.sellingPrice);
              unitPrice = r.price;
              tierLabel = r.tierName;
            } else if (gp.usePricingSlabs && gp.pricingSlabs?.length) {
              unitPrice = resolveSlabPrice(
                gp.pricingSlabs,
                qty,
                gp.sellingPrice,
              );
            }
          } else if (prod.type === "xerox") {
            const xp = prod as XeroxProduct;
            if (xp.usePricingSlabs && xp.pricingSlabs?.length) {
              unitPrice = resolveSlabPrice(
                xp.pricingSlabs,
                qty,
                xp.pricePerPage,
              );
            }
          }
        }
        const rawTotal = qty * unitPrice;
        const discAmt =
          i.discountType === "percent"
            ? Math.round(rawTotal * ((i.discountValue || 0) / 100) * 100) / 100
            : i.discountAmount || 0;
        return {
          ...i,
          quantity: qty,
          unitPrice,
          ...(tierLabel !== undefined ? { tierLabel } : {}),
          discountAmount:
            i.discountType === "percent" ? discAmt : i.discountAmount,
          totalPrice:
            rawTotal -
            (i.discountType === "percent" ? discAmt : i.discountAmount || 0),
        };
      }),
    );
  };

  const updateItemDescription = (itemId: string, desc: string) => {
    setBillItems(
      billItems.map((i) => (i.id === itemId ? { ...i, description: desc } : i)),
    );
  };

  // Per-item discount helper
  const updateItemDiscount = (
    itemId: string,
    type: "amount" | "percent",
    value: number,
  ) => {
    setBillItems(
      billItems.map((i) => {
        if (i.id !== itemId) return i;
        const rawTotal = i.quantity * i.unitPrice;
        const discAmt =
          type === "percent"
            ? Math.round(rawTotal * (value / 100) * 100) / 100
            : Math.min(value, rawTotal);
        return {
          ...i,
          discountType: type,
          discountValue: value,
          discountAmount: discAmt,
          totalPrice: Math.max(0, rawTotal - discAmt),
        };
      }),
    );
  };

  const removeItem = (itemId: string) => {
    const item = billItems.find((i) => i.id === itemId);
    if (item?.productType === "courier_awb" && item.awbSerial) {
      const brand = products.find((p) => p.id === item.productId) as
        | CourierBrand
        | undefined;
      const isOwn = brand?.isOwnBrand === true;
      if (!isOwn) {
        const range = awbSerials.find(
          (r) =>
            r.brandId === item.productId &&
            r.usedSerials.includes(item.awbSerial!),
        );
        if (range) {
          updateAWBSerial({
            ...range,
            usedSerials: range.usedSerials.filter((s) => s !== item.awbSerial),
            availableSerials: [...range.availableSerials, item.awbSerial!],
          });
        }
      }
    }
    setBillItems(billItems.filter((i) => i.id !== itemId));
  };

  // ─── Additional Charges helpers ────────────────────────────────────────────
  const addPresetCharge = (label: string) => {
    setAdditionalCharges((prev) => [
      ...prev,
      { id: generateId(), label, amount: 0, showInBill: true },
    ]);
  };

  const updateCharge = (id: string, updates: Partial<AdditionalCharge>) => {
    setAdditionalCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const removeCharge = (id: string) => {
    setAdditionalCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // ─── Bill totals ────────────────────────────────────────────────────────────
  const subtotalBeforeDiscounts = billItems.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );
  const totalItemDiscounts = billItems.reduce(
    (sum, i) => sum + (i.discountAmount || 0),
    0,
  );
  const netItemsTotal = subtotalBeforeDiscounts - totalItemDiscounts;
  const visibleChargesTotal = additionalCharges
    .filter((c) => c.showInBill)
    .reduce((sum, c) => sum + c.amount, 0);
  const hiddenChargesTotal = additionalCharges
    .filter((c) => !c.showInBill)
    .reduce((sum, c) => sum + c.amount, 0);
  // Total includes ALL charges (visible + hidden). Hidden charges get distributed
  // into item prices at save time, but the grand total shown must reflect them.
  const total = Math.max(
    0,
    netItemsTotal + visibleChargesTotal + hiddenChargesTotal - billDiscount,
  );
  const paid = Number(amountPaid) || 0;
  const balance = total - paid;

  const handleSaveBill = () => {
    if (!selectedCustomer && !walkingName) {
      setCustomerNameDialog(true);
      return;
    }
    if (billItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (!settings) {
      toast.error("Settings not loaded");
      return;
    }

    // Distribute hidden charges proportionally into item totalPrice
    const hiddenTotal = additionalCharges
      .filter((c) => !c.showInBill)
      .reduce((sum, c) => sum + c.amount, 0);

    let finalItems = billItems;
    if (hiddenTotal !== 0 && netItemsTotal > 0) {
      finalItems = billItems.map((item) => {
        const share = item.totalPrice / netItemsTotal;
        const addedAmount = Math.round(hiddenTotal * share * 100) / 100;
        return {
          ...item,
          totalPrice: Math.max(0, item.totalPrice + addedAmount),
        };
      });
    }

    const finalSubtotal = finalItems.reduce((sum, i) => {
      const rate = i.gstRate || 0;
      return sum + (i.totalPrice * 100) / (100 + rate);
    }, 0);
    const finalTaxAmount = finalItems.reduce((sum, i) => {
      const rate = i.gstRate || 0;
      return sum + (i.totalPrice * rate) / (100 + rate);
    }, 0);
    const visibleCharges = additionalCharges.filter((c) => c.showInBill);
    const visibleTotal = visibleCharges.reduce((sum, c) => sum + c.amount, 0);
    const finalTotal = Math.max(0, finalSubtotal + visibleTotal - billDiscount);

    const billNo =
      editMode && billNoOverride
        ? billNoOverride
        : generateBillNo(settings.billPrefix, settings.billSeq);
    const customerId =
      editMode && editBillData
        ? editBillData.customerId
        : selectedCustomer?.id || `walking_${generateId()}`;
    const customerName =
      selectedCustomer?.name || walkingName || "Walking Customer";
    const customerType = selectedCustomer
      ? selectedCustomer.customerType
      : "walking";

    const bill: Bill = {
      id: generateId(),
      companyId: activeCompanyId,
      billNo,
      customerId,
      customerName,
      customerType,
      date,
      items: finalItems,
      subtotal: finalSubtotal,
      taxAmount: finalTaxAmount,
      total: finalTotal,
      billDiscount: billDiscount > 0 ? billDiscount : undefined,
      additionalCharges: visibleCharges.length > 0 ? visibleCharges : undefined,
      paymentMethod,
      paymentStatus:
        paid >= finalTotal ? "paid" : paid > 0 ? "partial" : "pending",
      amountPaid: paid,
      balanceDue: Math.max(0, finalTotal - paid),
      notes: notes || undefined,
      isInvoiced: false,
      createdBy: currentUser?.username,
    };

    if (editMode && editBillData) {
      updateBill({ ...bill, id: editBillData.id, billNo: editBillData.billNo });
      // Check for linked invoice
      const linked = invoices.find((inv) =>
        inv.billIds?.includes(editBillData.id),
      );
      if (linked) {
        setEditLinkedInvoiceDialog(true);
        // Store the updated bill for use in the invoice update dialog
        localStorage.setItem(
          "pos_pending_invoice_update",
          JSON.stringify({
            invoiceId: linked.id,
            grandTotal: finalTotal,
            paymentStatus: bill.paymentStatus,
            amountPaid: paid,
          }),
        );
      }
      toast.success(`Bill ${editBillData.billNo} updated successfully!`);
      localStorage.removeItem("pos_edit_bill_id");
      onNavigate("bills");
    } else {
      addBill(bill);
      updateSettings({ ...settings, billSeq: settings.billSeq + 1 });
      setSettings(activeCompanyId, {
        ...settings,
        billSeq: settings.billSeq + 1,
      });
      toast.success(`Bill ${billNo} saved successfully!`);
      // Reset
      setBillItems([]);
      setSelectedCustomer(null);
      setWalkingName("");
      setWalkingPhone("");
      setNotes("");
      setAmountPaid("");
      setPaymentMethod("cash");
      setBillDiscount(0);
      setAdditionalCharges([]);
    }
  };

  const customerName = selectedCustomer?.name || walkingName || "";

  // ─── Print POS Receipt ──────────────────────────────────────────────────────
  const printPOSBill = (mode: "print" | "pdf") => {
    if (billItems.length === 0) {
      toast.error("No items in the bill to print");
      return;
    }
    const companyName = activeCompany?.name || "SKS Global Export";
    const companyAddress = activeCompany?.address || "";
    const companyPhone = activeCompany?.phone || "";
    const custName =
      selectedCustomer?.name || walkingName || "Walking Customer";
    const billNo = settings
      ? generateBillNo(settings.billPrefix, settings.billSeq)
      : "DRAFT";
    const billDate = date;

    const isA6 = paperSize === "A6";
    const pageSize = isA6 ? "105mm 148mm" : "148mm 210mm";
    const fontSize = isA6 ? "9.5px" : "11px";
    const margin = isA6 ? "5mm" : "8mm";

    const fmt = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(n);

    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    const itemRows = billItems
      .map(
        (item, idx) => `
      <tr>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;">${idx + 1}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;max-width:120px;word-wrap:break-word;">
          ${item.productName}
          ${item.description ? `<br/><span style="font-size:0.85em;color:#666;">${item.description}</span>` : ""}
        </td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.unitPrice)}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${fmt(item.totalPrice)}</td>
      </tr>`,
      )
      .join("");

    const chargeRows = additionalCharges
      .filter((c) => c.showInBill && c.amount !== 0)
      .map(
        (c) => `
      <tr>
        <td colspan="4" style="padding:2px 4px;text-align:right;color:#555;font-size:0.9em;">${c.label}:</td>
        <td style="padding:2px 4px;text-align:right;">${c.amount < 0 ? "–" : "+"}${fmt(Math.abs(c.amount))}</td>
      </tr>`,
      )
      .join("");

    const discountRow =
      totalItemDiscounts > 0
        ? `<tr><td colspan="4" style="padding:2px 4px;text-align:right;color:#d97706;font-size:0.9em;">Discounts:</td><td style="padding:2px 4px;text-align:right;color:#d97706;">–${fmt(totalItemDiscounts)}</td></tr>`
        : "";

    const billDiscountRow =
      billDiscount > 0
        ? `<tr><td colspan="4" style="padding:2px 4px;text-align:right;color:#d97706;font-size:0.9em;">Bill Discount:</td><td style="padding:2px 4px;text-align:right;color:#d97706;">–${fmt(billDiscount)}</td></tr>`
        : "";

    const pdfNote =
      mode === "pdf"
        ? `<p style="font-size:0.75em;color:#888;text-align:center;margin-top:4px;font-style:italic;">In print dialog, choose "Save as PDF"</p>`
        : "";

    const companyLogoUrl = activeCompany?.logoUrl || "";
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Bill ${billNo}</title>
<style>
  @page { size: ${pageSize}; margin: ${margin}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: ${fontSize}; color: #111; background: #fff; }
  .header { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px; }
  .logo { height: 80px; object-fit: contain; }
  h1 { font-size: 1.15em; font-weight: 700; text-align: center; margin-bottom: 2px; }
  .addr { text-align: center; color: #444; font-size: 0.88em; line-height: 1.4; }
  .divider { border: none; border-top: 1px dashed #aaa; margin: 5px 0; }
  .bill-meta { display: flex; justify-content: space-between; font-size: 0.88em; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #f3f4f6; font-size: 0.85em; padding: 3px 4px; text-align: left; border-bottom: 2px solid #ddd; }
  th.right { text-align: right; }
  th.center { text-align: center; }
  .total-row td { font-weight: 700; font-size: 1.05em; border-top: 1.5px solid #111; padding: 4px; }
  .total-row td:last-child { text-align: right; }
  .paid-row td { color: #16a34a; font-size: 0.92em; padding: 2px 4px; }
  .paid-row td:last-child { text-align: right; }
  .balance-row td { color: #dc2626; font-size: 0.92em; padding: 2px 4px; }
  .balance-row td:last-child { text-align: right; }
  .footer-note { text-align: center; font-size: 0.8em; color: #666; margin-top: 6px; }
</style>
</head>
<body>
  ${companyLogoUrl ? `<div class="header"><img src="${companyLogoUrl}" class="logo" alt="Logo"/></div>` : ""}
  <h1>${companyName}</h1>
  ${companyAddress ? `<p class="addr">${companyAddress}</p>` : ""}
  ${companyPhone ? `<p class="addr">Ph: ${companyPhone}</p>` : ""}
  <hr class="divider"/>
  <div class="bill-meta">
    <span><strong>Bill No:</strong> ${billNo}</span>
    <span><strong>Date:</strong> ${fmtDate(billDate)}</span>
  </div>
  <div class="bill-meta">
    <span><strong>Customer:</strong> ${custName}</span>
    <span><strong>Method:</strong> ${paymentMethod.toUpperCase()}</span>
  </div>
  <hr class="divider"/>
  <table>
    <thead>
      <tr>
        <th style="width:18px;">#</th>
        <th>Item</th>
        <th class="center" style="width:30px;">Qty</th>
        <th class="right" style="width:55px;">Rate</th>
        <th class="right" style="width:60px;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${discountRow}
      ${chargeRows}
      ${billDiscountRow}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4">Grand Total</td>
        <td>${fmt(total)}</td>
      </tr>
      <tr class="paid-row">
        <td colspan="4">Amount Paid</td>
        <td>${fmt(paid)}</td>
      </tr>
      ${balance > 0 ? `<tr class="balance-row"><td colspan="4">Balance Due</td><td>${fmt(Math.max(0, balance))}</td></tr>` : ""}
    </tfoot>
  </table>
  ${notes ? `<hr class="divider"/><p style="font-size:0.85em;color:#555;margin-top:3px;"><em>Note: ${notes}</em></p>` : ""}
  <p class="footer-note">Thank you for your business!</p>
  ${pdfNote}
  <script>window.onload = function(){ window.focus(); window.print(); };<\/script>
</body>
</html>`;

    const w = window.open(
      "",
      "_blank",
      isA6 ? "width=420,height=600" : "width=600,height=800",
    );
    if (!w) {
      toast.error(
        "Popup blocked! Please allow popups for this site and try again.",
      );
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left: Products */}
      <div className="lg:col-span-2 space-y-4">
        {/* Customer Selection */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Customer
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Label className="text-xs mb-1 block">
                Search Registered Customer
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerSearch(true);
                  }}
                  onFocus={() => setShowCustomerSearch(true)}
                  placeholder="Search customer..."
                  className="pl-9 text-sm"
                  data-ocid="pos.customer.search_input"
                />
              </div>
              {showCustomerSearch && customerSearch && (
                <div className="absolute z-30 w-full bg-white rounded-lg border border-border shadow-card-lg mt-1 max-h-40 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No customers found
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(c.name);
                          setShowCustomerSearch(false);
                        }}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {c.phone}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Walking Customer</Label>
              <div className="flex gap-2">
                <Input
                  value={walkingName}
                  onChange={(e) => {
                    setWalkingName(e.target.value);
                    if (e.target.value) setSelectedCustomer(null);
                  }}
                  placeholder="Name"
                  className="text-sm"
                  disabled={!!selectedCustomer}
                  data-ocid="pos.walking.input"
                />
                <Input
                  value={walkingPhone}
                  onChange={(e) => setWalkingPhone(e.target.value)}
                  placeholder="Phone"
                  className="text-sm w-32"
                  disabled={!!selectedCustomer}
                />
              </div>
            </div>
          </div>
          {customerName && (
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs bg-primary/10 text-primary"
              >
                <User className="w-3 h-3 mr-1" />
                {customerName}
              </Badge>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedCustomer(null);
                  setWalkingName("");
                  setCustomerSearch("");
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Product Search & Tabs */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-9 text-sm"
                data-ocid="pos.product.search_input"
              />
            </div>
          </div>

          <Tabs defaultValue="general">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="general" className="text-xs">
                <Package className="w-3 h-3 mr-1" /> General
              </TabsTrigger>
              <TabsTrigger value="courier" className="text-xs">
                <Truck className="w-3 h-3 mr-1" /> Courier
              </TabsTrigger>
              <TabsTrigger value="xerox" className="text-xs">
                Xerox
              </TabsTrigger>
              <TabsTrigger value="service" className="text-xs">
                Services
              </TabsTrigger>
            </TabsList>

            {/* General Products */}
            <TabsContent value="general" className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {generalProducts.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      if (p.productSubUnit1) {
                        setSubUnitDialog({ product: p });
                        setSelectedSubUnit("parent");
                      } else {
                        addGeneralProduct(p);
                      }
                    }}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-semibold text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.category}
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(p.sellingPrice)}/{p.unit}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-0.5",
                        p.currentStock <= p.minStockAlert
                          ? "text-red-500"
                          : "text-muted-foreground",
                      )}
                    >
                      Stock: {p.currentStock} {p.unit}
                    </p>
                  </button>
                ))}
                {generalProducts.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-muted-foreground text-sm">
                    No products found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Courier Brands */}
            <TabsContent value="courier" className="mt-3">
              <div className="space-y-4">
                {/* Brand Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                  {courierBrands.map((brand) => {
                    const style = getBrandStyle(brand.brandName);
                    const isSelected = selectedBrand?.id === brand.id;
                    const isOwn = brand.isOwnBrand === true;
                    return (
                      <button
                        type="button"
                        key={brand.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBrand(null);
                            setSelectedCourierProductId("");
                            setPincodeData(null);
                            setManualAWBInput("");
                            setAWBStatus("idle");
                            setAWBDuplicateInfo(null);
                          } else {
                            setSelectedBrand(brand);
                            setSelectedCourierProductId("");
                            setManualAWBInput("");
                            setAWBStatus("idle");
                            setAWBDuplicateInfo(null);
                            const tm =
                              (
                                brand as CourierBrand & {
                                  transportModes?: string;
                                }
                              ).transportModes ?? "Both";
                            const autoServiceMode =
                              tm === "Air"
                                ? "Air"
                                : tm === "Surface"
                                  ? "Surface"
                                  : (brand.serviceModes ?? [])[0] || "";
                            const senderName =
                              selectedCustomer?.name || walkingName || "";
                            const senderPhone =
                              selectedCustomer?.phone || walkingPhone || "";
                            setCourierForm((prev) => ({
                              ...prev,
                              serviceMode: autoServiceMode,
                              senderName: prev.senderName || senderName,
                              senderPhone: prev.senderPhone || senderPhone,
                            }));
                          }
                        }}
                        className={cn(
                          "text-left p-3 rounded-xl border-2 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                            : "border-border hover:border-primary/50 hover:bg-muted/30",
                        )}
                      >
                        {/* Brand logo circle */}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                              style.bg,
                              style.text,
                            )}
                          >
                            {style.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">
                              {brand.brandName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {brand.category ? `${brand.category} • ` : ""}
                              {brand.productType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(brand.sellingPrice)}
                          </span>
                          {isOwn ? (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                              Auto
                            </span>
                          ) : (
                            <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              Manual AWB
                            </span>
                          )}
                        </div>
                        {brand.brandSubtitle && (
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            {brand.brandSubtitle}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {courierBrands.length === 0 && (
                    <div className="col-span-3 text-center py-6 text-muted-foreground text-sm">
                      No courier brands found
                    </div>
                  )}
                </div>

                {/* Courier Detail Form — shown when a brand is selected */}
                {selectedBrand &&
                  (() => {
                    const isOwnBrand =
                      (selectedBrand as CourierBrand).isOwnBrand === true;
                    const style = getBrandStyle(selectedBrand.brandName);

                    // Preview the SKS AWB that will be generated
                    const { dateToDdMmYy } = (() => {
                      const dd = String(new Date(date).getDate()).padStart(
                        2,
                        "0",
                      );
                      const mm = String(new Date(date).getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const yy = String(new Date(date).getFullYear()).slice(-2);
                      return { dateToDdMmYy: `${dd}${mm}${yy}` };
                    })();
                    const { getSKSDailyCounter } = (() => {
                      const key = `sks_awb_daily_${activeCompanyId}_${dateToDdMmYy}`;
                      const val = localStorage.getItem(key);
                      const counter = val ? Number.parseInt(val, 10) : 0;
                      return { getSKSDailyCounter: counter };
                    })();
                    const previewAWB = isOwnBrand
                      ? `SKS${String(getSKSDailyCounter + 1).padStart(3, "0")}${sksIsInternational ? "W" : "D"}${dateToDdMmYy}`
                      : null;

                    // Determine if Add to Bill should be disabled
                    const canAdd = isOwnBrand
                      ? true
                      : awbStatus !== "idle" &&
                        awbStatus !== "duplicate_bill" &&
                        awbStatus !== "duplicate_current" &&
                        manualAWBInput.trim() !== "";

                    return (
                      <div className="border border-primary/30 rounded-xl p-4 bg-primary/2 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                style.bg,
                                style.text,
                              )}
                            >
                              {style.initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold">
                                {selectedBrand.brandName}
                              </p>
                              {(selectedBrand as CourierBrand).brandSubtitle ? (
                                <p className="text-xs text-primary font-medium">
                                  {
                                    (selectedBrand as CourierBrand)
                                      .brandSubtitle
                                  }
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Fill shipment details
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBrand(null);
                              setSelectedCourierProductId("");
                              setDuplicateAWBWarning(null);
                              setManualAWBInput("");
                              setAWBStatus("idle");
                              setAWBDuplicateInfo(null);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* ── PRODUCT TYPE SELECTOR (when brand has courierProducts) ── */}
                        {(() => {
                          const cpList =
                            (selectedBrand as CourierBrand).courierProducts ??
                            [];
                          if (cpList.length === 0) return null;
                          return (
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Product Type
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                {cpList
                                  .filter((cp) => cp.isActive !== false)
                                  .map((cp) => (
                                    <button
                                      key={cp.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCourierProductId(cp.id);
                                        // Auto-set service mode from product
                                        const tm = cp.transportModes ?? "Both";
                                        const autoMode =
                                          tm === "Air"
                                            ? "Air"
                                            : tm === "Surface"
                                              ? "Surface"
                                              : (cp.serviceModes ?? [])[0] ||
                                                "";
                                        setCourierForm((prev) => ({
                                          ...prev,
                                          productType: cp.productType,
                                          serviceMode:
                                            prev.serviceMode || autoMode,
                                        }));
                                      }}
                                      className={cn(
                                        "text-left px-3 py-2 rounded-lg border-2 transition-all",
                                        selectedCourierProductId === cp.id
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/50 hover:bg-muted/20",
                                      )}
                                    >
                                      <p className="text-xs font-semibold">
                                        {cp.productType}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        <span
                                          className={`text-[10px] px-1 py-0.5 rounded font-medium ${cp.category === "Courier" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}
                                        >
                                          {cp.category}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {cp.transportModes}
                                        </span>
                                        {cp.serialPrefix && (
                                          <span className="text-[10px] font-mono bg-muted px-1 rounded border">
                                            {cp.serialPrefix}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs font-bold text-primary mt-1">
                                        {formatCurrency(
                                          cp.sellingPrice > 0
                                            ? cp.sellingPrice
                                            : selectedBrand.sellingPrice,
                                        )}
                                      </p>
                                    </button>
                                  ))}
                              </div>
                              {selectedCourierProductId &&
                                (() => {
                                  const cp = cpList.find(
                                    (p) => p.id === selectedCourierProductId,
                                  );
                                  if (!cp?.serialPrefix) return null;
                                  return (
                                    <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                                      AWB prefix for this product:{" "}
                                      <span className="font-mono font-semibold">
                                        {cp.serialPrefix}
                                      </span>
                                    </p>
                                  );
                                })()}
                            </div>
                          );
                        })()}

                        {/* ── MANUAL AWB ENTRY (partner brands only) ── */}
                        {!isOwnBrand && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              AWB Number *
                            </Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  value={manualAWBInput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setManualAWBInput(val);
                                    validateManualAWB(val, selectedBrand.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      validateManualAWB(
                                        manualAWBInput,
                                        selectedBrand.id,
                                      );
                                    }
                                  }}
                                  placeholder="Scan or enter AWB number..."
                                  className="text-sm font-mono pr-8"
                                  autoFocus
                                  data-ocid="courier.awb.input"
                                />
                                {awbStatus !== "idle" && (
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    {awbStatus === "in_stock" && (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    )}
                                    {awbStatus === "not_in_stock" && (
                                      <AlertCircle className="w-4 h-4 text-amber-500" />
                                    )}
                                    {(awbStatus === "duplicate_bill" ||
                                      awbStatus === "duplicate_current") && (
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* AWB status feedback */}
                            {awbStatus === "in_stock" && (
                              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                AWB in stock — ready to book
                              </div>
                            )}
                            {awbStatus === "not_in_stock" && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Not in inventory — will add anyway (override
                                mode)
                              </div>
                            )}
                            {awbStatus === "duplicate_current" && (
                              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                AWB already added in current bill
                              </div>
                            )}
                            {awbStatus === "duplicate_bill" &&
                              awbDuplicateInfo && (
                                <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                  <span>
                                    Already booked by{" "}
                                    <strong>
                                      {awbDuplicateInfo.senderName}
                                    </strong>{" "}
                                    on{" "}
                                    <strong>
                                      {new Date(
                                        awbDuplicateInfo.date,
                                      ).toLocaleDateString("en-IN")}
                                    </strong>
                                    . Cannot use this AWB.
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Duplicate AWB Warning (own brand) */}
                        {duplicateAWBWarning && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2.5">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-bold text-red-700">
                                Duplicate AWB — {duplicateAWBWarning.awb}
                              </p>
                              <p className="text-red-600 mt-0.5">
                                Previously used by{" "}
                                <span className="font-semibold">
                                  {duplicateAWBWarning.senderName}
                                </span>{" "}
                                on{" "}
                                <span className="font-semibold">
                                  {new Date(
                                    duplicateAWBWarning.date,
                                  ).toLocaleDateString("en-IN")}
                                </span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* SKS Own Brand: Domestic / International Toggle */}
                        {isOwnBrand && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                              Shipment Type
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSksIsInternational(false)}
                                className={cn(
                                  "flex-1 h-9 rounded-lg border-2 text-xs font-semibold transition-all",
                                  !sksIsInternational
                                    ? "border-blue-500 bg-blue-500 text-white"
                                    : "border-border bg-white text-muted-foreground hover:border-blue-300",
                                )}
                              >
                                🏠 Domestic (D)
                              </button>
                              <button
                                type="button"
                                onClick={() => setSksIsInternational(true)}
                                className={cn(
                                  "flex-1 h-9 rounded-lg border-2 text-xs font-semibold transition-all",
                                  sksIsInternational
                                    ? "border-indigo-500 bg-indigo-500 text-white"
                                    : "border-border bg-white text-muted-foreground hover:border-indigo-300",
                                )}
                              >
                                ✈ International (W)
                              </button>
                            </div>
                            {previewAWB && (
                              <div className="flex items-center justify-between text-xs bg-white border border-blue-200 rounded-lg px-3 py-1.5">
                                <span className="text-muted-foreground">
                                  AWB Preview
                                </span>
                                <span className="font-mono font-bold text-blue-700 text-sm">
                                  {previewAWB}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pincode Row — always visible */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label
                                htmlFor="courier-sender-pincode"
                                className="text-xs font-medium text-muted-foreground block mb-1"
                              >
                                From Pincode (Sender){" "}
                                {!selectedCustomer && (
                                  <span className="text-destructive">*</span>
                                )}
                              </label>
                              <div className="relative">
                                <input
                                  id="courier-sender-pincode"
                                  className={`border rounded px-2 py-1.5 text-sm w-full ${walkingPincodeError && !courierForm.senderPincode ? "border-red-500" : "border-border"}`}
                                  placeholder="Sender pincode"
                                  maxLength={6}
                                  value={courierForm.senderPincode}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setCourierForm((p) => ({
                                      ...p,
                                      senderPincode: val,
                                    }));
                                    if (val.length === 6) {
                                      setSenderPincodeLoading(true);
                                      fetchPincodeData(val).then((data) => {
                                        setSenderPincodeData(data);
                                        setSenderPincodeLoading(false);
                                        if (data) {
                                          setCourierForm((prev) => ({
                                            ...prev,
                                            senderArea:
                                              prev.senderArea ||
                                              (data.postOffices.length === 1
                                                ? data.area
                                                : ""),
                                            senderCity:
                                              prev.senderCity || data.city,
                                            senderState:
                                              prev.senderState || data.state,
                                          }));
                                        }
                                      });
                                    } else {
                                      setSenderPincodeData(null);
                                    }
                                  }}
                                  data-ocid="courier.sender_pincode.input"
                                />
                                {senderPincodeLoading && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <svg
                                      className="animate-spin w-3 h-3 text-muted-foreground"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      aria-label="Loading"
                                      role="img"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </div>
                              {senderPincodeData && !senderPincodeLoading && (
                                <div className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1 mt-1 text-blue-700">
                                  {senderPincodeData.postOffices.length > 1 ? (
                                    <select
                                      className="w-full text-xs bg-transparent border-none outline-none"
                                      value={courierForm.senderArea}
                                      onChange={(e) => {
                                        const po =
                                          senderPincodeData.postOffices.find(
                                            (p) => p.name === e.target.value,
                                          );
                                        setCourierForm((prev) => ({
                                          ...prev,
                                          senderArea: e.target.value,
                                          senderCity:
                                            po?.district || prev.senderCity,
                                          senderState:
                                            po?.state || prev.senderState,
                                        }));
                                      }}
                                    >
                                      <option value="">Select Area...</option>
                                      {senderPincodeData.postOffices.map(
                                        (po) => (
                                          <option key={po.name} value={po.name}>
                                            {po.name}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  ) : (
                                    <span>
                                      {senderPincodeData.area},{" "}
                                      {senderPincodeData.city},{" "}
                                      {senderPincodeData.state}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <label
                                htmlFor="courier-receiver-pincode"
                                className="text-xs font-medium text-muted-foreground block mb-1"
                              >
                                To Pincode (Receiver){" "}
                                {!selectedCustomer && (
                                  <span className="text-destructive">*</span>
                                )}
                              </label>
                              <div>
                                <input
                                  id="courier-receiver-pincode"
                                  className={`border rounded px-2 py-1.5 text-sm w-full ${walkingPincodeError && !courierForm.receiverPincode ? "border-red-500" : "border-border"}`}
                                  placeholder="Receiver pincode"
                                  maxLength={6}
                                  value={courierForm.receiverPincode}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setCourierForm((p) => ({
                                      ...p,
                                      receiverPincode: val,
                                    }));
                                    if (val.length === 6) {
                                      setPincodeLoading(true);
                                      fetchPincodeData(val).then((data) => {
                                        setPincodeData(data);
                                        setPincodeLoading(false);
                                        if (data) {
                                          setCourierForm((prev) => ({
                                            ...prev,
                                            receiverArea:
                                              prev.receiverArea ||
                                              (data.postOffices.length === 1
                                                ? data.area
                                                : ""),
                                            receiverCity:
                                              prev.receiverCity || data.city,
                                            receiverState:
                                              prev.receiverState || data.state,
                                            receiverAddress:
                                              prev.receiverAddress ||
                                              formatPincodeAddress(data),
                                          }));
                                        }
                                      });
                                    } else {
                                      setPincodeData(null);
                                    }
                                  }}
                                  data-ocid="courier.receiver_pincode.input"
                                />
                              </div>
                              {/* Receiver pincode lookup result — placed inside receiver column */}
                              {pincodeLoading && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                  <svg
                                    className="animate-spin w-3 h-3"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-label="Loading"
                                    role="img"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                  </svg>
                                  Looking up pincode...
                                </div>
                              )}
                              {pincodeData && !pincodeLoading && (
                                <div className="text-xs bg-green-50 border border-green-200 rounded px-2 py-1 mt-1 text-green-700">
                                  {pincodeData.postOffices.length > 1 ? (
                                    <div>
                                      <select
                                        className="w-full text-xs bg-transparent border-none outline-none"
                                        value={courierForm.receiverArea}
                                        onChange={(e) => {
                                          const po =
                                            pincodeData.postOffices.find(
                                              (p) => p.name === e.target.value,
                                            );
                                          setCourierForm((prev) => ({
                                            ...prev,
                                            receiverArea: e.target.value,
                                            receiverCity:
                                              po?.district || prev.receiverCity,
                                            receiverState:
                                              po?.state || prev.receiverState,
                                          }));
                                        }}
                                      >
                                        <option value="">Select Area...</option>
                                        {pincodeData.postOffices.map((po) => (
                                          <option key={po.name} value={po.name}>
                                            {po.name}
                                          </option>
                                        ))}
                                      </select>
                                      <span className="text-green-600 text-[10px]">
                                        {pincodeData.city}, {pincodeData.state}
                                      </span>
                                    </div>
                                  ) : (
                                    <span>
                                      {pincodeData.area}, {pincodeData.city},{" "}
                                      {pincodeData.state}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    {pincodeData.isMetro ? (
                                      <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                        Metro
                                      </span>
                                    ) : (
                                      <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                        Non-Metro
                                      </span>
                                    )}
                                    {(() => {
                                      const s = pincodeData.state.toLowerCase();
                                      let zone: string | null = null;
                                      if (
                                        s.includes("himachal") ||
                                        s.includes("jammu") ||
                                        s.includes("kashmir")
                                      )
                                        zone = "North Zone";
                                      else if (
                                        s.includes("andaman") ||
                                        s.includes("arunachal") ||
                                        s.includes("assam") ||
                                        s.includes("meghalaya") ||
                                        s.includes("manipur") ||
                                        s.includes("mizoram") ||
                                        s.includes("nagaland") ||
                                        s.includes("tripura")
                                      )
                                        zone = "East Zone";
                                      else if (
                                        s.includes("kerala") ||
                                        s.includes("goa")
                                      )
                                        zone = "South Zone";
                                      else if (
                                        s.includes("chhattisgarh") ||
                                        s.includes("madhya pradesh") ||
                                        s.includes("vidarbha")
                                      )
                                        zone = "West Zone";
                                      return zone ? (
                                        <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                          Special: {zone}
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Show Full Details toggle */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setShowCourierFullDetails((v) => !v)
                              }
                              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                              data-ocid="courier.full_details.toggle"
                            >
                              {showCourierFullDetails
                                ? "Hide Full Details ▴"
                                : "Show Full Details ▾"}
                            </button>
                            {!selectedCustomer && (
                              <span className="text-xs text-muted-foreground">
                                Walking customer — enter details optionally
                              </span>
                            )}
                          </div>
                          {/* Walking customer: manual amount */}
                          {!selectedCustomer && (
                            <div>
                              <label
                                htmlFor="walking-amount2"
                                className="text-xs font-medium text-muted-foreground block mb-1"
                              >
                                Amount (₹)
                              </label>
                              <input
                                id="walking-amount2"
                                type="number"
                                className="border rounded px-2 py-1.5 text-sm w-full border-border"
                                placeholder="Enter amount manually"
                                value={walkingManualAmount}
                                onChange={(e) =>
                                  setWalkingManualAmount(e.target.value)
                                }
                                data-ocid="courier.walking.amount.input"
                              />
                            </div>
                          )}
                          {/* Full Sender & Receiver details — shown when expanded */}
                          {showCourierFullDetails && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-border/50 rounded-lg p-3 bg-muted/10">
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Sender Details
                                </p>
                                <Input
                                  value={courierForm.senderName}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      senderName: e.target.value,
                                    }))
                                  }
                                  placeholder="Name / Company Name*"
                                  className="text-xs h-8"
                                />
                                <Input
                                  value={courierForm.senderPhone}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      senderPhone: e.target.value,
                                    }))
                                  }
                                  placeholder="Mobile No"
                                  className="text-xs h-8"
                                />
                                <Input
                                  value={courierForm.senderAddress}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      senderAddress: e.target.value,
                                    }))
                                  }
                                  placeholder="Address"
                                  className="text-xs h-8"
                                />
                                <Input
                                  value={courierForm.senderArea}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      senderArea: e.target.value,
                                    }))
                                  }
                                  placeholder="Area"
                                  className="text-xs h-8"
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <Input
                                    value={courierForm.senderCity}
                                    onChange={(e) =>
                                      setCourierForm((p) => ({
                                        ...p,
                                        senderCity: e.target.value,
                                      }))
                                    }
                                    placeholder="City"
                                    className="text-xs h-8"
                                  />
                                  <Input
                                    value={courierForm.senderState}
                                    onChange={(e) =>
                                      setCourierForm((p) => ({
                                        ...p,
                                        senderState: e.target.value,
                                      }))
                                    }
                                    placeholder="State"
                                    className="text-xs h-8"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" /> Receiver
                                    Details
                                  </p>
                                  {savedReceivers.length > 0 && (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        className="text-xs text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5"
                                        onClick={() =>
                                          setShowSavedReceivers((v) => !v)
                                        }
                                      >
                                        📋 Saved ({savedReceivers.length})
                                      </button>
                                      {showSavedReceivers && (
                                        <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-lg shadow-lg w-56 max-h-48 overflow-y-auto">
                                          {savedReceivers.map((r) => (
                                            <button
                                              key={r.id}
                                              type="button"
                                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 border-b border-border/30 last:border-0"
                                              onClick={() => {
                                                setCourierForm((prev) => ({
                                                  ...prev,
                                                  receiverName: r.name,
                                                  receiverCompany:
                                                    r.companyName || "",
                                                  receiverPhone: r.phone,
                                                  receiverAddress: r.address,
                                                  receiverPincode: r.pincode,
                                                  receiverArea: r.area,
                                                  receiverCity: r.city,
                                                  receiverState: r.state,
                                                }));
                                                setShowSavedReceivers(false);
                                              }}
                                            >
                                              <div className="font-medium truncate">
                                                {r.name}
                                              </div>
                                              <div className="text-muted-foreground truncate">
                                                {r.city} - {r.pincode}
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Input
                                  value={courierForm.receiverName}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      receiverName: e.target.value,
                                    }))
                                  }
                                  placeholder="Name / Company Name*"
                                  className="text-xs h-8"
                                />
                                <Input
                                  value={courierForm.receiverPhone}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      receiverPhone: e.target.value,
                                    }))
                                  }
                                  placeholder="Mobile No"
                                  className="text-xs h-8"
                                />
                                <Input
                                  value={courierForm.receiverAddress}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      receiverAddress: e.target.value,
                                    }))
                                  }
                                  placeholder="Address"
                                  className="text-xs h-8"
                                />
                                <Input
                                  value={courierForm.receiverArea}
                                  onChange={(e) =>
                                    setCourierForm((p) => ({
                                      ...p,
                                      receiverArea: e.target.value,
                                    }))
                                  }
                                  placeholder="Area"
                                  className="text-xs h-8"
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <Input
                                    value={courierForm.receiverCity}
                                    onChange={(e) =>
                                      setCourierForm((p) => ({
                                        ...p,
                                        receiverCity: e.target.value,
                                      }))
                                    }
                                    placeholder="City"
                                    className="text-xs h-8"
                                  />
                                  <Input
                                    value={courierForm.receiverState}
                                    onChange={(e) =>
                                      setCourierForm((p) => ({
                                        ...p,
                                        receiverState: e.target.value,
                                      }))
                                    }
                                    placeholder="State"
                                    className="text-xs h-8"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Shipment Details */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <span>⚖</span> Shipment Details
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Weight (kg)
                              </Label>
                              <Input
                                type="number"
                                value={courierForm.weight}
                                onChange={(e) =>
                                  setCourierForm((p) => ({
                                    ...p,
                                    weight: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="text-xs h-8 mt-0.5"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                L (cm)
                              </Label>
                              <Input
                                type="number"
                                value={courierForm.length}
                                onChange={(e) =>
                                  setCourierForm((p) => ({
                                    ...p,
                                    length: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="text-xs h-8 mt-0.5"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                W (cm)
                              </Label>
                              <Input
                                type="number"
                                value={courierForm.width}
                                onChange={(e) =>
                                  setCourierForm((p) => ({
                                    ...p,
                                    width: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="text-xs h-8 mt-0.5"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                H (cm)
                              </Label>
                              <Input
                                type="number"
                                value={courierForm.height}
                                onChange={(e) =>
                                  setCourierForm((p) => ({
                                    ...p,
                                    height: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="text-xs h-8 mt-0.5"
                              />
                            </div>
                          </div>
                          {(courierForm.length ||
                            courierForm.width ||
                            courierForm.height) && (
                            <div className="flex gap-3 text-xs bg-muted/40 p-2 rounded-lg">
                              <span className="text-muted-foreground">
                                Volumetric:{" "}
                                <strong>
                                  {calcVolumetricWeight(
                                    courierForm.length,
                                    courierForm.width,
                                    courierForm.height,
                                  ).toFixed(2)}{" "}
                                  kg
                                </strong>
                              </span>
                              <span className="text-muted-foreground">|</span>
                              <span className="text-muted-foreground">
                                Chargeable:{" "}
                                <strong className="text-foreground">
                                  {calcChargeableWeight(
                                    courierForm.weight,
                                    courierForm.length,
                                    courierForm.width,
                                    courierForm.height,
                                  ).toFixed(2)}{" "}
                                  kg
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Type & Mode */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Product Type</Label>
                            <Select
                              value={courierForm.productType}
                              onValueChange={(v) =>
                                setCourierForm((p) => ({
                                  ...p,
                                  productType: v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Document">
                                  Document
                                </SelectItem>
                                <SelectItem value="Parcel">Parcel</SelectItem>
                                <SelectItem value="Heavy Parcel">
                                  Heavy Parcel
                                </SelectItem>
                                <SelectItem value="Fragile">Fragile</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {!isOwnBrand && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Mode of Transport
                              </Label>
                              {(() => {
                                const tm =
                                  (
                                    selectedBrand as CourierBrand & {
                                      transportModes?: string;
                                    }
                                  ).transportModes ?? "Both";
                                if (tm === "Air")
                                  return (
                                    <div className="h-8 px-3 rounded-md border border-border bg-blue-50 flex items-center">
                                      <span className="text-xs font-semibold text-blue-700">
                                        ✈ Air Mode
                                      </span>
                                    </div>
                                  );
                                if (tm === "Surface")
                                  return (
                                    <div className="h-8 px-3 rounded-md border border-border bg-green-50 flex items-center">
                                      <span className="text-xs font-semibold text-green-700">
                                        🚛 Surface Mode
                                      </span>
                                    </div>
                                  );
                                return (
                                  <Select
                                    value={courierForm.serviceMode || "Air"}
                                    onValueChange={(v) =>
                                      setCourierForm((p) => ({
                                        ...p,
                                        serviceMode: v,
                                      }))
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-8 text-xs"
                                      data-ocid="courier.service_mode.select"
                                    >
                                      <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Air">✈ Air</SelectItem>
                                      <SelectItem value="Surface">
                                        🚛 Surface
                                      </SelectItem>
                                      {(selectedBrand.serviceModes ?? [])
                                        .filter(
                                          (m) => m !== "Air" && m !== "Surface",
                                        )
                                        .map((svcMode) => (
                                          <SelectItem
                                            key={svcMode}
                                            value={svcMode}
                                          >
                                            {svcMode}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {selectedCustomer &&
                          brandsWithTariffs.has(
                            selectedBrand.brandName.toLowerCase(),
                          ) &&
                          (() => {
                            const brandTariffs = tariffs.filter(
                              (t) =>
                                t.brandName.toLowerCase() ===
                                  selectedBrand.brandName.toLowerCase() &&
                                t.isActive,
                            );
                            const availableProductTypes = [
                              ...new Set(
                                brandTariffs.map((t) => t.productType),
                              ),
                            ];
                            const availableZones = [
                              ...new Set(
                                brandTariffs
                                  .filter(
                                    (t) =>
                                      t.productType ===
                                      courierForm.tariffProductType,
                                  )
                                  .map((t) => t.zone),
                              ),
                            ];

                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                                  <div>
                                    <p className="text-xs font-semibold text-orange-800">
                                      {selectedBrand.brandName} Tariff
                                      Calculator
                                    </p>
                                    <p className="text-xs text-orange-600">
                                      Auto-calculate from stored tariff rates
                                    </p>
                                  </div>
                                  <Switch
                                    checked={courierForm.useTariff}
                                    onCheckedChange={(checked) => {
                                      // When turning on, auto-set product type to first available if current value doesn't exist
                                      const firstPT =
                                        availableProductTypes[0] ?? "";
                                      const currentPTValid =
                                        availableProductTypes.includes(
                                          courierForm.tariffProductType,
                                        );
                                      const firstZone =
                                        brandTariffs.find(
                                          (t) =>
                                            t.productType ===
                                            (currentPTValid
                                              ? courierForm.tariffProductType
                                              : firstPT),
                                        )?.zone ?? courierForm.tariffZone;
                                      setCourierForm((p) => ({
                                        ...p,
                                        useTariff: checked,
                                        tariffProductType:
                                          checked && !currentPTValid
                                            ? firstPT
                                            : p.tariffProductType,
                                        tariffZone:
                                          checked && !currentPTValid
                                            ? firstZone
                                            : p.tariffZone,
                                      }));
                                    }}
                                    data-ocid="courier.tariff.toggle"
                                  />
                                </div>

                                {courierForm.useTariff && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Service / Product Type
                                      </Label>
                                      <Select
                                        value={courierForm.tariffProductType}
                                        onValueChange={(v) =>
                                          setCourierForm((p) => ({
                                            ...p,
                                            tariffProductType: v,
                                            tariffZone:
                                              brandTariffs.find(
                                                (t) => t.productType === v,
                                              )?.zone ?? p.tariffZone,
                                          }))
                                        }
                                      >
                                        <SelectTrigger
                                          className="h-8 text-xs"
                                          data-ocid="courier.service_type.select"
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableProductTypes.map((pt) => (
                                            <SelectItem key={pt} value={pt}>
                                              {pt}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Destination Zone
                                      </Label>
                                      <Select
                                        value={courierForm.tariffZone}
                                        onValueChange={(v) =>
                                          setCourierForm((p) => ({
                                            ...p,
                                            tariffZone: v,
                                          }))
                                        }
                                      >
                                        <SelectTrigger
                                          className="h-8 text-xs"
                                          data-ocid="courier.zone.select"
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableZones.map((zone) => (
                                            <SelectItem key={zone} value={zone}>
                                              {zone}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                        {/* Price Calculation */}
                        {(() => {
                          const hasTariff =
                            courierForm.useTariff &&
                            brandsWithTariffs.has(
                              selectedBrand.brandName.toLowerCase(),
                            );
                          const weightKg = Number(courierForm.weight) || 0;
                          const tariffResult =
                            hasTariff && weightKg > 0
                              ? calcTariffPrice(
                                  tariffs,
                                  selectedBrand.brandName,
                                  courierForm.tariffProductType,
                                  courierForm.tariffZone,
                                  weightKg,
                                )
                              : null;

                          const gstRate = selectedBrand.gstRate || 0;

                          const matchedTariff = hasTariff
                            ? tariffs.find(
                                (t) =>
                                  t.brandName.toLowerCase() ===
                                    selectedBrand.brandName.toLowerCase() &&
                                  t.productType.toLowerCase() ===
                                    courierForm.tariffProductType.toLowerCase() &&
                                  t.zone === courierForm.tariffZone &&
                                  t.isActive,
                              )
                            : null;

                          const isGSTInclusive =
                            matchedTariff?.isGSTInclusive ?? false;

                          const custOverride = hasTariff
                            ? getCustomerTariffOverride(
                                selectedBrand.brandName,
                                courierForm.tariffProductType,
                                courierForm.tariffZone,
                              )
                            : null;

                          const effectiveTariffTotal =
                            custOverride !== null
                              ? custOverride
                              : tariffResult && tariffResult.price > 0
                                ? tariffResult.price
                                : null;

                          const tariffTotal = effectiveTariffTotal;
                          const tariffBase =
                            tariffTotal && gstRate > 0 && isGSTInclusive
                              ? Math.round(
                                  (tariffTotal / (1 + gstRate / 100)) * 100,
                                ) / 100
                              : tariffTotal;
                          const tariffGST =
                            tariffTotal && tariffBase && isGSTInclusive
                              ? tariffTotal - tariffBase
                              : 0;

                          const basePrice = selectedBrand.sellingPrice;
                          const gstOnBase = (basePrice * gstRate) / 100;
                          const totalNonTariff = basePrice + gstOnBase;

                          return (
                            <div className="bg-white border border-border rounded-lg p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Price Calculation
                                </p>
                                {custOverride !== null && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                                    ★ Custom Rate
                                  </span>
                                )}
                              </div>

                              {tariffResult && custOverride === null && (
                                <p className="text-xs italic text-muted-foreground">
                                  {tariffResult.breakdown}
                                </p>
                              )}
                              {custOverride !== null && (
                                <p className="text-xs italic text-amber-700">
                                  Customer-specific rate applied for{" "}
                                  {selectedCustomer?.name}
                                </p>
                              )}

                              {tariffResult?.warning && (
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  <p className="text-xs text-amber-600">
                                    {tariffResult.warning}
                                  </p>
                                </div>
                              )}

                              {hasTariff && tariffTotal ? (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {custOverride !== null
                                        ? "Custom Rate"
                                        : "Tariff"}
                                      {isGSTInclusive ? " (Incl. GST)" : ""}
                                    </span>
                                    <span
                                      className={`font-medium ${custOverride !== null ? "text-amber-700" : ""}`}
                                    >
                                      {formatCurrency(tariffTotal)}
                                    </span>
                                  </div>
                                  {gstRate > 0 &&
                                    tariffBase &&
                                    isGSTInclusive && (
                                      <>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">
                                            Base (ex-GST)
                                          </span>
                                          <span>
                                            {formatCurrency(tariffBase)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">
                                            GST ({gstRate}%) included
                                          </span>
                                          <span>
                                            {formatCurrency(tariffGST)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-border">
                                    <span>Total (You Collect)</span>
                                    <span className="text-primary">
                                      {formatCurrency(tariffTotal)}
                                    </span>
                                  </div>
                                  {gstRate > 0 && isGSTInclusive && (
                                    <p className="text-xs text-muted-foreground italic">
                                      Tariff rates are GST-inclusive
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      Base Price
                                    </span>
                                    <span>{formatCurrency(basePrice)}</span>
                                  </div>
                                  {gstRate > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        GST ({gstRate}%)
                                      </span>
                                      <span>{formatCurrency(gstOnBase)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-border">
                                    <span>Total</span>
                                    <span className="text-primary">
                                      {formatCurrency(
                                        gstRate > 0
                                          ? totalNonTariff
                                          : basePrice,
                                      )}
                                    </span>
                                  </div>
                                </>
                              )}

                              {/* AWB Serial info */}
                              <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                                <span className="text-muted-foreground">
                                  AWB Serial
                                </span>
                                <span
                                  className={cn(
                                    "font-mono",
                                    isOwnBrand
                                      ? "text-blue-700"
                                      : awbStatus === "in_stock"
                                        ? "text-green-700"
                                        : awbStatus === "not_in_stock"
                                          ? "text-amber-600"
                                          : awbStatus === "duplicate_bill" ||
                                              awbStatus === "duplicate_current"
                                            ? "text-red-600"
                                            : "text-muted-foreground",
                                  )}
                                >
                                  {isOwnBrand
                                    ? (previewAWB ?? "Auto-generated")
                                    : manualAWBInput.trim() ||
                                      "Enter AWB above"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Add to Bill Button */}
                        <Button
                          className="w-full"
                          onClick={addCourierWithDetails}
                          disabled={isOwnBrand ? false : !canAdd}
                          data-ocid="courier.add_to_bill.primary_button"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Bill
                          {!isOwnBrand && awbStatus === "not_in_stock" && (
                            <span className="ml-1 text-[10px] opacity-80">
                              (Override)
                            </span>
                          )}
                        </Button>
                      </div>
                    );
                  })()}
              </div>
            </TabsContent>

            {/* Xerox */}
            <TabsContent value="xerox" className="mt-3">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {xeroxProducts.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => addXeroxProduct(p)}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(p.pricePerPage)}/page
                    </p>
                  </button>
                ))}
                {xeroxProducts.length === 0 && (
                  <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">
                    No xerox products
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Services */}
            <TabsContent value="service" className="mt-3">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {serviceProducts.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => addServiceProduct(p)}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.description}
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(p.price)}
                    </p>
                  </button>
                ))}
                {serviceProducts.length === 0 && (
                  <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">
                    No services found
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bill Items */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Bill Items ({billItems.length})
          </h3>
          {billItems.length === 0 ? (
            <div
              className="text-center py-8 text-muted-foreground"
              data-ocid="pos.items.empty_state"
            >
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No items added yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {billItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-3"
                  data-ocid={`pos.items.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.productType === "courier_awb" &&
                          item.brandName && (
                            <span className="text-[10px] text-primary font-bold uppercase tracking-wide">
                              {item.brandName}
                            </span>
                          )}
                        <p
                          className={`text-sm font-semibold truncate${item.productType === "courier_awb" ? " font-mono" : ""}`}
                        >
                          {item.productName}
                        </p>
                        {item.awbSerial &&
                          item.productName !== item.awbSerial && (
                            <Badge variant="outline" className="text-xs">
                              AWB: {item.awbSerial}
                            </Badge>
                          )}
                        {item.serviceMode && (
                          <Badge variant="secondary" className="text-xs">
                            {item.serviceMode}
                          </Badge>
                        )}
                        {item.eddDate && (
                          <span className="text-xs text-muted-foreground font-medium">
                            EDD: {item.eddDate}
                          </span>
                        )}
                        {(() => {
                          // Show tier badge if a named tier is active
                          if (
                            (item as BillItem & { tierLabel?: string })
                              .tierLabel
                          ) {
                            const tLabel = (
                              item as BillItem & { tierLabel?: string }
                            ).tierLabel!;
                            const TLABELS: Record<string, string> = {
                              retail: "Retail",
                              super_retail: "Super Retail",
                              wholesale: "Wholesale",
                              super_wholesale: "Super Wholesale",
                            };
                            return (
                              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200 border">
                                {TLABELS[tLabel] ?? tLabel} ×{item.quantity}
                              </Badge>
                            );
                          }
                          const prod = products.find(
                            (p) => p.id === item.productId,
                          );
                          if (!prod) return null;
                          let isSlabActive = false;
                          if (prod.type === "general") {
                            const gp = prod as GeneralProduct;
                            if (gp.usePricingSlabs && gp.pricingSlabs?.length) {
                              const slabPrice = resolveSlabPrice(
                                gp.pricingSlabs,
                                item.quantity,
                                gp.sellingPrice,
                              );
                              isSlabActive = slabPrice !== gp.sellingPrice;
                            }
                          } else if (prod.type === "xerox") {
                            const xp = prod as XeroxProduct;
                            if (xp.usePricingSlabs && xp.pricingSlabs?.length) {
                              const slabPrice = resolveSlabPrice(
                                xp.pricingSlabs,
                                item.quantity,
                                xp.pricePerPage,
                              );
                              isSlabActive = slabPrice !== xp.pricePerPage;
                            }
                          }
                          if (!isSlabActive) return null;
                          return (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border">
                              Slab ×{item.quantity}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="w-6 h-6 rounded bg-muted hover:bg-muted/80 text-sm font-bold flex items-center justify-center"
                            onClick={() =>
                              updateItemQuantity(item.id, item.quantity - 1)
                            }
                          >
                            -
                          </button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(
                                item.id,
                                Number(e.target.value),
                              )
                            }
                            className="w-14 h-6 text-center text-xs p-1"
                            min="1"
                          />
                          <button
                            type="button"
                            className="w-6 h-6 rounded bg-muted hover:bg-muted/80 text-sm font-bold flex items-center justify-center"
                            onClick={() =>
                              updateItemQuantity(item.id, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {item.unit}
                          </span>
                        </div>
                        {item.productType === "courier_awb" ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              @
                            </span>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newPrice = Math.max(
                                  0,
                                  Number(e.target.value),
                                );
                                setBillItems(
                                  billItems.map((i) =>
                                    i.id !== item.id
                                      ? i
                                      : {
                                          ...i,
                                          unitPrice: newPrice,
                                          totalPrice: Math.max(
                                            0,
                                            newPrice * i.quantity -
                                              (i.discountAmount || 0),
                                          ),
                                        },
                                  ),
                                );
                              }}
                              className="w-24 h-6 text-xs p-1 text-right"
                              min="0"
                              step="0.01"
                              data-ocid="pos.courier.price.input"
                            />
                            <span className="text-xs text-muted-foreground">
                              ₹
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            @ {formatCurrency(item.unitPrice)}
                          </span>
                        )}
                      </div>

                      {/* Per-item discount row */}
                      <div className="flex items-center gap-2 mt-2">
                        <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          Discount:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newType =
                              item.discountType === "percent"
                                ? "amount"
                                : "percent";
                            updateItemDiscount(
                              item.id,
                              newType,
                              item.discountValue || 0,
                            );
                          }}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded border font-mono font-semibold transition-colors",
                            item.discountType === "percent"
                              ? "bg-violet-100 text-violet-700 border-violet-200"
                              : "bg-blue-50 text-blue-700 border-blue-200",
                          )}
                        >
                          {item.discountType === "percent" ? "%" : "₹"}
                        </button>
                        <Input
                          type="number"
                          value={item.discountValue || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateItemDiscount(
                              item.id,
                              item.discountType || "amount",
                              val,
                            );
                          }}
                          placeholder="0"
                          className="w-16 h-6 text-xs p-1 text-center"
                          min="0"
                          data-ocid={`pos.items.discount_input.${idx + 1}`}
                        />
                        {(item.discountAmount || 0) > 0 && (
                          <span className="text-xs text-amber-600 font-medium">
                            – {formatCurrency(item.discountAmount!)}
                          </span>
                        )}
                      </div>

                      {/* Optional description */}
                      <Input
                        value={item.description || ""}
                        onChange={(e) =>
                          updateItemDescription(item.id, e.target.value)
                        }
                        placeholder="Add description (optional)..."
                        className="mt-2 text-xs h-7 bg-input"
                      />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(item.totalPrice)}
                      </p>
                      {(item.discountAmount || 0) > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        {item.productType === "courier_awb" && (
                          <button
                            type="button"
                            className="text-primary hover:text-primary/80"
                            title="Print Courier Slip"
                            onClick={() => setSlipItem(item)}
                            data-ocid="pos.courier_slip.button"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => removeItem(item.id)}
                          data-ocid={`pos.items.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Charges Section */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary" /> Additional
              Charges
            </h3>
          </div>

          {/* Quick-add preset buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {["Packing", "Pickup", "Old Balance", "Wastage"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => addPresetCharge(label)}
                className="text-xs px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-medium"
                data-ocid={`pos.charges.${label.toLowerCase().replace(" ", "_")}.button`}
              >
                + {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addPresetCharge("Custom Charge")}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              data-ocid="pos.charges.custom.button"
            >
              + Custom
            </button>
          </div>

          {/* Charges list */}
          {additionalCharges.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No additional charges
            </p>
          ) : (
            <div className="space-y-2">
              {additionalCharges.map((charge, idx) => (
                <div
                  key={charge.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border"
                  data-ocid={`pos.charges.item.${idx + 1}`}
                >
                  <Input
                    value={charge.label}
                    onChange={(e) =>
                      updateCharge(charge.id, { label: e.target.value })
                    }
                    className="h-7 text-xs flex-1 min-w-0 bg-white"
                    placeholder="Charge label"
                  />
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={charge.amount || ""}
                      onChange={(e) =>
                        updateCharge(charge.id, {
                          amount: Number(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs w-20 text-center bg-white"
                      placeholder="0"
                      data-ocid={`pos.charges.amount_input.${idx + 1}`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Switch
                      checked={charge.showInBill}
                      onCheckedChange={(checked) =>
                        updateCharge(charge.id, { showInBill: checked })
                      }
                      className="data-[state=checked]:bg-green-600 h-4 w-8"
                      data-ocid={`pos.charges.show_in_bill.switch.${idx + 1}`}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium w-16",
                        charge.showInBill
                          ? "text-green-700"
                          : "text-muted-foreground",
                      )}
                    >
                      {charge.showInBill ? "Show" : "Adjust"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCharge(charge.id)}
                    className="text-destructive hover:text-destructive/80 flex-shrink-0"
                    data-ocid={`pos.charges.delete_button.${idx + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pl-1">
                <span className="font-semibold text-green-700">Show</span> =
                visible line on bill &nbsp;|&nbsp;{" "}
                <span className="font-semibold">Adjust</span> = silently
                distributed into item prices
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Summary & Payment */}
      <div className="space-y-4">
        {/* Date + Bill Number */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs space-y-3">
          {editMode && editBillData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium">
              ✏️ Editing Bill: {editBillData.billNo}
            </div>
          )}
          {editBillIsInvoiced && (
            <div className="bg-yellow-50 border border-yellow-400 rounded-lg px-3 py-2 text-xs text-yellow-900 font-medium flex items-center gap-2">
              🔒 Invoice generated — product items are locked. You can only
              update payment details, date, and notes.
            </div>
          )}
          <div>
            <Label className="text-xs mb-1 block">Bill Number</Label>
            <Input
              value={
                editMode && editBillData
                  ? editBillData.billNo
                  : billNoOverride ||
                    (settings
                      ? generateBillNo(settings.billPrefix, settings.billSeq)
                      : "DRAFT")
              }
              onChange={(e) => setBillNoOverride(e.target.value)}
              className="text-sm font-mono"
              readOnly={editMode && !!editBillData}
              data-ocid="pos.billno.input"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Bill Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm"
              data-ocid="pos.date.input"
            />
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <h3 className="text-sm font-semibold mb-3">Bill Summary</h3>

          {/* Item lines */}
          <div className="space-y-2">
            {billItems.map((item) => {
              const gstAmt =
                item.gstRate > 0
                  ? Math.round(
                      (item.totalPrice -
                        item.totalPrice / (1 + item.gstRate / 100)) *
                        100,
                    ) / 100
                  : 0;
              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[150px]">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                  {item.gstRate > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground pl-1">
                      <span>
                        Incl. GST ({item.gstRate}%): {formatCurrency(gstAmt)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Separator className="my-2" />

          {/* Subtotal before discounts */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal (before discounts)</span>
            <span>{formatCurrency(subtotalBeforeDiscounts)}</span>
          </div>

          {/* Item discounts */}
          {totalItemDiscounts > 0 && (
            <div className="flex justify-between text-xs text-amber-600 mt-1">
              <span>Item Discounts</span>
              <span>– {formatCurrency(totalItemDiscounts)}</span>
            </div>
          )}

          {/* Net items total */}
          <div className="flex justify-between text-xs font-semibold mt-1">
            <span>Net Items Total</span>
            <span>{formatCurrency(netItemsTotal)}</span>
          </div>

          {/* All additional charges (visible + hidden/adjust) */}
          {additionalCharges
            .filter((c) => c.amount !== 0)
            .map((charge) => (
              <div
                key={charge.id}
                className="flex justify-between text-xs mt-1"
              >
                <span className="text-muted-foreground flex items-center gap-1">
                  {charge.label}
                  {!charge.showInBill && (
                    <span className="text-[9px] bg-muted px-1 py-0.5 rounded text-muted-foreground font-medium">
                      Adjust
                    </span>
                  )}
                </span>
                <span
                  className={
                    charge.amount < 0 ? "text-red-600" : "text-foreground"
                  }
                >
                  {charge.amount < 0 ? "– " : "+ "}
                  {formatCurrency(Math.abs(charge.amount))}
                </span>
              </div>
            ))}

          {/* Bill-level discount input */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground flex-1">
              Bill Discount (₹)
            </span>
            <Input
              type="number"
              value={billDiscount || ""}
              onChange={(e) =>
                setBillDiscount(Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="0"
              className="w-20 h-7 text-xs text-center"
              min="0"
              data-ocid="pos.bill_discount.input"
            />
          </div>
          {billDiscount > 0 && (
            <div className="flex justify-between text-xs text-amber-600 mt-0.5">
              <span>Bill Discount</span>
              <span>– {formatCurrency(billDiscount)}</span>
            </div>
          )}

          <Separator className="my-3" />

          <div className="flex justify-between items-center mt-2">
            <span className="text-lg font-bold text-foreground">
              Grand Total
            </span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <h3 className="text-sm font-semibold mb-3">Payment</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) =>
                  setPaymentMethod(v as Bill["paymentMethod"])
                }
              >
                <SelectTrigger
                  className="text-sm"
                  data-ocid="pos.payment_method.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Amount Paid (₹)</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={String(total)}
                className="text-sm"
                data-ocid="pos.amount_paid.input"
              />
            </div>
            <div className="flex justify-between text-sm p-2 bg-muted rounded-lg">
              <span className="text-muted-foreground">Balance Due:</span>
              <span
                className={cn(
                  "font-bold",
                  balance > 0 ? "text-destructive" : "text-success",
                )}
              >
                {formatCurrency(Math.max(0, balance))}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <Label className="text-xs mb-1 block">Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for this bill..."
            className="text-sm resize-none"
            rows={2}
            data-ocid="pos.notes.textarea"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleSaveBill}
            disabled={billItems.length === 0}
            data-ocid="pos.save.primary_button"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Bill
          </Button>
          {/* Paper size selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-1">
              Paper Size:
            </span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${paperSize === "A6" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setPaperSize("A6")}
                data-ocid="pos.paper_size_a6.toggle"
              >
                A6
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium border-l border-border transition-colors ${paperSize === "A5" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setPaperSize("A5")}
                data-ocid="pos.paper_size_a5.toggle"
              >
                A5
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => printPOSBill("print")}
              disabled={billItems.length === 0}
              data-ocid="pos.print_receipt.button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => printPOSBill("pdf")}
              disabled={billItems.length === 0}
              title="In print dialog, choose 'Save as PDF'"
              data-ocid="pos.download_pdf.button"
            >
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => {
              setBillItems([]);
              setSelectedCustomer(null);
              setWalkingName("");
              setCustomerSearch("");
              setNotes("");
              setAmountPaid("");
              setBillDiscount(0);
              setAdditionalCharges([]);
            }}
            data-ocid="pos.clear.secondary_button"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Sub-Unit Selection Dialog */}
      {subUnitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80 space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Select Unit — {subUnitDialog.product.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose which unit to add to the bill
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedSubUnit("parent")}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedSubUnit === "parent" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <p className="text-sm font-semibold">
                  {subUnitDialog.product.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  ₹{subUnitDialog.product.sellingPrice} per{" "}
                  {subUnitDialog.product.unit}
                </p>
              </button>
              {subUnitDialog.product.productSubUnit1 && (
                <button
                  type="button"
                  onClick={() => setSelectedSubUnit("sub1")}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedSubUnit === "sub1" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <p className="text-sm font-semibold">
                    {subUnitDialog.product.productSubUnit1.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₹
                    {subUnitDialog.product.productSubUnit1.sellingPrice ??
                      "N/A"}{" "}
                    per {subUnitDialog.product.productSubUnit1.name} (1{" "}
                    {subUnitDialog.product.unit} ={" "}
                    {subUnitDialog.product.productSubUnit1.conversionRate}{" "}
                    {subUnitDialog.product.productSubUnit1.name})
                  </p>
                </button>
              )}
              {subUnitDialog.product.productSubUnit2 && (
                <button
                  type="button"
                  onClick={() => setSelectedSubUnit("sub2")}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedSubUnit === "sub2" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <p className="text-sm font-semibold">
                    {subUnitDialog.product.productSubUnit2.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₹
                    {subUnitDialog.product.productSubUnit2.sellingPrice ??
                      "N/A"}{" "}
                    per {subUnitDialog.product.productSubUnit2.name}
                  </p>
                </button>
              )}
              {subUnitDialog.product.productSubUnit3 && (
                <button
                  type="button"
                  onClick={() => setSelectedSubUnit("sub3")}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedSubUnit === "sub3" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <p className="text-sm font-semibold">
                    {subUnitDialog.product.productSubUnit3.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₹
                    {subUnitDialog.product.productSubUnit3.sellingPrice ??
                      "N/A"}{" "}
                    per {subUnitDialog.product.productSubUnit3.name}
                  </p>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSubUnitDialog(null)}
                className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = subUnitDialog.product;
                  let unitName = p.unit;
                  let price = p.sellingPrice;
                  if (selectedSubUnit === "sub1" && p.productSubUnit1) {
                    unitName = p.productSubUnit1.name;
                    price = p.productSubUnit1.sellingPrice ?? p.sellingPrice;
                  } else if (selectedSubUnit === "sub2" && p.productSubUnit2) {
                    unitName = p.productSubUnit2.name;
                    price = p.productSubUnit2.sellingPrice ?? p.sellingPrice;
                  } else if (selectedSubUnit === "sub3" && p.productSubUnit3) {
                    unitName = p.productSubUnit3.name;
                    price = p.productSubUnit3.sellingPrice ?? p.sellingPrice;
                  }
                  const gstMult =
                    p.priceIncludesGST === false
                      ? 1 + (p.gstRate || 0) / 100
                      : 1;
                  const finalPrice = price * gstMult;
                  const item: BillItem = {
                    id: generateId(),
                    productId: p.id,
                    productType: "general",
                    productName: p.name,
                    quantity: 1,
                    unit: unitName,
                    unitPrice: finalPrice,
                    totalPrice: finalPrice,
                    gstRate: p.gstRate,
                  };
                  setBillItems((prev) => [...prev, item]);
                  setSubUnitDialog(null);
                }}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Slip Print Dialog */}
      {slipItem && (
        <CourierSlipPrintDialog
          open={!!slipItem}
          onClose={() => setSlipItem(null)}
          item={slipItem}
          billNo="(Draft Bill)"
          billDate={date}
          companyName={activeCompany?.name || "SKS Global Export"}
          companyAddress={activeCompany?.address}
          companyPhone={activeCompany?.phone}
          companyLogoUrl={activeCompany?.logoUrl}
          brandLogoUrl={selectedBrand?.logo}
        />
      )}

      {/* Linked Invoice Update Dialog */}
      {editLinkedInvoiceDialog &&
        (() => {
          const pendingStr = localStorage.getItem("pos_pending_invoice_update");
          if (!pendingStr) return null;
          const pending = JSON.parse(pendingStr) as {
            invoiceId: string;
            grandTotal: number;
            paymentStatus: string;
            amountPaid: number;
          };
          const inv = invoices.find((i) => i.id === pending.invoiceId);
          if (!inv) return null;
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
                <h3 className="font-semibold mb-2">Update Linked Invoice?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This bill has a linked invoice ({inv.invoiceNo}). Update
                  invoice totals to match?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted"
                    onClick={() => {
                      localStorage.removeItem("pos_pending_invoice_update");
                      setEditLinkedInvoiceDialog(false);
                    }}
                    data-ocid="pos.invoice_update.cancel_button"
                  >
                    No, Skip
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                    onClick={() => {
                      updateInvoice({
                        ...inv,
                        total: pending.grandTotal,
                        paymentStatus:
                          pending.paymentStatus as Invoice["paymentStatus"],
                      });
                      localStorage.removeItem("pos_pending_invoice_update");
                      setEditLinkedInvoiceDialog(false);
                      toast.success("Invoice updated to match bill");
                    }}
                    data-ocid="pos.invoice_update.confirm_button"
                  >
                    Yes, Update Invoice
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Customer Name Required Dialog */}
      {customerNameDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-lg mb-2">
              Customer Name Required
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              No customer name entered. How would you like to proceed?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                onClick={() => {
                  setCustomerNameDialog(false);
                  // Set bill number as walking name and save
                  const billNum =
                    billNoOverride ||
                    (settings
                      ? `${settings.billPrefix}${String(settings.billSeq).padStart(4, "0")}`
                      : "BILL");
                  setWalkingName(billNum);
                  setTimeout(() => handleSaveBill(), 50);
                }}
                data-ocid="pos.customer_name.use_bill_no_button"
              >
                Use Bill No as Name
              </button>
              <button
                type="button"
                className="w-full py-2 rounded-lg border border-border text-sm hover:bg-muted"
                onClick={() => {
                  setCustomerNameDialog(false);
                  // Focus the customer name input
                  const el = document.querySelector(
                    '[data-ocid="pos.walking_name.input"]',
                  ) as HTMLInputElement | null;
                  if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                data-ocid="pos.customer_name.enter_name_button"
              >
                Enter Customer Name
              </button>
              <button
                type="button"
                className="w-full py-2 rounded-lg border border-border text-sm hover:bg-muted"
                onClick={() => setCustomerNameDialog(false)}
                data-ocid="pos.customer_name.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
