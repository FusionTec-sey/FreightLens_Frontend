import React, { useState, useEffect, useCallback } from "react";
import { X, History, GitBranch, ArrowUpRight, ArrowDownLeft, Edit3, ShieldAlert, Sparkles, Calendar, User, Eye, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import POSnapshotPreviewModal from "./POSnapshotPreviewModal";

export default function POVersionHistoryDrawer({
  isOpen,
  onClose,
  poId,
  poNumber
}) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Snapshot preview modal state
  const [previewVersionId, setPreviewVersionId] = useState(null);

  const fetchVersions = useCallback(() => {
    if (!poId) return;
    setLoading(true);
    setError(null);
    axios
      .get(`${process.env.REACT_APP_NETWORK}/orders/${poId}/versions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true"
        }
      })
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Failed to load PO version history:", err);
        setError("Failed to fetch version history.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [poId]);

  useEffect(() => {
    if (isOpen && poId) {
      fetchVersions();
    } else {
      setData(null);
      setPreviewVersionId(null);
    }
  }, [isOpen, poId, fetchVersions]);

  if (!isOpen) return null;

  const versions = data?.versions || [];

  const getTransitionBadge = (type) => {
    switch (type) {
      case "INITIAL":
        return {
          icon: <Sparkles size={12} />,
          label: "Initial PO",
          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
        };
      case "STAGE_ADVANCE":
        return {
          icon: <ArrowUpRight size={12} />,
          label: "Stage Promotion",
          color: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800"
        };
      case "STAGE_ROLLBACK":
        return {
          icon: <ArrowDownLeft size={12} />,
          label: "Stage Rollback",
          color: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800"
        };
      case "MUTATION":
        return {
          icon: <Edit3 size={12} />,
          label: "Edited",
          color: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-300 dark:border-purple-800"
        };
      case "VARIANCE_APPROVED":
        return {
          icon: <ShieldAlert size={12} />,
          label: "Variance Approved",
          color: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800"
        };
      default:
        return {
          icon: <GitBranch size={12} />,
          label: type || "Update",
          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300"
        };
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "RFQ_SENT":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
      case "QUOTE_RECEIVED":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";
      case "QUOTE_APPROVED":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300";
      case "PO_ISSUED":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "PROFORMA":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
        <div
          className={`w-full max-w-lg h-full flex flex-col shadow-2xl border-l transition-all animate-in slide-in-from-right duration-200 ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {/* Drawer Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <History size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">Version Lineage & History</h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  PO #{data?.po_number || poNumber || poId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={fetchVersions}
                title="Refresh history"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Current State Summary Banner */}
          {data && (
            <div className={`p-3.5 border-b grid grid-cols-2 gap-3 text-center text-xs ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="border-r border-slate-200 dark:border-slate-800 pr-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Stage & Version</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStageColor(data.current_stage)}`}>
                  {data.current_stage} v{data.current_stage_version}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Snapshots</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm block mt-0.5">
                  {versions.length} versions
                </span>
              </div>
            </div>
          )}

          {/* Timeline Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && !data ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <p className="text-xs">Loading version history & snapshots...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                No version snapshots recorded yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {versions.map((v, index) => {
                  const tBadge = getTransitionBadge(v.transition_type);
                  const isLatest = index === 0;
                  const diff = v.diff_data || {};

                  return (
                    <div key={v.id} className="relative group">
                      {/* Timeline Node Dot */}
                      <div
                        className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          isLatest
                            ? "bg-indigo-600 border-white dark:border-slate-900 text-white ring-4 ring-indigo-500/20"
                            : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-400"
                            : "bg-slate-100 border-slate-300 text-slate-500"
                        }`}
                      >
                        <span className="text-[9px] font-bold">{v.stage_version}</span>
                      </div>

                      {/* Version Card */}
                      <div
                        className={`p-3.5 rounded-xl border transition-all ${
                          isLatest
                            ? isDark
                              ? "bg-indigo-950/20 border-indigo-800/60 shadow-sm"
                              : "bg-indigo-50/40 border-indigo-200 shadow-sm"
                            : isDark
                            ? "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Top Metadata Row */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStageColor(v.lifecycle_stage)}`}>
                              {v.lifecycle_stage} v{v.stage_version}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${tBadge.color}`}>
                              {tBadge.icon}
                              {tBadge.label}
                            </span>
                            {isLatest && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Global #{v.global_version}
                          </span>
                        </div>

                        {/* Lineage Info if Stage Advance / Rollback */}
                        {diff.from_stage && (
                          <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 my-1">
                            <GitBranch size={12} />
                            <span>
                              Promoted from <strong>{diff.from_stage} v{diff.from_stage_version || 1}</strong>
                            </span>
                          </div>
                        )}

                        {/* Change Summary */}
                        {v.change_summary && (
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                            {v.change_summary}
                          </p>
                        )}

                        {/* Diff Pills */}
                        {(diff.items_modified?.length > 0 || diff.items_added?.length > 0 || diff.items_removed?.length > 0 || diff.header_changes) && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                            {diff.items_modified?.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                ~{diff.items_modified.length} modified
                              </span>
                            )}
                            {diff.items_added?.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                +{diff.items_added.length} added
                              </span>
                            )}
                            {diff.items_removed?.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                -{diff.items_removed.length} removed
                              </span>
                            )}
                            {diff.header_changes && Object.keys(diff.header_changes).length > 0 && (
                              <span className="px-1.5 py-0.5 rounded font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                                header: {Object.keys(diff.header_changes).join(", ")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer: User, Date, and View Snapshot Button */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            {v.created_by_name && (
                              <span className="flex items-center gap-1">
                                <User size={11} />
                                {v.created_by_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {v.created_at ? new Date(v.created_at).toLocaleDateString() : ""}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPreviewVersionId(v.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                          >
                            <Eye size={12} />
                            View Snapshot
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {previewVersionId && (
        <POSnapshotPreviewModal
          isOpen={Boolean(previewVersionId)}
          onClose={() => setPreviewVersionId(null)}
          poId={poId}
          versionId={previewVersionId}
        />
      )}
    </>
  );
}
