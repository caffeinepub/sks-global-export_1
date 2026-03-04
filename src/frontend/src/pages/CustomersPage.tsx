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
  Download,
  Edit,
  ExternalLink,
  Eye,
  IndianRupee,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  CourierTariff,
  Customer,
  CustomerTariffAssignment,
} from "../types";
import { formatCurrency, formatDate, generateId } from "../utils/helpers";
import {
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
  activeCompanyId,
  onClose,
}: CustomerTariffDialogProps) {
  const [allTariffs, setAllTariffs] = useState<CourierTariff[]>(() =>
    getTariffs(activeCompanyId),
  );
  const tariffMap = getCustomerTariffMap(activeCompanyId);
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
          companyId: activeCompanyId,
          brandId: DTDC_BRAND_ID,
          brandName: "DTDC",
          productType: "Express",
          zone: z.zone,
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
          companyId: activeCompanyId,
          brandId: DTDC_BRAND_ID,
          brandName: "DTDC",
          productType: "Cargo Air",
          zone: z.zone,
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
          companyId: activeCompanyId,
          brandId: DTDC_BRAND_ID,
          brandName: "DTDC",
          productType: "Cargo Surface",
          zone: z.zone,
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
    setTariffs(activeCompanyId, updated);
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
    setCustomerTariffMap(activeCompanyId, updated);
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

  // Load tariff map to show badges — reads from localStorage on each render
  const tariffMap = getCustomerTariffMap(activeCompanyId);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [customerType, setCustomerType] = useState<"registered" | "walking">(
    "registered",
  );

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setCustomerType("registered");
    setEditCustomer(null);
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} customers
          </p>
        </div>
        <Button
          onClick={openAdd}
          size="sm"
          data-ocid="customers.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Customer
        </Button>
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setViewCustomer(c)}
                            data-ocid={`customers.edit_button.${idx + 1}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(c)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
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
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="33XXXXX..."
                  className="mt-1 text-sm"
                />
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

      {/* View Customer History */}
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
              </div>

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

      {/* Delete Confirm */}
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

      {/* Customer Tariff Dialog */}
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
    </div>
  );
}
