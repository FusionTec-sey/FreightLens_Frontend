import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Container,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Sun,
  Moon,
  ShoppingBag,
  Shield,
  Boxes,
  Database,
  GitCompare,
  Lock,
  Unlock,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/Images/Freightliner.png";

function Sidebar({ onLinkClick }) {
  const { permissions, user, logout, isRoot, hasModule } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Persisted Lock / Static state: when locked, sidebar stays statically expanded (w-64) without auto-collapsing
  const [isLocked, setIsLocked] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_locked");
      return saved !== null ? saved === "true" : true; // Default to true (expanded & locked)
    } catch (e) {
      return true;
    }
  });

  const toggleLock = () => {
    setIsLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_locked", next.toString());
      } catch (e) {}
      if (!next) {
        // If unlocking/collapsing, close any open accordion for clean collapsed state
        setOpenAccordion(null);
      } else {
        // If locking/expanding, restore active section accordion
        if (isDashboardSectionActive) setOpenAccordion("dashboard");
        else if (isSourcingActive) setOpenAccordion("sourcing");
        else if (isOrdersActive) setOpenAccordion("orders");
        else if (isContainerActive) setOpenAccordion("containers");
        else if (isMasterDataActive) setOpenAccordion("masterdata");
        else if (isSettingsActive) setOpenAccordion("settings");
      }
      return next;
    });
  };

  const hasPermission = (field) => {
    if (!permissions) return false;
    if (permissions.includes(field)) return true;
    if (field.startsWith("View_")) {
      const suffix = field.slice(5);
      if (
        permissions.includes(`Edit_${suffix}`) ||
        permissions.includes(`Add_${suffix}`) ||
        permissions.includes(`Delete_${suffix}`) ||
        permissions.includes(suffix)
      ) {
        return true;
      }
    }
    return false;
  };

  const initial = user ? user.charAt(0).toUpperCase() : "U";

  const handleLogout = () => {
    logout();
    if (onLinkClick) onLinkClick();
    setTimeout(() => navigate("/"), 0);
  };

  const isActive = (path) => location.pathname === path;

  // Active section checkers
  const isDashboardSectionActive =
    isActive("/dashboard") ||
    isActive("/dashboard/templates") ||
    isActive("/dashboard-templates");

  const isSourcingActive =
    isActive("/sourcing") ||
    isActive("/store-requests");

  const isOrdersActive =
    isActive("/orders") ||
    isActive("/orders/quotes") ||
    isActive("/quotes") ||
    isActive("/templates") ||
    isActive("/orders/templates") ||
    isActive("/packing-lists") ||
    isActive("/goods-receiving") ||
    isActive("/damage-defects") ||
    isActive("/daily-operations");

  const isContainerActive =
    isActive("/viewContainer") ||
    isActive("/ConatinerEntry") ||
    isActive("/BillOfLanding") ||
    isActive("/billOfLanding") ||
    isActive("/bill-of-landing-info") ||
    isActive("/Complete");

  const isInventoryActive =
    isActive("/inventory") ||
    isActive("/inventory/products") ||
    location.pathname.startsWith("/inventory");

  const isMasterDataActive =
    isActive("/master-data/suppliers") ||
    isActive("/master-data/currencies") ||
    isActive("/master-data/payment-terms") ||
    isActive("/master-data/document-types");

  const isSettingsActive =
    isActive("/settings-overview") ||
    isActive("/settings") ||
    isActive("/organization-settings") ||
    isActive("/order-settings") ||
    isActive("/logistics") ||
    isActive("/reference-data");

  const isAdminActive = isActive("/admin");

  // Single active accordion: opening one submenu automatically closes all previous ones
  const [openAccordion, setOpenAccordion] = useState(() => {
    // Only auto-expand active accordion if sidebar is locked/pinned
    const initialLocked = (() => {
      try {
        const saved = localStorage.getItem("sidebar_locked");
        return saved !== null ? saved === "true" : true;
      } catch (e) {
        return true;
      }
    })();
    if (!initialLocked) return null;
    if (isDashboardSectionActive) return "dashboard";
    if (isSourcingActive) return "sourcing";
    if (isOrdersActive) return "orders";
    if (isContainerActive) return "containers";
    if (isMasterDataActive) return "masterdata";
    if (isSettingsActive) return "settings";
    return null;
  });

  const toggleAccordion = (sectionKey) => {
    setOpenAccordion((prev) => (prev === sectionKey ? null : sectionKey));
  };

  // Automatically activate and expand the section corresponding to active route when locked
  useEffect(() => {
    if (isLocked) {
      if (isDashboardSectionActive) {
        setOpenAccordion("dashboard");
      } else if (isSourcingActive) {
        setOpenAccordion("sourcing");
      } else if (isOrdersActive) {
        setOpenAccordion("orders");
      } else if (isContainerActive) {
        setOpenAccordion("containers");
      } else if (isMasterDataActive) {
        setOpenAccordion("masterdata");
      } else if (isSettingsActive) {
        setOpenAccordion("settings");
      }
    }
  }, [location.pathname, isLocked]);

  // ── Render Helpers ──────────────────────────────────────────────────────────
  // Height is exactly h-6 in both collapsed (divider) and expanded (header title) states
  // to prevent any vertical shift when the sidebar expands horizontally on hover.
  const renderSectionHeader = (title) => (
    <div className="h-6 px-3 flex items-center justify-center my-0.5 overflow-hidden transition-all duration-200">
      <div
        className={`w-full h-px bg-slate-200/80 dark:bg-slate-800 ${
          isLocked ? "hidden" : "hidden md:block md:group-hover:hidden"
        }`}
      />
      <span
        className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none truncate w-full ${
          isLocked ? "block" : "block md:hidden md:group-hover:block"
        }`}
      >
        {title}
      </span>
    </div>
  );

  const renderNavLink = (to, icon, label, isCurrentActive, badge = null) => (
    <Link
      to={to}
      onClick={onLinkClick}
      title={label}
      aria-current={isCurrentActive ? "page" : undefined}
      className={`relative flex items-center h-10 px-3 rounded-xl transition-all duration-150 group/item ${
        isCurrentActive
          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-indigo-600 dark:before:bg-indigo-400 before:rounded-r-full"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium"
      }`}
    >
      <div className="w-6 min-w-[1.5rem] flex items-center justify-center flex-shrink-0">
        {React.cloneElement(icon, {
          size: 18,
          className: isCurrentActive
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-500 dark:text-slate-400 group-hover/item:text-slate-700 dark:group-hover/item:text-slate-200 transition-colors",
        })}
      </div>
      <span
        className={`text-[13px] ml-3 whitespace-nowrap overflow-hidden flex-1 truncate ${
          isLocked
            ? "opacity-100"
            : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 delay-75"
        }`}
      >
        {label}
      </span>
      {badge && (
        <span
          className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ${
            isLocked
              ? "opacity-100"
              : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );

  const renderAccordion = ({
    sectionKey,
    icon,
    label,
    isSectionActive,
    children,
  }) => {
    const isOpen = openAccordion === sectionKey;

    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => toggleAccordion(sectionKey)}
          title={label}
          className={`relative flex items-center h-10 px-3 rounded-xl w-full text-left bg-transparent border-0 cursor-pointer transition-all duration-150 group/item ${
            isSectionActive
              ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-indigo-600 dark:before:bg-indigo-400 before:rounded-r-full"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium"
          }`}
        >
          <div className="w-6 min-w-[1.5rem] flex items-center justify-center flex-shrink-0">
            {React.cloneElement(icon, {
              size: 18,
              className: isSectionActive
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400 group-hover/item:text-slate-700 dark:group-hover/item:text-slate-200 transition-colors",
            })}
          </div>
          <span
            className={`text-[13px] ml-3 whitespace-nowrap overflow-hidden flex-1 truncate ${
              isLocked
                ? "opacity-100"
                : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 delay-75"
            }`}
          >
            {label}
          </span>
          <ChevronDown
            size={15}
            className={`ml-auto transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            } ${
              isLocked
                ? "opacity-100"
                : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
            } ${isSectionActive ? "text-indigo-500" : "text-slate-400"}`}
          />
        </button>

        {/* Submenu with Tree Guideline: smooth accordion transition */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            isOpen
              ? "block max-h-96 opacity-100"
              : "hidden max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="ml-6 pl-3 my-1 border-l-2 border-slate-200/80 dark:border-slate-800 space-y-0.5">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const renderSubLink = (to, label, isCurrentActive) => (
    <Link
      to={to}
      onClick={onLinkClick}
      aria-current={isCurrentActive ? "page" : undefined}
      className={`flex items-center h-8 px-2.5 rounded-lg text-xs transition-colors duration-150 ${
        isCurrentActive
          ? "bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 font-medium"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-2 transition-all ${
          isCurrentActive
            ? "bg-indigo-600 dark:bg-indigo-400 scale-125"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      />
      <span className="truncate">{label}</span>
    </Link>
  );

  // ── Permission & Role Computations ──────────────────────────────────────────
  const canManageTemplates =
    hasPermission("Manage_DashboardTemplate") ||
    isRoot ||
    (Array.isArray(permissions) && permissions.includes("Administrator"));

  const canViewRFQ =
    hasPermission("View_RFQ") || hasPermission("View_Order") || isRoot || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canViewStoreReq =
    hasPermission("View_StoreRequest") || hasPermission("View_Order") || isRoot || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canViewTemplates =
    hasPermission("View_OrderTemplate") || hasPermission("View_Order") || isRoot || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canViewPO =
    hasPermission("View_Order") || isRoot || (Array.isArray(permissions) && permissions.includes("Administrator"));

  const canViewSourcingMenu =
    hasModule("ORDERS") &&
    (canViewRFQ || canViewStoreReq || (!canViewPO && canViewTemplates));

  const canViewQuotes =
    hasPermission("Compare_Quote") || hasPermission("View_VendorQuote") || hasPermission("Send_RFQ") || canViewPO;
  const canViewPackingList = hasPermission("View_PackingList") || canViewPO;
  const canViewReceiving = hasPermission("View_Receiving") || canViewPO;
  const canViewDefects =
    hasPermission("View_Defect") ||
    hasPermission("Add_Defect") ||
    hasPermission("View_Report") ||
    hasPermission("Add_Report") ||
    hasPermission("Receive_Orders") ||
    hasPermission("Manage_Orders") ||
    canViewPO;
  const canViewDailyWork = hasPermission("View_DailyWork") || canViewPO;

  const canViewOrdersMenu =
    hasModule("ORDERS") &&
    (canViewPO || canViewQuotes || canViewTemplates || canViewPackingList || canViewReceiving || canViewDefects || canViewDailyWork);

  const canViewContainers =
    hasModule("LOGISTICS") &&
    (hasPermission("View_Container") || hasPermission("Container") || (Array.isArray(permissions) && permissions.includes("Administrator")));
  const canViewBL =
    hasModule("LOGISTICS") &&
    (hasPermission("View_BL") ||
     hasPermission("BillOfLanding") ||
     (Array.isArray(permissions) && (permissions.includes("View_BL") || permissions.includes("BillOfLanding"))));
  const canViewInventory = hasModule("INVENTORY");
  const canViewMasterData =
    hasPermission("View_Setting") || isRoot || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canViewTenantConsole =
    hasPermission("View_TenantConsole") ||
    hasPermission("Manage_TenantConsole") ||
    isRoot ||
    (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canViewSettings = hasPermission("View_Setting");

  return (
    <div
      className={`flex flex-col h-full ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
      } group ${
        isLocked ? "w-64" : "md:w-[68px] md:hover:w-64 w-64 transition-[width] duration-300 ease-in-out"
      } overflow-hidden border-r shadow-xs select-none`}
      onMouseLeave={() => {
        if (!isLocked) {
          setOpenAccordion(null);
        }
      }}
      role="navigation"
      aria-label="Main"
    >
      {/* ── Brand Logo & Header ─────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between h-16 px-3.5 border-b flex-shrink-0 ${
          isDark ? "border-slate-800" : "border-slate-100"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center p-1.5 flex-shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div
            className={`flex flex-col min-w-0 whitespace-nowrap overflow-hidden ${
              isLocked
                ? "opacity-100"
                : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 delay-75"
            }`}
          >
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Freightliner</span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Enterprise</span>
          </div>
        </div>

        {/* Desktop Pin / Lock Toggle Button */}
        <button
          onClick={toggleLock}
          type="button"
          className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer ${
            isLocked
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 shadow-2xs"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:opacity-0 md:group-hover:opacity-100"
          }`}
          title={isLocked ? "Collapse sidebar (Auto-collapse on mouse leave)" : "Lock sidebar (Keep statically expanded)"}
          aria-label={isLocked ? "Collapse sidebar" : "Lock sidebar"}
        >
          {isLocked ? <Lock size={14} className="stroke-[2.5]" /> : <Unlock size={14} />}
        </button>

        {/* Mobile Close Button */}
        {onLinkClick && (
          <button
            className="md:hidden text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onLinkClick}
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Scrollable Menu Navigation ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-start p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        <nav className="flex flex-col gap-1">
          {/* ── SECTION: CORE ───────────────────────────────────────────────── */}
          {renderSectionHeader("Core")}

          {canManageTemplates ? (
            renderAccordion({
              sectionKey: "dashboard",
              icon: <LayoutDashboard />,
              label: "Dashboard",
              isSectionActive: isDashboardSectionActive,
              children: (
                <>
                  {renderSubLink("/dashboard", "Overview", isActive("/dashboard"))}
                  {renderSubLink(
                    "/dashboard/templates",
                    "Template Studio",
                    isActive("/dashboard/templates") || isActive("/dashboard-templates")
                  )}
                </>
              ),
            })
          ) : (
            renderNavLink("/dashboard", <LayoutDashboard />, "Dashboard", isActive("/dashboard"))
          )}

          {/* ── SECTION: PROCUREMENT & SOURCING ─────────────────────────────── */}
          {(canViewSourcingMenu || canViewOrdersMenu) && renderSectionHeader("Procurement")}

          {/* Sourcing Module */}
          {canViewSourcingMenu &&
            renderAccordion({
              sectionKey: "sourcing",
              icon: <GitCompare />,
              label: "Sourcing",
              isSectionActive: isSourcingActive,
              children: (
                <>
                  {canViewRFQ && renderSubLink("/sourcing", "Requisitions & RFQs", isActive("/sourcing"))}
                  {canViewStoreReq && renderSubLink("/store-requests", "Store Requests", isActive("/store-requests"))}
                  {!canViewPO && canViewTemplates && renderSubLink("/templates", "Order Templates", isActive("/templates"))}
                </>
              ),
            })}

          {/* Purchase Orders Module */}
          {canViewOrdersMenu &&
            renderAccordion({
              sectionKey: "orders",
              icon: <ShoppingBag />,
              label: "Purchase Orders",
              isSectionActive: isOrdersActive,
              children: (
                <>
                  {canViewPO && renderSubLink("/orders", "Purchase Orders", isActive("/orders"))}
                  {canViewQuotes && (
                    renderSubLink(
                      "/orders/quotes",
                      "Vendor Quotes & Bidding",
                      isActive("/orders/quotes") || isActive("/quotes")
                    )
                  )}
                  {canViewTemplates && (
                    renderSubLink(
                      "/templates",
                      "Manage Templates",
                      isActive("/templates") || isActive("/orders/templates")
                    )
                  )}
                  {canViewPackingList && renderSubLink("/packing-lists", "Packing Lists", isActive("/packing-lists"))}
                  {canViewReceiving && renderSubLink("/goods-receiving", "Goods Receiving", isActive("/goods-receiving"))}
                  {canViewDefects && renderSubLink("/damage-defects", "Damage & Defects", isActive("/damage-defects"))}
                  {canViewDailyWork && renderSubLink("/daily-operations", "Daily Work & EOD", isActive("/daily-operations"))}
                </>
              ),
            })}

          {/* ── SECTION: LOGISTICS & INVENTORY ──────────────────────────────── */}
          {(canViewContainers || canViewInventory) && renderSectionHeader("Logistics & Stock")}

          {/* Containers Module */}
          {canViewContainers &&
            renderAccordion({
              sectionKey: "containers",
              icon: <Container />,
              label: "Containers",
              isSectionActive: isContainerActive,
              children: (
                <>
                  {renderSubLink(
                    "/viewContainer",
                    "Container Register",
                    isActive("/viewContainer") || isActive("/ConatinerEntry")
                  )}
                  {canViewBL &&
                    renderSubLink(
                      "/BillOfLanding",
                      "Bills of Lading",
                      isActive("/BillOfLanding") || isActive("/billOfLanding") || isActive("/bill-of-landing-info")
                    )}
                  {renderSubLink("/Complete", "Completed Containers", isActive("/Complete"))}
                </>
              ),
            })}

          {/* Inventory / Product Master */}
          {canViewInventory &&
            renderNavLink("/inventory", <Boxes />, "Product Master", isInventoryActive)}

          {/* ── SECTION: ADMINISTRATION & SETTINGS ─────────────────────────── */}
          {(canViewMasterData || canViewTenantConsole || canViewSettings) &&
            renderSectionHeader("System")}

          {/* Master Data Module */}
          {canViewMasterData &&
            renderAccordion({
              sectionKey: "masterdata",
              icon: <Database />,
              label: "Master Data",
              isSectionActive: isMasterDataActive,
              children: (
                <>
                  {renderSubLink("/master-data/suppliers", "Suppliers & Vendors", isActive("/master-data/suppliers"))}
                  {renderSubLink("/master-data/currencies", "Currencies & FX Rates", isActive("/master-data/currencies"))}
                  {renderSubLink("/master-data/payment-terms", "Payment Terms", isActive("/master-data/payment-terms"))}
                  {renderSubLink("/master-data/document-types", "Document Types", isActive("/master-data/document-types"))}
                </>
              ),
            })}

          {/* Tenant Console */}
          {canViewTenantConsole &&
            renderNavLink("/admin", <Shield />, "Tenant Console", isAdminActive)}

          {/* Settings Module */}
          {canViewSettings &&
            renderAccordion({
              sectionKey: "settings",
              icon: <SettingsIcon />,
              label: "Settings",
              isSectionActive: isSettingsActive,
              children: (
                <>
                  {renderSubLink("/settings-overview", "Settings Overview", isActive("/settings-overview"))}
                  {canViewTenantConsole &&
                    renderSubLink("/organization-settings", "Tenant & Org Console", isActive("/organization-settings"))}
                  {renderSubLink("/settings", "Users & Access", isActive("/settings"))}
                  {hasModule("ORDERS") && renderSubLink("/order-settings", "Orders & Procurement", isActive("/order-settings"))}
                  {hasModule("LOGISTICS") && renderSubLink("/logistics", "Logistics & Demurrage", isActive("/logistics"))}
                  {renderSubLink("/reference-data", "Reference Data", isActive("/reference-data"))}
                </>
              ),
            })}
        </nav>
      </div>

      {/* ── User Profile & Footer ─────────────────────────────────────────────── */}
      <div
        className={`p-3 border-t flex-shrink-0 ${
          isDark ? "border-slate-800" : "border-slate-100"
        } mt-auto space-y-2`}
      >
        {/* User Card */}
        <div className="flex items-center gap-2.5 px-1 py-1 rounded-xl">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {initial}
            </div>
            <span className="w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full absolute -bottom-0.5 -right-0.5" />
          </div>
          <div
            className={`flex-1 min-w-0 ${
              isLocked
                ? "opacity-100"
                : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 delay-75"
            }`}
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user || "User"}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
              {isRoot ? "Super Admin" : "Organization User"}
            </p>
          </div>
        </div>

        {/* Controls: Theme & Logout */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition cursor-pointer"
            title="Logout"
          >
            <LogOut size={16} />
            <span
              className={
                isLocked
                  ? "opacity-100"
                  : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 delay-75"
              }
            >
              Logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
