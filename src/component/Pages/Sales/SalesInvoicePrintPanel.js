import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, primaryButtonClass, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

const makeKey = () => {
  if (typeof window.crypto?.randomUUID !== 'function') throw new Error('A secure browser connection is required for invoice printing.');
  return window.crypto.randomUUID();
};
const message = failure => failure?.response?.data?.detail
  || failure?.message || 'The print outcome is uncertain. Reload its state before doing anything else.';

export default function SalesInvoicePrintPanel({ api, invoice, canResolve = false, onClose }) {
  const [options, setOptions] = useState(null), [history, setHistory] = useState(null);
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [createIntent, setCreateIntent] = useState(null);
  const [handoffIntents, setHandoffIntents] = useState({});
  const [resolution, setResolution] = useState(null);
  const running = useRef(false), controller = useRef(null);

  const load = useCallback(async (signal) => {
    setLoading(true); setError('');
    try {
      const [optionResult, historyResult] = await Promise.all([
        api.invoicePrintOptions(invoice.invoice_key, signal),
        api.invoicePrintJobs(invoice.invoice_key, page, 10, signal),
      ]);
      if (signal?.aborted) return;
      if (String(optionResult.data.invoice_key) !== String(invoice.invoice_key)) throw new Error('Print options do not match this invoice.');
      setOptions(optionResult.data); setHistory(historyResult.data);
    } catch (failure) {
      if (!signal?.aborted) { setOptions(null); setHistory(null); setError(message(failure)); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [api, invoice.invoice_key, page]);

  useEffect(() => {
    const request = new AbortController(); controller.current = request; load(request.signal);
    return () => request.abort();
  }, [load]);

  const openJobs = (history?.items || []).filter(job => ['READY', 'UNCERTAIN'].includes(job.status));
  const createArtifact = async kind => {
    if (running.current || !options || openJobs.length) return;
    let intent = createIntent;
    try {
      if (!intent || intent.kind !== kind) {
        intent = { kind, job_key: makeKey(), operation_key: makeKey(), artifact_key: makeKey() };
        setCreateIntent(intent);
      }
    } catch (failure) { setError(message(failure)); return; }
    const body = {
      ...intent, invoice_key: invoice.invoice_key,
      expected_template_id: kind === 'ORIGINAL' ? options.template_id : null,
      expected_template_version_id: kind === 'ORIGINAL' ? options.template_version_id : null,
      source_artifact_key: kind === 'COPY' ? options.original_artifact?.artifact_key : null,
    };
    running.current = true; setBusy(true); setError('');
    try {
      await api.createInvoicePrintJob(invoice.invoice_key, intent.job_key, body, controller.current?.signal);
      setCreateIntent(null); await load(controller.current?.signal);
    } catch (failure) { if (!controller.current?.signal.aborted) setError(message(failure)); }
    finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  const handoff = async job => {
    if (running.current || job.status !== 'READY') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setError('Allow pop-ups for FreightLens before handing off the PDF. No print request was sent.'); return; }
    let intent = handoffIntents[job.job_key];
    try {
      intent = intent || { operation_key: makeKey(), expected_version: job.version };
      setHandoffIntents(current => ({ ...current, [job.job_key]: intent }));
    } catch (failure) { printWindow.close(); setError(message(failure)); return; }
    running.current = true; setBusy(true); setError('');
    try {
      const result = await api.handoffInvoicePrint(job.job_key, intent, controller.current?.signal);
      const url = window.URL.createObjectURL(result.data);
      printWindow.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      setHandoffIntents(current => { const next = { ...current }; delete next[job.job_key]; return next; });
      await load(controller.current?.signal);
    } catch (failure) {
      printWindow.close();
      if (!controller.current?.signal.aborted) {
        setError(`${message(failure)} The server may already show UNCERTAIN; reload before retrying.`);
        await load(controller.current?.signal);
      }
    } finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  const resolve = async event => {
    event.preventDefault();
    if (running.current || !resolution) return;
    let intent = resolution.intent;
    try {
      intent = intent || makeKey();
      setResolution(current => ({ ...current, intent }));
    } catch (failure) { setError(message(failure)); return; }
    const body = { operation_key: intent, expected_version: resolution.job.version,
      outcome: resolution.outcome, note: resolution.note.trim(),
      failure_code: resolution.outcome === 'FAILED' ? resolution.failure_code.trim().toUpperCase() : null };
    running.current = true; setBusy(true); setError('');
    try {
      await api.resolveInvoicePrint(resolution.job.job_key, body, controller.current?.signal);
      setResolution(null); await load(controller.current?.signal);
    } catch (failure) { if (!controller.current?.signal.aborted) setError(message(failure)); }
    finally { running.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };

  return <section aria-label="Invoice printing" className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 className="text-lg font-semibold">Invoice & printing · {invoice.invoice_number}</h2><p className="text-xs">Saved PDFs are immutable; physical printer results are confirmed separately.</p></div>
      <button type="button" className={secondaryButtonClass} onClick={onClose}>Back to invoice</button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
      {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><p>{error}</p><button type="button" className={`${secondaryButtonClass} mt-2`} disabled={busy} onClick={() => load(controller.current?.signal)}>Reload print state</button></div>}
      {loading && <p role="status">Loading immutable invoice and print history…</p>}
      {!loading && options && <section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{options.template_name}</h3><p className="text-xs">Template #{options.template_id}, published version #{options.template_version_id}</p></div>
          {!options.original_artifact
            ? <button type="button" className={primaryButtonClass} disabled={busy || openJobs.length > 0} onClick={() => createArtifact('ORIGINAL')}>{busy && createIntent?.kind === 'ORIGINAL' ? 'Creating…' : 'Create invoice original'}</button>
            : <button type="button" className={secondaryButtonClass} disabled={busy || openJobs.length > 0} onClick={() => createArtifact('COPY')}>{busy && createIntent?.kind === 'COPY' ? 'Creating…' : 'Create COPY reprint'}</button>}
        </div>
        <p className="mt-2 text-xs">A COPY reuses the original financial snapshot and is always marked by the server. Changed customer, collection or template data cannot rewrite it.</p>
      </section>}
      {!loading && history && !history.items.length && <p className="rounded-xl border border-dashed p-4 text-sm">No saved invoice PDF or print attempt exists yet.</p>}
      {!!history?.items.length && <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase dark:bg-slate-800"><tr><th className="p-3">Artifact</th><th className="p-3">Created</th><th className="p-3">Print state</th><th className="p-3">Actions</th></tr></thead><tbody>{history.items.map(job => <tr key={job.job_key} className="border-t border-slate-200 dark:border-slate-700"><td className="p-3"><strong>{job.artifact.artifact_kind}{job.artifact.copy_number ? ` ${job.artifact.copy_number}` : ''}</strong><div className="font-mono text-[11px]">{job.artifact.pdf_sha256.slice(0, 12)}… · {job.artifact.file_size} bytes</div></td><td className="p-3 whitespace-nowrap">{new Date(job.artifact.created_at).toLocaleString()}</td><td className="p-3"><Badge tone={job.status === 'PRINTED' ? 'emerald' : job.status === 'FAILED' ? 'rose' : 'amber'}>{job.status}</Badge><div className="mt-1 text-xs">Version {job.version}</div></td><td className="p-3"><div className="flex flex-wrap gap-2">{job.status === 'READY' && <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => handoff(job)}>Open print PDF</button>}{job.status === 'UNCERTAIN' && canResolve && <><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setResolution({ job, outcome: 'PRINTED', note: '', failure_code: '', intent: null })}>Confirm printed</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setResolution({ job, outcome: 'FAILED', note: '', failure_code: 'PRINT_FAILED', intent: null })}>Mark failed</button></>}</div>{job.status === 'UNCERTAIN' && <p className="mt-1 text-xs">Do not print again until this uncertain handoff is reconciled.</p>}</td></tr>)}</tbody></table></div>
        <footer className="flex items-center justify-between border-t border-slate-200 p-3 text-sm dark:border-slate-700"><span>Page {history.page} of {history.pages} · {history.total} records</span><div className="flex gap-2"><button type="button" className={secondaryButtonClass} disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button type="button" className={secondaryButtonClass} disabled={busy || page >= history.pages} onClick={() => setPage(value => value + 1)}>Next</button></div></footer>
      </section>}
      {resolution && <form onSubmit={resolve} className="rounded-xl border border-sky-300 p-3 dark:border-sky-800"><h3 className="font-semibold">Resolve {resolution.job.artifact.artifact_kind} print as {resolution.outcome}</h3><p className="mt-1 text-xs">Confirm only what a staff member actually observed. Closing a browser print dialog is not proof of printing.</p><label className="mt-3 block text-sm font-semibold">Resolution note<textarea required minLength="3" maxLength="1000" className="mt-1 block min-h-[88px] w-full rounded-lg border p-2 dark:bg-slate-800" value={resolution.note} onChange={event => setResolution(current => ({ ...current, note: event.target.value }))} /></label>{resolution.outcome === 'FAILED' && <label className="mt-3 block text-sm font-semibold">Failure code<input required pattern="[A-Z0-9_]+" maxLength="50" className="mt-1 block min-h-[44px] w-full rounded-lg border p-2 font-mono dark:bg-slate-800" value={resolution.failure_code} onChange={event => setResolution(current => ({ ...current, failure_code: event.target.value }))} /></label>}<div className="mt-3 flex gap-2"><button type="submit" className={primaryButtonClass} disabled={busy || resolution.note.trim().length < 3}>{busy ? 'Resolving…' : `Save ${resolution.outcome.toLowerCase()} outcome`}</button><button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setResolution(null)}>Cancel</button></div></form>}
    </div>
  </section>;
}
