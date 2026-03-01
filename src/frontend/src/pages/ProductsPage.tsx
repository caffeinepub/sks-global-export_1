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
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  AnyProduct,
  CourierBrand,
  GeneralProduct,
  ServiceProduct,
  XeroxProduct,
} from "../types";
import { formatCurrency, generateId } from "../utils/helpers";

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
  const [productType, setProductType] = useState("Courier");
  const [serviceModes, setServiceModes] = useState("Air,Surface,GEC");
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
    setProductType("Courier");
    setServiceModes("Air,Surface,GEC");
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
      setProductType(p.productType);
      setServiceModes(p.serviceModes.join(","));
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
      product = {
        id,
        companyId: activeCompanyId,
        type: "courier_awb",
        brandName,
        productType,
        serviceModes: serviceModes.split(",").map((s) => s.trim()),
        serialLogic,
        serialGap: Number(serialGap),
        serialPrefix,
        sellingPrice: Number(sellingPrice),
        gstRate: Number(gstRate),
        isActive,
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
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">
            General ({generalProds.length})
          </TabsTrigger>
          <TabsTrigger value="courier">
            Courier Brands ({courierProds.length})
          </TabsTrigger>
          <TabsTrigger value="xerox">Xerox ({xeroxProds.length})</TabsTrigger>
          <TabsTrigger value="service">
            Services ({serviceProds.length})
          </TabsTrigger>
        </TabsList>

        {/* General Products */}
        <TabsContent value="general" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">General Products</h3>
            <Button size="sm" onClick={() => openAdd("general")}>
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
            <Button size="sm" onClick={() => openAdd("courier_awb")}>
              <Plus className="w-4 h-4 mr-1" /> Add Brand
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Brand Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Service Modes</TableHead>
                  <TableHead className="text-xs">Serial Logic</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="text-xs">GST%</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courierProds.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-semibold">
                      {p.brandName}
                    </TableCell>
                    <TableCell className="text-xs">{p.productType}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {p.serviceModes.map((m) => (
                          <Badge
                            key={m}
                            variant="secondary"
                            className="text-xs"
                          >
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.serialLogic}
                      {p.serialGap ? ` (gap: ${p.serialGap})` : ""}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatCurrency(p.sellingPrice)}
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
                {courierProds.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No courier brands
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Product Type</Label>
                    <Input
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
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
                    <Label className="text-xs">Serial Logic</Label>
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
                      <Label className="text-xs">Prefix</Label>
                      <Input
                        value={serialPrefix}
                        onChange={(e) => setSerialPrefix(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                  )}
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

      {/* Delete Confirm */}
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
    </div>
  );
}
