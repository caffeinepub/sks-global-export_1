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
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type {
  CourierQuery,
  QueryFollowUpLog,
  QueryPriority,
  QueryStatus,
} from "../types";
import { formatDate, formatDateTime, generateId } from "../utils/helpers";
import {
  SHARED_DATA_ID,
  addTask,
  getCourierQueries,
  setCourierQueries,
} from "../utils/storage";
import { TasksPage } from "./TasksPage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPriorityBadge(priority: QueryPriority) {
  const map: Record<QueryPriority, { label: string; className: string }> = {
    low: { label: "Low", className: "bg-slate-100 text-slate-600" },
    medium: { label: "Medium", className: "bg-blue-100 text-blue-700" },
    high: { label: "High", className: "bg-orange-100 text-orange-700" },
    urgent: { label: "Urgent", className: "bg-red-100 text-red-700 font-bold" },
  };
  const { label, className } = map[priority];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function getStatusBadge(status: QueryStatus) {
  const map: Record<QueryStatus, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-amber-100 text-amber-700" },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700",
    },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
    closed: { label: "Closed", className: "bg-slate-100 text-slate-600" },
  };
  const { label, className } = map[status];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function getStatusIcon(status: QueryStatus) {
  if (status === "open") return <Clock className="w-4 h-4 text-amber-500" />;
  if (status === "in_progress")
    return <RefreshCw className="w-4 h-4 text-blue-500" />;
  if (status === "resolved")
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  return <X className="w-4 h-4 text-slate-400" />;
}

