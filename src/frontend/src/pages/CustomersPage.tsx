import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileDown,
  FileUp,
  IndianRupee,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";
import type React from "react";
import { useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  CourierTariff,
  Customer,
  CustomerTariffAssignment,
} from "../types";
import {
  downloadCSVString,
  exportToCSV,
  getSampleCustomersCSV,
  parseCSV,
} from "../utils/excelHelpers";
import { validateGSTINFormat, verifyGSTIN } from "../utils/gstApi";
import { formatCurrency, formatDate, generateId } from "../utils/helpers";
import {
  SHARED_DATA_ID,
  getCustomerTariffMap,
  getTariffs,
  setCustomerTariffMap,
  setTariffs,
} from "../utils/storage";

// ─── Customer Tariff Dialog ────────────────────────────────────────────────────

interface CustomerTariffDialogProps {
  customer: Customer;
  activeCompanyId: string;
  onClose: () => void;
}

function CustomerTariffDialog({
  customer,
  activeCompanyId: _activeCompanyId, // kept for prop compat but not used for storage
  onClose,
}: CustomerTariffDialogProps) {
  const [allTariffs, setAllTariffs] = useState<CourierTariff[]>(() =>
    getTariffs(SHARED_DATA_ID),
  );
  const tariffMap = getCustomerTariffMap(SHARED_DATA_ID);
  const existingAssignments: CustomerTariffAssignment[] =
    tariffMap[customer.id] ?? [];

  // Build a local price override map: key = `${tariffId}` → override string
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const a of existingAssignments) {
      map[a.tariffId] = String(a.customPrice);
    }
    return map;
  });

  // Group active tariffs by brand
  const activeTariffs = allTariffs.filter((t) => t.isActive);
  const brands = [...new Set(activeTariffs.map((t) => t.brandName))];

  const handleLoadDTDCDefaults = () => {
    const DTDC_BRAND_ID = "brand_dtdc_01";
    const expressData = [
      {
        zone: "Within City",
        slabs: [
          { maxGrams: 100, price: 69 },
          { maxGrams: 250, price: 75 },
          { maxGrams: 500, price: 91 },
          { maxGrams: null, price: 43 },
        ],
        maxWeightKg: 3,
      },
      {
        zone: "Within State",
        slabs: [
          { maxGrams: 100, price: 96 },
          { maxGrams: 250, price: 101 },
          { maxGrams: 500, price: 112 },
          { maxGrams: null, price: 59 },
        ],
        maxWeightKg: 3,
      },
      {
        zone: "Within Zone",
        slabs: [
          { maxGrams: 100, price: 117 },
          { maxGrams: 250, price: 122 },
          { maxGrams: 500, price: 133 },
          { maxGrams: null, price: 69 },
        ],
        maxWeightKg: 3,
      },
      {
        zone: "Metros",
        slabs: [
          { maxGrams: 100, price: 133 },
          { maxGrams: 250, price: 138 },
          { maxGrams: 500, price: 191 },
          { maxGrams: null, price: 128 },
        ],
        maxWeightKg: 5,
      },
      {
        zone: "Rest of India",
        slabs: [
          { maxGrams: 100, price: 154 },
          { maxGrams: 250, price: 159 },
          { maxGrams: 500, price: 212 },
          { maxGrams: null, price: 149 },
        ],
        maxWeightKg: 5,
      },
      {
        zone: "Special Destinations",
        slabs: [
          { maxGrams: 100, price: 64 },
          { maxGrams: 250, price: 69 },
          { maxGrams: 500, price: 69 },
          { maxGrams: null, price: 48 },
        ],
        maxWeightKg: 5,
      },
    ];
    const cargoAir = [
      { zone: "Within State", minKg: 3, ratePerKg: 112 },
      { zone: "Within Zone", minKg: 3, ratePerKg: 149 },
      { zone: "Metros", minKg: 3, ratePerKg: 191 },
      { zone: "Rest of India", minKg: 3, ratePerKg: 223 },
      { zone: "Special Destinations", minKg: 3, ratePerKg: 69 },
    ];
    const cargoSurface = [
      { zone: "Within City", minKg: 3, ratePerKg: 69 },
      { zone: "Within State", minKg: 3, ratePerKg: 75 },
      { zone: "Within Zone", minKg: 3, ratePerKg: 91 },
      { zone: "Metros", minKg: 5, ratePerKg: 112 },
      { zone: "Rest of India", minKg: 5, ratePerKg: 138 },
      { zone: "Special Destinations", minKg: 5, ratePerKg: 53 },
    ];
    const existing = new Set(
      allTariffs.map((t) => `${t.brandName}|${t.productType}|${t.zone}`),
    );
    const toAdd: CourierTariff[] = [
      ...expressData
        .filter((z) => !existing.has(`DTDC|Express|${z.zone}`))
        .map((z, _i) => ({
          id: generateId(),
          companyId: SHARED_DATA_ID,
          brandId: DTDC_BRAND_ID,
          brandName: "DTDC",
          productType: "Express",
          zone: z.zone,
          transportMode: "Both" as const,
          tariffKind: "selling" as const,
          pricingMode: "slab" as const,
          slabs: z.slabs,
          maxWeightKg: z.maxWeightKg,
          isGSTInclusive: true,
          isActive: true,
        })),
      ...cargoAir
        .filter((z) => !existing.has(`DTDC|Cargo Air|${z.zone}`))
        .map((z) => ({
          id: generateId(),
          companyId: SHARED_DATA_ID,
          brandId: DTDC_BRAND_ID,
          brandName: "DTDC",
          productType: "Cargo Air",
          zone: z.zone,
          transportMode: "Air" as const,
          tariffKind: "selling" as const,
          pricingMode: "per_kg" as const,
          minKg: z.minKg,
          ratePerKg: z.ratePerKg,
          isGSTInclusive: true,
          isActive: true,
        })),
      ...cargoSurface
        .filter((z) => !existing.has(`DTDC|Cargo Surface|${z.zone}`))
        .map((z) => ({
          id: generateId(),
          companyId: SHARED_DATA_ID,
          brandId: DTDC_BRAND_ID,
          brandName: "DTDC",
          productType: "Cargo Surface",
          zone: z.zone,
          transportMode: "Surface" as const,
          tariffKind: "selling" as const,
          pricingMode: "per_kg" as const,
          minKg: z.minKg,
          ratePerKg: z.ratePerKg,
          isGSTInclusive: true,
          isActive: true,
        })),
    ];
    if (toAdd.length === 0) {
      toast.info("DTDC tariffs already loaded");
      return;
    }
    const updated = [...allTariffs, ...toAdd];
    setTariffs(SHARED_DATA_ID, updated);
    setAllTariffs(updated);
    toast.success(`Loaded ${toAdd.length} DTDC default tariff rates`);
  };

  const overrideCount = Object.values(overrides).filter(
    (v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0,
  ).length;

  const handleSave = () => {
    const assignments: CustomerTariffAssignment[] = [];
    for (const [tariffId, val] of Object.entries(overrides)) {
      const price = Number(val);
      if (val !== "" && !Number.isNaN(price) && price > 0) {
        const tariff = activeTariffs.find((t) => t.id === tariffId);
        if (tariff) {
          assignments.push({
            tariffId,
            brandName: tariff.brandName,
            productType: tariff.productType,
            zone: tariff.zone,
            customPrice: price,
          });
        }
      }
    }
    const updated = { ...tariffMap, [customer.id]: assignments };
    setCustomerTariffMap(SHARED_DATA_ID, updated);
    toast.success(
      `Saved ${assignments.length} custom rate${assignments.length !== 1 ? "s" : ""} for ${customer.name}`,
    );
    onClose();
  };

  const handleClearAll = () => {
    setOverrides({});
  };

  const getTariffSummary = (t: CourierTariff): string => {
    if (t.pricingMode === "per_kg") {
      return `Min ${t.minKg ?? 1}kg × ₹${t.ratePerKg ?? 0}/kg`;
    }
    const slabs = t.slabs ?? [];
    if (slabs.length === 0) return "—";
    const first = slabs[0];
    return `From ₹${first.price} (${first.maxGrams ? `≤${first.maxGrams}g` : "addl"})`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl w-[95vw] max-h-[92vh] flex flex-col overflow-hidden"
        data-ocid="customer.tariff.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Custom Tariff Rates — {customer.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Set custom prices for this customer. Leave blank to use standard
            rates.
            {overrideCount > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">
                {overrideCount} custom rate{overrideCount !== 1 ? "s" : ""} set
              </Badge>
            )}
          </p>
        </DialogHeader>

        {activeTariffs.length === 0 ? (
          <div
            className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground gap-4"
            data-ocid="customer.tariff.empty_state"
          >
            <Tag className="w-14 h-14 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                No tariff entries found
              </p>
              <p className="text-xs mt-1 text-muted-foreground max-w-xs">
                Load DTDC default tariffs now, or go to the Tariff Rates page to
                add tariffs for any brand.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleLoadDTDCDefaults}
                data-ocid="customer.tariff.load_defaults_button"
              >
                <Download className="w-3.5 h-3.5" />
                Load DTDC Defaults (17 rates)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  onClose();
                  // Navigate hint — user needs to go to Tariff Rates page
                  toast.info(
                    "Go to Tariff Rates in the sidebar to add rates for other brands",
                  );
                }}
                data-ocid="customer.tariff.goto_tariff_button"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Go to Tariff Rates
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Tabs
              defaultValue={brands[0] ?? ""}
              className="w-full flex flex-col flex-1 min-h-0"
            >
              <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-3 shrink-0">
                {brands.map((brand) => {
                  const brandOverrides = activeTariffs
                    .filter((t) => t.brandName === brand)
                    .filter(
                      (t) =>
                        overrides[t.id] !== undefined &&
                        overrides[t.id] !== "" &&
                        Number(overrides[t.id]) > 0,
                    ).length;
                  return (
                    <TabsTrigger
                      key={brand}
                      value={brand}
                      className="text-xs relative"
                      data-ocid="customer.tariff.tab"
                    >
                      {brand}
                      {brandOverrides > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] bg-blue-600 text-white rounded-full">
                          {brandOverrides}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {brands.map((brand) => {
                const brandTariffs = activeTariffs.filter(
                  (t) => t.brandName === brand,
                );
                return (
                  <TabsContent
                    key={brand}
                    value={brand}
                    className="mt-0 flex-1 min-h-0 overflow-hidden"
                  >
                    <ScrollArea className="h-full w-full rounded-xl border border-border">
                      <div className="min-w-[520px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs w-32">
                                Product Type
                              </TableHead>
                              <TableHead className="text-xs w-36">
                                Zone
                              </TableHead>
                              <TableHead className="text-xs">
                                Standard Rate
                              </TableHead>
                              <TableHead className="text-xs w-44">
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-amber-500" />
                                  Custom Price (₹)
                                </span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {brandTariffs.map((t) => {
                              const hasOverride =
                                overrides[t.id] !== undefined &&
                                overrides[t.id] !== "" &&
                                Number(overrides[t.id]) > 0;
                              return (
                                <TableRow
                                  key={t.id}
                                  className={
                                    hasOverride
                                      ? "bg-blue-50/50"
                                      : "hover:bg-muted/20"
                                  }
                                >
                                  <TableCell className="text-xs font-medium">
                                    {t.productType}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {t.zone}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {getTariffSummary(t)}
                                    {t.isGSTInclusive && (
                                      <span className="ml-1 text-[10px] text-green-600">
                                        (GST incl.)
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="w-44">
                                    <div className="relative">
                                      <IndianRupee className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                      <Input
                                        type="number"
                                        value={overrides[t.id] ?? ""}
                                        onChange={(e) =>
                                          setOverrides((prev) => ({
                                            ...prev,
                                            [t.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Standard rate"
                                        className={`h-8 text-xs pl-7 ${hasOverride ? "border-blue-400 bg-blue-50 text-blue-800" : ""}`}
                                        min="0"
                                        step="0.01"
                                        data-ocid="customer.tariff.input"
                                      />
                                      {hasOverride && (
                                        <button
                                          type="button"
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                          onClick={() =>
                                            setOverrides((prev) => ({
                                              ...prev,
                                              [t.id]: "",
                                            }))
                                          }
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}

        <Separator />
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-destructive hover:bg-destructive/10 mr-auto"
            data-ocid="customer.tariff.delete_button"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear All Overrides
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="customer.tariff.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-ocid="customer.tariff.save_button"
          >
            Save Custom Rates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Customers Page ───────────────────────────────────────────────────────

export function CustomersPage() {
  const {
    customers,
    bills,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    activeCompanyId,
  } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tariffCustomer, setTariffCustomer] = useState<Customer | null>(null);
  const [, forceRefresh] = useReducer((x: number) => x + 1, 0);

  // Import state
  const importFileRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  interface ImportCustomerRow {
    name: string;
    phone: string;
    email: string;
    address: string;
    gstin: string;
    customerType: "registered" | "walking";
    error?: string;
    isDuplicate?: boolean;
  }
  const [importRows, setImportRows] = useState<ImportCustomerRow[]>([]);
  const [importFileName, setImportFileName] = useState("");

  // Load tariff map to show badges — reads from shared storage
  const tariffMap = getCustomerTariffMap(SHARED_DATA_ID);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [locationLink, setLocationLink] = useState("");
  const [customerType, setCustomerType] = useState<"registered" | "walking">(
    "registered",
  );

  // GST verification state
  const [gstLoading, setGstLoading] = useState(false);
  const [gstStatus, setGstStatus] = useState<"idle" | "valid" | "invalid">(
    "idle",
  );

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setLocationLink("");
    setCustomerType("registered");
    setEditCustomer(null);
    setGstStatus("idle");
    setGstLoading(false);
  };

  const handleVerifyGST = async () => {
    if (!validateGSTINFormat(gstin)) {
      toast.error("Invalid GSTIN format (e.g. 33AABCU9603R1ZM)");
      setGstStatus("invalid");
      return;
    }
    setGstLoading(true);
    setGstStatus("idle");
    try {
      const data = await verifyGSTIN(gstin);
      if (data) {
        if (data.businessName) setName(data.businessName);
        if (data.address) setAddress(data.address);
        setGstStatus("valid");
        toast.success(
          `GST verified: ${data.businessName || data.state || "Valid"}`,
        );
      } else {
        setGstStatus("invalid");
        toast.error(
          "Could not verify GST number. Check the number and try again.",
        );
      }
    } catch {
      setGstStatus("invalid");
      toast.error("GST verification failed");
    } finally {
      setGstLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || c.customerType === filterType;
      return matchSearch && matchType;
    });
  }, [customers, search, filterType]);

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };
  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setAddress(c.address || "");
    setGstin(c.gstin || "");
    setLocationLink(c.locationLink || "");
    setCustomerType(c.customerType);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name || !phone) {
      toast.error("Name and phone required");
      return;
    }
    const customer: Customer = {
      id: editCustomer?.id || generateId(),
      companyId: activeCompanyId,
      customerType,
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      gstin: gstin || undefined,
      locationLink: locationLink || undefined,
      totalPurchases: editCustomer?.totalPurchases || 0,
      isActive: true,
    };
    if (editCustomer) {
      updateCustomer(customer);
      toast.success("Customer updated");
    } else {
      addCustomer(customer);
      toast.success("Customer added");
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    setDeleteId(null);
    toast.success("Customer deleted");
  };

  const getCustomerBills = (customerId: string) =>
    bills.filter((b) => b.customerId === customerId);

  const handleExportCustomers = () => {
    const registeredCustomers = customers.filter(
      (c) => c.customerType === "registered",
    );
    if (registeredCustomers.length === 0) {
      toast.info("No registered customers to export");
      return;
    }
    exportToCSV(
      "customers_export.csv",
      ["Name", "Phone", "Email", "Address", "GSTIN", "Customer Type"],
      registeredCustomers.map((c) => [
        c.name,
        c.phone,
        c.email || "",
        c.address || "",
        c.gstin || "",
        c.customerType,
      ]),
    );
    toast.success(`Exported ${registeredCustomers.length} customers`);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }
      const existingPhones = new Set(customers.map((c) => c.phone));
      const parsed: ImportCustomerRow[] = [];
      for (let i = 1; i < rows.length; i++) {
        const [
          name = "",
          phone = "",
          email = "",
          address = "",
          gstin = "",
          typeRaw = "registered",
        ] = rows[i];
        const customerType: "registered" | "walking" = typeRaw
          .toLowerCase()
          .includes("walk")
          ? "walking"
          : "registered";
        const error = !name.trim()
          ? "Name is required"
          : !phone.trim()
            ? "Phone is required"
            : undefined;
        const isDuplicate = !!phone.trim() && existingPhones.has(phone.trim());
        parsed.push({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          gstin: gstin.trim(),
          customerType,
          error,
          isDuplicate,
        });
      }
      setImportRows(parsed);
      setShowImportDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    const valid = importRows.filter((r) => !r.error && !r.isDuplicate);
    if (valid.length === 0) {
      toast.error("No new valid rows to import");
      return;
    }
    for (const row of valid) {
      addCustomer({
        id: generateId(),
        companyId: activeCompanyId,
        customerType: row.customerType,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        address: row.address || undefined,
        gstin: row.gstin || undefined,
        totalPurchases: 0,
        isActive: true,
      });
    }
    toast.success(`Imported ${valid.length} customers`);
    setShowImportDialog(false);
    setImportRows([]);
    setImportFileName("");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} customers
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCustomers}
            data-ocid="customers.export.button"
          >
            <FileDown className="w-4 h-4 mr-1" /> Export
          </Button>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-xs border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer">
              <FileUp className="w-3.5 h-3.5" /> Import
            </span>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFileChange}
              data-ocid="customers.import.upload_button"
            />
          </label>
          <Button
            onClick={openAdd}
            size="sm"
            data-ocid="customers.primary_button"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Customers",
            value: customers.length,
            icon: User,
            color: "text-primary",
          },
          {
            label: "Registered",
            value: customers.filter((c) => c.customerType === "registered")
              .length,
            icon: UserCheck,
            color: "text-green-600",
          },
          {
            label: "Walking",
            value: customers.filter((c) => c.customerType === "walking").length,
            icon: User,
            color: "text-amber-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-border p-4 shadow-xs flex items-center gap-3"
            >
              <Icon className={`w-8 h-8 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="pl-9 text-sm"
            data-ocid="customers.search_input"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="text-sm w-36" data-ocid="customers.select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="walking">Walking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="customers.table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">Total Purchases</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="customers.empty_state"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const overrideCount = (tariffMap[c.id] ?? []).length;
                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/20"
                      data-ocid={`customers.item.${idx + 1}`}
                    >
                      <TableCell className="text-xs font-semibold">
                        {c.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${c.customerType === "registered" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {c.customerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.phone}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.email || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {c.gstin || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {formatCurrency(c.totalPurchases)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setViewCustomer(c)}
                            data-ocid={`customers.edit_button.${idx + 1}`}
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(c)}
                            title="Edit customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          {c.locationLink && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600"
                                title="Copy location link"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    c.locationLink!,
                                  );
                                  toast.success("Location link copied");
                                }}
                                data-ocid={`customers.copy_location.button.${idx + 1}`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600"
                                title="Share location via WhatsApp"
                                onClick={() => {
                                  window.open(
                                    `https://wa.me/?text=${encodeURIComponent(c.locationLink!)}`,
                                    "_blank",
                                  );
                                }}
                                data-ocid={`customers.whatsapp_location.button.${idx + 1}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {c.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                              title="Send WhatsApp to customer"
                              onClick={() => {
                                const phone = c.phone.replace(/\D/g, "");
                                const msg = `Hi ${c.name},\nYour account with SKS Global Export:\n📋 Account: ${c.id.slice(-6).toUpperCase()}\n📞 Phone: ${c.phone}\n📍 Address: ${c.address || "N/A"}\n💰 Total Purchases: ₹${c.totalPurchases}\n\nThank you for your business! 🙏`;
                                window.open(
                                  `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`,
                                  "_blank",
                                );
                              }}
                              data-ocid={`customers.whatsapp_direct.button.${idx + 1}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {c.customerType === "registered" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 relative"
                              onClick={() => setTariffCustomer(c)}
                              title="Manage Custom Tariff Rates"
                              data-ocid={`customers.tariff.open_modal_button.${idx + 1}`}
                            >
                              <Tag className="w-3.5 h-3.5" />
                              {overrideCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-blue-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                  {overrideCount > 9 ? "9+" : overrideCount}
                                </span>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteId(c.id)}
                            data-ocid={`customers.delete_button.${idx + 1}`}
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <DialogContent data-ocid="customers.dialog">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit" : "Add"} Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Customer Type</Label>
                <Select
                  value={customerType}
                  onValueChange={(v) =>
                    setCustomerType(v as "registered" | "walking")
                  }
                >
                  <SelectTrigger
                    className="mt-1 text-sm"
                    data-ocid="customers.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Name*</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-sm"
                  data-ocid="customers.input"
                />
              </div>
              <div>
                <Label className="text-xs">Phone*</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 text-sm"
                  data-ocid="customers.input"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">GSTIN</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      value={gstin}
                      onChange={(e) => {
                        setGstin(e.target.value.toUpperCase());
                        setGstStatus("idle");
                      }}
                      placeholder="33AABCU9603R1ZM"
                      className={`text-sm font-mono ${
                        gstStatus === "valid"
                          ? "border-green-500 bg-green-50"
                          : gstStatus === "invalid"
                            ? "border-red-400 bg-red-50"
                            : ""
                      }`}
                      maxLength={15}
                      data-ocid="customers.gstin.input"
                    />
                    {gstStatus === "valid" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleVerifyGST}
                    disabled={gstin.length < 15 || gstLoading}
                    className={`shrink-0 ${gstStatus === "valid" ? "border-green-500 text-green-700" : ""}`}
                    data-ocid="customers.gst.verify_button"
                  >
                    {gstLoading ? (
                      <span className="flex items-center gap-1">
                        <svg
                          className="animate-spin w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-label="Verifying"
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
                        Verifying
                      </span>
                    ) : gstStatus === "valid" ? (
                      "✓ Verified"
                    ) : (
                      "Verify GST"
                    )}
                  </Button>
                </div>
                {gstin.length > 0 && gstin.length < 15 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {15 - gstin.length} more characters needed
                  </p>
                )}
                {gstStatus === "valid" && (
                  <p className="text-xs text-green-600 mt-0.5">
                    GST verified — business details auto-filled
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 text-sm resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-blue-500" />
                Location Link (Google Maps / Apple Maps)
              </Label>
              <Input
                type="url"
                value={locationLink}
                onChange={(e) => setLocationLink(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="mt-1 text-sm"
                data-ocid="customers.location_link.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              data-ocid="customers.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="customers.submit_button">
              {editCustomer ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!viewCustomer}
        onOpenChange={(open) => !open && setViewCustomer(null)}
      >
        <DialogContent className="max-w-2xl" data-ocid="customers.view.dialog">
          <DialogHeader>
            <DialogTitle>Customer: {viewCustomer?.name}</DialogTitle>
          </DialogHeader>
          {viewCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{viewCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{viewCustomer.email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">GSTIN</p>
                  <p className="font-mono">{viewCustomer.gstin || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <Badge variant="outline" className="text-xs">
                    {viewCustomer.customerType}
                  </Badge>
                </div>
                {viewCustomer.address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p>{viewCustomer.address}</p>
                  </div>
                )}
                {viewCustomer.locationLink && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">
                      Location Link
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={viewCustomer.locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm underline truncate max-w-xs flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        Open Location
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-green-600"
                        title="Copy location link"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            viewCustomer.locationLink!,
                          );
                          toast.success("Location link copied");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-emerald-600"
                        title="Share via WhatsApp"
                        onClick={() => {
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(viewCustomer.locationLink!)}`,
                            "_blank",
                          );
                        }}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced WhatsApp Section */}
              {viewCustomer.phone && (
                <div className="rounded-xl border border-green-200 bg-green-50/60 p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-800">
                    <MessageCircle className="w-4 h-4" />
                    Advanced WhatsApp Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      onClick={() => {
                        const phone = viewCustomer.phone.replace(/\D/g, "");
                        const msg = `Hi ${viewCustomer.name},\nYour account with SKS Global Export:\n📋 Account: ${viewCustomer.id.slice(-6).toUpperCase()}\n📞 Phone: ${viewCustomer.phone}\n📍 Address: ${viewCustomer.address || "N/A"}\n💰 Total Purchases: ₹${viewCustomer.totalPurchases}\n\nThank you for your business! 🙏`;
                        window.open(
                          `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`,
                          "_blank",
                        );
                      }}
                      data-ocid="customers.whatsapp_details.button"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Share Your Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-400 text-green-700 hover:bg-green-50 gap-1.5"
                      onClick={() => {
                        const phone = viewCustomer.phone.replace(/\D/g, "");
                        const outstanding = viewCustomer.totalPurchases || 0;
                        const msg = `Dear ${viewCustomer.name},\n\nThis is a friendly payment reminder from SKS Global Export.\n\n💰 Outstanding Balance: ₹${outstanding}\n📅 Kindly clear the dues at your earliest convenience.\n\nFor queries, please contact us directly.\n\nThank you! 🙏`;
                        window.open(
                          `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`,
                          "_blank",
                        );
                      }}
                      data-ocid="customers.whatsapp_reminder.button"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Send Payment Reminder
                    </Button>
                    {viewCustomer.locationLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-400 text-green-700 hover:bg-green-50 gap-1.5"
                        onClick={() => {
                          const phone = viewCustomer.phone.replace(/\D/g, "");
                          const msg = `📍 Location of ${viewCustomer.name}:\n${viewCustomer.locationLink}`;
                          window.open(
                            `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`,
                            "_blank",
                          );
                        }}
                        data-ocid="customers.whatsapp_location_direct.button"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Share Location
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Tariff Rates Section */}
              {viewCustomer.customerType === "registered" &&
                (() => {
                  const assignments = tariffMap[viewCustomer.id] ?? [];
                  if (assignments.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-blue-600" />
                        Custom Tariff Rates
                        <Badge className="bg-blue-100 text-blue-700 text-xs ml-1">
                          {assignments.length} override
                          {assignments.length !== 1 ? "s" : ""}
                        </Badge>
                      </h4>
                      <div className="rounded-lg border border-blue-100 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-blue-50/50">
                              <TableHead className="text-xs">Brand</TableHead>
                              <TableHead className="text-xs">
                                Product Type
                              </TableHead>
                              <TableHead className="text-xs">Zone</TableHead>
                              <TableHead className="text-xs text-right">
                                Your Price
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignments.map((a) => (
                              <TableRow key={a.tariffId}>
                                <TableCell className="text-xs font-medium">
                                  {a.brandName}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {a.productType}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {a.zone}
                                </TableCell>
                                <TableCell className="text-xs font-bold text-blue-700 text-right">
                                  {formatCurrency(a.customPrice)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })()}

              <div>
                <h4 className="text-sm font-semibold mb-2">Purchase History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getCustomerBills(viewCustomer.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No purchases yet
                    </p>
                  ) : (
                    getCustomerBills(viewCustomer.id).map((b) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-center p-2 bg-muted/30 rounded-lg text-xs"
                      >
                        <div>
                          <p className="font-medium">{b.billNo}</p>
                          <p className="text-muted-foreground">
                            {formatDate(b.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(b.total)}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${b.paymentStatus === "paid" ? "status-paid" : "status-pending"}`}
                          >
                            {b.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setViewCustomer(null)}
              data-ocid="customers.view.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="customers.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="customers.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive"
              data-ocid="customers.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {tariffCustomer && (
        <CustomerTariffDialog
          customer={tariffCustomer}
          activeCompanyId={activeCompanyId}
          onClose={() => {
            setTariffCustomer(null);
            forceRefresh();
          }}
        />
      )}
      <Dialog
        open={showImportDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowImportDialog(false);
            setImportRows([]);
            setImportFileName("");
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[85vh] flex flex-col"
          data-ocid="customers.import.dialog"
        >
          <DialogHeader>
            <DialogTitle>Import Customers — {importFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-3">
            <div className="flex gap-3 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>
                <strong className="text-green-600">
                  {importRows.filter((r) => !r.error && !r.isDuplicate).length}
                </strong>{" "}
                new •{" "}
                <strong className="text-amber-600">
                  {importRows.filter((r) => r.isDuplicate).length}
                </strong>{" "}
                duplicates (skipped) •{" "}
                <strong className="text-destructive">
                  {importRows.filter((r) => !!r.error).length}
                </strong>{" "}
                errors
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-primary underline"
                onClick={() =>
                  downloadCSVString(
                    "customers_sample.csv",
                    getSampleCustomersCSV(),
                  )
                }
              >
                <Download className="w-3.5 h-3.5 inline mr-0.5" />
                Download Sample
              </button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">GSTIN</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row, idx) => (
                      <TableRow
                        // biome-ignore lint/suspicious/noArrayIndexKey: preview list
                        key={idx}
                        className={
                          row.error
                            ? "bg-red-50"
                            : row.isDuplicate
                              ? "bg-amber-50"
                              : "hover:bg-muted/10"
                        }
                        data-ocid={`customers.import.row.${idx + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.name || (
                            <span className="text-destructive italic">
                              missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.email || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.gstin || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.customerType}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.error ? (
                            <span className="text-destructive font-medium">
                              ✗ {row.error}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-amber-600 font-medium">
                              ⚠ Duplicate
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              ✓ New
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportRows([]);
                setImportFileName("");
              }}
              data-ocid="customers.import.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={
                importRows.filter((r) => !r.error && !r.isDuplicate).length ===
                0
              }
              data-ocid="customers.import.submit_button"
            >
              Import{" "}
              {importRows.filter((r) => !r.error && !r.isDuplicate).length}{" "}
              Customers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
