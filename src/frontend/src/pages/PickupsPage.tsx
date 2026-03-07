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
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { CourierPickup } from "../types";
import {
  formatDate,
  formatDateTime,
  generateId,
  getTodayStr,
} from "../utils/helpers";

export function PickupsPage() {
  const {
    pickups,
    products,
    customers,
    addPickup,
    updatePickup,
    deletePickup,
    activeCompanyId,
  } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [confirmPickupId, setConfirmPickupId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [serviceLabel, setServiceLabel] = useState("");
  const [scheduledDate, setScheduledDate] = useState(getTodayStr());
  const [scheduledTime, setScheduledTime] = useState("14:00");
  const [estimatedPieces, setEstimatedPieces] = useState("");
  const [estimatedBoxes, setEstimatedBoxes] = useState("");
  const [notes, setNotes] = useState("");

  // Customer state
  const [customerMode, setCustomerMode] = useState<"registered" | "walking">(
    "registered",
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [walkingName, setWalkingName] = useState("");
  const [walkingPhone, setWalkingPhone] = useState("");

  // Confirm state
  const [confirmedPieces, setConfirmedPieces] = useState("");
  const [confirmedBoxes, setConfirmedBoxes] = useState("");

  // Build service options: own brand courier + partner courier brands + general products + xerox + services
  const courierBrands = products.filter((p) => p.type === "courier_awb");
  const ownBrandCouriers = courierBrands.filter(
    (p) => (p as { isOwnBrand?: boolean }).isOwnBrand,
  );
  const partnerBrands = courierBrands.filter(
    (p) => !(p as { isOwnBrand?: boolean }).isOwnBrand,
  );
  const generalProducts = products.filter((p) => p.type === "general");
  const xeroxProducts = products.filter((p) => p.type === "xerox");
  const serviceProducts = products.filter((p) => p.type === "service");

  const registeredCustomers = customers.filter(
    (c) => c.customerType === "registered" && c.isActive,
  );

  const filteredPickups = useMemo(() => {
    return [...pickups]
      .sort(
        (a, b) =>
          new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime() -
          new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime(),
      )
      .filter((p) => filterStatus === "all" || p.status === filterStatus);
  }, [pickups, filterStatus]);

  const resetForm = () => {
    setServiceLabel("");
    setScheduledDate(getTodayStr());
    setScheduledTime("14:00");
    setEstimatedPieces("");
    setEstimatedBoxes("");
    setNotes("");
    setCustomerMode("registered");
    setSelectedCustomerId("");
    setWalkingName("");
    setWalkingPhone("");
  };

  const handleAddPickup = () => {
    if (!serviceLabel || !estimatedPieces) {
      toast.error("Please select a service and enter estimated pieces");
      return;
    }

    let customerName: string | undefined;
    let customerPhone: string | undefined;
    let customerId: string | undefined;
    let customerType: "registered" | "walking" | undefined;

    if (customerMode === "registered") {
      if (selectedCustomerId) {
        const cust = registeredCustomers.find(
          (c) => c.id === selectedCustomerId,
        );
        customerName = cust?.name;
        customerPhone = cust?.phone;
        customerId = selectedCustomerId;
        customerType = "registered";
      }
    } else {
      customerName = walkingName || undefined;
      customerPhone = walkingPhone || undefined;
      customerType = "walking";
    }

    const pickup: CourierPickup = {
      id: generateId(),
      companyId: activeCompanyId,
      courierBrand: serviceLabel,
      serviceLabel,
      customerId,
      customerName,
      customerPhone,
      customerType,
      scheduledDate,
      scheduledTime,
      estimatedPieces: Number(estimatedPieces),
      estimatedBoxes: Number(estimatedBoxes) || 1,
      status: "pending",
      notes: notes || undefined,
    };
    addPickup(pickup);
    toast.success("Pickup scheduled");
    setShowForm(false);
    resetForm();
  };

  const handleConfirmPickup = () => {
    if (!confirmPickupId) return;
    const pickup = pickups.find((p) => p.id === confirmPickupId);
    if (!pickup) return;
    updatePickup({
      ...pickup,
      status: "confirmed",
      confirmedPieces: Number(confirmedPieces) || pickup.estimatedPieces,
      confirmedBoxes: Number(confirmedBoxes) || pickup.estimatedBoxes,
      confirmedAt: new Date().toISOString(),
    });
    toast.success("Pickup confirmed!");
    setConfirmPickupId(null);
    setConfirmedPieces("");
    setConfirmedBoxes("");
  };

  const handleCancelPickup = (id: string) => {
    const pickup = pickups.find((p) => p.id === id);
    if (pickup) {
      updatePickup({ ...pickup, status: "cancelled" });
      toast.success("Pickup cancelled");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
      confirmed: {
        label: "Confirmed",
        className: "bg-green-100 text-green-800",
      },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };
    const config = configs[status] || configs.pending;
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const todayPickups = pickups.filter(
    (p) => p.scheduledDate === getTodayStr() && p.status === "pending",
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Schedule Pickup</h2>
          <p className="text-sm text-muted-foreground">
            {pickups.length} schedules
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          data-ocid="pickups.schedule.primary_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Schedule Pickup
        </Button>
      </div>

      {/* Today's pending pickups banner */}
      {todayPickups.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              {todayPickups.length} Pickup{todayPickups.length > 1 ? "s" : ""}{" "}
              Scheduled for Today
            </p>
          </div>
          <div className="space-y-2">
            {todayPickups.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {p.customerName || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.serviceLabel || p.courierBrand} • {p.scheduledTime} •{" "}
                    {p.estimatedPieces} pcs, {p.estimatedBoxes} boxes
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmPickupId(p.id);
                    setConfirmedPieces(String(p.estimatedPieces));
                    setConfirmedBoxes(String(p.estimatedBoxes));
                  }}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Service / Product</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Est. Pieces</TableHead>
                <TableHead className="text-xs">Est. Boxes</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Confirmed</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPickups.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="pickups.empty_state"
                  >
                    No pickups scheduled
                  </TableCell>
                </TableRow>
              ) : (
                filteredPickups.map((pickup, idx) => (
                  <TableRow
                    key={pickup.id}
                    className="hover:bg-muted/20"
                    data-ocid={`pickups.row.${idx + 1}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-semibold">
                            {pickup.customerName || (
                              <span className="text-muted-foreground italic">
                                No customer
                              </span>
                            )}
                          </p>
                          {pickup.customerPhone && (
                            <p className="text-xs text-muted-foreground">
                              {pickup.customerPhone}
                            </p>
                          )}
                          {pickup.customerType && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                pickup.customerType === "registered"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {pickup.customerType === "registered"
                                ? "Registered"
                                : "Walking"}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium">
                          {pickup.serviceLabel || pickup.courierBrand}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(pickup.scheduledDate)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {pickup.scheduledTime}
                    </TableCell>
                    <TableCell className="text-xs">
                      {pickup.estimatedPieces}
                    </TableCell>
                    <TableCell className="text-xs">
                      {pickup.estimatedBoxes}
                    </TableCell>
                    <TableCell>{getStatusBadge(pickup.status)}</TableCell>
                    <TableCell className="text-xs">
                      {pickup.status === "confirmed" ? (
                        <div>
                          <p className="font-medium">
                            {pickup.confirmedPieces} pcs,{" "}
                            {pickup.confirmedBoxes} boxes
                          </p>
                          {pickup.confirmedAt && (
                            <p className="text-muted-foreground">
                              {formatDateTime(pickup.confirmedAt)}
                            </p>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {pickup.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setConfirmPickupId(pickup.id);
                                setConfirmedPieces(
                                  String(pickup.estimatedPieces),
                                );
                                setConfirmedBoxes(
                                  String(pickup.estimatedBoxes),
                                );
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => handleCancelPickup(pickup.id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deletePickup(pickup.id)}
                          data-ocid={`pickups.delete_button.${idx + 1}`}
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

      {/* Schedule Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowForm(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Customer Section */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Customer</Label>
              </div>
              {/* Customer Type Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerMode("registered")}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    customerMode === "registered"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Registered Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("walking")}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    customerMode === "walking"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Walking Customer
                </button>
              </div>

              {customerMode === "registered" ? (
                <div>
                  <Label className="text-xs">Select Customer</Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Select registered customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {registeredCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` — ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={walkingName}
                      onChange={(e) => setWalkingName(e.target.value)}
                      placeholder="Customer name"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={walkingPhone}
                      onChange={(e) => setWalkingPhone(e.target.value)}
                      placeholder="Mobile number"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Service / Product */}
            <div>
              <Label className="text-sm font-semibold">
                Service / Product*
              </Label>
              <Select value={serviceLabel} onValueChange={setServiceLabel}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="Select service or product" />
                </SelectTrigger>
                <SelectContent>
                  {ownBrandCouriers.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Own Brand Courier
                      </div>
                      {ownBrandCouriers.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={(p as { brandName: string }).brandName}
                        >
                          {(p as { brandName: string }).brandName}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {partnerBrands.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Partner Courier Brands
                      </div>
                      {partnerBrands.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={(p as { brandName: string }).brandName}
                        >
                          {(p as { brandName: string }).brandName}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {generalProducts.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        General Products
                      </div>
                      {generalProducts.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={(p as { name: string }).name}
                        >
                          {(p as { name: string }).name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {xeroxProducts.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Xerox & Printout
                      </div>
                      {xeroxProducts.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={(p as { name: string }).name}
                        >
                          {(p as { name: string }).name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {serviceProducts.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Services
                      </div>
                      {serviceProducts.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={(p as { name: string }).name}
                        >
                          {(p as { name: string }).name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {courierBrands.length === 0 &&
                    generalProducts.length === 0 &&
                    xeroxProducts.length === 0 &&
                    serviceProducts.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        No products found — add products first
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Estimated Pieces*</Label>
                <Input
                  type="number"
                  value={estimatedPieces}
                  onChange={(e) => setEstimatedPieces(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Estimated Boxes</Label>
                <Input
                  type="number"
                  value={estimatedBoxes}
                  onChange={(e) => setEstimatedBoxes(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              data-ocid="pickups.schedule.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPickup}
              data-ocid="pickups.schedule.submit_button"
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmPickupId}
        onOpenChange={(open) => !open && setConfirmPickupId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Confirmed Pieces</Label>
              <Input
                type="number"
                value={confirmedPieces}
                onChange={(e) => setConfirmedPieces(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Confirmed Boxes</Label>
              <Input
                type="number"
                value={confirmedBoxes}
                onChange={(e) => setConfirmedBoxes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPickupId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPickup}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
