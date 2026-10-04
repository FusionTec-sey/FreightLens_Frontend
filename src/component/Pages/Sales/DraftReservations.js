import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import useOperationIntent from '../../../hooks/useOperationIntent';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import ReallocationTargetPicker from './ReallocationTargetPicker';
import { AlarmClock, PackageCheck } from 'lucide-react';
import { Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass, hintClass, inputClass, pageClass, panelClass, primaryButtonClass, rowActionClass, secondaryButtonClass, tableClass, tdClass, textareaClass, thClass, trClass } from '../../UI/UXComponent/RegisterShell';

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
  return <section className={pageClass} aria-label="Draft reservations">
    <RegisterHeader icon={dueInbox ? AlarmClock : PackageCheck} count={result?.total}
      title={dueInbox ? 'Overdue reservation follow-up' : 'Reserved stock'}
      description="Review deadlines do not cancel holds. Approval does not release stock or authorise collection." />
    {dueInbox && <p className={hintClass}>Current company, all stores. Oldest due first. Refresh for updated status; opening a draft rechecks access.</p>}
    <div className={cardClass}>
      {error && <p role="alert" className="p-2">{error}</p>}
      {selected ? <section className={`${panelClass} space-y-3`}>
        <h2 className="font-semibold">{reallocation ? 'Request reallocation review' : deadline ? 'Request follow-up date review' : 'Request release review'}</h2>
        <p>Remaining: {selected.remaining_quantity} {selected.base_unit} · Location {selected.location_id}</p>
        <p className="text-xs break-all">Reservation: {selected.reservation_key} · Draft version {selected.source_version}</p>
        {saved ? <p role="status">Review requested: {saved}. A different authorised manager must review it. Stock is still reserved.</p> : <>
          <p className="text-sm">Keep this form open until confirmed. Navigation recovery is not yet available.</p>
          {pending && <p className="text-xs break-all">Request reference: {pending.operation_key}</p>}
          <fieldset disabled={busy || Boolean(pending) || conflict} className="space-y-3">
            {(deadline || reallocation) && <label className="block"><span className={fieldLabelClass}>Next review ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span><input type="datetime-local" className={`block ${inputClass}`} value={nextReview} onChange={e => setNextReview(e.target.value)} /></label>}
            {!deadline && <label className="block"><span className={fieldLabelClass}>{reallocation ? 'Quantity to reallocate' : 'Quantity to release'} ({selected.base_unit})</span><input className={`block ${inputClass}`} inputMode="decimal" maxLength={25} value={quantity} onChange={e => setQuantity(e.target.value)} /></label>}
            {reallocation && <section className="space-y-2"><button type="button" className={secondaryButtonClass} onClick={() => setPicking(true)}>Choose destination</button>{target && <p className="break-all text-sm">Destination: {target.document_key} · Line {target.line_key} · Version {target.version}</p>}<p className={hintClass}>Same-store, same-stock-bucket draft demand only. A new hold is added without changing existing quantities or deadlines. Combined holds cannot exceed demand. Paid holds are not supported. Approval does not execute the move.</p></section>}
            <label className="block"><span className={fieldLabelClass}>{reallocation ? 'Reallocation reason' : deadline ? 'Agreed follow-up reason' : 'Release reason'}</span><textarea className={textareaClass} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
          </fieldset>
        </>}
      </section> : !result ? !error && <LoadingState label="Loading reservations…" /> : !result.items.length ? <EmptyState icon={dueInbox ? AlarmClock : PackageCheck} title={dueInbox ? 'No overdue reservations in this company.' : 'No linked reservations for this draft.'} hint="Holds appear here once stock is reserved against a saved draft line." /> :
        <table className={tableClass}><thead><tr>{['Product / location', 'Original hold', 'Released', 'Remaining', 'Review due', 'Action'].map(label => <th className={thClass} key={label}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr key={row.reservation_key} className={trClass}>
            <td className={tdClass}><span className="font-semibold">{row.product_name || draft?.lines.find(line => line.line_key === row.line_key)?.product_name || `Product ${row.product_id}`}</span> · {row.location_name || `Location ${row.location_id}`}{dueInbox && <span className="block text-xs text-slate-500 dark:text-slate-400">{row.branch_name || `Store ${row.branch_id}`}</span>}</td>
            <td className={tdClass}>{row.held_quantity} {row.base_unit}</td><td className={tdClass}>{row.released_before} {row.base_unit}</td><td className={`${tdClass} font-semibold`}>{row.remaining_quantity} {row.base_unit}</td>
            <td className={tdClass}>{new Date(row.review_at).toLocaleString()}{row.review_due && <span className="mt-1 block"><Badge tone="rose">Follow-up due — still held</Badge></span>}</td><td className={tdClass}><div className="flex flex-wrap gap-1">{dueInbox && <button disabled={busy} className={rowActionClass} onClick={() => openSource(row)}>Open draft</button>}{scaled(row.remaining_quantity) > zero && <>{canRequest && <button disabled={busy} className={rowActionClass} onClick={() => { setSelected(row); setError(''); }}>Request release</button>}{canRequestDeadline && <button disabled={busy} className={rowActionClass} onClick={() => { setSelected(row); setDeadline(true); setError(''); }}>Request follow-up</button>}{canRequestReallocation && <button disabled={busy} className={rowActionClass} onClick={() => { setSelected(row); setReallocation(true); setError(''); }}>Request reallocation</button>}</>}</div></td>
          </tr>)}</tbody></table>}
    </div>
    <footer className="shrink-0 flex flex-wrap gap-2">
      {selected ? discard ? <><p role="alert">Discard this unsaved {reallocation ? 'reallocation' : deadline ? 'follow-up' : 'release'} request?</p><button className={secondaryButtonClass} onClick={reset}>Discard request</button><button className={secondaryButtonClass} onClick={() => setDiscard(false)}>Keep editing</button></> : <>
        {!saved && <button className={primaryButtonClass} disabled={busy || conflict || !maySubmit} onClick={submit}>{busy ? 'Requesting…' : pending ? 'Retry same request' : reallocation ? 'Submit reallocation review' : deadline ? 'Submit follow-up review' : 'Submit release review'}</button>}
        <button className={secondaryButtonClass} disabled={busy || Boolean(pending)} onClick={() => dirty && !conflict ? setDiscard(true) : reset()}>Back to reservations</button>
      </> : <><button className={secondaryButtonClass} disabled={busy} onClick={onClose}>{dueInbox ? 'Back to sales drafts' : 'Back to draft'}</button><button className={secondaryButtonClass} disabled={busy} onClick={() => setRefresh(n => n + 1)}>Refresh reservations</button>
        <PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} />
      </>}
    </footer>
  </section>;
}
