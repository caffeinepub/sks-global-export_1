import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Bell,
  BookUser,
  Building2,
  ChevronDown,
  Database,
  KeyRound,
  LogOut,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  Settings,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../../hooks/useAppStore";
import { getTodayStr, hashPassword, verifyPassword } from "../../utils/helpers";
import {
  getLastBackupTime,
  getManualContacts,
  setManualContacts,
} from "../../utils/storage";
import type { ManualContact } from "../../utils/storage";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogoutRequest?: () => void;
}

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  "billing/new": "New Bill (POS)",
  bills: "Bills",
  invoices: "Invoices",
  products: "Products",
  inventory: "Inventory",
  "purchase-invoices": "Purchase Invoices",
  customers: "Customers",
  vendors: "Vendors",
  pickups: "Schedule Pickup",
  settings: "Settings",
  reports: "Reports",
  expenses: "Expenses",
  tariffs: "Tariff Rates",
  "cost-price": "Cost Price",
  "customer-tariffs": "Customer Tariffs",
  admin: "Admin Panel",
};

type AlertItem = {
  id: string;
  type: "low_stock" | "pending_pickup" | "overdue_payment" | "backup_reminder";
  message: string;
  navigateTo: string;
};

export function Header({
  currentPage,
  onNavigate,
  onLogoutRequest,
}: HeaderProps) {
  const {
    currentUser,
    companies,
    activeCompany,
    switchCompany,
    logout,
    pickups,
    products,
    bills,
    customers,
    vendors,
    updateUser,
  } = useAppStore();

  const today = getTodayStr();

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Quick Contacts state
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [manualContacts, setManualContactsState] = useState<ManualContact[]>(
    () => getManualContacts(),
  );
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const handleAddManualContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const contact: ManualContact = {
      id: `mc_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
    };
    const updated = [...manualContacts, contact];
    setManualContacts(updated);
    setManualContactsState(updated);
    setNewContactName("");
    setNewContactPhone("");
    toast.success("Contact added");
  };

  const handleDeleteManualContact = (id: string) => {
    const updated = manualContacts.filter((c) => c.id !== id);
    setManualContacts(updated);
    setManualContactsState(updated);
  };

  const waLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "").replace(/^0/, "");
    const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    return `https://wa.me/${number}`;
  };

  const filteredCustomers = useMemo(() => {
    if (!contactSearch) return customers.filter((c) => c.phone);
    const q = contactSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(contactSearch),
    );
  }, [customers, contactSearch]);

  const filteredVendors = useMemo(() => {
    if (!contactSearch) return vendors.filter((v) => v.phone);
    const q = contactSearch.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) || v.phone.includes(contactSearch),
    );
  }, [vendors, contactSearch]);

  const filteredManual = useMemo(() => {
    if (!contactSearch) return manualContacts;
    const q = contactSearch.toLowerCase();
    return manualContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(contactSearch),
    );
  }, [manualContacts, contactSearch]);

  // Compute alerts
  const allAlerts = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];

    // Low stock
    const lowStock = products.filter(
      (p) =>
        p.type === "general" &&
        (p as { currentStock: number; minStockAlert: number }).currentStock <=
          (p as { currentStock: number; minStockAlert: number }).minStockAlert,
    );
    for (const p of lowStock.slice(0, 5)) {
      const gp = p as { id: string; name: string; currentStock: number };
      alerts.push({
        id: `low_stock_${gp.id}`,
        type: "low_stock",
        message: `${gp.name} — only ${gp.currentStock} left`,
        navigateTo: "inventory",
      });
    }
    if (lowStock.length > 5) {
      alerts.push({
        id: "low_stock_more",
        type: "low_stock",
        message: `${lowStock.length - 5} more items below minimum stock`,
        navigateTo: "inventory",
      });
    }

    // Pending pickups today
    const todayPickups = pickups.filter(
      (p) => p.status === "pending" && p.scheduledDate === today,
    );
    if (todayPickups.length > 0) {
      alerts.push({
        id: "pending_pickups",
        type: "pending_pickup",
        message: `${todayPickups.length} courier pickup${todayPickups.length > 1 ? "s" : ""} pending today`,
        navigateTo: "pickups",
      });
    }

    // Overdue payments (7+ days)
    const overdueBills = bills.filter((b) => {
      if (b.paymentStatus === "paid") return false;
      const billDate = new Date(b.date);
      const daysDiff = Math.floor(
        (Date.now() - billDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysDiff >= 7;
    });
    if (overdueBills.length > 0) {
      alerts.push({
        id: "overdue_payments",
        type: "overdue_payment",
        message: `${overdueBills.length} bill${overdueBills.length > 1 ? "s" : ""} overdue (7+ days)`,
        navigateTo: "bills",
      });
    }

    // Backup reminder
    const lastBackup = getLastBackupTime();
    const needsBackup =
      !lastBackup ||
      (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60) > 24;
    if (needsBackup) {
      alerts.push({
        id: "backup_reminder",
        type: "backup_reminder",
        message: lastBackup
          ? "Last backup was more than 24 hours ago"
          : "No backup taken yet — please backup your data",
        navigateTo: "settings",
      });
    }

    return alerts;
  }, [products, pickups, bills, today]);

  const activeAlerts = allAlerts.filter((a) => !dismissedIds.includes(a.id));
  const alertCount = activeAlerts.length;

  const getAlertIcon = (type: AlertItem["type"]) => {
    switch (type) {
      case "low_stock":
        return <Package className="w-4 h-4 text-amber-600" />;
      case "pending_pickup":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "overdue_payment":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "backup_reminder":
        return <Database className="w-4 h-4 text-purple-600" />;
    }
  };

  const getAlertBg = (type: AlertItem["type"]) => {
    switch (type) {
      case "low_stock":
        return "bg-amber-50 hover:bg-amber-100";
      case "pending_pickup":
        return "bg-blue-50 hover:bg-blue-100";
      case "overdue_payment":
        return "bg-red-50 hover:bg-red-100";
      case "backup_reminder":
        return "bg-purple-50 hover:bg-purple-100";
    }
  };

  const handleLogout = () => {
    if (onLogoutRequest) {
      onLogoutRequest();
    } else {
      logout();
    }
  };

  const handleChangePassword = () => {
    if (!currentUser) return;
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error("All fields are required");
      return;
    }
    if (!verifyPassword(currentPwd, currentUser.passwordHash)) {
      toast.error("Current password is incorrect");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    updateUser({ ...currentUser, passwordHash: hashPassword(newPwd) });
    toast.success("Password changed successfully");
    setShowChangePwd(false);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  return (
    <header className="h-16 bg-gradient-to-r from-white via-primary/5 to-white border-b border-primary/20 flex items-center justify-between pl-14 pr-4 md:px-6 sticky top-0 z-20 shadow-sm backdrop-blur-sm">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {pageTitles[currentPage] || "SKS Global Export"}
        </h1>
        {activeCompany && (
          <p className="text-xs text-muted-foreground">{activeCompany.name}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Company Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 max-w-[200px]"
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">
                {activeCompany?.name || "Select Company"}
              </span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => switchCompany(company.id)}
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{company.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {company.gstin}
                  </p>
                </div>
                {company.id === activeCompany?.id && (
                  <span className="text-xs text-primary font-medium">
                    Active
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Companies
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Contacts */}
        <Popover
          open={contactsOpen}
          onOpenChange={(open) => {
            setContactsOpen(open);
            if (open) {
              setManualContactsState(getManualContacts());
              setContactSearch("");
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              data-ocid="header.contacts.button"
              title="Quick Contacts"
            >
              <BookUser className="w-5 h-5" />
              {manualContacts.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-emerald-600 text-white">
                  {manualContacts.length > 9 ? "9+" : manualContacts.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 p-0"
            data-ocid="header.contacts.popover"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Quick Contacts</p>
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-8 h-8 text-xs"
                  data-ocid="header.contacts.search_input"
                />
              </div>
            </div>

            <Tabs defaultValue="customers" className="w-full">
              <TabsList className="w-full rounded-none border-b border-border bg-muted/30 h-9 p-0">
                <TabsTrigger
                  value="customers"
                  className="flex-1 h-full rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  data-ocid="header.contacts.customers.tab"
                >
                  Customers
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] h-4 px-1"
                  >
                    {filteredCustomers.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="vendors"
                  className="flex-1 h-full rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  data-ocid="header.contacts.vendors.tab"
                >
                  Vendors
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] h-4 px-1"
                  >
                    {filteredVendors.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="manual"
                  className="flex-1 h-full rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  data-ocid="header.contacts.manual.tab"
                >
                  Manual
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-[10px] h-4 px-1"
                  >
                    {manualContacts.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Customers Tab */}
              <TabsContent value="customers" className="m-0">
                <ScrollArea className="h-60">
                  {filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1">
                      <Phone className="w-6 h-6 opacity-30" />
                      <p className="text-xs">No customers found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredCustomers.slice(0, 50).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {c.phone}
                            </p>
                          </div>
                          <a
                            href={waLink(c.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="ml-2 flex-shrink-0 text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Vendors Tab */}
              <TabsContent value="vendors" className="m-0">
                <ScrollArea className="h-60">
                  {filteredVendors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1">
                      <Phone className="w-6 h-6 opacity-30" />
                      <p className="text-xs">No vendors found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredVendors.slice(0, 50).map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {v.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {v.phone}
                            </p>
                          </div>
                          <a
                            href={waLink(v.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="ml-2 flex-shrink-0 text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Manual Contacts Tab */}
              <TabsContent value="manual" className="m-0">
                {/* Add contact form */}
                <div className="px-4 py-2.5 border-b border-border bg-muted/20 space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Add Contact
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Name"
                      className="h-7 text-xs flex-1"
                      data-ocid="header.contacts.manual.name.input"
                    />
                    <Input
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="Phone"
                      className="h-7 text-xs w-28"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddManualContact()
                      }
                      data-ocid="header.contacts.manual.phone.input"
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={handleAddManualContact}
                      data-ocid="header.contacts.manual.add.button"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-44">
                  {filteredManual.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-1">
                      <User className="w-6 h-6 opacity-30" />
                      <p className="text-xs">
                        {manualContacts.length === 0
                          ? "No manual contacts yet"
                          : "No matches found"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredManual.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {c.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <a
                              href={waLink(c.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleDeleteManualContact(c.id)}
                              data-ocid="header.contacts.manual.delete.button"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Notifications Bell */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              data-ocid="header.notifications.button"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center bg-destructive text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 p-0"
            data-ocid="header.notifications.popover"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Notifications</p>
              {activeAlerts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeAlerts.length} active
                </Badge>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">All clear! No alerts.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {activeAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors cursor-pointer ${getAlertBg(alert.type)}`}
                      onClick={() => {
                        onNavigate(alert.navigateTo);
                        setNotifOpen(false);
                      }}
                      data-ocid={`header.notification.${alert.type}.button`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {getAlertIcon(alert.type)}
                      </div>
                      <p className="text-xs text-foreground">{alert.message}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            {activeAlerts.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => {
                    setDismissedIds(activeAlerts.map((a) => a.id));
                    setNotifOpen(false);
                  }}
                  data-ocid="header.notifications.dismiss_all.button"
                >
                  Dismiss All
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium hidden md:block">
                {currentUser?.name || currentUser?.username}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentUser?.role}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate("settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowChangePwd(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePwd} onOpenChange={setShowChangePwd}>
        <DialogContent
          className="max-w-sm"
          data-ocid="header.change_password.dialog"
        >
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Password</Label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                data-ocid="header.current_password.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Enter new password"
                data-ocid="header.new_password.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                data-ocid="header.confirm_password.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangePwd(false)}
              data-ocid="header.change_password.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              data-ocid="header.change_password.submit_button"
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
