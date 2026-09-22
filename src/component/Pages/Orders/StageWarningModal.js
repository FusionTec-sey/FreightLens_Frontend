import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, X, ArrowRight } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function StageWarningModal({
  isOpen,
  warningLevel = "NONE",
  stage = "DRAFT",
  currentVersion = 1,
  pendingChangesSummary = [],
  onConfirm,
  onCancel
}) {
  const { isDark } = useTheme();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || warningLevel === "NONE") return null;

  const isCritical = warningLevel === "CRITICAL";

  const handleProceed = () => {
    if (isCritical && (!reason || reason.trim().length < 5)) {
      setError("Please provide a revision justification of at least 5 characters.");
      return;
    }
    setError("");
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isCritical
              ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isCritical ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {isCritical ? "Critical Notice: Post-Approval Item Modification" : "Warning: Active RFQ Stage Modification"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Current Stage: <span className="font-bold">{stage}</span> · Version: <span className="font-mono font-bold">v{currentVersion}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {isCritical ? (
              <>
                This Purchase Order has already passed internal quote approval or official order issuance. Modifying line items now will automatically{" "}
                <span className="font-bold text-rose-500">increment the document to Version {currentVersion + 1}</span> and log an immutable entry into the change audit history.
              </>
            ) : (
              <>
                This order is currently in the active RFQ / Quoting stage. Modifying items now will alter the scope sent to suppliers.
              </>
            )}
          </p>

          {/* Pending Changes Preview (if available) */}
          {pendingChangesSummary.length > 0 && (
            <div className={`p-3 rounded-xl border space-y-1.5 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Summary of Changes:</div>
              <ul className="space-y-1 font-mono text-[11px]">
                {pendingChangesSummary.map((chg, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{chg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory Revision Reason Input for Critical Level */}
          {isCritical && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Revision Justification <span className="text-rose-500">* (Mandatory)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Specify the operational or vendor reason for this modification (e.g., 'Vendor countered with revised unit price due to steel surcharge')..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError("");
                }}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
              {error && <p className="text-[11px] text-rose-500 font-bold">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel & Discard
          </button>
          <button
            type="button"
            onClick={handleProceed}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm ${
              isCritical
                ? "bg-rose-600 hover:bg-rose-700 active:scale-95"
                : "bg-amber-600 hover:bg-amber-700 active:scale-95"
            }`}
          >
            {isCritical ? `Confirm & Bump to Version ${currentVersion + 1}` : "Confirm Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
