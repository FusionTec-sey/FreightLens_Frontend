import React, { useEffect, useRef, useState } from "react";

const labels = { base_unit: "Base unit", quantity_step: "Quantity increment", tracking: "Tracking mode",
  require_expiry: "Expiry requirement", require_shade: "Shade requirement", require_calibre: "Calibre requirement", conversions: "Alternate units" };

function policyValue(config, field) {
  if (!config) return "Not configured";
  const value = config[field];
  if (field === "conversions") return value?.length ? value.map((row) => `${row.unit} = ${row.factor} ${config.base_unit}`).join("; ") : "None";
  if (typeof value === "boolean") return value ? "Required" : "Not required";
  return value ?? "Not configured";
}

export default function PolicyTransitionReadiness({ api, productId, button, disabled }) {
  const [state, setState] = useState(null);
  const pending = useRef(null);
  useEffect(() => {
    pending.current?.abort(); pending.current = null; setState(null);
    return () => { pending.current?.abort(); pending.current = null; };
  }, [api, productId, disabled]);
  const check = async () => {
    if (pending.current || disabled) return;
    const controller = new AbortController(); pending.current = controller;
    setState({ loading: true });
    try {
      const { data } = await api.policyTransitionReadiness(productId, controller.signal);
      if (!controller.signal.aborted) setState({ data });
    } catch (_) {
      if (!controller.signal.aborted) setState({ error: true });
    } finally { if (pending.current === controller) pending.current = null; }
  };
  return <section aria-label="Policy transition readiness" className="border rounded-lg p-3 space-y-2 text-sm">
    <p>Check the saved draft before requesting review. Adding alternate units can preserve existing stock and barcodes when every original rule and factor remains unchanged. Other revisions require no stock history and no live codes. Every existing code must first complete reviewed retirement for those revisions; retired codes stay reserved and cannot be reused.</p>
    <button type="button" className={button} disabled={disabled || state?.loading} onClick={check}>{state?.loading ? "Checking transition…" : "Check transition readiness"}</button>
    {disabled ? <p>Save changes before checking this draft.</p> : state?.error ? <p role="alert">Readiness could not be verified. Retry the check; no policy was changed.</p> : state?.data && <div role="status">
      <p>Saved draft {state.data.draft_version} · Active policy {state.data.active_version || "none"}</p>
      {state.data.route === "COMPATIBLE_REVISION_REVIEW" && <p>Alternate-unit extension: existing stock, reservations and barcode meanings are preserved. Independent review and explicit activation are still required.</p>}
      {state.data.changed_fields.length > 0 && <p>Changes: {state.data.changed_fields.map((field) => labels[field] || field).join(", ")}</p>}
      {state.data.proposed_config && <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-left text-sm" aria-label="Saved policy comparison">
          <thead><tr><th className="p-2">Rule</th><th className="p-2">Active version {state.data.active_version || "—"}</th><th className="p-2">Saved draft {state.data.draft_version}</th></tr></thead>
          <tbody>{Object.entries(labels).map(([field, label]) => <tr key={field} className="border-t">
            <th scope="row" className="p-2">{label}{state.data.changed_fields.includes(field) && <span className="block text-xs font-normal">Changed</span>}</th>
            <td className="p-2 break-words">{policyValue(state.data.active_config, field)}</td>
            <td className="p-2 break-words">{policyValue(state.data.proposed_config, field)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {state.data.blockers.length > 0 ? <ul className="list-disc pl-5">{state.data.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul> :
        <p>{state.data.route === "NO_CHANGE" ? "The saved rules are already active; no transition is needed." : "Eligible for manager review at the time of this check."}</p>}
      <p>This check is advisory, not approval. Posting rechecks current history and the exact reviewed version.</p>
    </div>}
  </section>;
}
