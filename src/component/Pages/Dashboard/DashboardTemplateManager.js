import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Layers,
  LayoutDashboard,
  Plus,
  Shield,
  Star,
  Trash2,
  Edit3,
  Copy,
  Search,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  X,
  Sliders,
  Check,
  Columns,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import WidgetCatalogModal from "./components/WidgetCatalogModal";

const AVAILABLE_ROLES = [
  "Administrator",
  "Super_Admin",
  "Noblecon_Admin",
  "Procurement_Specialist",
  "Finance_Controller",
  "Accounts_Finance",
  "Warehouse_Supervisor",
  "Warehouse_Operator",
  "Freight_Forwarder",
  "Director",
  "General_Manager",
  "Inventory_Manager",
  "Logistics_Operator",
  "Procurement_Officer",
  "Operations_Manager",
  "Auditor_ReadOnly",
  "Store_User",
  "Standard_User",
];

export default function DashboardTemplateManager() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { permissions, isRoot, orgName } = useAuth();

  // ── Permissions ─────────────────────────────────────────────────────────────
  const canManage = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Manage_DashboardTemplate");
  }, [isRoot, permissions]);

  // ── State ───────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [catalogWidgets, setCatalogWidgets] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL | CUSTOM | PRESET

  // Builder / Editor Modal State
  const [editingTemplate, setEditingTemplate] = useState(null); // null if closed, or template object
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [targetRole, setTargetRole] = useState("Administrator");
  const [templateDesc, setTemplateDesc] = useState("");
  const [isDefaultRole, setIsDefaultRole] = useState(false);
  const [builderWidgets, setBuilderWidgets] = useState([]); // [{ id, col_span, visible }]
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Auth Header Helper ──────────────────────────────────────────────────────
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // ── Fetch Templates & Catalog ───────────────────────────────────────────────
  const fetchTemplatesAndCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [tplRes, catRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/dashboard/templates`, { headers }),
        axios.get(`${process.env.REACT_APP_NETWORK}/dashboard/widgets`, { headers }),
      ]);
      setTemplates(tplRes.data?.templates || []);
      setCatalogWidgets(catRes.data?.widgets || []);
    } catch (err) {
      console.error("Failed to load dashboard templates:", err);
      toast.error("Failed to load dashboard templates.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTemplatesAndCatalog();
  }, [fetchTemplatesAndCatalog]);

  // ── Open Create New Modal ───────────────────────────────────────────────────
  const handleOpenCreateNew = () => {
    setIsCreatingNew(true);
    setEditingTemplate(null);
    setTemplateName("");
    setTargetRole("Inventory_Manager");
    setTemplateDesc("");
    setIsDefaultRole(false);
    // Pre-populate with first 4 catalog widgets as starter
    setBuilderWidgets(
      (catalogWidgets.slice(0, 4) || []).map((w) => ({
        id: w.id,
        col_span: w.default_col_span || 1,
        visible: true,
      }))
    );
  };

  // ── Open Edit Template Modal ────────────────────────────────────────────────
  const handleOpenEdit = (tpl) => {
    setIsCreatingNew(false);
    setEditingTemplate(tpl);
    setTemplateName(tpl.name || "");
    setTargetRole(tpl.role_name || "Administrator");
    setTemplateDesc(tpl.description || "");
    setIsDefaultRole(Boolean(tpl.is_default));
    setBuilderWidgets(
      Array.isArray(tpl.widgets)
        ? tpl.widgets.map((w) => ({
            id: w.id,
            col_span: w.col_span || 1,
            visible: w.visible !== false,
          }))
        : []
    );
  };

  // ── Clone / Duplicate Template ──────────────────────────────────────────────
  const handleCloneTemplate = (tpl) => {
    setIsCreatingNew(true);
    setEditingTemplate(null);
    setTemplateName(`${tpl.name} (Custom Copy)`);
    setTargetRole(tpl.role_name || "Administrator");
    setTemplateDesc(tpl.description ? `${tpl.description} - Customized` : "");
    setIsDefaultRole(false);
    setBuilderWidgets(
      Array.isArray(tpl.widgets)
        ? tpl.widgets.map((w) => ({
            id: w.id,
            col_span: w.col_span || 1,
            visible: w.visible !== false,
          }))
        : []
    );
    toast.info(`Cloned '${tpl.name}'. Customize and save as a new template.`);
  };

  // ── Save or Update Template ─────────────────────────────────────────────────
  const handleSaveTemplate = async (e) => {
    if (e) e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (builderWidgets.length === 0) {
      toast.error("Please add at least one widget to the template.");
      return;
    }

    try {
      setIsSubmitting(true);
      const headers = getAuthHeaders();
      const payload = {
        name: templateName.trim(),
        role_name: targetRole,
        description: templateDesc.trim() || null,
        is_default: isDefaultRole,
        widgets: builderWidgets.map((w) => ({
          id: w.id,
          col_span: w.col_span || 1,
          visible: w.visible !== false,
        })),
      };

      if (!isCreatingNew && editingTemplate && !editingTemplate.is_preset) {
        // Update existing custom template
        await axios.put(
          `${process.env.REACT_APP_NETWORK}/dashboard/templates/${editingTemplate.id}`,
          payload,
          { headers }
        );
        toast.success(`Template '${templateName}' updated successfully!`);
      } else {
        // Create new template
        await axios.post(`${process.env.REACT_APP_NETWORK}/dashboard/templates`, payload, {
          headers,
        });
        toast.success(`New template '${templateName}' created successfully!`);
      }

      setEditingTemplate(null);
      setIsCreatingNew(false);
      fetchTemplatesAndCatalog();
    } catch (err) {
      console.error("Failed to save template:", err);
      toast.error(err.response?.data?.detail || "Failed to save dashboard template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Set as Default Template for Role ────────────────────────────────────────
  const handleSetDefault = async (tpl) => {
    if (tpl.is_preset) {
      toast.info("This is a system preset. Clone it to customize and set as default.");
      return;
    }
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/dashboard/templates/${tpl.id}/set-default`,
        {},
        { headers }
      );
      toast.success(`Template '${tpl.name}' is now default for role '${tpl.role_name}'.`);
      fetchTemplatesAndCatalog();
    } catch (err) {
      console.error("Failed to set default template:", err);
      toast.error(err.response?.data?.detail || "Failed to assign default template.");
    }
  };

  // ── Delete Template ─────────────────────────────────────────────────────────
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      setIsDeleting(true);
      const headers = getAuthHeaders();
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/dashboard/templates/${templateToDelete.id}`,
        { headers }
      );
      toast.success(`Template '${templateToDelete.name}' deleted successfully.`);
      setTemplateToDelete(null);
      fetchTemplatesAndCatalog();
    } catch (err) {
      console.error("Failed to delete template:", err);
      toast.error(err.response?.data?.detail || "Failed to delete template.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Widget Builder Operations ───────────────────────────────────────────────
  const moveWidget = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= builderWidgets.length) return;
    const newWidgets = [...builderWidgets];
    const [moved] = newWidgets.splice(index, 1);
    newWidgets.splice(targetIndex, 0, moved);
    setBuilderWidgets(newWidgets);
  };

  const toggleColSpan = (index) => {
    const newWidgets = [...builderWidgets];
    newWidgets[index].col_span = newWidgets[index].col_span === 2 ? 1 : 2;
    setBuilderWidgets(newWidgets);
  };

  const removeWidgetFromBuilder = (id) => {
    setBuilderWidgets(builderWidgets.filter((w) => w.id !== id));
  };

  const addWidgetToBuilder = (widget) => {
    if (!builderWidgets.some((w) => w.id === widget.id)) {
      setBuilderWidgets([
        ...builderWidgets,
        {
          id: widget.id,
          col_span: widget.default_col_span || 1,
          visible: true,
        },
      ]);
    }
  };

  // ── Widget Details Lookup Helper ────────────────────────────────────────────
  const catalogMap = useMemo(() => {
    const map = {};
    (catalogWidgets || []).forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [catalogWidgets]);

  // ── Filtered Templates ──────────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch =
        !search.trim() ||
        tpl.name.toLowerCase().includes(search.toLowerCase()) ||
        (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase())) ||
        (tpl.role_name && tpl.role_name.toLowerCase().includes(search.toLowerCase()));

      const matchesRole = roleFilter === "ALL" || tpl.role_name === roleFilter;

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "PRESET" && tpl.is_preset) ||
        (typeFilter === "CUSTOM" && !tpl.is_preset);

      return matchesSearch && matchesRole && matchesType;
    });
  }, [templates, search, roleFilter, typeFilter]);

  // Count stats
  const totalPresets = templates.filter((t) => t.is_preset).length;
  const totalCustom = templates.filter((t) => !t.is_preset).length;

  if (!canManage) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <Shield size={48} className="mx-auto text-rose-500 opacity-80" />
        <h2 className="text-xl font-black">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          You need Administrator or <strong>Manage_DashboardTemplate</strong> privileges to manage role dashboard templates.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* ── Top Navigation & Header ───────────────────────────────────────────── */}
      <div
        className={`p-6 rounded-3xl border shadow-xs transition ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Link
                to="/dashboard"
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                title="Return to Dashboard"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
                <Sliders size={22} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Dashboard Template Manager & Studio
              </h1>
              {orgName && (
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {orgName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-11">
              Create, configure, and assign default dashboard metric layouts for operational roles across the company.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LayoutDashboard size={15} />
              <span>Live Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreateNew}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Template</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Templates</div>
            <div className="text-lg font-black mt-0.5">{templates.length}</div>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Custom Templates</div>
            <div className="text-lg font-black mt-0.5 text-indigo-600 dark:text-indigo-400">{totalCustom}</div>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">System Standards</div>
            <div className="text-lg font-black mt-0.5 text-purple-600 dark:text-purple-400">{totalPresets}</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Available Widgets</div>
            <div className="text-lg font-black mt-0.5 text-emerald-600 dark:text-emerald-400">{catalogWidgets.length}</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Bar ────────────────────────────────────────────── */}
      <div
        className={`p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates by name, description, or role..."
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            />
          </div>

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="ALL">All Roles ({templates.length})</option>
            {AVAILABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-stretch sm:self-auto">
          {["ALL", "CUSTOM", "PRESET"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === type
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {type === "ALL" ? "All" : type === "CUSTOM" ? "Custom" : "Presets"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Templates Cards Grid ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`h-56 rounded-3xl border animate-pulse ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <Layers size={40} className="mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="text-base font-bold">No Dashboard Templates Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No templates match your search criteria. Try modifying your filter or create a new template.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateNew}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} /> Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => {
              const widgetCount = Array.isArray(tpl.widgets) ? tpl.widgets.length : 0;
              return (
                <div
                  key={tpl.id}
                  className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          tpl.is_preset
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                        }`}
                      >
                        {tpl.is_preset ? "Standard Preset" : "Custom Template"}
                      </span>

                      {tpl.is_default && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Star size={10} className="fill-emerald-600 text-emerald-600 dark:text-emerald-300" />
                          <span>Role Default</span>
                        </span>
                      )}
                    </div>

                    {/* Template Name & Role */}
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1">
                        {tpl.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-semibold text-slate-400">Assigned Role:</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {tpl.role_name ? tpl.role_name.replace("_", " ") : "Global"}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                      {tpl.description || "Default layout prioritizing key operational indicators."}
                    </p>

                    {/* Widgets Preview */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-slate-400">Active Widgets</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{widgetCount} widgets</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                        {(tpl.widgets || []).slice(0, 5).map((w, idx) => {
                          const info = catalogMap[w.id];
                          return (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[120px]"
                            >
                              {info?.title || w.id}
                            </span>
                          );
                        })}
                        {widgetCount > 5 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-slate-400">
                            +{widgetCount - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Set as Default button */}
                      {!tpl.is_default && !tpl.is_preset && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(tpl)}
                          title="Set as Default for this Role"
                          className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                        >
                          <Star size={15} />
                        </button>
                      )}

                      {/* Clone / Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleCloneTemplate(tpl)}
                        title="Clone into Custom Template"
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Copy size={15} />
                      </button>

                      {/* Delete (custom only) */}
                      {!tpl.is_preset && (
                        <button
                          type="button"
                          onClick={() => setTemplateToDelete(tpl)}
                          title="Delete Template"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tpl)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300"
                    >
                      <Edit3 size={13} />
                      <span>{tpl.is_preset ? "Inspect / Clone" : "Edit Layout"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Visual Template Builder / Editor Modal ────────────────────────────── */}
      {(editingTemplate || isCreatingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {isCreatingNew
                      ? "Create Role Dashboard Template"
                      : editingTemplate?.is_preset
                      ? `Inspect Standard: ${editingTemplate.name}`
                      : `Edit Template: ${editingTemplate.name}`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Define widget ordering, column span, and target role default.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreatingNew(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Operations & Warehouse Hub"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Target Role *</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Describe the operational focus and intended persona of this template..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Set Default Toggle */}
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <input
                  type="checkbox"
                  checked={isDefaultRole}
                  onChange={(e) => setIsDefaultRole(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Star size={13} className="text-amber-500" />
                    <span>Set as Primary Default Template for {targetRole.replace("_", " ")}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    New users or users without custom layouts in this role will immediately receive this workspace.
                  </div>
                </div>
              </label>

              {/* ── Widget Organizer & Canvas ───────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Configured Widgets ({builderWidgets.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Reorder widgets or toggle column span (1 col = half width, 2 col = full width).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCatalogModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Widgets</span>
                  </button>
                </div>

                {builderWidgets.length === 0 ? (
                  <div
                    className={`p-8 text-center rounded-2xl border border-dashed ${
                      isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <p className="text-xs text-slate-400">No widgets in this template yet.</p>
                    <button
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Click here to browse catalog and add widgets
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {builderWidgets.map((w, index) => {
                      const info = catalogMap[w.id];
                      return (
                        <div
                          key={w.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                            isDark
                              ? "bg-slate-800/60 border-slate-700/80"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 text-center text-xs font-bold text-slate-400">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {info?.title || w.id}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                Module: <strong className="text-indigo-500">{info?.module || "SYSTEM"}</strong> | Type: {info?.type || "stat"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Width Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleColSpan(index)}
                              title={w.col_span === 2 ? "Full Width (2 Columns) - Click for Half Width" : "Half Width (1 Column) - Click for Full Width"}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                w.col_span === 2
                                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                              }`}
                            >
                              <Columns size={12} />
                              <span>{w.col_span === 2 ? "Full (2 Col)" : "Half (1 Col)"}</span>
                            </button>

                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveWidget(index, -1)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp size={15} />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={index === builderWidgets.length - 1}
                              onClick={() => moveWidget(index, 1)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown size={15} />
                            </button>

                            {/* Remove Widget */}
                            <button
                              type="button"
                              onClick={() => removeWidgetFromBuilder(w.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer transition"
                              title="Remove from Template"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Check size={15} />
                <span>{isSubmitting ? "Saving..." : isCreatingNew || editingTemplate?.is_preset ? "Publish Template" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Widget Catalog Selector Modal (Reused) ────────────────────────────── */}
      {showCatalogModal && (
        <WidgetCatalogModal
          availableWidgets={catalogWidgets}
          activeWidgetIds={builderWidgets.map((w) => w.id)}
          isDark={isDark}
          onClose={() => setShowCatalogModal(false)}
          onAddWidget={addWidgetToBuilder}
          onRemoveWidget={removeWidgetFromBuilder}
        />
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black">Delete Template?</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to delete '{templateToDelete.name}'?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Users currently using this template will fall back to the system default layout. This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
