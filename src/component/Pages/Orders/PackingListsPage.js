import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileSpreadsheet, Plus, Search, Eye, X, Printer, Pencil, Trash2, RotateCcw,
  Container as ContainerIcon,
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import PackingListBuilderModal from "./PackingListBuilderModal";
import EntityPrintModal from "../ReportTemplates/EntityPrintModal";
import RevisePackingListModal from "./RevisePackingListModal";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const [loadError, setLoadError] = useState(false);
  const tableRef = useRef(null);
  const requestIdRef = useRef(0);
  const [viewingList, setViewingList] = useState(null);
  const [revising, setRevising] = useState(null);
  const [printing, setPrinting] = useState(null);


  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const plRes = await axios.get(`${process.env.REACT_APP_NETWORK}/packing-lists`, {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (requestId !== requestIdRef.current) return;
      const result = plRes.data;
      setPackingLists(result.items || []);
      setTotalCount(result.total || 0);
      setTotalPages(result.pages || 1);
      if (page > result.pages && result.pages >= 1) setPage(result.pages);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setPackingLists([]);
      setLoadError(true);
      toast.error("Failed to load packing lists");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



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

  const goToPage = (nextPage) => {
    setPage(nextPage);
    setJumpPage("");
    if (tableRef.current) tableRef.current.scrollTop = 0;
  };

  return (
    <div className={`flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4 md:p-5 ${theme.background}`}>
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-500" /> Packing Lists
          </h1>
          <p className="mt-1 text-sm text-gray-500">Supplier packing lists and carton allocations.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} /> New Packing List
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            aria-label="Search packing lists"
            placeholder="Search packing list #, PO, invoice..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              goToPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {["ALL", "DRAFT", "CONFIRMED", "SHIPPED", "RECEIVED"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                goToPage(1);
              }}
              aria-pressed={statusFilter === s}
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

      {/* The table is the only scrolling region; keep the heading and filters visible. */}
      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-gray-500">Loading packing lists...</div>
      ) : loadError ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>Could not load packing lists.</span>
          <button type="button" onClick={fetchData} className="text-blue-600 hover:underline dark:text-blue-400">Retry</button>
        </div>
      ) : packingLists.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">{searchQuery || statusFilter !== "ALL" ? "No matching packing lists" : "No packing lists yet"}</h3>
          <p className="mt-1 text-sm text-gray-500">{searchQuery || statusFilter !== "ALL" ? "Try another search or status." : "Add a supplier packing list to get started."}</p>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div ref={tableRef} className="min-h-0 min-w-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2.5">Packing List #</th>
                <th className="px-3 py-2.5">Container</th>
                <th className="px-3 py-2.5">Purchase Orders</th>
                <th className="px-3 py-2.5">Lines</th>
                <th className="px-3 py-2.5">Invoice Ref</th>
                <th className="px-3 py-2.5">Packages / Weight</th>
                <th className="px-3 py-2.5">Date Issued</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {packingLists.map((pl) => (
                <tr
                  key={pl.id}
                  onClick={() => navigate(`/packing-lists/${pl.id}`)}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
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
                  <td className="px-3 py-2.5">
                    {pl.container_no ? (
                      <span className="inline-flex items-center gap-1 font-mono text-sm">
                        <ContainerIcon size={12} className="text-gray-400" />
                        {pl.container_no}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(pl.purchase_orders || []).slice(0, 2).map((po) => (
                        <span
                          key={po.id}
                          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800"
                        >
                          {po.po_number}
                        </span>
                      ))}
                      {(pl.purchase_orders || []).length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{pl.purchase_orders.length - 2} more
                        </span>
                      )}
                      {!(pl.purchase_orders || []).length && (
                        <span className="text-gray-400 text-xs">{pl.po_number || "—"}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">
                    {pl.line_count} lines
                    {pl.off_po_line_count > 0 && (
                      <span className="block text-xs text-gray-500">
                        {pl.off_po_line_count} off-PO
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{pl.supplier_invoice_ref || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">
                    {pl.package_count ? `${pl.package_count} pkgs` : "-"} • {pl.total_gross_weight ? `${pl.total_gross_weight} kg` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{pl.date_issued || "-"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                        STATUS_PILL[(pl.status || "").toUpperCase()] || STATUS_PILL.RECEIVED
                      }`}
                    >
                      {pl.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => navigate(`/packing-lists/${pl.id}`)}
                        aria-label={`View ${pl.packing_list_number}`}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Eye size={14} /> View
                      </button>
                      {(pl.status || "").toUpperCase() === "DRAFT" ? (
                        <button
                          onClick={() => setSearchParams({ edit: String(pl.id) })}
                          aria-label={`Edit ${pl.packing_list_number}`}
                          title="Edit this draft"
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                        >
                          <Pencil size={14} />
                        </button>
                      ) : (pl.status || "").toUpperCase() === "CONFIRMED" ? (
                        <button
                          onClick={() => setRevising(pl)}
                          aria-label={`Reopen ${pl.packing_list_number} for editing`}
                          title="Reopen this list for editing, with a reason"
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 hover:text-amber-600 text-xs transition"
                        >
                          <RotateCcw size={14} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => setPrinting(pl)}
                        aria-label={`Print ${pl.packing_list_number}`}
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
                        aria-label={`${(pl.status || "").toUpperCase() === "CONFIRMED" ? "Void" : "Delete"} ${pl.packing_list_number}`}
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
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
            <span>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records</span>
            <div className="flex items-center gap-2">
              <label htmlFor="packing-list-page-size">Rows</label>
              <select
                id="packing-list-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  goToPage(1);
                }}
                className="rounded border border-gray-300 bg-white px-1.5 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <button type="button" onClick={() => goToPage(1)} disabled={page === 1} className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800">First</button>
              <span className="whitespace-nowrap">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Next
              </button>
              <button type="button" onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800">Last</button>
              {totalPages > 2 && (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = Number(jumpPage);
                    if (Number.isInteger(target) && target >= 1 && target <= totalPages) goToPage(target);
                  }}
                >
                  <label htmlFor="packing-list-jump-page">Go to</label>
                  <input
                    id="packing-list-jump-page"
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    className="w-14 rounded border border-gray-300 bg-white px-1.5 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button type="submit" className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Go</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <PackingListBuilderModal
        open={showModal || Boolean(editingId)}
        packingListId={editingId}
        onClose={() => {
          setShowModal(false);
          if (editingId) setSearchParams({});
        }}
        onSaved={() => {
          if (page === 1) fetchData();
          else goToPage(1);
        }}
      />

      {printing && (
        <EntityPrintModal
          isOpen
          onClose={() => setPrinting(null)}
          entityType="PackingList"
          entityId={printing.id}
          entityIdentifier={printing.packing_list_number}
          title={`Print Packing List — ${printing.packing_list_number}`}
        />
      )}

      <RevisePackingListModal
        open={Boolean(revising)}
        packingList={revising}
        onClose={() => setRevising(null)}
        onRevised={(pl) => {
          fetchData();
          // Straight into the editor: reopening is only ever a prelude to one.
          if (pl?.id) setSearchParams({ edit: String(pl.id) });
        }}
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
