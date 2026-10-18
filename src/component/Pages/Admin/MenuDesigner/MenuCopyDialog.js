import React, { useCallback, useEffect, useState } from "react";
import { Building2, Check, Copy, Loader2, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { copyMenuTo } from "../../../../services/navigationApi";

/**
 * Copy a menu into other companies here.
 *
 * Each copy is independent. That is the point rather than a limitation: a
 * menu shared between companies would have to win against the ones they
 * designed themselves, and copies never have that argument.
 */
export default function MenuCopyDialog({ open, menu, onClose, onCopied }) {
  const [orgs, setOrgs] = useState([]);
  const [chosen, setChosen] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${process.env.REACT_APP_NETWORK}/organisations`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        }
      );
      const rows = Array.isArray(data) ? data : data?.items || data?.data || [];
      setOrgs(rows.filter((o) => o.id !== menu?.org_id));
    } catch {
      toast.error("Could not load the list of companies");
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, [menu]);

  useEffect(() => {
    if (open) {
      setChosen({});
      load();
    }
  }, [open, load]);

  if (!open || !menu) return null;

  const picked = Object.keys(chosen).filter((id) => chosen[id]).map(Number);

  const copy = async () => {
    if (!picked.length) return;
    setBusy(true);
    try {
      const out = await copyMenuTo(menu.id, picked);
      const made = out?.copied || [];
      toast.success(
        `Copied into ${made.length} compan${made.length === 1 ? "y" : "ies"}. ` +
        "Each copy reaches nobody until a role there is assigned to it."
      );
      onCopied?.(made);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not copy that menu");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Copy size={16} className="text-indigo-500" /> Copy “{menu.name}”
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Into other companies in this installation
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {loading && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" /> Loading companies…
            </p>
          )}
          {!loading && orgs.length === 0 && (
            <p className="text-xs text-slate-400">
              There is no other company here to copy into.
            </p>
          )}
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setChosen((c) => ({ ...c, [org.id]: !c[org.id] }))}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
            >
              <span className="inline-flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-slate-400" />
                {org.display_name || org.name}
              </span>
              {chosen[org.id] && <Check size={16} className="text-indigo-500 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500">{picked.length} selected</span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={copy}
              disabled={!picked.length || busy}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium inline-flex items-center gap-2"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
