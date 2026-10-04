import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import { locationError } from "../../../../services/inventoryLocationsApi";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import DraftSourcePicker from '../../Sales/DraftSourcePicker';
import CounterStockArea from './CounterStockArea';

export default function BranchCounters({ api, branch, canManage, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [form, setForm] = useState(null), [discard, setDiscard] = useState(false);
  const [choosingArea, setChoosingArea] = useState(false), [areaName, setAreaName] = useState('');
  const [inspectingArea, setInspectingArea] = useState(null);
  const loadAreas = useMemo(() => (page, limit, signal) => api.list(branch.id, page, limit, signal), [api, branch.id]);
  const controller = useRef(null), posting = useRef(false), original = useRef("");
  const { payloadFor, clear } = useOperationIntent();
  const editable = canManage && branch.is_active;
  const dirty = form && JSON.stringify(form) !== original.current;
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 disabled:opacity-40";
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError("");
    api.counters(branch.id, page, limit, request.signal).then(({ data }) => {
      if (!request.signal.aborted) setResult(data);
    }).catch((err) => { if (!request.signal.aborted) setError(locationError(err).message); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [api, branch.id, page, limit, reload]);
  const open = (row) => {
    if (!editable) return;
    if (!row && typeof window.crypto?.randomUUID !== "function") { setError("A secure browser connection is required to create counters."); return; }
    const value = row ? { ...row, config: { ...row.config } } : { counter_key: window.crypto.randomUUID(), code: "", version: 0, config: { name: "", purpose: "", is_enabled: false } };
    original.current = JSON.stringify(value); clear(); setForm(value); setError(""); setAreaName('');
  };
  const cancel = () => { if (dirty) setDiscard(true); else { setForm(null); setError(""); } };
  const save = async (event) => {
    event.preventDefault();
    if (posting.current || !editable) return;
    if (typeof window.crypto?.randomUUID !== "function") { setError("A secure browser connection is required to save counters."); return; }
    const payload = { expected_version: form.version, code: form.code.trim().toUpperCase(), config: form.config };
    posting.current = true; setSaving(true); setError("");
    const request = controller.current;
    try {
      await api.saveCounter(branch.id, form.counter_key, payloadFor(["counter-settings", branch.id, form.counter_key], payload), request.signal);
      if (request.signal.aborted) return;
      setForm(null); setDiscard(false); setReload((value) => value + 1); toast.success("Counter configuration saved; operational release gates still apply.");
    } catch (err) {
      if (!request.signal.aborted) { const issue = locationError(err); setError([issue.message, ...Object.entries(issue.fields).map(([key, message]) => `${key}: ${message}`)].join(" ")); }
    } finally { posting.current = false; if (!request.signal.aborted) setSaving(false); }
  };
  const setConfig = (key, value) => setForm({ ...form, config: { ...form.config, [key]: value } });
  if (inspectingArea) return <CounterStockArea api={api} branch={branch} counter={inspectingArea} onClose={() => { setInspectingArea(null); setReload(value => value + 1); }} />;
  if (choosingArea && form) return <DraftSourcePicker title="Choose preferred picking area" load={loadAreas}
    onClose={() => setChoosingArea(false)} onSelect={location => {
      setChoosingArea(false);
      if (!location.is_active || location.branch_id !== branch.id) { setError('Choose an active location in this branch.'); return; }
      setConfig('default_stock_location_id', location.id); setAreaName(location.name); setError('');
    }} />;
  return <section aria-label="Branch counters" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">{branch.name} — counters</h1>
      <p className="text-sm">Stable branch identities. No payment accounts, printer devices or stock balances are inferred.</p></div>
      {!form && <div className="flex gap-2"><button type="button" className={button} onClick={onClose}>Back to locations</button>
        <button type="button" className={button} onClick={() => setReload((value) => value + 1)}>Refresh counters</button>
        {editable && <button type="button" className={button} disabled={loading} onClick={() => open(null)}>Add counter</button>}</div>}</header>
    {error && <p role="alert" className="shrink-0">{error}</p>}
    {discard && <div role="alert">Discard unsaved counter changes?<button type="button" disabled={saving} className={button} onClick={() => setDiscard(false)}>Keep editing</button>
      <button type="button" disabled={saving} className={button} onClick={() => { setForm(null); setDiscard(false); setError(""); }}>Discard changes</button></div>}
    {form ? <form onSubmit={save} className="flex-1 min-h-0 flex flex-col gap-3">
      <fieldset disabled={saving} className="flex-1 min-h-0 overflow-auto space-y-4">
        <label className="block">Permanent code<input required maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,31}" disabled={form.version > 0} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={`block p-2 border rounded-lg ${panel}`} /></label>
        <label className="block">Display name<input required maxLength={120} value={form.config.name} onChange={(event) => setConfig("name", event.target.value)} className={`block p-2 border rounded-lg ${panel}`} /></label>
        <label className="block">Counter purpose<select required value={form.config.purpose} onChange={(event) => setConfig("purpose", event.target.value)} className={`block p-2 border rounded-lg ${panel}`}>
          <option value="">Choose explicitly</option><option value="CHECKOUT">Checkout</option><option value="COLLECTION">Collection</option><option value="BOTH">Checkout and collection</option></select></label>
        <label className="flex gap-2"><input type="checkbox" checked={form.config.is_enabled} onChange={(event) => setConfig("is_enabled", event.target.checked)} />Available for future authorised workflows</label>
        <section className="space-y-2"><h2 className="font-semibold">Preferred picking area</h2>
          <p>{form.config.default_stock_location_id ? areaName || `Location #${form.config.default_stock_location_id}` : 'No preference — eligible stock across this store may be allocated.'}</p>
          <button type="button" className={button} onClick={() => setChoosingArea(true)}>Choose preferred picking area</button>
          {form.config.default_stock_location_id && <button type="button" className={button} onClick={() => { setConfig('default_stock_location_id', null); setAreaName(''); }}>Clear preference</button>}
          <p className="text-sm">The usual counter is a workstation or specialism, not a product restriction. Prefer this area, then compatible stock elsewhere in the authorised store. Other stores or separately configured warehouses require explicit selection and applicable approval. Saving this preference does not assign staff, grant stock permissions or reserve stock.</p>
        </section>
        <p className="text-sm">This setting does not activate checkout, approve collection, assign a store server or enable payments. Branch rules, staff permissions and later release gates must also pass.</p>
      </fieldset>
      <footer className="shrink-0 flex gap-2 border-t pt-3"><button type="submit" disabled={saving || !dirty} className={`${button} bg-indigo-600 text-white`}>{saving ? "Saving…" : "Save counter"}</button>
        <button type="button" disabled={saving} onClick={cancel} className={button}>Cancel counter edit</button></footer>
    </form> : <><div className="flex-1 min-h-0 overflow-auto border rounded-lg">
      {loading ? <p role="status" className="p-4">Loading counters…</p> : error ? <p className="p-4">Counter list unavailable. Refresh to retry.</p> : !result.items.length ? <p className="p-4">No counters configured.</p> :
        <table className="w-full text-left text-sm"><thead className={`sticky top-0 ${panel}`}><tr>{["Code", "Name", "Purpose", "Configuration", "Revision", "Actions"].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map((row) => <tr key={row.counter_key} className="border-t"><td className="p-3">{row.code}</td><td className="p-3">{row.config.name}</td><td className="p-3">{row.config.purpose}</td><td className="p-3">{row.config.is_enabled ? "Available; release gates apply" : "Disabled"}</td><td className="p-3">{row.version}</td><td className="p-3"><button type="button" className={button} onClick={() => setInspectingArea(row)}>View picking preference<span className="sr-only"> {row.code}</span></button> {editable && <button type="button" className={button} onClick={() => open(row)}>Edit<span className="sr-only"> {row.code}</span></button>}</td></tr>)}</tbody></table>}
    </div><div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : result.pages} totalCount={loading || error ? 0 : result.total}
      onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} isDark={isDark} /></div></>}
  </section>;
}
