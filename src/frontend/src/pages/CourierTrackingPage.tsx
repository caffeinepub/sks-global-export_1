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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { Bill, BillItem } from "../types";
import { formatDate } from "../utils/helpers";

// ─── Courier tracking URL map ────────────────────────────────────────────────
const COURIER_TRACKING = [
  {
    name: "DTDC",
    url: "https://www.dtdc.in/tracking/tracking.asp?Ttype=awb&strCNNo={awb}",
    color: "bg-red-500",
    textColor: "text-white",
    initials: "DT",
  },
  {
    name: "BlueDart",
    url: "https://www.bluedart.com/tracking?trackFor=0&trackThis={awb}",
    color: "bg-blue-700",
    textColor: "text-white",
    initials: "BD",
  },
  {
    name: "Delhivery",
    url: "https://www.delhivery.com/tracking/?val={awb}",
    color: "bg-red-600",
    textColor: "text-white",
    initials: "DL",
  },
  {
    name: "UPS",
    url: "https://www.ups.com/track?loc=en_IN&tracknum={awb}",
    color: "bg-amber-700",
    textColor: "text-white",
    initials: "UP",
  },
  {
    name: "Aramex",
    url: "https://www.aramex.com/us/en/track/results?ShipmentNumber={awb}",
    color: "bg-orange-600",
    textColor: "text-white",
    initials: "AX",
  },
  {
    name: "FedEx",
    url: "https://www.fedex.com/en-in/tracking.html?tracknumbers={awb}",
    color: "bg-purple-700",
    textColor: "text-white",
    initials: "FX",
  },
  {
    name: "DHL",
    url: "https://www.dhl.com/en/express/tracking.html?AWB={awb}",
    color: "bg-yellow-500",
    textColor: "text-gray-900",
    initials: "DH",
  },
  {
    name: "Speed Post",
    url: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentNo={awb}",
    color: "bg-green-700",
    textColor: "text-white",
    initials: "SP",
  },
  {
    name: "Ecom Express",
    url: "https://ecomexpress.in/tracking/?awb_field={awb}",
    color: "bg-cyan-600",
    textColor: "text-white",
    initials: "EC",
  },
  {
    name: "ICL Couriers",
    url: "https://www.iclcouriers.in/track?awb={awb}",
    color: "bg-teal-600",
    textColor: "text-white",
    initials: "IC",
  },
  {
    name: "France Express",
    url: "https://www.francexpress.com/track?number={awb}",
    color: "bg-sky-600",
    textColor: "text-white",
    initials: "FE",
  },
  {
    name: "XpressBees",
    url: "https://www.xpressbees.com/track?awbno={awb}",
    color: "bg-indigo-600",
    textColor: "text-white",
    initials: "XB",
  },
  {
    name: "Ekart",
    url: "https://ekartlogistics.com/shipmenttrack/{awb}",
    color: "bg-orange-500",
    textColor: "text-white",
    initials: "EK",
  },
  {
    name: "GATI",
    url: "https://etracking.gati.com/track/{awb}",
    color: "bg-blue-500",
    textColor: "text-white",
    initials: "GT",
  },
  {
    name: "SKS Global Express",
    url: "https://sksglobal-o8l.caffeine.xyz/courier-tracking",
    color: "bg-primary",
    textColor: "text-white",
    initials: "SK",
  },
];

// ─── Tracking status helpers ──────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "booked", label: "Booked", color: "bg-blue-100 text-blue-700" },
  {
    value: "in_transit",
    label: "In Transit",
    color: "bg-amber-100 text-amber-700",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "delivered",
    label: "Delivered",
    color: "bg-green-100 text-green-700",
  },
  { value: "rto", label: "RTO", color: "bg-red-100 text-red-700" },
  {
    value: "exception",
    label: "Exception",
    color: "bg-gray-100 text-gray-700",
  },
  { value: "hold", label: "Hold", color: "bg-purple-100 text-purple-700" },
];

function getStatusColor(status: string) {
  return (
    STATUS_OPTIONS.find((s) => s.value === status)?.color ||
    "bg-gray-100 text-gray-700"
  );
}

function getStatusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
}

// ─── Recent search type ───────────────────────────────────────────────────────
interface RecentSearch {
  awb: string;
  courierName: string;
  trackedAt: string;
}

const RECENT_KEY = "sks_tracking_recent";

