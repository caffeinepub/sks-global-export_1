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
import { Switch } from "@/components/ui/switch";
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
  AlertCircle,
  Building2,
  CheckCircle,
  Cloud,
  CloudOff,
  Download,
  Edit,
  FileText,
  HardDrive,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import {
  getStoredClientId,
  saveClientId,
  useGoogleDriveBackup,
} from "../hooks/useGoogleDriveBackup";
import type { AppUser, Company } from "../types";
import { generateId, hashPassword } from "../utils/helpers";
import {
  exportAllData,
  getLastBackupTime,
  importAllData,
  setLastBackupTime,
} from "../utils/storage";

export function SettingsPage() {
  const {
    activeCompany,
    companies,
    users,
    settings,
    currentUser,
    updateCompany,
    addCompany,
    deleteCompany,
    addUser,
    updateUser,
    deleteUser,
    updateSettings,
    switchCompany,
  } = useAppStore();

  // Google Drive backup
  const gdrive = useGoogleDriveBackup();
  const [googleClientId, setGoogleClientId] = useState(getStoredClientId);
  const [clientIdSaved, setClientIdSaved] = useState(false);

  // Company form
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [compName, setCompName] = useState("");
  const [compAddress, setCompAddress] = useState("");
  const [compGstin, setCompGstin] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compEmail, setCompEmail] = useState("");
  const [compState, setCompState] = useState("");
  const [compPincode, setCompPincode] = useState("");

  // User form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<AppUser["role"]>("operator");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Admin change password for other users
  const [changePwdUser, setChangePwdUser] = useState<AppUser | null>(null);
  const [adminNewPwd, setAdminNewPwd] = useState("");
  const [adminConfirmPwd, setAdminConfirmPwd] = useState("");

  const handleAdminChangePassword = () => {
    if (!changePwdUser) return;
    if (!adminNewPwd || !adminConfirmPwd) {
      toast.error("All fields are required");
      return;
    }
    if (adminNewPwd !== adminConfirmPwd) {
      toast.error("Passwords do not match");
      return;
    }
    if (adminNewPwd.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    updateUser({ ...changePwdUser, passwordHash: hashPassword(adminNewPwd) });
    toast.success(`Password changed for ${changePwdUser.name}`);
    setChangePwdUser(null);
    setAdminNewPwd("");
    setAdminConfirmPwd("");
  };

  // Settings form
  const [gstPrefix, setGstPrefix] = useState(
    settings?.gstInvoicePrefix || "GST/",
  );
  const [gstSeq, setGstSeq] = useState(String(settings?.gstInvoiceSeq || 1));
  const [nonGstPrefix, setNonGstPrefix] = useState(
    settings?.nonGstInvoicePrefix || "INV/",
  );
  const [nonGstSeq, setNonGstSeq] = useState(
    String(settings?.nonGstInvoiceSeq || 1),
  );
  const [billPrefix, setBillPrefix] = useState(settings?.billPrefix || "BILL/");
  const [billSeq, setBillSeq] = useState(String(settings?.billSeq || 1));
  const [autoBackup, setAutoBackup] = useState<boolean>(
    settings?.autoBackup ?? true,
  );

  const lastBackup = getLastBackupTime();

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompName(company.name);
    setCompAddress(company.address);
    setCompGstin(company.gstin);
    setCompPhone(company.phone);
    setCompEmail(company.email);
    setCompState(company.state);
    setCompPincode(company.pincode);
    setShowCompanyForm(true);
  };

  const openAddCompany = () => {
    setEditingCompany(null);
    setCompName("");
    setCompAddress("");
    setCompGstin("");
    setCompPhone("");
    setCompEmail("");
    setCompState("");
    setCompPincode("");
    setShowCompanyForm(true);
  };

  const handleSaveCompany = () => {
    if (!compName) {
      toast.error("Company name required");
      return;
    }
    const company: Company = {
      id: editingCompany?.id || generateId(),
      name: compName,
      address: compAddress,
      gstin: compGstin,
      phone: compPhone,
      email: compEmail,
      state: compState,
      pincode: compPincode,
      invoicePrefix: editingCompany?.invoicePrefix || "GST/",
      invoiceSeq: editingCompany?.invoiceSeq || 1,
      nonGstInvoicePrefix: editingCompany?.nonGstInvoicePrefix || "INV/",
      nonGstInvoiceSeq: editingCompany?.nonGstInvoiceSeq || 1,
      billPrefix: editingCompany?.billPrefix || "BILL/",
      billSeq: editingCompany?.billSeq || 1,
    };
    if (editingCompany) {
      updateCompany(company);
      toast.success("Company updated");
    } else {
      addCompany(company);
      toast.success("Company added");
    }
    setShowCompanyForm(false);
  };

  const openEditUser = (user: AppUser) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserUsername(user.username);
    setUserPassword("");
    setUserRole(user.role);
    setShowUserForm(true);
  };

  const handleSaveUser = () => {
    if (!userName || !userUsername) {
      toast.error("Name and username required");
      return;
    }
    if (!editingUser && !userPassword) {
      toast.error("Password required for new user");
      return;
    }
    const user: AppUser = {
      id: editingUser?.id || generateId(),
      name: userName,
      username: userUsername,
      passwordHash: userPassword
        ? hashPassword(userPassword)
        : editingUser?.passwordHash || "",
      role: userRole,
      companyIds: editingUser?.companyIds || companies.map((c) => c.id),
    };
    if (editingUser) {
      updateUser(user);
      toast.success("User updated");
    } else {
      addUser(user);
      toast.success("User added");
    }
    setShowUserForm(false);
    setEditingUser(null);
    setUserName("");
    setUserUsername("");
    setUserPassword("");
  };

  const handleSaveSettings = () => {
    if (!settings) return;
    updateSettings({
      ...settings,
      gstInvoicePrefix: gstPrefix,
      gstInvoiceSeq: Number(gstSeq),
      nonGstInvoicePrefix: nonGstPrefix,
      nonGstInvoiceSeq: Number(nonGstSeq),
      billPrefix: billPrefix,
      billSeq: Number(billSeq),
      autoBackup,
    });
    toast.success("Settings saved");
  };

  const handleExportBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sks_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackupTime();
    toast.success("Backup downloaded successfully");
  };

  const handleImportBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          importAllData(ev.target?.result as string);
          toast.success("Data imported successfully. Please refresh.");
          setTimeout(() => window.location.reload(), 1000);
        } catch {
          toast.error("Invalid backup file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage company, users, and application settings
        </p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="company" className="text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1" /> Company
          </TabsTrigger>
          <TabsTrigger value="invoice" className="text-xs">
            <FileText className="w-3.5 h-3.5 mr-1" /> Invoice Settings
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1" /> Users
          </TabsTrigger>
          <TabsTrigger value="backup" className="text-xs">
            <HardDrive className="w-3.5 h-3.5 mr-1" /> Backup & Restore
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Companies</h3>
            {currentUser?.role === "admin" && (
              <Button size="sm" onClick={openAddCompany}>
                <Plus className="w-4 h-4 mr-1" /> Add Company
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-all ${
                  company.id === activeCompany?.id
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">{company.name}</h4>
                      {company.id === activeCompany?.id && (
                        <Badge className="text-xs bg-primary/10 text-primary">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <p>
                        GSTIN:{" "}
                        <span className="font-mono text-foreground">
                          {company.gstin || "N/A"}
                        </span>
                      </p>
                      <p>Phone: {company.phone}</p>
                      <p>State: {company.state}</p>
                      <p>Pincode: {company.pincode}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {company.address}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {company.id !== activeCompany?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => switchCompany(company.id)}
                        className="text-xs"
                      >
                        Switch
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCompany(company)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    {company.id !== activeCompany?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteCompany(company.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Invoice Settings */}
        <TabsContent value="invoice" className="mt-4">
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs space-y-6 max-w-xl">
            <h3 className="text-sm font-semibold">Invoice Sequence Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">GST Invoice Prefix</Label>
                  <Input
                    value={gstPrefix}
                    onChange={(e) => setGstPrefix(e.target.value)}
                    className="mt-1 text-sm font-mono"
                    placeholder="GST/"
                  />
                </div>
                <div>
                  <Label className="text-xs">Next GST Invoice No</Label>
                  <Input
                    type="number"
                    value={gstSeq}
                    onChange={(e) => setGstSeq(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Non-GST Invoice Prefix</Label>
                  <Input
                    value={nonGstPrefix}
                    onChange={(e) => setNonGstPrefix(e.target.value)}
                    className="mt-1 text-sm font-mono"
                    placeholder="INV/"
                  />
                </div>
                <div>
                  <Label className="text-xs">Next Non-GST Invoice No</Label>
                  <Input
                    type="number"
                    value={nonGstSeq}
                    onChange={(e) => setNonGstSeq(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bill Prefix</Label>
                  <Input
                    value={billPrefix}
                    onChange={(e) => setBillPrefix(e.target.value)}
                    className="mt-1 text-sm font-mono"
                    placeholder="BILL/"
                  />
                </div>
                <div>
                  <Label className="text-xs">Next Bill No</Label>
                  <Input
                    type="number"
                    value={billSeq}
                    onChange={(e) => setBillSeq(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="text-primary">
                    {gstPrefix}
                    {String(gstSeq).padStart(4, "0")}
                  </span>
                  <span className="text-purple-600">
                    {nonGstPrefix}
                    {String(nonGstSeq).padStart(4, "0")}
                  </span>
                  <span className="text-amber-600">
                    {billPrefix}
                    {String(billSeq).padStart(4, "0")}
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={handleSaveSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">User Management</h3>
            {currentUser?.role === "admin" && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingUser(null);
                  setUserName("");
                  setUserUsername("");
                  setUserPassword("");
                  setUserRole("operator");
                  setShowUserForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add User
              </Button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Username</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Companies</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-semibold">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <Badge className="ml-2 text-xs bg-primary/10 text-primary">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {user.username}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          user.role === "admin"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : user.role === "manager"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.companyIds.length} companies
                    </TableCell>
                    <TableCell>
                      {currentUser?.role === "admin" &&
                        user.id !== currentUser?.id && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit User"
                              onClick={() => openEditUser(user)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700"
                              title="Change Password"
                              onClick={() => {
                                setChangePwdUser(user);
                                setAdminNewPwd("");
                                setAdminConfirmPwd("");
                              }}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Delete User"
                              onClick={() => setDeleteUserId(user.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="mt-4">
          <div className="max-w-xl space-y-4">
            {/* Backup Status */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
              <h3 className="text-sm font-semibold mb-3">Backup Status</h3>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <HardDrive className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Local Backup</p>
                  <p className="text-xs text-muted-foreground">
                    {lastBackup
                      ? `Last backup: ${new Date(lastBackup).toLocaleString("en-IN")}`
                      : "No backup taken yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={autoBackup}
                  onCheckedChange={(v) => setAutoBackup(v)}
                />
                <Label className="text-sm">Daily backup reminder</Label>
              </div>
            </div>

            {/* Local Backup Actions */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs space-y-3">
              <h3 className="text-sm font-semibold">Local Storage</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleExportBackup} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Backup (JSON)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImportBackup}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Backup
                </Button>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Importing will replace all existing data. Make sure to export
                  a backup first.
                </p>
              </div>
            </div>

            {/* Google Drive Backup */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold">Google Drive Backup</h3>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    gdrive.isConnected
                      ? "bg-green-50 text-green-700 border-green-300"
                      : "bg-gray-50 text-gray-500 border-gray-300"
                  }`}
                >
                  {gdrive.isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>

              {/* Connection status */}
              <div
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  gdrive.isConnected ? "bg-green-50" : "bg-muted/40"
                }`}
              >
                {gdrive.isConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <CloudOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {gdrive.isConnected
                      ? "Connected to Google Drive"
                      : "Not connected"}
                  </p>
                  {gdrive.isConnected && gdrive.lastBackupTime ? (
                    <p className="text-xs text-muted-foreground">
                      Last backup:{" "}
                      {new Date(gdrive.lastBackupTime).toLocaleString("en-IN")}
                    </p>
                  ) : gdrive.isConnected ? (
                    <p className="text-xs text-muted-foreground">
                      No backup yet — auto-backup will run every{" "}
                      {gdrive.autoIntervalMinutes} minutes
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Connect to enable auto-backup every{" "}
                      {gdrive.autoIntervalMinutes} minutes
                    </p>
                  )}
                </div>
              </div>

              {/* Auto-backup notice */}
              {gdrive.isConnected && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 p-2.5 rounded-lg">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span>
                    Auto-backup running every {gdrive.autoIntervalMinutes}{" "}
                    minutes to{" "}
                    <span className="font-mono font-semibold">
                      sks_global_export_backup.json
                    </span>{" "}
                    in your Drive
                  </span>
                </div>
              )}

              {/* Error */}
              {gdrive.error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{gdrive.error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {gdrive.isConnected ? (
                  <>
                    <Button
                      onClick={() => {
                        gdrive.backupNow();
                        toast.info("Backing up to Google Drive...");
                      }}
                      disabled={gdrive.isBackingUp}
                      className="w-full"
                    >
                      {gdrive.isBackingUp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Backing up...
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4 mr-2" />
                          Backup Now
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        gdrive.disconnect();
                        toast.success("Disconnected from Google Drive");
                      }}
                      className="w-full text-destructive hover:text-destructive border-destructive/30"
                    >
                      <CloudOff className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={gdrive.connect}
                    className="col-span-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Cloud className="w-4 h-4 mr-2" />
                    Connect Google Drive
                  </Button>
                )}
              </div>

              {/* Client ID input */}
              <div className="space-y-2">
                <label
                  htmlFor="google-client-id"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Google OAuth Client ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="google-client-id"
                    type="text"
                    value={googleClientId}
                    onChange={(e) => {
                      setGoogleClientId(e.target.value);
                      setClientIdSaved(false);
                    }}
                    placeholder="Paste your Client ID here (e.g. 123456-abc.apps.googleusercontent.com)"
                    className="flex-1 text-xs border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!googleClientId.trim()) {
                        toast.error("Please enter a Client ID");
                        return;
                      }
                      saveClientId(googleClientId);
                      setClientIdSaved(true);
                      toast.success("Client ID saved");
                    }}
                  >
                    Save
                  </Button>
                </div>
                {clientIdSaved && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Client ID saved — click
                    Connect Google Drive above
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Get this from{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Google Cloud Console &rarr; APIs &amp; Services &rarr;
                    Credentials
                  </a>
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Company Form Dialog */}
      <Dialog open={showCompanyForm} onOpenChange={setShowCompanyForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit" : "Add"} Company</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Company Name*</Label>
              <Input
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Address</Label>
              <Textarea
                value={compAddress}
                onChange={(e) => setCompAddress(e.target.value)}
                className="mt-1 text-sm resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">GSTIN</Label>
              <Input
                value={compGstin}
                onChange={(e) => setCompGstin(e.target.value)}
                className="mt-1 text-sm font-mono"
                placeholder="33XXXXX..."
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input
                value={compState}
                onChange={(e) => setCompState(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Pincode</Label>
              <Input
                value={compPincode}
                onChange={(e) => setCompPincode(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany}>
              {editingCompany ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Form Dialog */}
      <Dialog
        open={showUserForm}
        onOpenChange={(open) => {
          if (!open) setShowUserForm(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit" : "Add"} User</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full Name*</Label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Username*</Label>
              <Input
                value={userUsername}
                onChange={(e) => setUserUsername(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">
                Password{editingUser ? " (leave blank to keep)" : "*"}
              </Label>
              <Input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select
                value={userRole}
                onValueChange={(v) => setUserRole(v as AppUser["role"])}
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              {editingUser ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Change Password Dialog */}
      <Dialog
        open={!!changePwdUser}
        onOpenChange={(open) => !open && setChangePwdUser(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password — {changePwdUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                value={adminNewPwd}
                onChange={(e) => setAdminNewPwd(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={adminConfirmPwd}
                onChange={(e) => setAdminConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) =>
                  e.key === "Enter" && handleAdminChangePassword()
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePwdUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleAdminChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm */}
      <AlertDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteUserId) {
                  deleteUser(deleteUserId);
                  setDeleteUserId(null);
                  toast.success("User deleted");
                }
              }}
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
