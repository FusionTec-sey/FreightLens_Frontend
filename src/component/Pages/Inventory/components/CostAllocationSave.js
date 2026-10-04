import React, { useEffect, useRef, useState } from "react";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import { locationError } from "../../../../services/inventoryLocationsApi";
import { inputClass } from '../../../UI/UXComponent/RegisterShell';

export default function CostAllocationSave({ api, poolId, ids, result, panel, button, onBusy, onDirty, disabled = false }) {
  const [reference, setReference] = useState(""), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(null);
  const controller = useRef(null), pending = useRef(false);
  const { payloadFor } = useOperationIntent();
  useEffect(() => { controller.current = new AbortController(); return () => controller.current.abort(); }, [api, poolId]);
  useEffect(() => { onDirty(!!(reference || reason) && !saved); }, [reference, reason, saved, onDirty]);
  useEffect(() => {
    const leave = e => { if ((reference || reason) && !saved) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [reference, reason, saved]);
  const save = async () => {
    if (pending.current || disabled || !reference.trim() || !reason.trim()) return;
    pending.current = true; setBusy(true); onBusy(true); setError("");
    const signal = controller.current.signal;
    try {
      const body = payloadFor(['cost-allocation-proposal', poolId], { valuation_ids: [...ids].sort((a, b) => a - b),
        total_scr: result.total_scr, basis: result.basis, charge_reference: reference.trim(), reason: reason.trim() });
      const { data } = await api.saveCostAllocation(poolId, body, signal);
      if (!signal.aborted) setSaved(data.proposal_key);
    } catch (err) { if (!signal.aborted) setError(locationError(err).message); }
    finally { pending.current = false; if (!signal.aborted) { setBusy(false); onBusy(false); } }
  };
  if (saved) return <p role="status">Saved unposted proposal: {saved}. A reference is not proof of a verified invoice.</p>;
  return <div className="space-y-2 border-t pt-3">
    <p>Save this exact calculation as an unposted proposal. Invoice evidence and independent review remain required before capitalisation.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label>Charge reference<input value={reference} maxLength={160} disabled={busy} onChange={e => setReference(e.target.value)} className={`block w-full ${inputClass}`} /></label>
      <label>Allocation reason<input value={reason} maxLength={1000} disabled={busy} onChange={e => setReason(e.target.value)} className={`block w-full ${inputClass}`} /></label></div>
    {error && <p role="alert">{error}</p>}
    <button type="button" className={button} disabled={disabled || busy || !reference.trim() || !reason.trim()} onClick={save}>{busy ? 'Saving proposal…' : 'Save unposted proposal'}</button>
  </div>;
}
