import React, { useState, useEffect } from "react";
import { X, Eye, Calendar, User, Package, Loader2 } from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";

export default function POSnapshotPreviewModal({
  isOpen,
  onClose,
  poId,
  versionId,
  initialSnapshot = null
}) {
  const { isDark } = useTheme();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && poId && versionId) {
      setLoading(true);
      setError(null);
      axios
        .get(`${process.env.REACT_APP_NETWORK}/orders/${poId}/versions/${versionId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        })
        .then((res) => {
          setSnapshot(res.data);
        })
        .catch((err) => {
          console.error("Failed to fetch version snapshot detail:", err);
          setError("Failed to load historical snapshot detail.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (initialSnapshot) {
      setSnapshot(initialSnapshot);
    } else {
      setSnapshot(null);
    }
  }, [isOpen, poId, versionId, initialSnapshot]);

  if (!isOpen) return null;

  const snapData = snapshot?.snapshot_data || {};
  const items = snapData?.items || [];
  const diffData = snapshot?.diff_data || {};

  const stageBadgeColor = {
    DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    CONFIRMED: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    RFQ_SENT: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    QUOTE_RECEIVED: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    QUOTE_APPROVED: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
    PO_ISSUED: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    PROFORMA: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800"
  }[snapshot?.lifecycle_stage || "DRAFT"] || "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Read-Only Amber Notice Banner */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Historical Immutable Snapshot:</strong> Viewing{" "}
              <span className="font-bold underline uppercase">
                {snapshot?.lifecycle_stage} v{snapshot?.stage_version}
              </span>{" "}
              (Global Version #{snapshot?.global_version})
            </span>
          </div>
          <span className="text-[11px] opacity-80 hidden sm:inline">
            Read-Only Audit Record
          </span>
        </div>

        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  PO Snapshot: {snapData.po_number || "—"}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${stageBadgeColor}`}>
                  {snapshot?.lifecycle_stage} v{snapshot?.stage_version}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {snapshot?.transition_type}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {snapshot?.created_at ? new Date(snapshot.created_at).toLocaleString() : "—"}
                </span>
                {snapshot?.created_by_name && (
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {snapshot.created_by_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <Loader2 size={28} className="animate-spin text-blue-500" />
              <p className="text-sm">Loading historical snapshot data...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Change Summary Card */}
              {snapshot?.change_summary && (
                <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Snapshot Change Reason / Summary
                  </span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {snapshot.change_summary}
                  </p>
                </div>
              )}

              {/* Header Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-800" : "bg-slate-50/70 border-slate-200"}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier</span>
                  <span className="text-xs font-semibold truncate block mt-0.5">
                    {snapData.company || "Not assigned"}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-800" : "bg-slate-50/70 border-slate-200"}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Consignee</span>
                  <span className="text-xs font-semibold truncate block mt-0.5">
                    {snapData.consignee || snapData.sheet_type || "—"}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-800" : "bg-slate-50/70 border-slate-200"}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Freight / Shipping</span>
                  <span className="text-xs font-semibold truncate block mt-0.5">
                    {snapData.freight_type || "Sea Freight"}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-800" : "bg-slate-50/70 border-slate-200"}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Value</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {snapData.total_amount != null
                      ? `${snapData.currency || "USD"} ${parseFloat(snapData.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Specific Diff Highlights if present */}
              {(diffData.items_modified?.length > 0 || diffData.items_added?.length > 0 || diffData.items_removed?.length > 0) && (
                <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-blue-50/50 border-blue-100"}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-2">
                    Diff Breakdown Recorded At This Version
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {diffData.items_modified?.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          MODIFIED
                        </span>
                        <span className="font-medium truncate max-w-xs">{m.description}</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          Qty: {m.old_qty} ➔ {m.new_qty} | Price: ${m.old_unit_price ?? "—"} ➔ ${m.new_unit_price ?? "—"}
                        </span>
                      </div>
                    ))}
                    {diffData.items_added?.map((a, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          ADDED
                        </span>
                        <span className="font-medium truncate max-w-xs">{a.description}</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          Qty: {a.quantity} | Price: ${a.unit_price ?? "—"}
                        </span>
                      </div>
                    ))}
                    {diffData.items_removed?.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                          REMOVED
                        </span>
                        <span className="font-medium truncate max-w-xs">{r.description}</span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          Was Qty: {r.quantity} | Price: ${r.unit_price ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Package size={14} />
                    Line Items Snapshot ({items.length})
                  </h3>
                </div>

                <div className={`overflow-hidden rounded-xl border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-semibold text-slate-400 ${isDark ? "bg-slate-800/60 border-slate-800" : "bg-slate-100/70 border-slate-200"}`}>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item / Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No items captured in this snapshot.
                          </td>
                        </tr>
                      ) : (
                        items.map((it, idx) => (
                          <tr
                            key={it.id || idx}
                            className={`hover:bg-slate-500/5 transition ${
                              it.item_status === "USER_REMOVED" ? "opacity-50 line-through" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800 dark:text-slate-100">
                                {it.description}
                              </div>
                              {it.item_code && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {it.item_code}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">
                              {it.quantity_ordered} {it.unit || "PCS"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                              {it.unit_price != null ? `$${parseFloat(it.unit_price).toFixed(2)}` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {it.total_price != null ? `$${parseFloat(it.total_price).toFixed(2)}` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                it.item_status === "USER_REMOVED"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}>
                                {it.item_status || "ACTIVE"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex justify-end ${isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
