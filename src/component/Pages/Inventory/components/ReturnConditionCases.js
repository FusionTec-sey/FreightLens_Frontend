import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PaginationToolbar from '../../../UI/UXComponent/PaginationToolbar';
import { Badge, primaryButtonClass, secondaryButtonClass } from '../../../UI/UXComponent/RegisterShell';
import { useTheme } from '../../../../context/ThemeContext';
import {
  readStockConditionRecovery, removeStockConditionRecovery,
  stockConditionRecoveryScope, writeStockConditionRecovery,
} from '../../../../services/stockConditionRecovery';

const quantityPattern = /^\d{1,18}(?:\.\d{1,6})?$/;
const positiveQuantity = value => quantityPattern.test(String(value || ''))
  && /[1-9]/.test(String(value).replace('.', ''));
const rows = value => Array.isArray(value) ? value : value?.items || [];
const label = value => String(value || '').replaceAll('_', ' ');
const detail = failure => {
  const value = failure?.response?.data?.detail || failure?.message;
  return typeof value === 'string' ? value : value?.message
    || 'The server outcome is uncertain. Retry the identical saved action.';
};
const uncertain = failure => !failure?.response || failure.response.status >= 500;
const conflict = failure => failure?.response?.status === 409;
const makeKey = () => {
  if (typeof window.crypto?.randomUUID !== 'function') throw new Error('Secure operation identity is unavailable.');
  return window.crypto.randomUUID();
};

function SourceLine({ source, busy, onOpen }) {
  return <article className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold">{source.product_name}</h4><p>{source.product_sku} · {source.branch_name} · {source.location_name}</p></div>
      <Badge tone="amber">{source.remaining_eligible} {source.base_unit} eligible</Badge>
    </div>
    <p className="mt-2">Credit note <strong>{source.credit_note_number}</strong> · line #{source.credit_note_line_id}</p>
    <p className="break-all font-mono text-[11px]">Return {source.return_key} · movement {source.return_operation_key}</p>
    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <div><dt>Returned</dt><dd>{source.source_quantity} {source.base_unit}</dd></div>
      <div><dt>Already moved</dt><dd>{source.previously_transitioned} {source.base_unit}</dd></div>
      <div><dt>Pending review</dt><dd>{source.pending_review_quantity} {source.base_unit}</dd></div>
      <div><dt>Quarantined now</dt><dd>{source.quarantined_available} {source.base_unit}</dd></div>
    </dl>
    <button type="button" className={`${primaryButtonClass} mt-3`} disabled={busy} onClick={() => onOpen(source)}>Request damaged classification</button>
  </article>;
}

function CaseLine({ item, userId, busy, canReview, canExecute, onReview, onExecute }) {
  return <article className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold">{item.product_name} · {item.product_sku}</h4><p>{item.branch_name} · {item.location_name} · {item.quantity} {item.base_unit}</p></div>
      <Badge tone={item.status === 'CONSUMED' ? 'emerald' : item.status === 'REJECTED' ? 'rose' : 'amber'}>{label(item.status)}</Badge>
    </div>
    <p className="mt-2">Credit note <strong>{item.credit_note_number}</strong> · line #{item.credit_note_line_id}</p>
    <p className="break-all font-mono text-[11px]">Case {item.case_key} · return {item.return_key} · movement {item.return_operation_key}</p>
    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <div><dt>On hand</dt><dd>{item.before_on_hand}</dd></div><div><dt>Reserved</dt><dd>{item.before_reserved}</dd></div>
      <div><dt>Quarantined</dt><dd>{item.before_quarantined} → {item.target_quarantined}</dd></div>
      <div><dt>Damaged</dt><dd>{item.before_damaged} → {item.target_damaged}</dd></div>
    </dl>
    <p className="mt-2">{item.reason}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {item.status === 'REQUESTED' && canReview && Number(item.requestor_id) !== Number(userId)
        && <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => onReview(item)}>Review</button>}
      {item.status === 'REQUESTED' && canReview && Number(item.requestor_id) === Number(userId)
        && <span className="text-xs text-slate-500">Independent reviewer required</span>}
      {item.status === 'APPROVED' && canExecute
        && <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => onExecute(item)}>Execute approved transition</button>}
    </div>
  </article>;
}

