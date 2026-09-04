import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  X,
  Search,
  Tag,
  Package,
  Building2,
  Layers,
  ArrowRight,
  Sparkles,
  Loader2
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function TemplatePickerModal({ isOpen, onClose, onSelectTemplate, onManageTemplates }) {
  const { isDark } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplates();
  }, [isOpen]);

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

  // Collect all unique tags across templates
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

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Tag filter
      if (selectedTag !== "ALL") {
        const tTags = (t.tags || []).map((x) => String(x).toLowerCase());
        if (!tTags.includes(selectedTag.toLowerCase())) return false;
      }
      // Search query
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex-none p-5 border-b flex items-center justify-between ${
            isDark ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-slate-50/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Select Order Template</h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Quickly start an order pre-filled with items, vendor, and specs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onManageTemplates && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageTemplates();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  isDark
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Manage Templates
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition ${
                isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Tag Filter Bar */}
        <div
          className={`p-4 border-b space-y-3 ${
            isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates by name, vendor, product, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-hidden transition ${
                isDark
                  ? "bg-slate-900 border-slate-800 focus:border-blue-500 text-slate-100 placeholder-slate-500"
                  : "bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400"
              }`}
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className={`text-[11px] font-medium mr-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Tags:
              </span>
              <button
                onClick={() => setSelectedTag("ALL")}
                className={`px-2.5 py-1 rounded-full font-medium transition ${
                  selectedTag === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Loading order templates...
              </p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                  isDark ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-base mb-1">No templates found</h3>
              <p className={`text-xs mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {searchQuery || selectedTag !== "ALL"
                  ? "Try clearing your search or tag filters"
                  : "Create your first order template to speed up repeated purchases"}
              </p>
              {onManageTemplates && (
                <button
                  onClick={() => {
                    onClose();
                    onManageTemplates();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  Create New Template
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => {
                const itemCount = (template.items || []).length;
                return (
                  <div
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                    className={`group cursor-pointer rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between hover:shadow-lg ${
                      isDark
                        ? "bg-slate-800/60 border-slate-700/70 hover:border-blue-500 hover:bg-slate-800"
                        : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                    }`}
                  >
                    <div>
                      {/* Title & Visibility */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-sm tracking-tight group-hover:text-blue-500 transition line-clamp-1">
                          {template.name}
                        </h4>
                        {template.visibility === "private" && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-none">
                            Private
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {template.description && (
                        <p className={`text-xs mb-3 line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {template.description}
                        </p>
                      )}

                      {/* Tags */}
                      {Array.isArray(template.tags) && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.map((tg, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-0.5 ${
                                isDark
                                  ? "bg-slate-700 text-slate-300"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <Tag className="w-2.5 h-2.5 opacity-60" />
                              {tg}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Vendor Info */}
                      {template.company && (
                        <div className={`flex items-center gap-1.5 text-xs mb-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          <Building2 className="w-3.5 h-3.5 text-blue-500 flex-none" />
                          <span className="font-medium truncate">{template.company}</span>
                        </div>
                      )}

                      {/* Line Items Preview */}
                      <div
                        className={`rounded-lg p-2.5 text-xs mb-3 ${
                          isDark ? "bg-slate-900/70 border border-slate-700/50" : "bg-slate-50 border border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3 text-emerald-500" />
                            {itemCount} {itemCount === 1 ? "Product" : "Products"}
                          </span>
                          <span>Default Qty</span>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {(template.items || []).slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs py-0.5 border-b border-dashed border-slate-200/20 last:border-0">
                              <span className="truncate max-w-[180px] font-medium" title={it.description}>
                                {it.description}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px] flex-none">
                                {it.default_quantity} {it.unit}
                              </span>
                            </div>
                          ))}
                          {itemCount > 3 && (
                            <p className="text-[10px] text-slate-400 italic pt-1 text-center">
                              +{itemCount - 3} more items...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                      <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Freight: <strong className="font-medium text-slate-300 dark:text-slate-300">{template.freight_type || "Sea Freight"}</strong>
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform"
                      >
                        Use Template
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
