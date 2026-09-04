import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Layers,
  Plus,
  Search,
  Tag,
  Package,
  Building2,
  Lock,
  Globe,
  Edit2,
  Trash2,
  ArrowRight,
  Loader2,
  FilterX,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import TemplateForm from "./TemplateForm";

export default function OrderTemplatesPage({ onUseTemplateForOrder }) {
  const { isDark } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/orders/templates`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true",
        },
      });
      let data = res.data;
      if (typeof data === "string") data = JSON.parse(data);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load order templates:", err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    templates.forEach((t) => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach((tag) => {
          if (tag && String(tag).trim()) tagSet.add(String(tag).trim());
        });
      }
    });
    return Array.from(tagSet);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (selectedTag !== "ALL") {
        const tTags = (t.tags || []).map((x) => String(x).toLowerCase());
        if (!tTags.includes(selectedTag.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name?.toLowerCase().includes(q);
        const matchesCompany = t.company?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesItems = (t.items || []).some((it) =>
          it.description?.toLowerCase().includes(q) || it.item_code?.toLowerCase().includes(q)
        );
        const matchesTags = (t.tags || []).some((tag) =>
          String(tag).toLowerCase().includes(q)
        );
        return matchesName || matchesCompany || matchesDesc || matchesItems || matchesTags;
      }
      return true;
    });
  }, [templates, selectedTag, searchQuery]);

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/orders/templates/${templateToDelete.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        }
      );
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
      setTemplateToDelete(null);
    } catch (err) {
      console.error("Failed to delete template:", err);
      alert(err.response?.data?.detail || "Could not delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaved = (savedTemplate) => {
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            Order Templates
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Reusable blueprints with pre-defined product lines and vendors to place orders in one click
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Search & Tags Filter Bar */}
      <div
        className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates by title, tag, vendor, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border outline-hidden transition ${
                isDark
                  ? "bg-slate-800 border-slate-700 focus:border-blue-500 text-slate-100 placeholder-slate-500"
                  : "bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400"
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {(searchQuery || selectedTag !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag("ALL");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  isDark
                    ? "bg-slate-800 text-slate-400 hover:text-slate-200"
                    : "bg-slate-100 text-slate-600 hover:text-slate-800"
                }`}
              >
                <FilterX className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}
            </span>
          </div>
        </div>

        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-xs">
            <span className={`text-[11px] font-medium mr-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Filter by Tag:
            </span>
            <button
              onClick={() => setSelectedTag("ALL")}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                selectedTag === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : isDark
                  ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({templates.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition ${
                  selectedTag.toLowerCase() === tag.toLowerCase()
                    ? "bg-blue-600 text-white shadow-xs"
                    : isDark
                    ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Templates */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Loading order templates...
          </p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div
          className={`py-20 flex flex-col items-center justify-center text-center rounded-2xl border ${
            isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
              isDark ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base mb-1">No templates found</h3>
          <p className={`text-xs max-w-sm mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {searchQuery || selectedTag !== "ALL"
              ? "No templates match your search criteria. Try clearing filters."
              : "Create reusable blueprints with pre-filled products, vendors, and tags to place orders quickly."}
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => {
            const itemCount = (template.items || []).length;
            return (
              <div
                key={template.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${
                  isDark
                    ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Top Bar: Title & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm tracking-tight line-clamp-1" title={template.name}>
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        type="button"
                        onClick={() => handleEdit(template)}
                        className={`p-1.5 rounded-lg transition ${
                          isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                        }`}
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateToDelete(template)}
                        className={`p-1.5 rounded-lg transition ${
                          isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-500"
                        }`}
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className={`text-xs mb-3 line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {template.description}
                    </p>
                  )}

                  {/* Badges: Tags & Visibility */}
                  <div className="flex flex-wrap items-center gap-1 mb-3">
                    {template.visibility === "private" ? (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" /> Org
                      </span>
                    )}

                    {Array.isArray(template.tags) &&
                      template.tags.map((tg, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-0.5 ${
                            isDark
                              ? "bg-slate-800 text-slate-300"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5 opacity-50" />
                          {tg}
                        </span>
                      ))}
                  </div>

                  {/* Vendor / Supplier */}
                  {template.company && (
                    <div className={`flex items-center gap-1.5 text-xs mb-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      <Building2 className="w-3.5 h-3.5 text-blue-500 flex-none" />
                      <span className="font-semibold truncate">{template.company}</span>
                    </div>
                  )}

                  {/* Items Box */}
                  <div
                    className={`rounded-xl p-3 text-xs mb-4 ${
                      isDark ? "bg-slate-950/60 border border-slate-800" : "bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-emerald-500" />
                        {itemCount} {itemCount === 1 ? "Product Line" : "Product Lines"}
                      </span>
                      <span>Default Qty</span>
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {(template.items || []).slice(0, 4).map((it, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs py-0.5 border-b border-dashed border-slate-200/20 last:border-0"
                        >
                          <span className="truncate max-w-[160px] font-medium" title={it.description}>
                            {it.description}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 flex-none">
                            {it.default_quantity} {it.unit}
                          </span>
                        </div>
                      ))}
                      {itemCount > 4 && (
                        <p className="text-[10px] text-slate-400 italic pt-1 text-center">
                          +{itemCount - 4} more items...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom CTA */}
                <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {template.freight_type || "Sea Freight"}
                  </span>
                  {onUseTemplateForOrder && (
                    <button
                      type="button"
                      onClick={() => onUseTemplateForOrder(template)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Place Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="font-bold text-base">Delete Order Template?</h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Are you sure you want to delete template <strong>"{templateToDelete.name}"</strong>? Existing orders created from this template will not be affected.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Form Drawer */}
      {showForm && (
        <TemplateForm
          templateData={editingTemplate}
          onClose={() => setShowForm(false)}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
