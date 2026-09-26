import React, { useState } from "react";
import { FolderInput, Download, Trash2, X, Check, Loader2 } from "lucide-react";

export default function BulkActionToolbar({
  selectedCount = 0,
  categories = [],
  isDark = false,
  canEdit = false,
  canDelete = false,
  canExport = false,
  onClearSelection,
  onBulkCategoryMove,
  onBulkExport,
  onBulkDelete,
}) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleApplyCategory = async () => {
    if (!selectedCatId) return;
    setIsProcessing(true);
    try {
      await onBulkCategoryMove(Number(selectedCatId));
      setShowCategoryPicker(false);
      setSelectedCatId("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl border ${
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-white backdrop-blur-md"
            : "bg-white/95 border-slate-300 text-slate-900 backdrop-blur-md"
        }`}
      >
        {/* Count Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-800">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
            {selectedCount}
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Selected
          </span>
        </div>

        {/* Category Move Action */}
        {canEdit && (
          <div className="relative">
            {!showCategoryPicker ? (
              <button
                type="button"
                onClick={() => setShowCategoryPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FolderInput size={14} className="text-indigo-500" />
                <span>Move Category</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="">Choose category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedCatId || isProcessing}
                  onClick={handleApplyCategory}
                  className="p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Export Action */}
        {canExport && (
          <button
            type="button"
            onClick={onBulkExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download size={14} className="text-emerald-500" />
            <span>Export CSV</span>
          </button>
        )}

        {/* Bulk Delete Action */}
        {canDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}

        {/* Clear Selection */}
        <div className="pl-2 border-l border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClearSelection}
            title="Deselect All"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
