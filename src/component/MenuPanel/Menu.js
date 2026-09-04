import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  LayoutDashboard,
  FileText,
  Container,
  ChevronDown,
  LogOut,
  SettingsIcon,
  Sun,
  Moon,
  ShoppingBag,
  Shield,
  Briefcase,
  PackageCheck,
  ShieldAlert,
  FileSpreadsheet,
  Boxes
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/Images/Freightliner.png";

function Sidebar({ onLinkClick }) {
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isContainerOpen, setIsContainerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { permissions, user, logout, isRoot, hasModule } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const hasPermission = (field) => permissions.includes(`${field}`);
  const initial = user ? user.charAt(0).toUpperCase() : "U";

  const handleLogout = () => {
    logout();
    onLinkClick && onLinkClick();
    setTimeout(() => navigate("/"), 0);
  };

  const textClass =
    "text-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-200 whitespace-nowrap overflow-hidden";

  const isActive = (path) => location.pathname === path;

  const isOrdersActive =
    isActive("/orders") ||
    isActive("/store-requests") ||
    isActive("/packing-lists") ||
    isActive("/goods-receiving") ||
    isActive("/damage-defects") ||
    isActive("/daily-operations");

  const isContainerActive =
    isActive("/viewContainer") ||
    isActive("/BillOfLanding") ||
    isActive("/Complete");

  return (
    <div
      className={`flex flex-col h-full ${theme.background} group md:w-16 md:hover:w-64 w-64 transition-all duration-300 overflow-hidden border-r-2 ${theme.border}`}
      onMouseLeave={() => {
        setIsOrdersOpen(false);
        setIsContainerOpen(false);
        setIsSettingsOpen(false);
      }}
      role="navigation"
      aria-label="Main"
    >
      {/* Logo Section */}
      <div className={`flex items-center justify-between gap-3 px-4 py-4 border-b ${theme.border}`}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-8 h-8" />
          <span className={`${textClass} font-semibold`}>Freightliner</span>
        </div>
        {onLinkClick && (
          <button
            className="md:hidden text-xs px-2 py-1 rounded border"
            onClick={onLinkClick}
            aria-label="Close menu"
          >
            Close
          </button>
        )}
      </div>

      {/* Main Menu */}
      <div className="flex-1 flex flex-col justify-start p-4 space-y-2 overflow-y-auto">
        <nav className="flex flex-col gap-2">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            aria-current={isActive("/dashboard") ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded transition ${theme.hover} ${isActive("/dashboard") ? "bg-blue-600/10 text-blue-600" : ""}`}
            onClick={onLinkClick}
          >
            <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
              <LayoutDashboard size={18} />
            </div>
            <span className={textClass}>Dashboard</span>
          </Link>

          {/* ── ORDERS MODULE (Primary Daily Workflow) ── */}
          {hasModule("ORDERS") && (hasPermission("View_Order") || isRoot || permissions.includes("Administrator")) && (
            <div>
              <button
                type="button"
                onClick={() => setIsOrdersOpen(!isOrdersOpen)}
                className={`flex items-center gap-3 px-3 py-2 rounded transition w-full text-left bg-transparent border-0 cursor-pointer ${theme.hover} ${
                  isOrdersActive ? "bg-blue-600/10 text-blue-600 font-semibold" : ""
                }`}
              >
                <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                  <ShoppingBag size={18} className="text-blue-500" />
                </div>
                <span className={textClass}>Orders</span>
                <ChevronDown
                  size={16}
                  className={`ml-auto transition-transform ${
                    isOrdersOpen ? "rotate-180" : ""
                  } md:opacity-0 md:group-hover:opacity-100`}
                />
              </button>

              <div className={`${isOrdersOpen ? "block" : "hidden"} ml-6 mt-1 space-y-1`}>
                <Link
                  to="/orders"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/orders") ? "text-blue-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Purchase Orders
                </Link>
                <Link
                  to="/store-requests"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/store-requests") ? "text-blue-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Store Requests
                </Link>
                <Link
                  to="/packing-lists"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/packing-lists") ? "text-blue-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Packing Lists
                </Link>
                <Link
                  to="/goods-receiving"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/goods-receiving") ? "text-blue-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Goods Receiving
                </Link>
                <Link
                  to="/damage-defects"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/damage-defects") ? "text-blue-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Damage & Defects
                </Link>
                <Link
                  to="/daily-operations"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/daily-operations") ? "text-blue-600 font-bold" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Daily Work & EOD
                </Link>
              </div>
            </div>
          )}

          {/* ── CONTAINERS MODULE ── */}
          {hasModule("LOGISTICS") && hasPermission("View_Container") && (
            <div>
              <button
                type="button"
                onClick={() => setIsContainerOpen(!isContainerOpen)}
                className={`flex items-center gap-3 px-3 py-2 rounded transition w-full text-left bg-transparent border-0 cursor-pointer ${theme.hover} ${
                  isContainerActive ? "bg-blue-600/10 text-blue-600" : ""
                }`}
              >
                <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                  <Container size={18} />
                </div>
                <span className={textClass}>Containers</span>
                <ChevronDown
                  size={16}
                  className={`ml-auto transition-transform ${
                    isContainerOpen ? "rotate-180" : ""
                  } md:opacity-0 md:group-hover:opacity-100`}
                />
              </button>

              <div className={`${isContainerOpen ? "block" : "hidden"} ml-6 mt-1 space-y-1`}>
                <Link
                  to="/viewContainer"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/viewContainer") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Container Register
                </Link>
                {hasPermission("View_BL") && (
                  <Link
                    to="/BillOfLanding"
                    className={`block text-xs py-1 hover:text-blue-400 ${isActive("/BillOfLanding") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                    onClick={onLinkClick}
                  >
                    Bills of Lading
                  </Link>
                )}
                <Link
                  to="/Complete"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/Complete") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Completed Containers
                </Link>
              </div>
            </div>
          )}

          {/* ── INVENTORY & PRODUCT MASTER MODULE ── */}
          {hasModule("INVENTORY") && (
            <Link
              to="/inventory"
              className={`flex items-center gap-3 px-3 py-2 rounded transition cursor-pointer ${theme.hover} ${
                isActive("/inventory") || isActive("/inventory/products")
                  ? "bg-indigo-600/10 text-indigo-600 font-bold"
                  : ""
              }`}
              onClick={onLinkClick}
            >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <Boxes size={18} />
              </div>
              <span className={textClass}>Product Master</span>
            </Link>
          )}

          {/* Damage & Defects (formerly Report) — standalone rose-accented link */}
          {(hasModule("LOGISTICS") || hasModule("ORDERS")) && (hasPermission("View_Report") || hasPermission("Receive_Orders") || hasPermission("Manage_Orders") || hasPermission("Add_Report") || isRoot) && (
            <Link
              to="/damage-defects"
              onClick={onLinkClick}
              aria-current={(isActive("/damage-defects") || isActive("/report") || isActive("/orders/issues")) ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                (isActive("/damage-defects") || isActive("/report") || isActive("/orders/issues"))
                  ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-200 font-semibold"
                  : `hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 ${theme.hover}`
              }`}
            >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <AlertTriangle size={18} className={(isActive("/damage-defects") || isActive("/report") || isActive("/orders/issues")) ? "text-rose-600" : "text-rose-400"} />
              </div>
              <span className={textClass}>Damage & Defects</span>
            </Link>
          )}

          {/* Tenant Console */}
          <Link
            to="/admin"
            onClick={onLinkClick}
            aria-current={isActive("/admin") ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded transition ${theme.hover} ${isActive("/admin") ? "bg-amber-500/10 text-amber-500 font-bold" : ""}`}
          >
            <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
              <Shield size={18} className="text-amber-500" />
            </div>
            <span className={`${textClass} text-amber-500 dark:text-amber-300 font-bold`}>Tenant Console</span>
          </Link>

          {/* Settings */}
          {hasPermission("View_Setting") && (
            <div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-3 px-3 py-2 rounded transition w-full text-left bg-transparent border-0 cursor-pointer ${theme.hover} ${
                  (isActive("/settings-overview") || isActive("/settings") || isActive("/organization-settings") || isActive("/order-settings") || isActive("/logistics") || isActive("/reference-data")) ? "bg-blue-600/10 text-blue-600" : ""
                }`}
              >
                <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                  <SettingsIcon size={18} />
                </div>
                <span className={textClass}>Settings</span>
                <ChevronDown
                  size={16}
                  className={`ml-auto transition-transform ${
                    isSettingsOpen ? "rotate-180" : ""
                  } md:opacity-0 md:group-hover:opacity-100`}
                />
              </button>

              <div className={`${isSettingsOpen ? "block" : "hidden"} ml-6 mt-1 space-y-1`}>
                <Link
                  to="/settings-overview"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/settings-overview") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Settings Overview
                </Link>
                <Link
                  to="/organization-settings"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/organization-settings") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Organization & Companies
                </Link>
                <Link
                  to="/settings"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/settings") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Users & Access
                </Link>
                {hasModule("ORDERS") && (
                  <Link
                    to="/order-settings"
                    className={`block text-xs py-1 hover:text-blue-400 ${isActive("/order-settings") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                    onClick={onLinkClick}
                  >
                    Orders & Procurement
                  </Link>
                )}
                {hasModule("LOGISTICS") && (
                  <Link
                    to="/logistics"
                    className={`block text-xs py-1 hover:text-blue-400 ${isActive("/logistics") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                    onClick={onLinkClick}
                  >
                    Logistics & Demurrage
                  </Link>
                )}
                <Link
                  to="/reference-data"
                  className={`block text-xs py-1 hover:text-blue-400 ${isActive("/reference-data") ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
                  onClick={onLinkClick}
                >
                  Reference Data
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* User Info & Footer */}
      <div className={`p-4 border-t ${theme.border} space-y-3`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            {initial}
          </div>
          <div className="flex-1 min-w-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <p className="text-xs font-semibold truncate">{user || "User"}</p>
            <p className="text-[10px] text-gray-400 truncate">{isRoot ? "Group Admin" : "Tenant User"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-600 font-medium transition"
          >
            <LogOut size={16} />
            <span className={textClass}>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
