import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, primaryButtonClass, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

const newKey = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 3) | 8).toString(16);
  });
const quantityPattern = /^\d{1,12}(?:\.\d{1,6})?$/;
const positiveQuantity = value => quantityPattern.test(value)
  && /[1-9]/.test(value.replace('.', ''));
const message = failure => failure?.response?.data?.detail
  || 'The collection outcome is uncertain. Keep this screen open and retry the identical action.';

export default function SalesCollectionPanel({ api, invoice, customerName, onClose }) {
  const [options, setOptions] = useState(null), [history, setHistory] = useState([]);
  const [counterKey, setCounterKey] = useState(''), [collectorName, setCollectorName] = useState('');
  const [collectorContact, setCollectorContact] = useState(''), [quantities, setQuantities] = useState({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [receipt, setReceipt] = useState(null);
  const [pendingBody, setPendingBody] = useState(null);
  const [intent, setIntent] = useState(() => ({ collection_key: newKey(), operation_key: newKey() }));
  const request = useRef(null), running = useRef(false);

  const load = async signal => {
    const [optionResult, historyResult] = await Promise.all([
      api.collectionOptions(invoice.invoice_key, signal),
      api.invoiceCollections(invoice.invoice_key, signal),
    ]);
    if (signal?.aborted) return;
    setOptions(optionResult.data); setHistory(historyResult.data || []);
    setCounterKey(current => current || optionResult.data.counters[0]?.counter_key || '');
  };
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    setError(''); load(controller.signal).catch(failure => {
      if (!controller.signal.aborted) setError(message(failure));
    });
    return () => controller.abort();
    // The invoice identity is immutable; api is memoized by the owning register.
  }, [api, invoice.invoice_key]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCounter = options?.counters.find(row => row.counter_key === counterKey);
  const allocations = useMemo(() => (options?.reservations || []).flatMap(row => {
    const quantity = (quantities[row.reservation_key] || '').trim();
    return positiveQuantity(quantity) ? [{
      line_key: row.line_key, reservation_key: row.reservation_key,
      quantity, expected_stock_version: row.stock_version,
    }] : [];
  }), [options, quantities]);

  async function submit(event) {
    event.preventDefault();
    if (running.current || !options || !selectedCounter) return;
    if (!pendingBody && (!collectorName.trim() || !collectorContact.trim() || !allocations.length)) {
      setError('Enter collector details, choose a collection counter and enter at least one handover quantity.'); return;
    }
    running.current = true; setBusy(true); setError('');
    const body = pendingBody || {
      ...intent, invoice_key: invoice.invoice_key, branch_id: options.branch_id,
      counter_key: selectedCounter.counter_key,
      expected_branch_settings_version: options.branch_settings_version,
      expected_counter_settings_version: selectedCounter.version,
      expected_assignment_version: options.assignment_version,
      collector_name: collectorName.trim(), collector_contact: collectorContact.trim(),
      allocations,
    };
    if (!pendingBody) setPendingBody(body);
    try {
      const result = await api.createCollection(intent.collection_key, body, request.current?.signal);
      if (request.current?.signal.aborted) return;
      setReceipt(result.data.collection); setQuantities({}); setPendingBody(null);
      setIntent({ collection_key: newKey(), operation_key: newKey() });
      await load(request.current?.signal);
    } catch (failure) {
      if (!request.current?.signal.aborted) setError(message(failure));
    } finally {
      running.current = false;
      if (!request.current?.signal.aborted) setBusy(false);
    }
  }

  const fullyCollected = options?.fulfilment_status === 'COLLECTED';
  return <section aria-label="Physical collection" className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 className="text-lg font-semibold">Collection · Invoice {invoice.invoice_number}</h2><p className="text-xs">{customerName} · physical handover is separate from payment</p></div>
      <button type="button" className={secondaryButtonClass} onClick={onClose}>Back to invoice</button>
    </header>
    <div className="min-h-0 flex-1 overflow-auto p-4 space-y-4">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
      {!options && !error && <p role="status">Checking collection eligibility and exact reserved stock…</p>}
      {options && <div className="flex flex-wrap gap-2"><Badge tone="emerald">{options.payment_status}</Badge><Badge tone={fullyCollected ? 'emerald' : 'amber'}>{options.fulfilment_status.replaceAll('_', ' ')}</Badge><Badge tone="slate">Same store only</Badge></div>}
      {receipt && <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30"><p role="status" className="font-semibold">Handover recorded once</p><p>{receipt.allocations.length} allocation{receipt.allocations.length === 1 ? '' : 's'} · {receipt.fulfilment_status.replaceAll('_', ' ')}</p><button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setReceipt(null)}>Dismiss result</button></section>}
      {pendingBody && !receipt && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">This exact handover request is locked until its outcome is confirmed. Retry it unchanged; do not start another collection.</p>}
      {options && !fullyCollected && <form onSubmit={submit} className="space-y-4">
        {!options.counters.length && <p role="alert" className="rounded-xl border border-amber-300 p-3">Collection is blocked until an enabled collection counter is configured.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold">Collection counter<select disabled={busy || Boolean(pendingBody)} value={counterKey} onChange={event => setCounterKey(event.target.value)} className="mt-1 block min-h-[44px] w-full rounded-lg border bg-white p-2 dark:bg-slate-800"><option value="">Choose counter</option>{options.counters.map(row => <option key={row.counter_key} value={row.counter_key}>{row.name} · {row.code}</option>)}</select></label>
          <label className="text-sm font-semibold">Collector name<input disabled={busy || Boolean(pendingBody)} required maxLength="150" value={collectorName} onChange={event => setCollectorName(event.target.value)} className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
          <label className="text-sm font-semibold">Collector contact<input disabled={busy || Boolean(pendingBody)} required maxLength="50" value={collectorContact} onChange={event => setCollectorContact(event.target.value)} className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
        </div>
        <section><h3 className="font-semibold">Eligible reserved stock</h3><p className="text-xs text-slate-500 dark:text-slate-400">Enter only what is physically handed over now. Another location or batch remains a separate row.</p>
          <div className="mt-2 space-y-2">{options.reservations.map(row => <div key={row.reservation_key} className="grid grid-cols-1 gap-2 rounded-xl border p-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-center"><div><p className="font-semibold">{row.location_name} · {row.location_code}</p><p className="text-sm">Remaining {row.remaining} {row.base_unit}{row.batch_code ? ` · Batch ${row.batch_code}` : ''}</p>{(row.shade || row.calibre) && <p className="text-xs">{row.shade ? `Shade ${row.shade}` : ''}{row.shade && row.calibre ? ' · ' : ''}{row.calibre ? `Calibre ${row.calibre}` : ''}</p>}</div><label className="text-sm font-semibold">Hand over now<input disabled={busy || Boolean(pendingBody)} aria-label={`Handover quantity at ${row.location_name}`} inputMode="decimal" placeholder={`0–${row.remaining}`} value={quantities[row.reservation_key] || ''} onChange={event => setQuantities(current => ({ ...current, [row.reservation_key]: event.target.value }))} className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 dark:bg-slate-800" /></label></div>)}</div>
          {!options.reservations.length && <p className="mt-2 rounded-xl border border-amber-300 p-3">No non-serial stock is eligible for handover in this store. Serial or other-store stock remains blocked until its reviewed workflow is available.</p>}
        </section>
        <div className="flex flex-wrap justify-end gap-2"><button type="submit" className={primaryButtonClass} disabled={busy || !options.counters.length || (!pendingBody && !allocations.length)}>{busy ? 'Recording handover…' : pendingBody ? 'Retry exact handover' : 'Confirm physical handover'}</button></div>
      </form>}
      {fullyCollected && <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">All eligible invoice quantities have been collected.</p>}
      <section><h3 className="font-semibold">Collection history</h3>{history.length ? <ul className="mt-2 space-y-2">{history.map(row => <li key={row.collection_key} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{row.collector_name}</strong><time dateTime={row.collected_at}>{new Date(row.collected_at).toLocaleString()}</time></div><p>{row.collector_contact} · {row.allocations.length} allocation{row.allocations.length === 1 ? '' : 's'}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No physical handover recorded yet.</p>}</section>
    </div>
  </section>;
}
