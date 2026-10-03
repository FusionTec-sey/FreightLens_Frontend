import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import { locationError } from "../../../../services/inventoryLocationsApi";
import CostPoolValuations from "./CostPoolValuations";

export default function CostPoolSetup({ api, branch, orgId, userId, canManage, canViewValues = false, canManageValues = false, canViewEvidence = false, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [binding, setBinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [failure, setFailure] = useState({ message: "", fields: {} });
  const [saving, setSaving] = useState(false);
  const [valuationPool, setValuationPool] = useState(null);
  const busy = useRef(false);
  const lifecycle = useRef(null);
  const heading = useRef(null);
  const branchId = branch?.id;
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 rounded-lg border cursor-pointer hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40";
  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    heading.current?.focus();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([api.listPools(page, limit, controller.signal), branchId ? api.branchPool(branchId, controller.signal) : Promise.resolve({ data: null })])
      .then(([pools, assignment]) => {
        if (!controller.signal.aborted) { setData(pools.data); setBinding(assignment.data); }
      }).catch((err) => { if (!controller.signal.aborted) setError(locationError(err).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, branchId, page, limit, revision]);
  const cancel = () => {
    setForm(null); setSelected(null); setFailure({ message: "", fields: {} });
    requestAnimationFrame(() => heading.current?.focus());
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy.current || !canManage) return;
    const fields = {};
    if (form) {
      if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(form.code.trim().toUpperCase())) fields.code = "Enter a code of 1–32 letters, numbers, underscores or hyphens, starting with a letter or number.";
      if (!form.name.trim()) fields.name = "Enter a name.";
    }
    if (Object.keys(fields).length) { setFailure({ message: "Check the highlighted fields.", fields }); return; }
    busy.current = true; setSaving(true); setFailure({ message: "", fields: {} });
    const controller = lifecycle.current;
    try {
      if (form) {
        await api.createPool({ code: form.code.trim().toUpperCase(), name: form.name.trim() }, controller.signal);
      } else {
        if (!branch?.is_active || binding || !selected) return;
        const response = await api.assignPool(branch.id, selected.id, controller.signal);
        if (!controller.signal.aborted) setBinding(response.data);
      }
      if (controller.signal.aborted) return;
      toast.success(form ? "Cost pool created. No stock was moved." : "Initial cost pool assigned. No stock was moved.");
      if (form) setPage(Math.max(1, Math.ceil((data.total + 1) / limit)));
      cancel(); setRevision((value) => value + 1);
    } catch (err) {
      if (!controller.signal.aborted) setFailure(locationError(err));
    } finally { busy.current = false; if (!controller.signal.aborted) setSaving(false); }
  };
  if (valuationPool?.api === api && canViewValues) return <CostPoolValuations key={valuationPool.pool.id} api={api} pool={valuationPool.pool} userId={userId} canManage={canManageValues} canViewEvidence={canViewEvidence} onClose={() => setValuationPool(null)} />;
  return <section aria-label="Cost pool setup" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3">
      <div><h1 ref={heading} tabIndex={-1} className="text-xl font-bold">{form ? "New cost pool" : "Cost pools"}</h1><p className="text-sm">Organisation #{orgId}{branch ? ` · ${branch.name}` : ""}</p></div>
      {!form && !selected && <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={onClose}>Back to {branch ? "locations" : "branches"}</button>
        <button type="button" className={button} onClick={() => setRevision((value) => value + 1)}>Refresh pools</button>
        {canManage && <button type="button" className={`${button} bg-indigo-600 text-white`} onClick={() => { setFailure({ message: "", fields: {} }); setForm({ code: "", name: "" }); }}>Add cost pool</button>}
      </div>}
    </header>
    <p className="text-sm shrink-0">A cost pool groups product valuation within one legal company. Physical quantities and store prices stay separate. Central writer status is read-only; an assigned writer does not enable live posting.</p>
    {form || selected ? <form onSubmit={save} className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {failure.message && <p role="alert" className="text-red-500">{failure.message}</p>}
        {form ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">{["code", "name"].map((key) => <div key={key} className="flex flex-col gap-1">
          <label htmlFor={`pool-${key}`}>{key === "code" ? "Pool code" : "Pool name"}</label>
          <input id={`pool-${key}`} autoFocus={key === "code"} value={form[key]} required maxLength={key === "code" ? 32 : 120} disabled={saving}
            aria-invalid={!!failure.fields[key]} aria-describedby={failure.fields[key] ? `pool-${key}-error` : undefined}
            className={`p-2 border rounded-lg ${panel} ${failure.fields[key] ? "border-red-500" : ""}`}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          {failure.fields[key] && <p id={`pool-${key}-error`} className="text-red-500">{failure.fields[key]}</p>}
        </div>)}</div> : <div><h2 className="font-semibold">Assign {branch.name} to {selected.code} — {selected.name}?</h2><p>This initial assignment cannot be changed in this screen. Future changes require an audited cutover. No historical stock or prices will be changed.</p></div>}
      </div>
      <footer className="shrink-0 border-t pt-3 flex gap-2"><button type="submit" className={`${button} bg-indigo-600 text-white`} disabled={saving || !canManage}>{saving ? "Saving…" : form ? "Save pool" : "Confirm assignment"}</button><button type="button" className={button} disabled={saving} onClick={cancel}>Cancel</button></footer>
    </form> : <>
      {branch && !loading && !error && <p className="shrink-0 text-sm">{binding ? `Assigned pool ID: ${binding.cost_pool_id}. Reassignment is not available.` : branch.is_active ? "No pool assigned. Select a pool below to review the initial assignment." : "This branch is inactive; assignment is blocked."}</p>}
      <div className={`flex-1 min-h-0 overflow-auto border rounded-xl ${panel}`} aria-busy={loading}>
        {loading ? <p role="status" className="p-4">Loading cost pools…</p> : error ? <p role="alert" className="p-4">{error} Use Refresh pools to retry.</p> : !data.items.length ? <p className="p-4">No cost pools in this organisation yet.</p> : <table className="w-full text-sm text-left">
          <thead className={`sticky top-0 ${panel}`}><tr>{["Code / ID", "Name", "Status", "Central writer", "Assignment", ...(canViewValues ? ["Valuation"] : [])].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
          <tbody>{data.items.map((pool) => <tr key={pool.id} className="border-t"><td className="p-3 font-mono whitespace-nowrap">{pool.code} / #{pool.id}</td><td className="p-3">{pool.name}</td><td className="p-3">{pool.is_active ? "Active" : "Inactive"}</td><td className="p-3">{{ NOT_CONFIGURED: "Not configured", ACTIVE: "Writer assigned", SUSPENDED: "Suspended" }[pool.central_authority_state] || "Status unavailable"}{pool.central_authority_epoch != null && <span className="block text-xs">Authority epoch {pool.central_authority_epoch}</span>}</td><td className="p-3">{binding?.cost_pool_id === pool.id ? "Assigned" : branch?.is_active && !binding && canManage && pool.is_active ? <button type="button" className={button} onClick={() => { setFailure({ message: "", fields: {} }); setSelected(pool); }}>Select {pool.code}</button> : "—"}</td>
            {canViewValues && <td className="p-3"><button type="button" className={button} onClick={() => setValuationPool({ api, pool })}>View {pool.code} valuations</button></td>}</tr>)}</tbody>
        </table>}
      </div>
      <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalCount={loading || error ? 0 : data.total} totalPages={loading || error ? 1 : data.pages} onPageChange={setPage} onPageSizeChange={(size) => { setLimit(size); setPage(1); }} isDark={isDark} /></div>
    </>}
  </section>;
}
