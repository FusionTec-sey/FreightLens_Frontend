import React, { useEffect, useState } from "react";

export default function ActivePolicySummary({ api, productId }) {
  const [state, setState] = useState({ loading: true }), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setState({ loading: true });
    api.activePolicy(productId, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setState({ data });
    }).catch(() => { if (!controller.signal.aborted) setState({ error: true }); });
    return () => controller.abort();
  }, [api, productId, retry]);
  return <section aria-label="Active inventory policy" className="border rounded-lg p-3 text-sm">
    {state.loading ? <p>Checking active policy…</p> : state.error ? <><p>Active policy could not be verified. Do not treat this draft as active.</p>
      <button type="button" className="border rounded p-2 cursor-pointer hover:bg-indigo-500/20" onClick={() => setRetry((value) => value + 1)}>Retry active policy</button></> : state.data.status === "NOT_ACTIVE" ?
      <p>No reviewed policy is active. A saved draft is preparation only.</p> : <>
        <p>Active policy version {state.data.version} · from reviewed draft {state.data.draft_version}</p>
        <p>{state.data.config.tracking} · Base unit {state.data.config.base_unit} · Increment {state.data.config.quantity_step}</p>
        <p>Saving another draft does not replace this active policy.</p>
      </>}
  </section>;
}
