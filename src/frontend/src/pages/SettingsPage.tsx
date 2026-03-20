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
  Archive,
  Building2,
  Calendar,
  CheckCircle,
  Cloud,
  CloudOff,
  Download,
  Edit,
  FileSpreadsheet,
  FileText,
  GitMerge,
  HardDrive,
  Image,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "../hooks/useAppStore";
import {
  getStoredClientId,
  saveClientId,
  useGoogleDriveBackup,
} from "../hooks/useGoogleDriveBackup";
import type { AppUser, Company } from "../types";
import {
  downloadCSVString,
  getSampleAWBSerialsCSV,
  getSampleCategoriesCSV,
  getSampleCustomersCSV,
  getSampleProductsCSV,
  getSampleStockUpdateCSV,
  getSampleVendorsCSV,
} from "../utils/excelHelpers";
import {
  generateCompanyPrefix,
  generateId,
  getCurrentFYCode,
  hashPassword,
} from "../utils/helpers";
import type {
  BackupSummary,
  FinanceYearArchive,
  MergeSummary,
} from "../utils/storage";
import {
  type DMApiSettings,
  SHARED_DATA_ID,
  exportAllData,
  getBills,
  getCurrentFYInfo,
  getDMApiSettings,
  getExpenses,
  getFYArchives,
  getGSTInvoiceSeq,
  getInvoices,
  getLastBackupTime,
  getNonGSTInvoiceSeq,
  importAllData,
  mergeImportData,
  parseBackupSummary,
  setDMApiSettings,
  setFYArchives,
  setGSTInvoiceSeq,
  setLastBackupTime,
  setNonGSTInvoiceSeq,
} from "../utils/storage";
import {
  applyTheme,
  resetTheme,
  themeLabels,
  themes,
} from "../utils/themeUtils";

