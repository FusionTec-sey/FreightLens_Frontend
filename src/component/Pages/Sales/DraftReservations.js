import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import useOperationIntent from '../../../hooks/useOperationIntent';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import ReallocationTargetPicker from './ReallocationTargetPicker';

// Exact six-place comparison; never round stock through JavaScript Number.
const scaled = value => {
  if (!/^[0-9]{1,12}(?:\.[0-9]{1,6})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return whole.padStart(12, '0') + fraction.padEnd(6, '0');
};
const zero = '0'.repeat(18);

export default function DraftReservations({ api, draft, canRequest, canRequestDeadline = false, canRequestReallocation = false, dueInbox = false, onOpenDraft, onClose }) {
  const documentKey = draft?.document_key;
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const [selected, setSelected] = useState(null), [quantity, setQuantity] = useState(''), [reason, setReason] = useState('');
  const [pending, setPending] = useState(null), [saved, setSaved] = useState(null), [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false), [conflict, setConflict] = useState(false);
  const request = useRef(null), inFlight = useRef(false);
  const [deadline, setDeadline] = useState(false), [nextReview, setNextReview] = useState('');
  const [reallocation, setReallocation] = useState(false), [target, setTarget] = useState(null), [picking, setPicking] = useState(false);
  const maySubmit = reallocation ? canRequestReallocation : deadline ? canRequestDeadline : canRequest;
  const { payloadFor, clear } = useOperationIntent();
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError('');
    const response = dueInbox ? api.dueReservations(page, limit, controller.signal) : api.reservations(documentKey, page, limit, controller.signal);
    response
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Reservations could not be loaded. Refresh to retry.'); });
    return () => controller.abort();
  }, [api, documentKey, dueInbox, page, limit, refresh]);
  const dirty = Boolean(selected && (quantity || reason || nextReview || pending || target) && !saved);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function reset() {
    setSelected(null); setQuantity(''); setReason(''); setSaved(null); setPending(null);
    setNextReview(''); setDeadline(false);
    setReallocation(false); setTarget(null); setPicking(false);
    setConflict(false); setDiscard(false); setError(''); clear(); setRefresh(n => n + 1);
  }
  async function submit() {
    if (inFlight.current || !maySubmit || conflict) return;
    let body = pending;
    if (!body) {
      const amount = scaled(quantity), available = scaled(selected.remaining_quantity);
      if (!deadline && (amount === null || available === null || amount <= zero || amount > available || !reason.trim())) {
        setError('Enter a positive quantity no greater than the remaining hold, and a reason.'); return;
      }
      if ((deadline || reallocation) && (!nextReview || !Number.isFinite(new Date(nextReview).getTime()) || !reason.trim())) {
        setError('Enter an explicit next review date and agreed follow-up reason.'); return;
      }
      if (reallocation && !target) { setError('Choose a destination draft line.'); return; }
      try { body = payloadFor([reallocation ? 'reservation.reallocate' : deadline ? 'reservation.deadline' : 'reservation.release', selected.document_key || documentKey, selected.reservation_key], {
        reservation_key: selected.reservation_key, expected_source_version: selected.source_version,
        expected_released: selected.released_before, reason: reason.trim(),
        ...(deadline ? { next_review_at: new Date(nextReview).toISOString(), expected_deadline_version: selected.deadline_version } : { quantity }),
        ...(reallocation ? { target, review_at: new Date(nextReview).toISOString() } : {}),
      }); } catch { setError('Secure request identity unavailable. Nothing was sent.'); return; }
    }
    inFlight.current = true; setBusy(true); setPending(body); setError('');
    const controller = new AbortController(); request.current = controller;
    try {
      const { data } = await (reallocation ? api.requestReallocation : deadline ? api.requestDeadline : api.requestRelease)(body, controller.signal);
      if (controller.signal.aborted) return;
      if (!data?.case_key || data.version !== 1 || data.status !== 'REQUESTED') throw new Error('Unconfirmed receipt');
      setSaved(data.case_key); setPending(null); toast.success('Manager review requested. Stock remains reserved.');
    } catch (failure) {
      if (controller.signal.aborted) return;
      const status = failure.response?.status;
      if ([403, 404, 409].includes(status)) {
        setPending(null); setConflict(true); setError('Source or access changed. Return to the list and refresh before a new request.');
      } else if (status === 422) {
        setPending(null); setError(typeof failure.response.data?.detail === 'string' ? failure.response.data.detail : 'Check quantity and reason. No request was accepted.');
      } else setError('Request not confirmed. Keep this screen open and retry the same request.');
    } finally { inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const button = 'border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40';
  async function openSource(row) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    const controller = new AbortController(); request.current = controller;
    try { await onOpenDraft(row); }
    catch { if (!controller.signal.aborted) setError('Draft could not be opened. Check access and refresh before retrying.'); }
    finally { inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  if (picking && reallocation && selected) return <ReallocationTargetPicker api={api} source={selected}
    onSelect={choice => { setTarget(choice); setPicking(false); }} onClose={() => setPicking(false)} />;
  return <section className={`h-full min-h-0 flex flex-col p-4 gap-3 ${panel}`} aria-label="Draft reservations">
    <header className="shrink-0"><h1 className="text-xl font-bold">{dueInbox ? 'Overdue reservation follow-up' : 'Reserved stock'}</h1><p>Review deadlines do not cancel holds. Approval does not release stock or authorise collection.</p>{dueInbox && <p>Current company, all stores. Oldest due first. Refresh for updated status; opening a draft rechecks access.</p>}</header>
    <div className="flex-1 min-h-0 overflow-auto">
      {error && <p role="alert" className="p-2">{error}</p>}
      {selected ? <section className="space-y-3">
        <h2 className="font-semibold">{reallocation ? 'Request reallocation review' : deadline ? 'Request follow-up date review' : 'Request release review'}</h2>
        <p>Remaining: {selected.remaining_quantity} {selected.base_unit} · Location {selected.location_id}</p>
        <p className="text-xs break-all">Reservation: {selected.reservation_key} · Draft version {selected.source_version}</p>
        {saved ? <p role="status">Review requested: {saved}. A different authorised manager must review it. Stock is still reserved.</p> : <>
          <p className="text-sm">Keep this form open until confirmed. Navigation recovery is not yet available.</p>
          {pending && <p className="text-xs break-all">Request reference: {pending.operation_key}</p>}
          <fieldset disabled={busy || Boolean(pending) || conflict} className="space-y-3">
            {(deadline || reallocation) && <label className="block">Next review ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" className={`block border rounded p-2 ${panel}`} value={nextReview} onChange={e => setNextReview(e.target.value)} /></label>}
            {!deadline && <label className="block">{reallocation ? 'Quantity to reallocate' : 'Quantity to release'} ({selected.base_unit})<input className={`block border rounded p-2 ${panel}`} inputMode="decimal" maxLength={25} value={quantity} onChange={e => setQuantity(e.target.value)} /></label>}
            {reallocation && <section><button type="button" className={button} onClick={() => setPicking(true)}>Choose destination</button>{target && <p className="break-all">Destination: {target.document_key} · Line {target.line_key} · Version {target.version}</p>}<p>The reassigned quantity stays in its original stock location. The destination may already hold compatible stock across locations in the same store; the batch must match. A separate hold is added without changing existing quantities or deadlines. Combined holds cannot exceed demand. Paid holds are not supported. Approval does not execute the move.</p></section>}
            <label className="block">{reallocation ? 'Reallocation reason' : deadline ? 'Agreed follow-up reason' : 'Release reason'}<textarea className={`block w-full border rounded p-2 ${panel}`} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
          </fieldset>
        </>}
      </section> : !result ? !error && <p role="status">Loading reservations…</p> : !result.items.length ? <p>{dueInbox ? 'No overdue reservations in this company.' : 'No linked reservations for this draft.'}</p> :
        <table className="w-full text-sm"><thead className={`sticky top-0 ${panel}`}><tr>{['Product / location', 'Original hold', 'Released', 'Remaining', 'Review due', 'Action'].map(label => <th className="p-2 text-left" key={label}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr key={row.reservation_key} className="border-t">
            <td className="p-2">{row.product_name || draft?.lines.find(line => line.line_key === row.line_key)?.product_name || `Product ${row.product_id}`} · {row.location_name || `Location ${row.location_id}`}{dueInbox && <span className="block">{row.branch_name || `Store ${row.branch_id}`}</span>}</td>
            <td className="p-2">{row.held_quantity} {row.base_unit}</td><td className="p-2">{row.released_before} {row.base_unit}</td><td className="p-2">{row.remaining_quantity} {row.base_unit}</td>
            <td className="p-2">{new Date(row.review_at).toLocaleString()}{row.review_due && <strong className="block">Follow-up due — still held</strong>}</td><td className="p-2">{dueInbox && <button disabled={busy} className={button} onClick={() => openSource(row)}>Open draft</button>}{scaled(row.remaining_quantity) > zero && <>{canRequest && <button disabled={busy} className={button} onClick={() => { setSelected(row); setError(''); }}>Request release</button>}{canRequestDeadline && <button disabled={busy} className={button} onClick={() => { setSelected(row); setDeadline(true); setError(''); }}>Request follow-up</button>}{canRequestReallocation && <button disabled={busy} className={button} onClick={() => { setSelected(row); setReallocation(true); setError(''); }}>Request reallocation</button>}</>}</td>
          </tr>)}</tbody></table>}
    </div>
    <footer className="shrink-0 flex flex-wrap gap-2">
      {selected ? discard ? <><p role="alert">Discard this unsaved {reallocation ? 'reallocation' : deadline ? 'follow-up' : 'release'} request?</p><button className={button} onClick={reset}>Discard request</button><button className={button} onClick={() => setDiscard(false)}>Keep editing</button></> : <>
        {!saved && <button className={`${button} bg-indigo-600 text-white`} disabled={busy || conflict || !maySubmit} onClick={submit}>{busy ? 'Requesting…' : pending ? 'Retry same request' : reallocation ? 'Submit reallocation review' : deadline ? 'Submit follow-up review' : 'Submit release review'}</button>}
        <button className={button} disabled={busy || Boolean(pending)} onClick={() => dirty && !conflict ? setDiscard(true) : reset()}>Back to reservations</button>
      </> : <><button className={button} disabled={busy} onClick={onClose}>{dueInbox ? 'Back to sales drafts' : 'Back to draft'}</button><button className={button} disabled={busy} onClick={() => setRefresh(n => n + 1)}>Refresh reservations</button>
        <PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} />
      </>}
    </footer>
  </section>;
}
