import React, { useEffect, useState } from "react";
import { X, Search, Check, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

/**
 * Pick products that are not on any purchase order.
 *
 * Whatever comes out of here becomes a line with no po_item_id, so nothing is
 * written back to an order. That is the point: dunnage, pallet wrap and the
 * other things that ride in a container were never ordered, and counting them
 * against an order's quantities would be wrong.
 */

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  skip_zrok_interstitial: "true",
});

export default function ProductPickerModal({ open, onClose, onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [chosen, setChosen] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setChosen({});
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products`, {
          params: { search: query.trim() || undefined, limit: 25 },
          headers: headers(),
        });
        setResults(res.data?.items || res.data?.data || []);
      } catch {
        toast.error("Could not search products");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  const toggle = (product) =>
    setChosen((prev) => {
      const next = { ...prev };
      if (next[product.id]) delete next[product.id];
      else next[product.id] = product;
      return next;
    });

  const picked = Object.values(chosen);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-sm">Add products</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the product master…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-lg">
            {loading && (
              <div className="p-4 text-xs text-gray-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="p-4 text-xs text-gray-400">No products match.</p>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{p.code || p.sku}</div>
                </div>
                {chosen[p.id] && <Check size={16} className="text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500">{picked.length} selected</span>
          <button
            onClick={() => onPick(picked)}
            disabled={!picked.length}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            Add to packing list
          </button>
        </div>
      </div>
    </div>
  );
}
