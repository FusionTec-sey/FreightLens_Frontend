import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, primaryButtonClass, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import { readReturnRecovery, removeReturnRecovery, returnRecoveryScope, writeReturnRecovery } from '../../../services/salesReturnRecovery';
import ReturnConditionCases from '../Inventory/components/ReturnConditionCases';

const makeKey = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 3) | 8).toString(16);
  });
const quantityPattern = /^\d{1,12}(?:\.\d{1,6})?$/;
const positiveQuantity = value => quantityPattern.test(value)
  && /[1-9]/.test(value.replace('.', ''));
const detail = failure => {
  const value = failure?.response?.data?.detail || failure?.message;
  return typeof value === 'string' ? value : value?.message
    || 'The server outcome is uncertain. Keep this screen open and retry the identical action.';
};
const isUncertain = failure => !failure?.response || failure.response.status >= 500;
const isConflict = failure => failure?.response?.status === 409;
const rows = value => Array.isArray(value) ? value : value?.items || [];
const label = value => String(value || '').replaceAll('_', ' ');
const conditionChoices = [
  { code: 'UNOPENED', label: 'Unopened' }, { code: 'OPENED', label: 'Opened' },
  { code: 'DAMAGED', label: 'Damaged' }, { code: 'UNKNOWN', label: 'Condition not confirmed' },
];
const isZero = value => /^0+(?:\.0+)?$/.test(String(value || ''));

function QuantityBreakdown({ handover, unit }) {
  return <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
    <div><dt className="text-slate-500 dark:text-slate-400">Handed over</dt><dd>{handover.handed_over} {unit}</dd></div>
    <div><dt className="text-slate-500 dark:text-slate-400">Previously returned</dt><dd>{handover.accepted_returned} {unit}</dd></div>
    <div><dt className="text-slate-500 dark:text-slate-400">Pending review</dt><dd>{handover.pending_return} {unit}</dd></div>
    <div><dt className="text-slate-500 dark:text-slate-400">Returnable now</dt><dd className="font-semibold">{handover.returnable} {unit}</dd></div>
  </dl>;
}

function CreditOutcome({ value }) {
  if (!value) return null;
  const preview = value.credit_preview || value;
  return <section aria-label="Server-calculated credit outcome" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
    <h4 className="font-semibold">Original-term credit · {preview.currency || 'SCR'} {preview.gross_credit_scr}</h4>
    <p className="mt-1">Applied to unpaid invoice debt: {preview.currency || 'SCR'} {preview.invoice_debt_applied_scr}</p>
    <p>Surplus non-expiring customer credit: {preview.currency || 'SCR'} {preview.customer_credit_scr}</p>
    <p className="mt-2 text-xs">Calculated by the server from the immutable invoice price and tax terms. This screen does not calculate a refund or redeem customer credit.</p>
  </section>;
}

