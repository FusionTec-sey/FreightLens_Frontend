import React, { useEffect, useRef, useState } from 'react';
import PaginationToolbar from '../../../UI/UXComponent/PaginationToolbar';
import useOperationIntent from '../../../../hooks/useOperationIntent';
import { locationError } from '../../../../services/inventoryLocationsApi';

export default function CostReconciliationCases({ api, pool, candidate, userId,
  canRequest, canReview, canExecute, panel, button, isDark, onClose, onClosed }) {
  const [view, setView] = useState(canReview ? 'NEEDS_MY_REVIEW' : 'MY_REQUESTS');
  const [page, setPage] = useState(1), [cases, setCases] = useState(null), [checkpoints, setCheckpoints] = useState(null);
  const [reason, setReason] = useState(''), [decision, setDecision] = useState(null), [decisionReason, setDecisionReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(''), [refresh, setRefresh] = useState(0);
  const requestIntent = useOperationIntent(), reviewIntent = useOperationIntent(), closeIntent = useOperationIntent(), action = useRef(null);
  const dirty = Boolean(reason.trim() || decision || decisionReason.trim());
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setCases(null);
    Promise.all([
      api.costReconciliationCases(pool.id, null, page, 10, view, controller.signal),
      api.costReconciliationCheckpoints(pool.id, null, 1, 10, controller.signal),
    ]).then(([caseResponse, checkpointResponse]) => {
      if (!controller.signal.aborted) { setCases(caseResponse.data); setCheckpoints(checkpointResponse.data); }
    }).catch(failure => { if (!controller.signal.aborted) setError(locationError(failure).message); });
    return () => controller.abort();
  }, [api, pool.id, page, view, refresh]);
  async function run(call, success) {
    action.current?.abort(); action.current = new AbortController(); setBusy(true); setError(''); setSaved('');
    try { const { data } = await call(action.current.signal); if (!action.current.signal.aborted) success(data); }
    catch (failure) { if (!action.current.signal.aborted) setError(locationError(failure).message); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  function request() {
    if (!candidate || !reason.trim() || busy) return;
    const body = requestIntent.payloadFor(['cost-reconciliation', pool.id, candidate.product_id, candidate.valuation_version], {
      cost_pool_id: pool.id, product_id: candidate.product_id, reason: reason.trim(),
    });
    run(signal => api.requestCostReconciliation(body, signal), data => {
      setSaved(`Reconciliation review requested: ${data.case_key}`); setReason(''); setRefresh(value => value + 1);
    });
  }
  function review() {
    if (!decision || !decisionReason.trim() || busy) return;
    const body = reviewIntent.payloadFor(['cost-reconciliation-review', decision.case_key, decision.version], {
      expected_version: decision.version, outcome: decision.outcome, reason: decisionReason.trim(),
    });
    run(signal => api.reviewCostReconciliation(decision.case_key, body, signal), data => {
      setSaved(`Reconciliation ${data.status.toLowerCase()}.`); setDecision(null); setDecisionReason(''); setRefresh(value => value + 1);
    });
  }
  function close(row) {
    const body = closeIntent.payloadFor(['cost-reconciliation-close', row.case_key, row.valuation_version], {});
    run(signal => api.closeCostReconciliation(row.case_key, body, signal), data => {
      setSaved(`Immutable checkpoint ${data.checkpoint_key} closed. This is not an accounting-period close.`);
      setRefresh(value => value + 1); onClosed?.();
    });
  }
  return <section aria-label="Cost reconciliation cases" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="flex flex-wrap justify-between gap-2"><div><h1 className="text-xl font-bold">Reviewed cost checkpoints</h1><p>{pool.code} — {pool.name}</p></div><button type="button" className={button} disabled={busy || dirty} onClick={onClose}>Back to readiness</button></header>
    <p>A checkpoint certifies one exact product/pool quantity and valuation head. It does not rewrite weighted-average history, finalise accounts, export a journal or change selling prices.</p>
    {error && <p role="alert">{error}</p>}{saved && <p role="status" className="break-all">{saved}</p>}
    {candidate && canRequest && <div className="space-y-2 rounded border p-3"><p>Request review for <strong>{candidate.product_name}</strong>: {candidate.pool_quantity} {candidate.valuation_base_unit}, SCR {candidate.pool_value_scr}, valuation v{candidate.valuation_version}.</p><label className="block">Reconciliation request reason<textarea value={reason} disabled={busy} maxLength={1000} onChange={event => setReason(event.target.value)} className={`block w-full rounded border p-2 ${panel}`} /></label><button type="button" className={button} disabled={busy || !reason.trim()} onClick={request}>{busy ? 'Working…' : 'Request exact checkpoint review'}</button></div>}
    <div className="flex flex-wrap gap-2">{canReview && <button type="button" className={button} aria-pressed={view === 'NEEDS_MY_REVIEW'} onClick={() => { setView('NEEDS_MY_REVIEW'); setPage(1); }}>Needs my review</button>}<button type="button" className={button} aria-pressed={view === 'MY_REQUESTS'} onClick={() => { setView('MY_REQUESTS'); setPage(1); }}>My requests</button><button type="button" className={button} disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh checkpoints</button></div>
    <div className="flex-1 min-h-0 overflow-auto space-y-3">
      {!cases && !error && <p role="status">Loading reconciliation cases…</p>}
      {cases && !cases.items.length && <p>No reconciliation cases in this view.</p>}
      <ul className="space-y-2">{(cases?.items || []).map(row => <li key={row.case_key} className="rounded border p-3"><p>{row.product_name} · {row.status} · valuation v{row.valuation_version}</p><p>{row.pool_quantity} {row.base_unit} · SCR {row.pool_value_scr} · {row.balance_count} physical scope(s)</p><p>{row.reason}</p><div className="flex flex-wrap gap-2">{canReview && row.status === 'REQUESTED' && row.requestor_id !== userId && <><button type="button" className={button} disabled={busy} onClick={() => setDecision({ ...row, outcome: 'APPROVED' })}>Approve checkpoint</button><button type="button" className={button} disabled={busy} onClick={() => setDecision({ ...row, outcome: 'REJECTED' })}>Reject checkpoint</button></>}{canExecute && row.status === 'APPROVED' && <button type="button" className={button} disabled={busy} onClick={() => close(row)}>Close immutable checkpoint</button>}</div></li>)}</ul>
      {decision && <div className="space-y-2 rounded border p-3"><p>{decision.outcome === 'APPROVED' ? 'Approve' : 'Reject'} this exact valuation v{decision.version} review case?</p><label className="block">Reconciliation decision reason<textarea value={decisionReason} disabled={busy} maxLength={1000} onChange={event => setDecisionReason(event.target.value)} className={`block w-full rounded border p-2 ${panel}`} /></label><button type="button" className={button} disabled={busy || !decisionReason.trim()} onClick={review}>Confirm {decision.outcome.toLowerCase()}</button><button type="button" className={button} disabled={busy} onClick={() => { setDecision(null); setDecisionReason(''); }}>Cancel decision</button></div>}
      <section aria-label="Closed cost checkpoints"><h2 className="font-semibold">Closed checkpoints</h2>{checkpoints && !checkpoints.items.length && <p>No immutable checkpoints yet.</p>}<ul>{(checkpoints?.items || []).map(row => <li key={row.checkpoint_key} className="border-t py-2"><p>{row.product_name} · valuation v{row.valuation_version} · {row.pool_quantity} {row.base_unit} · SCR {row.pool_value_scr}</p><p className="break-all">{row.checkpoint_key}</p></li>)}</ul></section>
    </div>
    <PaginationToolbar isDark={isDark} page={page} pageSize={10} totalPages={cases?.pages || 1} totalCount={cases?.total || 0} onPageChange={setPage} />
  </section>;
}
