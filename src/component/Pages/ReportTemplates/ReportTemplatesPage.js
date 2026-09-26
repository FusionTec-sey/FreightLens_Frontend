import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FileText,
  Printer,
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
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import ReportRenderModal from "./ReportRenderModal";

export default function ReportTemplatesPage() {
  const navigate = useNavigate();
  const { permissions, user, hasModule } = useAuth();

  const canManage =
    permissions.includes("Manage_Report_Template") ||
    permissions.includes("Administrator") ||
    permissions.includes("admin") ||
    user?.is_root;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pages, setPages] = useState(1);

  // Filters
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [renderModalOpen, setRenderModalOpen] = useState(false);
  const [activeTemplateForRender, setActiveTemplateForRender] = useState(null);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [templateToClone, setTemplateToClone] = useState(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneSlug, setCloneSlug] = useState("");
  const [cloning, setCloning] = useState(false);

  // Module clearance tabs
  const hasOrders = hasModule ? hasModule("ORDERS") : true;
  const hasLogistics = hasModule ? hasModule("LOGISTICS") : true;

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
    fetchTemplates();
  }, [fetchTemplates]);

  const handleOpenRender = (template) => {
    setActiveTemplateForRender(template);
    setRenderModalOpen(true);
  };

  const handleOpenClone = (template) => {
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileCode className="text-indigo-600 dark:text-indigo-400" size={22} />
            Report & Print Templates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Self-hosted customer-configurable print layouts powered by WeasyPrint & Jinja2
          </p>
        </div>

        {canManage && (
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
      </div>

      {/* ── Filter Bar & Category Tabs ──────────────────────────────────── */}
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

      {/* ── Contained Main Table Area ────────────────────────────────────── */}
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

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Print / Render */}
                          <button
                            onClick={() => handleOpenRender(tmpl)}
                            title="Render & Print"
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>

                          {/* AI Context Download */}
                          {canManage && (
                            <button
                              onClick={() => handleDownloadAiContext(tmpl.resolver_key)}
                              title="Download AI Developer Context (.md)"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <Download size={15} />
                            </button>
                          )}

                          {/* Edit / Customize */}
                          {canManage && (
                            tmpl.is_system ? (
                              <button
                                onClick={() => handleOpenClone(tmpl)}
                                title="Clone and Customize"
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              >
                                <Copy size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/reports/editor/${tmpl.id}`)}
                                title="Edit Template Code"
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              >
                                <Edit3 size={15} />
                              </button>
                            )
                          )}

                          {/* Delete (custom only) */}
                          {canManage && !tmpl.is_system && (
                            <button
                              onClick={() => handleDelete(tmpl)}
                              title="Delete Custom Template"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
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

            {/* Pagination footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {templates.length} of {total} templates
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span>
                  Page {page} of {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Render & Print Modal ────────────────────────────────────────── */}
      {renderModalOpen && activeTemplateForRender && (
        <ReportRenderModal
          isOpen={renderModalOpen}
          onClose={() => {
            setRenderModalOpen(false);
            setActiveTemplateForRender(null);
          }}
          templateId={activeTemplateForRender.id}
          resolverKey={activeTemplateForRender.resolver_key}
        />
      )}

      {/* ── Clone System Template Modal ─────────────────────────────────── */}
      {cloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Clone & Customize Template
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              System templates are locked for consistency. Cloned copies become tenant-owned and fully editable.
            </p>

            <form onSubmit={handleCloneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Template Name
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
    </div>
  );
}
