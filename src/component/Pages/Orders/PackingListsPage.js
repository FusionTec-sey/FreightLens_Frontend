import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet, Plus, Search, Eye, X, Printer, Pencil, Trash2,
  Container as ContainerIcon,
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import PackingListBuilderModal from "./PackingListBuilderModal";
import openPackingListPdf from "./openPackingListPdf";

const STATUS_PILL = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  RECEIVED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

/** Days a draft has been sitting. A draft reserves nothing, so a forgotten one
 *  is invisibly wrong -- the register is the only place it can surface. */
const draftAge = (pl) => {
  if ((pl.status || "").toUpperCase() !== "DRAFT" || !pl.created_at) return 0;
  return Math.floor((Date.now() - new Date(pl.created_at).getTime()) / 86400000);
};

export default function PackingListsPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // /packing-lists?edit=<id> opens the builder on that draft, so the detail
  // page and anything else can link straight to editing it.
  const editingId = searchParams.get("edit");

  const [packingLists, setPackingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewingList, setViewingList] = useState(null);


  const fetchData = async () => {
    setLoading(true);
    try {
      const plRes = await axios.get(`${process.env.REACT_APP_NETWORK}/packing-lists`, {
        params: { status: statusFilter === "ALL" ? undefined : statusFilter },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPackingLists(plRes.data || []);
    } catch (err) {
      toast.error("Failed to load packing lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);



  const removeList = async (pl) => {
    const confirmed = (pl.status || "").toUpperCase() === "CONFIRMED";
    const ok = window.confirm(
      confirmed
        ? `Void ${pl.packing_list_number}?\n\nIts quantities go back to the purchase orders, which will show as unpacked again.`
        : `Delete draft ${pl.packing_list_number}?`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${process.env.REACT_APP_NETWORK}/packing-lists/${pl.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(res.data?.message || "Removed");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not remove this packing list");
    }
  };

  const filteredLists = packingLists.filter(pl => {
    const s = searchQuery.toLowerCase();
    return (
      (pl.packing_list_number || "").toLowerCase().includes(s) ||
      (pl.po_number || "").toLowerCase().includes(s) ||
      (pl.container_no || "").toLowerCase().includes(s) ||
      (pl.purchase_orders || []).some((po) => (po.po_number || "").toLowerCase().includes(s)) ||
      (pl.supplier_invoice_ref || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className={`p-4 md:p-6 space-y-6 ${theme.background} min-h-screen`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-500" /> Packing Lists
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Supplier packing list register, weight/CBM totals, and carton allocations.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition"
        >
          <Plus size={18} /> New Packing List
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search packing list #, PO, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          {["ALL", "DRAFT", "CONFIRMED", "SHIPPED", "RECEIVED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading packing lists...</div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-800">
          <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">No Packing Lists Registered</h3>
          <p className="text-sm text-gray-500 mt-1">Add supplier packing lists to track container packing.</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="p-3.5">Packing List #</th>
                <th className="p-3.5">Container</th>
                <th className="p-3.5">Purchase Orders</th>
                <th className="p-3.5">Lines</th>
                <th className="p-3.5">Invoice Ref</th>
                <th className="p-3.5">Packages / Weight</th>
                <th className="p-3.5">Date Issued</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredLists.map((pl) => (
                <tr key={pl.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                  <td className="p-3.5 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    <div className="flex items-center gap-1.5">
                      {pl.packing_list_number}
                      {draftAge(pl) > 7 && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-500"
                          title={`Draft for ${draftAge(pl)} days. Nothing is reserved until it is confirmed.`}
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-3.5">
                    {pl.container_no ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <ContainerIcon size={12} className="text-gray-400" />
                        {pl.container_no}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(pl.purchase_orders || []).slice(0, 2).map((po) => (
                        <span
                          key={po.id}
                          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono"
                        >
                          {po.po_number}
                        </span>
                      ))}
                      {(pl.purchase_orders || []).length > 2 && (
                        <span className="text-[10px] text-gray-500">
                          +{pl.purchase_orders.length - 2} more
                        </span>
                      )}
                      {!(pl.purchase_orders || []).length && (
                        <span className="text-gray-400 text-xs">{pl.po_number || "—"}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300">
                    {pl.line_count} lines
                    {pl.off_po_line_count > 0 && (
                      <span className="block text-[10px] text-gray-400">
                        {pl.off_po_line_count} off-PO
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-gray-500 text-xs">{pl.supplier_invoice_ref || "-"}</td>
                  <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300">
                    {pl.package_count ? `${pl.package_count} pkgs` : "-"} • {pl.total_gross_weight ? `${pl.total_gross_weight} kg` : "-"}
                  </td>
                  <td className="p-3.5 text-gray-500 text-xs">{pl.date_issued}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        STATUS_PILL[(pl.status || "").toUpperCase()] || STATUS_PILL.RECEIVED
                      }`}
                    >
                      {pl.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => navigate(`/packing-lists/${pl.id}`)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Eye size={14} /> View
                      </button>
                      {(pl.status || "").toUpperCase() === "DRAFT" && (
                        <button
                          onClick={() => setSearchParams({ edit: String(pl.id) })}
                          title="Edit this draft"
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => openPackingListPdf(pl.id, pl.packing_list_number)}
                        title={
                          (pl.status || "").toUpperCase() === "DRAFT"
                            ? "Prints with a DRAFT watermark"
                            : "Print this packing list"
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        onClick={() => removeList(pl)}
                        title={
                          (pl.status || "").toUpperCase() === "CONFIRMED"
                            ? "Void this packing list and give its quantities back"
                            : "Delete this draft"
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-300 hover:text-rose-600 text-xs transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PackingListBuilderModal
        open={showModal || Boolean(editingId)}
        packingListId={editingId}
        onClose={() => {
          setShowModal(false);
          if (editingId) setSearchParams({});
        }}
        onSaved={fetchData}
      />

      {/* View Detail Modal */}
      {viewingList && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                  {viewingList.packing_list_number}
                </span>
                <h2 className="text-xl font-bold mt-2">{viewingList.po_number} Packing Details</h2>
              </div>
              <button onClick={() => setViewingList(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 font-semibold text-gray-500">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3 text-right">Packed Qty</th>
                      <th className="p-3">Cartons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(viewingList.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium">{it.description}</td>
                        <td className="p-3 text-right font-bold text-blue-600">{it.quantity_packed} {it.unit}</td>
                        <td className="p-3 text-gray-500">{it.carton_numbers || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
