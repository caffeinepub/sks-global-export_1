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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  FileText,
  Pencil,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CourierSlipPrintDialog } from "../components/CourierSlipPrintDialog";
import { useAppStore } from "../hooks/useAppStore";
import type { Bill, BillItem, Invoice } from "../types";
import {
  formatCurrency,
  formatDate,
  generateBillNo,
  generateId,
} from "../utils/helpers";

interface BillsPageProps {
  onNavigate: (page: string) => void;
}

export function BillsPage({ onNavigate: _onNavigate }: BillsPageProps) {
  const {
    bills,
    customers,
    addInvoice,
    updateBill,
    deleteBill,
    settings,
    updateSettings,
    activeCompanyId,
    activeCompany,
  } = useAppStore();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [slipItem, setSlipItem] = useState<{
    item: BillItem;
    bill: Bill;
  } | null>(null);
  const [invoiceType, setInvoiceType] = useState<"gst" | "non_gst">("gst");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Edit form state
  const [editPaymentStatus, setEditPaymentStatus] =
    useState<Bill["paymentStatus"]>("paid");
  const [editPaymentMethod, setEditPaymentMethod] =
    useState<Bill["paymentMethod"]>("cash");
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editBalanceDue, setEditBalanceDue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEditBill = (bill: Bill) => {
    setEditBill(bill);
    setEditPaymentStatus(bill.paymentStatus);
    setEditPaymentMethod(bill.paymentMethod);
    setEditAmountPaid(String(bill.amountPaid));
    setEditBalanceDue(String(bill.balanceDue));
    setEditNotes(bill.notes || "");
  };

  const handleSaveEditBill = () => {
    if (!editBill) return;
    const amountPaid = Number.parseFloat(editAmountPaid) || 0;
    const balanceDue = Number.parseFloat(editBalanceDue) || 0;
    updateBill({
      ...editBill,
      paymentStatus: editPaymentStatus,
      paymentMethod: editPaymentMethod,
      amountPaid,
      balanceDue,
      notes: editNotes,
    });
    toast.success(`Bill ${editBill.billNo} updated successfully`);
    setEditBill(null);
  };

  const handleDeleteBill = () => {
    if (!deleteBillId) return;
    const bill = bills.find((b) => b.id === deleteBillId);
    deleteBill(deleteBillId);
    toast.success(`Bill ${bill?.billNo || ""} deleted`);
    setDeleteBillId(null);
  };

  const filteredBills = useMemo(() => {
    return [...bills]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((bill) => {
        const matchSearch =
          bill.billNo.toLowerCase().includes(search.toLowerCase()) ||
          bill.customerName.toLowerCase().includes(search.toLowerCase());
        const matchDate = !filterDate || bill.date === filterDate;
        const matchStatus =
          filterStatus === "all" || bill.paymentStatus === filterStatus;
        return matchSearch && matchDate && matchStatus;
      });
  }, [bills, search, filterDate, filterStatus]);

  const selectedBills = bills.filter((b) => selectedIds.includes(b.id));
  const allSameCustomer =
    selectedBills.length > 0 &&
    selectedBills.every((b) => b.customerId === selectedBills[0].customerId);
  const canGenerateInvoice = selectedBills.length > 0 && allSameCustomer;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredBills.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBills.map((b) => b.id));
    }
  };

  const generateInvoice = () => {
    if (!canGenerateInvoice || !settings || !activeCompany) return;

    const firstBill = selectedBills[0];
    const customer = customers.find((c) => c.id === firstBill.customerId);

    const allItems = selectedBills.flatMap((b) => b.items);
    const subtotal = allItems.reduce((sum, i) => sum + i.totalPrice, 0);

    // Calculate GST breakdown
    const cgst =
      invoiceType === "gst"
        ? allItems.reduce(
            (sum, i) =>
              sum + (i.totalPrice * i.gstRate) / (100 + i.gstRate) / 2,
            0,
          )
        : 0;
    const sgst = cgst;
    const igst = 0;
    const total = subtotal;

    const invoiceNo =
      invoiceType === "gst"
        ? generateBillNo(settings.gstInvoicePrefix, settings.gstInvoiceSeq)
        : generateBillNo(
            settings.nonGstInvoicePrefix,
            settings.nonGstInvoiceSeq,
          );

    const invoice: Invoice = {
      id: generateId(),
      companyId: activeCompanyId,
      invoiceNo,
      invoiceType,
      customerId: firstBill.customerId,
      customerName: firstBill.customerName,
      customerGstin: customer?.gstin,
      customerAddress: customer?.address,
      billIds: selectedIds,
      date: new Date().toISOString().split("T")[0],
      items: allItems,
      subtotal,
      cgst,
      sgst,
      igst,
      total,
      paymentMethod: firstBill.paymentMethod,
      paymentStatus: selectedBills.every((b) => b.paymentStatus === "paid")
        ? "paid"
        : "partial",
      createdAt: new Date().toISOString(),
    };

    addInvoice(invoice);

    // Update bills as invoiced
    for (const bill of selectedBills) {
      updateBill({ ...bill, isInvoiced: true, invoiceId: invoice.id });
    }

    // Update sequence
    const newSettings = {
      ...settings,
      ...(invoiceType === "gst"
        ? { gstInvoiceSeq: settings.gstInvoiceSeq + 1 }
        : { nonGstInvoiceSeq: settings.nonGstInvoiceSeq + 1 }),
    };
    updateSettings(newSettings);

    toast.success(`Invoice ${invoiceNo} generated successfully!`);
    setSelectedIds([]);
    setShowInvoiceDialog(false);
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      paid: "status-paid",
      pending: "status-pending",
      partial: "status-partial",
    };
    return (
      <Badge variant="outline" className={`text-xs ${classes[status] || ""}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold">Bills</h2>
          <p className="text-sm text-muted-foreground">
            {filteredBills.length} bills found
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canGenerateInvoice && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setInvoiceType("gst");
                  setShowInvoiceDialog(true);
                }}
                className="bg-primary"
              >
                <FileText className="w-4 h-4 mr-1" />
                GST Invoice ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInvoiceType("non_gst");
                  setShowInvoiceDialog(true);
                }}
              >
                <FileText className="w-4 h-4 mr-1" />
                Non-GST Invoice
              </Button>
            </>
          )}
          {selectedIds.length > 0 && !allSameCustomer && (
            <p className="text-xs text-destructive self-center">
              Select bills from same customer to generate invoice
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills..."
            className="pl-9 text-sm"
          />
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="text-sm w-full sm:w-40"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="text-sm w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterDate || filterStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterDate("");
              setFilterStatus("all");
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedIds.length === filteredBills.length &&
                      filteredBills.length > 0
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-xs">Bill No</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Items</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No bills found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(bill.id)}
                        onCheckedChange={() => toggleSelect(bill.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold">
                      {bill.billNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(bill.date)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>
                        <p className="font-medium">{bill.customerName}</p>
                        <p className="text-muted-foreground capitalize">
                          {bill.customerType}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bill.items.length} items
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {formatCurrency(bill.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {bill.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(bill.paymentStatus)}</TableCell>
                    <TableCell>
                      {bill.isInvoiced ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewBill(bill)}
                          className="text-xs h-7"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit"
                          onClick={() => openEditBill(bill)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteBillId(bill.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* View Bill Dialog */}
      <Dialog
        open={!!viewBill}
        onOpenChange={(open) => !open && setViewBill(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details - {viewBill?.billNo}</DialogTitle>
          </DialogHeader>
          {viewBill && (
            <div className="space-y-4">
              {/* Company header with logo */}
              <div
                className="text-center border-b border-border pb-3"
                id="bill-print"
              >
                {activeCompany?.logoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={activeCompany.logoUrl}
                      alt="Company Logo"
                      className="h-14 object-contain"
                    />
                  </div>
                )}
                <p className="font-bold text-sm">{activeCompany?.name}</p>
                {activeCompany?.address && (
                  <p className="text-xs text-muted-foreground">
                    {activeCompany.address}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-semibold">{viewBill.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDate(viewBill.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-semibold capitalize">
                    {viewBill.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(viewBill.paymentStatus)}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Slip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewBill.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs max-w-[220px]">
                        {item.productType === "courier_awb" &&
                          item.brandName && (
                            <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">
                              {item.brandName}
                              {item.serviceMode ? ` · ${item.serviceMode}` : ""}
                            </p>
                          )}
                        <p className="font-medium break-words whitespace-normal font-mono">
                          {item.productName}
                        </p>
                        {item.description && (
                          <p className="text-muted-foreground break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                        {/* Legacy: show AWB separately only if productName differs from awbSerial */}
                        {item.awbSerial &&
                          item.productName !== item.awbSerial && (
                            <p className="text-muted-foreground break-words whitespace-normal">
                              AWB: {item.awbSerial}
                            </p>
                          )}
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
                      <TableCell>
                        {item.productType === "courier_awb" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary"
                            title="Print Courier Slip"
                            data-ocid="bill.courier_slip.button"
                            onClick={() =>
                              setSlipItem({ item, bill: viewBill })
                            }
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total (incl. tax)
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(viewBill.total)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(viewBill.amountPaid)}
                  </span>
                </div>
                {viewBill.balanceDue > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="text-destructive font-medium">
                      {formatCurrency(viewBill.balanceDue)}
                    </span>
                  </div>
                )}
              </div>
              {viewBill.notes && (
                <p className="text-xs text-muted-foreground italic">
                  {viewBill.notes}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setViewBill(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog
        open={!!editBill}
        onOpenChange={(open) => !open && setEditBill(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bill — {editBill?.billNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Status</Label>
              <Select
                value={editPaymentStatus}
                onValueChange={(v) =>
                  setEditPaymentStatus(v as Bill["paymentStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select
                value={editPaymentMethod}
                onValueChange={(v) =>
                  setEditPaymentMethod(v as Bill["paymentMethod"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount Paid (₹)</Label>
                <Input
                  type="number"
                  value={editAmountPaid}
                  onChange={(e) => setEditAmountPaid(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Balance Due (₹)</Label>
                <Input
                  type="number"
                  value={editBalanceDue}
                  onChange={(e) => setEditBalanceDue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBill(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditBill}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bill Confirmation */}
      <AlertDialog
        open={!!deleteBillId}
        onOpenChange={(open) => !open && setDeleteBillId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bill{" "}
              <strong>
                {bills.find((b) => b.id === deleteBillId)?.billNo}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBill}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Courier Slip Print Dialog */}
      {slipItem && (
        <CourierSlipPrintDialog
          open={!!slipItem}
          onClose={() => setSlipItem(null)}
          item={slipItem.item}
          billNo={slipItem.bill.billNo}
          billDate={slipItem.bill.date}
          companyName={activeCompany?.name || "SKS Global Export"}
          companyAddress={activeCompany?.address}
          companyPhone={activeCompany?.phone}
          companyLogoUrl={activeCompany?.logoUrl}
        />
      )}

      {/* Invoice Generation Confirmation */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Generate {invoiceType === "gst" ? "GST" : "Non-GST"} Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to generate a{" "}
              <strong>
                {invoiceType === "gst" ? "GST" : "Non-GST"} Invoice
              </strong>{" "}
              for:
            </p>
            <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Customer: </span>
                <strong>{selectedBills[0]?.customerName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Bills: </span>
                <strong>{selectedIds.length}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Total: </span>
                <strong>
                  {formatCurrency(
                    selectedBills.reduce((s, b) => s + b.total, 0),
                  )}
                </strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={generateInvoice}>Generate Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
