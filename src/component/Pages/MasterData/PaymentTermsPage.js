import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck,
  Users,
  Loader2,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

export default function PaymentTermsPage() {
  const { isDark } = useTheme();

  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [advancePct, setAdvancePct] = useState("30");
  const [progressPct, setProgressPct] = useState("0");
  const [balancePct, setBalancePct] = useState("70");
  const [balanceTrigger, setBalanceTrigger] = useState("ON_BL");
  const [creditDays, setCreditDays] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true"
  }), [token]);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/master-data/payment-terms?active_only=false`, { headers });
      setPaymentTerms(res.data || []);
    } catch (err) {
      console.error("Failed to load payment terms:", err);
      toast.error("Failed to load payment terms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const totalPct = useMemo(() => {
    const a = parseFloat(advancePct) || 0;
    const p = parseFloat(progressPct) || 0;
    const b = parseFloat(balancePct) || 0;
    return a + p + b;
  }, [advancePct, progressPct, balancePct]);

  const handleOpenCreateModal = () => {
    setEditingTerm(null);
    setName("");
    setCode("");
    setDescription("");
    setAdvancePct("30");
    setProgressPct("0");
    setBalancePct("70");
    setBalanceTrigger("ON_BL");
    setCreditDays("0");
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (term) => {
    setEditingTerm(term);
    setName(term.name);
    setCode(term.code);
    setDescription(term.description || "");
    setAdvancePct(String(term.advance_pct));
    setProgressPct(String(term.progress_pct));
    setBalancePct(String(term.balance_pct));
    setBalanceTrigger(term.balance_trigger);
    setCreditDays(String(term.credit_days));
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Math.abs(totalPct - 100.0) > 0.01) {
      setFormError(`Milestone percentages must equal 100% (currently ${totalPct.toFixed(1)}%).`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const payload = {
      code: code.trim().toUpperCase().replace(/\s+/g, "_"),
      name: name.trim(),
      description: description.trim() || null,
      advance_pct: parseFloat(advancePct) || 0,
      progress_pct: parseFloat(progressPct) || 0,
      balance_pct: parseFloat(balancePct) || 0,
      balance_trigger: balanceTrigger,
      credit_days: parseInt(creditDays) || 0,
      is_active: true,
    };

    try {
      if (editingTerm) {
        await axios.put(
          `${process.env.REACT_APP_NETWORK}/master-data/payment-terms/${editingTerm.id}`,
          payload,
          { headers }
        );
        toast.success(`Payment term '${payload.name}' updated.`);
      } else {
        await axios.post(
          `${process.env.REACT_APP_NETWORK}/master-data/payment-terms`,
          payload,
          { headers }
        );
        toast.success(`Payment term '${payload.name}' created.`);
      }
      setShowModal(false);
      fetchTerms();
    } catch (err) {
      console.error("Save payment term failed:", err);
      setFormError(err.response?.data?.detail || "Failed to save payment term.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id, currentName) => {
    if (!window.confirm(`Deactivate payment term '${currentName}'?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/master-data/payment-terms/${id}`, { headers });
      toast.success("Payment term deactivated.");
      fetchTerms();
    } catch (err) {
      toast.error("Failed to deactivate payment term.");
    }
  };

  const getTriggerLabel = (trigger) => {
    switch (trigger) {
      case "ON_BL": return "Bill of Lading Copy";
      case "ON_ARRIVAL": return "Port / Goods Arrival";
      case "ON_DISPATCH": return "Before Factory Dispatch";
      case "PI_CONFIRMATION": return "PI Confirmation (100% Deposit)";
      case "NET_DAYS": return "Net Credit Terms";
      default: return trigger;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CreditCard size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Payment Terms Master
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Standardize cashflow rules, advance deposits, and settlement triggers bound to vendors.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>New Payment Term</span>
        </button>
      </div>

      {/* Terms Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-emerald-500" />
          <span className="text-xs">Loading payment terms...</span>
        </div>
      ) : paymentTerms.length === 0 ? (
        <div className="p-12 border border-dashed rounded-2xl text-center text-slate-400 text-xs">
          No payment terms found. Click &quot;New Payment Term&quot; to create standard procurement terms.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paymentTerms.map((term) => (
            <div
              key={term.id}
              className={`p-5 rounded-2xl border transition shadow-2xs space-y-4 flex flex-col justify-between ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {term.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {term.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      term.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}
                  >
                    {term.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {term.description || "Standard vendor trade credit / milestone settlement term."}
                </p>

                {/* Milestone Split Percentages */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-blue-600 dark:text-blue-400">Advance: {term.advance_pct}%</span>
                    {term.progress_pct > 0 && (
                      <span className="text-amber-500">Progress: {term.progress_pct}%</span>
                    )}
                    <span className="text-emerald-600 dark:text-emerald-400">Balance: {term.balance_pct}%</span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    {term.advance_pct > 0 && (
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${term.advance_pct}%` }}
                        title={`Advance: ${term.advance_pct}%`}
                      />
                    )}
                    {term.progress_pct > 0 && (
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${term.progress_pct}%` }}
                        title={`Progress: ${term.progress_pct}%`}
                      />
                    )}
                    {term.balance_pct > 0 && (
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${term.balance_pct}%` }}
                        title={`Balance: ${term.balance_pct}%`}
                      />
                    )}
                  </div>
                </div>

                {/* Details Footer tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                    <FileCheck size={12} className="text-slate-400" />
                    <span>Trigger: {getTriggerLabel(term.balance_trigger)}</span>
                  </span>

                  {term.credit_days > 0 && (
                    <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Clock size={12} />
                      <span>{term.credit_days} Credit Days</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1 text-slate-400 ml-auto">
                    <Users size={12} />
                    <span>{term.vendor_count} {term.vendor_count === 1 ? "vendor" : "vendors"}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(term)}
                  className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Edit
                </button>
                {term.is_active && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(term.id, term.name)}
                    className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-rose-500 rounded-lg transition"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT PAYMENT TERM ── */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold">
                {editingTerm ? "Edit Payment Term" : "Create Payment Term Template"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="flex-none" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Term Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30% Advance, 70% against B/L"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Unique Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ADV_30_BL_70"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={!!editingTerm}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold uppercase disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Balance Trigger *
                  </label>
                  <select
                    value={balanceTrigger}
                    onChange={(e) => setBalanceTrigger(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="ON_BL">Draft Bill of Lading (B/L)</option>
                    <option value="ON_ARRIVAL">Port / Goods Arrival</option>
                    <option value="ON_DISPATCH">Before Factory Dispatch</option>
                    <option value="PI_CONFIRMATION">PI Confirmation (100% Deposit)</option>
                    <option value="NET_DAYS">Net Credit Days</option>
                  </select>
                </div>
              </div>

              {/* Milestone Percentage Breakdown */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Payment Breakdown (Must equal 100%)
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      Math.abs(totalPct - 100.0) < 0.01 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    Total: {totalPct.toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                      Advance %
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={advancePct}
                      onChange={(e) => setAdvancePct(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-500 mb-1">
                      Progress %
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={progressPct}
                      onChange={(e) => setProgressPct(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Balance %
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={balancePct}
                      onChange={(e) => setBalancePct(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, parseFloat(advancePct) || 0)}%` }} />
                  <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, parseFloat(progressPct) || 0)}%` }} />
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, parseFloat(balancePct) || 0)}%` }} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Credit Days (if post-arrival terms)
                </label>
                <input
                  type="number"
                  min="0"
                  value={creditDays}
                  onChange={(e) => setCreditDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                  placeholder="0 (immediate upon trigger)"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Contract Terms
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                  placeholder="Notes shown to procurement team and vendors..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Math.abs(totalPct - 100.0) > 0.01}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingTerm ? "Update Term" : "Save Payment Term"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
