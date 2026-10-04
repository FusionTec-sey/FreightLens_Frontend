import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Bell, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { INVENTORY_APPROVALS_ROUTE } from "../../utils/inventoryRoutes";

const endpoint = `${process.env.REACT_APP_NETWORK}/notifications`;

export default function NotificationsButton({ isDark, canOpenCases }) {
  const { token, selectedOrgId } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(endpoint, { params: { page, limit: 20 }, signal });
      setResult(response.data);
    } catch (failure) {
      if (failure?.code !== "ERR_CANCELED") {
        setError(failure.response?.data?.detail || "Could not load notifications.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setResult(null);
    setPage(1);
  }, [token, selectedOrgId]);

  useEffect(() => {
    if (!open || !token) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [open, token, selectedOrgId, load]);

  const refresh = () => load();

  const markRead = async (item) => {
    if (!item.is_read) {
      try {
        await axios.patch(`${endpoint}/${item.id}/read`);
      } catch (failure) {
        setError(failure.response?.data?.detail || "Could not mark notification as read.");
        return;
      }
    }
    if (item.link_entity_type === "MANAGER_CASE" && canOpenCases) {
      setOpen(false);
      navigate(INVENTORY_APPROVALS_ROUTE);
    } else {
      refresh();
    }
  };

  const markAll = async () => {
    try {
      await axios.post(`${endpoint}/mark-all-read`);
      refresh();
    } catch (failure) {
      setError(failure.response?.data?.detail || "Could not mark notifications as read.");
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800"
        aria-label="Notifications">
        <Bell size={15} /> Notifications
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="presentation">
          <section role="dialog" aria-modal="true" aria-label="Notifications"
            className={`flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border shadow-xl ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
              <div>
                <h2 className="font-semibold">Notifications</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{result?.unread_count ?? 0} unread</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={18} /></button>
            </header>
            <div className="flex shrink-0 justify-between gap-2 border-b border-slate-200 p-3 text-xs dark:border-slate-700">
              <button type="button" onClick={refresh} disabled={loading}>Refresh</button>
              <button type="button" onClick={markAll} disabled={loading || !result?.unread_count}>Mark all read</button>
            </div>
            {error && <p role="alert" className="shrink-0 p-3 text-sm text-rose-600">{error}</p>}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading && <p className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Loading notifications...</p>}
              {!loading && !error && !result?.notifications?.length && <p className="text-sm text-slate-500">No notifications.</p>}
              {!loading && result?.notifications?.map((item) => (
                <button key={item.id} type="button" onClick={() => markRead(item)}
                  className={`mb-2 block w-full rounded-lg border p-3 text-left text-sm ${item.is_read ? "border-slate-200 dark:border-slate-700" : "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"}`}>
                  <span className="block font-semibold">{item.title}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">{item.message}</span>
                  {item.link_entity_type === "MANAGER_CASE" && canOpenCases &&
                    <span className="block pt-1 text-xs text-indigo-600 dark:text-indigo-300">Open review queue</span>}
                </button>
              ))}
            </div>
            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 p-3 text-xs dark:border-slate-700">
              <span>Page {result?.page || page} of {result?.pages || 1}</span>
              <div className="flex gap-3">
                <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button type="button" disabled={loading || page >= (result?.pages || 1)} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
