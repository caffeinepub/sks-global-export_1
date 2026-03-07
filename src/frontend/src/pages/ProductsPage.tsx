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
  Edit,
  HelpCircle,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  AnyProduct,
  CourierBrand,
  CourierProduct,
  GeneralProduct,
  ServiceProduct,
  XeroxProduct,
} from "../types";
import { formatCurrency, generateId } from "../utils/helpers";

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
        </TabsList>

        {/* General Products */}
        <TabsContent value="general" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">General Products</h3>
            <Button
              size="sm"
              onClick={() => openAdd("general")}
              data-ocid="products.general.primary_button"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
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
                        {brand.productType} &bull; GST {brand.gstRate}% &bull;{" "}
                        {formatCurrency(brand.sellingPrice)}
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
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="mt-1 text-sm"
                    />
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
                    <Label className="text-xs">Default Product Type</Label>
                    <Input
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="e.g. Courier, Express, Cargo"
                    />
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
                      After creating the brand, click the row to expand it and
                      add individual products (D Express, Lite, Priority, etc.)
                      with their own AWB prefix, serial logic, and pricing.
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
    </div>
  );
}
