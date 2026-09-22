import React, { useState, useEffect } from "react";
import { X, Clock, History, ArrowRight, User, AlertCircle, Loader2, Tag } from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";

export default function POItemHistoryDrawer({
  isOpen,
  onClose,
  poId,
  item
}) {
  const { isDark } = useTheme();
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && poId && item?.id) {
      setLoading(true);
      axios
        .get(`${process.env.REACT_APP_NETWORK}/orders/${poId}/items/${item.id}/history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        })
        .then((res) => {
          setHistoryData(res.data);
        })
        .catch((err) => {
          console.error("Failed to load item revision history:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setHistoryData(null);
    }
  }, [isOpen, poId, item?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md h-full flex flex-col shadow-2xl border-l transition-all animate-in slide-in-from-right duration-200 ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Line Item Revision History</h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {item?.item_code ? `${item.item_code} · ` : ""}
                {item?.description?.slice(0, 30)}
                {item?.description?.length > 30 ? "..." : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current State Summary Banner */}
        <div className={`p-3.5 border-b grid grid-cols-3 gap-2 text-center text-xs ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Qty</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {item?.quantity_ordered} {item?.unit || "PCS"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unit Price</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {item?.unit_price != null ? `$${parseFloat(item.unit_price).toFixed(2)}` : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {item?.item_status || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <p className="text-xs">Loading audit delta logs...</p>
            </div>
          ) : historyData?.revisions?.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs space-y-1">
              <Clock size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-medium">No recorded revisions yet.</p>
              <p className="text-[11px] text-slate-500">Mutations after Draft confirmation will appear here.</p>
            </div>
          ) : (
            historyData?.revisions?.map((rev, idx) => (
              <div
                key={rev.id || idx}
                className={`p-3.5 rounded-xl border space-y-2 text-xs transition ${
                  isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                {/* Revision Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded font-mono font-extrabold text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      v{rev.lifecycle_version}
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {rev.lifecycle_stage}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-200/50 dark:bg-slate-800 text-slate-500 font-bold">
                      {rev.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                  </span>
                </div>

                {/* Values Delta */}
                <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 font-mono text-[11px] space-y-1">
                  {rev.unit_price != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">Price:</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {rev.old_value && <span className="line-through text-slate-400">${rev.old_value}</span>}
                        {rev.old_value && <ArrowRight size={11} className="text-slate-400" />}
                        <span className="text-emerald-600 dark:text-emerald-400">${rev.unit_price.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {rev.quantity != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">Quantity:</span>
                      <span className="font-bold">{rev.quantity} pcs</span>
                    </div>
                  )}
                </div>

                {/* Reason */}
                {rev.reason && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Change Justification:
                    </span>
                    <p className="font-medium italic">"{rev.reason}"</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t text-right ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
