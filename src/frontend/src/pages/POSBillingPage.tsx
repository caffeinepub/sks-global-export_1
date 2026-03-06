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
  Package,
  Plus,
  Printer,
  Save,
  Search,
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
  Bill,
  BillItem,
  CourierBrand,
  CourierTariff,
  Customer,
  GeneralProduct,
  ServiceProduct,
  XeroxProduct,
} from "../types";
import {
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
  getCustomerTariffMap,
  getTariffs,
  setSettings,
} from "../utils/storage";

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

    // Find the first slab whose maxGrams >= grams (null = additional slab)
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
      // Use last fixed slab as base price, add addl per 500g
      const lastFixed = fixedSlabs[fixedSlabs.length - 1];
      const lastMaxG = lastFixed?.maxGrams ?? 500;
      const lastPrice = lastFixed?.price ?? 0;
      const addlUnits = Math.ceil((grams - lastMaxG) / 500);
      price = lastPrice + addlUnits * addlSlab.price;
      slabDesc = `${lastMaxG}g + ${addlUnits}×500g extra`;
    } else if (fixedSlabs.length > 0) {
      // Weight exceeds all fixed slabs and no addl slab — use last fixed
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
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
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

interface POSBillingPageProps {
  onNavigate: (page: string) => void;
}

export function POSBillingPage({
  onNavigate: _onNavigate,
}: POSBillingPageProps) {
  const {
    products,
    customers,
    awbSerials,
    updateAWBSerial,
    addBill,
    settings,
    updateSettings,
    activeCompanyId,
    activeCompany,
  } = useAppStore();

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

  // Load tariffs for dynamic pricing
  const tariffs = getTariffs(activeCompanyId);

  // Brands with at least one active tariff entry
  const brandsWithTariffs = new Set(
    tariffs.filter((t) => t.isActive).map((t) => t.brandName.toLowerCase()),
  );

  // Load customer-specific tariff overrides
  const customerTariffMap = getCustomerTariffMap(activeCompanyId);
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

  // Pincode lookup state
  const [pincodeData, setPincodeData] = useState<PincodeData | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Courier brand selection and detail form
  const [selectedBrand, setSelectedBrand] = useState<CourierBrand | null>(null);
  const [courierForm, setCourierForm] = useState<CourierFormState>({
    senderName: "",
    senderPhone: "",
    senderAddress: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
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

  // Auto-fill sender details when customer is selected and a brand is chosen.
  // Uses functional setState so we don't need courierForm in the deps array.
  useEffect(() => {
    if (!selectedBrand) {
      setPincodeData(null);
      return;
    }
    if (selectedCustomer) {
      setCourierForm((prev) => ({
        ...prev,
        senderName: prev.senderName || selectedCustomer.name,
        senderPhone: prev.senderPhone || selectedCustomer.phone,
      }));
    } else if (walkingName) {
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

  const addCourierWithDetails = () => {
    if (!selectedBrand) return;
    const awbSerial = getNextAWBSerial(selectedBrand.id);
    if (!awbSerial) {
      toast.error(
        `No AWB serials available for ${selectedBrand.brandName}. Please add stock.`,
      );
      return;
    }

    if (!courierForm.senderName || !courierForm.receiverName) {
      toast.error("Sender and receiver names are required");
      return;
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
    const mode =
      autoMode ?? (courierForm.serviceMode || selectedBrand.serviceModes[0]);
    const chargeableWt = calcChargeableWeight(
      courierForm.weight,
      courierForm.length,
      courierForm.width,
      courierForm.height,
    );

    // Determine price — use tariff if enabled, otherwise brand's selling price
    // Check customer-specific override first, then standard tariff, then brand price
    // Tariff rates may be GST-inclusive, so extract base price from the tariff amount
    let unitPrice = selectedBrand.sellingPrice;
    let totalPrice = selectedBrand.sellingPrice;

    // Check for customer-specific tariff override (when tariff mode is active)
    const customerOverride =
      courierForm.useTariff && courierForm.weight
        ? getCustomerTariffOverride(
            selectedBrand.brandName,
            courierForm.tariffProductType,
            courierForm.tariffZone,
          )
        : null;

    if (customerOverride !== null) {
      // Use customer-specific price (treat same as tariff for GST extraction)
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
        const basePrice =
          Math.round((customerOverride / (1 + gstRate / 100)) * 100) / 100;
        unitPrice = basePrice;
        totalPrice = basePrice;
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
        // Find the matching tariff to check GST-inclusive flag
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
          // Tariff is GST-inclusive — extract base price so billing system can re-add GST correctly
          const basePrice =
            Math.round((tariffResult.price / (1 + gstRate / 100)) * 100) / 100;
          unitPrice = basePrice;
          totalPrice = basePrice;
        } else {
          unitPrice = tariffResult.price;
          totalPrice = tariffResult.price;
        }
      }
    }

    // Determine which weight is higher — actual or volumetric
    const actualWtKg = Number.parseFloat(courierForm.weight) || 0;
    const volWtKg = calcVolumetricWeight(
      courierForm.length,
      courierForm.width,
      courierForm.height,
    );
    const displayWeightKg = Math.max(actualWtKg, volWtKg);
    const weightLabel =
      displayWeightKg > 0 ? `${displayWeightKg.toFixed(3)} kg` : "";

    // Format booking date
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

    // Description: Receiver Name - Destination Pincode - Weight - Booking Date
    const description = [
      courierForm.receiverName,
      courierForm.receiverPincode || "",
      weightLabel,
      bookingDateFormatted,
    ]
      .filter(Boolean)
      .join(" - ");

    const item: BillItem = {
      id: generateId(),
      productId: selectedBrand.id,
      productType: "courier_awb",
      productName: awbSerial, // Item name = AWB No
      description,
      quantity: 1,
      unit: "Piece",
      awbSerial,
      serviceMode: mode,
      brandName: selectedBrand.brandName,
      unitPrice,
      totalPrice,
      gstRate: selectedBrand.gstRate,
      senderName: courierForm.senderName,
      senderPhone: courierForm.senderPhone,
      senderAddress: courierForm.senderAddress,
      receiverName: courierForm.receiverName,
      receiverPhone: courierForm.receiverPhone,
      receiverAddress: courierForm.receiverAddress,
      receiverPincode: courierForm.receiverPincode,
      actualWeightKg: actualWtKg,
      volumetricWeightKg: volWtKg,
      chargeableWeightKg: chargeableWt,
    };

    consumeAWBSerial(selectedBrand.id, awbSerial);
    setBillItems((prev) => [...prev, item]);
    toast.success(`AWB ${awbSerial} assigned — ${selectedBrand.brandName}`);

    // Reset courier form
    setSelectedBrand(null);
    setPincodeData(null);
    setPincodeLoading(false);
    setCourierForm({
      senderName: "",
      senderPhone: "",
      senderAddress: "",
      receiverName: "",
      receiverPhone: "",
      receiverAddress: "",
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

  const getNextAWBSerial = useCallback(
    (brandId: string): string | null => {
      const ranges = awbSerials.filter(
        (r) => r.brandId === brandId && r.availableSerials.length > 0,
      );
      if (ranges.length === 0) return null;
      return ranges[0].availableSerials[0];
    },
    [awbSerials],
  );

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
      setBillItems(
        billItems.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                totalPrice: (i.quantity + 1) * i.unitPrice,
              }
            : i,
        ),
      );
    } else {
      const item: BillItem = {
        id: generateId(),
        productId: product.id,
        productType: "general",
        productName: product.name,
        quantity: 1,
        unit: product.unit,
        unitPrice: product.sellingPrice,
        totalPrice: product.sellingPrice,
        gstRate: product.gstRate,
      };
      setBillItems([...billItems, item]);
    }
  };

  const addXeroxProduct = (product: XeroxProduct) => {
    const item: BillItem = {
      id: generateId(),
      productId: product.id,
      productType: "xerox",
      productName: product.name,
      quantity: 1,
      unit: "Page",
      unitPrice: product.pricePerPage,
      totalPrice: product.pricePerPage,
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
      billItems.map((i) =>
        i.id === itemId
          ? { ...i, quantity: qty, totalPrice: qty * i.unitPrice }
          : i,
      ),
    );
  };

  const updateItemDescription = (itemId: string, desc: string) => {
    setBillItems(
      billItems.map((i) => (i.id === itemId ? { ...i, description: desc } : i)),
    );
  };

  const removeItem = (itemId: string) => {
    const item = billItems.find((i) => i.id === itemId);
    if (item?.productType === "courier_awb" && item.awbSerial) {
      // Return serial to available
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
    setBillItems(billItems.filter((i) => i.id !== itemId));
  };

  const subtotal = billItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const total = subtotal;
  const paid = Number(amountPaid) || 0;
  const balance = total - paid;

  const handleSaveBill = () => {
    if (!selectedCustomer && !walkingName) {
      toast.error("Please select a customer or enter walking customer name");
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

    const billNo = generateBillNo(settings.billPrefix, settings.billSeq);
    const customerId = selectedCustomer?.id || `walking_${generateId()}`;
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
      items: billItems,
      subtotal,
      total,
      paymentMethod,
      paymentStatus: paid >= total ? "paid" : paid > 0 ? "partial" : "pending",
      amountPaid: paid,
      balanceDue: Math.max(0, balance),
      notes: notes || undefined,
      isInvoiced: false,
    };

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
  };

  const customerName = selectedCustomer?.name || walkingName || "";

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
                    onClick={() => addGeneralProduct(p)}
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
                    const nextSerial = getNextAWBSerial(brand.id);
                    const style = getBrandStyle(brand.brandName);
                    const isSelected = selectedBrand?.id === brand.id;
                    return (
                      <button
                        type="button"
                        key={brand.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBrand(null);
                            setPincodeData(null);
                          } else {
                            setSelectedBrand(brand);
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
                                  : brand.serviceModes[0] || "";
                            // Auto-fill sender from current customer selection
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
                              {brand.productType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(brand.sellingPrice)}
                          </span>
                          {nextSerial ? (
                            <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-mono">
                              ✓
                            </span>
                          ) : (
                            <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                              ✗
                            </span>
                          )}
                        </div>
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
                    const nextSerial = getNextAWBSerial(selectedBrand.id);
                    const volWt = calcVolumetricWeight(
                      courierForm.length,
                      courierForm.width,
                      courierForm.height,
                    );
                    const chargeableWt = calcChargeableWeight(
                      courierForm.weight,
                      courierForm.length,
                      courierForm.width,
                      courierForm.height,
                    );
                    const style = getBrandStyle(selectedBrand.brandName);
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
                              <p className="text-xs text-muted-foreground">
                                Fill shipment details
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedBrand(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Sender & Receiver */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
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
                              placeholder="Sender Name*"
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
                              placeholder="Phone"
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
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> Receiver
                              Details
                            </p>
                            <Input
                              value={courierForm.receiverName}
                              onChange={(e) =>
                                setCourierForm((p) => ({
                                  ...p,
                                  receiverName: e.target.value,
                                }))
                              }
                              placeholder="Receiver Name*"
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
                              placeholder="Phone"
                              className="text-xs h-8"
                            />
                            <div className="space-y-1">
                              <div className="grid grid-cols-2 gap-1.5">
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
                                <div>
                                  <Input
                                    value={courierForm.receiverPincode}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCourierForm((p) => ({
                                        ...p,
                                        receiverPincode: val,
                                      }));
                                      if (/^\d{6}$/.test(val)) {
                                        setPincodeLoading(true);
                                        fetchPincodeData(val).then((data) => {
                                          setPincodeData(data);
                                          setPincodeLoading(false);
                                          if (data) {
                                            setCourierForm((prev) => ({
                                              ...prev,
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
                                    placeholder="Pincode"
                                    className="text-xs h-8"
                                    maxLength={6}
                                    data-ocid="courier.receiver_pincode.input"
                                  />
                                </div>
                              </div>
                              {/* Pincode lookup result */}
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
                                <div className="text-xs bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 flex items-center gap-2 flex-wrap mt-1">
                                  <span className="text-green-800 font-medium">
                                    {pincodeData.area}
                                  </span>
                                  <span className="text-green-700">
                                    {pincodeData.city}, {pincodeData.state}
                                  </span>
                                  {pincodeData.isMetro ? (
                                    <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                      Metro
                                    </span>
                                  ) : (
                                    <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                      Non-Metro
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Shipment Details */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <Weight className="w-3 h-3" /> Shipment Details
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

                          {/* Volumetric display */}
                          {(courierForm.length ||
                            courierForm.width ||
                            courierForm.height) && (
                            <div className="flex gap-3 text-xs bg-muted/40 p-2 rounded-lg">
                              <span className="text-muted-foreground">
                                Volumetric:{" "}
                                <strong>{volWt.toFixed(2)} kg</strong>
                              </span>
                              <span className="text-muted-foreground">|</span>
                              <span className="text-muted-foreground">
                                Chargeable:{" "}
                                <strong className="text-foreground">
                                  {chargeableWt.toFixed(2)} kg
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
                          <div className="space-y-1.5">
                            <Label className="text-xs">Mode of Transport</Label>
                            {/* If brand has fixed single transport mode, show read-only badge; if Both, show selector */}
                            {(() => {
                              const tm =
                                (
                                  selectedBrand as CourierBrand & {
                                    transportModes?: string;
                                  }
                                ).transportModes ?? "Both";
                              if (tm === "Air") {
                                return (
                                  <div className="h-8 px-3 rounded-md border border-border bg-blue-50 flex items-center">
                                    <span className="text-xs font-semibold text-blue-700">
                                      ✈ Air Mode
                                    </span>
                                  </div>
                                );
                              }
                              if (tm === "Surface") {
                                return (
                                  <div className="h-8 px-3 rounded-md border border-border bg-green-50 flex items-center">
                                    <span className="text-xs font-semibold text-green-700">
                                      🚛 Surface Mode
                                    </span>
                                  </div>
                                );
                              }
                              // Both — show selector
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
                                    {selectedBrand.serviceModes
                                      .filter(
                                        (m) => m !== "Air" && m !== "Surface",
                                      )
                                      .map((mode) => (
                                        <SelectItem key={mode} value={mode}>
                                          {mode}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Tariff Toggle — for any brand with tariff entries */}
                        {brandsWithTariffs.has(
                          selectedBrand.brandName.toLowerCase(),
                        ) &&
                          (() => {
                            // Dynamic zones and product types from stored tariffs for this brand
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
                                    onCheckedChange={(checked) =>
                                      setCourierForm((p) => ({
                                        ...p,
                                        useTariff: checked,
                                      }))
                                    }
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
                                            // reset zone when product type changes
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

                          // Find the matching tariff to check GST-inclusive flag
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

                          // Check for customer-specific override
                          const custOverride = hasTariff
                            ? getCustomerTariffOverride(
                                selectedBrand.brandName,
                                courierForm.tariffProductType,
                                courierForm.tariffZone,
                              )
                            : null;

                          // Determine effective tariff total (customer override takes precedence)
                          const effectiveTariffTotal =
                            custOverride !== null
                              ? custOverride
                              : tariffResult && tariffResult.price > 0
                                ? tariffResult.price
                                : null;

                          // Tariff total and breakdown
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

                          // Non-tariff: base price + GST added on top
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

                              {/* Breakdown line when tariff is active */}
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

                              {/* Warning if weight exceeds max for zone */}
                              {tariffResult?.warning && (
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  <p className="text-xs text-amber-600">
                                    {tariffResult.warning}
                                  </p>
                                </div>
                              )}

                              {hasTariff && tariffTotal ? (
                                // Tariff active: show tariff breakdown
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
                                // No tariff: base + GST added on top
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

                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  AWB Serial
                                </span>
                                <span
                                  className={cn(
                                    "font-mono",
                                    nextSerial
                                      ? "text-green-700"
                                      : "text-red-600",
                                  )}
                                >
                                  {nextSerial || "No serials available"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Add to Bill Button */}
                        <Button
                          className="w-full"
                          onClick={addCourierWithDetails}
                          disabled={!nextSerial}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Bill
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
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No items added yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {billItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-3"
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
                        {/* Only show AWB badge if productName is NOT already the AWB serial */}
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
                        <span className="text-xs text-muted-foreground">
                          @ {formatCurrency(item.unitPrice)}
                        </span>
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
      </div>

      {/* Right: Summary & Payment */}
      <div className="space-y-4">
        {/* Date */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <Label className="text-xs mb-1 block">Bill Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <h3 className="text-sm font-semibold mb-3">Bill Summary</h3>
          <div className="space-y-2">
            {billItems.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[150px]">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Subtotal (Tax Incl.)
            </span>
            <span className="text-sm font-bold">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-lg font-bold text-foreground">Total</span>
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
                <SelectTrigger className="text-sm">
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
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleSaveBill}
            disabled={billItems.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Bill
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
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
            }}
          >
            Clear All
          </Button>
        </div>
      </div>

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
        />
      )}
    </div>
  );
}
