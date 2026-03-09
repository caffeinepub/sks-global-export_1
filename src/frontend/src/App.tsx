import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { BackupPromptDialog } from "./components/BackupPromptDialog";
import { SaveIndicator } from "./components/SaveIndicator";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { useAppStore } from "./hooks/useAppStore";
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
import { ExpensesPage } from "./pages/ExpensesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { POSBillingPage } from "./pages/POSBillingPage";
import { PickupsPage } from "./pages/PickupsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PurchaseInvoicesPage } from "./pages/PurchaseInvoicesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TariffManagementPage } from "./pages/TariffManagementPage";
import { VendorsPage } from "./pages/VendorsPage";
import { seedInitialData } from "./utils/seedData";
import { getLastBackupTime, migrateToSharedData } from "./utils/storage";

// Simple page store
interface PageStore {
  currentPage: string;
  navigate: (page: string) => void;
}

const usePageStore = create<PageStore>((set) => ({
  currentPage: "dashboard",
  navigate: (page: string) => set({ currentPage: page }),
}));

function AppLayout() {
  const { currentPage, navigate } = usePageStore();
  const { isAuthenticated, activeCompanyId, loadCompanyData, logout } =
    useAppStore();

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
      case "expenses":
        return <ExpensesPage />;
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