export default function SalesReturnPanel({ api, invoice, orgId, userId, canRequest = false, canReview = false,
  canProcess = false, canRequestCondition = false, onClose }) {
  const [options, setOptions] = useState(null), [claims, setClaims] = useState(null), [creditNotes, setCreditNotes] = useState(null);
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [quantities, setQuantities] = useState({}), [conditions, setConditions] = useState({});
  const [returnerName, setReturnerName] = useState(''), [returnerContact, setReturnerContact] = useState(''), [reason, setReason] = useState('');
  const [claimIntent, setClaimIntent] = useState(() => ({ return_key: makeKey(), operation_key: makeKey() }));
  const [pendingClaim, setPendingClaim] = useState(null), [claimConflict, setClaimConflict] = useState(false);
  const [review, setReview] = useState(null), [processing, setProcessing] = useState(null);
  const [recovery, setRecovery] = useState(null), [recoveryError, setRecoveryError] = useState('');
  const controller = useRef(null), running = useRef(false);
  const recoveryScopeResult = useMemo(() => {
    try { return { key: returnRecoveryScope(orgId, userId, invoice.invoice_key), error: '' }; }
    catch (failure) { return { key: null, error: failure.message }; }
  }, [invoice.invoice_key, orgId, userId]);
  const recoveryId = recoveryScopeResult.key;

  useEffect(() => {
    if (!recoveryId) { setRecoveryError(recoveryScopeResult.error); return; }
    try {
      const saved = readReturnRecovery(recoveryId); setRecovery(saved); setRecoveryError('');
      if (saved?.kind === 'CLAIM') {
        const body = saved.body;
        setClaimIntent({ return_key: body.return_key, operation_key: body.operation_key });
        setPendingClaim(body); setReturnerName(body.returner_name); setReturnerContact(body.returner_contact); setReason(body.reason);
        setQuantities(Object.fromEntries(body.lines.map(line => [line.handover_allocation_key, line.quantity])));
        setConditions(Object.fromEntries(body.lines.map(line => [line.handover_allocation_key, line.condition])));
      }
    } catch (failure) { setRecoveryError(failure.message || 'Uncertain return recovery could not be read.'); }
  }, [recoveryId, recoveryScopeResult.error]);

  useEffect(() => {
    if (!recoveryId || recovery?.kind !== 'CREDIT_NOTE' || processing || !claims) return undefined;
    const claim = rows(claims).find(row => String(row.return_key) === String(recovery.return_key));
    if (!claim) { setRecoveryError('The recovered approved return is not on this invoice page. Reload its exact return before processing.'); return undefined; }
    const request = new AbortController();
    api.returnProcessingOptions(claim.return_key, request.signal).then(({ data }) => {
      if (request.signal.aborted) return;
      const body = recovery.body;
      const matches = String(data.return_key) === String(claim.return_key)
        && data.claim_version === body.expected_claim_version
        && data.option_version === body.expected_option_version
        && data.fingerprint === body.expected_fingerprint;
      setProcessing({ claim, options: data, operation_key: body.operation_key,
        pendingBody: body, conflict: !matches });
      if (!matches) setRecoveryError('The recovered credit calculation is stale. It is locked; discard it and load a fresh server calculation.');
    }).catch(failure => { if (!request.signal.aborted) setRecoveryError(detail(failure)); });
    return () => request.abort();
  }, [api, claims, processing, recovery, recoveryId]);

  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const requests = [api.returnOptions(invoice.invoice_key, signal), api.invoiceReturnClaims(invoice.invoice_key, page, 10, signal)];
      if (api.invoiceCreditNotes) requests.push(api.invoiceCreditNotes(invoice.invoice_key, 1, 25, signal));
      const [optionResult, claimResult, creditResult] = await Promise.all(requests);
      if (signal?.aborted) return;
      if (String(optionResult.data.invoice_key) !== String(invoice.invoice_key)) throw new Error('Return options do not match this invoice.');
      setOptions(optionResult.data); setClaims(claimResult.data); setCreditNotes(creditResult?.data || null);
    } catch (failure) {
      if (!signal?.aborted) { setOptions(null); setClaims(null); setCreditNotes(null); setError(detail(failure)); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [api, invoice.invoice_key, page]);

  useEffect(() => {
    const request = new AbortController(); controller.current = request; load(request.signal);
    return () => request.abort();
  }, [load]);

  const handovers = useMemo(() => (options?.handovers || []).map(handover => ({
    handover, line: (options?.lines || []).find(line => String(line.invoice_line_key) === String(handover.invoice_line_key)) || {
      invoice_line_key: handover.invoice_line_key, product_name: 'Product unavailable', sku: '', base_unit: handover.base_unit,
    },
  })), [options]);
  const requestedLines = useMemo(() => handovers.flatMap(({ line, handover }) => {
    const key = handover.handover_allocation_key;
    const quantity = (quantities[key] || '').trim();
    if (!positiveQuantity(quantity)) return [];
    return [{ invoice_line_key: line.invoice_line_key, handover_allocation_key: key,
      quantity, condition: conditions[key] || '' }];
  }), [conditions, handovers, quantities]);

  const resetClaim = () => {
    setQuantities({}); setConditions({}); setReturnerName(''); setReturnerContact(''); setReason('');
    setPendingClaim(null); setClaimConflict(false); setClaimIntent({ return_key: makeKey(), operation_key: makeKey() }); setError('');
  };

  const submitClaim = async event => {
    event.preventDefault();
    if (running.current || claimConflict || !options) return;
    if (!pendingClaim && (!returnerName.trim() || !returnerContact.trim() || reason.trim().length < 3 || !requestedLines.length || requestedLines.some(row => !row.condition))) {
      setError('Enter the returner, contact, reason, observed condition and at least one exact handover quantity.'); return;
    }
    const body = pendingClaim || { ...claimIntent, invoice_key: invoice.invoice_key,
      expected_invoice_version: options.invoice_version,
      returner_name: returnerName.trim(), returner_contact: returnerContact.trim(), reason: reason.trim(), lines: requestedLines };
    let activeRecovery = recovery;
    if (!pendingClaim) {
      if (!recoveryId) { setError(recoveryScopeResult.error || 'Safe local recovery is unavailable.'); return; }
      try {
        activeRecovery = await writeReturnRecovery(recoveryId, recovery?.revision || 0, 'CLAIM', body.return_key, body);
        setRecovery(activeRecovery); setRecoveryError('');
      } catch (failure) { setRecoveryError(failure.message || 'Exact return recovery could not be saved. No request was sent.'); return; }
    }
    setPendingClaim(body); running.current = true; setBusy(true); setError('');
    try {
      await api.createReturnClaim(claimIntent.return_key, body, controller.current?.signal);
      try { await removeReturnRecovery(recoveryId, activeRecovery.revision); setRecovery(null); }
      catch (failure) { setRecoveryError(`${failure.message} The server confirmed this claim; reload before trying another action.`); }
      resetClaim(); await load(controller.current?.signal);
    } catch (failure) {
      if (!controller.current?.signal.aborted) {
        if (isConflict(failure)) setClaimConflict(true);
        if (!isUncertain(failure) && !isConflict(failure)) {
          setPendingClaim(null);
          try { await removeReturnRecovery(recoveryId, activeRecovery.revision); setRecovery(null); }
          catch (cleanupFailure) { setRecoveryError(cleanupFailure.message); }
        }
        setError(isConflict(failure)
          ? `${detail(failure)} This exact return request is stale or conflicts with another claim. Start a fresh request after reloading eligibility.`
          : detail(failure));
      }
    } finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  const submitReview = async event => {
    event.preventDefault();
    if (running.current || !review) return;
    const body = review.pendingBody || { operation_key: review.operation_key, expected_version: review.claim.version,
      outcome: review.outcome, reason: review.note.trim() };
    setReview(current => ({ ...current, pendingBody: body })); running.current = true; setBusy(true); setError('');
    try {
      await api.reviewReturnClaim(review.claim.return_key, body, controller.current?.signal);
      setReview(null); await load(controller.current?.signal);
    } catch (failure) {
      if (!controller.current?.signal.aborted) {
        setReview(current => ({ ...current, conflict: isConflict(failure), pendingBody: isUncertain(failure) || isConflict(failure) ? body : null }));
        setError(isConflict(failure) ? `${detail(failure)} Reload before reviewing again.` : detail(failure));
      }
    } finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  const openProcessing = async claim => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      const { data } = await api.returnProcessingOptions(claim.return_key, controller.current?.signal);
      if (String(data.return_key) !== String(claim.return_key)) throw new Error('Credit processing options do not match this return claim.');
      setProcessing({ claim, options: data, operation_key: makeKey(), pendingBody: null, conflict: false });
    } catch (failure) { if (!controller.current?.signal.aborted) setError(detail(failure)); }
    finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  const createCreditNote = async () => {
    if (running.current || !processing || processing.conflict) return;
    const body = processing.pendingBody || { operation_key: processing.operation_key,
      expected_claim_version: processing.claim.version,
      expected_option_version: processing.options.option_version,
      expected_fingerprint: processing.options.fingerprint };
    let activeRecovery = recovery;
    if (!processing.pendingBody) {
      if (!recoveryId) { setError(recoveryScopeResult.error || 'Safe local recovery is unavailable.'); return; }
      try {
        activeRecovery = await writeReturnRecovery(recoveryId, recovery?.revision || 0, 'CREDIT_NOTE', processing.claim.return_key, body);
        setRecovery(activeRecovery); setRecoveryError('');
      } catch (failure) { setRecoveryError(failure.message || 'Exact credit-note recovery could not be saved. No request was sent.'); return; }
    }
    setProcessing(current => ({ ...current, pendingBody: body })); running.current = true; setBusy(true); setError('');
    try {
      await api.createReturnCreditNote(processing.claim.return_key, body, controller.current?.signal);
      try { await removeReturnRecovery(recoveryId, activeRecovery.revision); setRecovery(null); }
      catch (failure) { setRecoveryError(`${failure.message} The server confirmed this credit note; reload before trying another action.`); }
      setProcessing(null); await load(controller.current?.signal);
    } catch (failure) {
      if (!controller.current?.signal.aborted) {
        setProcessing(current => ({ ...current, conflict: isConflict(failure), pendingBody: isUncertain(failure) || isConflict(failure) ? body : null }));
        if (!isUncertain(failure) && !isConflict(failure)) {
          try { await removeReturnRecovery(recoveryId, activeRecovery.revision); setRecovery(null); }
          catch (cleanupFailure) { setRecoveryError(cleanupFailure.message); }
        }
        setError(isConflict(failure) ? `${detail(failure)} The approved claim or credit calculation changed. Reload and start a fresh processing request.` : detail(failure));
      }
    } finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  return <section aria-label="Sales returns" className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 className="text-lg font-semibold">Returns · {invoice.invoice_number}</h2><p className="text-xs">Original invoice and actual handover quantities remain authoritative.</p></div>
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Back to invoice</button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
      {recoveryError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{recoveryError}</p>}
      {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><p>{error}</p>{claimConflict && <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={async () => { try { if (recoveryId && recovery) { await removeReturnRecovery(recoveryId, recovery.revision); setRecovery(null); } resetClaim(); await load(controller.current?.signal); } catch (failure) { setRecoveryError(failure.message); } }}>Discard stale request and reload</button>}</div>}
      {loading && <p role="status">Loading exact handover and return eligibility…</p>}
      {options && <>
        <section className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-2 dark:border-slate-700">
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Invoice</p><p className="font-semibold">{options.invoice_number}</p><p className="break-all font-mono text-[11px]">{options.invoice_key}</p></div>
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Customer</p><p className="font-semibold">{options.customer_name || 'Customer name unavailable'}</p><p className="break-all font-mono text-[11px]">{options.customer_key}</p></div>
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Selling store</p><p>{options.branch_name || `Branch ${options.branch_id}`}</p></div>
          <div className="flex flex-wrap items-start gap-2"><Badge tone="emerald">{label(invoice.payment_status)}</Badge><Badge tone="amber">{label(invoice.fulfilment_status)}</Badge><Badge tone="amber">Manager review required</Badge></div>
        </section>
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><strong>Quarantine only.</strong> Accepted physical returns are not sellable stock. A separate condition review must release or dispose of them.</p>
        <section aria-label="Return eligibility" className="space-y-3">
          <h3 className="font-semibold">Original invoice lines and handovers</h3>
          {!handovers.length && <p className="rounded-xl border border-dashed p-3 text-sm">No handed-over quantity is eligible for a return claim.</p>}
          {handovers.map(({ line, handover }) => { const key = handover.handover_allocation_key; return <article key={key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold">{line.product_name || `Product ${line.product_id}`}</h4><p className="text-xs">{line.sku || 'No SKU'} · invoice line <span className="font-mono">{line.invoice_line_key}</span></p></div><Badge tone={isZero(handover.returnable) ? 'slate' : 'emerald'}>{handover.returnable} {line.base_unit} returnable</Badge></div>
            <p className="mt-2 text-xs">Handover <span className="font-mono">{key}</span> · collection <span className="font-mono">{handover.collection_key}</span></p>
            <p className="text-xs">{handover.location_name || `Location ${handover.location_id}`}{handover.location_code ? ` · ${handover.location_code}` : ''}{handover.batch_code ? ` · batch ${handover.batch_code}` : ''}</p>
            <QuantityBreakdown handover={handover} unit={line.base_unit} />
            {canRequest && !isZero(handover.returnable) && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs font-semibold">Return quantity for this handover<input aria-label={`Return quantity for ${key}`} inputMode="decimal" disabled={busy || !!pendingClaim || claimConflict} className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" value={quantities[key] || ''} onChange={event => setQuantities(current => ({ ...current, [key]: event.target.value }))} /></label><label className="text-xs font-semibold">Observed condition<select aria-label={`Observed condition for ${key}`} disabled={busy || !!pendingClaim || claimConflict} className="mt-1 block min-h-[44px] w-full rounded-lg border bg-white p-2 dark:bg-slate-800" value={conditions[key] || ''} onChange={event => setConditions(current => ({ ...current, [key]: event.target.value }))}><option value="">Choose condition</option>{conditionChoices.map(choice => <option key={choice.code} value={choice.code}>{choice.label}</option>)}</select></label></div>}
          </article>; })}
        </section>
          {canRequest && !!handovers.length && <form onSubmit={submitClaim} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><h3 className="font-semibold">Request reviewed return</h3><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-sm font-semibold">Returner name<input required maxLength="150" disabled={busy || !!pendingClaim || claimConflict} className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" value={returnerName} onChange={event => setReturnerName(event.target.value)} /></label><label className="text-sm font-semibold">Returner contact<input required maxLength="50" disabled={busy || !!pendingClaim || claimConflict} className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" value={returnerContact} onChange={event => setReturnerContact(event.target.value)} /></label></div><label className="mt-2 block text-sm font-semibold">Reason<textarea required minLength="1" maxLength="1000" disabled={busy || !!pendingClaim || claimConflict} className="mt-1 block min-h-[88px] w-full rounded-lg border p-2 dark:bg-slate-800" value={reason} onChange={event => setReason(event.target.value)} /></label><p className="mt-2 text-xs">Submission reserves the eligible quantity for mandatory manager review. It does not refund cash/card, redeem credit or make stock available.</p><button type="submit" className={`${primaryButtonClass} mt-3`} disabled={busy || claimConflict}>{busy ? 'Submitting…' : pendingClaim ? 'Retry exact return request' : 'Request return review'}</button></form>}
      </>}
      {!!rows(claims).length && <section aria-label="Return claims" className="space-y-2"><h3 className="font-semibold">Return claims</h3>{rows(claims).map(claim => <article key={claim.return_key} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">Return claim <span className="font-mono text-xs">{claim.return_key}</span></p><p>Returner: {claim.returner_name} · {claim.returner_contact}</p></div><Badge tone={claim.status === 'CREDITED' ? 'emerald' : claim.status === 'REJECTED' ? 'rose' : 'amber'}>{label(claim.status)}</Badge></div><p className="mt-2">{claim.reason}</p><p className="mt-1 text-xs">Server-estimated original-term credit: SCR {claim.estimated_gross_credit_scr}</p><ul className="mt-2 list-disc pl-5 text-xs">{(claim.lines || []).map(line => <li key={`${line.invoice_line_key}:${line.handover_allocation_key}`}>{line.quantity} {line.base_unit} · {label(line.condition)} · invoice line <span className="font-mono">{line.invoice_line_key}</span> · handover <span className="font-mono">{line.handover_allocation_key}</span></li>)}</ul><div className="mt-3 flex flex-wrap gap-2">{canReview && claim.status === 'REQUESTED' && <><button type="button" className={primaryButtonClass} disabled={busy} onClick={() => setReview({ claim, outcome: 'APPROVED', note: '', operation_key: makeKey(), pendingBody: null, conflict: false })}>Review claim</button></>}{canProcess && claim.status === 'APPROVED' && <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => openProcessing(claim)}>Preview credit note</button>}</div></article>)}</section>}
      {claims && claims.pages > 1 && <div className="flex items-center justify-between text-sm"><span>Claim page {claims.page} of {claims.pages}</span><div className="flex gap-2"><button type="button" className={secondaryButtonClass} disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Previous claims</button><button type="button" className={secondaryButtonClass} disabled={busy || page >= claims.pages} onClick={() => setPage(value => value + 1)}>Next claims</button></div></div>}
      {!!rows(creditNotes).length && <section aria-label="Credit notes" className="space-y-2"><h3 className="font-semibold">Immutable credit notes</h3>{rows(creditNotes).map(note => <article key={note.credit_note_key} className="rounded-xl border border-emerald-200 p-3 text-sm dark:border-emerald-900"><div className="flex flex-wrap justify-between gap-2"><strong>{note.credit_note_number}</strong><Badge tone="emerald">{label(note.status || 'POSTED')}</Badge></div><CreditOutcome value={note} /><p className="mt-2 break-all font-mono text-[11px]">{note.credit_note_key}</p></article>)}</section>}
      {canRequestCondition && !!rows(creditNotes).length && <ReturnConditionCases api={api} orgId={orgId} userId={userId}
        canRequest invoiceKey={invoice.invoice_key} compact />}
      {review && <form onSubmit={submitReview} className="rounded-xl border border-sky-300 p-3 dark:border-sky-800"><h3 className="font-semibold">Review exact return claim</h3><p className="mt-1 text-xs">The backend prevents self-review and stale or reused approval. Approval still places physical goods into quarantine only.</p><label className="mt-2 block text-sm font-semibold">Decision<select disabled={busy || !!review.pendingBody || review.conflict} className="mt-1 block min-h-[44px] w-full rounded-lg border bg-white p-2 dark:bg-slate-800" value={review.outcome} onChange={event => setReview(current => ({ ...current, outcome: event.target.value }))}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label><label className="mt-2 block text-sm font-semibold">Review note<textarea required minLength="3" maxLength="1000" disabled={busy || !!review.pendingBody || review.conflict} className="mt-1 block min-h-[88px] w-full rounded-lg border p-2 dark:bg-slate-800" value={review.note} onChange={event => setReview(current => ({ ...current, note: event.target.value }))} /></label><div className="mt-3 flex gap-2"><button type="submit" className={primaryButtonClass} disabled={busy || review.conflict}>{busy ? 'Reviewing…' : review.pendingBody ? 'Retry exact review' : 'Save review decision'}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setReview(null)}>{review.conflict ? 'Close and reload' : 'Cancel'}</button></div></form>}
      {processing && <section className="rounded-xl border border-sky-300 p-3 dark:border-sky-800"><h3 className="font-semibold">Process approved return</h3><p className="mt-1 text-xs">This exact server calculation settles invoice debt first and only then creates surplus non-expiring customer credit.</p><CreditOutcome value={processing.options} /><p className="mt-2 text-xs"><strong>Physical stock:</strong> quarantine only</p><div className="mt-3 flex gap-2"><button type="button" className={primaryButtonClass} disabled={busy || processing.conflict} onClick={createCreditNote}>{busy ? 'Processing…' : processing.pendingBody ? 'Retry exact credit note' : 'Create immutable credit note'}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={async () => { if (processing.conflict && recoveryId && recovery) { try { await removeReturnRecovery(recoveryId, recovery.revision); setRecovery(null); setRecoveryError(''); } catch (failure) { setRecoveryError(failure.message); return; } } setProcessing(null); if (processing.conflict) load(controller.current?.signal); }}>{processing.conflict ? 'Discard stale credit request' : 'Cancel'}</button></div></section>}
    </div>
  </section>;
}
