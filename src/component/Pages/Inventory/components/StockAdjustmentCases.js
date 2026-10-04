import React, { useEffect, useRef, useState } from "react";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import { locationError } from "../../../../services/inventoryLocationsApi";
import { useTheme } from "../../../../context/ThemeContext";

const exactQuantity = /^\d+(\.\d{1,6})?$/;

export default function StockAdjustmentCases({ api, balance, userId, canRequest = false,
  canReview = false, canExecute = false, onClose, onStockChanged }) {
  const { isDark } = useTheme();
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40";
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25);
  const [revision, setRevision] = useState(0), [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [targets, setTargets] = useState({ onHand: balance.on_hand, damaged: balance.damaged,
    quarantined: balance.quarantined, reason: "" });
  const [requestResult, setRequestResult] = useState(null), [requesting, setRequesting] = useState(false);
  const [selected, setSelected] = useState(null), [reviewReason, setReviewReason] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("APPROVED"), [acting, setActing] = useState(false);
  const [confirmed, setConfirmed] = useState(false), [actionResult, setActionResult] = useState(null);
  const lifecycle = useRef(null), busy = useRef(false);
  const requestIntent = useOperationIntent(), reviewIntent = useOperationIntent(), executeIntent = useOperationIntent();

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setResult(null);
    api.stockAdjustmentCases(balance.id, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(locationError(err).message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, balance.id, page, limit, revision]);

  const targetError = [targets.onHand, targets.damaged, targets.quarantined]
    .some((value) => !exactQuantity.test(value || ""));
  const dirty = canRequest && !requestResult && (targets.onHand !== balance.on_hand
    || targets.damaged !== balance.damaged || targets.quarantined !== balance.quarantined
    || Boolean(targets.reason));
  useEffect(() => {
    const warn = (event) => { if (dirty || busy.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const requestReview = async () => {
    if (busy.current || !canRequest || targetError || !targets.reason.trim()) return;
    busy.current = true; setRequesting(true); setError("");
    const body = { balance_id: balance.id, expected_source_version: balance.version,
      target_on_hand: targets.onHand, target_damaged: targets.damaged,
      target_quarantined: targets.quarantined, reason: targets.reason.trim() };
    try {
      const payload = requestIntent.payloadFor(["stock-adjustment-request", balance.id, balance.version], body);
      const { data } = await api.requestStockAdjustment(payload, lifecycle.current.signal);
      if (!lifecycle.current.signal.aborted) { setRequestResult(data); setRevision((value) => value + 1); }
    } catch (err) {
      if (!lifecycle.current.signal.aborted) setError(locationError(err).message);
    } finally {
      busy.current = false;
      if (!lifecycle.current.signal.aborted) setRequesting(false);
    }
  };

  const review = async () => {
    if (busy.current || !canReview || !selected || !reviewReason.trim()) return;
    busy.current = true; setActing(true); setError("");
    try {
      const payload = reviewIntent.payloadFor(["stock-adjustment-review", selected.case_key], {
        expected_version: selected.version, outcome: reviewOutcome, reason: reviewReason.trim(),
      });
      await api.reviewStockAdjustment(selected.case_key, payload, lifecycle.current.signal);
      if (!lifecycle.current.signal.aborted) {
        setSelected(null); setReviewReason(""); setRevision((value) => value + 1);
      }
    } catch (err) {
      if (!lifecycle.current.signal.aborted) setError(locationError(err).message);
    } finally {
      busy.current = false;
      if (!lifecycle.current.signal.aborted) setActing(false);
    }
  };

  const execute = async () => {
    if (busy.current || !canExecute || !selected || !confirmed) return;
    busy.current = true; setActing(true); setError("");
    try {
      const payload = executeIntent.payloadFor(["stock-adjustment-execute", selected.case_key], {});
      const { data } = await api.executeStockAdjustment(selected.case_key, payload, lifecycle.current.signal);
      if (data?.operation_key !== payload.operation_key || data?.status !== "CONSUMED") {
        throw new Error("Stock outcome not confirmed. Retry the same operation.");
      }
      if (!lifecycle.current.signal.aborted) {
        setActionResult(data); setConfirmed(false); setRevision((value) => value + 1);
        onStockChanged?.();
      }
    } catch (err) {
      if (!lifecycle.current.signal.aborted) setError(err.response?.status === 503
        ? "Stock execution is disabled until the cloud posting runtime is configured."
        : err.response ? locationError(err).message
        : "Stock outcome not confirmed. Retry here with the same operation; do not create another adjustment.");
    } finally {
      busy.current = false;
      if (!lifecycle.current.signal.aborted) setActing(false);
    }
  };

  return <section aria-label="Stock adjustment cases" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Reviewed stock adjustments</h1>
        <p className="text-sm">{balance.product_name} · {balance.sku} · balance #{balance.id} v{balance.version}</p></div>
      <button type="button" className={button} disabled={busy.current} onClick={onClose}>Back to location stock</button>
    </header>
    <p className="text-sm shrink-0">Corrections bind this exact location, batch and version. Reservations cannot be edited here. A different authorised manager must approve, and execution records an immutable movement. Selling price is unchanged.</p>
    {error && <p role="alert" className="text-red-500 shrink-0">{error}</p>}
    {actionResult && <p role="status" className="shrink-0">Adjustment posted once. Balance v{actionResult.version}: on hand {actionResult.on_hand}, available {actionResult.available} {balance.base_unit}. Valuation reconciliation may now be required.</p>}
    <div className="flex-1 min-h-0 overflow-auto space-y-4">
      {canRequest && !requestResult && <section className={`border rounded-xl p-3 space-y-3 ${panel}`}>
        <h2 className="font-semibold">Request exact correction</h2>
        {balance.tracking_policy === "SERIAL" ? <p role="status">Serial stock requires an identity-specific workflow; total adjustment is blocked.</p> : <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[["onHand", "Target on hand"], ["damaged", "Target damaged"], ["quarantined", "Target quarantined"]].map(([key, label]) => <label key={key}>{label}
              <input value={targets[key]} disabled={requesting} onChange={(event) => setTargets({ ...targets, [key]: event.target.value })}
                aria-invalid={!exactQuantity.test(targets[key] || "")} className={`mt-1 block w-full border rounded-lg p-2 font-mono ${panel}`} /></label>)}
          </div>
          <p className="text-sm">Reserved stays {balance.reserved} {balance.base_unit}. Use up to six decimal places and the reviewed unit increment.</p>
          <label className="block">Correction reason<textarea value={targets.reason} maxLength={1000} disabled={requesting}
            onChange={(event) => setTargets({ ...targets, reason: event.target.value })} className={`mt-1 block w-full border rounded-lg p-2 ${panel}`} /></label>
          <button type="button" className={button} disabled={requesting || targetError || !targets.reason.trim()} onClick={requestReview}>{requesting ? "Requesting…" : "Request manager review"}</button>
        </>}
      </section>}
      {requestResult && <p role="status">Review requested: {requestResult.case_key}. Refresh shows its current status.</p>}
      <section className={`border rounded-xl ${panel}`}>
        {loading ? <p role="status" className="p-3">Loading adjustment cases…</p> : !result?.items.length ? <p className="p-3">No adjustment cases for this stock record.</p> : <table className="w-full text-sm text-left">
          <thead className={`sticky top-0 ${panel}`}><tr>{["Status", "Before", "Target", "Reason", "Requestor", "Actions"].map((title) => <th key={title} className="p-3 whitespace-nowrap">{title}</th>)}</tr></thead>
          <tbody>{result.items.map((row) => <tr key={row.case_key} className="border-t">
            <td className="p-3">{row.status}</td>
            <td className="p-3 font-mono whitespace-nowrap">On hand {row.before_on_hand}<br />Damaged {row.before_damaged}<br />Quarantined {row.before_quarantined}</td>
            <td className="p-3 font-mono whitespace-nowrap">On hand {row.target_on_hand}<br />Damaged {row.target_damaged}<br />Quarantined {row.target_quarantined}</td>
            <td className="p-3 min-w-48">{row.reason}</td><td className="p-3">#{row.requestor_id}</td>
            <td className="p-3"><div className="flex flex-wrap gap-2">
              {row.status === "REQUESTED" && canReview && row.requestor_id !== userId && <button type="button" className={button} onClick={() => { setSelected(row); setActionResult(null); }}>Review</button>}
              {row.status === "APPROVED" && canExecute && <button type="button" className={button} onClick={() => { setSelected(row); setActionResult(null); }}>Execute</button>}
            </div></td>
          </tr>)}</tbody>
        </table>}
      </section>
      {selected?.status === "REQUESTED" && <section aria-label="Review stock adjustment" className={`border rounded-xl p-3 space-y-3 ${panel}`}>
        <h2 className="font-semibold">Independent decision</h2>
        <label>Outcome<select value={reviewOutcome} disabled={acting} onChange={(event) => setReviewOutcome(event.target.value)} className={`mt-1 block border rounded-lg p-2 ${panel}`}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label>
        <label className="block">Decision reason<textarea value={reviewReason} maxLength={1000} disabled={acting} onChange={(event) => setReviewReason(event.target.value)} className={`mt-1 block w-full border rounded-lg p-2 ${panel}`} /></label>
        <button type="button" className={button} disabled={acting || !reviewReason.trim()} onClick={review}>{acting ? "Saving…" : "Save decision"}</button>
      </section>}
      {selected?.status === "APPROVED" && <section aria-label="Execute stock adjustment" className={`border rounded-xl p-3 space-y-3 ${panel}`}>
        <p>Post the exact approved correction. This cannot change reservations, prices or serial identities. Runtime authority and the current stock version are rechecked.</p>
        <label><input type="checkbox" checked={confirmed} disabled={acting} onChange={(event) => setConfirmed(event.target.checked)} /> Execute only the reviewed target quantities shown above</label>
        <button type="button" className={button} disabled={acting || !confirmed} onClick={execute}>{acting ? "Posting…" : "Execute approved adjustment"}</button>
      </section>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : result?.pages || 1} totalCount={loading || error ? 0 : result?.total || 0}
      onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}

