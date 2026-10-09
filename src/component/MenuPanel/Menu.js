import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Loader2,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  TriangleAlert,
  Unlock,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppMenu } from "../../hooks/useAppMenu";
import { resolveMenuIcon } from "../../utils/menuIcons";
import logo from "../../assets/Images/Freightliner.png";

/**
 * The sidebar renders the tree served by `GET /navigation/my-menu`, which the
 * Menu Designer arranges and the backend filters per user. Nothing about which
 * items appear is decided here: PrivateRoute still guards every route and the
 * API checks permissions on every request, so a stale or wrong menu cannot grant
 * access to anything.
 *
 * Item types map onto the visual hierarchy:
 *   separator -> section heading     folder -> accordion
 *   page      -> nav link            page inside a folder -> sub link
 *
 * Headings are items an admin placed, not an accident of nesting, so the sidebar
 * shows exactly the structure the designer shows.
 */

/** Stable key for a node, whether it came from the database or the default menu. */
const nodeKey = (node, path) => `${path}/${node.id ?? node.page_key ?? node.label}`;

/** Every route reachable inside a node, the node's own route included. */
const routesWithin = (node) => {
  const routes = node.route ? [node.route] : [];
  (node.children || []).forEach((child) => routes.push(...routesWithin(child)));
  return routes;
};

