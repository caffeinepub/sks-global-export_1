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
import { Textarea } from "@/components/ui/textarea";
import { Edit, Eye, Plus, Search, Trash2, User, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import type { Customer } from "../types";
import { formatCurrency, formatDate, generateId } from "../utils/helpers";

export function CustomersPage() {
  const {
    customers,
    bills,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    activeCompanyId,
  } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [customerType, setCustomerType] = useState<"registered" | "walking">(
    "registered",
  );

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setCustomerType("registered");
    setEditCustomer(null);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || c.customerType === filterType;
      return matchSearch && matchType;
    });
  }, [customers, search, filterType]);

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };
  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setAddress(c.address || "");
    setGstin(c.gstin || "");
    setCustomerType(c.customerType);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name || !phone) {
      toast.error("Name and phone required");
      return;
    }
    const customer: Customer = {
      id: editCustomer?.id || generateId(),
      companyId: activeCompanyId,
      customerType,
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      gstin: gstin || undefined,
      totalPurchases: editCustomer?.totalPurchases || 0,
      isActive: true,
    };
    if (editCustomer) {
      updateCustomer(customer);
      toast.success("Customer updated");
    } else {
      addCustomer(customer);
      toast.success("Customer added");
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    setDeleteId(null);
    toast.success("Customer deleted");
  };

  const getCustomerBills = (customerId: string) =>
    bills.filter((b) => b.customerId === customerId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length} customers
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Customer
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Customers",
            value: customers.length,
            icon: User,
            color: "text-primary",
          },
          {
            label: "Registered",
            value: customers.filter((c) => c.customerType === "registered")
              .length,
            icon: UserCheck,
            color: "text-green-600",
          },
          {
            label: "Walking",
            value: customers.filter((c) => c.customerType === "walking").length,
            icon: User,
            color: "text-amber-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-border p-4 shadow-xs flex items-center gap-3"
            >
              <Icon className={`w-8 h-8 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="pl-9 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="text-sm w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="walking">Walking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">Total Purchases</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-semibold">
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${c.customerType === "registered" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {c.customerType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.phone}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.email || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {c.gstin || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {formatCurrency(c.totalPurchases)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setViewCustomer(c)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(c)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(c.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit" : "Add"} Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Customer Type</Label>
                <Select
                  value={customerType}
                  onValueChange={(v) =>
                    setCustomerType(v as "registered" | "walking")
                  }
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Name*</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Phone*</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="33XXXXX..."
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editCustomer ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customer History */}
      <Dialog
        open={!!viewCustomer}
        onOpenChange={(open) => !open && setViewCustomer(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer: {viewCustomer?.name}</DialogTitle>
          </DialogHeader>
          {viewCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{viewCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{viewCustomer.email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">GSTIN</p>
                  <p className="font-mono">{viewCustomer.gstin || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <Badge variant="outline" className="text-xs">
                    {viewCustomer.customerType}
                  </Badge>
                </div>
                {viewCustomer.address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p>{viewCustomer.address}</p>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Purchase History</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getCustomerBills(viewCustomer.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No purchases yet
                    </p>
                  ) : (
                    getCustomerBills(viewCustomer.id).map((b) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-center p-2 bg-muted/30 rounded-lg text-xs"
                      >
                        <div>
                          <p className="font-medium">{b.billNo}</p>
                          <p className="text-muted-foreground">
                            {formatDate(b.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(b.total)}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${b.paymentStatus === "paid" ? "status-paid" : "status-pending"}`}
                          >
                            {b.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewCustomer(null)}>Close</Button>
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
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
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