export function SettingsPage() {
  const [dmApiSettings, setDmApiSettings] = useState<DMApiSettings>(() =>
    getDMApiSettings(),
  );
  const [dmApiEdits, setDmApiEdits] = useState<DMApiSettings>({});
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
  const [_googleClientId, _setGoogleClientId] = useState(getStoredClientId);
  const [_clientIdSaved, _setClientIdSaved] = useState(!!getStoredClientId());

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
  const [compLogoUrl, setCompLogoUrl] = useState<string | undefined>(undefined);
  const [compBankName, setCompBankName] = useState("");
  const [compBankAccount, setCompBankAccount] = useState("");
  const [compBankIfsc, setCompBankIfsc] = useState("");
  const [compBankBranch, setCompBankBranch] = useState("");
  const [compUpiId, setCompUpiId] = useState("");
  const [compUpiName, setCompUpiName] = useState("");

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
    settings?.gstInvoicePrefix ||
      (activeCompany
        ? `${generateCompanyPrefix(activeCompany.name)}${getCurrentFYCode()}INV`
        : "GST/"),
  );
  const [nonGstPrefix, setNonGstPrefix] = useState(
    settings?.nonGstInvoicePrefix ||
      (activeCompany
        ? `${generateCompanyPrefix(activeCompany.name)}${getCurrentFYCode()}`
        : "INV/"),
  );
  const [billPrefix, setBillPrefix] = useState(
    settings?.billPrefix ||
      (activeCompany
        ? `${generateCompanyPrefix(activeCompany.name)}BILL`
        : "BILL/"),
  );
  const [billSeq, setBillSeq] = useState(String(settings?.billSeq || 1));
  const [autoBackup, setAutoBackup] = useState<boolean>(
    settings?.autoBackup ?? true,
  );
  const [invoiceFooter, setInvoiceFooter] = useState(
    settings?.invoiceFooter || "",
  );
  const [defaultGstRate, setDefaultGstRate] = useState(
    String(settings?.defaultGstRate ?? 18),
  );
  const [defaultInvoiceTemplate, setDefaultInvoiceTemplate] = useState<
    "default" | "retail" | "courier"
  >(
    (settings?.invoiceTemplate ?? "default") as
      | "default"
      | "retail"
      | "courier",
  );

  // Editable invoice sequence states
  const [gstSeqEdit, setGstSeqEdit] = useState<string>(() =>
    activeCompany?.gstin?.trim()
      ? String(getGSTInvoiceSeq(activeCompany.gstin.trim()))
      : "1",
  );
  const [nonGstSeqEdit, setNonGstSeqEdit] = useState<string>(() =>
    activeCompany ? String(getNonGSTInvoiceSeq(activeCompany.id)) : "1",
  );

  // Keep seq edits in sync when activeCompany changes
  useEffect(() => {
    setGstSeqEdit(
      activeCompany?.gstin?.trim()
        ? String(getGSTInvoiceSeq(activeCompany.gstin.trim()))
        : "1",
    );
    setNonGstSeqEdit(
      activeCompany ? String(getNonGSTInvoiceSeq(activeCompany.id)) : "1",
    );
  }, [activeCompany]);

  // Finance Year state
  const [fyArchives, setFyArchivesState] = useState<FinanceYearArchive[]>(() =>
    getFYArchives(),
  );
  const [fyCloseConfirmOpen, setFyCloseConfirmOpen] = useState(false);
  const [fyClosePassword, setFyClosePassword] = useState("");
  const [fyClosePasswordError, setFyClosePasswordError] = useState("");
  const [fyClosePasswordVerified, setFyClosePasswordVerified] = useState(false);

  // Import backup confirmation state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPending, setImportPending] = useState<{
    json: string;
    summary: BackupSummary;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Import mode: "select" | "full" | "merge"
  const [importMode, setImportMode] = useState<"select" | "full" | "merge">(
    "select",
  );
  // Password verification for full restore
  const [restorePassword, setRestorePassword] = useState("");
  const [restorePasswordError, setRestorePasswordError] = useState("");
  // Full restore delete confirmation step
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Merge result
  const [mergeResult, setMergeResult] = useState<MergeSummary | null>(null);

  // Drive Sync state
  const [driveCheckLoading, setDriveCheckLoading] = useState(false);
  const [driveBackupSummary, setDriveBackupSummary] =
    useState<BackupSummary | null>(null);
  const [driveBackupJson, setDriveBackupJson] = useState<string | null>(null);
  const [driveRestoreDialogOpen, setDriveRestoreDialogOpen] = useState(false);
  const [driveRestoreMode, setDriveRestoreMode] = useState<
    "select" | "full" | "merge"
  >("select");
  const [driveRestorePassword, setDriveRestorePassword] = useState("");
  const [driveRestorePasswordError, setDriveRestorePasswordError] =
    useState("");
  const [driveShowDeleteConfirm, setDriveShowDeleteConfirm] = useState(false);
  const [driveRestoring, setDriveRestoring] = useState(false);
  const [driveMergeResult, setDriveMergeResult] = useState<MergeSummary | null>(
    null,
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
    setCompLogoUrl(company.logoUrl);
    setCompBankName(company.bankName || "");
    setCompBankAccount(company.bankAccount || "");
    setCompBankIfsc(company.bankIfsc || "");
    setCompBankBranch(company.bankBranch || "");
    setCompUpiId(company.upiId || "");
    setCompUpiName(company.upiName || "");
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
    setCompLogoUrl(undefined);
    setCompBankName("");
    setCompBankAccount("");
    setCompBankIfsc("");
    setCompBankBranch("");
    setCompUpiId("");
    setCompUpiName("");
    setShowCompanyForm(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCompLogoUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      logoUrl: compLogoUrl,
      bankName: compBankName || undefined,
      bankAccount: compBankAccount || undefined,
      bankIfsc: compBankIfsc || undefined,
      bankBranch: compBankBranch || undefined,
      upiId: compUpiId || undefined,
      upiName: compUpiName || undefined,
      invoicePrefix:
        editingCompany?.invoicePrefix ||
        `${generateCompanyPrefix(compName)}${getCurrentFYCode()}INV`,
      invoiceSeq: editingCompany?.invoiceSeq || 1,
      nonGstInvoicePrefix:
        editingCompany?.nonGstInvoicePrefix ||
        `${generateCompanyPrefix(compName)}${getCurrentFYCode()}`,
      nonGstInvoiceSeq: editingCompany?.nonGstInvoiceSeq || 1,
      billPrefix:
        editingCompany?.billPrefix || `${generateCompanyPrefix(compName)}BILL`,
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
      // gstInvoiceSeq is no longer used — sequence is now managed per-GSTIN via storage keys
      nonGstInvoicePrefix: nonGstPrefix,
      // nonGstInvoiceSeq is no longer used — sequence is now managed per-company via storage keys
      billPrefix: billPrefix,
      billSeq: Number(billSeq),
      autoBackup,
      invoiceFooter,
      defaultGstRate: Number(defaultGstRate),
      invoiceTemplate: defaultInvoiceTemplate,
    });
    toast.success("Settings saved");
  };

  const handleExportBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.download = `SKS-Backup-${ts}.json`;
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
        const jsonStr = ev.target?.result as string;
        try {
          const summary = parseBackupSummary(jsonStr);
          setImportPending({ json: jsonStr, summary });
          setImportMode("select");
          setRestorePassword("");
          setRestorePasswordError("");
          setShowDeleteConfirm(false);
          setMergeResult(null);
          setImportDialogOpen(true);
        } catch {
          toast.error(
            "Invalid backup file — could not read contents. Make sure you are uploading a valid SKS backup JSON.",
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleConfirmImport = () => {
    if (!importPending) return;
    setIsImporting(true);
    try {
      importAllData(importPending.json);
      setIsImporting(false);
      setImportDialogOpen(false);
      setImportPending(null);
      toast.success("Backup restored successfully! Reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setIsImporting(false);
      toast.error(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleMergeImport = () => {
    if (!importPending) return;
    setIsImporting(true);
    try {
      const result = mergeImportData(importPending.json);
      setMergeResult(result);
      setIsImporting(false);
      const total =
        result.billsAdded +
        result.customersAdded +
        result.invoicesAdded +
        result.productsAdded;
      toast.success(`Merge complete — ${total} new records added`);
    } catch (err) {
      setIsImporting(false);
      toast.error(
        `Merge failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleFullRestorePasswordCheck = () => {
    if (!restorePassword) {
      setRestorePasswordError("Please enter your password");
      return;
    }
    const hashed = btoa(restorePassword);
    if (!currentUser || currentUser.passwordHash !== hashed) {
      setRestorePasswordError("Incorrect password. Please try again.");
      return;
    }
    setRestorePasswordError("");
    setShowDeleteConfirm(true);
  };

  const handleCheckDrive = async () => {
    setDriveCheckLoading(true);
    setDriveBackupSummary(null);
    setDriveBackupJson(null);
    try {
      const content = await gdrive.fetchFromDriveNow();
      const summary = parseBackupSummary(content);
      setDriveBackupSummary(summary);
      setDriveBackupJson(content);
      toast.success("Drive backup info loaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not read from Drive",
      );
    } finally {
      setDriveCheckLoading(false);
    }
  };

  const handleDriveFullRestorePasswordCheck = () => {
    if (!driveRestorePassword) {
      setDriveRestorePasswordError("Please enter your password");
      return;
    }
    const hashed = btoa(driveRestorePassword);
    if (!currentUser || currentUser.passwordHash !== hashed) {
      setDriveRestorePasswordError("Incorrect password. Please try again.");
      return;
    }
    setDriveRestorePasswordError("");
    setDriveShowDeleteConfirm(true);
  };

  const handleDriveFullRestore = () => {
    if (!driveBackupJson) return;
    setDriveRestoring(true);
    try {
      importAllData(driveBackupJson);
      toast.success("Data restored from Google Drive! Reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setDriveRestoring(false);
      toast.error(
        `Restore failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleDriveMerge = () => {
    if (!driveBackupJson) return;
    setDriveRestoring(true);
    try {
      const result = mergeImportData(driveBackupJson);
      setDriveMergeResult(result);
      setDriveRestoring(false);
      const total =
        result.billsAdded +
        result.customersAdded +
        result.invoicesAdded +
        result.productsAdded;
      toast.success(`Merge complete — ${total} new records added from Drive`);
    } catch (err) {
      setDriveRestoring(false);
      toast.error(
        `Merge failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleCloseFY = () => {
    const { label, start, end } = getCurrentFYInfo();

    const allBills = getBills(SHARED_DATA_ID);
    const allInvoices = getInvoices(SHARED_DATA_ID);
    const allExpenses = getExpenses(SHARED_DATA_ID);

    const fyBills = allBills.filter((b) => {
      const d = new Date(b.date);
      return d >= start && d <= end;
    });
    const fyInvoices = allInvoices.filter((inv) => {
      const d = new Date(inv.date);
      return d >= start && d <= end;
    });
    const fyExpenses = allExpenses.filter((exp) => {
      const d = new Date(exp.date);
      return d >= start && d <= end;
    });

    const totalRevenue = fyBills.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalExpensesAmt = fyExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );

    const archive: FinanceYearArchive = {
      id: `fy-${Date.now()}`,
      label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      closedAt: new Date().toISOString(),
      summary: {
        totalBills: fyBills.length,
        totalInvoices: fyInvoices.length,
        totalRevenue,
        totalExpenses: totalExpensesAmt,
      },
      bills: fyBills,
      invoices: fyInvoices,
      expenses: fyExpenses,
    };

    const archives = getFYArchives();
    const updatedArchives = [
      ...archives.filter((a) => a.label !== label),
      archive,
    ];
    setFYArchives(updatedArchives);
    setFyArchivesState(updatedArchives);

    // Reset invoice sequences for all companies
    for (const company of companies) {
      if (company.gstin?.trim()) {
        setGSTInvoiceSeq(company.gstin.trim(), 1);
      }
      setNonGSTInvoiceSeq(company.id, 1);
    }

    // Reset bill sequence in settings
    if (settings) {
      updateSettings({ ...settings, billSeq: 1 });
      setBillSeq("1");
    }

    // Reset local seq edit states
    setGstSeqEdit("1");
    setNonGstSeqEdit("1");

    setFyCloseConfirmOpen(false);
    setFyClosePassword("");
    setFyClosePasswordVerified(false);
    toast.success(`${label} closed successfully. Sequences reset to 1.`);
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
          <TabsTrigger
            value="samples"
            className="text-xs"
            data-ocid="settings.samples.tab"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Sample Files
          </TabsTrigger>
          <TabsTrigger
            value="financeYear"
            className="text-xs"
            data-ocid="settings.finance_year.tab"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" /> Finance Year
          </TabsTrigger>
          <TabsTrigger
            value="apiIntegrations"
            className="text-xs"
            data-ocid="settings.api_integrations.tab"
          >
            🔗 API Integrations
          </TabsTrigger>
          {currentUser?.role === "admin" && (
            <TabsTrigger
              value="appearance"
              className="text-xs"
              data-ocid="settings.appearance.tab"
            >
              🎨 Appearance
            </TabsTrigger>
          )}
          {currentUser?.role === "admin" && (
            <TabsTrigger
              value="permissions"
              className="text-xs"
              data-ocid="settings.permissions.tab"
            >
              🔐 Permissions
            </TabsTrigger>
          )}
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
            <div>
              <h3 className="text-sm font-semibold">
                Invoice Sequence Settings
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                <strong>GST Invoice:</strong> Sequence is shared across all
                companies with the same GSTIN. If Company A and Company D have
                the same GST number, their invoice numbers continue in one
                series.
                <br />
                <strong>Non-GST Invoice:</strong> Each company without a GST
                number gets its own independent series. Switching to another
                company starts a fresh sequence.
              </p>
            </div>
            <div className="space-y-4">
              {/* GST Invoice settings */}
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 space-y-3">
                <p className="text-xs font-semibold text-green-800">
                  GST Invoice Series (shared by GSTIN)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">GST Invoice Prefix</Label>
                    <div className="mt-1 flex gap-1">
                      <Input
                        value={gstPrefix}
                        onChange={(e) => setGstPrefix(e.target.value)}
                        className="text-sm font-mono"
                        placeholder="GST/"
                        data-ocid="settings.gst_prefix.input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 shrink-0"
                        onClick={() =>
                          activeCompany &&
                          setGstPrefix(
                            `${generateCompanyPrefix(activeCompany.name)}${getCurrentFYCode()}INV`,
                          )
                        }
                        title="Auto-generate from company name"
                      >
                        🔄 Auto
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">
                      Next Invoice No (editable)
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={gstSeqEdit}
                        onChange={(e) => setGstSeqEdit(e.target.value)}
                        className="text-sm font-mono w-28 border-green-300"
                        data-ocid="settings.gst_seq.input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-green-400 text-green-700 hover:bg-green-50"
                        onClick={() => {
                          if (!activeCompany?.gstin?.trim()) {
                            toast.error("No GSTIN set for this company");
                            return;
                          }
                          const val = Number.parseInt(gstSeqEdit, 10);
                          if (!Number.isNaN(val) && val >= 1) {
                            setGSTInvoiceSeq(activeCompany.gstin.trim(), val);
                            toast.success(`GST invoice sequence set to ${val}`);
                          } else {
                            toast.error("Enter a valid number (minimum 1)");
                          }
                        }}
                        data-ocid="settings.gst_seq.save_button"
                      >
                        Set
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeCompany?.gstin
                        ? `GSTIN: ${activeCompany.gstin}`
                        : "No GSTIN set on this company"}
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      To continue from invoice 94, enter 94 here.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-green-700">
                  Preview:{" "}
                  <span className="font-mono font-bold">
                    {gstPrefix}
                    {String(Number(gstSeqEdit) || 1).padStart(4, "0")}
                  </span>
                </p>
              </div>

              {/* Non-GST Invoice settings */}
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 space-y-3">
                <p className="text-xs font-semibold text-purple-800">
                  Non-GST Invoice Series (per company)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Non-GST Invoice Prefix</Label>
                    <div className="mt-1 flex gap-1">
                      <Input
                        value={nonGstPrefix}
                        onChange={(e) => setNonGstPrefix(e.target.value)}
                        className="text-sm font-mono"
                        placeholder="INV/"
                        data-ocid="settings.nongst_prefix.input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 shrink-0"
                        onClick={() =>
                          activeCompany &&
                          setNonGstPrefix(
                            `${generateCompanyPrefix(activeCompany.name)}${getCurrentFYCode()}`,
                          )
                        }
                        title="Auto-generate from company name"
                        data-ocid="settings.nongst_prefix_auto.button"
                      >
                        🔄 Auto
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">
                      Next Invoice No (editable)
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={nonGstSeqEdit}
                        onChange={(e) => setNonGstSeqEdit(e.target.value)}
                        className="text-sm font-mono w-28 border-purple-300"
                        data-ocid="settings.nongst_seq.input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-purple-400 text-purple-700 hover:bg-purple-50"
                        onClick={() => {
                          if (!activeCompany) {
                            toast.error("No active company");
                            return;
                          }
                          const val = Number.parseInt(nonGstSeqEdit, 10);
                          if (!Number.isNaN(val) && val >= 1) {
                            setNonGSTInvoiceSeq(activeCompany.id, val);
                            toast.success(
                              `Non-GST invoice sequence set to ${val}`,
                            );
                          } else {
                            toast.error("Enter a valid number (minimum 1)");
                          }
                        }}
                        data-ocid="settings.nongst_seq.save_button"
                      >
                        Set
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({activeCompany?.name || "No company"})
                    </p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      To continue from invoice 50, enter 50 here. Each company
                      has its own series.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-purple-700">
                  Preview:{" "}
                  <span className="font-mono font-bold">
                    {nonGstPrefix}
                    {String(Number(nonGstSeqEdit) || 1).padStart(4, "0")}
                  </span>
                </p>
              </div>

              {/* Bill settings */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  Bill Series (per company)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bill Prefix</Label>
                    <div className="mt-1 flex gap-1">
                      <Input
                        value={billPrefix}
                        onChange={(e) => setBillPrefix(e.target.value)}
                        className="text-sm font-mono"
                        placeholder="BILL/"
                        data-ocid="settings.bill_prefix.input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 shrink-0"
                        onClick={() =>
                          activeCompany &&
                          setBillPrefix(
                            `${generateCompanyPrefix(activeCompany.name)}BILL`,
                          )
                        }
                        title="Auto-generate from company name"
                        data-ocid="settings.bill_prefix_auto.button"
                      >
                        🔄 Auto
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Next Bill No (editable)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={billSeq}
                        onChange={(e) => setBillSeq(e.target.value)}
                        className="text-sm font-mono w-28 border-amber-300"
                        data-ocid="settings.bill_seq.input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          if (!activeCompany) {
                            toast.error("No active company");
                            return;
                          }
                          const val = Number.parseInt(billSeq, 10);
                          if (!Number.isNaN(val) && val >= 1) {
                            updateCompany({ ...activeCompany, billSeq: val });
                            toast.success(`Bill sequence set to ${val}`);
                          } else {
                            toast.error("Enter a valid number (minimum 1)");
                          }
                        }}
                        data-ocid="settings.bill_seq.save_button"
                      >
                        Set
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Bill Preview:
                </p>
                <span className="text-xs font-mono text-amber-700 font-bold">
                  {billPrefix}
                  {String(billSeq).padStart(4, "0")}
                </span>
              </div>
            </div>
            {/* Default GST Rate */}
            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="text-sm font-semibold">Invoice Defaults</h4>
              <div>
                <Label className="text-xs">Default GST Rate (%)</Label>
                <Select
                  value={defaultGstRate}
                  onValueChange={setDefaultGstRate}
                >
                  <SelectTrigger
                    className="mt-1 text-sm w-40"
                    data-ocid="settings.default_gst.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Used as default when creating new products
                </p>
              </div>
              <div>
                <Label className="text-xs">Invoice Footer Text</Label>
                <Textarea
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  placeholder="e.g. Bank: SBI, Account: 1234567890, IFSC: SBIN0001234&#10;Terms: Payment due within 30 days."
                  rows={4}
                  className="mt-1 text-sm"
                  data-ocid="settings.invoice_footer.textarea"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown at the bottom of all printed invoices (bank details,
                  terms & conditions, etc.)
                </p>
              </div>
              <div>
                <Label className="text-xs">Default Invoice Template</Label>
                <Select
                  value={defaultInvoiceTemplate}
                  onValueChange={(v) =>
                    setDefaultInvoiceTemplate(
                      v as "default" | "retail" | "courier",
                    )
                  }
                >
                  <SelectTrigger
                    className="mt-1 text-sm"
                    data-ocid="settings.invoice_template.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Default — Clean &amp; Minimal
                    </SelectItem>
                    <SelectItem value="retail">
                      Classic Retail — GST Tax Invoice Layout
                    </SelectItem>
                    <SelectItem value="courier">
                      Courier Style — DTDC-style Layout
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-selected template when opening invoice view
                </p>
              </div>
            </div>
            <Button
              onClick={handleSaveSettings}
              className="w-full"
              data-ocid="settings.invoice.save_button"
            >
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
                      Last backup to Drive:{" "}
                      <span className="font-semibold text-foreground">
                        {new Date(gdrive.lastBackupTime).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </p>
                  ) : gdrive.isConnected ? (
                    <p className="text-xs text-muted-foreground">
                      Connected — click Backup Now to save data to Drive
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Connect to backup your data to Google Drive
                    </p>
                  )}
                </div>
              </div>

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
                      onClick={async () => {
                        try {
                          await gdrive.backupNow();
                          toast.success("Backed up to Google Drive");
                        } catch {
                          toast.error("Backup failed — check connection");
                        }
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

              {/* Client ID — pre-configured */}
              <div className="flex gap-2 items-center p-2.5 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-800 font-medium flex-1 truncate">
                  OAuth Client ID pre-configured
                </p>
              </div>
            </div>

            {/* Google Drive Sync / Restore */}
            <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold">
                    Drive Sync &amp; Restore
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Check the last saved backup on Drive and restore or merge
                    data
                  </p>
                </div>
              </div>

              {/* Drive backup info card */}
              {driveBackupSummary ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Last stored backup
                    on Google Drive
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Saved on</span>
                    <span className="font-semibold text-foreground">
                      {driveBackupSummary.exportedAt !== "unknown"
                        ? new Date(
                            driveBackupSummary.exportedAt,
                          ).toLocaleString("en-IN")
                        : "Unknown"}
                    </span>
                    <span className="text-muted-foreground">Companies</span>
                    <span className="font-semibold">
                      {driveBackupSummary.companiesCount}
                    </span>
                    <span className="text-muted-foreground">Users</span>
                    <span className="font-semibold">
                      {driveBackupSummary.usersCount}
                    </span>
                  </div>
                  {driveBackupSummary.companies.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-blue-100 rounded-lg p-2 text-xs space-y-0.5"
                    >
                      <p className="font-semibold">{c.name}</p>
                      <div className="flex gap-3 text-muted-foreground">
                        <span>{c.billsCount} bills</span>
                        <span>{c.invoicesCount} invoices</span>
                        <span>{c.customersCount} customers</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  Click "Check Drive" to see the last stored backup details
                </div>
              )}

              {gdrive.isFetching && (
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" /> Reading from
                  Google Drive…
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleCheckDrive}
                  disabled={driveCheckLoading || gdrive.isFetching}
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  data-ocid="settings.drive_check.button"
                >
                  {driveCheckLoading || gdrive.isFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Checking…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" /> Check Drive
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    if (!driveBackupJson) {
                      toast.info(
                        "Click 'Check Drive' first to load backup from Drive",
                      );
                      return;
                    }
                    setDriveRestoreMode("select");
                    setDriveRestorePassword("");
                    setDriveRestorePasswordError("");
                    setDriveShowDeleteConfirm(false);
                    setDriveMergeResult(null);
                    setDriveRestoreDialogOpen(true);
                  }}
                  disabled={!driveBackupJson}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  data-ocid="settings.drive_sync.button"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Update / Sync
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You must click <strong>Check Drive</strong> first before
                syncing. Make sure Google Drive is connected above.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Sample Files */}
        <TabsContent value="samples" className="mt-4">
          <div className="max-w-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Sample Import Files</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Download these CSV templates to bulk-import data into the
                system. Fill in your data following the sample rows, then upload
                using the Import button on the respective pages.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Customers",
                  desc: "Bulk import registered and walking customers. Fields: Name, Phone, Email, Address, GSTIN, Type.",
                  filename: "sample_customers.csv",
                  fn: getSampleCustomersCSV,
                  color: "bg-blue-50 border-blue-200",
                  badge: "bg-blue-100 text-blue-700",
                  where: "Customers → Import",
                },
                {
                  title: "Vendors",
                  desc: "Bulk import vendor/supplier details. Fields: Name, Phone, Email, Address, GSTIN.",
                  filename: "sample_vendors.csv",
                  fn: getSampleVendorsCSV,
                  color: "bg-green-50 border-green-200",
                  badge: "bg-green-100 text-green-700",
                  where: "Vendors → Import",
                },
                {
                  title: "General Products",
                  desc: "Bulk import products with pricing, GST, and stock. Fields: Name, Category, Unit, MRP, Selling Price, Purchase Price, GST%, HSN, Stock.",
                  filename: "sample_products.csv",
                  fn: getSampleProductsCSV,
                  color: "bg-purple-50 border-purple-200",
                  badge: "bg-purple-100 text-purple-700",
                  where: "Products → Bulk Import",
                },
                {
                  title: "Categories",
                  desc: "Bulk import product categories with parent-child hierarchy. Fields: Name, Type, Parent Category Name.",
                  filename: "sample_categories.csv",
                  fn: getSampleCategoriesCSV,
                  color: "bg-orange-50 border-orange-200",
                  badge: "bg-orange-100 text-orange-700",
                  where: "Categories → Import",
                },
                {
                  title: "Stock Update",
                  desc: "Bulk update product stock quantities. Fields: Product Name, New Stock Quantity, Reason.",
                  filename: "sample_stock_update.csv",
                  fn: getSampleStockUpdateCSV,
                  color: "bg-amber-50 border-amber-200",
                  badge: "bg-amber-100 text-amber-700",
                  where: "Inventory → Bulk Stock Update",
                },
                {
                  title: "AWB Serials (Courier)",
                  desc: "Bulk import courier AWB serial ranges. Fields: Brand Name, Product Type, From Serial, To Serial, Purchase Date.",
                  filename: "sample_awb_serials.csv",
                  fn: getSampleAWBSerialsCSV,
                  color: "bg-teal-50 border-teal-200",
                  badge: "bg-teal-100 text-teal-700",
                  where: "Inventory → Bulk Import AWB",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border p-4 shadow-xs ${item.color} flex flex-col gap-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <span className="font-semibold text-sm">
                          {item.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badge}`}
                        >
                          CSV
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                      <p className="text-xs font-medium mt-1 text-muted-foreground">
                        Use at:{" "}
                        <span className="font-semibold text-foreground">
                          {item.where}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => downloadCSVString(item.filename, item.fn())}
                    data-ocid="settings.samples.download_button"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download {item.title} Template
                  </Button>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
              <strong>Tip:</strong> Open downloaded CSV files in Excel or Google
              Sheets. Keep the first row (header) unchanged. Add your data
              starting from row 2. Save as CSV before uploading.
            </div>
          </div>
        </TabsContent>

        {/* Finance Year */}
        <TabsContent value="financeYear" className="mt-4">
          <div className="max-w-xl space-y-4">
            {/* Current FY Summary */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">
                    Current Finance Year
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {getCurrentFYInfo().label} — April 1 to March 31
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              {(() => {
                const { start, end } = getCurrentFYInfo();
                const allBills = getBills(SHARED_DATA_ID);
                const allInvoices = getInvoices(SHARED_DATA_ID);
                const allExpenses = getExpenses(SHARED_DATA_ID);
                const fyBills = allBills.filter((b) => {
                  const d = new Date(b.date);
                  return d >= start && d <= end;
                });
                const fyInvoices = allInvoices.filter((inv) => {
                  const d = new Date(inv.date);
                  return d >= start && d <= end;
                });
                const fyExpenses = allExpenses.filter((exp) => {
                  const d = new Date(exp.date);
                  return d >= start && d <= end;
                });
                const totalRevenue = fyBills.reduce(
                  (sum, b) => sum + (b.total || 0),
                  0,
                );
                const totalExpensesAmt = fyExpenses.reduce(
                  (sum, e) => sum + (e.amount || 0),
                  0,
                );
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                      <p className="text-xl font-bold text-blue-700">
                        {fyBills.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bills this FY
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
                      <p className="text-xl font-bold text-green-700">
                        {fyInvoices.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invoices this FY
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-center">
                      <p className="text-xl font-bold text-purple-700">
                        ₹{totalRevenue.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Revenue
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                      <p className="text-xl font-bold text-red-700">
                        ₹{totalExpensesAmt.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Expenses
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">
                    Before closing the Finance Year:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>All current FY bills and invoices will be archived</li>
                    <li>Invoice and bill sequences will reset to 1</li>
                    <li>
                      Products, customers, vendors, and tariffs are NOT affected
                    </li>
                    <li>You can view archived data any time from this page</li>
                  </ul>
                </div>
              </div>

              {currentUser?.role === "admin" && (
                <Button
                  onClick={() => {
                    setFyCloseConfirmOpen(true);
                    setFyClosePassword("");
                    setFyClosePasswordError("");
                    setFyClosePasswordVerified(false);
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  data-ocid="settings.fy.close_button"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Close Finance Year — {getCurrentFYInfo().label}
                </Button>
              )}
            </div>

            {/* FY Archive history */}
            {fyArchives.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">
                    Finance Year Archives
                  </h3>
                </div>
                <div className="space-y-2">
                  {[...fyArchives].reverse().map((archive) => (
                    <div
                      key={archive.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {archive.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Closed on{" "}
                            {new Date(archive.closedAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          Archived
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="text-muted-foreground">
                          Bills: <strong>{archive.summary.totalBills}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Invoices:{" "}
                          <strong>{archive.summary.totalInvoices}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Revenue:{" "}
                          <strong>
                            ₹
                            {archive.summary.totalRevenue.toLocaleString(
                              "en-IN",
                            )}
                          </strong>
                        </span>
                        <span className="text-muted-foreground">
                          Expenses:{" "}
                          <strong>
                            ₹
                            {archive.summary.totalExpenses.toLocaleString(
                              "en-IN",
                            )}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for archives */}
            {fyArchives.length === 0 && (
              <div
                className="bg-white rounded-xl border border-border p-6 shadow-xs text-center"
                data-ocid="settings.fy.empty_state"
              >
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  No archived finance years yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Close the current finance year at the end of March to archive
                  and reset sequences.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* API Integrations Tab */}
        <TabsContent value="apiIntegrations" className="mt-4 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Digital Marketing API Keys
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure API keys for automated campaigns in Digital Marketing →
              Automation tab.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 space-y-5">
              {(
                [
                  {
                    key: "whatsappApiKey" as keyof DMApiSettings,
                    label: "WhatsApp Business API Key",
                    help: "How to get: Go to business.facebook.com → WhatsApp → API Setup → Create API Key",
                  },
                  {
                    key: "facebookApiToken" as keyof DMApiSettings,
                    label: "Facebook / Instagram Graph API Token",
                    help: "How to get: Go to developers.facebook.com → My Apps → Select App → Access Token",
                  },
                  {
                    key: "emailApiKey" as keyof DMApiSettings,
                    label: "Email API Key (SendGrid)",
                    help: "How to get: Go to app.sendgrid.com → Settings → API Keys → Create API Key (Full Access or Restricted - Mail Send)",
                  },
                  {
                    key: "telegramBotToken" as keyof DMApiSettings,
                    label: "Telegram Bot Token",
                    help: "How to get: Open Telegram → Search @BotFather → Send /newbot → Follow steps to get token",
                  },
                ] as { key: keyof DMApiSettings; label: string; help: string }[]
              ).map(({ key, label, help }) => (
                <div key={key} className="space-y-2">
                  <Label className="font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                    {help}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
                      placeholder={
                        dmApiSettings[key]
                          ? "••••••••••••••••"
                          : "Enter API key…"
                      }
                      value={dmApiEdits[key] ?? ""}
                      onChange={(e) =>
                        setDmApiEdits((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      data-ocid={`settings.api_${key}.input`}
                    />
                    {dmApiSettings[key] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = { ...dmApiSettings };
                          delete updated[key];
                          setDmApiSettings(updated);
                          setDMApiSettings(updated);
                          toast.success(`${label} removed`);
                        }}
                        className="text-destructive hover:text-destructive"
                        data-ocid={`settings.api_${key}.delete_button`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {dmApiSettings[key] && (
                    <p className="text-xs text-success">✓ Key saved</p>
                  )}
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  onClick={() => {
                    const merged = { ...dmApiSettings, ...dmApiEdits };
                    setDmApiSettings(merged);
                    setDMApiSettings(merged);
                    setDmApiEdits({});
                    toast.success("API settings saved");
                  }}
                  data-ocid="settings.api.save_button"
                >
                  Save API Settings
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Tab — Admin Only */}
        {currentUser?.role === "admin" && (
          <TabsContent value="appearance" className="mt-4">
            <AppearanceTab />
          </TabsContent>
        )}

        {/* Permissions Tab — Admin Only */}
        {currentUser?.role === "admin" && (
          <TabsContent value="permissions" className="mt-4">
            <PermissionsTab />
          </TabsContent>
        )}
      </Tabs>

      {/* Import Backup Dialog — two options */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!isImporting) {
            setImportDialogOpen(open);
            if (!open) {
              setImportPending(null);
              setImportMode("select");
              setRestorePassword("");
              setRestorePasswordError("");
              setShowDeleteConfirm(false);
              setMergeResult(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" />
              Import Backup
            </DialogTitle>
          </DialogHeader>

          {/* Backup summary */}
          {importPending && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs border border-border">
              <p className="font-semibold text-foreground">
                Backup File Contents
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span>
                  Date:{" "}
                  <span className="font-medium text-foreground">
                    {importPending.summary.exportedAt !== "unknown"
                      ? new Date(
                          importPending.summary.exportedAt,
                        ).toLocaleString("en-IN")
                      : "Unknown"}
                  </span>
                </span>
                <span>{importPending.summary.companiesCount} companies</span>
                <span>{importPending.summary.usersCount} users</span>
                <span>
                  {importPending.summary.customersCount ?? 0} customers
                </span>
                <span>{importPending.summary.productsCount ?? 0} products</span>
                <span>{importPending.summary.vendorsCount ?? 0} vendors</span>
                <span>
                  {importPending.summary.employeesCount ?? 0} employees
                </span>
              </div>
              {importPending.summary.companies.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-3 text-muted-foreground pl-2 border-l-2 border-border"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span>{c.billsCount} bills</span>
                  <span>{c.invoicesCount} invoices</span>
                  <span>{c.customersCount} customers</span>
                </div>
              ))}
            </div>
          )}

          {/* Merge result */}
          {mergeResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-green-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Merge Complete
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-green-700">
                <span>
                  Companies added: <strong>{mergeResult.companiesAdded}</strong>
                </span>
                <span>
                  Bills added: <strong>{mergeResult.billsAdded}</strong>
                </span>
                <span>
                  Invoices added: <strong>{mergeResult.invoicesAdded}</strong>
                </span>
                <span>
                  Customers added: <strong>{mergeResult.customersAdded}</strong>
                </span>
                <span>
                  Products added: <strong>{mergeResult.productsAdded}</strong>
                </span>
                <span>
                  Vendors added: <strong>{mergeResult.vendorsAdded}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Step: select mode */}
          {importMode === "select" && !mergeResult && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Choose how to import this backup:
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode("full")}
                  className="text-left p-4 rounded-xl border-2 border-destructive/30 bg-red-50 hover:bg-red-100 transition-colors"
                  data-ocid="settings.import.full_restore.button"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-destructive">
                        Full Restore
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Clears ALL existing data and replaces it with the
                        backup. Requires password confirmation. Cannot be
                        undone.
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("merge")}
                  className="text-left p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                  data-ocid="settings.import.merge.button"
                >
                  <div className="flex items-start gap-3">
                    <GitMerge className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-blue-800">
                        Add New Data Only
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Keeps all existing records untouched. Only adds records
                        from the backup that don't already exist (by ID). Safe
                        to run anytime.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: Full Restore — password */}
          {importMode === "full" && !showDeleteConfirm && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  This will permanently delete all existing data. Enter your
                  current login password to continue.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your Current Password</Label>
                <Input
                  type="password"
                  value={restorePassword}
                  onChange={(e) => {
                    setRestorePassword(e.target.value);
                    setRestorePasswordError("");
                  }}
                  placeholder="Enter your login password"
                  data-ocid="settings.import.restore_password.input"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleFullRestorePasswordCheck()
                  }
                />
                {restorePasswordError && (
                  <p className="text-xs text-red-600">{restorePasswordError}</p>
                )}
              </div>
            </div>
          )}

          {/* Step: Full Restore — delete confirmation */}
          {importMode === "full" && showDeleteConfirm && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-2">
                <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Final Confirmation
                </p>
                <p className="text-xs text-red-700">
                  Are you sure you want to{" "}
                  <strong>permanently delete all existing data</strong> and
                  replace it with the backup? This action{" "}
                  <strong>cannot be undone</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Step: Merge — confirm */}
          {importMode === "merge" && !mergeResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <GitMerge className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Only new records (not already present by ID) will be added. Your
                existing data will not be changed or deleted.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            {mergeResult ? (
              <Button
                onClick={() => {
                  setImportDialogOpen(false);
                  setImportPending(null);
                  setImportMode("select");
                  setMergeResult(null);
                }}
              >
                Done
              </Button>
            ) : importMode === "select" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(false);
                  setImportPending(null);
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
            ) : importMode === "full" && !showDeleteConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setImportMode("select")}
                  disabled={isImporting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleFullRestorePasswordCheck}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Verify Password
                </Button>
              </>
            ) : importMode === "full" && showDeleteConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  data-ocid="settings.import.confirm_delete.button"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Restoring…
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 mr-2" /> Yes, Delete &amp;
                      Restore
                    </>
                  )}
                </Button>
              </>
            ) : importMode === "merge" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setImportMode("select")}
                  disabled={isImporting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleMergeImport}
                  disabled={isImporting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-ocid="settings.import.confirm_merge.button"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Merging…
                    </>
                  ) : (
                    <>
                      <GitMerge className="w-4 h-4 mr-2" /> Add New Data
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drive Restore Dialog */}
      <Dialog
        open={driveRestoreDialogOpen}
        onOpenChange={(open) => {
          if (!driveRestoring) {
            setDriveRestoreDialogOpen(open);
            if (!open) {
              setDriveRestoreMode("select");
              setDriveRestorePassword("");
              setDriveRestorePasswordError("");
              setDriveShowDeleteConfirm(false);
              setDriveMergeResult(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Update / Sync from Google Drive
            </DialogTitle>
          </DialogHeader>

          {/* Drive backup summary */}
          {driveBackupSummary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-blue-800">
                Drive Backup Details
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span>
                  Saved:{" "}
                  <span className="font-medium text-foreground">
                    {driveBackupSummary.exportedAt !== "unknown"
                      ? new Date(driveBackupSummary.exportedAt).toLocaleString(
                          "en-IN",
                        )
                      : "Unknown"}
                  </span>
                </span>
                <span>{driveBackupSummary.companiesCount} companies</span>
                <span>{driveBackupSummary.usersCount} users</span>
              </div>
              {driveBackupSummary.companies.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-3 text-muted-foreground pl-2 border-l-2 border-blue-200"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span>{c.billsCount} bills</span>
                  <span>{c.invoicesCount} invoices</span>
                  <span>{c.customersCount} customers</span>
                </div>
              ))}
            </div>
          )}

          {/* Merge result */}
          {driveMergeResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-green-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Merge from Drive Complete
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-green-700">
                <span>
                  Companies added:{" "}
                  <strong>{driveMergeResult.companiesAdded}</strong>
                </span>
                <span>
                  Bills added: <strong>{driveMergeResult.billsAdded}</strong>
                </span>
                <span>
                  Invoices added:{" "}
                  <strong>{driveMergeResult.invoicesAdded}</strong>
                </span>
                <span>
                  Customers added:{" "}
                  <strong>{driveMergeResult.customersAdded}</strong>
                </span>
                <span>
                  Products added:{" "}
                  <strong>{driveMergeResult.productsAdded}</strong>
                </span>
                <span>
                  Vendors added:{" "}
                  <strong>{driveMergeResult.vendorsAdded}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Select mode */}
          {driveRestoreMode === "select" && !driveMergeResult && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Choose how to apply the Drive backup to your current data:
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setDriveRestoreMode("full")}
                  className="text-left p-4 rounded-xl border-2 border-destructive/30 bg-red-50 hover:bg-red-100 transition-colors"
                  data-ocid="settings.drive_restore.full.button"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-destructive">
                        Full Restore
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Deletes all existing local data and replaces it entirely
                        with the Drive backup. Requires password + confirmation.
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDriveRestoreMode("merge")}
                  className="text-left p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                  data-ocid="settings.drive_restore.merge.button"
                >
                  <div className="flex items-start gap-3">
                    <GitMerge className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-blue-800">
                        Add New Data Only
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Keeps all existing records. Only adds data from Drive
                        that doesn't already exist locally. Safe and
                        non-destructive.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Full restore — password step */}
          {driveRestoreMode === "full" && !driveShowDeleteConfirm && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  All existing local data will be permanently deleted. Enter
                  your current login password to continue.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your Current Password</Label>
                <Input
                  type="password"
                  value={driveRestorePassword}
                  onChange={(e) => {
                    setDriveRestorePassword(e.target.value);
                    setDriveRestorePasswordError("");
                  }}
                  placeholder="Enter your login password"
                  data-ocid="settings.drive_restore.password.input"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleDriveFullRestorePasswordCheck()
                  }
                />
                {driveRestorePasswordError && (
                  <p className="text-xs text-red-600">
                    {driveRestorePasswordError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Full restore — delete confirmation step */}
          {driveRestoreMode === "full" && driveShowDeleteConfirm && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-2">
              <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Final Confirmation
              </p>
              <p className="text-xs text-red-700">
                Are you sure you want to{" "}
                <strong>permanently delete all existing data</strong> and
                replace it with the Google Drive backup? This action{" "}
                <strong>cannot be undone</strong>.
              </p>
            </div>
          )}

          {/* Merge — confirm step */}
          {driveRestoreMode === "merge" && !driveMergeResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <GitMerge className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Only records from Drive that are not already present locally (by
                ID) will be added. No existing data will be changed.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            {driveMergeResult ? (
              <Button
                onClick={() => {
                  setDriveRestoreDialogOpen(false);
                  setDriveMergeResult(null);
                  setDriveRestoreMode("select");
                }}
              >
                Done
              </Button>
            ) : driveRestoreMode === "select" ? (
              <Button
                variant="outline"
                onClick={() => setDriveRestoreDialogOpen(false)}
                disabled={driveRestoring}
              >
                Cancel
              </Button>
            ) : driveRestoreMode === "full" && !driveShowDeleteConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDriveRestoreMode("select")}
                  disabled={driveRestoring}
                >
                  Back
                </Button>
                <Button
                  onClick={handleDriveFullRestorePasswordCheck}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Verify Password
                </Button>
              </>
            ) : driveRestoreMode === "full" && driveShowDeleteConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDriveShowDeleteConfirm(false)}
                  disabled={driveRestoring}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDriveFullRestore}
                  disabled={driveRestoring}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  data-ocid="settings.drive_restore.confirm_delete.button"
                >
                  {driveRestoring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Restoring…
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 mr-2" /> Yes, Delete &amp;
                      Restore from Drive
                    </>
                  )}
                </Button>
              </>
            ) : driveRestoreMode === "merge" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDriveRestoreMode("select")}
                  disabled={driveRestoring}
                >
                  Back
                </Button>
                <Button
                  onClick={handleDriveMerge}
                  disabled={driveRestoring}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-ocid="settings.drive_restore.confirm_merge.button"
                >
                  {driveRestoring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Merging…
                    </>
                  ) : (
                    <>
                      <GitMerge className="w-4 h-4 mr-2" /> Add New Data from
                      Drive
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Form Dialog */}
      <Dialog open={showCompanyForm} onOpenChange={setShowCompanyForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit" : "Add"} Company</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {/* Logo upload */}
            <div className="col-span-2">
              <Label className="text-xs">Company Logo</Label>
              <div className="mt-1 flex items-center gap-3">
                {compLogoUrl ? (
                  <div className="relative flex-shrink-0">
                    <img
                      src={compLogoUrl}
                      alt="Company logo preview"
                      className="h-20 w-auto object-contain border border-border rounded-lg p-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setCompLogoUrl(undefined)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90"
                      title="Remove logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 flex-shrink-0">
                    <Image className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-white hover:bg-muted/30 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {compLogoUrl ? "Change Logo" : "Upload Logo"}
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleLogoUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, SVG. Logo will appear on invoices &amp; bills.
                  </p>
                </div>
              </div>
            </div>

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
            {/* Bank Details */}
            <div className="col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2 border-t border-border pt-2">
                Bank Details (for invoice printing)
              </p>
            </div>
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input
                value={compBankName}
                onChange={(e) => setCompBankName(e.target.value)}
                className="mt-1 text-sm"
                placeholder="e.g. State Bank of India"
              />
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input
                value={compBankAccount}
                onChange={(e) => setCompBankAccount(e.target.value)}
                className="mt-1 text-sm font-mono"
                placeholder="e.g. 123456789012"
              />
            </div>
            <div>
              <Label className="text-xs">Branch Name</Label>
              <Input
                value={compBankBranch}
                onChange={(e) => setCompBankBranch(e.target.value)}
                className="mt-1 text-sm"
                placeholder="e.g. Anna Nagar"
              />
            </div>
            <div>
              <Label className="text-xs">IFSC Code</Label>
              <Input
                value={compBankIfsc}
                onChange={(e) => setCompBankIfsc(e.target.value)}
                className="mt-1 text-sm font-mono"
                placeholder="e.g. SBIN0001234"
              />
            </div>
            {/* UPI Details */}
            <div className="col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2 border-t border-border pt-2">
                UPI Payment (for Payment QR on bills/invoices)
              </p>
            </div>
            <div>
              <Label className="text-xs">UPI ID</Label>
              <Input
                value={compUpiId}
                onChange={(e) => setCompUpiId(e.target.value)}
                className="mt-1 text-sm font-mono"
                placeholder="e.g. yourname@upi or 9876543210@paytm"
              />
            </div>
            <div>
              <Label className="text-xs">
                UPI Name (shown on payment screen)
              </Label>
              <Input
                value={compUpiName}
                onChange={(e) => setCompUpiName(e.target.value)}
                className="mt-1 text-sm"
                placeholder="Business name shown on payment screen"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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

      {/* Finance Year Close Confirmation Dialog */}
      <Dialog
        open={fyCloseConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFyCloseConfirmOpen(false);
            setFyClosePassword("");
            setFyClosePasswordError("");
            setFyClosePasswordVerified(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Close Finance Year — {getCurrentFYInfo().label}
            </DialogTitle>
          </DialogHeader>

          {!fyClosePasswordVerified ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  This will archive all {getCurrentFYInfo().label} data and
                  reset all invoice and bill sequences to 1. Master data
                  (products, customers, vendors) will not be affected.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Enter your admin password to confirm
                </Label>
                <Input
                  type="password"
                  value={fyClosePassword}
                  onChange={(e) => {
                    setFyClosePassword(e.target.value);
                    setFyClosePasswordError("");
                  }}
                  placeholder="Your login password"
                  data-ocid="settings.fy.password.input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (!fyClosePassword) {
                        setFyClosePasswordError("Please enter your password");
                        return;
                      }
                      const hashed = btoa(fyClosePassword);
                      if (!currentUser || currentUser.passwordHash !== hashed) {
                        setFyClosePasswordError("Incorrect password");
                      } else {
                        setFyClosePasswordError("");
                        setFyClosePasswordVerified(true);
                      }
                    }
                  }}
                />
                {fyClosePasswordError && (
                  <p className="text-xs text-red-600">{fyClosePasswordError}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
              <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                <Lock className="w-5 h-5" /> Final Confirmation
              </p>
              <p className="text-xs text-amber-700">
                Are you sure you want to close{" "}
                <strong>{getCurrentFYInfo().label}</strong>? This will:
              </p>
              <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                <li>Archive all current FY transactions</li>
                <li>Reset all invoice sequences to 1</li>
                <li>Reset bill sequence to 1</li>
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFyCloseConfirmOpen(false)}
              data-ocid="settings.fy.cancel_button"
            >
              Cancel
            </Button>
            {!fyClosePasswordVerified ? (
              <Button
                onClick={() => {
                  if (!fyClosePassword) {
                    setFyClosePasswordError("Please enter your password");
                    return;
                  }
                  const hashed = btoa(fyClosePassword);
                  if (!currentUser || currentUser.passwordHash !== hashed) {
                    setFyClosePasswordError("Incorrect password");
                  } else {
                    setFyClosePasswordError("");
                    setFyClosePasswordVerified(true);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                data-ocid="settings.fy.verify_password.button"
              >
                Verify Password
              </Button>
            ) : (
              <Button
                onClick={handleCloseFY}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                data-ocid="settings.fy.confirm_close.button"
              >
                <Lock className="w-4 h-4 mr-2" /> Confirm Close{" "}
                {getCurrentFYInfo().label}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Appearance Tab Component ────────────────────────────────────────────────
function AppearanceTab() {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("sks_theme") || "{}");
    } catch {
      return {};
    }
  })();
  const [activeTheme, setActiveTheme] = useState<string>(
    saved.name || "professional",
  );
  const [customPrimary, setCustomPrimary] = useState<string>(
    saved.customPrimary || "",
  );

  const handleApply = (name: string, cp?: string) => {
    setActiveTheme(name);
    applyTheme(name, cp);
    toast.success(`Theme "${themeLabels[name]}" applied`);
  };

  const handleReset = () => {
    resetTheme();
    setActiveTheme("professional");
    setCustomPrimary("");
    toast.success("Theme reset to default");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-border p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Application Theme</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a colour theme for the entire application. Only admins can
            change this.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(themes).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApply(key, customPrimary || undefined)}
              data-ocid={`settings.theme_${key}.button`}
              className={`rounded-xl border-2 p-3 text-left transition-all ${activeTheme === key ? "border-primary shadow-md scale-[1.02]" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex gap-1.5 mb-2">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ background: t.primary }}
                />
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ background: t.secondary }}
                />
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ background: t.accent }}
                />
              </div>
              <p className="text-xs font-semibold">{themeLabels[key]}</p>
              <div
                className="w-full h-2 rounded mt-1"
                style={{ background: t.sidebar }}
              />
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <label htmlFor="custom-color-picker" className="text-xs font-medium">
            Custom Primary Colour Override
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={
                customPrimary ||
                themes[activeTheme as keyof typeof themes]?.primary ||
                "#1e40af"
              }
              onChange={(e) => setCustomPrimary(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-border"
              data-ocid="settings.custom_color.input"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {customPrimary || "Default"}
            </span>
            <button
              type="button"
              onClick={() =>
                handleApply(activeTheme, customPrimary || undefined)
              }
              className="ml-auto px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
              data-ocid="settings.apply_theme.button"
            >
              Apply
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-foreground underline hover:text-foreground"
          data-ocid="settings.reset_theme.button"
        >
          Reset to Default Theme
        </button>
      </div>
    </div>
  );
}

// ─── Permissions Tab Component ────────────────────────────────────────────────
const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "billing", label: "Billing POS" },
  { key: "bills", label: "Bills" },
  { key: "invoices", label: "Invoices" },
  { key: "customers", label: "Customers" },
  { key: "vendors", label: "Vendors" },
  { key: "products", label: "Products" },
  { key: "inventory", label: "Inventory" },
  { key: "pickups", label: "Pickups" },
  { key: "reports", label: "Reports" },
  { key: "design", label: "Design Studio" },
  { key: "marketing", label: "Digital Marketing" },
  { key: "erp", label: "ERP" },
  { key: "settings", label: "Settings" },
];

type RolePerms = Record<string, boolean>;
type AllPerms = { manager: RolePerms; operator: RolePerms };

function getDefaultPerms(): AllPerms {
  const all = Object.fromEntries(MODULES.map((m) => [m.key, true]));
  const ops = Object.fromEntries(
    MODULES.map((m) => [m.key, !["settings", "erp"].includes(m.key)]),
  );
  return { manager: all, operator: ops };
}

function loadPerms(): AllPerms {
  try {
    const s = localStorage.getItem("sks_role_permissions");
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return getDefaultPerms();
}

function savePerms(p: AllPerms) {
  localStorage.setItem("sks_role_permissions", JSON.stringify(p));
}

function PermissionsTab() {
  const [perms, setPerms] = useState<AllPerms>(loadPerms);
  const [designations, setDesignations] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sks_designations") || "[]");
    } catch {
      return [];
    }
  });
  const [newDesig, setNewDesig] = useState("");

  const BUILTIN_DESIGNATIONS = [
    "Delivery & Pickup",
    "Receptionist",
    "Supervisor",
    "Accountant",
    "Manager",
    "Cashier",
    "Sales Executive",
  ];
  const allDesignations = [
    ...BUILTIN_DESIGNATIONS,
    ...designations.filter((d) => !BUILTIN_DESIGNATIONS.includes(d)),
  ];

  const togglePerm = (role: "manager" | "operator", module: string) => {
    const updated = {
      ...perms,
      [role]: { ...perms[role], [module]: !perms[role][module] },
    };
    setPerms(updated);
    savePerms(updated);
    toast.success("Permission updated");
  };

  const addDesig = () => {
    if (!newDesig.trim()) return;
    if (allDesignations.includes(newDesig.trim())) {
      toast.error("Already exists");
      return;
    }
    const updated = [...designations, newDesig.trim()];
    setDesignations(updated);
    localStorage.setItem("sks_designations", JSON.stringify(updated));
    setNewDesig("");
    toast.success("Designation added");
  };

  const removeDesig = (d: string) => {
    if (BUILTIN_DESIGNATIONS.includes(d)) return;
    const updated = designations.filter((x) => x !== d);
    setDesignations(updated);
    localStorage.setItem("sks_designations", JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Designations */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold">User Designations</h3>
        <p className="text-xs text-muted-foreground">
          Manage designations for staff roles like Delivery & Pickup,
          Receptionist, etc.
        </p>
        <div className="flex flex-wrap gap-2">
          {allDesignations.map((d) => (
            <span
              key={d}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium border border-border"
            >
              {d}
              {!BUILTIN_DESIGNATIONS.includes(d) && (
                <button
                  type="button"
                  onClick={() => removeDesig(d)}
                  className="text-muted-foreground hover:text-destructive ml-1"
                  data-ocid="settings.designation.delete_button"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDesig}
            onChange={(e) => setNewDesig(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDesig()}
            placeholder="New designation name..."
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-ocid="settings.designation.input"
          />
          <button
            type="button"
            onClick={addDesig}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
            data-ocid="settings.designation.submit_button"
          >
            Add
          </button>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold">Role Permissions</h3>
        <p className="text-xs text-muted-foreground">
          Control which modules each role can access. Admin always has full
          access.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">
                  Module
                </th>
                <th className="text-center px-4 py-2 font-semibold">Admin</th>
                <th className="text-center px-4 py-2 font-semibold">Manager</th>
                <th className="text-center px-4 py-2 font-semibold">
                  Operator
                </th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr
                  key={m.key}
                  className="border-b border-border/50 hover:bg-muted/20"
                >
                  <td className="py-2 pr-4 font-medium">{m.label}</td>
                  <td className="text-center px-4">
                    <span className="text-green-600 font-bold">✓</span>
                  </td>
                  <td className="text-center px-4">
                    <input
                      type="checkbox"
                      checked={perms.manager[m.key] ?? true}
                      onChange={() => togglePerm("manager", m.key)}
                      className="cursor-pointer accent-primary"
                      data-ocid={`settings.perm_manager_${m.key}.checkbox`}
                    />
                  </td>
                  <td className="text-center px-4">
                    <input
                      type="checkbox"
                      checked={perms.operator[m.key] ?? false}
                      onChange={() => togglePerm("operator", m.key)}
                      className="cursor-pointer accent-primary"
                      data-ocid={`settings.perm_operator_${m.key}.checkbox`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