export default function ReturnConditionCases({ api, orgId, userId, canRequest = false,
  canReview = false, canExecute = false, invoiceKey = null, compact = false, onClose }) {
  const { isDark } = useTheme();
  const [sourcePage, setSourcePage] = useState(1), [casePage, setCasePage] = useState(1);
  const [limit, setLimit] = useState(compact ? 100 : 25), [view, setView] = useState('ALL');
  const [sources, setSources] = useState(null), [cases, setCases] = useState(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [recoveryError, setRecoveryError] = useState('');
  const [action, setAction] = useState(null), [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const lifecycle = useRef(null), running = useRef(false);
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';

  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const requests = [api.stockConditionCases(casePage, limit, signal, view)];
      if (canRequest) requests.push(api.stockConditionSources(sourcePage, limit, signal));
      const [caseResult, sourceResult] = await Promise.all(requests);
      if (signal.aborted) return;
      setCases(caseResult.data); setSources(sourceResult?.data || null);
    } catch (failure) {
      if (!signal.aborted) { setCases(null); setSources(null); setError(detail(failure)); }
    } finally { if (!signal.aborted) setLoading(false); }
  }, [api, canRequest, casePage, limit, sourcePage, view]);

  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller; load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);

  const visibleSources = useMemo(() => rows(sources).filter(row => !invoiceKey
    || String(row.invoice_key) === String(invoiceKey)), [invoiceKey, sources]);
  const visibleCases = useMemo(() => rows(cases).filter(row => !invoiceKey
    || String(row.invoice_key) === String(invoiceKey)), [cases, invoiceKey]);

  const recovered = (kind, target) => {
    const scope = stockConditionRecoveryScope(orgId, userId, kind, target);
    return { scope, record: readStockConditionRecovery(scope) };
  };
  const openRequest = source => {
    try {
      const saved = recovered('REQUEST', source.credit_note_line_id);
      setAction({ kind: 'REQUEST', source, quantity: saved.record?.body.quantity || '',
        reason: saved.record?.body.reason || '', ...saved, conflict: false }); setError('');
    } catch (failure) { setRecoveryError(failure.message); }
  };
  const openReview = item => {
    try {
      const saved = recovered('REVIEW', item.case_key);
      setAction({ kind: 'REVIEW', item, outcome: saved.record?.body.outcome || 'APPROVED',
        reason: saved.record?.body.reason || '', ...saved, conflict: false }); setError('');
    } catch (failure) { setRecoveryError(failure.message); }
  };
  const openExecute = item => {
    try {
      const saved = recovered('EXECUTE', item.case_key);
      setAction({ kind: 'EXECUTE', item, confirmed: false, ...saved, conflict: false }); setError('');
    } catch (failure) { setRecoveryError(failure.message); }
  };

  const finishRecovery = async (scope, record) => {
    await removeStockConditionRecovery(scope, record.revision);
  };
  const saveRecovery = async (current, body) => current.record
    || writeStockConditionRecovery(current.scope, 0, body);

  const perform = async (event) => {
    event?.preventDefault();
    if (!action || running.current || action.conflict) return;
    let body;
    try {
      if (action.kind === 'REQUEST') {
        if (!positiveQuantity(action.quantity) || !action.reason.trim()) { setError('Enter an exact positive quantity and reason.'); return; }
        body = action.record?.body || { operation_key: makeKey(), credit_note_line_id: action.source.credit_note_line_id,
          expected_source_version: action.source.stock_version, quantity: action.quantity.trim(), reason: action.reason.trim() };
      } else if (action.kind === 'REVIEW') {
        if (!action.reason.trim()) { setError('Enter the independent review reason.'); return; }
        body = action.record?.body || { operation_key: makeKey(), expected_version: action.item.version,
          outcome: action.outcome, reason: action.reason.trim() };
      } else {
        if (!action.confirmed) return;
        body = action.record?.body || { operation_key: makeKey() };
      }
    } catch (failure) { setRecoveryError(failure.message); return; }
    let record;
    try { record = await saveRecovery(action, body); }
    catch (failure) { setRecoveryError(`${failure.message} No request was sent.`); return; }
    setAction(current => ({ ...current, record })); running.current = true; setBusy(true); setError(''); setRecoveryError('');
    try {
      let response;
      if (action.kind === 'REQUEST') response = await api.requestStockCondition(body, lifecycle.current.signal);
      else if (action.kind === 'REVIEW') response = await api.reviewStockCondition(action.item.case_key, body, lifecycle.current.signal);
      else response = await api.executeStockCondition(action.item.case_key, body, lifecycle.current.signal);
      if (action.kind === 'EXECUTE') {
        const value = response.data;
        if (value.operation_key !== body.operation_key || value.status !== 'CONSUMED'
          || value.condition_effect !== 'QUARANTINED_TO_DAMAGED' || value.valuation_effect !== 'NONE'
          || value.accounting_effect !== 'NONE' || value.pricing_effect !== 'NONE') {
          throw new Error('Stock-condition outcome was not confirmed. Retry the identical saved action.');
        }
        setResult(value);
      } else setResult(response.data);
      try { await finishRecovery(action.scope, record); }
      catch (failure) { setRecoveryError(`${failure.message} The server confirmed this action; reload before another action.`); }
      setAction(null); setRevision(value => value + 1);
    } catch (failure) {
      if (!lifecycle.current?.signal.aborted) {
        if (!uncertain(failure) && !conflict(failure)) {
          try { await finishRecovery(action.scope, record); setAction(null); }
          catch (cleanup) { setRecoveryError(cleanup.message); }
        } else setAction(current => ({ ...current, record, conflict: conflict(failure) }));
        setError(conflict(failure) ? `${detail(failure)} This saved action is locked; discard it and refresh.` : detail(failure));
      }
    } finally { running.current = false; if (!lifecycle.current?.signal.aborted) setBusy(false); }
  };

  const discard = async () => {
    if (!action?.record || busy) { setAction(null); return; }
    if (!action.conflict) { setAction(null); return; }
    try { await finishRecovery(action.scope, action.record); setAction(null); setRecoveryError(''); setRevision(value => value + 1); }
    catch (failure) { setRecoveryError(failure.message); }
  };

  return <section aria-label="Return condition reviews" className={`flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border p-3 ${panel} ${compact ? '' : 'h-full'}`}>
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Returned stock condition</h2><p className="text-xs">Reviewed non-serial quarantine to damaged transition only.</p></div>
      <div className="flex gap-2"><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setRevision(value => value + 1)}>Refresh</button>{onClose && <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Close</button>}</div>
    </header>
    <p className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><strong>Stock remains unavailable.</strong> This action preserves on-hand, reserved and available quantities and has no valuation, accounting or pricing effect. It does not make damaged stock saleable.</p>
    {recoveryError && <p role="alert" className="shrink-0 text-amber-600 dark:text-amber-300">{recoveryError}</p>}
    {error && <p role="alert" className="shrink-0 text-rose-600 dark:text-rose-300">{error}</p>}
    {result?.status && result.status !== 'CONSUMED' && <p role="status" className="shrink-0 rounded-xl border border-emerald-300 p-3 text-sm">Condition case is now {label(result.status)}. Current server state has been reloaded.</p>}
    {result?.status === 'CONSUMED' && <p role="status" className="shrink-0 rounded-xl border border-emerald-300 p-3 text-sm">Transition posted once. On hand {result.on_hand}; reserved {result.reserved}; available {result.available}; quarantined {result.quarantined}; damaged {result.damaged}. Valuation, accounting and pricing: no effect.</p>}
    <div className="min-h-0 flex-1 space-y-4 overflow-auto">
      {loading && <p role="status">Loading exact return-stock lineage…</p>}
      {!loading && canRequest && <section aria-label="Eligible returned stock" className="space-y-2"><h3 className="font-semibold">Eligible processed return lines</h3>
        {!visibleSources.length && <p className="rounded-xl border border-dashed p-3 text-sm">No eligible processed non-serial return line is present on this server page.</p>}
        {visibleSources.map(source => <SourceLine key={source.credit_note_line_id} source={source} busy={busy} onOpen={openRequest} />)}
      </section>}
      {!loading && <section aria-label="Stock condition cases" className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Reviewed condition cases</h3><label className="text-sm">View <select value={view} disabled={busy} className={`ml-2 rounded-lg border p-2 ${panel}`} onChange={event => { setView(event.target.value); setCasePage(1); }}><option value="ALL">All accessible</option><option value="NEEDS_MY_REVIEW">Needs my review</option><option value="MY_REQUESTS">My requests</option></select></label></div>
        {!visibleCases.length && <p className="rounded-xl border border-dashed p-3 text-sm">No return-condition case is present on this server page.</p>}
        {visibleCases.map(item => <CaseLine key={item.case_key} item={item} userId={userId} busy={busy} canReview={canReview} canExecute={canExecute} onReview={openReview} onExecute={openExecute} />)}
      </section>}
      {action?.kind === 'REQUEST' && <form aria-label="Request damaged classification" onSubmit={perform} className="rounded-xl border border-sky-300 p-3 dark:border-sky-800"><h3 className="font-semibold">Request exact quarantine to damaged review</h3><p className="text-xs">{action.source.product_name} · credit note {action.source.credit_note_number} · line #{action.source.credit_note_line_id} · stock v{action.source.stock_version}</p><label className="mt-2 block text-sm font-semibold">Exact quantity<input aria-label="Condition transition quantity" inputMode="decimal" disabled={busy || !!action.record} value={action.quantity} onChange={event => setAction(current => ({ ...current, quantity: event.target.value }))} className={`mt-1 block min-h-[44px] w-full rounded-lg border p-2 font-mono ${panel}`} /></label><p className="mt-1 text-xs">Server remaining eligible: {action.source.remaining_eligible} {action.source.base_unit}. The server rechecks cumulative use and quarantined stock.</p><label className="mt-2 block text-sm font-semibold">Reason<textarea aria-label="Condition transition reason" maxLength="1000" disabled={busy || !!action.record} value={action.reason} onChange={event => setAction(current => ({ ...current, reason: event.target.value }))} className={`mt-1 block min-h-[88px] w-full rounded-lg border p-2 ${panel}`} /></label><div className="mt-3 flex gap-2"><button type="submit" className={primaryButtonClass} disabled={busy || action.conflict}>{busy ? 'Requesting…' : action.record ? 'Retry exact condition request' : 'Request manager review'}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={discard}>{action.conflict ? 'Discard stale request' : action.record ? 'Keep saved action' : 'Cancel'}</button></div></form>}
      {action?.kind === 'REVIEW' && <form aria-label="Review return condition" onSubmit={perform} className="rounded-xl border border-sky-300 p-3 dark:border-sky-800"><h3 className="font-semibold">Independent condition review</h3><p className="text-xs">Case {action.item.case_key} v{action.item.version} · {action.item.quantity} {action.item.base_unit} quarantine to damaged</p><label className="mt-2 block text-sm font-semibold">Decision<select disabled={busy || !!action.record} value={action.outcome} onChange={event => setAction(current => ({ ...current, outcome: event.target.value }))} className={`mt-1 block min-h-[44px] w-full rounded-lg border p-2 ${panel}`}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label><label className="mt-2 block text-sm font-semibold">Review reason<textarea maxLength="1000" disabled={busy || !!action.record} value={action.reason} onChange={event => setAction(current => ({ ...current, reason: event.target.value }))} className={`mt-1 block min-h-[88px] w-full rounded-lg border p-2 ${panel}`} /></label><div className="mt-3 flex gap-2"><button type="submit" className={primaryButtonClass} disabled={busy || action.conflict}>{busy ? 'Saving…' : action.record ? 'Retry exact review' : 'Save decision'}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={discard}>{action.conflict ? 'Discard stale review' : action.record ? 'Keep saved action' : 'Cancel'}</button></div></form>}
      {action?.kind === 'EXECUTE' && <section aria-label="Execute return condition" className="rounded-xl border border-sky-300 p-3 dark:border-sky-800"><h3 className="font-semibold">Execute approved condition transition</h3><p className="text-sm">Post exactly {action.item.quantity} {action.item.base_unit} from quarantined to damaged. On-hand, reserved, available, valuation, accounting and pricing remain unchanged.</p><label className="mt-2 block text-sm"><input type="checkbox" checked={action.confirmed} disabled={busy || !!action.record} onChange={event => setAction(current => ({ ...current, confirmed: event.target.checked }))} /> Confirm the exact reviewed transition</label><div className="mt-3 flex gap-2"><button type="button" className={primaryButtonClass} disabled={busy || action.conflict || (!action.confirmed && !action.record)} onClick={perform}>{busy ? 'Executing…' : action.record ? 'Retry exact execution' : 'Execute once'}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={discard}>{action.conflict ? 'Discard stale execution' : action.record ? 'Keep saved action' : 'Cancel'}</button></div></section>}
    </div>
    {!compact && <div className="shrink-0 grid grid-cols-1 gap-2 lg:grid-cols-2">
      {canRequest && <PaginationToolbar page={sourcePage} pageSize={limit} totalPages={loading || error ? 1 : sources?.pages || 1} totalCount={loading || error ? 0 : sources?.total || 0} onPageChange={setSourcePage} onPageSizeChange={value => { setLimit(value); setSourcePage(1); setCasePage(1); }} isDark={isDark} />}
      <PaginationToolbar page={casePage} pageSize={limit} totalPages={loading || error ? 1 : cases?.pages || 1} totalCount={loading || error ? 0 : cases?.total || 0} onPageChange={setCasePage} onPageSizeChange={value => { setLimit(value); setSourcePage(1); setCasePage(1); }} isDark={isDark} />
    </div>}
  </section>;
}