function nextTicketNo(queries: CourierQuery[]): string {
  const max = queries.reduce((m, q) => {
    const num = Number.parseInt(q.ticketNo.replace(/\D/g, ""), 10);
    return Number.isNaN(num) ? m : Math.max(m, num);
  }, 0);
  return `TKT${String(max + 1).padStart(4, "0")}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CourierQueriesPage() {
  const { bills, currentUser, activeCompanyId, users } = useAppStore();

  // Load queries from storage
  const [queries, setQueriesState] = useState<CourierQuery[]>(() =>
    getCourierQueries(SHARED_DATA_ID),
  );

  const saveQueries = (updated: CourierQuery[]) => {
    setCourierQueries(SHARED_DATA_ID, updated);
    setQueriesState(updated);
  };

  // ── Filters ──
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Dialogs ──
  const [createTaskForQuery, setCreateTaskForQuery] =
    useState<CourierQuery | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [editQuery, setEditQuery] = useState<CourierQuery | null>(null);
  const [viewQuery, setViewQuery] = useState<CourierQuery | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Unique brands from bills ──
  const courierBrands = useMemo(() => {
    const brands = new Set<string>();
    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.productType === "courier_awb" && item.brandName) {
          brands.add(item.brandName);
        }
      }
    }
    return Array.from(brands).sort();
  }, [bills]);

  // ── Booked AWBs (from bills) for quick-pick ──
  const bookedAWBs = useMemo(() => {
    const list: {
      awbNo: string;
      brandName: string;
      customerName: string;
      customerPhone: string;
      billNo: string;
      billId: string;
      date: string;
    }[] = [];
    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.productType === "courier_awb" && item.awbSerial) {
          list.push({
            awbNo: item.awbSerial,
            brandName: item.brandName || "",
            customerName: bill.customerName,
            customerPhone: "", // not stored on bill directly
            billNo: bill.billNo,
            billId: bill.id,
            date: bill.date,
          });
        }
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [bills]);

  // ── Filtered list ──
  const filteredQueries = useMemo(() => {
    return queries
      .filter((q) => {
        if (filterStatus !== "all" && q.status !== filterStatus) return false;
        if (filterPriority !== "all" && q.priority !== filterPriority)
          return false;
        if (filterBrand !== "all" && q.brandName !== filterBrand) return false;
        if (
          dateFrom &&
          new Date(q.createdAt) < new Date(`${dateFrom}T00:00:00`)
        )
          return false;
        if (dateTo && new Date(q.createdAt) > new Date(`${dateTo}T23:59:59`))
          return false;
        if (search) {
          const s = search.toLowerCase();
          return (
            q.ticketNo.toLowerCase().includes(s) ||
            q.awbNo.toLowerCase().includes(s) ||
            q.customerName.toLowerCase().includes(s) ||
            q.subject.toLowerCase().includes(s) ||
            q.brandName.toLowerCase().includes(s)
          );
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [
    queries,
    filterStatus,
    filterPriority,
    filterBrand,
    dateFrom,
    dateTo,
    search,
  ]);

  // ── Stats ──
  const stats = useMemo(() => {
    return {
      total: queries.length,
      open: queries.filter((q) => q.status === "open").length,
      inProgress: queries.filter((q) => q.status === "in_progress").length,
      resolved: queries.filter((q) => q.status === "resolved").length,
      closed: queries.filter((q) => q.status === "closed").length,
      urgent: queries.filter((q) => q.priority === "urgent").length,
    };
  }, [queries]);

  // ── Raise / Edit form state ──
  const emptyForm = {
    awbNo: "",
    brandName: "",
    billId: "",
    billNo: "",
    customerName: "",
    customerPhone: "",
    subject: "",
    description: "",
    priority: "medium" as QueryPriority,
    assignedTo: "",
    selectedAWB: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [awbSearch, setAwbSearch] = useState("");

  const openRaise = () => {
    setForm(emptyForm);
    setAwbSearch("");
    setRaiseOpen(true);
  };

  const openEdit = (q: CourierQuery) => {
    setForm({
      awbNo: q.awbNo,
      brandName: q.brandName,
      billId: q.billId || "",
      billNo: q.billNo || "",
      customerName: q.customerName,
      customerPhone: q.customerPhone || "",
      subject: q.subject,
      description: q.description,
      priority: q.priority,
      assignedTo: q.assignedTo || "",
      selectedAWB: "",
    });
    setEditQuery(q);
    setAwbSearch("");
  };

  const handleSelectAWB = (awb: (typeof bookedAWBs)[0]) => {
    setForm((f) => ({
      ...f,
      awbNo: awb.awbNo,
      brandName: awb.brandName,
      billId: awb.billId,
      billNo: awb.billNo,
      customerName: awb.customerName,
      selectedAWB: awb.awbNo,
    }));
    setAwbSearch(awb.awbNo);
  };

  const filteredAWBs = useMemo(() => {
    if (!awbSearch) return bookedAWBs.slice(0, 20);
    const s = awbSearch.toLowerCase();
    return bookedAWBs
      .filter(
        (a) =>
          a.awbNo.toLowerCase().includes(s) ||
          a.customerName.toLowerCase().includes(s) ||
          a.brandName.toLowerCase().includes(s),
      )
      .slice(0, 20);
  }, [bookedAWBs, awbSearch]);

  const saveQuery = () => {
    if (!form.awbNo.trim()) {
      toast.error("AWB number is required");
      return;
    }
    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (editQuery) {
      const updated = queries.map((q) =>
        q.id === editQuery.id
          ? {
              ...q,
              awbNo: form.awbNo,
              brandName: form.brandName,
              billId: form.billId || undefined,
              billNo: form.billNo || undefined,
              customerName: form.customerName,
              customerPhone: form.customerPhone || undefined,
              subject: form.subject,
              description: form.description,
              priority: form.priority,
              assignedTo: form.assignedTo || undefined,
              updatedAt: new Date().toISOString(),
            }
          : q,
      );
      saveQueries(updated);
      toast.success("Query updated");
      setEditQuery(null);
    } else {
      const newQuery: CourierQuery = {
        id: generateId(),
        companyId: activeCompanyId,
        ticketNo: nextTicketNo(queries),
        awbNo: form.awbNo,
        brandName: form.brandName,
        billId: form.billId || undefined,
        billNo: form.billNo || undefined,
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        status: "open",
        raisedBy: currentUser?.username || "system",
        assignedTo: form.assignedTo || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        followUpLogs: [],
      };
      saveQueries([newQuery, ...queries]);
      toast.success(`Ticket ${newQuery.ticketNo} raised`);
      setRaiseOpen(false);
    }
    setForm(emptyForm);
    setAwbSearch("");
  };

  // ── Follow-up log ──
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState<QueryStatus>("open");

  const openFollowUp = (q: CourierQuery) => {
    setViewQuery(q);
    setFollowUpNote("");
    setFollowUpStatus(q.status);
    setFollowUpOpen(true);
  };

  const saveFollowUp = () => {
    if (!viewQuery) return;
    if (!followUpNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    const log: QueryFollowUpLog = {
      id: generateId(),
      date: new Date().toISOString(),
      note: followUpNote,
      by: currentUser?.username || "system",
      status: followUpStatus,
    };
    const updated = queries.map((q) =>
      q.id === viewQuery.id
        ? {
            ...q,
            status: followUpStatus,
            updatedAt: new Date().toISOString(),
            followUpLogs: [...q.followUpLogs, log],
          }
        : q,
    );
    saveQueries(updated);
    setViewQuery(updated.find((q) => q.id === viewQuery.id) || null);
    setFollowUpNote("");
    toast.success("Follow-up added");
  };

  // ── Advance status shortcut ──
  const advanceStatus = (q: CourierQuery) => {
    const flow: Record<QueryStatus, QueryStatus> = {
      open: "in_progress",
      in_progress: "resolved",
      resolved: "closed",
      closed: "closed",
    };
    const next = flow[q.status];
    if (next === q.status) return;
    const log: QueryFollowUpLog = {
      id: generateId(),
      date: new Date().toISOString(),
      note: `Status changed to ${next.replace("_", " ")}`,
      by: currentUser?.username || "system",
      status: next,
    };
    const updated = queries.map((qi) =>
      qi.id === q.id
        ? {
            ...qi,
            status: next,
            updatedAt: new Date().toISOString(),
            followUpLogs: [...qi.followUpLogs, log],
          }
        : qi,
    );
    saveQueries(updated);
    toast.success(`Ticket ${q.ticketNo} → ${next.replace("_", " ")}`);
  };

  const deleteQuery = (id: string) => {
    saveQueries(queries.filter((q) => q.id !== id));
    toast.success("Query deleted");
    setDeleteId(null);
  };

  const usernames = users.map((u) => u.username);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Query Follow-up
            </h1>
            <p className="text-sm text-muted-foreground">
              Raise and track courier booking queries to closure
            </p>
          </div>
        </div>
        <Button
          onClick={openRaise}
          className="gap-2"
          data-ocid="queries.raise.button"
        >
          <Plus className="w-4 h-4" />
          Raise Query
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Total",
            value: stats.total,
            color: "text-foreground",
            bg: "bg-muted/40",
          },
          {
            label: "Open",
            value: stats.open,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Resolved",
            value: stats.resolved,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Closed",
            value: stats.closed,
            color: "text-slate-600",
            bg: "bg-slate-50",
          },
          {
            label: "Urgent",
            value: stats.urgent,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-xl p-3 border border-border`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ticket, AWB, customer..."
              className="pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="queries.search_input"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger
              className="text-sm w-36"
              data-ocid="queries.status.select"
            >
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger
              className="text-sm w-36"
              data-ocid="queries.priority.select"
            >
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger
              className="text-sm w-40"
              data-ocid="queries.brand.select"
            >
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {courierBrands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              className="text-sm w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="text-sm w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {(filterStatus !== "all" ||
            filterPriority !== "all" ||
            filterBrand !== "all" ||
            search ||
            dateFrom ||
            dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus("all");
                setFilterPriority("all");
                setFilterBrand("all");
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
              className="gap-1 text-xs"
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="queries.table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs w-8" />
                <TableHead className="text-xs">Ticket No</TableHead>
                <TableHead className="text-xs">AWB / Brand</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Raised By</TableHead>
                <TableHead className="text-xs">Raised On</TableHead>
                <TableHead className="text-xs">Follow-ups</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-16 text-muted-foreground"
                    data-ocid="queries.empty_state"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Ticket className="w-10 h-10 text-muted-foreground/30" />
                      <p>No queries found</p>
                      <p className="text-xs">
                        Click "Raise Query" to create the first ticket
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQueries.map((q, idx) => (
                  <>
                    <TableRow
                      key={q.id}
                      className="hover:bg-muted/20 cursor-pointer"
                      data-ocid={`queries.item.${idx + 1}`}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setExpandedId(expandedId === q.id ? null : q.id)
                          }
                          data-ocid={`queries.expand.toggle.${idx + 1}`}
                        >
                          {expandedId === q.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-primary">
                        {q.ticketNo}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium font-mono">{q.awbNo}</p>
                        {q.brandName && (
                          <p className="text-muted-foreground">{q.brandName}</p>
                        )}
                        {q.billNo && (
                          <p className="text-[10px] text-muted-foreground">
                            Bill: {q.billNo}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium">{q.customerName}</p>
                        {q.customerPhone && (
                          <p className="text-muted-foreground">
                            {q.customerPhone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px]">
                        <p className="font-medium line-clamp-2">{q.subject}</p>
                      </TableCell>
                      <TableCell>{getPriorityBadge(q.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(q.status)}
                          {getStatusBadge(q.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {q.raisedBy}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(q.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="secondary" className="text-xs">
                          {q.followUpLogs.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Add Follow-up"
                            onClick={() => openFollowUp(q)}
                            data-ocid={`queries.followup.button.${idx + 1}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                          {q.status !== "closed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Advance Status"
                              onClick={() => advanceStatus(q)}
                              data-ocid={`queries.advance.button.${idx + 1}`}
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => openEdit(q)}
                            data-ocid={`queries.edit.button.${idx + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => setDeleteId(q.id)}
                            data-ocid={`queries.delete.button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Create Task"
                            onClick={() => setCreateTaskForQuery(q)}
                            data-ocid={`queries.create_task.button.${idx + 1}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row — follow-up log */}
                    {expandedId === q.id && (
                      <TableRow key={`${q.id}-expanded`}>
                        <TableCell
                          colSpan={11}
                          className="bg-muted/10 px-8 py-3"
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Follow-up History ({q.followUpLogs.length})
                            </p>
                            {q.description && (
                              <div className="bg-white rounded-lg border border-border p-3 mb-2">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  Description
                                </p>
                                <p className="text-xs">{q.description}</p>
                              </div>
                            )}
                            {q.followUpLogs.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">
                                No follow-up notes yet
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {[...q.followUpLogs]
                                  .sort(
                                    (a, b) =>
                                      new Date(b.date).getTime() -
                                      new Date(a.date).getTime(),
                                  )
                                  .map((log) => (
                                    <div
                                      key={log.id}
                                      className="flex gap-3 bg-white rounded-lg border border-border p-3"
                                    >
                                      <div className="mt-0.5">
                                        {getStatusIcon(log.status)}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-mono font-semibold text-primary">
                                            {log.by}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {formatDateTime(log.date)}
                                          </span>
                                          {getStatusBadge(log.status)}
                                        </div>
                                        <p className="text-xs">{log.note}</p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Raise Query Dialog ── */}
      <Dialog
        open={raiseOpen}
        onOpenChange={(o) => {
          if (!o) setRaiseOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Raise New Query
            </DialogTitle>
          </DialogHeader>
          <QueryForm
            form={form}
            setForm={setForm}
            awbSearch={awbSearch}
            setAwbSearch={setAwbSearch}
            filteredAWBs={filteredAWBs}
            handleSelectAWB={handleSelectAWB}
            usernames={usernames}
            isEdit={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaiseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuery} data-ocid="queries.raise.submit_button">
              Raise Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Query Dialog ── */}
      <Dialog
        open={!!editQuery}
        onOpenChange={(o) => {
          if (!o) setEditQuery(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Query — {editQuery?.ticketNo}
            </DialogTitle>
          </DialogHeader>
          <QueryForm
            form={form}
            setForm={setForm}
            awbSearch={awbSearch}
            setAwbSearch={setAwbSearch}
            filteredAWBs={filteredAWBs}
            handleSelectAWB={handleSelectAWB}
            usernames={usernames}
            isEdit={true}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditQuery(null)}>
              Cancel
            </Button>
            <Button onClick={saveQuery} data-ocid="queries.edit.save_button">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Follow-up Dialog ── */}
      <Dialog
        open={followUpOpen}
        onOpenChange={(o) => {
          if (!o) setFollowUpOpen(false);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Follow-up — {viewQuery?.ticketNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewQuery && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">AWB:</span>{" "}
                  <strong className="font-mono">{viewQuery.awbNo}</strong>
                  {viewQuery.brandName && (
                    <span className="text-muted-foreground ml-2">
                      ({viewQuery.brandName})
                    </span>
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {viewQuery.customerName}
                </p>
                <p>
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  {viewQuery.subject}
                </p>
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(viewQuery.status)}
                </div>
              </div>
            )}

            {/* Previous logs (compact) */}
            {viewQuery && viewQuery.followUpLogs.length > 0 && (
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-2">
                  {[...viewQuery.followUpLogs]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .map((log) => (
                      <div
                        key={log.id}
                        className="text-xs border-b border-border pb-2 last:border-0"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono font-semibold text-primary">
                            {log.by}
                          </span>
                          <span>{formatDateTime(log.date)}</span>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="mt-0.5">{log.note}</p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}

            <div className="space-y-2">
              <Label>Update Status</Label>
              <Select
                value={followUpStatus}
                onValueChange={(v) => setFollowUpStatus(v as QueryStatus)}
              >
                <SelectTrigger data-ocid="followup.status.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Follow-up Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Enter follow-up note, action taken, or update..."
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                data-ocid="followup.note.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveFollowUp} data-ocid="followup.save_button">
              Add Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Query?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the query and all follow-up logs.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="queries.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteQuery(deleteId)}
              data-ocid="queries.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Create Task from Query Dialog */}
      {createTaskForQuery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Create Task from Query</h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setCreateTaskForQuery(null)}
              >
                ✕
              </button>
            </div>
            <TasksPage
              initialSourceRef={createTaskForQuery.id}
              initialDescription={`Query: ${createTaskForQuery.subject} | AWB: ${createTaskForQuery.awbNo || "—"} | Customer: ${createTaskForQuery.customerName}`}
              initialSource="query"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Query Form Component ─────────────────────────────────────────────────────

interface QueryFormProps {
  form: {
    awbNo: string;
    brandName: string;
    billId: string;
    billNo: string;
    customerName: string;
    customerPhone: string;
    subject: string;
    description: string;
    priority: QueryPriority;
    assignedTo: string;
    selectedAWB: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      awbNo: string;
      brandName: string;
      billId: string;
      billNo: string;
      customerName: string;
      customerPhone: string;
      subject: string;
      description: string;
      priority: QueryPriority;
      assignedTo: string;
      selectedAWB: string;
    }>
  >;
  awbSearch: string;
  setAwbSearch: (v: string) => void;
  filteredAWBs: {
    awbNo: string;
    brandName: string;
    customerName: string;
    customerPhone: string;
    billNo: string;
    billId: string;
    date: string;
  }[];
  handleSelectAWB: (awb: {
    awbNo: string;
    brandName: string;
    customerName: string;
    customerPhone: string;
    billNo: string;
    billId: string;
    date: string;
  }) => void;
  usernames: string[];
  isEdit: boolean;
}

function QueryForm({
  form,
  setForm,
  setAwbSearch,
  filteredAWBs,
  handleSelectAWB,
  usernames,
}: QueryFormProps) {
  const [showAWBPicker, setShowAWBPicker] = useState(false);

  return (
    <div className="space-y-4">
      {/* AWB Picker */}
      <div className="space-y-2">
        <Label>
          AWB Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            placeholder="Enter AWB or search from booked shipments..."
            value={form.awbNo}
            onChange={(e) => {
              setForm((f) => ({ ...f, awbNo: e.target.value }));
              setAwbSearch(e.target.value);
              setShowAWBPicker(true);
            }}
            onFocus={() => setShowAWBPicker(true)}
            data-ocid="queries.form.awb_input"
          />
          {form.awbNo && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  awbNo: "",
                  brandName: "",
                  billId: "",
                  billNo: "",
                  customerName: "",
                }));
                setAwbSearch("");
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showAWBPicker && filteredAWBs.length > 0 && (
          <div className="border border-border rounded-lg shadow-md bg-white max-h-48 overflow-y-auto z-10">
            {filteredAWBs.map((a) => (
              <button
                type="button"
                key={`${a.awbNo}-${a.billId}`}
                className="w-full text-left px-3 py-2 hover:bg-muted/40 text-xs border-b border-border last:border-0"
                onClick={() => {
                  handleSelectAWB(a);
                  setShowAWBPicker(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{a.awbNo}</span>
                  <span className="text-muted-foreground">{a.brandName}</span>
                </div>
                <div className="text-muted-foreground">
                  {a.customerName} · Bill: {a.billNo} · {formatDate(a.date)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Brand Name</Label>
          <Input
            placeholder="e.g. DTDC, BlueDart"
            value={form.brandName}
            onChange={(e) =>
              setForm((f) => ({ ...f, brandName: e.target.value }))
            }
            data-ocid="queries.form.brand_input"
          />
        </div>
        <div className="space-y-2">
          <Label>Bill No</Label>
          <Input
            placeholder="Associated bill number"
            value={form.billNo}
            onChange={(e) => setForm((f) => ({ ...f, billNo: e.target.value }))}
            data-ocid="queries.form.billno_input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Customer Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Customer name"
            value={form.customerName}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerName: e.target.value }))
            }
            data-ocid="queries.form.customer_input"
          />
        </div>
        <div className="space-y-2">
          <Label>Customer Phone</Label>
          <Input
            placeholder="Mobile number"
            value={form.customerPhone}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerPhone: e.target.value }))
            }
            data-ocid="queries.form.phone_input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="Brief description of the query"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          data-ocid="queries.form.subject_input"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          placeholder="Detailed description of the issue..."
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          data-ocid="queries.form.description_textarea"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, priority: v as QueryPriority }))
            }
          >
            <SelectTrigger data-ocid="queries.form.priority.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assign To (Employee)</Label>
          <Select
            value={form.assignedTo || "_none"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, assignedTo: v === "_none" ? "" : v }))
            }
          >
            <SelectTrigger data-ocid="queries.form.assignee.select">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">-- Unassigned --</SelectItem>
              {usernames.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
