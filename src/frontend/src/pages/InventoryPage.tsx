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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, Plus, TrendingUp, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { AWBSerialRange, CourierBrand, GeneralProduct } from "../types";
import { formatCurrency, formatDate, generateId } from "../utils/helpers";

export function InventoryPage() {
  const {
    products,
    awbSerials,
    vendors,
    updateProduct,
    addAWBSerial,
    activeCompanyId,
  } = useAppStore();

  const [showAddStock, setShowAddStock] = useState(false);
  const [showAddAWB, setShowAddAWB] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [awbFrom, setAwbFrom] = useState("");
  const [awbTo, setAwbTo] = useState("");
  const [awbQty, setAwbQty] = useState("");
  const [awbVendorId, setAwbVendorId] = useState("");
  const [awbPurchaseDate, setAwbPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const generalProducts = products.filter(
    (p) => p.type === "general",
  ) as GeneralProduct[];
  const courierBrands = products.filter(
    (p) => p.type === "courier_awb",
  ) as CourierBrand[];

  const handleAddStock = () => {
    const product = generalProducts.find((p) => p.id === selectedProductId);
    if (!product || !addQty) {
      toast.error("Please select product and quantity");
      return;
    }
    updateProduct({
      ...product,
      currentStock: product.currentStock + Number(addQty),
    });
    toast.success(`Added ${addQty} ${product.unit} to ${product.name}`);
    setShowAddStock(false);
    setSelectedProductId("");
    setAddQty("");
  };

  const generateAWBSerials = (
    from: string,
    to: string,
    brand: CourierBrand,
  ): string[] => {
    const serials: string[] = [];
    if (brand.serialLogic === "sequential") {
      const fromNum = Number.parseInt(from.replace(/\D/g, ""));
      const toNum = Number.parseInt(to.replace(/\D/g, ""));
      const prefix = from.replace(/\d+$/, "");
      for (let i = fromNum; i <= toNum; i++) {
        serials.push(
          prefix + String(i).padStart(from.replace(/\D/g, "").length, "0"),
        );
      }
    } else if (brand.serialLogic === "custom_gap") {
      const gap = brand.serialGap || 11;
      let current = Number.parseInt(from);
      const toNum = Number.parseInt(to);
      while (current <= toNum) {
        serials.push(String(current));
        current += gap;
      }
    } else if (brand.serialLogic === "sequential_prefix_first") {
      const prefix = brand.serialPrefix || "";
      const fromNum = Number.parseInt(from.replace(prefix, ""));
      const toNum = Number.parseInt(to.replace(prefix, ""));
      for (let i = fromNum; i <= toNum; i++) {
        serials.push(prefix + i);
      }
    } else {
      const fromNum = Number.parseInt(from);
      const toNum = Number.parseInt(to);
      for (let i = fromNum; i <= toNum; i++) {
        serials.push(String(i));
      }
    }
    return serials;
  };

  const handleAddAWBRange = () => {
    const brand = courierBrands.find((b) => b.id === selectedBrandId);
    if (!brand || !awbFrom || !awbTo) {
      toast.error("Please fill all required fields");
      return;
    }

    const availableSerials = generateAWBSerials(awbFrom, awbTo, brand);
    const qty = Number(awbQty) || availableSerials.length;

    const serialRange: AWBSerialRange = {
      id: generateId(),
      companyId: activeCompanyId,
      brandId: selectedBrandId,
      brandName: brand.brandName,
      fromSerial: awbFrom,
      toSerial: awbTo,
      quantity: qty,
      purchaseDate: awbPurchaseDate,
      vendorId: awbVendorId || undefined,
      usedSerials: [],
      availableSerials: availableSerials.slice(0, qty),
    };

    addAWBSerial(serialRange);
    toast.success(
      `Added ${availableSerials.length} AWB serials for ${brand.brandName}`,
    );
    setShowAddAWB(false);
    setSelectedBrandId("");
    setAwbFrom("");
    setAwbTo("");
    setAwbQty("");
    setAwbVendorId("");
  };

  const getStockLevel = (current: number, min: number) => {
    if (current <= 0) return "critical";
    if (current <= min) return "low";
    if (current <= min * 2) return "moderate";
    return "good";
  };

  const stockColors = {
    critical: "text-red-700 bg-red-50",
    low: "text-amber-700 bg-amber-50",
    moderate: "text-yellow-700 bg-yellow-50",
    good: "text-green-700 bg-green-50",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Inventory Management</h2>
          <p className="text-sm text-muted-foreground">
            Track stock levels and AWB serials
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddAWB(true)}
          >
            <Truck className="w-4 h-4 mr-1" /> Add AWB Range
          </Button>
          <Button size="sm" onClick={() => setShowAddStock(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Stock
          </Button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {generalProducts.filter((p) => p.currentStock <= p.minStockAlert).length >
        0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Low Stock Alert
            </p>
            <p className="text-xs text-amber-700">
              {
                generalProducts.filter((p) => p.currentStock <= p.minStockAlert)
                  .length
              }{" "}
              products are below minimum stock level
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Package className="w-4 h-4 mr-2" /> General Products
          </TabsTrigger>
          <TabsTrigger value="courier">
            <Truck className="w-4 h-4 mr-2" /> Courier AWB
          </TabsTrigger>
        </TabsList>

        {/* General Products Inventory */}
        <TabsContent value="general" className="mt-4">
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Current Stock</TableHead>
                  <TableHead className="text-xs">Min Alert</TableHead>
                  <TableHead className="text-xs">Stock Level</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalProducts.map((p) => {
                  const level = getStockLevel(p.currentStock, p.minStockAlert);
                  const progress = Math.min(
                    100,
                    (p.currentStock / (p.minStockAlert * 3)) * 100,
                  );
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-semibold">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs">{p.category}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${stockColors[level]}`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.minStockAlert} {p.unit}
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="space-y-1">
                          <Progress
                            value={progress}
                            className={`h-2 ${level === "critical" || level === "low" ? "[&>div]:bg-red-500" : level === "moderate" ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
                          />
                          <p className="text-xs capitalize text-muted-foreground">
                            {level}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setShowAddStock(true);
                          }}
                          className="text-xs h-7"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {generalProducts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Courier AWB Inventory */}
        <TabsContent value="courier" className="mt-4">
          <div className="space-y-4">
            {courierBrands.map((brand) => {
              const brandSerials = awbSerials.filter(
                (s) => s.brandId === brand.id,
              );
              const totalAvailable = brandSerials.reduce(
                (sum, s) => sum + s.availableSerials.length,
                0,
              );
              const totalUsed = brandSerials.reduce(
                (sum, s) => sum + s.usedSerials.length,
                0,
              );

              return (
                <div
                  key={brand.id}
                  className="bg-white rounded-xl border border-border shadow-xs overflow-hidden"
                >
                  <div className="p-4 bg-primary/5 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Truck className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">
                            {brand.brandName}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {brand.productType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">
                            {totalAvailable}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Available
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-muted-foreground">
                            {totalUsed}
                          </p>
                          <p className="text-xs text-muted-foreground">Used</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBrandId(brand.id);
                            setShowAddAWB(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Range
                        </Button>
                      </div>
                    </div>
                  </div>
                  {brandSerials.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead className="text-xs">Range</TableHead>
                          <TableHead className="text-xs">
                            Purchase Date
                          </TableHead>
                          <TableHead className="text-xs">Quantity</TableHead>
                          <TableHead className="text-xs">Available</TableHead>
                          <TableHead className="text-xs">Used</TableHead>
                          <TableHead className="text-xs">
                            First Available
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brandSerials.map((range) => (
                          <TableRow key={range.id}>
                            <TableCell className="text-xs font-mono">
                              {range.fromSerial} → {range.toSerial}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDate(range.purchaseDate)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {range.quantity}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-medium ${range.availableSerials.length === 0 ? "text-red-600" : "text-green-600"}`}
                              >
                                {range.availableSerials.length}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {range.usedSerials.length}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-primary">
                              {range.availableSerials[0] || "None"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
            {courierBrands.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-white rounded-xl border border-border">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No courier brands configured</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Stock Dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Select Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {generalProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (Current: {p.currentStock} {p.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Quantity to Add</Label>
              <Input
                type="number"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                placeholder="Enter quantity"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStock(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStock}>Add Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add AWB Range Dialog */}
      <Dialog open={showAddAWB} onOpenChange={setShowAddAWB}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add AWB Serial Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Courier Brand</Label>
              <Select
                value={selectedBrandId}
                onValueChange={setSelectedBrandId}
              >
                <SelectTrigger className="mt-1">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Serial</Label>
                <Input
                  value={awbFrom}
                  onChange={(e) => setAwbFrom(e.target.value)}
                  placeholder="e.g. D100001"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">To Serial</Label>
                <Input
                  value={awbTo}
                  onChange={(e) => setAwbTo(e.target.value)}
                  placeholder="e.g. D100200"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Quantity (auto-calculated)</Label>
                <Input
                  type="number"
                  value={awbQty}
                  onChange={(e) => setAwbQty(e.target.value)}
                  placeholder="Auto"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Purchase Date</Label>
                <Input
                  type="date"
                  value={awbPurchaseDate}
                  onChange={(e) => setAwbPurchaseDate(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Vendor (Optional)</Label>
              <Select value={awbVendorId} onValueChange={setAwbVendorId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAWB(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAWBRange}>Add Range</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
