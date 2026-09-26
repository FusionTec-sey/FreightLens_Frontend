import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function PaginationToolbar({
  page = 1,
  pageSize = 25,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  isDark = false,
  pageSizeOptions = [10, 25, 50, 100],
  className = ""
}) {
  const [jumpPageInput, setJumpPageInput] = useState("");

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      if (onPageChange) onPageChange(target);
      setJumpPageInput("");
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-colors ${
        isDark
          ? "bg-slate-900/60 border-slate-800 text-slate-200"
          : "bg-white/80 border-slate-200 text-slate-700 shadow-sm"
      } ${className}`}
    >
      {/* ── Left: Record Count & Page Size ── */}
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className="text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-900 dark:text-white font-mono">{startRecord}</span> to{" "}
          <span className="font-semibold text-slate-900 dark:text-white font-mono">{endRecord}</span> of{" "}
          <span className="font-semibold text-slate-900 dark:text-white font-mono">{totalCount}</span> records
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-4 border-l border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={`px-2 py-1 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Right: Navigation Controls & Jump ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(1)}
            title="First Page"
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronsLeft size={14} />
            <span className="hidden sm:inline">First</span>
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
            title="Previous Page"
            className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <span className="px-3 py-1 font-mono font-bold text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
            {page} / {totalPages || 1}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
            title="Next Page"
            className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange && onPageChange(totalPages)}
            title="Last Page"
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight size={14} />
          </button>
        </div>

        {totalPages > 2 && (
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800"
          >
            <span className="text-[11px] text-slate-400">Go:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder="#"
              className={`w-12 px-1.5 py-1 border rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            />
          </form>
        )}
      </div>
    </div>
  );
}
