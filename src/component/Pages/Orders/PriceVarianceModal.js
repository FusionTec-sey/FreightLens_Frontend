import React, { useState } from "react";
import { AlertTriangle, Lock, Unlock, X, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

function getUserInfo() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function PriceVarianceModal({
  isOpen,
  onClose,
  poId,
  varianceData,
  onApproved
}) {
  const { isDark } = useTheme();
  const { isRoot } = useAuth();
  const userInfo = getUserInfo();

  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !varianceData?.has_variance) return null;

  const hasApprovePermission =
    isRoot ||
    userInfo?.is_root ||
    userInfo?.permissions?.includes("Approve_Variance") ||
    userInfo?.roles?.some((r) =>
      ["Administrator", "Admin", "Accounts_Finance", "Finance", "Account"].includes(r)
    );

  const thresholdPct = varianceData?.threshold_pct || 2.0;
  const variances = varianceData?.variances || [];

  const handleApprove = async () => {
    if (!justification || justification.trim().length < 5) {
      setErrorMsg("Please provide an approval justification of at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/orders/${poId}/approve-variance`,
        { justification: justification.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        }
      );
      if (onApproved) onApproved();
      onClose();
    } catch (err) {
      console.error("Failed to approve variance:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to approve price variance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock size={20} />
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                <span>Price Variance Detected — Proforma Lock</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                  Tolerance: ±{thresholdPct}%
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Proforma prices exceed the vendor's agreed variance threshold. Approval required before advancing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Variance items table */}
          <div className="rounded-xl border overflow-hidden border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <th className="py-2.5 px-3">Item / Description</th>
                  <th className="py-2.5 px-3 text-right">PO Price</th>
                  <th className="py-2.5 px-3 text-right">Proforma Price</th>
                  <th className="py-2.5 px-3 text-right">Variance %</th>
                  <th className="py-2.5 px-3 text-center">Tolerance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {variances.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-sans font-medium">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{v.item_code || "Line Item"}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{v.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">${parseFloat(v.po_price).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-500">${parseFloat(v.proforma_price).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                      +{v.variance_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        Exceeded ({thresholdPct}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Authorization Check */}
          {!hasApprovePermission ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Lock size={14} className="text-amber-600" />
                <span>Approval Permission Required</span>
              </div>
              <p className="text-[11px]">
                You do not have the <span className="font-mono font-bold text-rose-500">Approve_Variance</span> permission required to authorize pricing overages. Please notify an Accounts Manager or Administrator to review and unlock.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Override Justification <span className="text-rose-500">* (Mandatory for Audit Trail)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this price variance was accepted (e.g., 'Freight surcharge approved due to emergency port congestion fee; accepted by Finance')..."
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
              {errorMsg && <p className="text-[11px] text-rose-500 font-bold">{errorMsg}</p>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
          {hasApprovePermission && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  <span>Approve Variance & Unlock PO</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
