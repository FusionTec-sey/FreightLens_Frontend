import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import DraftSourcePicker from './DraftSourcePicker';
import useOperationIntent from '../../../hooks/useOperationIntent';

export default function DraftAllocation({ api, inventoryApi, draft, onClose }) {
  const { isDark } = useTheme();
  const [context, setContext] = useState(null), [error, setError] = useState('');
  const [lineKey, setLineKey] = useState(''), [counter, setCounter] = useState(null), [picking, setPicking] = useState(false);
  const [quantity, setQuantity] = useState(''), [reviewAt, setReviewAt] = useState(''), [reason, setReason] = useState('');
  const [pending, setPending] = useState(null), [saved, setSaved] = useState(null), [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false), [discard, setDiscard] = useState(false);
  const controller = useRef(null), running = useRef(false);
  const { payloadFor } = useOperationIntent();
  const line = draft.lines.find(row => row.line_key === lineKey);
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    api.allocationContext(request.signal).then(({ data }) => {
      if (request.signal.aborted) return;
      if (data.branch_id !== draft.branch_id) { setError('This draft is not in your assigned working store.'); return; }
      setContext(data);
    }).catch(err => { if (!request.signal.aborted) setError(err.response?.status === 503
      ? 'Allocation is disabled: the local stock runtime is not configured. No stock has changed.'
      : 'Allocation context unavailable. Check assignment, trading settings and permissions, then reopen.'); });
    return () => request.abort();
  }, [api, draft.branch_id]);
  useEffect(() => {
    const warn = event => { if (!saved && (lineKey || pending || reason)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [lineKey, pending, reason, saved]);
  const loadCounters = useMemo(() => async (...args) => {
    const response = await inventoryApi.counters(draft.branch_id, ...args);
    return { ...response, data: { ...response.data, items: response.data.items.map(row => ({ ...row, name: row.config.name })) } };
  }, [inventoryApi, draft.branch_id]);
  const theme = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const button = 'border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40';
  const locked = busy || !!pending || blocked || !!saved;
  async function allocate() {
    if (running.current || blocked || saved || !context) return;
    let body = pending;
    if (!body) {
      const followup = new Date(reviewAt);
      if (!line || !counter || !/^\d{1,12}(?:\.\d{1,6})?$/.test(quantity) || !/[1-9]/.test(quantity)
          || !Number.isFinite(followup.getTime()) || followup <= new Date() || !reason.trim()) {
        setError('Choose a line and counter, exact positive quantity, future follow-up and reason.'); return;
      }
      try { body = payloadFor(['store-allocation', draft.document_key], {
        source: { document_key: draft.document_key, line_key: line.line_key, version: draft.version },
        counter_key: counter.counter_key, counter_version: counter.version, branch_version: context.branch_version,
        assignment_version: context.assignment_version, quantity, input_unit: line.base_unit,
        review_at: followup.toISOString(), reason: reason.trim(),
      }); } catch { setError('Secure operation identity is unavailable.'); return; }
    }
    running.current = true; setBusy(true); setPending(body); setError('');
    try {
      const { data } = await api.allocateDraft(body, controller.current.signal);
      if (data.operation_key !== body.operation_key || data.branch_id !== draft.branch_id || !Array.isArray(data.reservations)) throw new Error('Unconfirmed receipt');
      if (!controller.current.signal.aborted) { setSaved(data); setPending(null); }
    } catch (err) {
      if (controller.current.signal.aborted) return;
      const status = err.response?.status;
      if (status && status >= 400 && status < 500) { setPending(null); setBlocked(true); setError('Allocation rejected. Reopen the draft and refresh stock/settings before trying again. Existing holds require reviewed changes.'); }
      else setError('Outcome not confirmed. Retry this identical operation; do not create another allocation elsewhere.');
    } finally { running.current = false; if (!controller.current.signal.aborted) setBusy(false); }
  }
  if (picking) return <DraftSourcePicker title="Choose working counter" load={loadCounters} onClose={() => setPicking(false)} onSelect={row => {
    setPicking(false);
    if (!row.config.is_enabled || !['CHECKOUT', 'BOTH'].includes(row.config.purpose)) { setError('Choose an enabled checkout counter.'); return; }
    setCounter(row); setError('');
  }} />;
  return <section className={`h-full min-h-0 flex flex-col p-4 gap-3 ${theme}`}>
    <header className="shrink-0"><h1 className="text-xl font-bold">Allocate same-store stock</h1><p>Initial hold only. Prefer the counter picking area, then compatible stock elsewhere in this store. Other stores are never selected automatically.</p></header>
    <div className="flex-1 min-h-0 overflow-auto space-y-3">
      {error && <p role="alert">{error}</p>}
      {!context && !error && <p role="status">Checking runtime and working store…</p>}
      {saved ? <section><p role="status">Allocated {saved.quantity} {saved.base_unit}. This is a reservation, not payment or physical handover.</p><ul>{saved.reservations.map(row => <li key={row.reservation_key}>Location #{row.location_id}: {row.quantity} {saved.base_unit} · Hold {row.reservation_key}</li>)}</ul></section> :
      <fieldset disabled={locked || !context} className="space-y-3">
        <label className="block">Draft line<select className={`block border p-2 ${theme}`} value={lineKey} onChange={e => setLineKey(e.target.value)}><option value="">Select a line</option>{draft.lines.map(row => <option key={row.line_key} value={row.line_key}>{row.product_name || `Product ${row.product_id}`} · {row.base_quantity} {row.base_unit}</option>)}</select></label>
        <button type="button" className={button} onClick={() => setPicking(true)}>{counter ? `Counter: ${counter.config.name}` : 'Choose counter'}</button>
        {counter && <p>{counter.config.default_stock_location_id ? `Preferred picking area #${counter.config.default_stock_location_id}; same-store fallback allowed.` : 'No preferred picking area. Eligible stock anywhere in this store can be used.'}</p>}
        <label className="block">Quantity ({line?.base_unit || 'base unit'})<input inputMode="decimal" maxLength={25} value={quantity} className={`block border p-2 ${theme}`} onChange={e => setQuantity(e.target.value)} /></label>
        <label className="block">Follow-up (device local time)<input type="datetime-local" value={reviewAt} className={`block border p-2 ${theme}`} onChange={e => setReviewAt(e.target.value)} /></label>
        <label className="block">Reason<textarea maxLength={500} value={reason} className={`block border p-2 w-full ${theme}`} onChange={e => setReason(e.target.value)} /></label>
      </fieldset>}
      {discard && <div role="alert">Leave this allocation? If a submission was unconfirmed, inspect reserved stock before creating another.<button type="button" className={button} onClick={() => setDiscard(false)}>Keep allocation</button><button type="button" className={button} onClick={onClose}>Leave allocation</button></div>}
    </div>
    <footer className="shrink-0 flex gap-3"><button type="button" className={button} disabled={busy} onClick={() => saved || (!lineKey && !pending && !reason) ? onClose() : setDiscard(true)}>Back to draft</button>
      {!saved && <button type="button" className={button} disabled={busy || blocked || discard || !context} onClick={allocate}>{pending ? 'Retry identical allocation' : 'Allocate stock'}</button>}</footer>
  </section>;
}
