import React, { useState } from "react";
import { X, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

/**
 * Reopen a confirmed packing list, on the record.
 *
 * The reason is asked for before the edit is unlocked, not collected on save:
 * it exists so someone can later ask "why was this changed after it was
 * confirmed?", and asking afterwards asks after the fact. Same shape as
 * revising a sent RFQ.
 */
export default function RevisePackingListModal({ open, packingList, onClose, onRevised }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !packingList) return null;

  const tooShort = reason.trim().length < 5;

  const submit = async (e) => {
    e.preventDefault();
    if (tooShort) return;
    setBusy(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/packing-lists/${packingList.id}/revise`,
        { reason: reason.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        }
      );
      toast.success(res.data?.message || "Reopened for editing");
      setReason("");
      onRevised?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not reopen this packing list");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <RotateCcw size={16} className="text-amber-500" />
            Revise {packingList.packing_list_number}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              This list has already been counted against its purchase orders. Reopening returns
              those quantities, so the orders show as unpacked again until you confirm it.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplier short-shipped 200 pcs; carton count corrected after reweigh."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Recorded against this packing list and shown in its history.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={tooShort || busy}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reopen for editing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
