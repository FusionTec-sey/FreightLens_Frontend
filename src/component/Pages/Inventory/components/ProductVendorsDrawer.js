import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  Truck,
  Star,
  Clock,
  Package,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * Who can supply one product, and on what terms.
 *
 * The mirror of the vendor profile's Products tab. Awards write each vendor's
 * article number, cost, lead time and minimum order quantity back onto the
 * link, so the comparison a buyer used to make by e-mail is now a read.
 *
 * Paged on the server: a product in a mature catalogue has more vendors than a
 * drawer can hold, and the pager has to count what the server would send.
 */
export default function ProductVendorsDrawer({ product, isDark = false, onClose }) {
  const api = process.env.REACT_APP_NETWORK;
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 25;

  const productId = product?.id;

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.get(`${api}/master-data/products/${productId}/vendors`, {
        params: { page, limit },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "The vendors for this product could not be loaded.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, productId, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (!product) return null;

  const money = (value, currency) =>
    value === null || value === undefined ? null : `${currency || ""} ${Number(value).toFixed(2)}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl h-full flex flex-col shadow-2xl border-l transition-colors ${isDark
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-900"}`}
      >
        <div className={`px-5 py-4 border-b flex items-start justify-between gap-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Truck size={15} className="text-indigo-500 shrink-0" />
              <h2 className="text-sm font-bold truncate">Vendors for this product</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {product.name}
              {product.sku ? ` · ${product.sku}` : ""}
              {total ? ` · ${total} vendor${total === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-6 justify-center">
              <Loader2 size={14} className="animate-spin" />
              Loading vendors…
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="text-center py-10 px-4">
              <Package size={22} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">No vendor is linked to this product yet</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                A vendor appears here once they are linked on the product, or once a quote from
                them is awarded on a line carrying this product.
              </p>
            </div>
          )}

          {!loading && !error && rows.map((r) => (
            <div
              key={r.link_id}
              className={`rounded-xl border p-3 ${isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50/60"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href={`/master-data/suppliers/${r.supplier_id}`}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate inline-flex items-center gap-1"
                    >
                      {r.name}
                      <ExternalLink size={10} className="opacity-60" />
                    </a>
                    {r.is_preferred && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Star size={8} /> PREFERRED
                      </span>
                    )}
                    {!r.is_active && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {[r.code, r.country].filter(Boolean).join(" · ")}
                    {r.factory_code ? ` · their code ${r.factory_code}` : ""}
                  </p>
                </div>
                {money(r.unit_cost, r.currency) && (
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums">{money(r.unit_cost, r.currency)}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">agreed cost</p>
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                {r.min_order_qty !== null && r.min_order_qty !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <Package size={10} className="text-slate-400" />
                    minimum {r.min_order_qty}
                  </span>
                )}
                {r.lead_time_days !== null && r.lead_time_days !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} className="text-slate-400" />
                    {r.lead_time_days} day lead time
                  </span>
                )}
                {r.vendor_product_name && (
                  <span className="truncate">called “{r.vendor_product_name}”</span>
                )}
              </div>

              {/* What this company actually paid, last time. Another company's
                  order on the same shared vendor is not shown here. */}
              {r.last_order_date && (
                <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                  last ordered {new Date(r.last_order_date).toLocaleDateString()}
                  {r.last_po_number ? ` on ${r.last_po_number}` : ""}
                  {money(r.last_unit_price, r.currency) ? ` at ${money(r.last_unit_price, r.currency)}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>

        {pages > 1 && (
          <div className={`px-5 py-3 border-t flex items-center justify-between text-[11px] ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <span className="text-slate-500 dark:text-slate-400">
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
