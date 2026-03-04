import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { SaveIndicator } from "./components/SaveIndicator";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { useAppStore } from "./hooks/useAppStore";
import { AdminPage } from "./pages/AdminPage";
import { BillsPage } from "./pages/BillsPage";
import { CustomerTariffsPage } from "./pages/CustomerTariffsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
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
import { getLastBackupTime } from "./utils/storage";

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
  const { isAuthenticated, activeCompanyId, loadCompanyData } = useAppStore();

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
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "admin":
        return <AdminPage />;
      case "tariffs":
        return <TariffManagementPage />;
      case "customer-tariffs":
        return <CustomerTariffsPage />;
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SaveIndicator />
      <Sidebar currentPage={currentPage} onNavigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentPage={currentPage} onNavigate={navigate} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function App() {
  // Seed initial data
  useEffect(() => {
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
