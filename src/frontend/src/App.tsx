import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toaster } from "@/components/ui/sonner";
import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { BackupPromptDialog } from "./components/BackupPromptDialog";
import { SaveIndicator } from "./components/SaveIndicator";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { useAppStore } from "./hooks/useAppStore";
import { AccountingPage } from "./pages/AccountingPage";
import { AdminPage } from "./pages/AdminPage";
import { BillsPage } from "./pages/BillsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CostPricePage } from "./pages/CostPricePage";
import { CourierQueriesPage } from "./pages/CourierQueriesPage";
import { CourierTrackingPage } from "./pages/CourierTrackingPage";
import { CustomerTariffsPage } from "./pages/CustomerTariffsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DesignStudioPage } from "./pages/DesignStudioPage";
import { DigitalMarketingPage } from "./pages/DigitalMarketingPage";
import { EDDManagementPage } from "./pages/EDDManagementPage";
import { ERPPage } from "./pages/ERPPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { PDFEditorPage } from "./pages/PDFEditorPage";
import { POSBillingPage } from "./pages/POSBillingPage";
import { PickupsPage } from "./pages/PickupsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PurchaseInvoicesPage } from "./pages/PurchaseInvoicesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TariffManagementPage } from "./pages/TariffManagementPage";
import { TasksPage } from "./pages/TasksPage";
import { VendorsPage } from "./pages/VendorsPage";
import { seedInitialData } from "./utils/seedData";
import {
  getLastBackupTime,
  getTasks,
  migrateToSharedData,
} from "./utils/storage";
import { loadSavedTheme } from "./utils/themeUtils";

// Simple page store
interface PageStore {
  currentPage: string;
  navigate: (page: string) => void;
}

const usePageStore = create<PageStore>((set) => ({
  currentPage: "dashboard",
  navigate: (page: string) => set({ currentPage: page }),
}));

const SHORTCUTS = [
  { key: "Alt+B", label: "New Bill (POS)" },
  { key: "Alt+C", label: "Customers" },
  { key: "Alt+P", label: "Schedule Pickup" },
  { key: "Alt+I", label: "Invoices" },
  { key: "Alt+Q", label: "Query Follow-up" },
  { key: "Alt+D", label: "Dashboard" },
  { key: "Alt+T", label: "Tasks" },
];

