import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ScanLine } from 'lucide-react';
import useOperationIntent from '../../../hooks/useOperationIntent';
import {
  Badge, EmptyState, LoadingState, RegisterHeader, fieldLabelClass, hintClass, inputClass,
  messageClass, pageClass, panelClass, primaryButtonClass, secondaryButtonClass, selectClass,
} from '../../UI/UXComponent/RegisterShell';

/**
 * The counter's sheet, sized for a tablet on the floor.
 *
 * It deliberately shows no expected quantity, no earlier round and no value:
 * the server's blind projection does not return them, so there is nothing here
 * to leak. An empty shelf is counted as 0, which is a real count, not a blank.
 */
export default function BlindCountSheet({ api, session, onClose, onSubmitted }) {
  const { payloadFor } = useOperationIntent();
  const [sheet, setSheet] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [discard, setDiscard] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const dirty = Object.values(values).some(value => value.quantity !== '' && value.quantity !== undefined);
  useEffect(() => {
    if (!dirty && !pending) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, pending]);

  useEffect(() => {
    const controller = new AbortController();
    setSheet(null); setError('');
    api.sheet(session.session_key, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setSheet(data); })
      .catch(failure => {
        if (controller.signal.aborted) return;
        setError(failure.response?.status === 403
          ? 'This sheet belongs to another counter.'
          : 'The count sheet could not be loaded. Refresh and try again.');
      });
    return () => controller.abort();
  }, [api, session.session_key]);

  const outstanding = (sheet?.lines || []).filter(line => !line.entered);

  function change(line, patch) {
    if (inFlight.current || pending || receipt) return;
    const key = `${line.product_id}:${line.location_id}`;
    setValues(current => ({ ...current, [key]: { unit: line.base_unit, ...current[key], ...patch } }));
  }

  function entered(line) {
    return values[`${line.product_id}:${line.location_id}`] || { quantity: '', unit: line.base_unit };
  }

  async function saveCounted() {
    if (inFlight.current || receipt) return;
    const entries = outstanding
      .map(line => ({ line, value: entered(line) }))
      .filter(({ value }) => value.quantity !== '' && value.quantity !== undefined)
      .map(({ line, value }) => ({
        product_id: line.product_id, location_id: line.location_id,
        quantity: String(value.quantity).trim(), unit: value.unit || line.base_unit,
      }));
    if (!entries.length) { setError('Enter at least one counted quantity. An empty shelf is counted as 0.'); return; }
    if (entries.some(entry => !/^\d{1,12}(?:\.\d{1,6})?$/.test(entry.quantity))) {
      setError('Quantities must be plain decimal numbers with at most six decimal places.'); return;
    }
    let body = pending;
    if (!body) {
      try { body = payloadFor(['count.entries', session.session_key, String(entries.length)], { entries }); }
      catch { setError('Secure save identity is unavailable. Keep this sheet open and retry.'); return; }
    }
    inFlight.current = true; setBusy(true); setPending(body); setError('');
    try {
      const { data } = await api.saveEntries(session.session_key, body);
      if (!alive.current) return;
      if (data.session_key !== session.session_key || data.state !== 'IN_PROGRESS') throw new Error('Receipt mismatch');
      toast.success(`${data.entered_lines} line(s) counted on this round.`);
      setPending(null); setReceipt(data);
      // Keep entered text until the confirmed save has been followed by a fresh sheet.
      await refreshConfirmedSheet();
    } catch (failure) {
      if (!alive.current) return;
      const status = failure.response?.status;
      if (status === 409 || status === 404 || status === 422) {
        setPending(null);
        setError(failure.response?.data?.detail || 'The count could not be saved. Reload the sheet and count again.');
      } else {
        setError('Save outcome is unconfirmed. Keep this sheet open and retry the same save.');
      }
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }

  async function refreshConfirmedSheet() {
    try {
      const refreshed = await api.sheet(session.session_key);
      if (!alive.current) return;
      if (refreshed.data.session_key !== session.session_key) throw new Error('Sheet mismatch');
      setSheet(refreshed.data); setValues({}); setReceipt(null); setError('');
    } catch {
      if (alive.current) setError('Count save confirmed. The sheet could not refresh; retry refresh only. Your entered text is retained.');
    }
  }
  async function retryRefresh() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await refreshConfirmedSheet(); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }

  async function submit() {
    if (inFlight.current || !sheet || pending || receipt) return;
    const total = sheet.lines.length;
    const done = sheet.lines.filter(line => line.entered).length;
    if (done !== total) { setError(`Count every line before submitting: ${done} of ${total} done.`); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      await api.submit(session.session_key, payloadFor(['count.submit', session.session_key], { expected_entered_lines: total }));
      toast.success('Round submitted. Differences are provisional until reviewed.');
      onSubmitted();
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The round could not be submitted. Reload and try again.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  const done = (sheet?.lines || []).filter(line => line.entered).length;

  return <section className={pageClass} aria-label="Blind count sheet">
    <RegisterHeader icon={ScanLine} title={`Count · ${sheet?.location_name || session.location_name || 'Location'}`}
      count={sheet ? `${done}/${sheet.lines.length}` : undefined}
      description="Count what is physically on the shelf. Expected quantities are deliberately not shown."
      actions={<>
        <button type="button" className={secondaryButtonClass} disabled={busy || Boolean(pending)} onClick={() => dirty && !receipt ? setDiscard(true) : onClose()}>Back to rounds</button>
        {receipt ? <button type="button" className={secondaryButtonClass} disabled={busy} onClick={retryRefresh}>Retry sheet refresh</button> :
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={saveCounted}>{pending ? 'Retry same save' : 'Save counted lines'}</button>}
        <button type="button" className={primaryButtonClass} disabled={busy || Boolean(pending) || Boolean(receipt) || !sheet || done !== sheet.lines.length} onClick={submit}>Submit round</button>
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    {receipt && <p role="status">Count save confirmed. No stock adjustment was posted.</p>}
    {discard && <section role="alertdialog" aria-label="Discard unsaved count entries" className={panelClass}>
      <p>Leave and discard unsaved entries? Saved counts remain unchanged.</p>
      <button type="button" className={secondaryButtonClass} onClick={() => setDiscard(false)}>Keep counting</button>
      <button type="button" className={secondaryButtonClass} onClick={onClose}>Discard unsaved entries</button>
    </section>}
    <p className={messageClass('muted')}>Round {sheet?.round || session.round} · entries are permanent. A correction needs a new recount round, so count carefully.</p>

    <div className="min-h-0 flex-1 space-y-3 overflow-auto">
      {!sheet && !error ? <LoadingState label="Loading count sheet…" />
        : sheet && !sheet.lines.length ? <EmptyState icon={ScanLine} title="Nothing to count in this round."
            hint="Every line in this location has been counted, or the plan scope is empty." />
        : (sheet?.lines || []).map(line => {
          const value = entered(line);
          return <section key={`${line.product_id}:${line.location_id}`} className={`${panelClass} flex flex-wrap items-end gap-3`}>
            <div className="min-w-[14rem] flex-1">
              <p className="text-sm font-semibold">{line.product_name || `Product ${line.product_id}`}</p>
              <p className={hintClass}>{line.sku} · step {line.quantity_step} {line.base_unit}</p>
            </div>
            {line.entered
              ? <Badge tone="emerald">Counted on this round</Badge>
              : <>
                <label className="block"><span className={fieldLabelClass}>Counted quantity</span>
                  <input disabled={busy || Boolean(pending) || Boolean(receipt)} className={`block w-40 text-lg ${inputClass}`} inputMode="decimal" maxLength={25}
                    value={value.quantity || ''} onChange={event => change(line, { quantity: event.target.value })} /></label>
                <label className="block"><span className={fieldLabelClass}>Unit</span>
                  <select disabled={busy || Boolean(pending) || Boolean(receipt)} className={`block ${selectClass}`} value={value.unit || line.base_unit}
                    onChange={event => change(line, { unit: event.target.value })}>
                    {line.units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select></label>
              </>}
          </section>;
        })}
    </div>
  </section>;
}
