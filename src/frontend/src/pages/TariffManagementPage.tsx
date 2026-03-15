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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Layers,
  Plus,
  Tag,
  Trash2,
  TrendingUp,
  Wind,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { CourierBrand, CourierTariff, TariffWeightSlab } from "../types";
import { generateId } from "../utils/helpers";
import { SHARED_DATA_ID, getTariffs, setTariffs } from "../utils/storage";

const ZONE_OPTIONS = [
  "Within City",
  "Within State",
  "Within Zone",
  "Metros",
  "Rest of India",
  "Special Destinations",
];

const PRODUCT_TYPE_SUGGESTIONS = [
  "Express",
  "Cargo Air",
  "Cargo Surface",
  "D Express",
  "Lite",
  "Priority",
  "Reverse Pickup",
  "Value Plus",
  "Ground",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlabWithKey extends TariffWeightSlab {
  _key: string;
}

interface TariffFormState {
  tariffName: string;
  showInBilling: boolean;
  billingCategory: string;
  brandId: string;
  brandName: string;
  productType: string;
  zone: string;
  customZone: string;
  transportMode: "Air" | "Surface" | "Both";
  pricingMode: "slab" | "per_kg";
  // Slab mode fields
  slabs: SlabWithKey[]; // fixed weight slabs (maxGrams != null)
  addlSlabPrice: string; // price for the additional per-unit slab
  addlUnitGrams: string; // unit size for the additional slab (default 500)
  aboveSlabRatePerKg: string; // per-kg rate above all fixed slabs (optional)
  maxWeightKg: string;
  // Per KG mode fields
  minKg: string;
  ratePerKg: string;
  // Common
  isGSTInclusive: boolean;
  isActive: boolean;
}

const emptyForm = (): TariffFormState => ({
  tariffName: "",
  showInBilling: true,
  billingCategory: "",
  brandId: "",
  brandName: "",
  productType: "Express",
  zone: "Within City",
  customZone: "",
  transportMode: "Both",
  pricingMode: "slab",
  slabs: [
    { _key: generateId(), maxGrams: 100, price: 0 },
    { _key: generateId(), maxGrams: 250, price: 0 },
    { _key: generateId(), maxGrams: 500, price: 0 },
  ],
  addlSlabPrice: "0",
  addlUnitGrams: "500",
  aboveSlabRatePerKg: "",
  maxWeightKg: "",
  minKg: "1",
  ratePerKg: "0",
  isGSTInclusive: true,
  isActive: true,
});

// ── Helper: describe a tariff for display ──────────────────────────────────────

function describeTariff(t: CourierTariff): string {
  if (t.pricingMode === "per_kg") {
    return `₹${t.ratePerKg}/kg (min ${t.minKg}kg)`;
  }
  const slabs = t.slabs ?? [];
  const fixedSlabs = slabs.filter((s) => s.maxGrams !== null);
  const addlSlab = slabs.find((s) => s.maxGrams === null);
  const parts: string[] = fixedSlabs
    .slice(0, 2)
    .map((s) => `≤${s.maxGrams}g→₹${s.price}`);
  if (addlSlab) {
    const unit = addlSlab.unitGrams ?? 500;
    parts.push(`+₹${addlSlab.price}/${unit}g`);
  }
  if (t.aboveSlabRatePerKg) {
    parts.push(`₹${t.aboveSlabRatePerKg}/kg above`);
  }
  return parts.join(", ") || "—";
}

function transportModeBadge(mode: "Air" | "Surface" | "Both" | undefined) {
  const m = mode ?? "Both";
  if (m === "Air")
    return (
      <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">
        ✈ Air
      </Badge>
    );
  if (m === "Surface")
    return (
      <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
        🚛 Surface
      </Badge>
    );
  return (
    <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">
      Both
    </Badge>
  );
}

// ── Tariff Management Page ─────────────────────────────────────────────────────

export function TariffManagementPage() {
  const { activeCompanyId, products } = useAppStore();

  const courierBrands = products.filter(
    (p) => p.type === "courier_awb",
  ) as CourierBrand[];

  const [tariffs, setLocalTariffs] = useState<CourierTariff[]>(() =>
    getTariffs(SHARED_DATA_ID),
  );

  const [filterBrand, setFilterBrand] = useState("all");
  const [filterProductType, setFilterProductType] = useState("");
  const [filterTariffName, setFilterTariffName] = useState("");
  const [filterTransportMode, setFilterTransportMode] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<CourierTariff | null>(
    null,
  );
  const [form, setForm] = useState<TariffFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CourierTariff | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload tariffs when company switches (shared data)
  useEffect(() => {
    setLocalTariffs(getTariffs(SHARED_DATA_ID));
  }, [activeCompanyId]);

  const saveTariffs = (updated: CourierTariff[]) => {
    setLocalTariffs(updated);
    setTariffs(SHARED_DATA_ID, updated);
  };

  // ── Filters ────────────────────────────────────────────────────────────────

  const filtered = tariffs.filter((t) => {
    const matchBrand = filterBrand === "all" || t.brandName === filterBrand;
    const matchType =
      !filterProductType ||
      t.productType.toLowerCase().includes(filterProductType.toLowerCase());
    const matchMode =
      filterTransportMode === "all" ||
      (t.transportMode ?? "Both") === filterTransportMode;
    const displayName = t.tariffName ?? `${t.brandName} ${t.productType}`;
    const matchName =
      !filterTariffName ||
      displayName.toLowerCase().includes(filterTariffName.toLowerCase());
    return matchBrand && matchType && matchMode && matchName;
  });

  // Group by brand name for display
  const grouped = filtered.reduce<Record<string, CourierTariff[]>>(
    (acc, tariff) => {
      const key = tariff.brandName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(tariff);
      return acc;
    },
    {},
  );

  const uniqueBrands = [...new Set(tariffs.map((t) => t.brandName))];
  const totalCount = tariffs.length;
  const brandsWithTariffs = uniqueBrands.length;

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingTariff(null);
    const defaultBrand = courierBrands[0];
    const defaultTransportMode =
      (defaultBrand?.transportModes as "Air" | "Surface" | "Both") ?? "Both";
    setForm({
      ...emptyForm(),
      brandId: defaultBrand?.id ?? "",
      brandName: defaultBrand?.brandName ?? "",
      transportMode: defaultTransportMode,
    });
    setDialogOpen(true);
  };

  const openEdit = (tariff: CourierTariff) => {
    setEditingTariff(tariff);
    const isCustomZone = !ZONE_OPTIONS.includes(tariff.zone);

    // Separate fixed slabs from additional slab
    const allSlabs = tariff.slabs ?? [];
    const fixedSlabs = allSlabs.filter((s) => s.maxGrams !== null);
    const addlSlab = allSlabs.find((s) => s.maxGrams === null);

    setForm({
      tariffName: tariff.tariffName ?? "",
      showInBilling: tariff.showInBilling !== false,
      billingCategory: tariff.billingCategory ?? "",
      brandId: tariff.brandId,
      brandName: tariff.brandName,
      productType: tariff.productType,
      zone: isCustomZone ? "Custom" : tariff.zone,
      customZone: isCustomZone ? tariff.zone : "",
      transportMode:
        (tariff.transportMode as "Air" | "Surface" | "Both") ?? "Both",
      pricingMode: tariff.pricingMode,
      slabs: fixedSlabs.map((s) => ({ ...s, _key: generateId() })),
      addlSlabPrice: addlSlab ? String(addlSlab.price) : "0",
      addlUnitGrams: addlSlab?.unitGrams ? String(addlSlab.unitGrams) : "500",
      aboveSlabRatePerKg: tariff.aboveSlabRatePerKg
        ? String(tariff.aboveSlabRatePerKg)
        : "",
      maxWeightKg: tariff.maxWeightKg != null ? String(tariff.maxWeightKg) : "",
      minKg: String(tariff.minKg ?? 1),
      ratePerKg: String(tariff.ratePerKg ?? 0),
      isGSTInclusive: tariff.isGSTInclusive,
      isActive: tariff.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.tariffName.trim()) {
      toast.error("Tariff name is required");
      return;
    }
    if (!form.brandId) {
      toast.error("Please select a courier brand");
      return;
    }
    if (!form.productType.trim()) {
      toast.error("Product type is required");
      return;
    }
    const effectiveZone = form.zone === "Custom" ? form.customZone : form.zone;
    if (!effectiveZone.trim()) {
      toast.error("Zone is required");
      return;
    }

    if (form.pricingMode === "slab" && form.slabs.length === 0) {
      toast.error("Add at least one weight slab");
      return;
    }

    // Build slabs array: fixed slabs + optional additional slab
    let slabs: TariffWeightSlab[] | undefined;
    if (form.pricingMode === "slab") {
      slabs = form.slabs.map(({ _key: _k, ...rest }) => rest);
      const addlPrice = Number(form.addlSlabPrice);
      if (addlPrice > 0) {
        slabs.push({
          maxGrams: null,
          price: addlPrice,
          unitGrams: Number(form.addlUnitGrams) || 500,
        });
      }
    }

    const tariff: CourierTariff = {
      id: editingTariff?.id ?? generateId(),
      companyId: activeCompanyId,
      tariffName: form.tariffName.trim() || undefined,
      showInBilling: form.showInBilling,
      billingCategory: form.billingCategory.trim() || undefined,
      brandId: form.brandId,
      brandName: form.brandName,
      productType: form.productType.trim(),
      zone: effectiveZone.trim(),
      transportMode: form.transportMode,
      tariffKind: "selling",
      pricingMode: form.pricingMode,
      slabs,
      aboveSlabRatePerKg: form.aboveSlabRatePerKg
        ? Number(form.aboveSlabRatePerKg)
        : undefined,
      minKg: form.pricingMode === "per_kg" ? Number(form.minKg) : undefined,
      ratePerKg:
        form.pricingMode === "per_kg" ? Number(form.ratePerKg) : undefined,
      maxWeightKg: form.maxWeightKg ? Number(form.maxWeightKg) : undefined,
      isGSTInclusive: form.isGSTInclusive,
      isActive: form.isActive,
    };

    if (editingTariff) {
      saveTariffs(tariffs.map((t) => (t.id === tariff.id ? tariff : t)));
      toast.success("Tariff updated");
    } else {
      saveTariffs([...tariffs, tariff]);
      toast.success("Tariff added");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveTariffs(tariffs.filter((t) => t.id !== deleteTarget.id));
    toast.success("Tariff deleted");
    setDeleteTarget(null);
  };

  // ── Slab helpers ───────────────────────────────────────────────────────────

  const addSlab = () => {
    setForm((prev) => ({
      ...prev,
      slabs: [...prev.slabs, { _key: generateId(), maxGrams: 0, price: 0 }],
    }));
  };

  const removeSlab = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== idx),
    }));
  };

  const updateSlab = (
    idx: number,
    field: "maxGrams" | "price",
    value: number,
  ) => {
    setForm((prev) => ({
      ...prev,
      slabs: prev.slabs.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  };

  // When brand is selected in form, auto-set transport mode and product type from brand
  const handleBrandChange = (brandId: string) => {
    const brand = courierBrands.find((b) => b.id === brandId);
    const cpList = brand?.courierProducts ?? [];
    const firstProduct = cpList.find((p) => p.isActive !== false) ?? cpList[0];
    setForm((prev) => ({
      ...prev,
      brandId,
      brandName: brand?.brandName ?? "",
      transportMode:
        (brand?.transportModes as "Air" | "Surface" | "Both") ?? "Both",
      // Auto-populate product type from brand's first courier product if available
      productType: firstProduct?.productType ?? prev.productType,
    }));
  };

  // Get courier product types for the currently selected brand
  const selectedBrandForForm = courierBrands.find((b) => b.id === form.brandId);
  const brandCourierProductTypes: string[] =
    selectedBrandForForm?.courierProducts
      ?.filter((p) => p.isActive !== false) // include if isActive is true or undefined
      .map((p) => p.productType) ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Tariff Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage selling tariff rates for all courier brands
          </p>
        </div>
        <Button
          onClick={openAdd}
          data-ocid="tariff.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Tariff
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Entries
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Brands
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {brandsWithTariffs}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Active
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {tariffs.filter((t) => t.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Inactive
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {tariffs.filter((t) => !t.isActive).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <Label className="text-xs mb-1 block text-muted-foreground">
              Filter by Brand
            </Label>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger data-ocid="tariff.brand_filter.select">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Label className="text-xs mb-1 block text-muted-foreground">
              Filter by Transport Mode
            </Label>
            <Select
              value={filterTransportMode}
              onValueChange={setFilterTransportMode}
            >
              <SelectTrigger data-ocid="tariff.transport_filter.select">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Air">Air</SelectItem>
                <SelectItem value="Surface">Surface</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-56">
            <Label className="text-xs mb-1 block text-muted-foreground">
              Search Tariff Name
            </Label>
            <Input
              value={filterTariffName}
              onChange={(e) => setFilterTariffName(e.target.value)}
              placeholder="SPL Rate, Standard…"
              data-ocid="tariff.name.search_input"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs mb-1 block text-muted-foreground">
              Filter by Product Type
            </Label>
            <Input
              value={filterProductType}
              onChange={(e) => setFilterProductType(e.target.value)}
              placeholder="Search product type (e.g. Express, Cargo Air…)"
              data-ocid="tariff.product_type.search_input"
            />
          </div>
        </div>
      </div>

      {/* Tariff Table */}
      {Object.keys(grouped).length === 0 ? (
        <div
          className="bg-white rounded-xl border border-border p-12 text-center"
          data-ocid="tariff.empty_state"
        >
          <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            No tariff entries found
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Click &quot;Add Tariff&quot; to create your first tariff entry
            manually
          </p>
          <Button
            onClick={openAdd}
            className="mt-4"
            data-ocid="tariff.add_first_button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Tariff
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([brandName, brandTariffs]) => (
            <div
              key={brandName}
              className="bg-white rounded-xl border border-border shadow-xs overflow-hidden"
            >
              {/* Brand header */}
              <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {brandName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-foreground">
                    {brandName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {brandTariffs.length} entries
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table data-ocid="tariff.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tariff Name</TableHead>
                      <TableHead>Brand / Product Type</TableHead>
                      <TableHead>Transport</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Price Structure</TableHead>
                      <TableHead className="text-center">GST Incl.</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brandTariffs.map((tariff, idx) => (
                      <TableRow
                        key={tariff.id}
                        data-ocid={`tariff.item.${idx + 1}`}
                        className={cn(!tariff.isActive && "opacity-60")}
                      >
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground text-sm">
                              {tariff.tariffName ||
                                `${tariff.brandName} ${tariff.productType}`}
                            </p>
                            {tariff.showInBilling === false && (
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground"
                              >
                                Hidden from billing
                              </Badge>
                            )}
                            {tariff.billingCategory && (
                              <Badge
                                variant="secondary"
                                className="text-xs ml-1"
                              >
                                {tariff.billingCategory}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground">
                              {tariff.brandName}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium text-primary border-primary/30"
                            >
                              {tariff.productType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transportModeBadge(
                            tariff.transportMode as
                              | "Air"
                              | "Surface"
                              | "Both"
                              | undefined,
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {tariff.zone}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tariff.pricingMode === "slab"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {tariff.pricingMode === "slab"
                              ? "Weight Slabs"
                              : "Per KG"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[200px]">
                          {describeTariff(tariff)}
                          {tariff.maxWeightKg && (
                            <span className="ml-1 text-amber-600">
                              (max {tariff.maxWeightKg}kg)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {tariff.isGSTInclusive ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={tariff.isActive ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              tariff.isActive
                                ? "bg-success/10 text-success border-success/30"
                                : "",
                            )}
                          >
                            {tariff.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => openEdit(tariff)}
                              data-ocid={`tariff.edit_button.${idx + 1}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(tariff)}
                              data-ocid={`tariff.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="tariff.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingTariff ? "Edit Tariff" : "Add New Tariff"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Tariff Name */}
            <div className="space-y-1.5">
              <Label>
                Tariff Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.tariffName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tariffName: e.target.value }))
                }
                placeholder="e.g. SPL Rate, SPL1 Rate, Standard Rate, Customer Special"
                data-ocid="tariff.name.input"
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for this tariff (e.g. Standard, SPL Rate,
                Zone A Rate)
              </p>
            </div>

            {/* Billing Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Billing Category (optional)</Label>
                <Input
                  value={form.billingCategory}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billingCategory: e.target.value,
                    }))
                  }
                  placeholder="e.g. Common, Special, Customer Specific"
                  data-ocid="tariff.billing_category.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Show in Billing/Booking</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={form.showInBilling}
                    onCheckedChange={(v) =>
                      setForm((prev) => ({ ...prev, showInBilling: v }))
                    }
                    data-ocid="tariff.show_in_billing.switch"
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.showInBilling
                      ? "Visible in POS booking"
                      : "Hidden from POS (internal use)"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Turn OFF for internal/special rate tariffs
                </p>
              </div>
            </div>

            {/* Brand & Product Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Courier Brand</Label>
                <Select value={form.brandId} onValueChange={handleBrandChange}>
                  <SelectTrigger data-ocid="tariff.brand.select">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {courierBrands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.brandName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Product Type</Label>
                {brandCourierProductTypes.length > 0 ? (
                  <>
                    <Select
                      value={form.productType}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, productType: v }))
                      }
                    >
                      <SelectTrigger data-ocid="tariff.product_type.select">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandCourierProductTypes.map((pt) => (
                          <SelectItem key={pt} value={pt}>
                            {pt}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          + Enter custom…
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.productType === "__custom__" && (
                      <Input
                        value=""
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            productType: e.target.value,
                          }))
                        }
                        placeholder="Type product name"
                        data-ocid="tariff.product_type.input"
                        autoFocus
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Input
                      value={form.productType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          productType: e.target.value,
                        }))
                      }
                      placeholder="e.g. Express"
                      list="product-type-suggestions"
                      data-ocid="tariff.product_type.input"
                    />
                    <datalist id="product-type-suggestions">
                      {PRODUCT_TYPE_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      Add product types under this brand in Products → Courier
                      Brands to get a dropdown here.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Transport Mode & Zone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-primary" />
                  Mode of Transport
                </Label>
                <Select
                  value={form.transportMode}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      transportMode: v as "Air" | "Surface" | "Both",
                    }))
                  }
                >
                  <SelectTrigger data-ocid="tariff.transport_mode.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Air">✈ Air Only</SelectItem>
                    <SelectItem value="Surface">🚛 Surface Only</SelectItem>
                    <SelectItem value="Both">
                      Both (Air &amp; Surface)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Zone</Label>
                <Select
                  value={form.zone}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, zone: v }))
                  }
                >
                  <SelectTrigger data-ocid="tariff.zone.select">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_OPTIONS.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                    <SelectItem value="Custom">Custom…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.zone === "Custom" && (
                <div className="space-y-1.5 col-span-2">
                  <Label>Custom Zone Name</Label>
                  <Input
                    value={form.customZone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customZone: e.target.value,
                      }))
                    }
                    placeholder="Enter zone name"
                  />
                </div>
              )}
            </div>

            {/* Pricing Mode */}
            <div className="space-y-2">
              <Label>Pricing Mode</Label>
              <div
                className="flex gap-3"
                data-ocid="tariff.pricing_mode.toggle"
              >
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, pricingMode: "slab" }))
                  }
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors",
                    form.pricingMode === "slab"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  Weight Slabs
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, pricingMode: "per_kg" }))
                  }
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors",
                    form.pricingMode === "per_kg"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  Per KG Rate
                </button>
              </div>
            </div>

            {/* Weight Slabs mode */}
            {form.pricingMode === "slab" && (
              <div className="space-y-4">
                {/* Fixed Weight Slabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Weight Slabs{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        (Up to X grams → price)
                      </span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSlab}
                      data-ocid="tariff.slab_add_button"
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Slab
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                            Up to (grams)
                          </th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                            Price (₹)
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {form.slabs.map((slab, idx) => (
                          <tr
                            key={slab._key}
                            className="border-t border-border first:border-0"
                          >
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={slab.maxGrams ?? 0}
                                  onChange={(e) =>
                                    updateSlab(
                                      idx,
                                      "maxGrams",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-7 w-24 text-xs"
                                  placeholder="Grams"
                                  min="1"
                                />
                                <span className="text-xs text-muted-foreground">
                                  g
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">
                                  ₹
                                </span>
                                <Input
                                  type="number"
                                  value={slab.price}
                                  onChange={(e) =>
                                    updateSlab(
                                      idx,
                                      "price",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-7 w-24 text-xs"
                                  placeholder="0"
                                  min="0"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => removeSlab(idx)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {form.slabs.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-3 py-4 text-center text-xs text-muted-foreground"
                            >
                              No fixed slabs yet — click Add Slab
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Slab */}
                <div className="rounded-lg border border-primary/20 bg-primary/3 p-3 space-y-2">
                  <Label className="text-xs font-semibold text-primary">
                    Additional Weight Slab{" "}
                    <span className="font-normal text-muted-foreground">
                      (for weight beyond fixed slabs)
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Per unit size (grams)
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={form.addlUnitGrams}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              addlUnitGrams: e.target.value,
                            }))
                          }
                          className="h-7 text-xs"
                          placeholder="500"
                          min="1"
                          data-ocid="tariff.addl_unit_grams.input"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          g
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Price per unit (₹) — 0 = no addl slab
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={form.addlSlabPrice}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              addlSlabPrice: e.target.value,
                            }))
                          }
                          className="h-7 text-xs"
                          placeholder="0"
                          min="0"
                          data-ocid="tariff.addl_slab_price.input"
                        />
                      </div>
                    </div>
                  </div>
                  {Number(form.addlSlabPrice) > 0 && (
                    <p className="text-xs text-primary">
                      → Additional per {form.addlUnitGrams || 500}g = ₹
                      {form.addlSlabPrice}
                    </p>
                  )}
                </div>

                {/* Above all slabs per-kg rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Above All Slabs Rate (₹/kg) — optional
                    </Label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={form.aboveSlabRatePerKg}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            aboveSlabRatePerKg: e.target.value,
                          }))
                        }
                        placeholder="e.g. 25"
                        className="text-sm"
                        data-ocid="tariff.above_slab_rate.input"
                      />
                      <span className="text-xs text-muted-foreground">/kg</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Max Weight Limit (kg) — optional
                    </Label>
                    <Input
                      type="number"
                      value={form.maxWeightKg}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxWeightKg: e.target.value,
                        }))
                      }
                      placeholder="e.g. 3 or 5"
                      className="text-sm"
                      data-ocid="tariff.max_weight.input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Per KG mode */}
            {form.pricingMode === "per_kg" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Minimum Weight (kg)</Label>
                  <Input
                    type="number"
                    value={form.minKg}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, minKg: e.target.value }))
                    }
                    placeholder="e.g. 3"
                    className="text-sm"
                    step="0.5"
                    data-ocid="tariff.min_kg.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rate per KG (₹)</Label>
                  <Input
                    type="number"
                    value={form.ratePerKg}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        ratePerKg: e.target.value,
                      }))
                    }
                    placeholder="e.g. 112"
                    className="text-sm"
                    data-ocid="tariff.rate_per_kg.input"
                  />
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isGSTInclusive}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, isGSTInclusive: v }))
                  }
                  data-ocid="tariff.gst_inclusive.switch"
                />
                <div>
                  <Label className="text-sm cursor-pointer">
                    GST Inclusive
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Price already includes GST
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, isActive: v }))
                  }
                  data-ocid="tariff.active.switch"
                />
                <div>
                  <Label className="text-sm cursor-pointer">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Available in POS
                  </p>
                </div>
              </div>
            </div>

            {form.isGSTInclusive && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  GST-inclusive tariffs: the system will extract the GST
                  component from the tariff price so the customer pays exactly
                  the tariff amount.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="tariff.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="tariff.save_button">
              {editingTariff ? "Update Tariff" : "Add Tariff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tariff Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the{" "}
              <strong>
                {deleteTarget?.brandName} — {deleteTarget?.productType} (
                {deleteTarget?.zone})
              </strong>{" "}
              tariff. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              data-ocid="tariff.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-ocid="tariff.confirm_button"
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
