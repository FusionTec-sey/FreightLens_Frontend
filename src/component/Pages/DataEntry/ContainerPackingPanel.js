import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageCheck, Plus, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

/**
 * What this container carries, and how much of it is accounted for.
 *
 * The link on its own is just a row somewhere. This is where it earns its
 * keep: per order, how much is still to be packed, and which packing lists
 * have been made for this container.
 */

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  skip_zrok_interstitial: "true",
});

const api = process.env.REACT_APP_NETWORK;

const STATUS_PILL = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  RECEIVED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function ContainerPackingPanel({ containerId, onBuildPackingList }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!containerId) return;
    setLoading(true);
    try {
      const [ordersRes, listsRes] = await Promise.all([
        axios.get(`${api}/containers/${containerId}/purchase-orders`, { headers: headers() }),
        axios.get(`${api}/packing-lists`, {
          params: { container_id: containerId },
          headers: headers(),
        }),
      ]);
      setOrders(ordersRes.data?.purchase_orders || []);
      setLists(listsRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load packing details");
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!containerId) return null;

  const fullyPacked = orders.filter((o) => o.fully_packed).length;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Linked Orders &amp; Packing
          </h3>
        </div>
        {orders.length > 0 && (
          <span className="text-[11px] text-slate-400">
            {fullyPacked} of {orders.length} fully packed
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-400">
              No purchase orders are linked yet. Add them on the Container tab.
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((po) => {
                const packed = po.items.reduce(
                  (n, it) => n + Number(it.quantity_already_packed || 0), 0
                );
                const ordered = po.items.reduce(
                  (n, it) => n + Number(it.quantity_ordered || 0), 0
                );
                const pct = ordered > 0 ? Math.min(100, Math.round((packed / ordered) * 100)) : (po.fully_packed ? 100 : 0);
                return (
                  <div
                    key={po.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold font-mono truncate">{po.po_number}</div>
                        <div className="text-[10px] text-slate-400 truncate">{po.company || "—"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {po.fully_packed ? (
                          <span className="text-[10px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> fully packed
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            {po.open_item_count} line{po.open_item_count === 1 ? "" : "s"} left
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${po.fully_packed ? "bg-emerald-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lists.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Packing lists
              </h4>
              {lists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => navigate(`/packing-lists/${pl.id}`)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold">
                    <FileSpreadsheet size={12} className="text-blue-500" />
                    {pl.packing_list_number}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{pl.line_count} lines</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      STATUS_PILL[(pl.status || "").toUpperCase()] || STATUS_PILL.RECEIVED
                    }`}>
                      {pl.status}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onBuildPackingList}
            disabled={orders.length === 0}
            className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition"
            title={orders.length === 0 ? "Link a purchase order first" : undefined}
          >
            <Plus size={14} /> New packing list for this container
          </button>
        </>
      )}
    </div>
  );
}
