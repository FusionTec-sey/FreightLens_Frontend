import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import useOperationIntent from '../../../hooks/useOperationIntent';

export default function CustomerDuplicateRequest({ api, orgId, renderPicker, onClose, onSaved }) {
  const { isDark } = useTheme();
  const [pair, setPair] = useState([null, null]);
  const [picking, setPicking] = useState(null);
  const [assessment, setAssessment] = useState('SAME_CUSTOMER');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const request = useRef(null), sending = useRef(false);
  const { payloadFor } = useOperationIntent();
  const dirty = pair.some(Boolean) || Boolean(reason) || Boolean(pending);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const theme = isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const button = 'border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20 disabled:opacity-40';
  async function save() {
    if (sending.current || blocked) return;
    if (!pair.every(Boolean) || !reason.trim()) { setError('Choose two customers and explain the assessment.'); return; }
    if (pair[0].customerKey === pair[1].customerKey) { setError('Choose two different customers.'); return; }
    let body = pending;
    try {
      body = body || payloadFor(['customer.duplicate', orgId], {
        customer_key: pair[0].customerKey, other_customer_key: pair[1].customerKey,
        expected_customer_version: pair[0].version, expected_other_version: pair[1].version,
        assessment, reason: reason.trim(),
      });
    } catch { setError('Secure request identity unavailable. Nothing was submitted.'); return; }
    sending.current = true; setBusy(true); setPending(body); setError('');
    const controller = new AbortController(); request.current = controller;
    try {
      const { data } = await api.requestDuplicate(body, controller.signal);
      if (controller.signal.aborted) return;
      if (data?.case_key !== body.operation_key || data.version !== 1 || data.status !== 'REQUESTED') throw new Error('Unconfirmed receipt');
      onSaved(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if ([403, 404, 409, 422].includes(err.response?.status)) {
        setBlocked(true); setPending(null);
        setError('Request rejected. Close and refresh the customer details before requesting again.');
      } else setError('Outcome unknown. Keep this screen open and retry the same request; do not submit a second case.');
    } finally { sending.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  if (picking !== null) return <section className={`h-full min-h-0 flex flex-col ${theme}`}>
    <header className="shrink-0 p-3"><button type="button" className={button} onClick={() => setPicking(null)}>Back to assessment</button></header>
    <div className="flex-1 min-h-0">{renderPicker(value => {
      if (String(value.orgId) !== String(orgId)) { setError('Customer company changed.'); setPicking(null); return; }
      setPair(previous => previous.map((item, index) => index === picking ? value : item)); setPicking(null);
    })}</div>
  </section>;
  return <section className={`h-full min-h-0 flex flex-col p-4 gap-3 ${theme}`} aria-label="Request duplicate customer review">
    <header className="shrink-0"><h1 className="text-xl font-bold">Request duplicate review</h1><p>No customers, contacts, sales references or balances will be merged.</p></header>
    <div className="flex-1 min-h-0 overflow-auto space-y-4">
      {error && <p role="alert">{error}</p>}
      {pending && <p className="text-xs break-all">Request: {pending.operation_key}</p>}
      <fieldset disabled={busy || blocked || Boolean(pending)} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">{pair.map((item, index) => <section key={index} className="border rounded p-3 space-y-2">
          <h2 className="font-semibold">Customer {index + 1}</h2>
          {item ? <><p>{item.profile.name} · Version {item.version}</p><p className="text-xs break-all">{item.customerKey}</p><ul>{item.profile.contacts.map((contact, i) => <li key={i} className="break-words">{contact.kind}: {contact.value}</li>)}</ul></> : <p>No customer selected.</p>}
          <button type="button" className={button} onClick={() => setPicking(index)}>Choose customer {index + 1}</button>
        </section>)}</div>
        <label className="block">Proposed assessment<select className={`block border rounded p-2 ${theme}`} value={assessment} onChange={event => setAssessment(event.target.value)}><option value="SAME_CUSTOMER">Same customer — possible duplicate records</option><option value="DISTINCT_CUSTOMERS">Different customers — keep separate</option></select></label>
        <label className="block">Reason<textarea className={`block w-full border rounded p-2 ${theme}`} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      </fieldset>
    </div>
    <footer className="shrink-0 flex flex-wrap gap-3">
      {discard ? <><p>Discard this unsaved assessment?</p><button type="button" className={button} onClick={onClose}>Discard assessment</button><button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button></> : <>
        <button type="button" className={`${button} bg-indigo-600 text-white`} disabled={busy || blocked} onClick={save}>{busy ? 'Submitting…' : pending ? 'Retry same request' : 'Request independent review'}</button>
        <button type="button" className={button} disabled={busy || Boolean(pending)} onClick={() => dirty ? setDiscard(true) : onClose()}>Back to customers</button>
      </>}
    </footer>
  </section>;
}
