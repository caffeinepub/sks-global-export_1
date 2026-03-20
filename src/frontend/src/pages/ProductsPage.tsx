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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  HelpCircle,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  AnyProduct,
  Category,
  CourierBrand,
  CourierProduct,
  GeneralProduct,
  PricingSlab,
  PricingTier,
  PricingTierName,
  ProductUnit,
  ServiceProduct,
  XeroxProduct,
} from "../types";
import {
  downloadCSVString,
  exportToCSV,
  getSampleProductsCSV,
  parseCSV,
} from "../utils/excelHelpers";
import { formatCurrency, generateId } from "../utils/helpers";
import {
  getCategories,
  getUnits,
  setUnits as saveUnits,
} from "../utils/storage";

// ─── CourierProduct sub-dialog ────────────────────────────────────────────────

interface CourierProductDialogProps {
  brandName: string;
  product: CourierProduct | null; // null = adding new
  open: boolean;
  onClose: () => void;
  onSave: (p: CourierProduct) => void;
}

function CourierProductDialog({
  brandName,
  product,
  open,
  onClose,
  onSave,
}: CourierProductDialogProps) {
  const [productType, setProductType] = useState(product?.productType ?? "");
  const [category, setCategory] = useState<"Courier" | "Cargo">(
    product?.category ?? "Courier",
  );
  const [transportModes, setTransportModes] = useState<
    "Air" | "Surface" | "Both"
  >(product?.transportModes ?? "Both");
  const [serviceModes, setServiceModes] = useState(
    product?.serviceModes.join(",") ?? "Air,Surface,GEC",
  );
  const [serialLogic, setSerialLogic] = useState<CourierProduct["serialLogic"]>(
    product?.serialLogic ?? "sequential",
  );
  const [serialPrefix, setSerialPrefix] = useState(product?.serialPrefix ?? "");
  const [prefixPosition, setPrefixPosition] = useState<"first" | "second">(
    product?.prefixPosition ?? "first",
  );
  const [serialGap, setSerialGap] = useState(
    String(product?.serialGap ?? "11"),
  );
  const [sellingPrice, setSellingPrice] = useState(
    String(product?.sellingPrice ?? "0"),
  );
  const [gstRate, setGstRate] = useState(String(product?.gstRate ?? "18"));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const handleSave = () => {
    if (!productType.trim()) {
      toast.error("Product Type is required");
      return;
    }
    onSave({
      id: product?.id ?? generateId(),
      productType: productType.trim(),
      category,
      transportModes,
      serviceModes: serviceModes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      serialLogic,
      serialPrefix: serialPrefix.trim() || undefined,
      prefixPosition:
        serialLogic === "sequential_prefix_first" ||
        serialLogic === "sequential_prefix_second"
          ? prefixPosition
          : undefined,
      serialGap: serialLogic === "custom_gap" ? Number(serialGap) : undefined,
      sellingPrice: Number(sellingPrice),
      gstRate: Number(gstRate),
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit" : "Add"} Product — {brandName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Product Type */}
            <div className="col-span-2">
              <Label className="text-xs">Product Type *</Label>
              <Input
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="e.g. D Express, Lite, Priority, Air Cargo"
                className="mt-1 text-sm"
                data-ocid="courier-product.type.input"
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as "Courier" | "Cargo")}
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Courier">Courier</SelectItem>
                  <SelectItem value="Cargo">Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transport Mode */}
            <div>
              <Label className="text-xs">Transport Mode</Label>
              <Select
                value={transportModes}
                onValueChange={(v) =>
                  setTransportModes(v as "Air" | "Surface" | "Both")
                }
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Air">Air Only</SelectItem>
                  <SelectItem value="Surface">Surface Only</SelectItem>
                  <SelectItem value="Both">Both (Air & Surface)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Modes */}
            <div className="col-span-2">
              <Label className="text-xs">Service Modes (comma-separated)</Label>
              <Input
                value={serviceModes}
                onChange={(e) => setServiceModes(e.target.value)}
                placeholder="Air,Surface,GEC"
                className="mt-1 text-sm"
              />
            </div>

            {/* Serial Logic */}
            <div>
              <Label className="text-xs">Serial / AWB Logic</Label>
              <Select
                value={serialLogic}
                onValueChange={(v) =>
                  setSerialLogic(v as CourierProduct["serialLogic"])
                }
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential Numbers</SelectItem>
                  <SelectItem value="sequential_prefix_first">
                    Prefix + Numbers (e.g. D100001)
                  </SelectItem>
                  <SelectItem value="sequential_prefix_second">
                    Numbers + Suffix (e.g. 100001D)
                  </SelectItem>
                  <SelectItem value="custom_gap">Custom Gap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Serial Prefix */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                AWB Prefix
                <span
                  title="Letters or numbers at the start (or end) of AWB numbers that identify this product. E.g. 'D' for DTDC D Express, '48' for numeric prefix."
                  className="text-muted-foreground cursor-help"
                >
                  <HelpCircle className="w-3 h-3 inline" />
                </span>
              </Label>
              <Input
                value={serialPrefix}
                onChange={(e) => setSerialPrefix(e.target.value)}
                placeholder="e.g. D, AB, 48"
                className="mt-1 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Letters/numbers that identify this product's AWB
              </p>
            </div>

            {/* Prefix position — only for prefix serial logics */}
            {(serialLogic === "sequential_prefix_first" ||
              serialLogic === "sequential_prefix_second") && (
              <div>
                <Label className="text-xs">Prefix Position</Label>
                <Select
                  value={prefixPosition}
                  onValueChange={(v) =>
                    setPrefixPosition(v as "first" | "second")
                  }
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">
                      First Letter (e.g. D100001)
                    </SelectItem>
                    <SelectItem value="second">
                      Second Letter (e.g. 1D00001)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Serial Gap — only for custom_gap */}
            {serialLogic === "custom_gap" && (
              <div>
                <Label className="text-xs">Serial Gap</Label>
                <Input
                  type="number"
                  value={serialGap}
                  onChange={(e) => setSerialGap(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            )}

            {/* Price & GST */}
            <div>
              <Label className="text-xs">Selling Price (₹)</Label>
              <Input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">GST Rate (%)</Label>
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 12, 18, 28].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-xs">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="courier-product.cancel_button"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} data-ocid="courier-product.save_button">
            {product ? "Update" : "Add"} Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Products Page ────────────────────────────────────────────────────────────

export function ProductsPage() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    activeCompanyId,
  } = useAppStore();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<AnyProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Categories state (read-only here; managed via CategoriesPage)
  const [allCategories] = useState<Category[]>(() => getCategories());

  // Units state
  const [allUnits, setAllUnitsState] = useState<ProductUnit[]>(() =>
    getUnits(),
  );
  const saveAllUnits = (units: ProductUnit[]) => {
    saveUnits(units);
    setAllUnitsState(units);
  };
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editUnit, setEditUnit] = useState<ProductUnit | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [unitFormName, setUnitFormName] = useState("");
  const [unitFormSymbol, setUnitFormSymbol] = useState("");
  const [unitFormSub1Name, setUnitFormSub1Name] = useState("");
  const [unitFormSub1Rate, setUnitFormSub1Rate] = useState("");
  const [unitFormSub1MRP, setUnitFormSub1MRP] = useState("");
  const [unitFormSub1Price, setUnitFormSub1Price] = useState("");
  const [unitFormSub2Name, setUnitFormSub2Name] = useState("");
  const [unitFormSub2Rate, setUnitFormSub2Rate] = useState("");
  const [unitFormSub2MRP, setUnitFormSub2MRP] = useState("");
  const [unitFormSub2Price, setUnitFormSub2Price] = useState("");
  const [unitFormSub3Name, setUnitFormSub3Name] = useState("");
  const [unitFormSub3Rate, setUnitFormSub3Rate] = useState("");
  const [unitFormSub3MRP, setUnitFormSub3MRP] = useState("");
  const [unitFormSub3Price, setUnitFormSub3Price] = useState("");
  const [unitFormMRP, setUnitFormMRP] = useState("");
  const [unitFormPrice, setUnitFormPrice] = useState("");

  // ── Bulk Product Import ────────────────────────────────────────────────────
  const [showBulkImport, setShowBulkImport] = useState(false);
  interface BulkProductRow {
    name: string;
    category: string;
    unit: string;
    sellingPrice: number;
    purchasePrice: number;
    gstRate: number;
    hsnCode: string;
    currentStock: number;
    minStockAlert: number;
    error?: string;
  }
  const [bulkRows, setBulkRows] = useState<BulkProductRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");

  const handleBulkCSVDownload = () => {
    const csv =
      "name,category,unit,sellingPrice,purchasePrice,gstRate,hsnCode,currentStock,minStockAlert\n" +
      "A4 Paper,Stationery,Ream,250,200,18,48169900,100,20\n" +
      "Stapler,Stationery,Piece,120,90,18,83051000,50,10\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }
      const rows: BulkProductRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((c) => c.trim().replace(/^"|"$/g, ""));
        const [
          name,
          category = "",
          unit = "Piece",
          sellingPriceStr = "0",
          purchasePriceStr = "0",
          gstRateStr = "18",
          hsnCode = "",
          currentStockStr = "0",
          minStockAlertStr = "10",
        ] = cols;
        const error = !name ? "Name is required" : undefined;
        rows.push({
          name,
          category,
          unit,
          sellingPrice: Number(sellingPriceStr) || 0,
          purchasePrice: Number(purchasePriceStr) || 0,
          gstRate: Number(gstRateStr) || 0,
          hsnCode,
          currentStock: Number(currentStockStr) || 0,
          minStockAlert: Number(minStockAlertStr) || 10,
          error,
        });
      }
      setBulkRows(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBulkImport = () => {
    const valid = bulkRows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    for (const row of valid) {
      addProduct({
        id: generateId(),
        companyId: activeCompanyId,
        type: "general",
        name: row.name,
        category: row.category,
        unit: row.unit,
        sellingPrice: row.sellingPrice,
        purchasePrice: row.purchasePrice,
        gstRate: row.gstRate,
        hsnCode: row.hsnCode,
        currentStock: row.currentStock,
        minStockAlert: row.minStockAlert,
        isActive: true,
      });
    }
    toast.success(`Imported ${valid.length} products successfully`);
    setShowBulkImport(false);
    setBulkRows([]);
    setBulkFileName("");
  };

  // Which brand rows are expanded to show their product list
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  // CourierProduct sub-dialog state
  const [cpDialog, setCpDialog] = useState<{
    brandId: string;
    brandName: string;
    product: CourierProduct | null;
  } | null>(null);
  const [deleteCPInfo, setDeleteCPInfo] = useState<{
    brandId: string;
    productId: string;
    productType: string;
  } | null>(null);

  // Form state
  const [formType, setFormType] = useState<AnyProduct["type"]>("general");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("Piece");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");
  const [currentStock, setCurrentStock] = useState("0");
  const [minStockAlert, setMinStockAlert] = useState("10");
  const [isActive, setIsActive] = useState(true);
  const [priceIncludesGST, setPriceIncludesGST] = useState(true);
  // Courier brand fields
  const [brandName, setBrandName] = useState("");
  const [brandCategory, setBrandCategory] = useState<
    "Courier" | "Cargo" | "Both"
  >("Both");
  const [productType, setProductType] = useState("Courier");
  const [serviceModes, setServiceModes] = useState("Air,Surface,GEC");
  const [transportModes, setTransportModes] =
    useState<CourierBrand["transportModes"]>("Both");
  const [serialLogic, setSerialLogic] =
    useState<CourierBrand["serialLogic"]>("sequential");
  const [serialGap, setSerialGap] = useState("11");
  const [serialPrefix, setSerialPrefix] = useState("");
  // Xerox fields
  const [inkCharge, setInkCharge] = useState("0.3");
  const [serviceCharge, setServiceCharge] = useState("0.2");
  const [pricePerPage, setPricePerPage] = useState("1.0");
  const [paperProductId, setPaperProductId] = useState("");
  // Service fields
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sacCode, setSacCode] = useState("");

  // Product sub-unit configuration (inline panel in general product form)
  const [productSubUnit1, setProductSubUnit1] = useState<{
    unitId: string;
    name: string;
    conversionRate: string;
    mrp: string;
    sellingPrice: string;
    costPrice: string;
  } | null>(null);
  const [productSubUnit2, setProductSubUnit2] = useState<{
    unitId: string;
    name: string;
    conversionRate: string;
    mrp: string;
    sellingPrice: string;
    costPrice: string;
  } | null>(null);
  const [productSubUnit3, setProductSubUnit3] = useState<{
    unitId: string;
    name: string;
    conversionRate: string;
    mrp: string;
    sellingPrice: string;
    costPrice: string;
  } | null>(null);
  const [showSubUnitPanel, setShowSubUnitPanel] = useState(false);

  // Xerox materials state
  const [xeroxMaterials, setXeroxMaterials] = useState<
    Array<{ productId: string; quantity: string; label: string }>
  >([]);

  // Pricing slabs (with local _key for stable list rendering)
  const [usePricingSlabs, setUsePricingSlabs] = useState(false);
  const [pricingSlabs, setPricingSlabs] = useState<
    Array<PricingSlab & { _key: string }>
  >([]);

  // Named pricing tiers: Retail / Super Retail / Wholesale / Super Wholesale
  const TIER_LABELS: Record<PricingTierName, string> = {
    retail: "Retail",
    super_retail: "Super Retail",
    wholesale: "Wholesale",
    super_wholesale: "Super Wholesale",
  };
  type TierForm = {
    minQty: string;
    maxQty: string;
    mrp: string;
    sellingPrice: string;
  };
  const defaultTierForm = (): TierForm => ({
    minQty: "1",
    maxQty: "",
    mrp: "",
    sellingPrice: "",
  });
  const [pricingTiers, setPricingTiers] = useState<
    Record<PricingTierName, TierForm>
  >({
    retail: defaultTierForm(),
    super_retail: defaultTierForm(),
    wholesale: defaultTierForm(),
    super_wholesale: defaultTierForm(),
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setUnit("Piece");
    setSellingPrice("");
    setPurchasePrice("");
    setGstRate("18");
    setHsnCode("");
    setCurrentStock("0");
    setMinStockAlert("10");
    setIsActive(true);
    setPriceIncludesGST(true);
    setBrandName("");
    setBrandCategory("Both");
    setProductType("Courier");
    setServiceModes("Air,Surface,GEC");
    setTransportModes("Both");
    setSerialLogic("sequential");
    setSerialGap("11");
    setSerialPrefix("");
    setInkCharge("0.3");
    setServiceCharge("0.2");
    setPricePerPage("1.0");
    setPaperProductId("");
    setDescription("");
    setPrice("");
    setSacCode("");
    setUsePricingSlabs(false);
    setPricingSlabs([]);
    setPricingTiers({
      retail: defaultTierForm(),
      super_retail: defaultTierForm(),
      wholesale: defaultTierForm(),
      super_wholesale: defaultTierForm(),
    });
    setEditProduct(null);
    setProductSubUnit1(null);
    setProductSubUnit2(null);
    setProductSubUnit3(null);
    setShowSubUnitPanel(false);
    setXeroxMaterials([]);
  };

  const openAdd = (type: AnyProduct["type"]) => {
    resetForm();
    setFormType(type);
    setShowForm(true);
  };

  const openEdit = (product: AnyProduct) => {
    setEditProduct(product);
    setFormType(product.type);
    if (product.type === "general") {
      const p = product as GeneralProduct;
      setName(p.name);
      setCategory(p.category);
      setUnit(p.unit);
      setSellingPrice(String(p.sellingPrice));
      setPurchasePrice(String(p.purchasePrice));
      setGstRate(String(p.gstRate));
      setHsnCode(p.hsnCode);
      setCurrentStock(String(p.currentStock));
      setMinStockAlert(String(p.minStockAlert));
      setIsActive(p.isActive);
      setPriceIncludesGST(p.priceIncludesGST !== false); // default true
      setUsePricingSlabs(p.usePricingSlabs ?? false);
      // Load product sub-units
      if (p.productSubUnit1) {
        setProductSubUnit1({
          unitId: p.productSubUnit1.unitId,
          name: p.productSubUnit1.name,
          conversionRate: String(p.productSubUnit1.conversionRate),
          mrp: p.productSubUnit1.mrp ? String(p.productSubUnit1.mrp) : "",
          sellingPrice: p.productSubUnit1.sellingPrice
            ? String(p.productSubUnit1.sellingPrice)
            : "",
          costPrice: p.productSubUnit1.costPrice
            ? String(p.productSubUnit1.costPrice)
            : "",
        });
        setShowSubUnitPanel(true);
      }
      if (p.productSubUnit2) {
        setProductSubUnit2({
          unitId: p.productSubUnit2.unitId,
          name: p.productSubUnit2.name,
          conversionRate: String(p.productSubUnit2.conversionRate),
          mrp: p.productSubUnit2.mrp ? String(p.productSubUnit2.mrp) : "",
          sellingPrice: p.productSubUnit2.sellingPrice
            ? String(p.productSubUnit2.sellingPrice)
            : "",
          costPrice: p.productSubUnit2.costPrice
            ? String(p.productSubUnit2.costPrice)
            : "",
        });
      }
      if (p.productSubUnit3) {
        setProductSubUnit3({
          unitId: p.productSubUnit3.unitId,
          name: p.productSubUnit3.name,
          conversionRate: String(p.productSubUnit3.conversionRate),
          mrp: p.productSubUnit3.mrp ? String(p.productSubUnit3.mrp) : "",
          sellingPrice: p.productSubUnit3.sellingPrice
            ? String(p.productSubUnit3.sellingPrice)
            : "",
          costPrice: p.productSubUnit3.costPrice
            ? String(p.productSubUnit3.costPrice)
            : "",
        });
      }
      setPricingSlabs(
        (p.pricingSlabs ?? []).map((s, i) => ({ ...s, _key: String(i) })),
      );
      // Load pricing tiers if any
      const tiers: Record<PricingTierName, TierForm> = {
        retail: defaultTierForm(),
        super_retail: defaultTierForm(),
        wholesale: defaultTierForm(),
        super_wholesale: defaultTierForm(),
      };
      if (p.pricingTiers) {
        for (const t of p.pricingTiers) {
          tiers[t.name] = {
            minQty: String(t.minQty),
            maxQty: t.maxQty !== null ? String(t.maxQty) : "",
            mrp: String(t.mrp),
            sellingPrice: String(t.sellingPrice),
          };
        }
      }
      setPricingTiers(tiers);
    } else if (product.type === "courier_awb") {
      const p = product as CourierBrand;
      setBrandName(p.brandName);
      setBrandCategory(p.category ?? "Both");
      setProductType(p.productType);
      setServiceModes(p.serviceModes.join(","));
      setTransportModes(p.transportModes ?? "Both");
      setSerialLogic(p.serialLogic);
      setSerialGap(String(p.serialGap || 11));
      setSerialPrefix(p.serialPrefix || "");
      setSellingPrice(String(p.sellingPrice));
      setGstRate(String(p.gstRate));
      setIsActive(p.isActive);
    } else if (product.type === "xerox") {
      const p = product as XeroxProduct;
      setName(p.name);
      setInkCharge(String(p.inkChargePerPage));
      setServiceCharge(String(p.serviceChargePerPage));
      setPricePerPage(String(p.pricePerPage));
      setGstRate(String(p.gstRate));
      setPaperProductId(p.paperProductId);
      setIsActive(p.isActive);
      setUsePricingSlabs(p.usePricingSlabs ?? false);
      setXeroxMaterials(
        (p.materials ?? []).map((m) => ({
          productId: m.productId,
          quantity: String(m.quantity),
          label: m.label,
        })),
      );
      setPricingSlabs(
        (p.pricingSlabs ?? []).map((s, i) => ({ ...s, _key: String(i) })),
      );
    } else if (product.type === "service") {
      const p = product as ServiceProduct;
      setName(p.name);
      setDescription(p.description);
      setPrice(String(p.price));
      setGstRate(String(p.gstRate));
      setSacCode(p.sacCode);
      setIsActive(p.isActive);
    }
    setShowForm(true);
  };

  const handleSave = () => {
    const id = editProduct?.id || generateId();
    let product: AnyProduct;

    if (formType === "general") {
      if (!name || !sellingPrice) {
        toast.error("Name and price required");
        return;
      }
      // Build pricing tiers from form state
      const activeTiers: PricingTier[] = (
        [
          "retail",
          "super_retail",
          "wholesale",
          "super_wholesale",
        ] as PricingTierName[]
      )
        .filter(
          (name) =>
            pricingTiers[name].mrp !== "" ||
            pricingTiers[name].sellingPrice !== "",
        )
        .map((name) => ({
          name,
          minQty: Number(pricingTiers[name].minQty) || 1,
          maxQty:
            pricingTiers[name].maxQty !== ""
              ? Number(pricingTiers[name].maxQty)
              : null,
          mrp: Number(pricingTiers[name].mrp) || 0,
          sellingPrice: Number(pricingTiers[name].sellingPrice) || 0,
        }));

      product = {
        id,
        companyId: activeCompanyId,
        type: "general",
        name,
        category,
        unit,
        sellingPrice: Number(sellingPrice),
        purchasePrice: Number(purchasePrice),
        gstRate: Number(gstRate),
        hsnCode,
        currentStock: Number(currentStock),
        minStockAlert: Number(minStockAlert),
        isActive,
        usePricingSlabs,
        pricingSlabs: usePricingSlabs
          ? pricingSlabs.map(({ _key: _k, ...s }) => s)
          : [],
        pricingTiers: activeTiers.length > 0 ? activeTiers : undefined,
        priceIncludesGST,
        productSubUnit1:
          productSubUnit1?.name && productSubUnit1?.conversionRate
            ? {
                unitId: productSubUnit1.unitId,
                name: productSubUnit1.name,
                conversionRate: Number(productSubUnit1.conversionRate),
                mrp: productSubUnit1.mrp
                  ? Number(productSubUnit1.mrp)
                  : undefined,
                sellingPrice: productSubUnit1.sellingPrice
                  ? Number(productSubUnit1.sellingPrice)
                  : undefined,
                costPrice: productSubUnit1.costPrice
                  ? Number(productSubUnit1.costPrice)
                  : undefined,
              }
            : undefined,
        productSubUnit2:
          productSubUnit2?.name && productSubUnit2?.conversionRate
            ? {
                unitId: productSubUnit2.unitId,
                name: productSubUnit2.name,
                conversionRate: Number(productSubUnit2.conversionRate),
                mrp: productSubUnit2.mrp
                  ? Number(productSubUnit2.mrp)
                  : undefined,
                sellingPrice: productSubUnit2.sellingPrice
                  ? Number(productSubUnit2.sellingPrice)
                  : undefined,
                costPrice: productSubUnit2.costPrice
                  ? Number(productSubUnit2.costPrice)
                  : undefined,
              }
            : undefined,
        productSubUnit3:
          productSubUnit3?.name && productSubUnit3?.conversionRate
            ? {
                unitId: productSubUnit3.unitId,
                name: productSubUnit3.name,
                conversionRate: Number(productSubUnit3.conversionRate),
                mrp: productSubUnit3.mrp
                  ? Number(productSubUnit3.mrp)
                  : undefined,
                sellingPrice: productSubUnit3.sellingPrice
                  ? Number(productSubUnit3.sellingPrice)
                  : undefined,
                costPrice: productSubUnit3.costPrice
                  ? Number(productSubUnit3.costPrice)
                  : undefined,
              }
            : undefined,
      } as GeneralProduct;
    } else if (formType === "courier_awb") {
      if (!brandName) {
        toast.error("Brand name required");
        return;
      }
      // Preserve existing courierProducts when editing
      const existingCourierProducts =
        editProduct && editProduct.type === "courier_awb"
          ? (editProduct as CourierBrand).courierProducts
          : [];
      product = {
        id,
        companyId: activeCompanyId,
        type: "courier_awb",
        brandName,
        category: brandCategory,
        productType,
        serviceModes: serviceModes.split(",").map((s) => s.trim()),
        transportModes,
        serialLogic,
        serialGap: Number(serialGap),
        serialPrefix,
        sellingPrice: Number(sellingPrice),
        gstRate: Number(gstRate),
        isActive,
        courierProducts: existingCourierProducts,
      } as CourierBrand;
    } else if (formType === "xerox") {
      if (!name) {
        toast.error("Name required");
        return;
      }
      product = {
        id,
        companyId: activeCompanyId,
        type: "xerox",
        name,
        paperProductId,
        inkChargePerPage: Number(inkCharge),
        serviceChargePerPage: Number(serviceCharge),
        pricePerPage: Number(pricePerPage),
        gstRate: Number(gstRate),
        isActive,
        usePricingSlabs,
        pricingSlabs: usePricingSlabs
          ? pricingSlabs.map(({ _key: _k, ...s }) => s)
          : [],
        materials: xeroxMaterials
          .filter((m) => m.productId && m.quantity)
          .map((m) => ({
            productId: m.productId,
            quantity: Number(m.quantity),
            label: m.label,
          })),
      } as XeroxProduct;
    } else {
      if (!name || !price) {
        toast.error("Name and price required");
        return;
      }
      product = {
        id,
        companyId: activeCompanyId,
        type: "service",
        name,
        description,
        price: Number(price),
        gstRate: Number(gstRate),
        sacCode,
        isActive,
      } as ServiceProduct;
    }

    if (editProduct) {
      updateProduct(product);
      toast.success("Product updated");
    } else {
      addProduct(product);
      toast.success("Product added");
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteId(null);
    toast.success("Product deleted");
  };

  // ─── CourierProduct (sub-product) CRUD helpers ─────────────────────────────

  const toggleBrandExpand = (brandId: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  const saveCourierProduct = (brandId: string, cp: CourierProduct) => {
    const brand = products.find(
      (p) => p.id === brandId && p.type === "courier_awb",
    ) as CourierBrand | undefined;
    if (!brand) return;

    const existing = brand.courierProducts ?? [];
    const idx = existing.findIndex((x) => x.id === cp.id);
    const updated =
      idx >= 0
        ? existing.map((x) => (x.id === cp.id ? cp : x))
        : [...existing, cp];

    updateProduct({ ...brand, courierProducts: updated });
    setCpDialog(null);
    toast.success(
      idx >= 0 ? "Product updated" : `Product added to ${brand.brandName}`,
    );
  };

  const deleteCourierProduct = (brandId: string, productId: string) => {
    const brand = products.find(
      (p) => p.id === brandId && p.type === "courier_awb",
    ) as CourierBrand | undefined;
    if (!brand) return;
    const updated = (brand.courierProducts ?? []).filter(
      (x) => x.id !== productId,
    );
    updateProduct({ ...brand, courierProducts: updated });
    setDeleteCPInfo(null);
    toast.success("Product removed");
  };

  const generalProds = products.filter(
    (p) =>
      p.type === "general" &&
      (p as GeneralProduct).name.toLowerCase().includes(search.toLowerCase()),
  ) as GeneralProduct[];
  const courierProds = products.filter(
    (p) =>
      p.type === "courier_awb" &&
      (p as CourierBrand).brandName
        .toLowerCase()
        .includes(search.toLowerCase()),
  ) as CourierBrand[];
  const xeroxProds = products.filter(
    (p) =>
      p.type === "xerox" &&
      (p as XeroxProduct).name.toLowerCase().includes(search.toLowerCase()),
  ) as XeroxProduct[];
  const serviceProds = products.filter(
    (p) =>
      p.type === "service" &&
      (p as ServiceProduct).name.toLowerCase().includes(search.toLowerCase()),
  ) as ServiceProduct[];

  const categoryColor = (cat?: "Courier" | "Cargo" | "Both") => {
    if (cat === "Courier") return "text-blue-700 border-blue-300 bg-blue-50";
    if (cat === "Cargo")
      return "text-orange-700 border-orange-300 bg-orange-50";
    return "text-purple-700 border-purple-300 bg-purple-50";
  };

  const transportColor = (t?: string) => {
    if (t === "Air") return "text-sky-700 border-sky-300";
    if (t === "Surface") return "text-green-700 border-green-300";
    return "text-amber-700 border-amber-300";
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} products
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9 text-sm w-48"
            data-ocid="products.search_input"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general" data-ocid="products.general.tab">
            General ({generalProds.length})
          </TabsTrigger>
          <TabsTrigger value="courier" data-ocid="products.courier.tab">
            Courier Brands ({courierProds.length})
          </TabsTrigger>
          <TabsTrigger value="xerox" data-ocid="products.xerox.tab">
            Xerox ({xeroxProds.length})
          </TabsTrigger>
          <TabsTrigger value="service" data-ocid="products.service.tab">
            Services ({serviceProds.length})
          </TabsTrigger>
          <TabsTrigger value="units" data-ocid="products.units.tab">
            Units ({allUnits.length})
          </TabsTrigger>
        </TabsList>

        {/* General Products */}
        <TabsContent value="general" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">General Products</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportToCSV(
                    "products_export.csv",
                    [
                      "Name",
                      "Category",
                      "Unit",
                      "MRP",
                      "Selling Price",
                      "Purchase Price",
                      "GST Rate (%)",
                      "HSN Code",
                      "Current Stock",
                      "Min Stock Alert",
                      "Status",
                      "Pricing Tiers",
                    ],
                    (
                      products.filter(
                        (p) => p.type === "general",
                      ) as GeneralProduct[]
                    ).map((p) => [
                      p.name,
                      p.category,
                      p.unit,
                      p.mrp ?? "",
                      p.sellingPrice,
                      p.purchasePrice,
                      p.gstRate,
                      p.hsnCode,
                      p.currentStock,
                      p.minStockAlert,
                      p.isActive ? "Active" : "Inactive",
                      p.pricingTiers
                        ? p.pricingTiers
                            .map(
                              (t) =>
                                `${t.name}:${t.minQty}-${t.maxQty ?? "∞"}@₹${t.sellingPrice}`,
                            )
                            .join("; ")
                        : "",
                    ]),
                  );
                }}
                data-ocid="products.general.export_button"
              >
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkRows([]);
                  setBulkFileName("");
                  setShowBulkImport(true);
                }}
                data-ocid="products.bulk_import.open_modal_button"
              >
                <Upload className="w-4 h-4 mr-1" /> Bulk Import
              </Button>
              <Button
                size="sm"
                onClick={() => openAdd("general")}
                data-ocid="products.general.primary_button"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="text-xs">GST%</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalProds.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-xs">{p.category}</TableCell>
                    <TableCell className="text-xs">{p.unit}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span>{formatCurrency(p.sellingPrice)}</span>
                        <span
                          className={`text-[10px] ${p.priceIncludesGST === false ? "text-amber-600" : "text-green-600"}`}
                        >
                          {p.priceIncludesGST === false
                            ? "Excl. GST"
                            : "Incl. GST"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{p.gstRate}%</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${p.currentStock <= p.minStockAlert ? "text-destructive" : "text-success"}`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.isActive ? "status-paid" : "status-cancelled"
                        }
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(p)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {generalProds.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No general products
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Courier Brands */}
        <TabsContent value="courier" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Courier Brands</h3>
            <Button
              size="sm"
              onClick={() => openAdd("courier_awb")}
              data-ocid="products.courier.primary_button"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Brand
            </Button>
          </div>
          <div className="space-y-3">
            {courierProds.map((brand) => {
              const isExpanded = expandedBrands.has(brand.id);
              const cpList = brand.courierProducts ?? [];
              return (
                <div
                  key={brand.id}
                  className="bg-white rounded-xl border border-border shadow-xs overflow-hidden"
                >
                  {/* Brand header row */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer select-none text-left"
                    onClick={() => toggleBrandExpand(brand.id)}
                    data-ocid="products.courier.brand.row"
                  >
                    <span className="p-0.5 rounded hover:bg-muted/40 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </span>
                    {/* Brand name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {brand.brandName}
                        </span>
                        {brand.isOwnBrand && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/30 border">
                            Own Brand
                          </Badge>
                        )}
                        {/* Category badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs ${categoryColor(brand.category)}`}
                        >
                          {brand.category ?? "Both"}
                        </Badge>
                        {/* Transport badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs ${transportColor(brand.transportModes)}`}
                        >
                          {brand.transportModes ?? "Both"}
                        </Badge>
                        {/* Products count */}
                        <Badge
                          variant="secondary"
                          className="text-xs cursor-pointer"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          {cpList.length} product
                          {cpList.length !== 1 ? "s" : ""}
                        </Badge>
                        {!brand.isActive && (
                          <Badge
                            variant="outline"
                            className="text-xs status-cancelled"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        GST {brand.gstRate}% &bull;{" "}
                        {formatCurrency(brand.sellingPrice)}
                        {cpList.length > 0 && (
                          <span className="ml-1 text-primary font-medium">
                            &bull; {cpList.length} product type
                            {cpList.length !== 1 ? "s" : ""} — click to manage
                          </span>
                        )}
                        {cpList.length === 0 && (
                          <span className="ml-1 text-amber-600 font-medium">
                            &bull; Click to add product types
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Brand actions */}
                    <div
                      className="flex gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit brand"
                        onClick={() => openEdit(brand)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        title="Delete brand"
                        onClick={() => setDeleteId(brand.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </button>

                  {/* Expanded: product list */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Products under {brand.brandName}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            setCpDialog({
                              brandId: brand.id,
                              brandName: brand.brandName,
                              product: null,
                            })
                          }
                          data-ocid="products.courier.add_product.button"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Product
                        </Button>
                      </div>
                      {cpList.length === 0 ? (
                        <div className="px-4 py-5 text-center text-muted-foreground text-xs">
                          No products added yet. Click "Add Product" to create
                          the first product for {brand.brandName}.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/20 text-xs">
                              <TableHead className="text-xs pl-8">
                                Product Type
                              </TableHead>
                              <TableHead className="text-xs">
                                Category
                              </TableHead>
                              <TableHead className="text-xs">
                                Transport
                              </TableHead>
                              <TableHead className="text-xs">
                                AWB Prefix
                              </TableHead>
                              <TableHead className="text-xs">
                                Serial Logic
                              </TableHead>
                              <TableHead className="text-xs">Price</TableHead>
                              <TableHead className="text-xs">GST%</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cpList.map((cp, cpIdx) => (
                              <TableRow
                                key={cp.id}
                                className="hover:bg-muted/10"
                                data-ocid={`products.courier.product.row.${cpIdx + 1}`}
                              >
                                <TableCell className="text-xs font-semibold pl-8">
                                  {cp.productType}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${categoryColor(cp.category)}`}
                                  >
                                    {cp.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${transportColor(cp.transportModes)}`}
                                  >
                                    {cp.transportModes}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {cp.serialPrefix ? (
                                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border font-semibold">
                                      {cp.serialPrefix}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {cp.serialLogic === "sequential"
                                    ? "Sequential"
                                    : cp.serialLogic ===
                                        "sequential_prefix_first"
                                      ? "Prefix First"
                                      : cp.serialLogic ===
                                          "sequential_prefix_second"
                                        ? "Prefix Second"
                                        : `Gap ${cp.serialGap}`}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {formatCurrency(cp.sellingPrice)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {cp.gstRate}%
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${cp.isActive ? "status-paid" : "status-cancelled"}`}
                                  >
                                    {cp.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      title="Edit product"
                                      onClick={() =>
                                        setCpDialog({
                                          brandId: brand.id,
                                          brandName: brand.brandName,
                                          product: cp,
                                        })
                                      }
                                      data-ocid={`products.courier.product.edit_button.${cpIdx + 1}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      title="Delete product"
                                      onClick={() =>
                                        setDeleteCPInfo({
                                          brandId: brand.id,
                                          productId: cp.id,
                                          productType: cp.productType,
                                        })
                                      }
                                      data-ocid={`products.courier.product.delete_button.${cpIdx + 1}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {courierProds.length === 0 && (
              <div className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
                No courier brands. Click "Add Brand" to get started.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Xerox */}
        <TabsContent value="xerox" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Xerox & Printout</h3>
            <Button size="sm" onClick={() => openAdd("xerox")}>
              <Plus className="w-4 h-4 mr-1" /> Add Xerox
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Price/Page</TableHead>
                  <TableHead className="text-xs">Ink Charge</TableHead>
                  <TableHead className="text-xs">Service Charge</TableHead>
                  <TableHead className="text-xs">GST%</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {xeroxProds.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatCurrency(p.pricePerPage)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatCurrency(p.inkChargePerPage)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatCurrency(p.serviceChargePerPage)}
                    </TableCell>
                    <TableCell className="text-xs">{p.gstRate}%</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.isActive ? "status-paid" : "status-cancelled"
                        }
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(p)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {xeroxProds.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No xerox products
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Units */}
        <TabsContent value="units" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Units of Measurement</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditUnit(null);
                setUnitFormName("");
                setUnitFormSymbol("");
                setUnitFormMRP("");
                setUnitFormPrice("");
                setUnitFormSub1Name("");
                setUnitFormSub1Rate("");
                setUnitFormSub1MRP("");
                setUnitFormSub1Price("");
                setUnitFormSub2Name("");
                setUnitFormSub2Rate("");
                setUnitFormSub2MRP("");
                setUnitFormSub2Price("");
                setUnitFormSub3Name("");
                setUnitFormSub3Rate("");
                setUnitFormSub3MRP("");
                setUnitFormSub3Price("");
                setShowUnitForm(true);
              }}
              data-ocid="products.units.primary_button"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Unit
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Symbol</TableHead>
                  <TableHead className="text-xs">MRP / Price</TableHead>
                  <TableHead className="text-xs">Sub-Units</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUnits.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {u.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {u.symbol}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.mrp ? `MRP ₹${u.mrp}` : "—"}
                      {u.sellingPrice ? ` / ₹${u.sellingPrice}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[u.subUnit1, u.subUnit2, u.subUnit3]
                        .filter(Boolean)
                        .map((s) => `${s!.name} (÷${s!.conversionRate})`)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditUnit(u);
                            setUnitFormName(u.name);
                            setUnitFormSymbol(u.symbol);
                            setUnitFormMRP(u.mrp ? String(u.mrp) : "");
                            setUnitFormPrice(
                              u.sellingPrice ? String(u.sellingPrice) : "",
                            );
                            setUnitFormSub1Name(u.subUnit1?.name ?? "");
                            setUnitFormSub1Rate(
                              u.subUnit1
                                ? String(u.subUnit1.conversionRate)
                                : "",
                            );
                            setUnitFormSub1MRP(
                              u.subUnit1?.mrp ? String(u.subUnit1.mrp) : "",
                            );
                            setUnitFormSub1Price(
                              u.subUnit1?.sellingPrice
                                ? String(u.subUnit1.sellingPrice)
                                : "",
                            );
                            setUnitFormSub2Name(u.subUnit2?.name ?? "");
                            setUnitFormSub2Rate(
                              u.subUnit2
                                ? String(u.subUnit2.conversionRate)
                                : "",
                            );
                            setUnitFormSub2MRP(
                              u.subUnit2?.mrp ? String(u.subUnit2.mrp) : "",
                            );
                            setUnitFormSub2Price(
                              u.subUnit2?.sellingPrice
                                ? String(u.subUnit2.sellingPrice)
                                : "",
                            );
                            setUnitFormSub3Name(u.subUnit3?.name ?? "");
                            setUnitFormSub3Rate(
                              u.subUnit3
                                ? String(u.subUnit3.conversionRate)
                                : "",
                            );
                            setUnitFormSub3MRP(
                              u.subUnit3?.mrp ? String(u.subUnit3.mrp) : "",
                            );
                            setUnitFormSub3Price(
                              u.subUnit3?.sellingPrice
                                ? String(u.subUnit3.sellingPrice)
                                : "",
                            );
                            setShowUnitForm(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteUnitId(u.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {allUnits.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No units defined
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Services */}
        <TabsContent value="service" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Services</h3>
            <Button size="sm" onClick={() => openAdd("service")}>
              <Plus className="w-4 h-4 mr-1" /> Add Service
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="text-xs">GST%</TableHead>
                  <TableHead className="text-xs">SAC Code</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceProds.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {p.description}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatCurrency(p.price)}
                    </TableCell>
                    <TableCell className="text-xs">{p.gstRate}%</TableCell>
                    <TableCell className="text-xs">{p.sacCode}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.isActive ? "status-paid" : "status-cancelled"
                        }
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(p)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {serviceProds.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No services
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Brand Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editProduct ? "Edit" : "Add"}{" "}
              {formType === "general"
                ? "Product"
                : formType === "courier_awb"
                  ? "Courier Brand"
                  : formType === "xerox"
                    ? "Xerox Product"
                    : "Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formType === "general" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name*</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={category || "__none__"}
                      onValueChange={(v) =>
                        setCategory(v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {allCategories
                          .filter(
                            (c) => c.type === "General" || c.type === "Both",
                          )
                          .map((c) => {
                            const parent = c.parentId
                              ? allCategories.find((p) => p.id === c.parentId)
                              : null;
                            return (
                              <SelectItem key={c.id} value={c.name}>
                                {parent ? `${parent.name} › ${c.name}` : c.name}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Select
                      value={unit || "__none__"}
                      onValueChange={(v) =>
                        setUnit(v === "__none__" ? "Piece" : v)
                      }
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUnits.map((u) => (
                          <SelectItem key={u.id} value={u.name}>
                            {u.name} ({u.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const selectedUnit = allUnits.find(
                        (u) => u.name === unit,
                      );
                      if (!selectedUnit) return null;
                      const parts = [
                        selectedUnit.subUnit1
                          ? `${selectedUnit.subUnit1.name} (÷${selectedUnit.subUnit1.conversionRate})`
                          : null,
                        selectedUnit.subUnit2
                          ? `${selectedUnit.subUnit2.name} (÷${selectedUnit.subUnit2.conversionRate})`
                          : null,
                      ].filter(Boolean);
                      if (parts.length === 0) return null;
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sub-units: {parts.join(", ")}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="col-span-2">
                    {/* Sub-unit Configuration Panel */}
                    {unit && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowSubUnitPanel((v) => !v)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-xs font-semibold text-foreground">
                            Configure Sub-Units
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {showSubUnitPanel ? "▴ Hide" : "▾ Show"}
                          </span>
                        </button>
                        {showSubUnitPanel && (
                          <div className="p-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Set how many sub-units make 1 {unit}. Prices
                              auto-calculate from parent.
                            </p>
                            {/* Sub-unit 1 */}
                            <div className="border border-border/60 rounded-lg p-2.5 space-y-2 bg-background">
                              <p className="text-xs font-semibold text-primary">
                                Sub-Unit 1
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">
                                    Unit Name
                                  </Label>
                                  <Select
                                    value={productSubUnit1?.unitId || ""}
                                    onValueChange={(v) => {
                                      const u = allUnits.find(
                                        (u) => u.id === v,
                                      );
                                      if (!u) return;
                                      const conv =
                                        productSubUnit1?.conversionRate
                                          ? Number(
                                              productSubUnit1.conversionRate,
                                            )
                                          : 1;
                                      setProductSubUnit1({
                                        unitId: u.id,
                                        name: u.name,
                                        conversionRate:
                                          productSubUnit1?.conversionRate ||
                                          "1",
                                        mrp:
                                          sellingPrice && conv > 0
                                            ? String(
                                                (
                                                  Number(sellingPrice) / conv
                                                ).toFixed(2),
                                              )
                                            : "",
                                        sellingPrice:
                                          sellingPrice && conv > 0
                                            ? String(
                                                (
                                                  Number(sellingPrice) / conv
                                                ).toFixed(2),
                                              )
                                            : "",
                                        costPrice:
                                          purchasePrice && conv > 0
                                            ? String(
                                                (
                                                  Number(purchasePrice) / conv
                                                ).toFixed(2),
                                              )
                                            : "",
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs mt-0.5">
                                      <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allUnits.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">
                                    1 {unit} = ?{" "}
                                    {productSubUnit1?.name || "Sub-Unit"}
                                  </Label>
                                  <Input
                                    type="number"
                                    value={
                                      productSubUnit1?.conversionRate || ""
                                    }
                                    onChange={(e) => {
                                      const conv = Number(e.target.value);
                                      setProductSubUnit1((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              conversionRate: e.target.value,
                                              mrp:
                                                sellingPrice && conv > 0
                                                  ? String(
                                                      (
                                                        Number(sellingPrice) /
                                                        conv
                                                      ).toFixed(2),
                                                    )
                                                  : prev.mrp,
                                              sellingPrice:
                                                sellingPrice && conv > 0
                                                  ? String(
                                                      (
                                                        Number(sellingPrice) /
                                                        conv
                                                      ).toFixed(2),
                                                    )
                                                  : prev.sellingPrice,
                                              costPrice:
                                                purchasePrice && conv > 0
                                                  ? String(
                                                      (
                                                        Number(purchasePrice) /
                                                        conv
                                                      ).toFixed(2),
                                                    )
                                                  : prev.costPrice,
                                            }
                                          : null,
                                      );
                                    }}
                                    placeholder={`How many per ${unit}`}
                                    className="h-7 text-xs mt-0.5"
                                  />
                                </div>
                                {productSubUnit1?.unitId && (
                                  <>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        MRP (₹)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={productSubUnit1.mrp}
                                        onChange={(e) =>
                                          setProductSubUnit1((p) =>
                                            p
                                              ? { ...p, mrp: e.target.value }
                                              : null,
                                          )
                                        }
                                        className="h-7 text-xs mt-0.5"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        Selling Price (₹)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={productSubUnit1.sellingPrice}
                                        onChange={(e) =>
                                          setProductSubUnit1((p) =>
                                            p
                                              ? {
                                                  ...p,
                                                  sellingPrice: e.target.value,
                                                }
                                              : null,
                                          )
                                        }
                                        className="h-7 text-xs mt-0.5"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        Cost Price (₹)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={productSubUnit1.costPrice}
                                        onChange={(e) =>
                                          setProductSubUnit1((p) =>
                                            p
                                              ? {
                                                  ...p,
                                                  costPrice: e.target.value,
                                                }
                                              : null,
                                          )
                                        }
                                        className="h-7 text-xs mt-0.5"
                                      />
                                    </div>
                                    <div className="flex items-end pb-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setProductSubUnit1(null);
                                          setProductSubUnit2(null);
                                          setProductSubUnit3(null);
                                        }}
                                        className="text-xs text-destructive hover:underline"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Sub-unit 2 */}
                            {productSubUnit1?.unitId && (
                              <div className="border border-border/60 rounded-lg p-2.5 space-y-2 bg-background">
                                <p className="text-xs font-semibold text-primary">
                                  Sub-Unit 2
                                </p>
                                {!productSubUnit2 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProductSubUnit2({
                                        unitId: "",
                                        name: "",
                                        conversionRate: "",
                                        mrp: "",
                                        sellingPrice: "",
                                        costPrice: "",
                                      })
                                    }
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    + Add Sub-Unit 2
                                  </button>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        Unit Name
                                      </Label>
                                      <Select
                                        value={productSubUnit2?.unitId || ""}
                                        onValueChange={(v) => {
                                          const u = allUnits.find(
                                            (u) => u.id === v,
                                          );
                                          if (!u) return;
                                          const conv =
                                            productSubUnit2?.conversionRate
                                              ? Number(
                                                  productSubUnit2.conversionRate,
                                                )
                                              : 1;
                                          const sub1SP =
                                            productSubUnit1.sellingPrice
                                              ? Number(
                                                  productSubUnit1.sellingPrice,
                                                )
                                              : 0;
                                          const sub1MRP = productSubUnit1.mrp
                                            ? Number(productSubUnit1.mrp)
                                            : 0;
                                          const sub1CP =
                                            productSubUnit1.costPrice
                                              ? Number(
                                                  productSubUnit1.costPrice,
                                                )
                                              : 0;
                                          setProductSubUnit2({
                                            unitId: u.id,
                                            name: u.name,
                                            conversionRate:
                                              productSubUnit2?.conversionRate ||
                                              "1",
                                            mrp:
                                              sub1MRP && conv > 0
                                                ? String(
                                                    (sub1MRP / conv).toFixed(2),
                                                  )
                                                : "",
                                            sellingPrice:
                                              sub1SP && conv > 0
                                                ? String(
                                                    (sub1SP / conv).toFixed(2),
                                                  )
                                                : "",
                                            costPrice:
                                              sub1CP && conv > 0
                                                ? String(
                                                    (sub1CP / conv).toFixed(2),
                                                  )
                                                : "",
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="h-7 text-xs mt-0.5">
                                          <SelectValue placeholder="Select unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {allUnits.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                              {u.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        1 {productSubUnit1.name} = ?{" "}
                                        {productSubUnit2?.name || "Sub-Unit 2"}
                                      </Label>
                                      <Input
                                        type="number"
                                        value={
                                          productSubUnit2?.conversionRate || ""
                                        }
                                        onChange={(e) => {
                                          const conv = Number(e.target.value);
                                          const sub1SP =
                                            productSubUnit1.sellingPrice
                                              ? Number(
                                                  productSubUnit1.sellingPrice,
                                                )
                                              : 0;
                                          const sub1MRP = productSubUnit1.mrp
                                            ? Number(productSubUnit1.mrp)
                                            : 0;
                                          const sub1CP =
                                            productSubUnit1.costPrice
                                              ? Number(
                                                  productSubUnit1.costPrice,
                                                )
                                              : 0;
                                          setProductSubUnit2((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  conversionRate:
                                                    e.target.value,
                                                  mrp:
                                                    sub1MRP && conv > 0
                                                      ? String(
                                                          (
                                                            sub1MRP / conv
                                                          ).toFixed(2),
                                                        )
                                                      : prev.mrp,
                                                  sellingPrice:
                                                    sub1SP && conv > 0
                                                      ? String(
                                                          (
                                                            sub1SP / conv
                                                          ).toFixed(2),
                                                        )
                                                      : prev.sellingPrice,
                                                  costPrice:
                                                    sub1CP && conv > 0
                                                      ? String(
                                                          (
                                                            sub1CP / conv
                                                          ).toFixed(2),
                                                        )
                                                      : prev.costPrice,
                                                }
                                              : null,
                                          );
                                        }}
                                        placeholder={`How many per ${productSubUnit1.name}`}
                                        className="h-7 text-xs mt-0.5"
                                      />
                                    </div>
                                    {productSubUnit2?.unitId && (
                                      <>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">
                                            MRP (₹)
                                          </Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={productSubUnit2.mrp}
                                            onChange={(e) =>
                                              setProductSubUnit2((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      mrp: e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            className="h-7 text-xs mt-0.5"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">
                                            Selling Price (₹)
                                          </Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={productSubUnit2.sellingPrice}
                                            onChange={(e) =>
                                              setProductSubUnit2((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      sellingPrice:
                                                        e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            className="h-7 text-xs mt-0.5"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">
                                            Cost Price (₹)
                                          </Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={productSubUnit2.costPrice}
                                            onChange={(e) =>
                                              setProductSubUnit2((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      costPrice: e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            className="h-7 text-xs mt-0.5"
                                          />
                                        </div>
                                        <div className="flex items-end pb-0.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setProductSubUnit2(null);
                                              setProductSubUnit3(null);
                                            }}
                                            className="text-xs text-destructive hover:underline"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Sub-unit 3 */}
                            {productSubUnit2?.unitId && (
                              <div className="border border-border/60 rounded-lg p-2.5 space-y-2 bg-background">
                                <p className="text-xs font-semibold text-primary">
                                  Sub-Unit 3
                                </p>
                                {!productSubUnit3 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProductSubUnit3({
                                        unitId: "",
                                        name: "",
                                        conversionRate: "",
                                        mrp: "",
                                        sellingPrice: "",
                                        costPrice: "",
                                      })
                                    }
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    + Add Sub-Unit 3
                                  </button>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        Unit Name
                                      </Label>
                                      <Select
                                        value={productSubUnit3?.unitId || ""}
                                        onValueChange={(v) => {
                                          const u = allUnits.find(
                                            (u) => u.id === v,
                                          );
                                          if (!u) return;
                                          const conv =
                                            productSubUnit3?.conversionRate
                                              ? Number(
                                                  productSubUnit3.conversionRate,
                                                )
                                              : 1;
                                          const sub2SP =
                                            productSubUnit2.sellingPrice
                                              ? Number(
                                                  productSubUnit2.sellingPrice,
                                                )
                                              : 0;
                                          const sub2MRP = productSubUnit2.mrp
                                            ? Number(productSubUnit2.mrp)
                                            : 0;
                                          const sub2CP =
                                            productSubUnit2.costPrice
                                              ? Number(
                                                  productSubUnit2.costPrice,
                                                )
                                              : 0;
                                          setProductSubUnit3({
                                            unitId: u.id,
                                            name: u.name,
                                            conversionRate:
                                              productSubUnit3?.conversionRate ||
                                              "1",
                                            mrp:
                                              sub2MRP && conv > 0
                                                ? String(
                                                    (sub2MRP / conv).toFixed(2),
                                                  )
                                                : "",
                                            sellingPrice:
                                              sub2SP && conv > 0
                                                ? String(
                                                    (sub2SP / conv).toFixed(2),
                                                  )
                                                : "",
                                            costPrice:
                                              sub2CP && conv > 0
                                                ? String(
                                                    (sub2CP / conv).toFixed(2),
                                                  )
                                                : "",
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="h-7 text-xs mt-0.5">
                                          <SelectValue placeholder="Select unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {allUnits.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                              {u.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">
                                        1 {productSubUnit2.name} = ?{" "}
                                        {productSubUnit3?.name || "Sub-Unit 3"}
                                      </Label>
                                      <Input
                                        type="number"
                                        value={
                                          productSubUnit3?.conversionRate || ""
                                        }
                                        onChange={(e) => {
                                          const conv = Number(e.target.value);
                                          const sub2SP =
                                            productSubUnit2.sellingPrice
                                              ? Number(
                                                  productSubUnit2.sellingPrice,
                                                )
                                              : 0;
                                          const sub2MRP = productSubUnit2.mrp
                                            ? Number(productSubUnit2.mrp)
                                            : 0;
                                          const sub2CP =
                                            productSubUnit2.costPrice
                                              ? Number(
                                                  productSubUnit2.costPrice,
                                                )
                                              : 0;
                                          setProductSubUnit3((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  conversionRate:
                                                    e.target.value,
                                                  mrp:
                                                    sub2MRP && conv > 0
                                                      ? String(
                                                          (
                                                            sub2MRP / conv
                                                          ).toFixed(2),
                                                        )
                                                      : prev.mrp,
                                                  sellingPrice:
                                                    sub2SP && conv > 0
                                                      ? String(
                                                          (
                                                            sub2SP / conv
                                                          ).toFixed(2),
                                                        )
                                                      : prev.sellingPrice,
                                                  costPrice:
                                                    sub2CP && conv > 0
                                                      ? String(
                                                          (
                                                            sub2CP / conv
                                                          ).toFixed(2),
                                                        )
                                                      : prev.costPrice,
                                                }
                                              : null,
                                          );
                                        }}
                                        placeholder={`How many per ${productSubUnit2.name}`}
                                        className="h-7 text-xs mt-0.5"
                                      />
                                    </div>
                                    {productSubUnit3?.unitId && (
                                      <>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">
                                            MRP (₹)
                                          </Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={productSubUnit3.mrp}
                                            onChange={(e) =>
                                              setProductSubUnit3((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      mrp: e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            className="h-7 text-xs mt-0.5"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">
                                            Selling Price (₹)
                                          </Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={productSubUnit3.sellingPrice}
                                            onChange={(e) =>
                                              setProductSubUnit3((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      sellingPrice:
                                                        e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            className="h-7 text-xs mt-0.5"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">
                                            Cost Price (₹)
                                          </Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={productSubUnit3.costPrice}
                                            onChange={(e) =>
                                              setProductSubUnit3((p) =>
                                                p
                                                  ? {
                                                      ...p,
                                                      costPrice: e.target.value,
                                                    }
                                                  : null,
                                              )
                                            }
                                            className="h-7 text-xs mt-0.5"
                                          />
                                        </div>
                                        <div className="flex items-end pb-0.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setProductSubUnit3(null)
                                            }
                                            className="text-xs text-destructive hover:underline"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">HSN Code</Label>
                    <Input
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Selling Price (₹)*</Label>
                    <Input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Purchase Price (₹)</Label>
                    <Input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GST Rate (%)</Label>
                    <Select value={gstRate} onValueChange={setGstRate}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Current Stock</Label>
                    <Input
                      type="number"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Stock Alert</Label>
                    <Input
                      type="number"
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
                {/* Named Pricing Tiers */}
                <div className="col-span-2 border border-border rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold">
                    Pricing Tiers (Retail / Wholesale)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Base Selling Price (above) applies when no tier matches.
                    Fill any tier to enable quantity-based pricing.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="text-left px-2 py-1.5 font-semibold border border-border">
                            Tier
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold border border-border">
                            Min Qty
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold border border-border">
                            Max Qty
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold border border-border">
                            MRP (₹)
                          </th>
                          <th className="text-left px-2 py-1.5 font-semibold border border-border">
                            Selling Price (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            "retail",
                            "super_retail",
                            "wholesale",
                            "super_wholesale",
                          ] as PricingTierName[]
                        ).map((tierName) => (
                          <tr key={tierName} className="hover:bg-muted/20">
                            <td className="px-2 py-1.5 border border-border font-medium text-primary">
                              {TIER_LABELS[tierName]}
                            </td>
                            <td className="px-2 py-1.5 border border-border">
                              <Input
                                type="number"
                                value={pricingTiers[tierName].minQty}
                                onChange={(e) =>
                                  setPricingTiers((prev) => ({
                                    ...prev,
                                    [tierName]: {
                                      ...prev[tierName],
                                      minQty: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="1"
                                className="h-7 text-xs w-20"
                              />
                            </td>
                            <td className="px-2 py-1.5 border border-border">
                              <Input
                                type="number"
                                value={pricingTiers[tierName].maxQty}
                                onChange={(e) =>
                                  setPricingTiers((prev) => ({
                                    ...prev,
                                    [tierName]: {
                                      ...prev[tierName],
                                      maxQty: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="∞"
                                className="h-7 text-xs w-20"
                              />
                            </td>
                            <td className="px-2 py-1.5 border border-border">
                              <Input
                                type="number"
                                value={pricingTiers[tierName].mrp}
                                onChange={(e) =>
                                  setPricingTiers((prev) => ({
                                    ...prev,
                                    [tierName]: {
                                      ...prev[tierName],
                                      mrp: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="0.00"
                                className="h-7 text-xs w-24"
                              />
                            </td>
                            <td className="px-2 py-1.5 border border-border">
                              <Input
                                type="number"
                                value={pricingTiers[tierName].sellingPrice}
                                onChange={(e) =>
                                  setPricingTiers((prev) => ({
                                    ...prev,
                                    [tierName]: {
                                      ...prev[tierName],
                                      sellingPrice: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="0.00"
                                className="h-7 text-xs w-24"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    In POS billing, the matching tier is auto-applied based on
                    quantity entered.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={priceIncludesGST}
                      onCheckedChange={setPriceIncludesGST}
                    />
                    <Label className="text-xs">
                      Selling price{" "}
                      <strong>
                        {priceIncludesGST ? "includes" : "excludes"}
                      </strong>{" "}
                      GST
                    </Label>
                  </div>
                </div>
              </>
            )}
            {formType === "courier_awb" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Brand Name*</Label>
                    <Input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="e.g. DTDC, BlueDart, Delhivery"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Brand Category</Label>
                    <Select
                      value={brandCategory}
                      onValueChange={(v) =>
                        setBrandCategory(v as "Courier" | "Cargo" | "Both")
                      }
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Courier">Courier</SelectItem>
                        <SelectItem value="Cargo">Cargo</SelectItem>
                        <SelectItem value="Both">
                          Both (Courier & Cargo)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Default Transport Mode</Label>
                    <Select
                      value={transportModes}
                      onValueChange={(v) =>
                        setTransportModes(v as CourierBrand["transportModes"])
                      }
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Air">Air Only</SelectItem>
                        <SelectItem value="Surface">Surface Only</SelectItem>
                        <SelectItem value="Both">
                          Both (Air &amp; Surface)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      Service Modes (comma-separated)
                    </Label>
                    <Input
                      value={serviceModes}
                      onChange={(e) => setServiceModes(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Air,Surface,GEC"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Default Serial Logic</Label>
                    <Select
                      value={serialLogic}
                      onValueChange={(v) =>
                        setSerialLogic(v as CourierBrand["serialLogic"])
                      }
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential</SelectItem>
                        <SelectItem value="custom_gap">Custom Gap</SelectItem>
                        <SelectItem value="sequential_prefix_first">
                          Prefix First
                        </SelectItem>
                        <SelectItem value="sequential_prefix_second">
                          Prefix Second
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {serialLogic === "custom_gap" && (
                    <div>
                      <Label className="text-xs">Serial Gap</Label>
                      <Input
                        type="number"
                        value={serialGap}
                        onChange={(e) => setSerialGap(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                  )}
                  {(serialLogic === "sequential_prefix_first" ||
                    serialLogic === "sequential_prefix_second") && (
                    <div>
                      <Label className="text-xs">Default Prefix</Label>
                      <Input
                        value={serialPrefix}
                        onChange={(e) => setSerialPrefix(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Default Selling Price (₹)</Label>
                    <Input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GST Rate (%)</Label>
                    <Select value={gstRate} onValueChange={setGstRate}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <Tag className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Product Types</strong> (e.g. D Express, Lite,
                      Priority, Air Cargo) are managed separately. After saving
                      this brand, click the brand row to expand it and use the{" "}
                      <strong>"Add Product"</strong> button to add each product
                      type with its own AWB prefix, serial logic, and pricing.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label className="text-xs">Active</Label>
                </div>
              </>
            )}
            {formType === "xerox" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name*</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Ink Charge/Page (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={inkCharge}
                      onChange={(e) => setInkCharge(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Service Charge/Page (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={serviceCharge}
                      onChange={(e) => setServiceCharge(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Price/Page (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pricePerPage}
                      onChange={(e) => setPricePerPage(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GST Rate (%)</Label>
                    <Select value={gstRate} onValueChange={setGstRate}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Xerox Bulk Pricing Slabs */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Bulk Xerox Pricing (by page count)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={usePricingSlabs}
                        onCheckedChange={setUsePricingSlabs}
                      />
                      <span className="text-xs text-muted-foreground">
                        {usePricingSlabs ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                  {usePricingSlabs && (
                    <div className="space-y-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        e.g. 1–50 pages = ₹1.50/page, 51+ pages = ₹1.00/page
                      </p>
                      {pricingSlabs.map((slab, si) => (
                        <div
                          key={slab._key}
                          className="flex items-center gap-2"
                        >
                          <div className="flex-1 grid grid-cols-3 gap-1">
                            <Input
                              type="number"
                              value={slab.minQty}
                              onChange={(e) => {
                                const updated = [...pricingSlabs];
                                updated[si] = {
                                  ...updated[si],
                                  minQty: Number(e.target.value),
                                };
                                setPricingSlabs(updated);
                              }}
                              placeholder="Min pages"
                              className="text-xs h-7"
                            />
                            <Input
                              type="number"
                              value={slab.maxQty ?? ""}
                              onChange={(e) => {
                                const updated = [...pricingSlabs];
                                updated[si] = {
                                  ...updated[si],
                                  maxQty:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                };
                                setPricingSlabs(updated);
                              }}
                              placeholder="Max (blank=∞)"
                              className="text-xs h-7"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={slab.price}
                              onChange={(e) => {
                                const updated = [...pricingSlabs];
                                updated[si] = {
                                  ...updated[si],
                                  price: Number(e.target.value),
                                };
                                setPricingSlabs(updated);
                              }}
                              placeholder="₹/page"
                              className="text-xs h-7"
                            />
                          </div>
                          <button
                            type="button"
                            className="text-destructive"
                            onClick={() =>
                              setPricingSlabs(
                                pricingSlabs.filter((_, i) => i !== si),
                              )
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs w-full"
                        onClick={() =>
                          setPricingSlabs([
                            ...pricingSlabs,
                            {
                              minQty: 1,
                              maxQty: null,
                              price: 0,
                              _key: String(Date.now()),
                            },
                          ])
                        }
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Slab
                      </Button>
                    </div>
                  )}
                </div>
                {/* Materials Used */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold">
                        Materials Used
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Add materials consumed per job (e.g. Spring, Film, A4
                        Sheet)
                      </p>
                    </div>
                    {xeroxMaterials.length < 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        type="button"
                        onClick={() =>
                          setXeroxMaterials((prev) => [
                            ...prev,
                            { productId: "", quantity: "1", label: "" },
                          ])
                        }
                        data-ocid="xerox.material.add_button"
                      >
                        + Add Material
                      </Button>
                    )}
                  </div>
                  {xeroxMaterials.map((mat, mi) => (
                    <div
                      key={`material-${mi}-${mat.productId}`}
                      className="grid grid-cols-12 gap-1.5 items-center"
                      data-ocid={`xerox.material.row.${mi + 1}`}
                    >
                      <div className="col-span-5">
                        <Select
                          value={mat.productId}
                          onValueChange={(v) => {
                            const updated = [...xeroxMaterials];
                            updated[mi] = { ...updated[mi], productId: v };
                            setXeroxMaterials(updated);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter(
                                (p) =>
                                  p.type === "general" || p.type === "service",
                              )
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {(p as { name: string }).name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="text"
                          value={mat.label}
                          onChange={(e) => {
                            const updated = [...xeroxMaterials];
                            updated[mi] = {
                              ...updated[mi],
                              label: e.target.value,
                            };
                            setXeroxMaterials(updated);
                          }}
                          placeholder="Label (e.g. Spring)"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          value={mat.quantity}
                          onChange={(e) => {
                            const updated = [...xeroxMaterials];
                            updated[mi] = {
                              ...updated[mi],
                              quantity: e.target.value,
                            };
                            setXeroxMaterials(updated);
                          }}
                          placeholder="Qty"
                          className="h-7 text-xs"
                          min="1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setXeroxMaterials((prev) =>
                            prev.filter((_, i) => i !== mi),
                          )
                        }
                        className="col-span-1 text-destructive hover:text-destructive/80 flex justify-center"
                        data-ocid={`xerox.material.delete_button.${mi + 1}`}
                      >
                        <span className="text-sm">✕</span>
                      </button>
                    </div>
                  ))}
                  {xeroxMaterials.length === 0 && (
                    <p
                      className="text-xs text-muted-foreground text-center py-2"
                      data-ocid="xerox.materials.empty_state"
                    >
                      No materials added yet. Click "+ Add Material" to add.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label className="text-xs">Active</Label>
                </div>
              </>
            )}
            {formType === "service" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name*</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SAC Code</Label>
                    <Input
                      value={sacCode}
                      onChange={(e) => setSacCode(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 text-sm resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Price (₹)*</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GST Rate (%)</Label>
                    <Select value={gstRate} onValueChange={setGstRate}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label className="text-xs">Active</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editProduct ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CourierProduct Add/Edit Dialog */}
      {cpDialog && (
        <CourierProductDialog
          brandName={cpDialog.brandName}
          product={cpDialog.product}
          open={!!cpDialog}
          onClose={() => setCpDialog(null)}
          onSave={(cp) => saveCourierProduct(cpDialog.brandId, cp)}
        />
      )}

      {/* Delete CourierProduct Confirm */}
      <AlertDialog
        open={!!deleteCPInfo}
        onOpenChange={(open) => !open && setDeleteCPInfo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{deleteCPInfo?.productType}" from this brand? AWB serial
              ranges linked to this product will remain in inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteCPInfo &&
                deleteCourierProduct(
                  deleteCPInfo.brandId,
                  deleteCPInfo.productId,
                )
              }
              className="bg-destructive"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unit Add/Edit Dialog */}
      <Dialog
        open={showUnitForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowUnitForm(false);
            setEditUnit(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Unit Name*</Label>
                <Input
                  value={unitFormName}
                  onChange={(e) => setUnitFormName(e.target.value)}
                  placeholder="e.g. Piece"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Symbol*</Label>
                <Input
                  value={unitFormSymbol}
                  onChange={(e) => setUnitFormSymbol(e.target.value)}
                  placeholder="e.g. pcs"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">MRP (₹)</Label>
                <Input
                  type="number"
                  value={unitFormMRP}
                  onChange={(e) => setUnitFormMRP(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Selling Price (₹)</Label>
                <Input
                  type="number"
                  value={unitFormPrice}
                  onChange={(e) => setUnitFormPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            {[
              {
                label: "Sub-Unit 1",
                name: unitFormSub1Name,
                setName: setUnitFormSub1Name,
                rate: unitFormSub1Rate,
                setRate: setUnitFormSub1Rate,
                mrp: unitFormSub1MRP,
                setMRP: setUnitFormSub1MRP,
                price: unitFormSub1Price,
                setPrice: setUnitFormSub1Price,
                placeholder: "e.g. Box",
                ratePlaceholder: "e.g. 12",
              },
              {
                label: "Sub-Unit 2",
                name: unitFormSub2Name,
                setName: setUnitFormSub2Name,
                rate: unitFormSub2Rate,
                setRate: setUnitFormSub2Rate,
                mrp: unitFormSub2MRP,
                setMRP: setUnitFormSub2MRP,
                price: unitFormSub2Price,
                setPrice: setUnitFormSub2Price,
                placeholder: "e.g. Carton",
                ratePlaceholder: "e.g. 144",
              },
              {
                label: "Sub-Unit 3",
                name: unitFormSub3Name,
                setName: setUnitFormSub3Name,
                rate: unitFormSub3Rate,
                setRate: setUnitFormSub3Rate,
                mrp: unitFormSub3MRP,
                setMRP: setUnitFormSub3MRP,
                price: unitFormSub3Price,
                setPrice: setUnitFormSub3Price,
                placeholder: "e.g. Master Carton",
                ratePlaceholder: "e.g. 1440",
              },
            ].map((sub) => (
              <div
                key={sub.label}
                className="border border-border rounded-lg p-3 space-y-2"
              >
                <Label className="text-xs font-semibold">
                  {sub.label} (optional)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Name
                    </Label>
                    <Input
                      value={sub.name}
                      onChange={(e) => sub.setName(e.target.value)}
                      placeholder={sub.placeholder}
                      className="mt-1 text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      ÷ qty (how many {unitFormName || "units"} = 1{" "}
                      {sub.label.toLowerCase()}?)
                    </Label>
                    <Input
                      type="number"
                      value={sub.rate}
                      onChange={(e) => sub.setRate(e.target.value)}
                      placeholder={sub.ratePlaceholder}
                      className="mt-1 text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      MRP (₹)
                    </Label>
                    <Input
                      type="number"
                      value={sub.mrp}
                      onChange={(e) => sub.setMRP(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Selling Price (₹)
                    </Label>
                    <Input
                      type="number"
                      value={sub.price}
                      onChange={(e) => sub.setPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 text-sm h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnitForm(false);
                setEditUnit(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!unitFormName.trim() || !unitFormSymbol.trim()) {
                  toast.error("Name and Symbol are required");
                  return;
                }
                const unit: ProductUnit = {
                  id: editUnit?.id ?? generateId(),
                  name: unitFormName.trim(),
                  symbol: unitFormSymbol.trim(),
                  mrp: unitFormMRP ? Number(unitFormMRP) : undefined,
                  sellingPrice: unitFormPrice
                    ? Number(unitFormPrice)
                    : undefined,
                  subUnit1:
                    unitFormSub1Name.trim() && unitFormSub1Rate
                      ? {
                          name: unitFormSub1Name.trim(),
                          conversionRate: Number(unitFormSub1Rate),
                          mrp: unitFormSub1MRP
                            ? Number(unitFormSub1MRP)
                            : undefined,
                          sellingPrice: unitFormSub1Price
                            ? Number(unitFormSub1Price)
                            : undefined,
                        }
                      : undefined,
                  subUnit2:
                    unitFormSub2Name.trim() && unitFormSub2Rate
                      ? {
                          name: unitFormSub2Name.trim(),
                          conversionRate: Number(unitFormSub2Rate),
                          mrp: unitFormSub2MRP
                            ? Number(unitFormSub2MRP)
                            : undefined,
                          sellingPrice: unitFormSub2Price
                            ? Number(unitFormSub2Price)
                            : undefined,
                        }
                      : undefined,
                  subUnit3:
                    unitFormSub3Name.trim() && unitFormSub3Rate
                      ? {
                          name: unitFormSub3Name.trim(),
                          conversionRate: Number(unitFormSub3Rate),
                          mrp: unitFormSub3MRP
                            ? Number(unitFormSub3MRP)
                            : undefined,
                          sellingPrice: unitFormSub3Price
                            ? Number(unitFormSub3Price)
                            : undefined,
                        }
                      : undefined,
                };
                if (editUnit) {
                  saveAllUnits(
                    allUnits.map((u) => (u.id === editUnit.id ? unit : u)),
                  );
                  toast.success("Unit updated");
                } else {
                  saveAllUnits([...allUnits, unit]);
                  toast.success("Unit added");
                }
                setShowUnitForm(false);
                setEditUnit(null);
              }}
            >
              {editUnit ? "Update" : "Add"} Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Product Import Dialog */}
      <Dialog
        open={showBulkImport}
        onOpenChange={(o) => {
          if (!o) {
            setShowBulkImport(false);
            setBulkRows([]);
            setBulkFileName("");
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[85vh] flex flex-col"
          data-ocid="products.bulk_import.dialog"
        >
          <DialogHeader>
            <DialogTitle>Bulk Import General Products</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkCSVDownload}
                data-ocid="products.bulk_import.download_button"
              >
                <Download className="w-4 h-4 mr-1" /> Download CSV Template
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {bulkFileName ? bulkFileName : "Upload CSV File"}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBulkFileChange}
                  data-ocid="products.bulk_import.upload_button"
                />
              </label>
              {bulkRows.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {bulkRows.length} rows found (
                  {bulkRows.filter((r) => !r.error).length} valid,{" "}
                  {bulkRows.filter((r) => !!r.error).length} with errors)
                </span>
              )}
            </div>

            {bulkRows.length === 0 && (
              <div className="bg-muted/30 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p>
                  Download the CSV template, fill in your products, then upload.
                </p>
                <p className="text-xs mt-1">
                  Columns: name, category, unit, sellingPrice, purchasePrice,
                  gstRate, hsnCode, currentStock, minStockAlert
                </p>
              </div>
            )}

            {bulkRows.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 text-xs font-semibold border-b border-border">
                  Preview (showing {Math.min(bulkRows.length, 20)} of{" "}
                  {bulkRows.length} rows)
                </div>
                <div className="overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Unit</TableHead>
                        <TableHead className="text-xs">Sell Price</TableHead>
                        <TableHead className="text-xs">GST%</TableHead>
                        <TableHead className="text-xs">Stock</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkRows.slice(0, 20).map((row, idx) => (
                        <TableRow
                          // biome-ignore lint/suspicious/noArrayIndexKey: preview list
                          key={idx}
                          className={
                            row.error ? "bg-red-50" : "hover:bg-muted/10"
                          }
                          data-ocid={`products.bulk_import.row.${idx + 1}`}
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
                          <TableCell className="text-xs">
                            {row.category || "—"}
                          </TableCell>
                          <TableCell className="text-xs">{row.unit}</TableCell>
                          <TableCell className="text-xs">
                            ₹{row.sellingPrice}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.gstRate}%
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.currentStock}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.error ? (
                              <span className="text-destructive font-medium">
                                ✗ {row.error}
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">
                                ✓ OK
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkImport(false);
                setBulkRows([]);
                setBulkFileName("");
              }}
              data-ocid="products.bulk_import.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={bulkRows.filter((r) => !r.error).length === 0}
              data-ocid="products.bulk_import.submit_button"
            >
              Import {bulkRows.filter((r) => !r.error).length} Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Unit Confirm */}
      <AlertDialog
        open={!!deleteUnitId}
        onOpenChange={(open) => !open && setDeleteUnitId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Products using this unit will retain
              their unit label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteUnitId) {
                  saveAllUnits(allUnits.filter((u) => u.id !== deleteUnitId));
                  toast.success("Unit deleted");
                  setDeleteUnitId(null);
                }
              }}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
