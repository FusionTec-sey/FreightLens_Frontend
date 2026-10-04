import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import DraftSourcePicker from './DraftSourcePicker';
import useOperationIntent from '../../../hooks/useOperationIntent';

export default function OtherStoreRequest({ api, inventoryApi, draft, onClose }) {
  const { isDark } = useTheme();
  const [assignment, setAssignment] = useState(null), [error, setError] = useState('');
  const [lineKey, setLineKey] = useState(''), [branch, setBranch] = useState(null);
  const [location, setLocation] = useState(null), [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState(''), [date, setDate] = useState(''), [reason, setReason] = useState('');
  const [picker, setPicker] = useState(null), [pending, setPending] = useState(null), [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false), [discard, setDiscard] = useState(false);
  const controller = useRef(null), running = useRef(false);
  const { payloadFor } = useOperationIntent();
  const line = draft.lines.find(row => row.line_key === lineKey);
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    api.workingStore(request.signal).then(({ data }) => {
      if (request.signal.aborted) return;
      if (data.branch_id !== draft.branch_id) { setError('This draft is not in your assigned working store.'); return; }
      setAssignment(data);
    }).catch(() => { if (!request.signal.aborted) setError('Working-store assignment unavailable. Reopen after checking your assignment and access.'); });
    return () => request.abort();
  }, [api, draft.branch_id]);
  useEffect(() => {
    const warn = event => { if (!saved && (lineKey || reason || pending)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [lineKey, reason, pending, saved]);
  const load = useMemo(() => async (page, limit, signal) => {
    const response = picker === 'branch' ? await inventoryApi.list(null, page, limit, signal)
      : picker === 'location' ? await inventoryApi.list(branch.id, page, limit, signal)
      : await inventoryApi.stock(branch.id, location.id, page, limit, signal, line.product_id);
    if (picker !== 'stock') return response;
    return { ...response, data: { ...response.data, items: response.data.items.map(row => ({ ...row,
      name: `${row.product_name} · ${row.batch_code || row.tracking_policy} · Shade ${row.batch_shade || '—'} · Calibre ${row.batch_calibre || '—'} · Available ${row.available} ${row.base_unit} · Stock #${row.id}`,
    })) } };
  }, [inventoryApi, picker, branch, location, line]);
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const button = 'border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40';
  const locked = busy || !!pending || conflict || !!saved;
  async function submit() {
    if (running.current || conflict || saved || !assignment) return;
    let body = pending;
    if (!body) {
      if (!line || !stock || !/^\d{1,12}(?:\.\d{1,6})?$/.test(quantity) || !/[1-9]/.test(quantity) || !date || !reason.trim()) {
        setError('Select stock and enter an exact positive quantity, future follow-up and reason.'); return;
      }
      const followup = new Date(date);
      if (!Number.isFinite(followup.getTime()) || followup <= new Date()) { setError('Choose a future follow-up.'); return; }
      try { body = payloadFor(['other-store', draft.document_key], {
        source: { document_key: draft.document_key, line_key: line.line_key, version: draft.version },
        assignment_version: assignment.assignment_version, balance_id: stock.id, expected_stock_version: stock.version,
        quantity, input_unit: line.base_unit, review_at: followup.toISOString(), reason: reason.trim(),
      }); } catch { setError('Secure request identity unavailable.'); return; }
    }
    running.current = true; setBusy(true); setPending(body); setError('');
    try {
      const { data } = await api.requestOtherStore(body, controller.current.signal);
      if (!controller.current.signal.aborted) { setSaved(data); setPending(null); }
    } catch (err) {
      if (controller.current.signal.aborted) return;
      const status = err.response?.status;
      if (status && status >= 400 && status < 500) {
        setPending(null); setConflict(status !== 422);
        setError(status === 422 ? 'Request rejected. Check quantity, follow-up and selected stock.' : 'Request not accepted. Reopen the draft and refresh its assignment and stock before trying again.');
      } else setError('Outcome not confirmed. Retry the identical request; do not submit another request elsewhere.');
    } finally { running.current = false; if (!controller.current.signal.aborted) setBusy(false); }
  }
  if (picker) return <DraftSourcePicker title={`Choose ${picker}`} load={load} onClose={() => setPicker(null)} onSelect={row => {
    if (picker === 'branch') {
      if (!row.is_active || row.id === draft.branch_id) { setError('Choose an active other store or separate warehouse. Same-store stock uses ordinary allocation.'); setPicker(null); return; }
      setBranch(row); setLocation(null); setStock(null);
    } else if (picker === 'location') {
      if (!row.is_active) { setError('Choose an active location.'); setPicker(null); return; }
      setLocation(row); setStock(null);
    } else setStock(row);
    setError(''); setPicker(null);
  }} />;
  return <section className={`h-full min-h-0 flex flex-col p-4 gap-3 ${panel}`}>
    <header className="shrink-0"><h1 className="text-xl font-bold">Request other-store stock</h1><p>Explicit exception only. Approval does not reserve stock. Same-store selling is not restricted by your usual counter.</p></header>
    <div className="flex-1 min-h-0 overflow-auto space-y-3">
      {error && <p role="alert">{error}</p>}
      {saved ? <p role="status">Request {saved.case_key} recorded. Review it under Other-store reviews. No stock allocated.</p> : <fieldset disabled={locked || !assignment} className="space-y-3">
        <label className="block">Draft line<select className={`block border rounded p-2 ${panel}`} value={lineKey} onChange={e => { setLineKey(e.target.value); setStock(null); }}><option value="">Select a line</option>{draft.lines.map(row => <option key={row.line_key} value={row.line_key}>{row.product_name || `Product ${row.product_id}`} · {row.base_quantity} {row.base_unit}</option>)}</select></label>
        <button type="button" className={button} disabled={!line} onClick={() => setPicker('branch')}>{branch ? `Store: ${branch.name}` : 'Choose other store'}</button>
        <button type="button" className={button} disabled={!branch} onClick={() => setPicker('location')}>{location ? `Location: ${location.name}` : 'Choose location'}</button>
        <button type="button" className={button} disabled={!line || !location} onClick={() => setPicker('stock')}>Choose stock</button>
        {stock && <p>{stock.name} · Snapshot v{stock.version}. Availability and eligibility are rechecked when requesting and reviewing.</p>}
        <label className="block">Quantity ({line?.base_unit || 'base unit'})<input className={`block border p-2 ${panel}`} value={quantity} inputMode="decimal" maxLength={25} onChange={e => setQuantity(e.target.value)} /></label>
        <label className="block">Follow-up (this device’s local time)<input type="datetime-local" className={`block border p-2 ${panel}`} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="block">Reason<textarea className={`block border p-2 w-full ${panel}`} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></label>
      </fieldset>}
      {discard && <div role="alert">Leave this request? An unconfirmed submission may already exist; check Other-store reviews before creating another.<button type="button" className={button} onClick={() => setDiscard(false)}>Keep request</button><button type="button" className={button} onClick={onClose}>Leave request</button></div>}
    </div>
    <footer className="shrink-0 flex gap-3"><button type="button" className={button} disabled={busy} onClick={() => saved || (!lineKey && !pending && !reason) ? onClose() : setDiscard(true)}>Back to draft</button>
      {!saved && <button type="button" className={button} disabled={busy || conflict || discard || !assignment} onClick={submit}>{pending ? 'Retry identical request' : 'Request review'}</button>}</footer>
  </section>;
}
