import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitMerge,
  Loader2,
  Package,
  Quote as QuoteIcon,
  ShieldCheck,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { getCountryFlag, formatCountryDisplay } from "../../../utils/countries";
import { mediaUrl } from "../../../utils/mediaUrl";

/**
 * One vendor, and everything attached to it.
 *
 * The directory could only ever show a row. The questions a buyer actually has
 * before using or retiring a vendor -- what do we buy from them, what is
 * outstanding, what did they last quote, who are they, and what breaks if they
 * go -- each need their own tab, and each is paged on the server.
 */

const TABS = [
  { key: "overview", label: "Overview", icon: Building },
  { key: "products", label: "Products", icon: Package },
  { key: "orders", label: "Purchase orders", icon: FileText },
  { key: "quotes", label: "Quotes", icon: QuoteIcon },
  { key: "identity", label: "Identity", icon: ShieldCheck },
];

const IDENTIFIER_TYPES = ["TAX", "VAT", "REGISTRATION", "GLN", "DUNS", "LEI", "OTHER"];

export default function SupplierProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  // Each tab keeps its own page, so moving between them does not reset the
  // others or re-ask for rows already on screen.
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [tabPage, setTabPage] = useState({ products: 1, orders: 1, quotes: 1 });

  const [showRetire, setShowRetire] = useState(false);
  const [retireReason, setRetireReason] = useState("");
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeReason, setMergeReason] = useState("");
  const [mergePreview, setMergePreview] = useState(null);
  const [mergeCandidates, setMergeCandidates] = useState([]);
  const [busy, setBusy] = useState(false);

  const [newIdentifier, setNewIdentifier] = useState({ id_type: "REGISTRATION", value: "", country: "", is_primary: false });

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true",
  }), [token]);

  const api = process.env.REACT_APP_NETWORK;

  const describeError = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d?.msg).filter(Boolean).join("; ") || fallback;
    if (detail && typeof detail === "object") return detail.message || fallback;
    return fallback;
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${api}/master-data/suppliers/${id}/profile`, { headers });
      setProfile(res.data);
    } catch (err) {
      toast.error(describeError(err, "Could not open this supplier."));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [api, headers, id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const loadTab = useCallback(async (which) => {
    if (!["products", "orders", "quotes"].includes(which)) return;
    setTabLoading(true);
    try {
      const res = await axios.get(`${api}/master-data/suppliers/${id}/${which}`, {
        headers,
        params: { page: tabPage[which] || 1, limit: 25 },
      });
      setTabData((prev) => ({ ...prev, [which]: res.data }));
    } catch (err) {
      // A refused quote tab is an answer, not a failure: it needs financial
      // access, and the tab says so rather than looking empty.
      setTabData((prev) => ({
        ...prev,
        [which]: { items: [], total: 0, pages: 1, error: describeError(err, "Could not load this tab.") },
      }));
    } finally {
      setTabLoading(false);
    }
  }, [api, headers, id, tabPage]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  const loadMergeCandidates = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/master-data/suppliers`, {
        headers,
        params: { page: 1, limit: 200, active_only: false, sort_by: "name" },
      });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setMergeCandidates(items.filter((s) => String(s.id) !== String(id)));
    } catch {
      setMergeCandidates([]);
    }
  }, [api, headers, id]);

  const previewMerge = async (targetId) => {
    setMergeTargetId(targetId);
    setMergePreview(null);
    if (!targetId) return;
    try {
      const res = await axios.get(`${api}/master-data/suppliers/${id}/merge-preview`, {
        headers,
        params: { into_supplier_id: targetId },
      });
      setMergePreview(res.data);
    } catch (err) {
      toast.error(describeError(err, "Could not preview the merge."));
    }
  };

  const doMerge = async () => {
    setBusy(true);
    try {
      const res = await axios.post(
        `${api}/master-data/suppliers/${id}/merge`,
        { into_supplier_id: Number(mergeTargetId), reason: mergeReason },
        { headers }
      );
      toast.success(res.data?.message || "Merged.");
      navigate(`/master-data/suppliers/${res.data?.survivor_id || mergeTargetId}`);
    } catch (err) {
      toast.error(describeError(err, "Merge failed."));
    } finally {
      setBusy(false);
    }
  };

  const doRetire = async () => {
    setBusy(true);
    try {
      await axios.post(`${api}/master-data/suppliers/${id}/retire`, { reason: retireReason }, { headers });
      toast.success("Supplier retired.");
      navigate("/master-data/suppliers");
    } catch (err) {
      toast.error(describeError(err, "Could not retire this supplier."));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (!profile) return;
    const next = !profile.is_active;
    try {
      await axios.put(`${api}/master-data/suppliers/${id}`, { is_active: next }, { headers });
      toast.success(next ? "Reactivated." : "Deactivated — existing history is untouched.");
      loadProfile();
    } catch (err) {
      toast.error(describeError(err, "Could not change the status."));
    }
  };

  const addIdentifier = async () => {
    if (!newIdentifier.value.trim()) {
      toast.error("An identifier needs a value.");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${api}/master-data/suppliers/${id}/identifiers`, newIdentifier, { headers });
      setNewIdentifier({ id_type: "REGISTRATION", value: "", country: "", is_primary: false });
      toast.success("Identifier recorded.");
      loadProfile();
    } catch (err) {
      toast.error(describeError(err, "Could not record that identifier."));
    } finally {
      setBusy(false);
    }
  };

  const verifyIdentifier = async (identifierId) => {
    try {
      await axios.post(`${api}/master-data/suppliers/${id}/identifiers/${identifierId}/verify`, {}, { headers });
      toast.success("Marked as verified.");
      loadProfile();
    } catch (err) {
      toast.error(describeError(err, "Could not verify that identifier."));
    }
  };

  const removeIdentifier = async (identifierId) => {
    if (!window.confirm("Remove this identifier? The record of it stays in the audit log.")) return;
    try {
      await axios.delete(`${api}/master-data/suppliers/${id}/identifiers/${identifierId}`, { headers });
      loadProfile();
    } catch (err) {
      toast.error(describeError(err, "Could not remove that identifier."));
    }
  };

  const card = `rounded-2xl border ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"} p-4 sm:p-5`;

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin inline-block mr-2 text-indigo-500" />
        Loading supplier…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-slate-500">This supplier could not be opened.</p>
        <button
          type="button"
          onClick={() => navigate("/master-data/suppliers")}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700"
        >
          Back to the directory
        </button>
      </div>
    );
  }

  const canEdit = profile.permissions?.can_edit;
  const usage = profile.usage || {};
  const completeness = profile.completeness || { filled: 0, of: 0, missing: [] };
  const page = tabData[tab] || {};

  const pager = (which) => (
    <div className="flex items-center justify-between gap-3 text-xs pt-3">
      <span className="text-slate-500 dark:text-slate-400">
        {page.total ? `${page.items?.length || 0} of ${page.total} · page ${page.page || 1} of ${page.pages || 1}` : "Nothing here yet"}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={(page.page || 1) <= 1 || tabLoading}
          onClick={() => setTabPage((p) => ({ ...p, [which]: Math.max(1, (p[which] || 1) - 1) }))}
          className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          disabled={(page.page || 1) >= (page.pages || 1) || tabLoading}
          onClick={() => setTabPage((p) => ({ ...p, [which]: (p[which] || 1) + 1 }))}
          className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/master-data/suppliers")}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            title="Back to the directory"
          >
            <ArrowLeft size={16} />
          </button>
          {profile.logo_url ? (
            <img
              src={mediaUrl(profile, "logo_url")}
              alt={profile.name}
              className="w-12 h-12 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white p-1"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-lg border border-indigo-500/20">
              {(profile.name || "V").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-bold">{profile.code || "no code"}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="text-sm leading-none">{getCountryFlag(profile.country)}</span>
                {profile.country ? formatCountryDisplay(profile.country) : "country not recorded"}
              </span>
              <span>·</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                profile.is_active
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}>
                {profile.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                profile.is_shared
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
              }`}>
                {profile.is_shared ? "ALL COMPANIES" : (profile.org_name || "ONE COMPANY").toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/master-data/suppliers/${id}/edit`)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={toggleActive}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {profile.is_active ? "Deactivate" : "Reactivate"}
            </button>
            <button
              type="button"
              onClick={() => { setShowMerge(true); loadMergeCandidates(); }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <GitMerge size={13} /> Merge
            </button>
            <button
              type="button"
              onClick={() => setShowRetire(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
            >
              Retire
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 -mb-px transition ${
              tab === key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${card} lg:col-span-2 space-y-3`}>
            <h2 className="text-sm font-bold">Contact and terms</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ["Contact person", profile.contact_person],
                ["Email", profile.email],
                ["Phone", profile.phone],
                ["Address", profile.address],
                ["Default currency", profile.default_currency],
                ["Payment terms", profile.payment_term?.name],
                ["Variance threshold", `${profile.variance_threshold_pct}%`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                  <dd className="text-slate-800 dark:text-slate-200 mt-0.5">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {profile.notes && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</dt>
                <dd className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line mt-0.5">{profile.notes}</dd>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className={card}>
              <h2 className="text-sm font-bold mb-2">What depends on this vendor</h2>
              {/* Shown here, not only in a retirement dialog: it is the answer
                  to "can we stop using them", and it is worth knowing before
                  anyone clicks anything. */}
              <ul className="text-xs space-y-1.5">
                {Object.entries(usage.counts || {}).map(([label, count]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{label.replace(/_/g, " ")}</span>
                    <span className="font-mono font-bold">{count}</span>
                  </li>
                ))}
              </ul>
              {usage.total === 0 && (
                <p className="text-xs text-slate-400 mt-2">Nothing yet — this vendor can be retired cleanly.</p>
              )}
            </div>

            <div className={card}>
              <h2 className="text-sm font-bold mb-2">Record completeness</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completeness.filled} of {completeness.of} fields documents and payments need.
              </p>
              {completeness.missing?.length > 0 && (
                <ul className="mt-2 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                  {completeness.missing.map((m) => <li key={m}>• {m} is missing</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className={card}>
          {tabLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Our code</th>
                      <th className="py-2 pr-3">Their code</th>
                      <th className="py-2 pr-3 text-right">Min order</th>
                      <th className="py-2 pr-3 text-right">Lead time</th>
                      <th className="py-2 pr-3 text-right">Last cost</th>
                      <th className="py-2 text-center">Preferred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(page.items || []).map((p) => (
                      <tr key={p.link_id}>
                        <td className="py-2 pr-3 font-bold text-slate-800 dark:text-slate-100">{p.name}</td>
                        <td className="py-2 pr-3 font-mono text-slate-500">{p.code || p.sku || "—"}</td>
                        <td className="py-2 pr-3 font-mono text-slate-500">{p.factory_code || "—"}</td>
                        <td className="py-2 pr-3 text-right font-mono">{p.min_order_qty ?? "—"}</td>
                        <td className="py-2 pr-3 text-right font-mono">{p.lead_time_days != null ? `${p.lead_time_days} d` : "—"}</td>
                        <td className="py-2 pr-3 text-right font-mono">
                          {p.unit_cost != null ? `${p.currency || ""} ${p.unit_cost.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 text-center">
                          {p.is_preferred ? <CheckCircle2 size={14} className="inline text-emerald-500" /> : "—"}
                        </td>
                      </tr>
                    ))}
                    {(page.items || []).length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-slate-400">
                        No products are linked to this vendor yet.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {pager("products")}
            </>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className={card}>
          {tabLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-3">Document</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3">Raised</th>
                      <th className="py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(page.items || []).map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        <td className="py-2 pr-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{o.po_number}</td>
                        <td className="py-2 pr-3">{o.doc_type}</td>
                        <td className="py-2 pr-3">{o.lifecycle_stage}</td>
                        <td className="py-2 pr-3 font-mono text-slate-500">{(o.order_date || "").slice(0, 10) || "—"}</td>
                        <td className="py-2 text-right font-mono">
                          {o.total_amount != null ? `${o.currency || ""} ${o.total_amount.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                    {(page.items || []).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">
                        No orders or requisitions for this vendor in your companies.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {pager("orders")}
            </>
          )}
        </div>
      )}

      {tab === "quotes" && (
        <div className={card}>
          {tabLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading…</p>
          ) : page.error ? (
            <p className="py-8 text-center text-xs text-amber-600 dark:text-amber-400">{page.error}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 pr-3">Quote</th>
                      <th className="py-2 pr-3">Against</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Lead time</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(page.items || []).map((q) => (
                      <tr
                        key={q.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        onClick={() => navigate(`/sourcing/compare/${q.po_id}`)}
                      >
                        <td className="py-2 pr-3 font-mono">{q.quote_reference || `#${q.id}`}</td>
                        <td className="py-2 pr-3 font-mono text-indigo-600 dark:text-indigo-400">{q.po_number}</td>
                        <td className="py-2 pr-3 font-mono text-slate-500">{q.quote_date || "—"}</td>
                        <td className="py-2 pr-3">{q.status}</td>
                        <td className="py-2 pr-3 text-right font-mono">{q.lead_time_days != null ? `${q.lead_time_days} d` : "—"}</td>
                        <td className="py-2 text-right font-mono">{`${q.currency || ""} ${(q.total_quoted_amount || 0).toFixed(2)}`}</td>
                      </tr>
                    ))}
                    {(page.items || []).length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">
                        This vendor has not quoted yet.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {pager("quotes")}
            </>
          )}
        </div>
      )}

      {tab === "identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={card}>
            <h2 className="text-sm font-bold mb-1">Identifiers</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              A tax or registration number is what proves this is the company you think it is,
              and "same country, same registration number" is a far stronger duplicate check
              than a similar name.
            </p>
            <ul className="space-y-2">
              {(profile.identifiers || []).map((ident) => (
                <li key={ident.id} className="flex items-center justify-between gap-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2">
                  <div>
                    <span className="font-bold">{ident.id_type}</span>
                    <span className="font-mono ml-2">{ident.value}</span>
                    {ident.country && <span className="text-slate-400 ml-2">{ident.country}</span>}
                    <div className="mt-0.5">
                      {ident.verified ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          VERIFIED {ident.verified_at ? `· ${ident.verified_at.slice(0, 10)}` : ""}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">AS CLAIMED — NOT CHECKED</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!ident.verified && (
                        <button
                          type="button"
                          onClick={() => verifyIdentifier(ident.id)}
                          className="p-1 text-slate-400 hover:text-emerald-600"
                          title="Mark as checked against a register"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeIdentifier(ident.id)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {(profile.identifiers || []).length === 0 && (
                <li className="text-xs text-slate-400">Nothing recorded yet.</li>
              )}
            </ul>

            {canEdit && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={newIdentifier.id_type}
                    onChange={(e) => setNewIdentifier((n) => ({ ...n, id_type: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  >
                    {IDENTIFIER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Number"
                    value={newIdentifier.value}
                    onChange={(e) => setNewIdentifier((n) => ({ ...n, value: e.target.value }))}
                    className="flex-1 min-w-[140px] px-2 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={newIdentifier.country}
                    onChange={(e) => setNewIdentifier((n) => ({ ...n, country: e.target.value }))}
                    className="w-28 px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addIdentifier}
                    disabled={busy}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={card}>
            <h2 className="text-sm font-bold mb-1">Network</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {profile.linked_org_id
                ? "This vendor's own tenant is linked."
                : "Not linked to a vendor tenant. Linking does not exist yet — the record simply leaves room for it."}
            </p>
          </div>
        </div>
      )}

      {/* Retire, with the reason on the record */}
      {showRetire && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 z-50">
          <div className={`w-full max-w-md rounded-2xl ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Retire {profile.name}</h3>
              <button type="button" onClick={() => setShowRetire(false)} className="p-1 text-slate-400"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              It leaves the directory for new work. Every document that already names it is
              untouched and stays readable. {usage.total ? `${usage.total} record(s) reference this vendor.` : ""}
            </p>
            <textarea
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
              placeholder="Why is this vendor being retired?"
              rows={3}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRetire(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={doRetire}
                disabled={retireReason.trim().length < 5 || busy}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
                title={retireReason.trim().length < 5 ? "A reason is required" : undefined}
              >
                Retire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge two records that are one vendor */}
      {showMerge && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 z-50">
          <div className={`w-full max-w-lg rounded-2xl ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Merge {profile.name} into another record</h3>
              <button type="button" onClick={() => setShowMerge(false)} className="p-1 text-slate-400"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Everything pointing at this record is repointed at the survivor, which keeps every
              value it already has. This record is retired, not deleted.
            </p>
            <select
              value={mergeTargetId}
              onChange={(e) => previewMerge(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            >
              <option value="">Select the record that survives…</option>
              {mergeCandidates.map((c) => (
                <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ""}{c.name}</option>
              ))}
            </select>

            {mergePreview && (
              <div className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1">
                <p>
                  <span className="font-bold">{mergePreview.from?.name}</span>
                  {" ("}{mergePreview.from?.usage?.total || 0} record(s){") → "}
                  <span className="font-bold">{mergePreview.into?.name}</span>
                  {" ("}{mergePreview.into?.usage?.total || 0} record(s){")"}
                </p>
                {mergePreview.fields_to_fill?.length > 0 && (
                  <p className="text-slate-500 dark:text-slate-400">
                    Fills on the survivor: {mergePreview.fields_to_fill.join(", ")}
                  </p>
                )}
                {mergePreview.identifiers_to_move?.length > 0 && (
                  <p className="text-slate-500 dark:text-slate-400">
                    Moves {mergePreview.identifiers_to_move.length} identifier(s)
                  </p>
                )}
              </div>
            )}

            <textarea
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              placeholder="Why are these the same vendor?"
              rows={3}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowMerge(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={doMerge}
                disabled={!mergeTargetId || mergeReason.trim().length < 5 || busy}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
                title={mergeReason.trim().length < 5 ? "A reason is required" : undefined}
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
