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
  Download,
  Edit2,
  Layers,
  Plus,
  Tag,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { CourierBrand, CourierTariff, TariffWeightSlab } from "../types";
import { generateId } from "../utils/helpers";
import { getTariffs, setTariffs } from "../utils/storage";

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

// ── DTDC Default Tariff Data ──────────────────────────────────────────────────

function buildDTDCDefaultTariffs(
  companyId: string,
  brandId: string,
): Omit<CourierTariff, "id">[] {
  const expressZones = [
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

  const cargoAirZones = [
    { zone: "Within State", minKg: 3, ratePerKg: 112 },
    { zone: "Within Zone", minKg: 3, ratePerKg: 149 },
    { zone: "Metros", minKg: 3, ratePerKg: 191 },
    { zone: "Rest of India", minKg: 3, ratePerKg: 223 },
    { zone: "Special Destinations", minKg: 3, ratePerKg: 69 },
  ];

  const cargoSurfaceZones = [
    { zone: "Within City", minKg: 3, ratePerKg: 69 },
    { zone: "Within State", minKg: 3, ratePerKg: 75 },
    { zone: "Within Zone", minKg: 3, ratePerKg: 91 },
    { zone: "Metros", minKg: 5, ratePerKg: 112 },
    { zone: "Rest of India", minKg: 5, ratePerKg: 138 },
    { zone: "Special Destinations", minKg: 5, ratePerKg: 53 },
  ];

  return [
    ...expressZones.map((z) => ({
      companyId,
      brandId,
      brandName: "DTDC",
      productType: "Express",
      zone: z.zone,
      pricingMode: "slab" as const,
      slabs: z.slabs,
      maxWeightKg: z.maxWeightKg,
      isGSTInclusive: true,
      isActive: true,
    })),
    ...cargoAirZones.map((z) => ({
      companyId,
      brandId,
      brandName: "DTDC",
      productType: "Cargo Air",
      zone: z.zone,
      pricingMode: "per_kg" as const,
      minKg: z.minKg,
      ratePerKg: z.ratePerKg,
      isGSTInclusive: true,
      isActive: true,
    })),
    ...cargoSurfaceZones.map((z) => ({
      companyId,
      brandId,
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
}

// ── Empty form state ──────────────────────────────────────────────────────────

interface SlabWithKey extends TariffWeightSlab {
  _key: string;
}

interface TariffFormState {
  brandId: string;
  brandName: string;
  productType: string;
  zone: string;
  customZone: string;
  pricingMode: "slab" | "per_kg";
  slabs: SlabWithKey[];
  minKg: string;
  ratePerKg: string;
  maxWeightKg: string;
  isGSTInclusive: boolean;
  isActive: boolean;
}

const emptyForm = (): TariffFormState => ({
  brandId: "",
  brandName: "",
  productType: "Express",
  zone: "Within City",
  customZone: "",
  pricingMode: "slab",
  slabs: [
    { _key: generateId(), maxGrams: 100, price: 0 },
    { _key: generateId(), maxGrams: 250, price: 0 },
    { _key: generateId(), maxGrams: 500, price: 0 },
    { _key: generateId(), maxGrams: null, price: 0 },
  ],
  minKg: "1",
  ratePerKg: "0",
  maxWeightKg: "",
  isGSTInclusive: true,
  isActive: true,
});

// ── Tariff Management Page ────────────────────────────────────────────────────

export function TariffManagementPage() {
  const { activeCompanyId, products } = useAppStore();

  const courierBrands = products.filter(
    (p) => p.type === "courier_awb",
  ) as CourierBrand[];

  const [tariffs, setLocalTariffs] = useState<CourierTariff[]>(() =>
    getTariffs(activeCompanyId),
  );

  const [filterBrand, setFilterBrand] = useState("all");
  const [filterProductType, setFilterProductType] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<CourierTariff | null>(
    null,
  );
  const [form, setForm] = useState<TariffFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CourierTariff | null>(null);

  // Reload from storage whenever company changes
  useEffect(() => {
    setLocalTariffs(getTariffs(activeCompanyId));
  }, [activeCompanyId]);

  const saveTariffs = (updated: CourierTariff[]) => {
    setLocalTariffs(updated);
    setTariffs(activeCompanyId, updated);
  };

  // ── Filters ────────────────────────────────────────────────────────────────

  const filtered = tariffs.filter((t) => {
    const matchBrand = filterBrand === "all" || t.brandName === filterBrand;
    const matchType =
      !filterProductType ||
      t.productType.toLowerCase().includes(filterProductType.toLowerCase());
    return matchBrand && matchType;
  });

  // Group by brand
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
    setForm({
      ...emptyForm(),
      brandId: defaultBrand?.id ?? "",
      brandName: defaultBrand?.brandName ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (tariff: CourierTariff) => {
    setEditingTariff(tariff);
    const isCustomZone = !ZONE_OPTIONS.includes(tariff.zone);
    setForm({
      brandId: tariff.brandId,
      brandName: tariff.brandName,
      productType: tariff.productType,
      zone: isCustomZone ? "Custom" : tariff.zone,
      customZone: isCustomZone ? tariff.zone : "",
      pricingMode: tariff.pricingMode,
      slabs: (tariff.slabs ?? [{ maxGrams: null, price: 0 }]).map((s) => ({
        ...s,
        _key: generateId(),
      })),
      minKg: String(tariff.minKg ?? 1),
      ratePerKg: String(tariff.ratePerKg ?? 0),
      maxWeightKg: tariff.maxWeightKg != null ? String(tariff.maxWeightKg) : "",
      isGSTInclusive: tariff.isGSTInclusive,
      isActive: tariff.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
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

    const tariff: CourierTariff = {
      id: editingTariff?.id ?? generateId(),
      companyId: activeCompanyId,
      brandId: form.brandId,
      brandName: form.brandName,
      productType: form.productType.trim(),
      zone: effectiveZone.trim(),
      pricingMode: form.pricingMode,
      slabs:
        form.pricingMode === "slab"
          ? form.slabs.map(({ _key: _k, ...rest }) => rest)
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

  const handleImportDTDCDefaults = () => {
    const dtdcBrand = courierBrands.find((b) =>
      b.brandName.toLowerCase().includes("dtdc"),
    );
    const brandId = dtdcBrand?.id ?? "brand_dtdc_01";

    const defaults = buildDTDCDefaultTariffs(activeCompanyId, brandId);
    const existing = new Set(
      tariffs.map((t) => `${t.brandName}|${t.productType}|${t.zone}`),
    );

    const toAdd = defaults
      .filter((d) => !existing.has(`${d.brandName}|${d.productType}|${d.zone}`))
      .map((d) => ({ ...d, id: generateId() }));

    if (toAdd.length === 0) {
      toast.info("All DTDC default tariffs already exist");
      return;
    }

    saveTariffs([...tariffs, ...toAdd]);
    toast.success(`Imported ${toAdd.length} DTDC default tariff entries`);
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
    field: keyof TariffWeightSlab,
    value: number | null,
  ) => {
    setForm((prev) => ({
      ...prev,
      slabs: prev.slabs.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  };

  // ── Price description helpers ──────────────────────────────────────────────

  const describeTariff = (t: CourierTariff): string => {
    if (t.pricingMode === "slab") {
      const slabs = t.slabs ?? [];
      const display = slabs
        .slice(0, 3)
        .map((s) =>
          s.maxGrams ? `₹${s.price}≤${s.maxGrams}g` : `+₹${s.price}/500g`,
        )
        .join(", ");
      return slabs.length > 3 ? `${display}…` : display;
    }
    return `₹${t.ratePerKg}/kg (min ${t.minKg}kg)`;
  };

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
            Manage courier tariff rates for all brands
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleImportDTDCDefaults}
            data-ocid="tariff.import_defaults_button"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Import DTDC Defaults
          </Button>
          <Button
            onClick={openAdd}
            data-ocid="tariff.add_button"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Tariff
          </Button>
        </div>
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
          <div className="w-full sm:w-56">
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
            Add a tariff manually or import DTDC defaults
          </p>
          <Button
            onClick={openAdd}
            className="mt-4"
            data-ocid="tariff.add_button"
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

              <Table data-ocid="tariff.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Type</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Price Details</TableHead>
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
                        <Badge
                          variant="outline"
                          className="text-xs font-medium text-primary border-primary/30"
                        >
                          {tariff.productType}
                        </Badge>
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
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[220px]">
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
            {/* Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Courier Brand</Label>
                <Select
                  value={form.brandId}
                  onValueChange={(v) => {
                    const brand = courierBrands.find((b) => b.id === v);
                    setForm((prev) => ({
                      ...prev,
                      brandId: v,
                      brandName: brand?.brandName ?? "",
                    }));
                  }}
                >
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

              {/* Product Type */}
              <div className="space-y-1.5">
                <Label>Product Type</Label>
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
              </div>
            </div>

            {/* Zone */}
            <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-1.5">
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

            {/* Slab inputs */}
            {form.pricingMode === "slab" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Weight Slabs</Label>
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
                          Max Weight
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
                            {slab.maxGrams === null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-primary font-medium">
                                  Additional / 500g
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateSlab(idx, "maxGrams", 0)}
                                  className="text-xs text-muted-foreground hover:text-foreground underline"
                                >
                                  Set limit
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={slab.maxGrams}
                                  onChange={(e) =>
                                    updateSlab(
                                      idx,
                                      "maxGrams",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-7 w-24 text-xs"
                                  placeholder="Grams"
                                />
                                <span className="text-xs text-muted-foreground">
                                  g
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlab(idx, "maxGrams", null)
                                  }
                                  className="text-xs text-muted-foreground hover:text-primary underline"
                                >
                                  → Addl
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              type="number"
                              value={slab.price}
                              onChange={(e) =>
                                updateSlab(idx, "price", Number(e.target.value))
                              }
                              className="h-7 w-24 text-xs"
                              placeholder="0"
                            />
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
                            No slabs yet — click Add Slab
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Max Weight Limit (kg) — optional, shows warning
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
                    className="w-32 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Per KG inputs */}
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