function getRecentSearches(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(awb: string, courierName: string) {
  const existing = getRecentSearches().filter(
    (r) => !(r.awb === awb && r.courierName === courierName),
  );
  const updated: RecentSearch[] = [
    { awb, courierName, trackedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, 10);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function openTracking(awb: string, courierName: string) {
  const courier = COURIER_TRACKING.find(
    (c) => c.name.toLowerCase() === courierName.toLowerCase(),
  );
  if (!courier) {
    toast.error(`No tracking URL found for ${courierName}`);
    return;
  }
  const url = courier.url.replace("{awb}", encodeURIComponent(awb.trim()));
  window.open(url, "_blank", "noopener");
  saveRecentSearch(awb, courierName);
}

// ─── Update Status Dialog ─────────────────────────────────────────────────────
interface UpdateStatusDialogProps {
  open: boolean;
  billId: string;
  itemId: string;
  currentStatus: string;
  trackingNotes: Array<{ date: string; note: string; status: string }>;
  onClose: () => void;
  onSave: (
    billId: string,
    itemId: string,
    newStatus: string,
    note: string,
  ) => void;
}

function UpdateStatusDialog({
  open,
  billId,
  itemId,
  currentStatus,
  trackingNotes,
  onClose,
  onSave,
}: UpdateStatusDialogProps) {
  const [newStatus, setNewStatus] = useState(currentStatus || "booked");
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = () => {
    onSave(billId, itemId, newStatus, note);
    setNote("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md"
        data-ocid="tracking.update_status.dialog"
      >
        <DialogHeader>
          <DialogTitle>Update Tracking Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger
                className="mt-1"
                data-ocid="tracking.update_status.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={`text-xs px-2 py-0.5 rounded ${s.color}`}>
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Called customer, will retry tomorrow"
              className="mt-1 text-sm"
              rows={3}
              data-ocid="tracking.update_status.textarea"
            />
          </div>
          {trackingNotes.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-primary font-semibold"
                onClick={() => setShowHistory(!showHistory)}
                data-ocid="tracking.history.toggle"
              >
                <History className="w-3.5 h-3.5" />
                Status History ({trackingNotes.length})
                {showHistory ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {showHistory && (
                <ScrollArea className="mt-2 max-h-36">
                  <div className="space-y-2 pr-2">
                    {[...trackingNotes].reverse().map((entry, idx) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: reversed stable list
                        key={idx}
                        className="text-xs bg-muted/40 rounded-lg p-2 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(entry.status)}`}
                          >
                            {getStatusLabel(entry.status)}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-muted-foreground">{entry.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="tracking.update_status.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            data-ocid="tracking.update_status.save_button"
          >
            Save Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CourierTrackingPage() {
  const { bills, updateBill } = useAppStore();

  // ── Live Tracking state ────────────────────────────────────────────────────
  const [awbInput, setAwbInput] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [recentSearches, setRecentSearches] =
    useState<RecentSearch[]>(getRecentSearches);

  // ── Follow-up state ────────────────────────────────────────────────────────
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updateDialog, setUpdateDialog] = useState<{
    open: boolean;
    billId: string;
    itemId: string;
    currentStatus: string;
    trackingNotes: Array<{ date: string; note: string; status: string }>;
  } | null>(null);

  // ── All courier shipments from bills ──────────────────────────────────────
  const allShipments = useMemo(() => {
    const result: Array<{
      bill: Bill;
      item: BillItem;
    }> = [];
    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.productType === "courier_awb" && item.awbSerial) {
          result.push({ bill, item });
        }
      }
    }
    // Sort by booking date desc
    result.sort(
      (a, b) =>
        new Date(b.bill.date).getTime() - new Date(a.bill.date).getTime(),
    );
    return result;
  }, [bills]);

  // ── Brand list for filter dropdown ────────────────────────────────────────
  const brandOptions = useMemo(() => {
    const names = new Set<string>();
    for (const { item } of allShipments) {
      if (item.brandName) names.add(item.brandName);
    }
    return Array.from(names).sort();
  }, [allShipments]);

  // ── Filtered shipments ────────────────────────────────────────────────────
  const filteredShipments = useMemo(() => {
    return allShipments.filter(({ bill, item }) => {
      if (filterBrand !== "all" && item.brandName !== filterBrand) return false;
      const trackingStatus = (item as BillItem & { trackingStatus?: string })
        .trackingStatus;
      if (filterStatus !== "all" && trackingStatus !== filterStatus)
        return false;
      if (filterDateFrom && bill.date < filterDateFrom) return false;
      if (filterDateTo && bill.date > filterDateTo) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !(
            (item.awbSerial || "").toLowerCase().includes(q) ||
            (item.senderName || "").toLowerCase().includes(q) ||
            (item.receiverName || "").toLowerCase().includes(q) ||
            bill.customerName.toLowerCase().includes(q)
          )
        )
          return false;
      }
      return true;
    });
  }, [
    allShipments,
    filterBrand,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    searchQuery,
  ]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredShipments.length;
    const delivered = filteredShipments.filter(
      ({ item }) =>
        (item as BillItem & { trackingStatus?: string }).trackingStatus ===
        "delivered",
    ).length;
    const rto = filteredShipments.filter(
      ({ item }) =>
        (item as BillItem & { trackingStatus?: string }).trackingStatus ===
        "rto",
    ).length;
    const pending = total - delivered - rto;
    return { total, delivered, rto, pending };
  }, [filteredShipments]);

  // ── Handle Track Now ──────────────────────────────────────────────────────
  const handleTrackNow = () => {
    if (!awbInput.trim()) {
      toast.error("Enter an AWB / tracking number");
      return;
    }
    if (!selectedCourier) {
      toast.error("Select a courier");
      return;
    }
    openTracking(awbInput.trim(), selectedCourier);
    setRecentSearches(getRecentSearches());
  };

  // ── Save tracking status update ────────────────────────────────────────────
  const handleSaveUpdate = (
    billId: string,
    itemId: string,
    newStatus: string,
    note: string,
  ) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;
    const updatedItems = bill.items.map((it) => {
      if (it.id !== itemId) return it;
      const extItem = it as BillItem & {
        trackingStatus?: string;
        trackingNotes?: Array<{ date: string; note: string; status: string }>;
      };
      const existingNotes = extItem.trackingNotes ?? [];
      return {
        ...it,
        trackingStatus: newStatus as BillItem["trackingStatus"],
        trackingNotes: note.trim()
          ? [
              ...existingNotes,
              {
                date: new Date().toISOString(),
                note: note.trim(),
                status: newStatus,
              },
            ]
          : existingNotes,
      };
    });
    updateBill({ ...bill, items: updatedItems });
    toast.success("Tracking status updated");
  };

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Courier Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Track shipments and manage delivery follow-ups
          </p>
        </div>
      </div>

      <Tabs defaultValue="live">
        <TabsList data-ocid="tracking.main.tab">
          <TabsTrigger value="live" data-ocid="tracking.live.tab">
            <Search className="w-4 h-4 mr-2" />
            Live Tracking
          </TabsTrigger>
          <TabsTrigger value="followup" data-ocid="tracking.followup.tab">
            <Truck className="w-4 h-4 mr-2" />
            Shipment Follow-up
            {allShipments.length > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {allShipments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Live Tracking ──────────────────────────────────────────── */}
        <TabsContent value="live" className="mt-4 space-y-6">
          {/* Search Box */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-4">Track a Shipment</h3>
            <div className="flex gap-3 flex-wrap">
              <Input
                className="flex-1 min-w-48"
                placeholder="Enter AWB / Tracking Number"
                value={awbInput}
                onChange={(e) => setAwbInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrackNow()}
                data-ocid="tracking.awb.input"
              />
              <Select
                value={selectedCourier}
                onValueChange={setSelectedCourier}
              >
                <SelectTrigger
                  className="w-52"
                  data-ocid="tracking.courier.select"
                >
                  <SelectValue placeholder="Select Courier" />
                </SelectTrigger>
                <SelectContent>
                  {COURIER_TRACKING.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleTrackNow}
                data-ocid="tracking.track.primary_button"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Track Now
              </Button>
            </div>
          </div>

          {/* Courier Brand Cards */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Track by Courier
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {COURIER_TRACKING.map((courier) => (
                <div
                  key={courier.name}
                  className="bg-white border border-border rounded-xl p-4 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${courier.color} flex items-center justify-center text-sm font-bold ${courier.textColor} shadow-sm`}
                  >
                    {courier.initials}
                  </div>
                  <p className="text-xs font-semibold text-center leading-tight">
                    {courier.name}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7 group-hover:border-primary group-hover:text-primary transition-colors"
                    onClick={() => {
                      if (!awbInput.trim()) {
                        toast.error("Enter an AWB number first");
                        return;
                      }
                      openTracking(awbInput.trim(), courier.name);
                      setRecentSearches(getRecentSearches());
                    }}
                    data-ocid="tracking.courier_card.button"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Track
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Searches
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    localStorage.removeItem(RECENT_KEY);
                    setRecentSearches([]);
                  }}
                  data-ocid="tracking.recent.delete_button"
                >
                  Clear All
                </Button>
              </div>
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">AWB No</TableHead>
                      <TableHead className="text-xs">Courier</TableHead>
                      <TableHead className="text-xs">Tracked On</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSearches.map((r, idx) => (
                      <TableRow
                        key={`${r.awb}-${r.trackedAt}`}
                        data-ocid={`tracking.recent.row.${idx + 1}`}
                      >
                        <TableCell className="text-xs font-mono font-semibold">
                          {r.awb}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.courierName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.trackedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              setAwbInput(r.awb);
                              setSelectedCourier(r.courierName);
                              openTracking(r.awb, r.courierName);
                              setRecentSearches(getRecentSearches());
                            }}
                            data-ocid={`tracking.recent.button.${idx + 1}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Track Again
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Shipment Follow-up ──────────────────────────────────────── */}
        <TabsContent value="followup" className="mt-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Shipments",
                value: stats.total,
                color: "text-foreground",
                bg: "bg-muted/30",
              },
              {
                label: "Pending",
                value: stats.pending,
                color: "text-amber-700",
                bg: "bg-amber-50",
              },
              {
                label: "Delivered",
                value: stats.delivered,
                color: "text-green-700",
                bg: "bg-green-50",
              },
              {
                label: "RTO",
                value: stats.rto,
                color: "text-red-700",
                bg: "bg-red-50",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} rounded-xl p-4 border border-border`}
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-36">
              <Label className="text-xs text-muted-foreground">
                Search AWB / Customer
              </Label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 h-8 text-xs"
                  data-ocid="tracking.followup.search_input"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Brand</Label>
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger
                  className="mt-1 h-8 text-xs w-36"
                  data-ocid="tracking.followup.brand.select"
                >
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brandOptions.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger
                  className="mt-1 h-8 text-xs w-40"
                  data-ocid="tracking.followup.status.select"
                >
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="mt-1 h-8 text-xs w-36"
                data-ocid="tracking.followup.date_from.input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="mt-1 h-8 text-xs w-36"
                data-ocid="tracking.followup.date_to.input"
              />
            </div>
            {(filterBrand !== "all" ||
              filterStatus !== "all" ||
              filterDateFrom ||
              filterDateTo ||
              searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setFilterBrand("all");
                  setFilterStatus("all");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setSearchQuery("");
                }}
                data-ocid="tracking.followup.clear.button"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Shipments Table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">AWB No</TableHead>
                  <TableHead className="text-xs">Brand</TableHead>
                  <TableHead className="text-xs">Sender</TableHead>
                  <TableHead className="text-xs">Receiver</TableHead>
                  <TableHead className="text-xs">Pincode</TableHead>
                  <TableHead className="text-xs">Weight</TableHead>
                  <TableHead className="text-xs">Booking Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Last Note</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-10 text-muted-foreground text-sm"
                      data-ocid="tracking.followup.empty_state"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                        <p>No shipments found</p>
                        <p className="text-xs">
                          Courier bookings from POS billing will appear here
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map(({ bill, item }, idx) => {
                    const extItem = item as BillItem & {
                      trackingStatus?: string;
                      trackingNotes?: Array<{
                        date: string;
                        note: string;
                        status: string;
                      }>;
                    };
                    const lastNote = extItem.trackingNotes?.slice(-1)[0];
                    return (
                      <TableRow
                        key={`${bill.id}-${item.id}`}
                        className="hover:bg-muted/20"
                        data-ocid={`tracking.followup.row.${idx + 1}`}
                      >
                        <TableCell className="text-xs font-mono font-semibold text-primary">
                          {item.awbSerial}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                            {item.brandName || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.senderName || bill.customerName}
                        </TableCell>
                        <TableCell className="text-xs max-w-24 truncate">
                          {item.receiverName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.receiverPincode || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.chargeableWeightKg
                            ? `${item.chargeableWeightKg} kg`
                            : item.actualWeightKg
                              ? `${item.actualWeightKg} kg`
                              : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(bill.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(extItem.trackingStatus || "booked")}`}
                          >
                            {getStatusLabel(extItem.trackingStatus || "booked")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-28 truncate">
                          {lastNote
                            ? lastNote.note || getStatusLabel(lastNote.status)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() =>
                                setUpdateDialog({
                                  open: true,
                                  billId: bill.id,
                                  itemId: item.id,
                                  currentStatus:
                                    extItem.trackingStatus || "booked",
                                  trackingNotes: extItem.trackingNotes ?? [],
                                })
                              }
                              data-ocid={`tracking.followup.edit_button.${idx + 1}`}
                            >
                              Update
                            </Button>
                            {item.brandName && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2"
                                onClick={() => {
                                  if (item.awbSerial) {
                                    openTracking(
                                      item.awbSerial,
                                      item.brandName!,
                                    );
                                  }
                                }}
                                title="Track Online"
                                data-ocid={`tracking.followup.secondary_button.${idx + 1}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Update Status Dialog */}
      {updateDialog && (
        <UpdateStatusDialog
          open={updateDialog.open}
          billId={updateDialog.billId}
          itemId={updateDialog.itemId}
          currentStatus={updateDialog.currentStatus}
          trackingNotes={updateDialog.trackingNotes}
          onClose={() => setUpdateDialog(null)}
          onSave={handleSaveUpdate}
        />
      )}
    </div>
  );
}
