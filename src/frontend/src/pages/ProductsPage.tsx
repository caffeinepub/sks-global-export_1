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
  ProductUnit,
  ServiceProduct,
  XeroxProduct,
} from "../types";
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
  const [unitFormSub2Name, setUnitFormSub2Name] = useState("");
  const [unitFormSub2Rate, setUnitFormSub2Rate] = useState("");

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

  // Pricing slabs (with local _key for stable list rendering)
  const [usePricingSlabs, setUsePricingSlabs] = useState(false);
  const [pricingSlabs, setPricingSlabs] = useState<
    Array<PricingSlab & { _key: string }>
  >([]);

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
    setEditProduct(null);
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
      setUsePricingSlabs(p.usePricingSlabs ?? false);
      setPricingSlabs(
        (p.pricingSlabs ?? []).map((s, i) => ({ ...s, _key: String(i) })),
      );
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

  const paperProducts = products.filter(
    (p) => p.type === "general",
  ) as GeneralProduct[];
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
            <div className="flex gap-2">
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
                      {formatCurrency(p.sellingPrice)}
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
                setUnitFormSub1Name("");
                setUnitFormSub1Rate("");
                setUnitFormSub2Name("");
                setUnitFormSub2Rate("");
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
                  <TableHead className="text-xs">Sub-Unit 1</TableHead>
                  <TableHead className="text-xs">Sub-Unit 2</TableHead>
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
                      {u.subUnit1
                        ? `${u.subUnit1.name} (÷${u.subUnit1.conversionRate})`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.subUnit2
                        ? `${u.subUnit2.name} (÷${u.subUnit2.conversionRate})`
                        : "—"}
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
                            setUnitFormSub1Name(u.subUnit1?.name ?? "");
                            setUnitFormSub1Rate(
                              u.subUnit1
                                ? String(u.subUnit1.conversionRate)
                                : "",
                            );
                            setUnitFormSub2Name(u.subUnit2?.name ?? "");
                            setUnitFormSub2Rate(
                              u.subUnit2
                                ? String(u.subUnit2.conversionRate)
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
                {/* Pricing Slabs */}
                <div className="col-span-2 border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Quantity-Based Pricing
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={usePricingSlabs}
                        onCheckedChange={setUsePricingSlabs}
                        className="h-4 w-8"
                      />
                      <span className="text-xs text-muted-foreground">
                        {usePricingSlabs ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                  {usePricingSlabs && (
                    <div className="space-y-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        Base price (above) is used when no slab matches. Add
                        slabs for volume pricing.
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
                              placeholder="Min Qty"
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
                              value={slab.price}
                              onChange={(e) => {
                                const updated = [...pricingSlabs];
                                updated[si] = {
                                  ...updated[si],
                                  price: Number(e.target.value),
                                };
                                setPricingSlabs(updated);
                              }}
                              placeholder="Price/unit"
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
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label className="text-xs">Active</Label>
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
                    <Label className="text-xs">Paper Product</Label>
                    <Select
                      value={paperProductId}
                      onValueChange={setPaperProductId}
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Select paper" />
                      </SelectTrigger>
                      <SelectContent>
                        {paperProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        className="h-4 w-8"
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
          <div className="space-y-3">
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
            </div>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">
                Sub-Unit 1 (optional)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={unitFormSub1Name}
                    onChange={(e) => setUnitFormSub1Name(e.target.value)}
                    placeholder="e.g. Box"
                    className="mt-1 text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    How many {unitFormName || "units"} per sub-unit?
                  </Label>
                  <Input
                    type="number"
                    value={unitFormSub1Rate}
                    onChange={(e) => setUnitFormSub1Rate(e.target.value)}
                    placeholder="e.g. 12"
                    className="mt-1 text-sm h-8"
                  />
                </div>
              </div>
            </div>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">
                Sub-Unit 2 (optional)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={unitFormSub2Name}
                    onChange={(e) => setUnitFormSub2Name(e.target.value)}
                    placeholder="e.g. Carton"
                    className="mt-1 text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    How many {unitFormName || "units"} per sub-unit?
                  </Label>
                  <Input
                    type="number"
                    value={unitFormSub2Rate}
                    onChange={(e) => setUnitFormSub2Rate(e.target.value)}
                    placeholder="e.g. 144"
                    className="mt-1 text-sm h-8"
                  />
                </div>
              </div>
            </div>
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
                  subUnit1:
                    unitFormSub1Name.trim() && unitFormSub1Rate
                      ? {
                          name: unitFormSub1Name.trim(),
                          conversionRate: Number(unitFormSub1Rate),
                        }
                      : undefined,
                  subUnit2:
                    unitFormSub2Name.trim() && unitFormSub2Rate
                      ? {
                          name: unitFormSub2Name.trim(),
                          conversionRate: Number(unitFormSub2Rate),
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
