import React, { useEffect, useRef, useState } from "react";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import { locationError } from "../../../../services/inventoryLocationsApi";
import StockManifestFields, { buildStockManifest } from "./StockManifestFields";

export default function ReclassificationEditor({ api, balance, panel, button, onClose, onSaved }) {
  const [policies, setPolicies] = useState(null), [error, setError] = useState("");
  const [reason, setReason] = useState(""), [rows, setRows] = useState([]), [serialText, setSerialText] = useState("");
  const [saving, setSaving] = useState(false), [discard, setDiscard] = useState(false);
  const [reload, setReload] = useState(0);
  const controller = useRef(null), busy = useRef(false), identities = useRef(new Map());
  const { payloadFor } = useOperationIntent();
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    setPolicies(null); setError("");
    Promise.all([api.activePolicy(balance.product_id, request.signal), api.policyDraft(balance.product_id, request.signal)])
      .then(([active, draft]) => { if (!request.signal.aborted) setPolicies({ active: active.data, draft: draft.data }); })
      .catch(err => { if (!request.signal.aborted) setError(locationError(err).message); });
    return () => request.abort();
  }, [api, balance.product_id, reload]);
  useEffect(() => {
    const leave = event => { if (reason || rows.length || serialText) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave);
  }, [reason, rows.length, serialText]);
  const target = policies?.draft?.config;
  const eligible = policies?.active?.version > 0 && balance.tracking_policy === "UNTRACKED" &&
    ["BATCH", "SERIAL"].includes(target?.tracking) && /^0(?:\.0+)?$/.test(balance.reserved);
  const save = async () => {
    if (busy.current || !eligible || !reason.trim()) return;
    let body;
    try {
      body = { balance_id: balance.id, expected_balance_version: balance.version,
        expected_active_version: policies.active.version, expected_draft_version: policies.draft.version,
        reason: reason.trim(), batches: [], serials: null };
      Object.assign(body, buildStockManifest(target.tracking, rows, serialText, identities.current));
      body = payloadFor(["reclassification-proposal", balance.id], body);
    } catch (err) { setError(err.message); return; }
    busy.current = true; setSaving(true); setError("");
    const request = controller.current;
    try {
      const { data } = await api.saveReclassificationProposal(body, request.signal);
      if (!request.signal.aborted) onSaved(data.proposal_key);
    } catch (err) {
      if (!request.signal.aborted) {
        const detail = err.response?.data?.detail;
        setError(Array.isArray(detail) ? detail.map(item => `${(item.loc || []).join(" / ")}: ${item.msg}`).join("; ") : locationError(err).message);
      }
    }
    finally { busy.current = false; if (!request.signal.aborted) setSaving(false); }
  };
  return <section aria-label="Prepare reclassification proposal" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0"><h1 className="text-xl font-bold">Prepare stock reclassification</h1><p>{balance.product_name} · Stock version {balance.version}</p></header>
    <p className="shrink-0 text-sm">Proposal only: quantities, conditions and location must stay unchanged. No goods move and no tracking activates. First save the intended tracking rules under the product's Units & tracking draft.</p>
    {error && <p role="alert" className="shrink-0">{error}</p>}
    {discard && <div role="alert" className="shrink-0">Discard unsaved proposal?
      <button className={button} type="button" onClick={() => setDiscard(false)}>Keep editing</button>
      <button className={button} type="button" onClick={onClose}>Discard proposal</button></div>}
    <div className="flex-1 min-h-0 overflow-auto space-y-3">
      {!policies ? error ? <button type="button" className={button} onClick={() => setReload(value => value + 1)}>Retry loading policies</button> : <p>Loading active and draft policies…</p> : !eligible ? <p role="status">A reviewed active ordinary-stock policy, an explicit batch/serial draft, and no reserved quantity are required. Return to stock and refresh after correcting the source.</p> : <>
        <p>Target: {target.tracking} · Base unit {target.base_unit} · Draft {policies.draft.version}</p>
        <p>On-hand {balance.on_hand} · Damaged {balance.damaged} · Quarantined {balance.quarantined}</p>
        <label className="block">Proposal reason<textarea maxLength={500} disabled={saving} value={reason} onChange={event => setReason(event.target.value)} className={`block w-full border rounded-lg p-2 ${panel}`} /></label>
        <StockManifestFields tracking={target.tracking} rows={rows} setRows={setRows} serialText={serialText}
          setSerialText={setSerialText} disabled={saving} panel={panel} button={button} addLabel="Add audited batch" />
      </>}
    </div>
    <footer className="shrink-0 border-t pt-3 flex gap-3"><button type="button" className={button} disabled={saving} onClick={() => reason || rows.length || serialText ? setDiscard(true) : onClose()}>Back to proposals</button>
      <button type="button" className={button} disabled={saving || discard || !eligible || !reason.trim()} onClick={save}>{saving ? "Saving…" : "Save proposal"}</button></footer>
  </section>;
}
