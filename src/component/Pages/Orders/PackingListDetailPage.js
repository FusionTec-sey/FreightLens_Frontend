import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Printer, Pencil, Trash2, Container as ContainerIcon, FileSpreadsheet,
  Loader2, AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import openPackingListPdf from "./openPackingListPdf";

/**
 * One packing list, read in full.
 *
 * A route rather than a modal because the container drawer and the order page
 * both link here, and a modal has no address to link to.
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

export default function PackingListDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [pl, setPl] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/packing-lists/${id}`, {
        headers: headers(),
      });
      setPl(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load this packing list");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /** Lines grouped by the order they came from; hand-added goods last and
   *  clearly named, so they cannot be read as ordered. */
  const groups = useMemo(() => {
    if (!pl) return [];
    const byOrder = new Map();
    const offPo = [];
    (pl.items || []).forEach((it) => {
      if (!it.po_id) return offPo.push(it);
      const label = it.po_number || `Order #${it.po_id}`;
      if (!byOrder.has(label)) byOrder.set(label, []);
      byOrder.get(label).push(it);
    });
    const out = [...byOrder.entries()].map(([label, lines]) => ({ label, lines }));
    if (offPo.length) out.push({ label: "Not on any purchase order", lines: offPo, offPo: true });
    return out;
  }, [pl]);

  const removeList = async () => {
    const confirmedList = (pl?.status || "").toUpperCase() === "CONFIRMED";
    const ok = window.confirm(
      confirmedList
        ? `Void ${pl.packing_list_number}?

Its quantities go back to the purchase orders, which will show as unpacked again.`
        : `Delete draft ${pl.packing_list_number}?`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${process.env.REACT_APP_NETWORK}/packing-lists/${id}`,
        { headers: headers() }
      );
      toast.success(res.data?.message || "Removed");
      navigate("/packing-lists");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not remove this packing list");
    }
  };

  const openPdf = () => openPackingListPdf(id, pl?.packing_list_number);

  if (loading) {
    return (
      <div className={`p-6 ${theme.background} min-h-screen flex items-center justify-center text-gray-400 gap-2`}>
        <Loader2 size={18} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (!pl) {
    return (
      <div className={`p-6 ${theme.background} min-h-screen`}>
        <button onClick={() => navigate("/packing-lists")} className="text-sm text-blue-600 inline-flex items-center gap-1">
          <ArrowLeft size={15} /> Back to packing lists
        </button>
        <p className="mt-6 text-sm text-gray-500">This packing list could not be found.</p>
      </div>
    );
  }

  const isDraft = (pl.status || "").toUpperCase() === "DRAFT";
  const totalQty = (pl.items || []).reduce((n, it) => n + Number(it.quantity_packed || 0), 0);

  return (
    <div className={`p-4 md:p-6 space-y-5 ${theme.background} min-h-screen`}>
      <button
        onClick={() => navigate("/packing-lists")}
        className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Packing lists
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-blue-500" size={22} />
              <span className="font-mono">{pl.packing_list_number}</span>
            </h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              STATUS_PILL[(pl.status || "").toUpperCase()] || STATUS_PILL.RECEIVED
            }`}>
              {pl.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
            {pl.container_no && (
              <span className="inline-flex items-center gap-1">
                <ContainerIcon size={13} /> <span className="font-mono">{pl.container_no}</span>
              </span>
            )}
            {pl.date_issued && <span>Issued {pl.date_issued}</span>}
            {pl.supplier_invoice_ref && <span>Invoice {pl.supplier_invoice_ref}</span>}
          </p>
        </div>

        <div className="flex gap-2">
          {isDraft && (
            <button
              onClick={() => navigate(`/packing-lists?edit=${pl.id}`)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium inline-flex items-center gap-2"
            >
              <Pencil size={14} /> Edit draft
            </button>
          )}
          <button
            onClick={openPdf}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={removeList}
            title={isDraft ? "Delete this draft" : "Void this packing list and give its quantities back"}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-300 inline-flex items-center gap-2 transition"
          >
            <Trash2 size={14} /> {isDraft ? "Delete" : "Void"}
          </button>
        </div>
      </div>

      {isDraft && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <AlertTriangle size={13} />
          This is a draft. Nothing has been counted against the purchase orders yet, and it prints watermarked.
        </p>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Packages", pl.package_count ?? "—"],
          ["Gross weight", pl.total_gross_weight ? `${pl.total_gross_weight} kg` : "—"],
          ["Volume", pl.total_cbm ? `${pl.total_cbm} CBM` : "—"],
          ["Lines", `${pl.line_count}${pl.off_po_line_count ? ` · ${pl.off_po_line_count} off-PO` : ""}`],
        ].map(([label, value]) => (
          <div key={label} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
            <div className="text-sm font-semibold mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Lines */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase text-[10px]">
            <tr>
              <th className="p-3">Item code</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Packed</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Cartons</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {groups.map((group) => (
              <React.Fragment key={group.label}>
                <tr className="bg-gray-50/70 dark:bg-gray-800/30">
                  <td colSpan={5} className={`px-3 py-1.5 font-semibold text-[11px] ${
                    group.offPo ? "text-gray-500" : "text-blue-600 dark:text-blue-400"
                  }`}>
                    {group.label}
                  </td>
                </tr>
                {group.lines.map((it) => (
                  <tr key={it.id}>
                    <td className="p-3 font-mono text-gray-500">{it.item_code || "—"}</td>
                    <td className="p-3">
                      <div className="font-medium">{it.description}</div>
                      {it.notes && <div className="text-[10px] text-amber-600 mt-0.5">{it.notes}</div>}
                    </td>
                    <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {it.quantity_packed}
                    </td>
                    <td className="p-3 text-gray-500">{it.unit}</td>
                    <td className="p-3 text-gray-500">{it.carton_numbers || "—"}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <td colSpan={2} className="p-3 font-semibold">
                {pl.line_count} line{pl.line_count === 1 ? "" : "s"} across{" "}
                {(pl.purchase_orders || []).length} purchase order
                {(pl.purchase_orders || []).length === 1 ? "" : "s"}
              </td>
              <td className="p-3 text-right font-bold">{totalQty}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {pl.notes && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Notes</div>
          <p className="text-sm">{pl.notes}</p>
        </div>
      )}
    </div>
  );
}