function AppLayout() {
  const { currentPage, navigate } = usePageStore();
  const {
    isAuthenticated,
    activeCompanyId,
    loadCompanyData,
    logout,
    currentUser,
  } = useAppStore();

  // Backup prompt state
  const [backupPrompt, setBackupPrompt] = useState<{
    open: boolean;
    reason: "logout" | "close";
    onProceed: () => void;
  }>({ open: false, reason: "logout", onProceed: () => {} });

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadCompanyData is stable from zustand
  useEffect(() => {
    if (isAuthenticated && activeCompanyId) {
      loadCompanyData(activeCompanyId);
    }
  }, [isAuthenticated, activeCompanyId]);

  // Check backup reminder
  useEffect(() => {
    if (!isAuthenticated) return;
    const lastBackup = getLastBackupTime();
    if (!lastBackup) {
      setTimeout(() => {
        toast.warning(
          "⚠️ No backup taken yet! Go to Settings > Backup to export your data.",
          {
            duration: 6000,
          },
        );
      }, 2000);
    } else {
      const hoursSince =
        (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        setTimeout(() => {
          toast.warning(
            `⚠️ Daily backup reminder! Last backup was ${Math.floor(hoursSince)} hours ago.`,
            { duration: 5000 },
          );
        }, 2000);
      }
    }
  }, [isAuthenticated]);

  // Auto-show tasks on login — once per session
  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const alreadyShown = sessionStorage.getItem("tasksShownThisSession");
    if (alreadyShown) return;
    const myTasks = getTasks().filter(
      (t) => t.assignedTo === currentUser.username && t.status !== "done",
    );
    if (myTasks.length === 0) return;
    sessionStorage.setItem("tasksShownThisSession", "1");
    setTimeout(() => {
      const hasPending = myTasks.some((t) => t.status === "pending");
      const hasNoted = myTasks.some((t) => t.status === "noted");
      if (hasPending) {
        toast.warning("📋 Your Boss assigned a task for you", {
          duration: 5000,
          action: { label: "View Tasks", onClick: () => navigate("tasks") },
        });
      } else if (hasNoted) {
        toast.info("📋 Your task is pending", {
          duration: 5000,
          action: { label: "View Tasks", onClick: () => navigate("tasks") },
        });
      }
      navigate("tasks");
    }, 1500);
  }, [isAuthenticated, currentUser]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          navigate("billing/new");
          break;
        case "c":
          e.preventDefault();
          navigate("customers");
          break;
        case "p":
          e.preventDefault();
          navigate("pickups");
          break;
        case "i":
          e.preventDefault();
          navigate("invoices");
          break;
        case "q":
          e.preventDefault();
          navigate("courier-queries");
          break;
        case "d":
          e.preventDefault();
          navigate("dashboard");
          break;
        case "t":
          e.preventDefault();
          navigate("tasks");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Intercept tab/window close — show native browser confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show their own generic message
      e.returnValue =
        "You have unsaved data. Are you sure you want to leave without taking a backup?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Wrapper around logout — shows backup prompt first
  const handleLogoutRequest = () => {
    setBackupPrompt({
      open: true,
      reason: "logout",
      onProceed: () => {
        setBackupPrompt((p) => ({ ...p, open: false }));
        logout();
      },
    });
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={navigate} />;
      case "billing/new":
        return <POSBillingPage onNavigate={navigate} />;
      case "billing/edit":
        return <POSBillingPage onNavigate={navigate} editMode />;
      case "bills":
        return <BillsPage onNavigate={navigate} />;
      case "invoices":
        return <InvoicesPage />;
      case "products":
        return <ProductsPage />;
      case "categories":
        return <CategoriesPage />;
      case "inventory":
        return <InventoryPage />;
      case "purchase-invoices":
        return <PurchaseInvoicesPage />;
      case "customers":
        return <CustomersPage />;
      case "vendors":
        return <VendorsPage />;
      case "pickups":
        return <PickupsPage />;
      case "courier-tracking":
        return <CourierTrackingPage />;
      case "courier-queries":
        return <CourierQueriesPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "admin":
        return <AdminPage />;
      case "tariffs":
        return <TariffManagementPage />;
      case "cost-price":
        return <CostPricePage />;
      case "customer-tariffs":
        return <CustomerTariffsPage />;
      case "accounting":
        return <AccountingPage />;
      case "edd-management":
        return <EDDManagementPage />;
      case "expenses":
        return <ExpensesPage />;
      case "digital-marketing":
        return <DigitalMarketingPage />;
      case "erp":
        return <ERPPage />;
      case "tasks":
        return <TasksPage onNavigate={navigate} />;
      case "pdf-editor":
        return <PDFEditorPage />;
      case "design-studio":
        return (
          <DesignStudioPage
            onNavigate={navigate}
            onAddToBill={(item) => {
              // Navigate to billing and the POS will handle the item via URL params / state
              navigate("billing/new");
              toast.info(
                `Design order "${item.name}" — add it as a Service line in the new bill.`,
              );
            }}
          />
        );
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-background overflow-hidden">
        <SaveIndicator />
        <Sidebar currentPage={currentPage} onNavigate={navigate} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            currentPage={currentPage}
            onNavigate={navigate}
            onLogoutRequest={handleLogoutRequest}
          />
          <main className="flex-1 overflow-y-auto">{renderPage()}</main>
        </div>
      </div>
      {/* Keyboard Shortcuts Help Button */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-muted text-muted-foreground border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
            title="Keyboard Shortcuts"
            data-ocid="shortcuts.help.button"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-64 p-3"
          data-ocid="shortcuts.help.popover"
        >
          <p className="text-xs font-semibold mb-2 text-foreground">
            ⌨️ Keyboard Shortcuts
          </p>
          <div className="space-y-1">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <BackupPromptDialog
        open={backupPrompt.open}
        reason={backupPrompt.reason}
        onProceed={backupPrompt.onProceed}
        onCancel={() => setBackupPrompt((p) => ({ ...p, open: false }))}
      />
    </>
  );
}

export default function App() {
  // Migrate per-company data to shared key, then seed initial data
  useEffect(() => {
    migrateToSharedData();
    seedInitialData();
    loadSavedTheme();
  }, []);

  const { isAuthenticated } = useAppStore();

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <AppLayout />
      <Toaster position="top-right" richColors />
    </>
  );
}
