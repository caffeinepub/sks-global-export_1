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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, FileSpreadsheet, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  GeneralProduct,
  PurchaseInvoice,
  PurchaseInvoiceItem,
} from "../types";
import {
  exportToExcel,
  formatCurrency,
  formatDate,
  generateId,
} from "../utils/helpers";

export function PurchaseInvoicesPage() {
  const {
    purchaseInvoices,
    vendors,
    products,
    addPurchaseInvoice,
    updateProduct,
    activeCompanyId,
  } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);

  // Form state
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentStatus, setPaymentStatus] =
    useState<PurchaseInvoice["paymentStatus"]>("paid");
  const [items, setItems] = useState<PurchaseInvoiceItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemAwbFrom, setItemAwbFrom] = useState("");
  const [itemAwbTo, setItemAwbTo] = useState("");

  const generalProducts = products.filter(
    (p) => p.type === "general",
  ) as GeneralProduct[];

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product || !itemQty || !itemPrice) {
      toast.error("Please fill all item fields");
      return;
    }
    const item: PurchaseInvoiceItem = {
      productId: product.id,
      productName:
        product.type === "general"
          ? (product as GeneralProduct).name
          : (product as { brandName: string }).brandName || "Unknown",
      productType: product.type,
      quantity: Number(itemQty),
      unit:
        product.type === "general" ? (product as GeneralProduct).unit : "Piece",
      unitPrice: Number(itemPrice),
      totalPrice: Number(itemQty) * Number(itemPrice),
      awbFrom: itemAwbFrom || undefined,
      awbTo: itemAwbTo || undefined,
    };
    setItems([...items, item]);
    setSelectedProductId("");
    setItemQty("");
    setItemPrice("");
    setItemAwbFrom("");
    setItemAwbTo("");
  };

  const removeItem = (idx: number) =>
    setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const gstAmount = subtotal * 0.18; // simplified
  const total = subtotal + gstAmount;

  const handleSave = () => {
    if (!vendorId || !invoiceNo || items.length === 0) {
      toast.error("Please fill all required fields and add at least one item");
      return;
    }
    const vendor = vendors.find((v) => v.id === vendorId);
    const inv: PurchaseInvoice = {
      id: generateId(),
      companyId: activeCompanyId,
      invoiceNo,
      vendorId,
      vendorName: vendor?.name || "Unknown Vendor",
      date,
      items,
      subtotal,
      gstAmount,
      total,
      paymentStatus,
    };
    addPurchaseInvoice(inv);

    // Update stock for general products
    for (const item of items) {
      if (item.productType === "general") {
        const product = generalProducts.find((p) => p.id === item.productId);
        if (product) {
          updateProduct({
            ...product,
            currentStock: product.currentStock + item.quantity,
          });
        }
      }
    }

    toast.success("Purchase invoice saved");
    setShowForm(false);
    setVendorId("");
    setInvoiceNo("");
    setItems([]);
  };

  const filteredInvoices = useMemo(
    () =>
      [...purchaseInvoices].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [purchaseInvoices],
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Purchase Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {purchaseInvoices.length} invoices
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Purchase Invoice
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Invoice No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">Items</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No purchase invoices
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono font-semibold">
                      {inv.invoiceNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {inv.vendorName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {inv.items.length} items
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${inv.paymentStatus === "paid" ? "status-paid" : inv.paymentStatus === "partial" ? "status-partial" : "status-pending"}`}
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setViewInvoice(inv)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            exportToExcel(
                              [
                                {
                                  name: "Items",
                                  data: inv.items as unknown as Record<
                                    string,
                                    unknown
                                  >[],
                                },
                              ],
                              `PurchaseInv_${inv.invoiceNo}.xlsx`,
                            )
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Vendor*</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className="mt-1 text-sm">
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
              <div>
                <Label className="text-xs">Invoice No*</Label>
                <Input
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <Separator />
            <h4 className="text-sm font-semibold">Add Items</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Product</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.type === "general"
                          ? (p as GeneralProduct).name
                          : (p as { brandName?: string; name?: string })
                              .brandName ||
                            (p as { name?: string }).name ||
                            "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Unit Price (₹)</Label>
                <Input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              {selectedProductId &&
                products.find((p) => p.id === selectedProductId)?.type ===
                  "courier_awb" && (
                  <>
                    <div>
                      <Label className="text-xs">AWB From</Label>
                      <Input
                        value={itemAwbFrom}
                        onChange={(e) => setItemAwbFrom(e.target.value)}
                        placeholder="Start serial"
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">AWB To</Label>
                      <Input
                        value={itemAwbTo}
                        onChange={(e) => setItemAwbTo(e.target.value)}
                        placeholder="End serial"
                        className="mt-1 text-sm"
                      />
                    </div>
                  </>
                )}
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              + Add Item
            </Button>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: list is reordered by user
                    key={idx}
                    className="flex justify-between items-center p-2 bg-muted/30 rounded-lg text-xs"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                      {item.awbFrom && (
                        <p className="text-muted-foreground">
                          AWB: {item.awbFrom} → {item.awbTo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        {formatCurrency(item.totalPrice)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold p-2 bg-primary/5 rounded-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Payment Status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) =>
                  setPaymentStatus(v as PurchaseInvoice["paymentStatus"])
                }
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={!!viewInvoice}
        onOpenChange={(open) => !open && setViewInvoice(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Purchase Invoice: {viewInvoice?.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Vendor</p>
                  <p className="font-semibold">{viewInvoice.vendorName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">
                    {formatDate(viewInvoice.date)}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewInvoice.items.map((item, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    <TableRow key={idx}>
                      <TableCell className="text-xs">
                        {item.productName}
                        {item.awbFrom && ` (${item.awbFrom}→${item.awbTo})`}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST</span>
                  <span>{formatCurrency(viewInvoice.gstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(viewInvoice.total)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewInvoice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
