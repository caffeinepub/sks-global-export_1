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
  Bell,
  Building2,
  ChevronDown,
  KeyRound,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../../hooks/useAppStore";
import { hashPassword, verifyPassword } from "../../utils/helpers";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
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
  pickups: "Courier Pickups",
  settings: "Settings",
};

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const {
    currentUser,
    companies,
    activeCompany,
    switchCompany,
    logout,
    pickups,
    updateUser,
  } = useAppStore();

  const pendingPickups = pickups.filter((p) => p.status === "pending").length;

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const handleLogout = () => {
    logout();
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
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-20 shadow-xs">
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

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => onNavigate("pickups")}
        >
          <Bell className="w-5 h-5" />
          {pendingPickups > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center bg-destructive text-white">
              {pendingPickups}
            </Badge>
          )}
        </Button>

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
        <DialogContent className="max-w-sm">
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
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Enter new password"
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePwd(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
