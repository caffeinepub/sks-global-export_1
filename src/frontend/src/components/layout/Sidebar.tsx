import { cn } from "@/lib/utils";
import {
  BarChart2,
  Box,
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  Palette,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Tags,
  TrendingDown,
  Truck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../hooks/useAppStore";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "dashboard" },
  {
    label: "Billing",
    icon: Receipt,
    path: "billing",
    children: [
      { label: "New Bill (POS)", icon: ShoppingCart, path: "billing/new" },
      { label: "Bills", icon: FileText, path: "bills" },
      { label: "Invoices", icon: FileText, path: "invoices" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    path: "inventory",
    children: [
      { label: "Products", icon: Box, path: "products" },
      { label: "Categories", icon: Layers, path: "categories" },
      { label: "Stock", icon: Boxes, path: "inventory" },
      { label: "Purchase Invoices", icon: Receipt, path: "purchase-invoices" },
    ],
  },
  { label: "Customers", icon: Users, path: "customers" },
  { label: "Vendors", icon: UserCheck, path: "vendors" },
  { label: "Schedule Pickup", icon: Truck, path: "pickups" },
  { label: "Courier Tracking", icon: MapPin, path: "courier-tracking" },
  { label: "Tariff Rates", icon: Tag, path: "tariffs" },
  { label: "Cost Price", icon: TrendingDown, path: "cost-price" },
  { label: "Customer Tariffs", icon: Tags, path: "customer-tariffs" },
  { label: "Expenses", icon: Wallet, path: "expenses" },
  {
    label: "Design",
    icon: Palette,
    path: "design",
    children: [{ label: "Design Studio", icon: Layers, path: "design-studio" }],
  },
  { label: "Reports", icon: BarChart2, path: "reports" },
  { label: "Settings", icon: Settings, path: "settings" },
];

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { currentUser } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "billing",
    "inventory",
    "design",
  ]);

  const toggleGroup = (path: string) => {
    setExpandedGroups((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const isActive = (path: string) => currentPage === path;
  const isGroupActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.path));
    }
    return isActive(item.path);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 shadow-sidebar",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-sidebar-primary leading-tight truncate">
                SKS Global
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Export
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center mx-auto">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground flex-shrink-0 p-1 rounded hover:bg-sidebar-accent/30 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {(
          [
            ...navItems,
            ...(currentUser?.role === "admin"
              ? [
                  {
                    label: "Admin Panel",
                    icon: ShieldCheck,
                    path: "admin",
                  } as NavItem,
                ]
              : []),
          ] as NavItem[]
        ).map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedGroups.includes(item.path);
          const active = isGroupActive(item);

          if (item.children) {
            return (
              <div key={item.path}>
                <button
                  type="button"
                  onClick={() => !collapsed && toggleGroup(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                    active
                      ? "text-sidebar-primary bg-sidebar-primary/10"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/20",
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <button
                          type="button"
                          key={child.path}
                          onClick={() => onNavigate(child.path)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                            isActive(child.path)
                              ? "sidebar-active font-medium"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20",
                          )}
                        >
                          <ChildIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              type="button"
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive(item.path)
                  ? "sidebar-active font-medium"
                  : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/20",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border text-center">
          <p className="text-xs text-sidebar-foreground/40">
            © {new Date().getFullYear()} SKS Global Export
          </p>
        </div>
      )}
    </aside>
  );
}
