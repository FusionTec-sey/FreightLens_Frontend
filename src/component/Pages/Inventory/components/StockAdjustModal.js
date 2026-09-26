import React, { useState } from "react";
import axios from "axios";
import { X, Plus, Minus, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

const REASON_OPTIONS = [
  { value: "manual_adjustment", label: "Cycle Count / Inventory Audit" },
  { value: "receipt", label: "Inbound Receipt / Restock" },
  { value: "damaged", label: "Damaged / Broken / Scrapped" },
  { value: "return", label: "Site / Customer Return" },
  { value: "internal_transfer", label: "Internal Project Transfer" },
  { value: "other", label: "Other (specify in notes)" },
];

export default function StockAdjustModal({
  product,
  isDark = false,
  onClose,
  onSuccess,
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("manual_adjustment");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const currentStock = Number(product.current_stock) || 0;
  const newStock = Math.max(0, currentStock + Number(delta));

  const handleQuickAdd = (amount) => {
    setDelta((prev) => Number(prev || 0) + amount);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (delta === 0) {
      toast.warning("Please enter a stock adjustment value greater or less than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/inventory/products/${product.id}/adjust-stock`,
        {
          quantity_delta: Number(delta),
          reason,
          notes: notes.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            skip_zrok_interstitial: "true",
          },
        }
      );

      toast.success(res.data.message || "Stock adjusted successfully");
      if (onSuccess) onSuccess(res.data.product);
      onClose();
    } catch (err) {
      console.error("Failed to adjust stock:", err);
      toast.error(err.response?.data?.detail || "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border transition-colors ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header - Fixed */}
        <div
          className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
            isDark ? "border-slate-800" : "border-slate-100"
          }`}
        >
          <div>
            <h3 className="text-base font-semibold">Adjust Stock Level</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {product.name} ({product.sku})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Scrollable if long */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stock Preview Indicator */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-around text-center ${
              isDark ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50 border-slate-200/80"
            }`}
          >
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Current</span>
              <p className="text-xl font-bold mt-0.5 tabular-nums">
                {currentStock.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-400">{product.unit || "PCS"}</span>
              </p>
            </div>

            <div className="flex items-center text-slate-400">
              <ArrowRight size={20} className="mx-2" />
            </div>

            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">New Projected</span>
              <p
                className={`text-xl font-bold mt-0.5 tabular-nums ${
                  newStock < (product.min_stock_quantity || 0)
                    ? "text-rose-500"
                    : newStock !== currentStock
                    ? "text-indigo-500"
                    : ""
                }`}
              >
                {newStock.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-400">{product.unit || "PCS"}</span>
              </p>
            </div>
          </div>

          {/* Quick Adjustment Delta Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Quick Adjustments</label>
            <div className="grid grid-cols-6 gap-1.5">
              {[-10, -5, -1, 1, 5, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                    val < 0
                      ? isDark
                        ? "bg-rose-950/20 text-rose-300 border-rose-800/40 hover:bg-rose-900/40"
                        : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : isDark
                      ? "bg-emerald-950/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustment Quantity Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Quantity Delta (+ to add, - to subtract)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={delta}
                onChange={(e) => setDelta(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                }`}
              />
            </div>
          </div>

          {/* Reason Select */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Adjustment</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border transition-all ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                  : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500"
              }`}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Internal Reference / Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Damaged during unloading in Container #CX-104"
              className={`w-full px-3 py-2 rounded-xl text-sm border resize-none transition-all ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                  : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500"
              }`}
            />
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div
          className={`shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t ${
            isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || delta === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Updating...
              </>
            ) : (
              "Confirm Adjustment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