function Sidebar({ onLinkClick }) {
  const { user, logout, isRoot } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { menu, loading, error, reload } = useAppMenu();
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

  const [openAccordion, setOpenAccordion] = useState(null);

  const initial = user ? user.charAt(0).toUpperCase() : "U";

  const handleLogout = () => {
    logout();
    if (onLinkClick) onLinkClick();
    setTimeout(() => navigate("/"), 0);
  };

  const isActive = useCallback(
    (path) =>
      Boolean(path) &&
      (location.pathname === path || location.pathname.startsWith(`${path}/`)),
    [location.pathname]
  );

  /** The accordion key holding the current route, so it can open itself. */
  const activeAccordionKey = useMemo(() => {
    for (const root of menu) {
      const level2 = root.route || !root.children?.length ? [root] : root.children;
      const parentPath = root.route || !root.children?.length ? "" : nodeKey(root, "");
      for (const node of level2) {
        if (!node.children?.length) continue;
        if (routesWithin(node).some((route) => isActive(route))) {
          return nodeKey(node, parentPath);
        }
      }
    }
    return null;
  }, [menu, isActive]);

  const toggleLock = () => {
    setIsLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_locked", next.toString());
      } catch (e) {}
      // Collapsed sidebars show no labels, so an open accordion would be noise.
      setOpenAccordion(next ? activeAccordionKey : null);
      return next;
    });
  };

  const toggleAccordion = (sectionKey) => {
    setOpenAccordion((prev) => (prev === sectionKey ? null : sectionKey));
  };

  // Keep the section containing the current route expanded while locked.
  useEffect(() => {
    if (isLocked && activeAccordionKey) setOpenAccordion(activeAccordionKey);
  }, [isLocked, activeAccordionKey]);

  // ── Render Helpers ──────────────────────────────────────────────────────────
  // Height is exactly h-6 in both collapsed (divider) and expanded (header title) states
  // to prevent any vertical shift when the sidebar expands horizontally on hover.
  const renderSectionHeader = (title, key) => (
    <div
      className="h-6 px-3 flex items-center justify-center my-0.5 overflow-hidden transition-all duration-200"
      key={`header-${key}`}
    >
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

  const renderNavLink = ({ to, icon, label, isCurrentActive, locked, permissionCodes, key }) => (
    <Link
      to={locked ? `/unauthorized?need=${(permissionCodes || []).join(",")}` : to}
      key={key}
      onClick={onLinkClick}
      title={
        locked
          ? `${label} — you do not have access. Ask your administrator.`
          : label
      }
      aria-current={isCurrentActive ? "page" : undefined}
      className={`relative flex items-center h-10 px-3 rounded-xl transition-all duration-150 group/item ${
        locked ? "opacity-55" : ""
      } ${
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
      {locked && (
        <Lock
          size={13}
          className={`ml-auto text-slate-400 ${
            isLocked
              ? "opacity-100"
              : "md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
          }`}
        />
      )}
    </Link>
  );

  const renderAccordion = ({ sectionKey, icon, label, isSectionActive, children }) => {
    const isOpen = openAccordion === sectionKey;

    return (
      <div className="space-y-0.5" key={sectionKey}>
        <button
          type="button"
          onClick={() => toggleAccordion(sectionKey)}
          title={label}
          aria-expanded={isOpen}
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

  const renderSubLink = ({ to, label, isCurrentActive, locked, permissionCodes, icon, key }) => {
    // Show the icon the designer chose. Items with none keep the dot, which is
    // what this level looked like before icons could be set.
    const SubIcon = icon ? resolveMenuIcon(icon) : null;
    return (
    <Link
      to={locked ? `/unauthorized?need=${(permissionCodes || []).join(",")}` : to}
      key={key}
      onClick={onLinkClick}
      aria-current={isCurrentActive ? "page" : undefined}
      title={locked ? `${label} — you do not have access.` : label}
      className={`flex items-center h-8 px-2.5 rounded-lg text-xs transition-colors duration-150 ${
        locked ? "opacity-55" : ""
      } ${
        isCurrentActive
          ? "bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 font-medium"
      }`}
    >
      {SubIcon ? (
        <SubIcon
          size={14}
          className={`mr-2 flex-shrink-0 ${
            isCurrentActive
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 dark:text-slate-500"
          }`}
        />
      ) : (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-2 transition-all ${
            isCurrentActive
              ? "bg-indigo-600 dark:bg-indigo-400 scale-125"
              : "bg-slate-300 dark:bg-slate-600"
          }`}
        />
      )}
      <span className="truncate">{label}</span>
      {locked && <Lock size={11} className="ml-auto flex-shrink-0" />}
      </Link>
    );
  };

  // ── Menu tree -> sidebar ────────────────────────────────────────────────────

  const renderLeaf = (node, path, asSubLink) => {
    const key = nodeKey(node, path);
    const common = {
      key,
      to: node.route,
      label: node.label,
      isCurrentActive: isActive(node.route),
      locked: Boolean(node.locked),
      permissionCodes: node.permission_codes,
      icon: node.icon,
    };
    return asSubLink
      ? renderSubLink(common)
      : renderNavLink({ ...common, icon: React.createElement(resolveMenuIcon(node.icon)) });
  };

  const renderBranch = (node, path) => {
    const key = nodeKey(node, path);
    const children = node.children || [];

    // A folder, or a page an admin nested other items under: render the group and
    // keep the page itself reachable as its own first entry.
    return renderAccordion({
      sectionKey: key,
      icon: React.createElement(resolveMenuIcon(node.icon)),
      label: node.label,
      isSectionActive: routesWithin(node).some((route) => isActive(route)),
      children: [
        ...(node.route ? [renderLeaf({ ...node, children: [] }, `${key}/self`, true)] : []),
        ...children.map((child) =>
          child.is_separator
            ? renderSectionHeader(child.label, nodeKey(child, key))
            : child.children?.length
            ? renderBranch(child, key)
            : renderLeaf(child, key, true)
        ),
      ],
    });
  };

  const renderedMenu = menu.flatMap((root) => {
    const key = nodeKey(root, "");
    const children = root.children || [];

    if (root.is_separator) return [renderSectionHeader(root.label, key)];
    if (children.length > 0) return [renderBranch(root, "")];
    return [renderLeaf(root, "", false)];
  });

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
          {loading && menu.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-indigo-500" />
            </div>
          )}

          {!loading && error && (
            <div
              className={`px-2 py-3 text-center ${
                isLocked ? "block" : "hidden md:group-hover:block"
              }`}
            >
              <TriangleAlert size={18} className="mx-auto mb-2 text-amber-500" />
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                The menu could not be loaded.
              </p>
              <button
                type="button"
                onClick={reload}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && menu.length === 0 && (
            <p
              className={`px-3 py-6 text-center text-[11px] leading-snug text-slate-400 ${
                isLocked ? "block" : "hidden md:group-hover:block"
              }`}
            >
              No menu items are available for your account.
            </p>
          )}

          {renderedMenu}
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
