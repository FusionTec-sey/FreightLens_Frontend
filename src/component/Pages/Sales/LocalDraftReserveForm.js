import React, { useEffect, useRef, useState } from 'react';
import { panelClass, primaryButtonClass, secondaryButtonClass, inputClass, fieldLabelClass, hintClass } from '../../UI/UXComponent/RegisterShell';

export default function LocalDraftReserveForm({ api, draft, preview, line, suggestion, onReserved, onClose }) {
  const [reviewAt, setReviewAt] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const inFlight = useRef(false);
  useEffect(() => () => request.current?.abort(), []);

  async function submit() {
    if (inFlight.current) return;
    let body = pending;
    if (!body) {
      if (!reviewAt || !Number.isFinite(new Date(reviewAt).getTime()) || !reason.trim()) {
        setError('Enter the agreed review date and a reason.'); return;
      }
      body = { expected_draft_version: draft.version, line_key: line.line_key,
        counter_key: preview.counter_key, counter_version: preview.counter_version,
        balance_id: suggestion.balance_id, quantity: line.remaining_demand,
        review_at: new Date(reviewAt).toISOString(), reason: reason.trim() };
    }
    inFlight.current = true; setBusy(true); setPending(body); setError('');
    const controller = new AbortController(); request.current = controller;
    try {
      const { data } = await api.reserveLocal(draft.document_key, body, controller.signal);
      if (controller.signal.aborted) return;
      if (data.balance_id !== suggestion.balance_id || !data.reservation_key) throw new Error('Unconfirmed receipt');
      onReserved(data);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if ([403, 404, 409, 422].includes(failure.response?.status)) {
        setPending(null);
        setError(typeof failure.response.data?.detail === 'string' ? failure.response.data.detail : 'Stock or access changed. Refresh the draft and preview again.');
      } else setError('Hold outcome is unconfirmed. Keep this form open and retry the same request.');
    } finally { inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }

  return <section className={`${panelClass} mt-3 space-y-3`} aria-label="Reserve local draft stock">
    <h3 className="font-semibold">Reserve suggested local stock</h3>
    <p className={hintClass}>{suggestion.location_name}: {line.remaining_demand} {line.base_unit}. This creates a stock hold for draft demand, not a sale or payment.</p>
    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    <div className="grid gap-3 md:grid-cols-2">
      <label className={fieldLabelClass}>Agreed next review<input type="datetime-local" className={`mt-1 block w-full ${inputClass}`} disabled={busy || Boolean(pending)} value={reviewAt} onChange={event => setReviewAt(event.target.value)} /></label>
      <label className={fieldLabelClass}>Reservation reason<input className={`mt-1 block w-full ${inputClass}`} maxLength={500} disabled={busy || Boolean(pending)} value={reason} onChange={event => setReason(event.target.value)} /></label>
    </div>
    <div className="flex gap-2"><button type="button" className={primaryButtonClass} disabled={busy} onClick={submit}>{busy ? 'Reserving…' : pending ? 'Retry same hold' : 'Reserve local stock'}</button>
      <button type="button" className={secondaryButtonClass} disabled={busy || Boolean(pending)} onClick={onClose}>Cancel</button></div>
  </section>;
}
