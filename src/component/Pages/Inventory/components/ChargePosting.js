import React, { useEffect, useRef, useState } from 'react';
import useOperationIntent from '../../../../hooks/useOperationIntent';

export default function ChargePosting({ api, item, panel, button, onBusyChange, onPosted }) {
  const [context, setContext] = useState(null), [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false), [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null), [blocked, setBlocked] = useState(false);
  const controller = useRef(null), busy = useRef(false);
  const { payloadFor } = useOperationIntent();
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    api.chargePostingContext(item.case_key, request.signal).then(({ data }) => {
      if (request.signal.aborted) return;
      if (data.case_key !== item.case_key || !Array.isArray(data.streams) || !data.streams.length) throw new Error('Invalid context');
      setContext(data);
    }).catch(err => { if (!request.signal.aborted) setError(err.response?.status === 503
      ? 'Cost posting is disabled: central runtime or versioned-evidence configuration is missing.'
      : 'Posting context unavailable. Review current evidence, permissions and valuation sources before reopening.'); });
    return () => request.abort();
  }, [api, item.case_key]);
  useEffect(() => {
    const warn = event => { if (pending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);
  async function post() {
    if (busy.current || blocked || !confirmed || !context) return;
    let body = pending;
    if (!body) {
      try { body = payloadFor(['post-inventory-cost', item.case_key], { streams: context.streams }); }
      catch { setError('Secure operation identity is unavailable.'); return; }
    }
    busy.current = true; setSaving(true); setPending(body); setError(''); onBusyChange(true);
    try {
      const { data } = await api.postReviewedCharge(item.case_key, body, controller.current.signal);
      if (data.operation_key !== body.operation_key || data.case_key !== item.case_key
          || data.proposal_key !== context.proposal_key || data.status !== 'UNRECONCILED'
          || !Array.isArray(data.valuation_ids) || !data.valuation_ids.length) throw new Error('Unconfirmed receipt');
      if (!controller.current.signal.aborted) { setPending(null); onPosted(data); }
    } catch (err) {
      if (controller.current.signal.aborted) return;
      const status = err.response?.status;
      if (status >= 400 && status < 500) {
        setBlocked(true); setPending(null);
        setError('Posting rejected. Reopen and review changed evidence, access or valuation versions. Do not replace an uncertain charge with a new proposal.');
      } else setError('Outcome not confirmed. Retry this identical operation; do not post another charge.');
    } finally { busy.current = false; if (!controller.current.signal.aborted) { setSaving(false); onBusyChange(false); } }
  }
  return <section aria-label="Post reviewed inventory cost" className={`border rounded-lg p-3 space-y-2 ${panel}`}>
    <p>Append the exact verified additional cost as UNRECONCILED valuation. This does not pay a supplier, change selling prices or finalise accounts. Original evidence versions are checked again before posting.</p>
    {!context && !error && <p role="status">Checking central authority and valuation versions…</p>}
    {error && <p role="alert">{error}</p>}
    <label className="block"><input type="checkbox" checked={confirmed} disabled={saving || !!pending || !context || blocked} onChange={event => setConfirmed(event.target.checked)} /> Post only the exact approved cost shown above</label>
    <button type="button" className={button} disabled={!confirmed || !context || saving || blocked} onClick={post}>{saving ? 'Posting…' : pending ? 'Retry identical cost posting' : 'Post reviewed inventory cost'}</button>
  </section>;
}
