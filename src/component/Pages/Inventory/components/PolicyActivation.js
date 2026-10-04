import React, { useEffect, useRef, useState } from "react";
import { locationError } from "../../../../services/inventoryLocationsApi";
import useOperationIntent from "../../../../hooks/useOperationIntent";

export default function PolicyActivation({ api, caseKey, expectedActiveVersion = 0, retirement = false, deadline = false, reservationRelease = false, otherStore = false, reallocation = false, transition = "STANDARD", panel, button, onBusyChange, onActivated }) {
  const [confirmed, setConfirmed] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const calendarStockAction = otherStore || reallocation;
  const [stockContext, setStockContext] = useState(null), [contextLoading, setContextLoading] = useState(calendarStockAction);
  const busy = useRef(false), lifecycle = useRef(null);
  const { payloadFor } = useOperationIntent();
  useEffect(() => { const controller = new AbortController(); lifecycle.current = controller; return () => controller.abort(); }, []);
  useEffect(() => {
    if (!calendarStockAction) return;
    const controller = new AbortController(); setContextLoading(true); setStockContext(null); setError('');
    (reallocation ? api.reallocationExecutionContext : api.otherStoreExecutionContext)(caseKey, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (data.case_key !== caseKey || !Number.isInteger(data.branch_version) || data.branch_version < 1) throw new Error('Invalid context');
      setStockContext(data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.response?.status === 503
      ? 'Stock execution is disabled: the required runtime is not configured.'
      : 'Execution context unavailable. Check target-store settings and access, then reopen the case.'); })
      .finally(() => { if (!controller.signal.aborted) setContextLoading(false); });
    return () => controller.abort();
  }, [api, caseKey, calendarStockAction, reallocation]);
  const activate = async () => {
    if (busy.current || !confirmed || (calendarStockAction && !stockContext)) return;
    if (!window.crypto?.randomUUID) { setError("A secure browser connection is required."); return; }
    busy.current = true; setSaving(true); onBusyChange(true); setError("");
    const controller = lifecycle.current;
    try {
      let receipt;
      if (reservationRelease || calendarStockAction) {
        const payload = payloadFor([reallocation ? 'reservation-reallocation' : otherStore ? 'other-store-allocation' : 'reservation-release', caseKey],
          calendarStockAction ? { branch_version: stockContext.branch_version } : {});
        const { data } = await (reallocation ? api.executeReallocation : otherStore ? api.executeOtherStore : api.executeRelease)(caseKey, payload, controller.signal);
        if (data?.operation_key !== payload.operation_key || data?.case_key !== caseKey || data?.status !== 'CONSUMED') {
          throw new Error('Stock outcome not confirmed. Retry the same operation.');
        }
        receipt = data;
      } else {
        await (deadline ? api.scheduleDeadline : retirement ? api.retireBarcode : api.activatePolicy)(caseKey, payloadFor([deadline ? 'reservation-deadline' : retirement ? "barcode-retirement" : "policy-activation", caseKey], deadline ? {} : retirement ? { expected_source_version: 1 } : { expected_active_version: expectedActiveVersion }), controller.signal);
      }
      if (!controller.signal.aborted) onActivated(receipt);
    } catch (err) { if (!controller.signal.aborted) setError((reservationRelease || calendarStockAction) && !err.response
      ? 'Stock outcome not confirmed. Retry here with the same operation; do not create another request.'
      : locationError(err).message); }
    finally { busy.current = false; if (!controller.signal.aborted) { setSaving(false); onBusyChange(false); } }
  };
  if (calendarStockAction) return <section aria-label={reallocation ? 'Reviewed reservation reallocation' : 'Reviewed other-store allocation'} className={`p-3 border rounded-lg space-y-3 ${panel}`}>
    <p>{reallocation ? 'Release the exact reviewed source quantity and reserve it for the approved destination draft in one transaction. Stock stays at its existing location. Paid holds are not eligible.' : 'Reserve only the reviewed quantity at the exact chosen stock location.'} This does not transfer goods, collect payment or hand over stock. Changed stock or demand requires a fresh review.</p>
    {contextLoading && <p role="status">Checking target-store runtime and settings…</p>}
    {error && <p role="alert">{error}</p>}
    <label className="block"><input type="checkbox" checked={confirmed} disabled={saving || !stockContext} onChange={event => setConfirmed(event.target.checked)} /> {reallocation ? 'Reallocate only between the exact approved drafts shown above' : 'Allocate the exact approved other-store stock shown above'}</label>
    <button type="button" className={button} disabled={!confirmed || saving || !stockContext} onClick={activate}>{saving ? 'Allocating…' : reallocation ? 'Execute approved reallocation' : 'Execute approved other-store allocation'}</button>
  </section>;
  if (reservationRelease) return <section aria-label="Reviewed reservation release" className={`p-3 border rounded-lg space-y-3 ${panel}`}>
    <p>Release only the exact approved held quantity. This does not hand over goods, cancel a paid order, refund money or transfer credit. A configured stock runtime is required.</p>
    <label className="block"><input type="checkbox" checked={confirmed} disabled={saving} onChange={event => setConfirmed(event.target.checked)} /> Release the exact approved quantity shown above</label>
    {error && <p role="alert">{error}</p>}
    <button type="button" className={button} disabled={!confirmed || saving} onClick={activate}>{saving ? 'Releasing…' : 'Execute approved release'}</button>
  </section>;
  return <section aria-label={deadline ? 'Reviewed reservation follow-up' : retirement ? "Reviewed barcode retirement" : "Reviewed policy activation"} className={`p-3 border rounded-lg space-y-3 ${panel}`}>
    <p>{deadline ? 'Record the exact approved follow-up date. Stock remains reserved; this does not cancel an order, release goods or move money.' : retirement ? "Permanently disable lookup for this exact code, retaining its original identity, units and audit history. No stock changes or reassignment. This action cannot be undone." : `${expectedActiveVersion ? `Replaces active policy version ${expectedActiveVersion} with a new immutable revision.` : "Initial policy activation."} ${transition === "EXTEND_UNITS" ? "Adds alternate units only. Existing quantities, factors, tracking rules, reservations and barcode meanings remain unchanged." : "Existing stock history or live registered barcodes block this action."} Activation does not create stock or enable checkout.`}</p>
    <label className="block"><input type="checkbox" checked={confirmed} disabled={saving} onChange={(event) => setConfirmed(event.target.checked)} /> {deadline ? 'Schedule the exact approved follow-up shown above' : retirement ? "Retire the exact approved barcode shown above" : "Activate the exact approved policy shown above"}</label>
    {error && <p role="alert">{error}</p>}
    <button type="button" className={button} disabled={!confirmed || saving} onClick={activate}>{saving ? deadline ? 'Scheduling…' : retirement ? "Retiring…" : "Activating…" : deadline ? 'Schedule reviewed follow-up' : retirement ? "Retire reviewed barcode" : "Activate reviewed policy"}</button>
  </section>;
}
