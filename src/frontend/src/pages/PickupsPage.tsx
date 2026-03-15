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
import {
  type ManualPickupContact,
  getManualPickupContacts,
  setManualPickupContacts,
} from "../utils/storage";

export function PickupsPage() {
  const {
    pickups,
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
  const [scheduledDate, setScheduledDate] = useState(getTodayStr());
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [notes, setNotes] = useState("");

  // Customer state
  const [customerMode, setCustomerMode] = useState<"registered" | "walking">(
    "registered",
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [walkingName, setWalkingName] = useState("");
  const [walkingPhone, setWalkingPhone] = useState("");
  const [walkingLocation, setWalkingLocation] = useState("");
  const [manualPickupContacts, setManualPickupContactsState] = useState<
    ManualPickupContact[]
  >(() => getManualPickupContacts());
  const [nameSuggestions, setNameSuggestions] = useState<ManualPickupContact[]>(
    [],
  );
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Confirm state (pieces/boxes)
  const [pickedQtyInput, setPickedQtyInput] = useState("");
  const [pickedUnit, setPickedUnit] = useState<"pieces" | "boxes">("pieces");

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
    setScheduledDate(getTodayStr());
    setScheduledTime("18:00");
    setNotes("");
    setCustomerMode("registered");
    setSelectedCustomerId("");
    setWalkingName("");
    setWalkingPhone("");
    setWalkingLocation("");
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  };

  const handleAddPickup = () => {
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
      // Save manual pickup contact for autocomplete
      if (walkingName || walkingPhone) {
        const existing = manualPickupContacts.find(
          (c) => c.phone === walkingPhone && c.name === walkingName,
        );
        if (!existing) {
          const newContact: ManualPickupContact = {
            id: generateId(),
            name: walkingName || "",
            phone: walkingPhone || "",
            location: walkingLocation || undefined,
          };
          const updated = [...manualPickupContacts, newContact];
          setManualPickupContacts(updated);
          setManualPickupContactsState(updated);
        }
      }
    }

    const pickup: CourierPickup = {
      id: generateId(),
      companyId: activeCompanyId,
      courierBrand: "",
      customerId,
      customerName,
      customerPhone,
      customerType,
      customerLocation:
        customerMode === "walking" ? walkingLocation || undefined : undefined,
      scheduledDate,
      scheduledTime,
      estimatedPieces: 0,
      estimatedBoxes: 0,
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
    const qty = Number(pickedQtyInput) || 1;
    updatePickup({
      ...pickup,
      status: "confirmed",
      confirmedPieces: pickedUnit === "pieces" ? qty : pickup.estimatedPieces,
      confirmedBoxes: pickedUnit === "boxes" ? qty : pickup.estimatedBoxes,
      pickedQty: qty,
      pickedUnit,
      confirmedAt: new Date().toISOString(),
    });
    toast.success("Pickup confirmed!");
    setConfirmPickupId(null);
    setPickedQtyInput("");
    setPickedUnit("pieces");
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
                    {p.scheduledTime} • {p.estimatedPieces} pcs,{" "}
                    {p.estimatedBoxes} boxes
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmPickupId(p.id);
                    setPickedQtyInput(String(p.estimatedPieces));
                    setPickedUnit("pieces");
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
                                setPickedQtyInput(
                                  String(pickup.estimatedPieces),
                                );
                                setPickedUnit("pieces");
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
                  Manual Entry
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
                <div className="space-y-2">
                  <div className="relative">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={walkingName}
                      onChange={(e) => {
                        setWalkingName(e.target.value);
                        const q = e.target.value.toLowerCase();
                        if (q.length >= 1) {
                          const manualMatches = manualPickupContacts.filter(
                            (c) =>
                              c.name.toLowerCase().includes(q) ||
                              c.phone.includes(q),
                          );
                          const registeredMatches = registeredCustomers
                            .filter(
                              (c) =>
                                c.name.toLowerCase().includes(q) ||
                                c.phone?.includes(q),
                            )
                            .map((c) => ({
                              id: c.id,
                              name: c.name,
                              phone: c.phone || "",
                              location: c.address || undefined,
                            }));
                          const combined = [
                            ...registeredMatches,
                            ...manualMatches.filter(
                              (m) =>
                                !registeredMatches.find(
                                  (r) => r.name === m.name,
                                ),
                            ),
                          ].slice(0, 8);
                          setNameSuggestions(combined);
                          setShowNameSuggestions(combined.length > 0);
                        } else {
                          setShowNameSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (!walkingName) {
                          const combined = [
                            ...registeredCustomers.slice(0, 4).map((c) => ({
                              id: c.id,
                              name: c.name,
                              phone: c.phone || "",
                              location: c.address || undefined,
                            })),
                            ...manualPickupContacts.slice(0, 4),
                          ].slice(0, 8);
                          if (combined.length > 0) {
                            setNameSuggestions(combined);
                            setShowNameSuggestions(true);
                          }
                        }
                      }}
                      onBlur={() =>
                        setTimeout(() => setShowNameSuggestions(false), 200)
                      }
                      placeholder="Customer name"
                      className="mt-1 text-sm"
                    />
                    {showNameSuggestions && nameSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {nameSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setWalkingName(c.name);
                              setWalkingPhone(c.phone);
                              setWalkingLocation(c.location || "");
                              setShowNameSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex flex-col"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">
                              {c.phone}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Phone / Mobile</Label>
                      <Input
                        value={walkingPhone}
                        onChange={(e) => setWalkingPhone(e.target.value)}
                        placeholder="Mobile number"
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Location (optional)</Label>
                      <Input
                        value={walkingLocation}
                        onChange={(e) => setWalkingLocation(e.target.value)}
                        placeholder="Address or maps link"
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Pickup — How Much Was Picked?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Quantity Picked</Label>
              <Input
                type="number"
                min="1"
                value={pickedQtyInput}
                onChange={(e) => setPickedQtyInput(e.target.value)}
                placeholder="Enter quantity"
                className="mt-1 text-base font-bold text-center h-12"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Unit</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPickedUnit("pieces")}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                    pickedUnit === "pieces"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-muted-foreground hover:border-primary/50"
                  }`}
                  data-ocid="pickups.confirm.pieces.toggle"
                >
                  📦 Pieces
                </button>
                <button
                  type="button"
                  onClick={() => setPickedUnit("boxes")}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                    pickedUnit === "boxes"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-muted-foreground hover:border-primary/50"
                  }`}
                  data-ocid="pickups.confirm.boxes.toggle"
                >
                  🗃 Boxes
                </button>
              </div>
            </div>
            {pickedQtyInput && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 text-center font-medium">
                {pickedQtyInput} {pickedUnit} picked
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmPickupId(null);
                setPickedQtyInput("");
                setPickedUnit("pieces");
              }}
              data-ocid="pickups.confirm.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPickup}
              className="bg-green-600 hover:bg-green-700"
              data-ocid="pickups.confirm.confirm_button"
            >
              Confirm Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
