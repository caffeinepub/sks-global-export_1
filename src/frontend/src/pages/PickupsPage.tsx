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
  Plus,
  Trash2,
  Truck,
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
    addPickup,
    updatePickup,
    deletePickup,
    activeCompanyId,
  } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [confirmPickupId, setConfirmPickupId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [courierBrand, setCourierBrand] = useState("");
  const [scheduledDate, setScheduledDate] = useState(getTodayStr());
  const [scheduledTime, setScheduledTime] = useState("14:00");
  const [estimatedPieces, setEstimatedPieces] = useState("");
  const [estimatedBoxes, setEstimatedBoxes] = useState("");
  const [notes, setNotes] = useState("");

  // Confirm state
  const [confirmedPieces, setConfirmedPieces] = useState("");
  const [confirmedBoxes, setConfirmedBoxes] = useState("");

  const courierBrands = products
    .filter((p) => p.type === "courier_awb")
    .map((p) => (p as { brandName: string }).brandName);

  const filteredPickups = useMemo(() => {
    return [...pickups]
      .sort(
        (a, b) =>
          new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime() -
          new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime(),
      )
      .filter((p) => filterStatus === "all" || p.status === filterStatus);
  }, [pickups, filterStatus]);

  const handleAddPickup = () => {
    if (!courierBrand || !estimatedPieces) {
      toast.error("Please fill required fields");
      return;
    }
    const pickup: CourierPickup = {
      id: generateId(),
      companyId: activeCompanyId,
      courierBrand,
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
    setCourierBrand("");
    setScheduledDate(getTodayStr());
    setScheduledTime("14:00");
    setEstimatedPieces("");
    setEstimatedBoxes("");
    setNotes("");
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
          <h2 className="text-lg font-bold">Courier Pickups</h2>
          <p className="text-sm text-muted-foreground">
            {pickups.length} schedules
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
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
                  <p className="text-sm font-semibold">{p.courierBrand}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.scheduledTime} • {p.estimatedPieces} pcs,{" "}
                    {p.estimatedBoxes} boxes
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
                <TableHead className="text-xs">Brand</TableHead>
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
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No pickups scheduled
                  </TableCell>
                </TableRow>
              ) : (
                filteredPickups.map((pickup) => (
                  <TableRow key={pickup.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">
                          {pickup.courierBrand}
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
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Courier Pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Courier Brand*</Label>
              {courierBrands.length > 0 ? (
                <Select value={courierBrand} onValueChange={setCourierBrand}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {courierBrands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={courierBrand}
                  onChange={(e) => setCourierBrand(e.target.value)}
                  placeholder="Enter courier brand name"
                  className="mt-1 text-sm"
                />
              )}
            </div>
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
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPickup}>Schedule</Button>
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
