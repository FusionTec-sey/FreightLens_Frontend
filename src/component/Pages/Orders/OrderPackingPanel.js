import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PackageCheck, Loader2, FileSpreadsheet, Container as ContainerIcon, CheckCircle2,
} from "lucide-react";
import axios from "axios";

/**
 * How much of this order has been packed, and into which containers.
 *
 * The mirror of the container's panel, and read-only: quantities move when a
 * packing list is confirmed, never from here.
 */

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  skip_zrok_interstitial: "true",
});

const STATUS_PILL = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  RECEIVED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function OrderPackingPanel({ orderId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/packing`,
        { headers: headers() }
      );
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!orderId || loading) {
    return loading ? (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
        <Loader2 size={14} className="animate-spin" /> Loading packing…
      </div>
    ) : null;
  }

  if (!data || !data.items?.length) return null;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Packing
          </h3>
        </div>
        {data.fully_packed && (
          <span className="text-[10px] font-semibold text-emerald-600 inline-flex items-center gap-1">
            <CheckCircle2 size={11} /> fully packed
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[9px]">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2 text-right">Ordered</th>
              <th className="p-2 text-right">Packed</th>
              <th className="p-2 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((it) => (
              <tr key={it.po_item_id}>
                <td className="p-2">
                  <div className="font-medium truncate max-w-[220px]">{it.description}</div>
                  {it.item_code && (
                    <div className="text-[9px] text-slate-400 font-mono">{it.item_code}</div>
                  )}
                </td>
                <td className="p-2 text-right text-slate-500">
                  {it.quantity_ordered} {it.unit}
                </td>
                <td className="p-2 text-right">
                  {it.quantity_packed}
                  {it.draft_held > 0 && (
                    <span className="block text-[9px] text-amber-600">
                      +{it.draft_held} on a draft
                    </span>
                  )}
                </td>
                <td
                  className={`p-2 text-right font-semibold ${
                    it.remaining > 0 ? "text-blue-600 dark:text-blue-400" : "text-emerald-600"
                  }`}
                >
                  {it.remaining}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.packing_lists?.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Packed into
          </h4>
          {data.packing_lists.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => navigate(`/packing-lists/${pl.id}`)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold">
                <FileSpreadsheet size={11} className="text-blue-500" />
                {pl.packing_list_number}
              </span>
              <span className="flex items-center gap-2">
                {pl.container_no && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <ContainerIcon size={10} /> {pl.container_no}
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    STATUS_PILL[(pl.status || "").toUpperCase()] || STATUS_PILL.RECEIVED
                  }`}
                >
                  {pl.status}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
