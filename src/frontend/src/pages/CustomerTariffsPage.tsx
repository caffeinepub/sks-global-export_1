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
  IndianRupee,
  Package,
  Plus,
  Search,
  Tags,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  CourierTariff,
  Customer,
  CustomerTariffAssignment,
} from "../types";
import {
  SHARED_DATA_ID,
  getCustomerTariffMap,
  getTariffs,
  setCustomerTariffMap,
} from "../utils/storage";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlatAssignment {
  customerId: string;
  customerName: string;
  customerPhone: string;
  tariffId: string;
  brandName: string;
  productType: string;
  zone: string;
  transportMode: string;
  customPrice: number;
  isGSTInclusive: boolean;
  standardRateSummary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTariffSummary(t: CourierTariff): string {
  if (t.pricingMode === "per_kg") {
    return `₹${t.ratePerKg ?? 0}/kg (min ${t.minKg ?? 1}kg)`;
  }
  const slabs = t.slabs ?? [];
  if (slabs.length === 0) return "—";
  const first = slabs[0];
  const label = first.maxGrams ? `≤${first.maxGrams}g` : "addl";
  return `From ₹${first.price} (${label})`;
}

// ── Add Assignment Dialog ──────────────────────────────────────────────────────

interface AddDialogProps {
  activeCompanyId: string;
  registeredCustomers: Customer[];
  tariffs: CourierTariff[];
  onSave: (customerId: string, assignment: CustomerTariffAssignment) => void;
  onClose: () => void;
}

function AddAssignmentDialog({
  activeCompanyId: _activeCompanyId,
  registeredCustomers,
  tariffs,
  onSave,
  onClose,
}: AddDialogProps) {
  const [customerId, setCustomerId] = useState("");
  const [tariffId, setTariffId] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const activeTariffs = tariffs.filter((t) => t.isActive);

  const selectedTariff = activeTariffs.find((t) => t.id === tariffId);

  const handleSave = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!tariffId) {
      toast.error("Please select a tariff entry");
      return;
    }
    const price = Number(customPrice);
    if (!customPrice || Number.isNaN(price) || price <= 0) {
      toast.error("Please enter a valid custom price greater than 0");
      return;
    }
    if (!selectedTariff) {
      toast.error("Selected tariff not found");
      return;
    }

    const assignment: CustomerTariffAssignment = {
      tariffId,
      brandName: selectedTariff.brandName,
      productType: selectedTariff.productType,
      zone: selectedTariff.zone,
      customPrice: price,
    };

    // Check if this tariffId already exists for the customer
    const existing = getCustomerTariffMap(SHARED_DATA_ID);
    const customerAssignments = existing[customerId] ?? [];
    const alreadyExists = customerAssignments.some(
      (a) => a.tariffId === tariffId,
    );
    if (alreadyExists) {
      toast.error(
        "A custom rate for this tariff already exists for this customer. Use Edit to update it.",
      );
      return;
    }

    onSave(customerId, assignment);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-ocid="customer-tariffs.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-4 h-4 text-primary" />
            Add Customer Tariff Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-customer">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger
                id="ct-customer"
                data-ocid="customer-tariffs.customer.select"
              >
                <SelectValue placeholder="Select registered customer" />
              </SelectTrigger>
              <SelectContent>
                {registeredCustomers.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No registered customers
                  </SelectItem>
                ) : (
                  registeredCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({c.phone})
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tariff Entry */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-tariff">Tariff Entry</Label>
            <Select value={tariffId} onValueChange={setTariffId}>
              <SelectTrigger
                id="ct-tariff"
                data-ocid="customer-tariffs.tariff.select"
              >
                <SelectValue placeholder="Select tariff entry" />
              </SelectTrigger>
              <SelectContent>
                {activeTariffs.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No active tariffs — add from Tariff Rates page
                  </SelectItem>
                ) : (
                  activeTariffs.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.brandName} — {t.productType} —{" "}
                      {(t.transportMode as string) ?? "Both"} — {t.zone}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Standard Rate Preview */}
          {selectedTariff && (
            <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
              <p className="text-muted-foreground font-medium uppercase tracking-wide">
                Standard Rate
              </p>
              <p className="font-semibold text-foreground">
                {getTariffSummary(selectedTariff)}
              </p>
              {selectedTariff.isGSTInclusive && (
                <p className="text-green-600">(GST inclusive)</p>
              )}
            </div>
          )}

          {/* Custom Price */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-price">Custom Price (₹)</Label>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ct-price"
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Enter custom price"
                className="pl-8"
                min="0"
                step="0.01"
                data-ocid="customer-tariffs.price.input"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="customer-tariffs.cancel_button"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} data-ocid="customer-tariffs.save_button">
            Add Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────────

interface EditDialogProps {
  assignment: FlatAssignment;
  onSave: (customerId: string, tariffId: string, newPrice: number) => void;
  onClose: () => void;
}

function EditAssignmentDialog({
  assignment,
  onSave,
  onClose,
}: EditDialogProps) {
  const [customPrice, setCustomPrice] = useState(
    String(assignment.customPrice),
  );

  const handleSave = () => {
    const price = Number(customPrice);
    if (!customPrice || Number.isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price greater than 0");
      return;
    }
    onSave(assignment.customerId, assignment.tariffId, price);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="customer-tariffs.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-primary" />
            Edit Custom Price
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Read-only info */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Customer</span>
              <span className="font-semibold text-xs">
                {assignment.customerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Brand</span>
              <span className="text-xs">{assignment.brandName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">
                Product Type
              </span>
              <span className="text-xs">{assignment.productType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Zone</span>
              <span className="text-xs">{assignment.zone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">
                Standard Rate
              </span>
              <span className="text-xs font-medium">
                {assignment.standardRateSummary}
              </span>
            </div>
          </div>

          {/* Custom Price */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-price">Custom Price (₹)</Label>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="edit-price"
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="pl-8"
                min="0"
                step="0.01"
                data-ocid="customer-tariffs.price.input"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="customer-tariffs.cancel_button"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} data-ocid="customer-tariffs.save_button">
            Update Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CustomerTariffsPage() {
  const { customers, activeCompanyId } = useAppStore();

  const registeredCustomers = useMemo(
    () => customers.filter((c) => c.customerType === "registered"),
    [customers],
  );

  // Local state for tariff map — always reads from shared storage
  const [tariffMap, setLocalTariffMap] = useState<
    Record<string, CustomerTariffAssignment[]>
  >(() => getCustomerTariffMap(SHARED_DATA_ID));

  const [tariffs, setLocalTariffs] = useState<CourierTariff[]>(() =>
    getTariffs(SHARED_DATA_ID),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload tariff map when company switches (shared data)
  useEffect(() => {
    setLocalTariffMap(getCustomerTariffMap(SHARED_DATA_ID));
    setLocalTariffs(getTariffs(SHARED_DATA_ID));
  }, [activeCompanyId]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editAssignment, setEditAssignment] = useState<FlatAssignment | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FlatAssignment | null>(null);
  const [clearAllCustomerId, setClearAllCustomerId] = useState<string | null>(
    null,
  );

  // ── Derived flat list ────────────────────────────────────────────────────────

  const flatAssignments: FlatAssignment[] = useMemo(() => {
    const result: FlatAssignment[] = [];
    for (const customer of registeredCustomers) {
      const assignments = tariffMap[customer.id] ?? [];
      for (const a of assignments) {
        const tariff = tariffs.find((t) => t.id === a.tariffId);
        result.push({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          tariffId: a.tariffId,
          brandName: a.brandName,
          productType: a.productType,
          zone: a.zone,
          transportMode: (tariff?.transportMode as string) ?? "Both",
          customPrice: a.customPrice,
          isGSTInclusive: tariff?.isGSTInclusive ?? false,
          standardRateSummary: tariff ? getTariffSummary(tariff) : "—",
        });
      }
    }
    return result;
  }, [registeredCustomers, tariffMap, tariffs]);

  // ── Filtered ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return flatAssignments.filter((a) => {
      const matchSearch =
        !search ||
        a.customerName.toLowerCase().includes(search.toLowerCase()) ||
        a.brandName.toLowerCase().includes(search.toLowerCase()) ||
        a.productType.toLowerCase().includes(search.toLowerCase()) ||
        a.zone.toLowerCase().includes(search.toLowerCase());
      const matchBrand = filterBrand === "all" || a.brandName === filterBrand;
      return matchSearch && matchBrand;
    });
  }, [flatAssignments, search, filterBrand]);

  // ── Summary stats ─────────────────────────────────────────────────────────────

  const totalAssignments = flatAssignments.length;
  const customersWithRates = new Set(flatAssignments.map((a) => a.customerId))
    .size;
  const brandsCovered = new Set(flatAssignments.map((a) => a.brandName)).size;

  const uniqueBrands = useMemo(
    () => [...new Set(flatAssignments.map((a) => a.brandName))],
    [flatAssignments],
  );

  // ── Save helpers ─────────────────────────────────────────────────────────────

  const persistMap = (updated: Record<string, CustomerTariffAssignment[]>) => {
    setCustomerTariffMap(SHARED_DATA_ID, updated);
    setLocalTariffMap(updated);
  };

  const handleAddSave = (
    customerId: string,
    assignment: CustomerTariffAssignment,
  ) => {
    const current = { ...tariffMap };
    current[customerId] = [...(current[customerId] ?? []), assignment];
    persistMap(current);
    toast.success("Custom tariff rate added");
    setShowAddDialog(false);
  };

  const handleEditSave = (
    customerId: string,
    tariffId: string,
    newPrice: number,
  ) => {
    const current = { ...tariffMap };
    current[customerId] = (current[customerId] ?? []).map((a) =>
      a.tariffId === tariffId ? { ...a, customPrice: newPrice } : a,
    );
    persistMap(current);
    toast.success("Custom price updated");
    setEditAssignment(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const current = { ...tariffMap };
    current[deleteTarget.customerId] = (
      current[deleteTarget.customerId] ?? []
    ).filter((a) => a.tariffId !== deleteTarget.tariffId);
    if (current[deleteTarget.customerId].length === 0) {
      delete current[deleteTarget.customerId];
    }
    persistMap(current);
    toast.success("Assignment removed");
    setDeleteTarget(null);
  };

  const handleClearAllForCustomer = () => {
    if (!clearAllCustomerId) return;
    const current = { ...tariffMap };
    delete current[clearAllCustomerId];
    persistMap(current);
    const name =
      registeredCustomers.find((c) => c.id === clearAllCustomerId)?.name ??
      "Customer";
    toast.success(`All custom rates cleared for ${name}`);
    setClearAllCustomerId(null);
  };

  // Group filtered results by customer
  const groupedByCustomer = useMemo(() => {
    const groups: Record<string, FlatAssignment[]> = {};
    for (const a of filtered) {
      if (!groups[a.customerId]) groups[a.customerId] = [];
      groups[a.customerId].push(a);
    }
    return groups;
  }, [filtered]);

  // Global row index for deterministic markers
  let globalRowIndex = 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tags className="w-6 h-6 text-primary" />
            Customer Tariff Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage custom courier tariff prices for registered customers
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          data-ocid="customer-tariffs.add_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Assignment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Tags className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Assignments
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {totalAssignments}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Customers with Custom Rates
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {customersWithRates}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            of {registeredCustomers.length} registered
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Brands Covered
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{brandsCovered}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, brand, product type or zone..."
              className="pl-9"
              data-ocid="customer-tariffs.search_input"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger data-ocid="customer-tariffs.brand_filter.select">
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
        </div>
      </div>

      {/* Content */}
      {flatAssignments.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-border p-12 text-center"
          data-ocid="customer-tariffs.empty_state"
        >
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            No customer tariff assignments yet
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Add custom tariff rates for registered customers. Different
            customers can have different prices for the same courier tariff.
          </p>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="mt-4 gap-2"
            data-ocid="customer-tariffs.add_button"
          >
            <Plus className="w-4 h-4" />
            Add First Assignment
          </Button>

          {/* Hint box */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm mx-auto flex gap-2 items-start text-left">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Make sure you have tariff entries in <strong>Tariff Rates</strong>{" "}
              page before adding customer assignments.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-border p-10 text-center"
          data-ocid="customer-tariffs.empty_state"
        >
          <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            No results match your filter
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or brand filter
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByCustomer).map(
            ([customerId, customerAssignments]) => {
              const customerName = customerAssignments[0].customerName;
              const customerPhone = customerAssignments[0].customerPhone;

              return (
                <div
                  key={customerId}
                  className="bg-white rounded-xl border border-border shadow-xs overflow-hidden"
                >
                  {/* Customer group header */}
                  <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                        {customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground text-sm">
                          {customerName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {customerPhone}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-1">
                        {customerAssignments.length} rate
                        {customerAssignments.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10 gap-1 h-7"
                      onClick={() => setClearAllCustomerId(customerId)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </Button>
                  </div>

                  <Table data-ocid="customer-tariffs.table">
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs">Brand</TableHead>
                        <TableHead className="text-xs">Product Type</TableHead>
                        <TableHead className="text-xs">Transport</TableHead>
                        <TableHead className="text-xs">Zone</TableHead>
                        <TableHead className="text-xs">Standard Rate</TableHead>
                        <TableHead className="text-xs">Custom Price</TableHead>
                        <TableHead className="text-center text-xs">
                          GST Incl.
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerAssignments.map((a) => {
                        globalRowIndex += 1;
                        return (
                          <TableRow
                            key={a.tariffId}
                            data-ocid={`customer-tariffs.item.${globalRowIndex}`}
                            className="hover:bg-muted/20"
                          >
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-xs font-medium text-primary border-primary/30"
                              >
                                {a.brandName}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.productType}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${a.transportMode === "Air" ? "text-blue-600 border-blue-300" : a.transportMode === "Surface" ? "text-green-600 border-green-300" : "text-orange-600 border-orange-300"}`}
                              >
                                {a.transportMode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {a.zone}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {a.standardRateSummary}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "text-sm font-bold",
                                  "text-primary",
                                )}
                              >
                                ₹{a.customPrice.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {a.isGSTInclusive ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => setEditAssignment(a)}
                                  data-ocid={`customer-tariffs.edit_button.${globalRowIndex}`}
                                  title="Edit custom price"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget(a)}
                                  data-ocid={`customer-tariffs.delete_button.${globalRowIndex}`}
                                  title="Remove assignment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <AddAssignmentDialog
          activeCompanyId={activeCompanyId}
          registeredCustomers={registeredCustomers}
          tariffs={tariffs}
          onSave={handleAddSave}
          onClose={() => setShowAddDialog(false)}
        />
      )}

      {/* Edit Dialog */}
      {editAssignment && (
        <EditAssignmentDialog
          assignment={editAssignment}
          onSave={handleEditSave}
          onClose={() => setEditAssignment(null)}
        />
      )}

      {/* Delete Single Assignment Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom tariff rate for{" "}
              <strong>{deleteTarget?.customerName}</strong> on{" "}
              <strong>
                {deleteTarget?.brandName} — {deleteTarget?.productType} (
                {deleteTarget?.zone})
              </strong>
              . The customer will revert to the standard tariff rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              data-ocid="customer-tariffs.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="customer-tariffs.confirm_button"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All for Customer Confirmation */}
      <AlertDialog
        open={!!clearAllCustomerId}
        onOpenChange={(open) => !open && setClearAllCustomerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Custom Rates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>all custom tariff rates</strong> for{" "}
              <strong>
                {
                  registeredCustomers.find((c) => c.id === clearAllCustomerId)
                    ?.name
                }
              </strong>
              . They will revert to standard rates for all courier services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setClearAllCustomerId(null)}
              data-ocid="customer-tariffs.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllForCustomer}
              className="bg-destructive hover:bg-destructive/90"
              data-ocid="customer-tariffs.confirm_button"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
