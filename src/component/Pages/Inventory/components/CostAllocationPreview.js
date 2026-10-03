import React, { useEffect, useRef, useState } from "react";
import { locationError } from "../../../../services/inventoryLocationsApi";
import CostAllocationSave from "./CostAllocationSave";

export default function CostAllocationPreview({ api, pool, ids, panel, button, onClose, canManage = false }) {
  const [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const [total, setTotal] = useState(""), [basis, setBasis] = useState("GOODS_VALUE");
  const [result, setResult] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), [api, pool.id]);
  const invalidate = () => { request.current?.abort(); setResult(null); setError(""); setBusy(false); };
  const calculate = async () => {
    if (busy) return;
    if (!/^[0-9]{1,18}(\.[0-9]{1,6})?$/.test(total)) { setError("Enter a nonnegative SCR amount with up to six decimal places."); return; }
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); setResult(null);
    try {
      const { data } = await api.previewCostAllocation(pool.id, { valuation_ids: ids, total_scr: total, basis }, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch (err) { if (!controller.signal.aborted) setError(locationError(err).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  return <section aria-label="Freight allocation preview" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0"><h1 className="text-xl font-bold">Freight allocation preview</h1><p>{pool.code} · {ids.length} selected opening sources</p></header>
    <p className="shrink-0 text-sm">Calculation only. This does not save, approve or post a charge. Confirm the source invoice, SCR conversion and capitalisation eligibility before any future posting. Historical additional costs are not charged again by this preview.</p>
    <div className="shrink-0 flex flex-wrap gap-3"><label>Additional cost SCR<input disabled={saving || dirty} className={`block border rounded p-2 ${panel}`} inputMode="decimal" value={total} onChange={e => { invalidate(); setTotal(e.target.value); }} /></label>
      <label>Allocation basis<select disabled={saving || dirty} className={`block border rounded p-2 ${panel}`} value={basis} onChange={e => { invalidate(); setBasis(e.target.value); }}><option value="GOODS_VALUE">Original goods value</option><option value="BASE_QUANTITY">Base quantity — same unit only</option></select></label></div>
    {discard && <div role="alert">Discard unsaved proposal evidence?<button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className={button} onClick={onClose}>Discard proposal draft</button></div>}
    {error && <p role="alert" className="shrink-0">{error}</p>}
    <div className="flex-1 min-h-0 overflow-auto border rounded-lg">{busy ? <p role="status" className="p-3">Calculating allocation…</p> : result ? <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr>{["Product / stock source", "Basis", "Allocated SCR"].map(label => <th key={label} className="p-3" scope="col">{label}</th>)}</tr></thead><tbody>{result.lines.map(line => <tr key={line.valuation_id} className="border-t"><td className="p-3">{line.product_name} · #{line.balance_id}</td><td className="p-3 font-mono">{line.basis_value}</td><td className="p-3 font-mono">{line.allocated_scr}</td></tr>)}</tbody><tfoot><tr><th colSpan={2} className="p-3">Allocated total SCR</th><td className="p-3 font-mono">{result.total_scr}</td></tr></tfoot></table> : <p className="p-3">Enter the additional cost and calculate. Weights come from immutable source entries, not cumulative pool totals.</p>}</div>
    <footer className="shrink-0 space-y-3">{result && canManage && <CostAllocationSave key={`${total}:${basis}`} api={api} poolId={pool.id} ids={ids} result={{ ...result, basis }} panel={panel} button={button} onBusy={setSaving} onDirty={setDirty} disabled={discard} />}
      <div className="flex gap-3"><button type="button" className={button} disabled={saving} onClick={() => dirty ? setDiscard(true) : onClose()}>Back to valuations</button><button type="button" className={button} disabled={busy || saving || dirty || discard} onClick={calculate}>Calculate allocation</button></div></footer>
  </section>;
}
