import React, { useEffect, useRef, useState } from "react";
import { locationError } from "../../../../services/inventoryLocationsApi";
import useOperationIntent from "../../../../hooks/useOperationIntent";

export default function PolicyReviewRequest({ api, productId, barcodeId, proposalKey, version, disabled, panel, button, onBusyChange, onDirtyChange, costAllocation = false }) {
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [saved, setSaved] = useState(null), [saving, setSaving] = useState(false);
  const busy = useRef(false), lifecycle = useRef(null);
  const { payloadFor } = useOperationIntent();
  useEffect(() => { const controller = new AbortController(); lifecycle.current = controller; return () => controller.abort(); }, []);
  useEffect(() => { setSaved(null); }, [version]);
  useEffect(() => { onDirtyChange?.(Boolean(reason) && !saved); }, [reason, saved, onDirtyChange]);
  const submit = async () => {
    if (busy.current || disabled || !version || !reason.trim()) return;
    if (typeof window.crypto?.randomUUID !== "function") { setError("A secure browser connection is required."); return; }
    const body = proposalKey ? { reason: reason.trim() } : { ...(barcodeId ? { barcode_id: barcodeId } : { product_id: productId }), expected_source_version: version, reason: reason.trim() };
    busy.current = true; setSaving(true); onBusyChange(true); setError("");
    const controller = lifecycle.current;
    try {
      const payload = payloadFor([costAllocation ? "cost-allocation-review" : proposalKey ? "reclassification-review" : barcodeId ? "barcode-retirement" : "policy-review", proposalKey || barcodeId || productId], body);
      const { data } = await (proposalKey ? api.requestReclassificationReview(proposalKey, payload, controller.signal)
        : (barcodeId ? api.requestBarcodeRetirement : api.requestPolicyReview)(payload, controller.signal));
      if (!controller.signal.aborted) setSaved(data.case_key);
    } catch (err) {
      if (!controller.signal.aborted) setError(locationError(err).message);
    } finally {
      busy.current = false;
      if (!controller.signal.aborted) { setSaving(false); onBusyChange(false); }
    }
  };
  return <div className="border-t pt-3 space-y-2">
    <h3 className="font-semibold">Manager review</h3>
    <p className="text-sm">{costAllocation ? "Review binds this exact declared charge and allocation. The creator and requester cannot approve it. Approval does not verify a supplier invoice or post a charge." : proposalKey ? "Review binds this exact stock snapshot and identity manifest. Changed quantities or policies invalidate it. Approval does not convert stock." : barcodeId ? "Request retirement of this exact registered code. Approval alone does not retire it; an authorised user must confirm retirement. The code stays reserved forever." : "Review binds the exact saved policy version. Approval alone does not activate tracking or change stock."}</p>
    {disabled && <p>Save your draft changes before requesting review.</p>}
    {error && <p role="alert">{error}</p>}
    {saved ? <p role="status">Review requested: {saved}. A different authorised manager must review it.</p> : <>
      <label className="block">Review request reason<textarea disabled={disabled || saving || !version} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={`block w-full border p-2 rounded-lg ${panel}`} /></label>
      <button type="button" disabled={disabled || saving || !version || !reason.trim()} className={button} onClick={submit}>{saving ? "Requesting…" : proposalKey ? "Request proposal review" : barcodeId ? "Request retirement review" : "Request activation review"}</button>
    </>}
  </div>;
}
