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
  Star,
  Eye,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import DatasetReportModal from "./DatasetReportModal";
import DatasetReportView from "./DatasetReportView";
import TabularTemplateDesignerModal from "./TabularTemplateDesignerModal";
import TemplatePreviewModal from "./TemplatePreviewModal";
import OperationalRegistersPanel from "./OperationalRegistersPanel";

/**
 * Two screens, not one hub.
 *
 * Print document templates and operational registers are different jobs done by
 * different people: one is the layout a purchase order prints on, the other is a
 * parametric list someone runs and exports. They were behind a segmented toggle
 * inside one page, which made the second one invisible from the menu. Each is now
 * its own route and its own menu entry, and this component renders whichever it
 * was given.
 */
export default function ReportTemplatesPage({ view = "DOCUMENTS" }) {
  const navigate = useNavigate();
  const { permissions = [], user, hasModule, isRoot } = useAuth();

  const canManage =
    Boolean(isRoot) ||
    Boolean(user?.is_root) ||
    permissions.includes("Manage_Report_Template") ||
    permissions.includes("Administrator") ||
    permissions.includes("admin") ||
    user?.role === "admin" ||
    user?.role === "Administrator";

  // Which of the two screens this is. Kept as a variable rather than state:
  // the route decides it, so it cannot be switched from inside the page.
  const mainHubTab = view === "DATASETS" ? "DATASETS" : "DOCUMENTS";

  // Document Templates State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pages, setPages] = useState(1);

  // Filters for templates
  const [activeTab, setActiveTab] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const entityChips = [
    { id: "ALL", label: "All Entities" },
    { id: "PurchaseOrder", label: "Purchase Orders" },
    { id: "RFQ", label: "Sourcing / RFQ" },
    { id: "QuoteComparison", label: "Vendor Quotes" },
    { id: "BillOfLading", label: "Bill of Lading" },
    { id: "Container", label: "Containers" },
    { id: "Defect", label: "Defects" },
  ];

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
  const [datasetPresetLayoutId, setDatasetPresetLayoutId] = useState(null);

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
    user?.role === "Administrator";

  // Module clearance tabs
  const hasOrders = hasModule ? hasModule("ORDERS") : true;
  const hasLogistics = hasModule ? hasModule("LOGISTICS") : true;

  // What a template looks like. Open to anyone who can open this page: reading
  // a blank form rendered from sample data is not reading anybody's data.
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [togglingId, setTogglingId] = useState(null);
  const [defaultingId, setDefaultingId] = useState(null);

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
      if (entityFilter !== "ALL") params.append("entity_type", entityFilter);
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
  }, [page, limit, activeTab, entityFilter, searchQuery]);

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

  const handleOpenDatasetModal = (datasetItem, layout = null) => {
    setActiveDatasetForModal(datasetItem);
    // Running a register from one of its saved layouts opens the filter dialog
    // with that layout already chosen.
    setDatasetPresetLayoutId(layout?.id || null);
    setDatasetModalOpen(true);
  };

  const handleRunDatasetReport = (result, spec) => {
    setActiveDatasetResult(result);
    setActiveQuerySpec(spec);
    setDatasetViewOpen(true);
  };

  /**
   * Fetch one page of the open register. The viewer owns the pager; the query
   * itself stays here, because the spec that produced the current result lives
   * here and every page must be run with the same filters.
   */
  const handleFetchDatasetPage = async (page, limit) => {
    if (!activeDatasetResult || !activeQuerySpec) return;
    const spec = { ...activeQuerySpec, page, limit };
    const res = await axios.post(
      `${process.env.REACT_APP_NETWORK}/reports/datasets/${activeDatasetResult.report_key}/run`,
      spec,
      { headers: getHeaders() }
    );
    setActiveDatasetResult(res.data);
    setActiveQuerySpec(spec);
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

  const handleSetDefault = async (template) => {
    setDefaultingId(template.id);
    try {
      await axios.put(
        `${process.env.REACT_APP_NETWORK}/reports/templates/${template.id}/assignment`,
        { is_default: true },
        { headers: getHeaders() }
      );
      const applyDefault = (items) =>
        items.map((item) => ({
          ...item,
          is_default_for_org:
            item.entity_type === template.entity_type ? item.id === template.id : item.is_default_for_org,
          is_active_for_org: item.id === template.id ? true : item.is_active_for_org,
        }));
      setTemplates(applyDefault);
      setCustomTabularTemplates(applyDefault);
      toast.success(`'${template.name}' is now the default for ${template.entity_type}.`);
    } catch (err) {
      console.error("Set default failed:", err);
      toast.error(err.response?.data?.detail || "Failed to set the default template.");
    } finally {
      setDefaultingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* ── Top Header Bar with Dual Hub Switcher ────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              {mainHubTab === "DOCUMENTS" ? (
                <FileCode className="text-indigo-600 dark:text-indigo-400" size={22} />
              ) : (
                <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400" size={22} />
              )}
              {mainHubTab === "DOCUMENTS" ? "Print Document Templates" : "Operational Registers"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mainHubTab === "DOCUMENTS"
                ? "The layouts transactional documents print on. Preview any of them before using it."
                : "Parametric lists to run, filter and export, with optional saved column layouts."}
            </p>
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

      {/* ── View 1: Operational Registers ───────────────────────────────── */}
      {mainHubTab === "DATASETS" ? (
        <OperationalRegistersPanel
          datasets={datasetCatalog}
          customTemplates={customTabularTemplates}
          loading={datasetLoading}
          canManage={canManageOperationalTemplate}
          togglingId={togglingId}
          onRun={(registerKey, layout) => {
            const item = datasetCatalog.find((d) => d.key === registerKey);
            if (!item) {
              toast.error("The base register for this layout is not in the catalogue.");
              return;
            }
            handleOpenDatasetModal(item, layout || null);
          }}
          onDesignNew={(item) => {
            setActiveDatasetForDesigner(item || datasetCatalog[0] || null);
            setTabularTemplateToEdit(null);
            setTabularDesignerOpen(true);
          }}
          onEditLayout={(template) => {
            setActiveDatasetForDesigner(
              datasetCatalog.find((d) => d.key === template.resolver_key) || datasetCatalog[0] || null
            );
            setTabularTemplateToEdit(template);
            setTabularDesignerOpen(true);
          }}
          onDeleteLayout={handleDelete}
          onToggleLayoutActive={handleToggleActive}
        />
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

          {/* Sub-Filter: Entity Types Chips */}
          <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Target Entity:
            </span>
            {entityChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => {
                  setEntityFilter(chip.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 ${
                  entityFilter === chip.id
                    ? "bg-indigo-600 text-white shadow-2xs font-semibold"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {chip.label}
              </button>
            ))}
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

                          {/* Resolver & Entity with Distinct Semantic Badges */}
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {tmpl.resolver_key}
                            </div>
                            <div className="mt-1">
                              {tmpl.entity_type === "RFQ" || tmpl.slug?.includes("rfq") ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  RFQ Requisition
                                </span>
                              ) : tmpl.entity_type === "QuoteComparison" || tmpl.resolver_key === "quote_comparison" ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Quote Comparison
                                </span>
                              ) : tmpl.entity_type === "PurchaseOrder" || tmpl.resolver_key === "purchase_order" ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  Purchase Order
                                </span>
                              ) : tmpl.entity_type === "BillOfLanding" || tmpl.resolver_key === "bill_of_lading" ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                  Bill of Lading
                                </span>
                              ) : tmpl.entity_type === "Container" || tmpl.resolver_key === "container_details" ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Container
                                </span>
                              ) : tmpl.entity_type === "Defect" || tmpl.resolver_key === "defect_details" ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  Defect Sheet
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {tmpl.entity_type || "Generic"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Page Setup */}
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400 font-medium">
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
                                {tmpl.active_version_number ? `v${tmpl.active_version_number}` : "Draft"}
                              </span>
                            </div>
                          </td>

                          {/* Print Menu Activation Status */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(tmpl)}
                              disabled={togglingId === tmpl.id || !canManage}
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
                              {/* View — the only action every user gets, and the
                                  one that was missing: the layout rendered from
                                  sample data, so nobody has to print a real
                                  document to see what a template looks like. */}
                              <button
                                onClick={() => setPreviewTemplate(tmpl)}
                                title="Preview this layout with sample data"
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Default Template */}
                              {canManage && (
                                <button
                                  onClick={() => handleSetDefault(tmpl)}
                                  disabled={defaultingId === tmpl.id || tmpl.is_default_for_org}
                                  title={tmpl.is_default_for_org ? "Default template for this entity" : "Set as default template for this entity"}
                                  className={`p-1.5 rounded-lg transition cursor-pointer ${tmpl.is_default_for_org ? "text-amber-500" : "text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                                >
                                  {defaultingId === tmpl.id ? <Loader2 size={15} className="animate-spin" /> : <Star size={15} className={tmpl.is_default_for_org ? "fill-current" : ""} />}
                                </button>
                              )}

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

                              {/* A locked template with no explanation reads as
                                  a missing button. */}
                              {canManage && tmpl.is_system && (
                                <span
                                  title="System default — clone it to make an editable copy for this company"
                                  className="p-1.5 text-slate-400 dark:text-slate-500 rounded-lg inline-flex"
                                >
                                  <Lock size={15} />
                                </span>
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
          initialTemplateId={datasetPresetLayoutId}
        />
      )}

      {/* ── Interactive Dataset Report Viewer (Grid & Exports) ──────────── */}
      {datasetViewOpen && activeDatasetResult && (
        <DatasetReportView
          reportKey={activeDatasetResult.report_key}
          datasetResult={activeDatasetResult}
          querySpec={activeQuerySpec}
          onFetchPage={handleFetchDatasetPage}
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

      {/* ── Template Preview ──────────────────────────────────────────────── */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          isDark={document.documentElement.classList.contains("dark")}
          canEdit={canManage}
          onEdit={(tmpl) => {
            setPreviewTemplate(null);
            navigate(`/reports/editor/${tmpl.id}`);
          }}
          onClose={() => setPreviewTemplate(null)}
        />
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
