import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Eye,
  Trash2,
  Mail,
  Phone,
  Loader2,
  Power,
  PowerOff
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { getCountryFlag, formatCountryDisplay } from "../../../utils/countries";
import { mediaUrl } from "../../../utils/mediaUrl";

export default function SuppliersMasterPage() {
  const { isRoot } = useAuth();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  // Paging, searching and filtering all happen on the server. The screen used
  // to pull every vendor and filter in the browser, which works at 136 and not
  // at ten times that.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);


  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true"
  }), [token]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        active_only: false,
        sort_by: "name",
        sort_dir: "asc",
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (currencyFilter !== "ALL") params.currency = currencyFilter;
      if (statusFilter !== "ALL") params.status = statusFilter.toLowerCase();

      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/master-data/suppliers`,
        { headers, params }
      );
      const body = res.data || {};
      setSuppliers(Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : []));
      setTotal(Number(body.total ?? 0));
      setPages(Number(body.pages ?? 1));
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      toast.error("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [headers, page, limit, searchQuery, currencyFilter, statusFilter]);


  // Typing is debounced so a search is one request, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { loadSuppliers(); }, 300);
    return () => clearTimeout(timer);
  }, [loadSuppliers]);

  // A new filter starts at the first page; staying on page 4 of a narrower
  // result is how a screen shows nothing and looks broken.
  useEffect(() => { setPage(1); }, [searchQuery, currencyFilter, statusFilter, limit]);

  const loadAllData = () => { loadSuppliers(); };

  // Registering or editing a vendor happens on its own screen now: the dialog
  // could not hold what the record is growing into, and a half-filled vendor is
  // worth keeping rather than losing to a stray click outside a modal.
  const handleOpenCreateModal = () => navigate("/master-data/suppliers/new");

  const handleOpenEditModal = (sup) =>
    navigate(`/master-data/suppliers/${sup.id || sup.supplier_id}/edit`);

  const handleToggleActive = async (sup) => {
    const id = sup.id || sup.supplier_id;
    const next = !sup.is_active;
    // Deactivation is not deletion: the vendor stays in the directory and in
    // every document that already names it, and only becomes unavailable for
    // new orders and quotes.
    const question = next
      ? `Reactivate '${sup.name}' so new orders and quotes can use it again?`
      : `Deactivate '${sup.name}'? It stays in the directory and in its history, but cannot be used on new orders or quotes.`;
    if (!window.confirm(question)) return;
    try {
      await axios.put(
        `${process.env.REACT_APP_NETWORK}/master-data/suppliers/${id}`,
        { is_active: next },
        { headers }
      );
      toast.success(next ? `'${sup.name}' reactivated.` : `'${sup.name}' deactivated.`);
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change supplier status.");
    }
  };

  const handleDelete = async (sup) => {
    const id = sup.id || sup.supplier_id;
    if (!window.confirm(`Delete supplier '${sup.name}'?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/master-data/suppliers/${id}`, { headers });
      toast.success("Supplier deleted.");
      loadAllData();
    } catch (err) {
      toast.error("Failed to delete supplier.");
    }
  };

  // Searching, filtering and paging are the server's job now, so the rows that
  // arrive are the rows to draw.
  const filteredSuppliers = suppliers;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Suppliers Master Directory
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage global vendors, contract terms, default trade currencies, and cashflow binding.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>New Supplier</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, code, contact, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* A retired vendor stays in the directory and history; it is simply
            unavailable for new work, so the filter has to be able to find it. */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-bold mr-1">Status:</span>
          {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Currency Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-bold mr-1">Currency:</span>
          {["ALL", "USD", "EUR", "CNY", "SCR", "AED"].map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setCurrencyFilter(curr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                currencyFilter === curr
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Supplier / Vendor</th>
                <th className="py-2.5 px-3">Contact Person & Country</th>
                <th className="py-2.5 px-3">Contact Details</th>
                <th className="py-2.5 px-3 text-center">Default Currency</th>
                <th className="py-2.5 px-3">Bound Payment Terms</th>
                <th className="py-2.5 px-3 text-center">Access</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <Loader2 size={16} className="animate-spin inline-block mr-2 text-indigo-500" />
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No suppliers found matching your query.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id || s.supplier_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500">
                      {/* Read from the row. It used to be computed from the id
                          when none was stored, so the code on screen existed
                          nowhere and could not be searched. */}
                      {s.code || <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        {s.logo_url ? (
                          <img
                            src={mediaUrl(s, "logo_url")}
                            alt={s.name}
                            className="w-7 h-7 rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20 shrink-0">
                            {s.name ? s.name.charAt(0).toUpperCase() : "V"}
                          </div>
                        )}
                        {/* Who may use the vendor is its own column now, so the
                            name stands alone and one vendor is one row. */}
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/master-data/suppliers/${s.id || s.supplier_id}`)}
                            className="text-left hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                            title="Open this vendor: products, orders, quotes and who they are"
                          >
                            {s.name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      <div>{s.contact_person || "—"}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-sm leading-none">{getCountryFlag(s.country)}</span>
                        <span>{formatCountryDisplay(s.country)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={11} className="text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <Phone size={10} className="text-slate-400" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {!s.email && !s.phone && "—"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {s.default_currency || "USD"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {s.payment_term ? (
                        <div className="space-y-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                            {s.payment_term.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.payment_term.advance_pct}% Adv • {s.payment_term.balance_pct}% Bal ({s.payment_term.balance_trigger})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No terms bound</span>
                      )}
                    </td>
                    {/* Which companies may quote this vendor. A shared vendor is
                        one row usable by all of them, rather than one row per
                        company with the same name on each. */}
                    <td className="py-2 px-3 text-center">
                      {s.is_shared ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          ALL COMPANIES
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20"
                          title="Only this company can quote this vendor"
                        >
                          {(s.org_name || `COMPANY ${s.org_id ?? "?"}`).toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          s.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {s.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/master-data/suppliers/${s.id || s.supplier_id}`)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                          title="Profile — products, purchase orders, quotes and identity"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(s)}
                          disabled={s.is_shared && !isRoot}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={s.is_shared && !isRoot ? "Shared suppliers are managed by the root organisation" : "Edit Supplier"}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(s)}
                          disabled={s.is_shared && !isRoot}
                          className="p-1 text-slate-400 hover:text-amber-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={s.is_active ? "Deactivate — keeps history, blocks new orders and quotes" : "Reactivate"}
                        >
                          {s.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          disabled={s.is_shared && !isRoot}
                          className="p-1 text-slate-400 hover:text-rose-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={s.is_shared && !isRoot ? "Shared suppliers are managed by the root organisation" : "Delete Supplier"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Always visible, so how many vendors there are and where you are in
            them is never a guess. */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            {total === 0 ? "No vendors" : (
              <>
                Showing <span className="font-bold text-slate-700 dark:text-slate-200">{suppliers.length}</span>
                {" of "}
                <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span>
                {" vendor"}{total === 1 ? "" : "s"}
                {" · page "}{page} of {pages}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
