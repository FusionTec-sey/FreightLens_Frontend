import React, { useEffect, useRef, useState } from 'react';
import useOperationIntent from '../../../hooks/useOperationIntent';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import { secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

const blank = { source_currency: 'SCR', unit_price_source: '', exchange_rate_to_scr: '1', justification: '', reason: '' };
const message = failure => failure?.response?.data?.detail || failure?.message || 'Receipt cost review failed.';

export default function ReceiptCostReviewControls({ api, manifestKey, userId, canRequest, canReview,
  isDark = false, onDirtyChange, onBusyChange }) {
  const [form, setForm] = useState(blank), [invoice, setInvoice] = useState(null), [fx, setFx] = useState(null);
  const [documents, setDocuments] = useState([]), [documentPage, setDocumentPage] = useState(1), [documentPages, setDocumentPages] = useState(1);
  const [view, setView] = useState(canReview ? 'NEEDS_MY_REVIEW' : 'MY_REQUESTS');
  const [page, setPage] = useState(1), [rows, setRows] = useState([]), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [decision, setDecision] = useState(null), [decisionReason, setDecisionReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(''), [refresh, setRefresh] = useState(0);
  const requestIntent = useOperationIntent(), decisionIntent = useOperationIntent(), action = useRef(null);
  const dirty = Boolean(form.unit_price_source || form.justification || form.reason || invoice || fx || decision || decisionReason);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { action.current?.abort(); onBusyChange?.(false); onDirtyChange?.(false); }, [onBusyChange, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!canRequest) return undefined;
    const controller = new AbortController();
    api.evidenceDocuments(documentPage, 25, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) { setDocuments(data.items || []); setDocumentPages(data.pages || 1); }
    }).catch(failure => { if (!controller.signal.aborted) setError(message(failure)); });
    return () => controller.abort();
  }, [api, canRequest, documentPage]);
  useEffect(() => {
    const controller = new AbortController(); setRows([]); setError('');
    api.costCases(manifestKey, page, 10, view, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.items) || data.items.some(row => row.manifest_key !== manifestKey)) throw new Error('Unexpected receipt cost-review response.');
      setRows(data.items); setPages(data.pages || 1); setTotal(data.total || 0);
    }).catch(failure => { if (!controller.signal.aborted) setError(message(failure)); });
    return () => controller.abort();
  }, [api, manifestKey, page, view, refresh]);

  function change(name, value) {
    setForm(current => ({ ...current, [name]: value,
      ...(name === 'source_currency' ? { exchange_rate_to_scr: value.toUpperCase() === 'SCR' ? '1' : '' } : {}) }));
    setSaved('');
  }
  function resetDraft() { setForm(blank); setInvoice(null); setFx(null); setDecision(null); setDecisionReason(''); requestIntent.clear(); }
  async function requestReview() {
    if (busy || !canRequest || !invoice || !form.unit_price_source || !form.justification.trim() || !form.reason.trim() || (form.source_currency.toUpperCase() !== 'SCR' && !fx)) return;
    action.current?.abort(); action.current = new AbortController(); setBusy(true); setError(''); setSaved('');
    try {
      const payload = requestIntent.payloadFor(['receipt-cost', manifestKey], { reason: form.reason.trim(), declaration: {
        document_id: invoice.id, fx_document_id: form.source_currency.toUpperCase() === 'SCR' ? null : fx.id,
        source_currency: form.source_currency.trim().toUpperCase(), unit_price_source: form.unit_price_source.trim(),
        exchange_rate_to_scr: form.exchange_rate_to_scr.trim(), justification: form.justification.trim(),
      } });
      const { data } = await api.requestCostReview(manifestKey, payload, action.current.signal);
      if (!action.current.signal.aborted) { setSaved(`Receipt cost review requested: ${data.case_key}`); resetDraft(); setRefresh(value => value + 1); }
    } catch (failure) { if (!action.current.signal.aborted) setError(message(failure)); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  async function decide() {
    if (busy || !canReview || !decision || !decisionReason.trim()) return;
    action.current?.abort(); action.current = new AbortController(); setBusy(true); setError(''); setSaved('');
    try {
      const payload = decisionIntent.payloadFor(['receipt-cost-decision', manifestKey, decision.case_key, decision.version], {
        expected_version: decision.version, outcome: decision.outcome, reason: decisionReason.trim(),
      });
      const { data } = await api.reviewCost(manifestKey, decision.case_key, payload, action.current.signal);
      if (!action.current.signal.aborted) { setSaved(`Receipt cost evidence ${data.status.toLowerCase()}. No stock or value was posted.`); setDecision(null); setDecisionReason(''); setRefresh(value => value + 1); }
    } catch (failure) { if (!action.current.signal.aborted) setError(message(failure)); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  async function download(row, document) {
    action.current?.abort(); action.current = new AbortController(); setBusy(true); setError('');
    try {
      const { data } = await api.costDocument(manifestKey, row.case_key, document.id, action.current.signal);
      if (action.current.signal.aborted) return;
      const url = URL.createObjectURL(data); const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = document.label || 'receipt-cost-evidence'; anchor.click(); URL.revokeObjectURL(url);
    } catch (failure) { if (!action.current.signal.aborted) setError(message(failure)); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }

  return <section aria-label="Receipt cost evidence review" className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
    <div><h3 className="font-semibold">Receipt price and exchange-rate review</h3><p>Declare the documented source price and exact SCR exchange rate. Independent approval records evidence only—it never posts stock, inventory value or a selling price.</p></div>
    {error && <p role="alert">{error}</p>}{saved && <p role="status" className="break-all">{saved}</p>}
    {canRequest && <div className="space-y-2 rounded border p-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label>Source currency<input value={form.source_currency} maxLength={3} disabled={busy} onChange={event => change('source_currency', event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
        <label>Unit price in source currency<input value={form.unit_price_source} inputMode="decimal" disabled={busy} onChange={event => change('unit_price_source', event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
        <label>SCR per source-currency unit<input value={form.exchange_rate_to_scr} inputMode="decimal" disabled={busy} onChange={event => change('exchange_rate_to_scr', event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
      </div>
      <label className="block">Price evidence document<select aria-label="Price evidence document" value={invoice?.id || ''} disabled={busy} onChange={event => setInvoice(documents.find(row => String(row.id) === event.target.value) || null)} className="block w-full rounded border p-2 dark:bg-slate-900"><option value="">Choose an existing purchase document</option>{documents.map(row => <option key={row.id} value={row.id}>{row.label} · {row.doc_type}</option>)}</select></label>
      {form.source_currency.toUpperCase() !== 'SCR' && <label className="block">Exchange-rate evidence document<select aria-label="Exchange-rate evidence document" value={fx?.id || ''} disabled={busy} onChange={event => setFx(documents.find(row => String(row.id) === event.target.value) || null)} className="block w-full rounded border p-2 dark:bg-slate-900"><option value="">Choose an existing rate document</option>{documents.map(row => <option key={row.id} value={row.id}>{row.label} · {row.doc_type}</option>)}</select></label>}
      {documentPages > 1 && <div className="flex gap-2"><button type="button" className={secondaryButtonClass} disabled={documentPage <= 1} onClick={() => setDocumentPage(value => value - 1)}>Previous documents</button><button type="button" className={secondaryButtonClass} disabled={documentPage >= documentPages} onClick={() => setDocumentPage(value => value + 1)}>Next documents</button></div>}
      <label className="block">Cost justification<textarea value={form.justification} maxLength={1000} disabled={busy} onChange={event => change('justification', event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
      <label className="block">Cost review request reason<textarea value={form.reason} maxLength={1000} disabled={busy} onChange={event => change('reason', event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButtonClass} disabled={busy || !invoice || !form.unit_price_source || !form.justification.trim() || !form.reason.trim() || (form.source_currency.toUpperCase() !== 'SCR' && !fx)} onClick={requestReview}>{busy ? 'Working…' : 'Request receipt cost review'}</button><button type="button" className={secondaryButtonClass} disabled={busy || !dirty} onClick={resetDraft}>Discard cost entry</button></div>
    </div>}
    <div className="flex flex-wrap gap-2">{canReview && <button type="button" className={secondaryButtonClass} aria-pressed={view === 'NEEDS_MY_REVIEW'} onClick={() => { setView('NEEDS_MY_REVIEW'); setPage(1); }}>Costs needing my review</button>}<button type="button" className={secondaryButtonClass} aria-pressed={view === 'MY_REQUESTS'} onClick={() => { setView('MY_REQUESTS'); setPage(1); }}>My cost requests</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh cost cases</button></div>
    {!rows.length && !error && <p>No receipt cost-review cases in this view.</p>}
    <ul className="space-y-2">{rows.map(row => <li key={row.case_key} className="rounded border p-3 text-sm space-y-1">
      <p>{row.status} · {row.declaration.source_currency} {row.declaration.unit_price_source} per unit · SCR {row.goods_value_scr} total</p><p>{row.receipt_quantity} units · rate {row.declaration.exchange_rate_to_scr}</p><p>{row.declaration.justification}</p>
      <div className="flex flex-wrap gap-2">{row.documents.map(document => <button key={document.id} type="button" className={secondaryButtonClass} disabled={busy} onClick={() => download(row, document)}>Download reviewed {document.label}</button>)}</div>
      {canReview && row.status === 'REQUESTED' && row.requestor_id !== userId && <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setDecision({ ...row, outcome: 'APPROVED' })}>Approve cost evidence</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setDecision({ ...row, outcome: 'REJECTED' })}>Reject cost evidence</button></div>}
    </li>)}</ul>
    {decision && <div className="space-y-2 rounded border p-2"><p>{decision.outcome === 'APPROVED' ? 'Approve' : 'Reject'} version {decision.version} of this exact receipt cost declaration?</p><label className="block">Cost decision reason<textarea value={decisionReason} maxLength={1000} disabled={busy} onChange={event => setDecisionReason(event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label><button type="button" className={secondaryButtonClass} disabled={busy || !decisionReason.trim()} onClick={decide}>Confirm cost {decision.outcome.toLowerCase()}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => { setDecision(null); setDecisionReason(''); }}>Cancel cost decision</button></div>}
    <PaginationToolbar isDark={isDark} page={page} pageSize={10} totalPages={pages} totalCount={total} onPageChange={setPage} />
  </section>;
}
