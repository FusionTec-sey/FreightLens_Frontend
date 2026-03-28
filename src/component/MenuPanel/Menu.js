import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Container,
  ChevronDown,
  LogOut,
  SettingsIcon,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/Images/Freightliner.png";

function Sidebar({ onLinkClick }) {
  const [isContainerOpen, setIsContainerOpen] = useState(false);
  const { permissions, user, logout } = useAuth();
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

  return (
    <div
      className={`flex flex-col h-full ${theme.background} group md:w-16 md:hover:w-64 w-64 transition-all duration-300 overflow-hidden border-r-2 ${theme.border}`}
      onMouseLeave={() => setIsContainerOpen(false)}
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
      <div className="flex-1 flex flex-col justify-start p-4 space-y-2">
        <nav className="flex flex-col gap-2">
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

          {/* Containers */}
          {hasPermission("View_Container") && (
            <div>
              <Link
                to="/viewContainer"
                onClick={() => setIsContainerOpen(!isContainerOpen)}
                className={`flex items-center gap-3 px-3 py-2 rounded transition ${theme.hover} ${isActive("/viewContainer") ? "bg-blue-600/10 text-blue-600" : ""}`}
              >
                <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                  <Container size={18} />
                </div>
                <span className={textClass}>View Container</span>
                {hasPermission("View_BL") && (
                  <ChevronDown
                    size={16}
                    className={`ml-auto transition-transform ${
                      isContainerOpen ? "rotate-180" : ""
                    } md:opacity-0 md:group-hover:opacity-100`}
                  />
                )}
              </Link>

              <div
                className={`${
                  isContainerOpen ? "block" : "hidden"
                } ml-6 mt-1 space-y-1`}
              >
                {hasPermission("View_BL") && (
                  <Link
                    to="/BillOfLanding"
                    className={`block text-sm hover:text-blue-400 ${isActive("/BillOfLanding") ? "text-blue-600 font-medium" : ""}`}
                    onClick={onLinkClick}
                  >
                    Bill Of Landing
                  </Link>
                )}
                {hasPermission("View_Container") && (
                  <Link
                    to="/Complete"
                    className={`block text-sm hover:text-blue-400 ${isActive("/Complete") ? "text-blue-600 font-medium" : ""}`}
                    onClick={onLinkClick}
                  >
                    Complete
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Report */}
          {hasPermission("View_Report") && (
            <Link
              to="/report"
              onClick={onLinkClick}
              aria-current={isActive("/report") ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded transition ${theme.hover} ${isActive("/report") ? "bg-blue-600/10 text-blue-600" : ""}`}
            >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <FileText size={18} />
              </div>
              <span className={textClass}>Report</span>
            </Link>
          )}

          {/* Demurrage */}
          {/* {hasPermission("View_Report") && (
            <Link
              to="/demurrage"
              onClick={onLinkClick}
              aria-current={isActive("/demurrage") ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded transition ${theme.hover} ${isActive("/demurrage") ? "bg-blue-600/10 text-blue-600" : ""}`}
            >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <FileText size={18} />
              </div>
              <span className={textClass}>Demurrage</span>
            </Link>
          )} */}

          {/* Settings */}
          {hasPermission("View_Setting") && (
            <Link
              to="/settings"
              onClick={onLinkClick}
              aria-current={isActive("/settings") ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded transition ${theme.hover} ${isActive("/settings") ? "bg-blue-600/10 text-blue-600" : ""}`}
            >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <SettingsIcon size={18} />
              </div>
              <span className={textClass}>Settings</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className={`border-t ${theme.border}`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
            {initial}
          </div>
          <div className={`${textClass} flex flex-col`}>
            <p className="text-sm font-medium">{user || "User"}</p>
            <p className={`text-xs ${theme.profileText}`}>Logged in</p>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 px-4 py-2 w-full rounded transition ${theme.hover}`}
        >
          <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </div>
          <span className={textClass}>
            {isDark ? "Dark Mode" : "Light Mode"}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-2 w-full rounded transition ${theme.hover} text-red-400 hover:text-red-500`}
        >
          <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
            <LogOut size={18} />
          </div>
          <span className={textClass}>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
