import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, primaryButtonClass, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import SalesCollectionPanel from './SalesCollectionPanel';
import SalesInvoicePrintPanel from './SalesInvoicePrintPanel';
import SalesReturnPanel from './SalesReturnPanel';

const newKey = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 3) | 8).toString(16);
  });
const amountPattern = /^\d{1,18}(?:\.\d{1,2})?$/;
const cents = value => {
  if (!amountPattern.test(value || '')) return null;
  const [whole, fraction = ''] = value.split('.');
  return window.BigInt(whole) * window.BigInt(100)
    + window.BigInt((fraction + '00').slice(0, 2));
};
const errorMessage = failure => failure?.response?.data?.detail
  || 'The checkout outcome is uncertain. Keep this panel open and retry the identical action.';

async function referenceHash(value) {
  if (!window.crypto?.subtle || !value.trim()) throw new Error('A terminal reference and secure browser hashing are required.');
  const bytes = new TextEncoder().encode(value.trim());
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function SalesCheckoutPanel({ api, draft, pricing, orgId, userId, canRecordCard, canCollect = false, canPrint = false, canResolvePrint = false, canRequestReturn = false, canReviewReturn = false, canProcessReturn = false, canRequestCondition = false, onClose }) {
  const [options, setOptions] = useState(null), [attempt, setAttempt] = useState(null), [invoice, setInvoice] = useState(null);
  const [counterKey, setCounterKey] = useState(''), [tenders, setTenders] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirming, setConfirming] = useState(null);
  const [discard, setDiscard] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [returning, setReturning] = useState(false);
  const [intent] = useState(() => ({ attempt_key: newKey(), operation_key: newKey(), invoice_key: newKey() }));
  const controller = useRef(null), running = useRef(false);
  const total = pricing?.gross_total_scr || '';

  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    setError('');
    api.postingOptions(draft.document_key, draft.version, request.signal).then(async ({ data }) => {
      if (request.signal.aborted) return;
      if (data.document_key !== draft.document_key || data.draft_version !== draft.version) throw new Error('Checkout options do not match this draft.');
      setOptions(data); setCounterKey(data.counters[0]?.counter_key || '');
      if (data.existing_invoice_key) {
        const result = await api.readInvoice(data.existing_invoice_key, request.signal);
        if (!request.signal.aborted) setInvoice(result.data);
      } else if (data.existing_attempt_key) {
        const result = await api.readPostingAttempt(data.existing_attempt_key, request.signal);
        if (!request.signal.aborted) {
          setAttempt(result.data);
          if (result.data.invoice_key) {
            const posted = await api.readInvoice(result.data.invoice_key, request.signal);
            if (!request.signal.aborted) setInvoice(posted.data);
          }
        }
      } else if (data.payment_methods[0]) {
        setTenders([{ tender_key: newKey(), method_key: data.payment_methods[0].method_key, amount_scr: total }]);
      }
    }).catch(failure => { if (!request.signal.aborted) setError(errorMessage(failure)); });
    return () => request.abort();
  }, [api, draft.document_key, draft.version, total]);

  useEffect(() => {
    const warn = event => {
      if (!invoice && (busy || attempt || tenders.some(row => row.amount_scr))) {
        event.preventDefault(); event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [attempt, busy, invoice, tenders]);

  const methods = useMemo(() => new Map((options?.payment_methods || []).map(row => [row.method_key, row])), [options]);
  const selectedCounter = options?.counters.find(row => row.counter_key === counterKey);
  const cardTenders = (attempt?.tenders || []).filter(row => row.kind === 'CARD');
  const latestCard = tenderKey => (attempt?.card_confirmations || []).filter(row => row.tender_key === tenderKey)
    .sort((left, right) => right.sequence - left.sequence)[0];
  const canFinalize = attempt?.status === 'READY';

  function updateTender(index, changes) {
    setTenders(rows => rows.map((row, position) => position === index ? { ...row, ...changes } : row));
  }

  async function createAttempt() {
    if (running.current || attempt || !options) return;
    const expected = cents(total); const actual = tenders.reduce((sum, row) => {
      const value = cents(row.amount_scr); return value === null ? null : sum === null ? null : sum + value;
    }, window.BigInt(0));
    if (!selectedCounter || !tenders.length || expected === null || actual !== expected || tenders.some(row => !methods.has(row.method_key))) {
      setError('Choose an enabled counter and payment methods whose exact amounts equal the invoice total.'); return;
    }
    const body = {
      attempt_key: intent.attempt_key, operation_key: intent.operation_key,
      document_key: draft.document_key, expected_draft_version: draft.version,
      pricing_snapshot_key: pricing.pricing_snapshot_key,
      expected_pricing_fingerprint: pricing.pricing_fingerprint,
      counter_key: selectedCounter.counter_key,
      expected_branch_settings_version: options.branch_settings_version,
      expected_counter_settings_version: selectedCounter.version,
      expected_assignment_version: options.assignment_version,
      tenders: tenders.map(row => { const method = methods.get(row.method_key); return {
        tender_key: row.tender_key, method_key: method.method_key,
        expected_method_version: method.method_version,
        mapping_key: method.mapping_key, expected_mapping_version: method.mapping_version,
        amount_scr: row.amount_scr,
      }; }),
    };
    running.current = true; setBusy(true); setError('');
    try {
      await api.createPostingAttempt(intent.attempt_key, body, controller.current.signal);
      const result = await api.readPostingAttempt(intent.attempt_key, controller.current.signal);
      if (!controller.current.signal.aborted) setAttempt(result.data);
    } catch (failure) { if (!controller.current.signal.aborted) setError(errorMessage(failure)); }
    finally { running.current = false; if (!controller.current.signal.aborted) setBusy(false); }
  }

  async function recordCard(event) {
    event.preventDefault();
    if (running.current || !confirming) return;
    const tender = cardTenders.find(row => row.tender_key === confirming.tender_key);
    if (!tender) return;
    running.current = true; setBusy(true); setError('');
    try {
      const previous = latestCard(tender.tender_key);
      const confirmationKey = confirming.confirmation_key;
      const body = { confirmation_key: confirmationKey, attempt_key: attempt.attempt_key,
        tender_key: tender.tender_key, expected_sequence: (previous?.sequence || 0) + 1,
        outcome: confirming.outcome,
        provider_reference_hash: confirming.outcome === 'CONFIRMED' ? await referenceHash(confirming.reference) : null };
      const result = await api.recordCardConfirmation(attempt.attempt_key, confirmationKey, body, controller.current.signal);
      if (!controller.current.signal.aborted) { setAttempt(result.data); setConfirming(null); }
    } catch (failure) { if (!controller.current.signal.aborted) setError(errorMessage(failure)); }
    finally { running.current = false; if (!controller.current.signal.aborted) setBusy(false); }
  }

  async function finalize() {
    if (running.current || !canFinalize || !options) return;
    const invoiceKey = intent.invoice_key || newKey();
    const body = { attempt_key: attempt.attempt_key, operation_key: attempt.operation_key,
      invoice_key: invoiceKey, reservations: options.reservations.map(row => ({
        source_line_key: row.source_line_key, reservation_key: row.reservation_key, quantity: row.quantity,
      })), expected_card_confirmations: cardTenders.map(row => latestCard(row.tender_key)?.confirmation_key).filter(Boolean) };
    running.current = true; setBusy(true); setError('');
    try {
      const result = await api.finalizePostingAttempt(attempt.attempt_key, body, controller.current.signal);
      if (!controller.current.signal.aborted) setInvoice(result.data.invoice);
    } catch (failure) { if (!controller.current.signal.aborted) setError(errorMessage(failure)); }
    finally { running.current = false; if (!controller.current.signal.aborted) setBusy(false); }
  }

  const requestClose = () => invoice || (!attempt && !tenders.some(row => row.amount_scr)) ? onClose() : setDiscard(true);
  if (collecting && invoice) return <SalesCollectionPanel api={api} invoice={invoice}
    customerName={draft.customer_name || 'Customer'} onClose={async () => {
      setCollecting(false);
      try {
        const result = await api.readInvoice(invoice.invoice_key);
        setInvoice(result.data);
      } catch {
        // Collection panel already reports the authoritative result. A later
        // checkout refresh will retry the invoice projection without posting.
      }
    }} />;
  if (printing && invoice) return <SalesInvoicePrintPanel api={api} invoice={invoice}
    canResolve={canResolvePrint} onClose={() => setPrinting(false)} />;
  if (returning && invoice) return <SalesReturnPanel api={api} invoice={invoice}
    orgId={orgId} userId={userId}
    canRequest={canRequestReturn} canReview={canReviewReturn} canProcess={canProcessReturn}
    canRequestCondition={canRequestCondition}
    onClose={() => setReturning(false)} />;
  return <section aria-label="Checkout" className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 className="text-lg font-semibold">Checkout · {draft.customer_name || 'Customer'}</h2><p className="text-xs">Draft v{draft.version} · {draft.branch_name || `Store ${draft.branch_id}`}</p></div>
      <button type="button" className={secondaryButtonClass} onClick={requestClose}>Back to sale</button>
    </header>
    <div className="min-h-0 flex-1 overflow-auto p-4 space-y-4">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {!options && !error && <p role="status">Checking counter, payment and reservation eligibility…</p>}
      {invoice && <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"><div className="flex flex-wrap gap-2"><Badge tone="emerald">{invoice.payment_status}</Badge><Badge tone={invoice.fulfilment_status === 'COLLECTED' ? 'emerald' : 'amber'}>{invoice.fulfilment_status.replaceAll('_', ' ')}</Badge></div><h3 className="mt-2 text-lg font-semibold">Invoice {invoice.invoice_number}</h3><p>SCR {invoice.gross_total_scr} paid. {invoice.fulfilment_status === 'COLLECTED' ? 'All eligible goods were handed over.' : 'Goods remain reserved until authorised collection.'}</p><div className="mt-3 flex flex-wrap gap-2">{canPrint && <button type="button" className={primaryButtonClass} onClick={() => setPrinting(true)}>Invoice & printing</button>}{canCollect && invoice.fulfilment_status !== 'COLLECTED' && <button type="button" className={primaryButtonClass} onClick={() => setCollecting(true)}>Open collection</button>}{(canRequestReturn || canReviewReturn || canProcessReturn || canRequestCondition) && <button type="button" className={secondaryButtonClass} onClick={() => setReturning(true)}>Returns & credit notes</button>}</div></section>}
      {options && !invoice && !attempt && <>
        {(!options.counters.length || !options.payment_methods.length || !options.reservations.length) && <p role="alert" className="rounded-xl border border-amber-300 p-3">Checkout is blocked until an enabled counter, payment mapping and full active reservation are available.</p>}
        <label className="block text-sm font-semibold">Selling counter<select className="mt-1 block min-h-[44px] w-full rounded-lg border bg-white p-2 dark:bg-slate-800" value={counterKey} onChange={event => setCounterKey(event.target.value)}><option value="">Choose counter</option>{options.counters.map(row => <option key={row.counter_key} value={row.counter_key}>{row.name} · {row.code}</option>)}</select></label>
        <section><div className="flex items-center justify-between"><h3 className="font-semibold">Payment plan</h3><button type="button" className={secondaryButtonClass} onClick={() => setTenders(rows => [...rows, { tender_key: newKey(), method_key: options.payment_methods[0]?.method_key || '', amount_scr: '' }])}>Add split</button></div>
          <div className="mt-2 space-y-2">{tenders.map((row, index) => <div key={row.tender_key} className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]"><select aria-label={`Payment method ${index + 1}`} className="min-h-[44px] rounded-lg border bg-white p-2 dark:bg-slate-800" value={row.method_key} onChange={event => updateTender(index, { method_key: event.target.value })}>{options.payment_methods.map(method => <option key={method.method_key} value={method.method_key}>{method.label} · {method.kind}</option>)}</select><input aria-label={`Payment amount ${index + 1}`} inputMode="decimal" className="min-h-[44px] rounded-lg border p-2 dark:bg-slate-800" value={row.amount_scr} onChange={event => updateTender(index, { amount_scr: event.target.value })} /><button type="button" className={secondaryButtonClass} disabled={tenders.length === 1} onClick={() => setTenders(rows => rows.filter(item => item.tender_key !== row.tender_key))}>Remove</button></div>)}</div>
          <p className="mt-2 text-sm font-semibold">Invoice total SCR {total}</p></section>
      </>}
      {attempt && !invoice && <section className="space-y-3"><div className="flex flex-wrap gap-2"><Badge tone={attempt.status === 'READY' ? 'emerald' : 'amber'}>{attempt.status.replaceAll('_', ' ')}</Badge><Badge tone="amber">Collection not authorised</Badge></div><p>The payment plan is now immutable. Unknown outcomes must be recovered here; do not start another attempt.</p>
        {cardTenders.map(row => { const latest = latestCard(row.tender_key); return <div key={row.tender_key} className="rounded-xl border p-3"><p className="font-semibold">Card · SCR {row.amount_scr}</p><p className="text-sm">{latest ? `Latest terminal result: ${latest.outcome}` : 'Awaiting terminal result'}</p>{canRecordCard && latest?.outcome !== 'CONFIRMED' && <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setConfirming({ tender_key: row.tender_key, confirmation_key: newKey(), outcome: 'CONFIRMED', reference: '' })}>Record terminal result</button>}</div>; })}
      </section>}
      {confirming && <form onSubmit={recordCard} className="rounded-xl border border-sky-300 p-3 space-y-2"><h3 className="font-semibold">Record observed terminal result</h3><p className="text-xs">This is an audited manual observation, not a provider connection. The raw terminal reference is hashed in this browser and is never stored.</p><select className="min-h-[44px] w-full rounded-lg border bg-white p-2 dark:bg-slate-800" value={confirming.outcome} onChange={event => setConfirming(value => ({ ...value, outcome: event.target.value }))}><option value="CONFIRMED">Confirmed</option><option value="DECLINED">Declined</option><option value="UNKNOWN">Unknown</option></select>{confirming.outcome === 'CONFIRMED' && <input aria-label="Terminal reference" required maxLength="200" className="min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" value={confirming.reference} onChange={event => setConfirming(value => ({ ...value, reference: event.target.value }))} />}<div className="flex gap-2"><button type="submit" className={primaryButtonClass} disabled={busy}>Save result</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setConfirming(null)}>Cancel</button></div></form>}
      {discard && <div role="alert" className="rounded-xl border border-amber-300 p-3"><p>Leave checkout? If an outcome is uncertain, reopen this exact draft to recover its server posting attempt before taking payment again.</p><div className="mt-2 flex gap-2"><button type="button" className={secondaryButtonClass} onClick={() => setDiscard(false)}>Keep checkout open</button><button type="button" className={primaryButtonClass} onClick={onClose}>Leave checkout</button></div></div>}
    </div>
    {!invoice && <footer className="shrink-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700">{!attempt && <button type="button" className={primaryButtonClass} disabled={busy || !options?.counters.length || !options?.payment_methods.length || !options?.reservations.length} onClick={createAttempt}>{busy ? 'Preparing…' : 'Confirm payment plan'}</button>}{attempt && <button type="button" className={primaryButtonClass} disabled={busy || !canFinalize} onClick={finalize}>{busy ? 'Posting…' : 'Post sale and invoice'}</button>}</footer>}
  </section>;
}
