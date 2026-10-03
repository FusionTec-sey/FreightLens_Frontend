import React, { useEffect, useRef, useState } from "react";
import { locationError } from "../../../../services/inventoryLocationsApi";
import useOperationIntent from "../../../../hooks/useOperationIntent";

export default function PolicyActivation({ api, caseKey, expectedActiveVersion = 0, retirement = false, deadline = false, transition = "STANDARD", panel, button, onBusyChange, onActivated }) {
  const [confirmed, setConfirmed] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const busy = useRef(false), lifecycle = useRef(null);
  const { payloadFor } = useOperationIntent();
  useEffect(() => { const controller = new AbortController(); lifecycle.current = controller; return () => controller.abort(); }, []);
  const activate = async () => {
    if (busy.current || !confirmed) return;
    if (!window.crypto?.randomUUID) { setError("A secure browser connection is required."); return; }
    busy.current = true; setSaving(true); onBusyChange(true); setError("");
    const controller = lifecycle.current;
    try {
      await (deadline ? api.scheduleDeadline : retirement ? api.retireBarcode : api.activatePolicy)(caseKey, payloadFor([deadline ? 'reservation-deadline' : retirement ? "barcode-retirement" : "policy-activation", caseKey], deadline ? {} : retirement ? { expected_source_version: 1 } : { expected_active_version: expectedActiveVersion }), controller.signal);
      if (!controller.signal.aborted) onActivated();
    } catch (err) { if (!controller.signal.aborted) setError(locationError(err).message); }
    finally { busy.current = false; if (!controller.signal.aborted) { setSaving(false); onBusyChange(false); } }
  };
  return <section aria-label={deadline ? 'Reviewed reservation follow-up' : retirement ? "Reviewed barcode retirement" : "Reviewed policy activation"} className={`p-3 border rounded-lg space-y-3 ${panel}`}>
    <p>{deadline ? 'Record the exact approved follow-up date. Stock remains reserved; this does not cancel an order, release goods or move money.' : retirement ? "Permanently disable lookup for this exact code, retaining its original identity, units and audit history. No stock changes or reassignment. This action cannot be undone." : `${expectedActiveVersion ? `Replaces active policy version ${expectedActiveVersion} with a new immutable revision.` : "Initial policy activation."} ${transition === "EXTEND_UNITS" ? "Adds alternate units only. Existing quantities, factors, tracking rules, reservations and barcode meanings remain unchanged." : "Existing stock history or live registered barcodes block this action."} Activation does not create stock or enable checkout.`}</p>
    <label className="block"><input type="checkbox" checked={confirmed} disabled={saving} onChange={(event) => setConfirmed(event.target.checked)} /> {deadline ? 'Schedule the exact approved follow-up shown above' : retirement ? "Retire the exact approved barcode shown above" : "Activate the exact approved policy shown above"}</label>
    {error && <p role="alert">{error}</p>}
    <button type="button" className={button} disabled={!confirmed || saving} onClick={activate}>{saving ? deadline ? 'Scheduling…' : retirement ? "Retiring…" : "Activating…" : deadline ? 'Schedule reviewed follow-up' : retirement ? "Retire reviewed barcode" : "Activate reviewed policy"}</button>
  </section>;
}
