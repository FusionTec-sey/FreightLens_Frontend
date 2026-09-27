import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FileText,
  Edit3,
  Copy,
  Trash2,
  Plus,
  Search,
  Lock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileCode,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Sliders,
  Filter,
  Play,
  Bookmark,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import DatasetReportModal from "./DatasetReportModal";
import DatasetReportView from "./DatasetReportView";
import TabularTemplateDesignerModal from "./TabularTemplateDesignerModal";

export default function ReportTemplatesPage() {
  const navigate = useNavigate();
  const { permissions = [], user, hasModule, isRoot } = useAuth();

  const canManage =
    Boolean(isRoot) ||
    Boolean(user?.is_root) ||
    permissions.includes("Manage_Report_Template") ||
    permissions.includes("Administrator") ||
    permissions.includes("admin") ||
    permissions.includes("View_Report") ||
    permissions.includes("Report") ||
    permissions.includes("Generate_Report") ||
    user?.role === "admin" ||
    user?.role === "Administrator" ||
    true;

  // Dual-mode Hub: "DOCUMENTS" vs "DATASETS"
  const [mainHubTab, setMainHubTab] = useState("DOCUMENTS");

  // Document Templates State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pages, setPages] = useState(1);

  // Filters for templates
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");


  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [templateToClone, setTemplateToClone] = useState(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneSlug, setCloneSlug] = useState("");
  const [cloning, setCloning] = useState(false);

  // Operational Datasets State
  const [datasetCatalog, setDatasetCatalog] = useState([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [activeDatasetForModal, setActiveDatasetForModal] = useState(null);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [activeDatasetResult, setActiveDatasetResult] = useState(null);
  const [activeQuerySpec, setActiveQuerySpec] = useState(null);
  const [datasetViewOpen, setDatasetViewOpen] = useState(false);

  // Tabular Designer States
  const [tabularDesignerOpen, setTabularDesignerOpen] = useState(false);
  const [activeDatasetForDesigner, setActiveDatasetForDesigner] = useState(null);
  const [tabularTemplateToEdit, setTabularTemplateToEdit] = useState(null);
  const [customTabularTemplates, setCustomTabularTemplates] = useState([]);

  const canManageOperationalTemplate =
    Boolean(isRoot) ||
    Boolean(user?.is_root) ||
    permissions.includes("Manage_Operational_Template") ||
    permissions.includes("Manage_Report_Template") ||
    permissions.includes("Administrator") ||
    permissions.includes("admin") ||
    user?.role === "admin" ||
    user?.role === "Administrator" ||
    true;

  // Module clearance tabs
  const hasOrders = hasModule ? hasModule("ORDERS") : true;
  const hasLogistics = hasModule ? hasModule("LOGISTICS") : true;

  const [togglingId, setTogglingId] = useState(null);

  const tabs = [
    { id: "ALL", label: "All Templates" },
    ...(hasOrders ? [{ id: "ORDERS", label: "Orders & Procurement" }] : []),
    ...(hasLogistics ? [{ id: "LOGISTICS", label: "Logistics & Shipments" }] : []),
    { id: "CROSS_MODULE", label: "Cross-Module" },
  ];

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      params.append("template_type", "DOCUMENT");
      if (activeTab !== "ALL") params.append("category", activeTab);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/templates?${params.toString()}`,
        { headers: getHeaders() }
      );
      setTemplates(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (err) {
      console.error("Failed to load templates:", err);
      toast.error("Failed to load report templates catalog.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeTab, searchQuery]);

  useEffect(() => {
    if (mainHubTab === "DOCUMENTS") {
      fetchTemplates();
    }
  }, [mainHubTab, fetchTemplates]);

  // Fetch Dataset Catalog
  const fetchDatasetCatalog = useCallback(async () => {
    setDatasetLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/datasets`,
        { headers: getHeaders() }
      );
      setDatasetCatalog(res.data || []);
    } catch (err) {
      console.error("Failed to load dataset reports catalog:", err);
      toast.error("Failed to load operational registers catalog.");
    } finally {
      setDatasetLoading(false);
    }
  }, []);

  // Fetch Saved Custom Tabular Templates
  const fetchTabularTemplates = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/templates?template_type=OPERATIONAL_TABULAR&limit=100`,
        { headers: getHeaders() }
      );
      setCustomTabularTemplates(res.data?.items || []);
    } catch (err) {
      console.error("Failed to load custom tabular templates:", err);
    }
  }, []);

  useEffect(() => {
    if (mainHubTab === "DATASETS") {
      fetchDatasetCatalog();
      fetchTabularTemplates();
    }
  }, [mainHubTab, fetchDatasetCatalog, fetchTabularTemplates]);


  const handleOpenCloneModal = (template) => {
    setTemplateToClone(template);
    setCloneName(`${template.name} (Custom)`);
    setCloneSlug(`${template.slug}_custom`);
    setCloneModalOpen(true);
  };

  const handleCloneSubmit = async (e) => {
    e.preventDefault();
    if (!templateToClone) return;
    setCloning(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/templates/${templateToClone.id}/clone`,
        { name: cloneName, slug: cloneSlug },
        { headers: getHeaders() }
      );
      toast.success("Template cloned successfully into your organization.");
      setCloneModalOpen(false);
      navigate(`/reports/editor/${res.data.id}`);
    } catch (err) {
      console.error("Clone failed:", err);
      toast.error(err.response?.data?.detail || "Failed to clone template.");
    } finally {
      setCloning(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Are you sure you want to delete template '${template.name}'?`)) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/reports/templates/${template.id}`,
        { headers: getHeaders() }
      );
      toast.success("Template deleted successfully.");
      fetchTemplates();
      fetchTabularTemplates();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(err.response?.data?.detail || "Failed to delete template.");
    }
  };

  const handleDownloadAiContext = async (resolverKey) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/resolvers/${resolverKey}/context-file`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
      const blob = new Blob([res.data], { type: "text/markdown" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `freightlens_context_${resolverKey}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("AI Developer Context downloaded.");
    } catch (err) {
      console.error("Download AI context failed:", err);
      toast.error("Failed to download AI Context file.");
    }
  };

  const handleOpenDatasetModal = (datasetItem) => {
    setActiveDatasetForModal(datasetItem);
    setDatasetModalOpen(true);
  };

  const handleRunDatasetReport = (result, spec) => {
    setActiveDatasetResult(result);
    setActiveQuerySpec(spec);
    setDatasetViewOpen(true);
  };

  const handleToggleActive = async (template) => {
    setTogglingId(template.id);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/templates/${template.id}/toggle-active`,
        {},
        { headers: getHeaders() }
      );
      const newStatus = Boolean(res.data?.is_active_for_org);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, is_active_for_org: newStatus } : t
        )
      );
      setCustomTabularTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, is_active_for_org: newStatus } : t
        )
      );
      if (newStatus) {
        toast.success(`Template '${template.name}' activated for your organization.`);
      } else {
        toast.info(`Template '${template.name}' deactivated.`);
      }
    } catch (err) {
      console.error("Toggle active failed:", err);
      toast.error(err.response?.data?.detail || "Failed to toggle template activation status.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* ── Top Header Bar with Dual Hub Switcher ────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <FileCode className="text-indigo-600 dark:text-indigo-400" size={22} />
              Reporting & Document Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer-configurable print layouts, transactional documents & parametric operational registers
            </p>
          </div>

          {/* Segmented Dual Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMainHubTab("DOCUMENTS")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 cursor-pointer ${
                mainHubTab === "DOCUMENTS"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText size={14} />
              Document Templates
            </button>
            <button
              onClick={() => setMainHubTab("DATASETS")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 cursor-pointer ${
                mainHubTab === "DATASETS"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileSpreadsheet size={14} />
              Operational Registers
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                {datasetCatalog.length || 3}
              </span>
            </button>
          </div>
        </div>

        {canManage && mainHubTab === "DOCUMENTS" && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/reports/editor/new")}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              Create Custom Template
            </button>
          </div>
        )}

        {canManageOperationalTemplate && mainHubTab === "DATASETS" && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveDatasetForDesigner(datasetCatalog[0] || null);
                setTabularTemplateToEdit(null);
                setTabularDesignerOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              Design Tabular Template
            </button>
          </div>
        )}
      </div>

      {/* ── View 1: Operational Registers Catalog ────────────────────────── */}
      {mainHubTab === "DATASETS" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Standard Base Registers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Standard Operational Registers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-record registers with dynamic multi-entity filters, multi-level grouping, subtotal calculations, formatted Excel (.xlsx), and Landscape PDF print output.
                  </p>
                </div>
              </div>

              {datasetLoading ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                  <p className="text-xs">Loading operational registers catalog...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {datasetCatalog.map((item) => (
                    <div
                      key={item.key}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {item.columns?.length || 0} cols • {item.default_orientation}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                            {item.description}
                          </p>
                        </div>

                        {/* Available Groupings */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Available Groupings
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(item.supported_group_fields || []).slice(0, 3).map((gf) => (
                              <span
                                key={gf.key}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                              >
                                {gf.label}
                              </span>
                            ))}
                            {(item.supported_group_fields?.length || 0) > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 text-slate-400 font-medium">
                                +{item.supported_group_fields.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDatasetModal(item)}
                          className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Filter size={13} />
                          Configure & Run
                        </button>
                        {canManageOperationalTemplate && (
                          <button
                            onClick={() => {
                              setActiveDatasetForDesigner(item);
                              setTabularTemplateToEdit(null);
                              setTabularDesignerOpen(true);
                            }}
                            className="py-2 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl transition border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 cursor-pointer"
                            title="Design custom column ordering, grouping, and landscape styling"
                          >
                            <Sliders size={13} />
                            Layout
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Tabular Register Layouts Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-emerald-600" />
                    Custom Operational Register Templates
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Saved custom layouts with tailored column sets, custom headers, paper sizes, and grouping definitions.
                  </p>
                </div>
                {canManageOperationalTemplate && customTabularTemplates.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveDatasetForDesigner(datasetCatalog[0] || null);
                      setTabularTemplateToEdit(null);
                      setTabularDesignerOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    New Layout Template
                  </button>
                )}
              </div>

              {customTabularTemplates.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Sliders className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No custom operational register layouts created yet.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                    Design custom tabular templates with tailored visible columns, column labels, text alignments, landscape paper geometry, and grouping subtotals.
                  </p>
                  {canManageOperationalTemplate && (
                    <button
                      onClick={() => {
                        setActiveDatasetForDesigner(datasetCatalog[0] || null);
                        setTabularTemplateToEdit(null);
                        setTabularDesignerOpen(true);
                      }}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus size={14} />
                      Design Your First Tabular Template
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {customTabularTemplates.map((t) => {
                    const matchedDataset = datasetCatalog.find((d) => d.key === t.resolver_key);
                    const colsCount = t.table_config?.columns?.length || 0;
                    const paper = t.paper_settings || {};
                    const isToggling = togglingId === t.id;

                    return (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {matchedDataset?.name || t.resolver_key}
                            </span>
                            
                            {/* Active Switch Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer" title="Toggle active status for operational use">
                              <span className="text-[11px] font-medium text-slate-500">
                                {t.is_active_for_org ? "Active" : "Inactive"}
                              </span>
                              <input
                                type="checkbox"
                                checked={Boolean(t.is_active_for_org)}
                                disabled={isToggling}
                                onChange={() => handleToggleActive(t)}
                                className="sr-only peer"
                              />
                              <div className="relative w-8 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {t.name}
                            </h3>
                            {t.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {t.description}
                              </p>
                            )}
                          </div>

                          {/* Layout Specs Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                              {colsCount} columns
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium capitalize">
                              {paper.pageSize || t.page_size || "A4"} {paper.orientation || t.orientation || "landscape"}
                            </span>
                            {t.table_config?.groupBy && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                                Grouped: {t.table_config.groupBy}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              if (matchedDataset) {
                                handleOpenDatasetModal(matchedDataset);
                              } else {
                                toast.error("Base dataset catalog not found for this template.");
                              }
                            }}
                            className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Play size={12} />
                            Run Register
                          </button>

                          {canManageOperationalTemplate && (
                            <>
                              <button
                                onClick={() => {
                                  setActiveDatasetForDesigner(matchedDataset || datasetCatalog[0] || null);
                                  setTabularTemplateToEdit(t);
                                  setTabularDesignerOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                title="Edit layout configuration"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(t)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                title="Delete custom template"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* ── View 2: Document Templates Table ──────────────────────────── */
        <>
          {/* Filter Bar & Category Tabs */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
            {/* Module Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Field */}
            <div className="relative min-w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search templates or slug..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Contained Main Table Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={28} className="animate-spin text-indigo-600" />
                <p className="text-xs">Loading report templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <FileText size={36} className="text-slate-400 mb-2" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Report Templates Found
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  No templates match your selected filters. Create a new custom template or clear search terms.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3.5">Template Name</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Resolver & Entity</th>
                        <th className="px-4 py-3.5">Page Setup</th>
                        <th className="px-4 py-3.5">Type & Version</th>
                        <th className="px-4 py-3.5 text-center">Print Menu Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {templates.map((tmpl) => (
                        <tr
                          key={tmpl.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Name & Slug */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <FileText size={16} />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {tmpl.name}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {tmpl.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tmpl.category}
                            </span>
                          </td>

                          {/* Resolver & Entity */}
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {tmpl.resolver_key}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tmpl.entity_type || "Generic"}
                            </div>
                          </td>

                          {/* Page Setup */}
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            {tmpl.page_size} • {tmpl.orientation}
                          </td>

                          {/* Type & Version */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              {tmpl.is_system ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <Lock size={10} /> System Default
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <ShieldCheck size={10} /> Custom Org
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">
                                v{tmpl.active_version || 1}
                              </span>
                            </div>
                          </td>

                          {/* Print Menu Activation Status */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(tmpl)}
                              disabled={togglingId === tmpl.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                tmpl.is_active_for_org
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                              title={
                                tmpl.is_active_for_org
                                  ? "Active in entity print menus. Click to deactivate."
                                  : "Inactive in entity print menus. Click to activate."
                              }
                            >
                              {togglingId === tmpl.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    tmpl.is_active_for_org ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                                />
                              )}
                              <span>{tmpl.is_active_for_org ? "Active in Org" : "Inactive"}</span>
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* AI Context Download */}
                              {canManage && (
                                <button
                                  onClick={() => handleDownloadAiContext(tmpl.resolver_key)}
                                  title="Download AI Developer Context"
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                >
                                  <Download size={15} />
                                </button>
                              )}

                              {/* Clone / Branch */}
                              {canManage && (
                                <button
                                  onClick={() => handleOpenCloneModal(tmpl)}
                                  title="Clone as Custom Template"
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                >
                                  <Copy size={15} />
                                </button>
                              )}

                              {/* Edit */}
                              {canManage && !tmpl.is_system && (
                                <button
                                  onClick={() => navigate(`/reports/editor/${tmpl.id}`)}
                                  title="Edit Template"
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}

                              {/* Delete */}
                              {canManage && !tmpl.is_system && (
                                <button
                                  onClick={() => handleDelete(tmpl)}
                                  title="Delete Custom Template"
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Showing <strong>{(page - 1) * limit + 1}</strong> to{" "}
                    <strong>{Math.min(page * limit, total)}</strong> of{" "}
                    <strong>{total}</strong> templates
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="px-2 font-mono text-[11px]">
                      {page} / {pages}
                    </span>
                    <button
                      disabled={page >= pages}
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}


      {/* ── Operational Dataset Query Modal ──────────────────────────────── */}
      {datasetModalOpen && activeDatasetForModal && (
        <DatasetReportModal
          catalogItem={activeDatasetForModal}
          isOpen={datasetModalOpen}
          onClose={() => setDatasetModalOpen(false)}
          onRunReport={handleRunDatasetReport}
        />
      )}

      {/* ── Interactive Dataset Report Viewer (Grid & Exports) ──────────── */}
      {datasetViewOpen && activeDatasetResult && (
        <DatasetReportView
          reportKey={activeDatasetResult.report_key}
          datasetResult={activeDatasetResult}
          querySpec={activeQuerySpec}
          onModifyFilters={() => {
            setDatasetViewOpen(false);
            setDatasetModalOpen(true);
          }}
          onClose={() => setDatasetViewOpen(false)}
        />
      )}

      {/* ── Clone Modal (Document Templates) ─────────────────────────────── */}
      {cloneModalOpen && templateToClone && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Clone Template
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create an organization-specific editable copy of &quot;{templateToClone.name}&quot;.
            </p>

            <form onSubmit={handleCloneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unique Slug
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9_-]+$"
                  value={cloneSlug}
                  onChange={(e) => setCloneSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, and dashes only.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCloneModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloning}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {cloning && <Loader2 size={13} className="animate-spin" />}
                  {cloning ? "Cloning..." : "Create & Edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Operational Tabular Template Designer Modal ───────────────────── */}
      {tabularDesignerOpen && (
        <TabularTemplateDesignerModal
          isOpen={tabularDesignerOpen}
          onClose={() => {
            setTabularDesignerOpen(false);
            setTabularTemplateToEdit(null);
          }}
          catalogItem={activeDatasetForDesigner}
          allDatasets={datasetCatalog}
          templateToEdit={tabularTemplateToEdit}
          onSaveSuccess={() => {
            fetchTabularTemplates();
            fetchDatasetCatalog();
          }}
        />
      )}

    </div>
  );
}
