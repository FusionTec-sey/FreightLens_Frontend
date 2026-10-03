import React, { useEffect, useRef, useState } from "react";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import { locationError } from "../../../../services/inventoryLocationsApi";
import PolicyReviewRequest from "./PolicyReviewRequest";

export default function UnitBarcodes({ api, product, canManage, canRequestRetirement = false, isDark, onClose }) {
  const [retirement, setRetirement] = useState(null), [reviewDirty, setReviewDirty] = useState(false);
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [data, setData] = useState(null), [policy, setPolicy] = useState(null), [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false), [code, setCode] = useState(""), [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [discard, setDiscard] = useState(false);
  const [scan, setScan] = useState(""), [lookup, setLookup] = useState(null), [checking, setChecking] = useState(false);
  const controller = useRef(null), busy = useRef(false), scanBusy = useRef(false);
  const { payloadFor, clear } = useOperationIntent();
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 disabled:opacity-40";
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    setLoading(true); setData(null); setPolicy(null); setError(""); setLookup(null);
    Promise.all([api.unitBarcodes(product.id, page, limit, request.signal), api.activePolicy(product.id, request.signal)])
      .then(([rows, active]) => { if (!request.signal.aborted) { setData(rows.data); setPolicy(active.data); } })
      .catch((err) => { if (!request.signal.aborted) setError(locationError(err).message); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [api, product.id, page, limit, reload]);
  const close = () => {
    if (busy.current) return;
    if (retirement) { if (reviewDirty) setDiscard(true); else setRetirement(null); return; }
    if (editing && (code || unit)) { setDiscard(true); return; }
    if (editing) setEditing(false); else onClose();
  };
  const save = async () => {
    if (busy.current || !canManage || !code.trim() || !unit || policy?.status !== "ACTIVE") return;
    if (!window.crypto?.randomUUID) { setError("A secure browser connection is required."); return; }
    busy.current = true; setSaving(true); setError("");
    const request = controller.current;
    try {
      await api.createUnitBarcode(product.id, payloadFor(["unit-barcode", product.id], {
        expected_policy_version: policy.version, barcode: code.trim(), unit,
      }), request.signal);
      if (!request.signal.aborted) { setEditing(false); setCode(""); setUnit(""); clear(); setPage(1); setReload((n) => n + 1); }
    } catch (err) { if (!request.signal.aborted) setError(locationError(err).message); }
    finally { busy.current = false; if (!request.signal.aborted) setSaving(false); }
  };
  const resolve = async () => {
    if (scanBusy.current || !scan.trim()) return;
    scanBusy.current = true; setChecking(true); setLookup(null); setError("");
    const request = controller.current;
    try {
      const response = await api.resolveUnitBarcode(scan.trim(), request.signal);
      if (!request.signal.aborted) setLookup(response.data);
    } catch (err) { if (!request.signal.aborted) setError(locationError(err).message); }
    finally { scanBusy.current = false; if (!request.signal.aborted) setChecking(false); }
  };
  const units = policy?.config ? [{ unit: policy.config.base_unit, factor: "1" }, ...policy.config.conversions] : [];
  return <section aria-label="Product unit barcodes" onKeyDown={(event) => {
    if (event.key === "Escape" && !saving && !checking) { event.preventDefault(); close(); }
    if (event.key === "Tab") {
      const controls = [...event.currentTarget.querySelectorAll("button, input, select, textarea")].filter((element) => !element.matches(":disabled"));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }} className={`min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-2"><div><h2 className="text-xl font-bold">{product.name} — unit barcodes</h2>
      <p className="text-sm">Each permanent code identifies one configured unit. Registration does not change stock or prices. To correct setup, retire incorrect codes through review, then register new codes; retired codes cannot be reassigned.</p></div>
      <button autoFocus type="button" className={button} disabled={saving || checking} onClick={close}>{editing || retirement ? "Back to barcodes" : "Back to policy"}</button></header>
    {error && <p role="alert">{error}</p>}
    {discard && <div role="alert">Discard unsaved barcode details?
      <button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button>
      <button type="button" className={button} onClick={() => { setDiscard(false); setRetirement(null); setReviewDirty(false); setEditing(false); setCode(""); setUnit(""); setError(""); clear(); }}>Discard barcode draft</button></div>}
    {retirement ? <div className="min-h-0 flex-1 overflow-auto"><h3 className="font-semibold">Retire {retirement.barcode}</h3>
      <p>{retirement.unit} = {retirement.base_quantity} {retirement.base_unit} · policy {retirement.policy_version}</p>
      <PolicyReviewRequest key={retirement.id} api={api} barcodeId={retirement.id} version={1} disabled={discard}
        panel={panel} button={button} onDirtyChange={setReviewDirty} onBusyChange={(value) => { busy.current = value; setSaving(value); }} />
    </div> : loading ? <p role="status">Loading registered units…</p> : !data ? <button type="button" className={button} onClick={() => setReload((n) => n + 1)}>Retry barcodes</button> : editing ? <>
      <div className="min-h-0 overflow-auto space-y-3">
        <p>Registration is permanent. Check the code and unit carefully; reassignment is not available.</p>
        <label className="block">Barcode<input maxLength={100} value={code} disabled={saving} onChange={(event) => setCode(event.target.value)} className={`block border p-2 rounded w-full ${panel}`} /></label>
        <label className="block">Barcode unit<select value={unit} disabled={saving} onChange={(event) => setUnit(event.target.value)} className={`block border p-2 rounded w-full ${panel}`}>
          <option value="">Choose the unit explicitly</option>{units.map((row) => <option key={row.unit} value={row.unit}>{row.unit} = {row.factor} {policy.config.base_unit}</option>)}</select></label>
      </div><button type="button" className={button} disabled={saving || discard || !code.trim() || !unit} onClick={save}>{saving ? "Registering…" : "Register barcode"}</button>
    </> : <>
      {policy?.status !== "ACTIVE" && <p>A reviewed active policy is required before registering units.</p>}
      <div className="shrink-0 flex flex-wrap gap-2">
        {canManage && <button type="button" className={button} disabled={checking || policy?.status !== "ACTIVE"} onClick={() => { clear(); setError(""); setEditing(true); }}>Add unit barcode</button>}
        <button type="button" className={button} disabled={checking} onClick={() => setReload((n) => n + 1)}>Refresh barcodes</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border rounded-lg">{!data.items.length ? <p className="p-3">No registered unit barcodes. Catalogue barcodes are not imported automatically.</p> :
        <table className="w-full text-left text-sm"><thead className={`sticky top-0 ${panel}`}><tr>{["Barcode", "Unit", "Base quantity", "Policy", "Status"].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead>
          <tbody>{data.items.map((row) => <tr key={row.id}><td className="p-2 break-all">{row.barcode}</td><td className="p-2">{row.unit}</td><td className="p-2">{row.base_quantity} {row.base_unit}</td><td className="p-2">{row.policy_version}</td><td className="p-2">{row.retired ? "Retired — cannot reuse" : row.eligible ? "Eligible for lookup" : "Review required"}
            {canRequestRetirement && !row.retired && <button type="button" className={`${button} block mt-2`} disabled={checking} onClick={() => { setRetirement(row); setReviewDirty(false); }}>Request retirement<span className="sr-only"> {row.barcode}</span></button>}</td></tr>)}</tbody></table>}</div>
      <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={data.pages} totalCount={data.total} isDark={isDark}
        onPageChange={(value) => { if (!checking) setPage(value); }} onPageSizeChange={(value) => { if (!checking) { setLimit(value); setPage(1); } }} /></div>
      <div className="shrink-0 space-y-2"><label>Check registered barcode<input maxLength={100} disabled={checking} value={scan} onChange={(event) => { setScan(event.target.value); setLookup(null); }} className={`block border p-2 rounded w-full ${panel}`} /></label>
        <button type="button" className={button} disabled={checking || !scan.trim()} onClick={resolve}>{checking ? "Checking…" : "Check barcode"}</button>
        {lookup && <p role="status">{lookup.product_id !== product.id ? `Belongs to product #${lookup.product_id}. ` : "Matched this product. "}{lookup.unit} = {lookup.base_quantity} {lookup.base_unit}. Lookup does not reserve or sell stock.</p>}</div>
    </>}
  </section>;
}
