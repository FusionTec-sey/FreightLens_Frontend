import React, { useState } from "react";
import {
  X,
  Plus,
  Check,
  Search,
  Boxes,
  Package,
  Truck,
  Anchor,
  BadgeCheck,
  AlertTriangle,
  DollarSign,
  Layers,
  BarChart2,
  CheckCircle,
  ShoppingCart,
  FileText,
  TrendingUp,
} from "lucide-react";

const ICON_MAP = {
  Boxes,
  Package,
  Truck,
  Anchor,
  BadgeCheck,
  AlertTriangle,
  DollarSign,
  Layers,
  BarChart2,
  CheckCircle,
  ShoppingCart,
  FileText,
  TrendingUp,
};

export default function WidgetCatalogModal({
  availableWidgets,
  activeWidgetIds,
  isDark,
  onClose,
  onAddWidget,
  onRemoveWidget,
}) {
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");

  const modules = ["ALL", "INVENTORY", "LOGISTICS", "ORDERS", "WAREHOUSE"];

  const filtered = (availableWidgets || []).filter((w) => {
    const matchesModule = selectedModule === "ALL" || w.module === selectedModule;
    const matchesSearch =
      !search.trim() ||
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()) ||
      w.module.toLowerCase().includes(search.toLowerCase());
    return matchesModule && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight">Dashboard Widget Catalog</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select module metrics and charts to display on your personalized workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search available widgets..."
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
              }`}
            />
          </div>

          {/* Module Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedModule(m)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedModule === m
                    ? "bg-indigo-600 text-white shadow-xs"
                    : isDark
                    ? "bg-slate-800 text-slate-400 hover:text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Widget Grid with Contained Scroll */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.length > 0 ? (
            filtered.map((w) => {
              const Icon = ICON_MAP[w.icon] || Boxes;
              const isAdded = activeWidgetIds.includes(w.id);

              return (
                <div
                  key={w.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isAdded
                      ? isDark
                        ? "bg-indigo-950/20 border-indigo-800/80"
                        : "bg-indigo-50/40 border-indigo-200"
                      : isDark
                      ? "bg-slate-800/50 border-slate-800 hover:border-slate-700"
                      : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isDark ? "bg-slate-800 text-indigo-400" : "bg-white text-indigo-600 shadow-xs"
                      }`}
                    >
                      <Icon size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {w.module}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          {w.type.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {w.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {w.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      Default width: {w.default_col_span} col
                    </span>

                    {isAdded ? (
                      <button
                        type="button"
                        onClick={() => onRemoveWidget(w.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={12} />
                        <span>Active (Remove)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddWidget(w)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus size={13} />
                        <span>Add to Dashboard</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No matching widgets found in catalog.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            {activeWidgetIds.length} widget(s) currently active on dashboard
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
