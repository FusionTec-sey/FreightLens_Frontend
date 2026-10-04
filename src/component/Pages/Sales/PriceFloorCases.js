import React, { useEffect, useState } from 'react';
import { BadgeDollarSign } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import {
  Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass,
  messageClass, pageClass, primaryButtonClass, secondaryButtonClass, selectClass,
  tableClass, tdClass, textareaClass, thClass, trClass,
} from '../../UI/UXComponent/RegisterShell';

const operationKey = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

export default function PriceFloorCases({ api, userId, canReview, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(25);
  const [view, setView] = useState(canReview ? 'NEEDS_MY_REVIEW' : 'MY_REQUESTS');
  const [refresh, setRefresh] = useState(0); const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState(null); const [saved, setSaved] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setResult(null); setError('');
    api.floorCases(page, limit, controller.signal, view).then(({ data }) => { if (live) setResult(data); })
      .catch(failure => { if (live) setError(failure.response?.data?.detail || 'Price-floor reviews could not be loaded.'); });
    return () => { live = false; controller.abort(); };
  }, [api, page, limit, view, refresh]);
  const beginReview = row => setDecision({ row, operation_key: operationKey(), outcome: 'APPROVED', reason: '' });
  const saveDecision = async event => {
    event.preventDefault(); setDecision(current => ({ ...current, saving: true, error: '' }));
    try {
      const { data } = await api.reviewFloorCase(decision.row.case_key, {
        operation_key: decision.operation_key, expected_version: 1,
        outcome: decision.outcome, reason: decision.reason,
      });
      setSaved(data); setDecision(null); setRefresh(value => value + 1);
    } catch (failure) {
      setDecision(current => ({ ...current, saving: false,
        error: failure.response?.data?.detail || 'The decision could not be confirmed. Keep this form open and retry.' }));
    }
  };
  if (decision) return <section className={`${pageClass} overflow-auto`}><RegisterHeader icon={BadgeDollarSign} title="Review price-floor exception"
    description={`Draft v${decision.row.draft_version} · SCR ${decision.row.gross_total_scr} · ${decision.row.floor_line_count} below-floor line${decision.row.floor_line_count === 1 ? '' : 's'}`}
    actions={<button type="button" className={secondaryButtonClass} disabled={decision.saving} onClick={() => setDecision(null)}>Back to cases</button>} />
    {decision.error && <div className={messageClass('error')}><p role="alert">{decision.error}</p></div>}
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Draft</dt><dd className="break-all font-mono">{decision.row.document_key}</dd></div>
        <div><dt className="text-xs text-slate-500">Exact pricing fingerprint</dt><dd className="break-all font-mono text-xs">{decision.row.pricing_fingerprint}</dd></div>
        <div><dt className="text-xs text-slate-500">Request reason</dt><dd>{decision.row.reason}</dd></div>
        <div><dt className="text-xs text-slate-500">Requestor</dt><dd>Staff reference {decision.row.requestor_id}</dd></div></dl>
      <form onSubmit={saveDecision} className="mt-4 space-y-3">
        <label className={fieldLabelClass}>Decision<select className={`${selectClass} mt-1 block w-full`} value={decision.outcome} onChange={e => setDecision(current => ({ ...current, outcome: e.target.value }))}><option value="APPROVED">Approve exact pricing</option><option value="REJECTED">Reject</option></select></label>
        <label className={fieldLabelClass}>Decision reason<textarea required maxLength="1000" className={`${textareaClass} mt-1`} value={decision.reason} onChange={e => setDecision(current => ({ ...current, reason: e.target.value }))} /></label>
        <p className="text-xs text-slate-500 dark:text-slate-400">Approval applies only to this draft and pricing fingerprint. It does not post an invoice, payment or stock movement.</p>
        <button type="submit" className={primaryButtonClass} disabled={decision.saving}>{decision.saving ? 'Saving decision…' : 'Save decision'}</button>
      </form>
    </section></section>;
  return <section className={pageClass}><RegisterHeader icon={BadgeDollarSign} title="Price-floor reviews" count={result?.total}
    description="Manager decisions for customer-beneficial prices below the configured store floor."
    actions={<><button type="button" className={secondaryButtonClass} onClick={() => setRefresh(value => value + 1)}>Refresh</button>{onClose && <button type="button" className={secondaryButtonClass} onClick={onClose}>Back to drafts</button>}</>} />
    <div className="shrink-0 flex flex-wrap gap-2"><label className={fieldLabelClass}>Cases<select className={`${selectClass} ml-2`} value={view} onChange={e => { setView(e.target.value); setPage(1); }}>{canReview && <option value="NEEDS_MY_REVIEW">Needs my review</option>}<option value="MY_REQUESTS">My requests</option>{canReview && <option value="ALL">All cases</option>}</select></label></div>
    {saved && <div className={messageClass('success')}><p role="status">Case {saved.status.toLowerCase()}. No sale or payment was posted.</p><button type="button" className={secondaryButtonClass} onClick={() => setSaved(null)}>Dismiss result</button></div>}
    {error && <div className={messageClass('error')}><p role="alert">{error}</p></div>}
    <div className={cardClass}>{!result && !error ? <LoadingState label="Loading price-floor cases…" /> : result && !result.items.length ? <EmptyState icon={BadgeDollarSign} title="No price-floor cases in this view" /> : result && <table className={tableClass}><thead><tr>{['Draft', 'Pricing', 'Status', 'Requested', 'Action'].map(label => <th key={label} className={thClass}>{label}</th>)}</tr></thead><tbody>{result.items.map(row => <tr key={row.case_key} className={trClass}><td className={tdClass}><b>Draft v{row.draft_version}</b><span className="block max-w-[20ch] truncate font-mono text-xs">{row.document_key}</span></td><td className={tdClass}>SCR {row.gross_total_scr}<span className="block text-xs">{row.floor_line_count} below floor</span></td><td className={tdClass}><Badge tone={row.status === 'APPROVED' ? 'emerald' : row.status === 'REJECTED' ? 'rose' : 'amber'}>{row.status}</Badge></td><td className={tdClass}>{new Date(row.requested_at).toLocaleString()}<span className="block text-xs">Staff {row.requestor_id}</span></td><td className={tdClass}>{canReview && row.status === 'REQUESTED' && row.requestor_id !== userId ? <button type="button" className={secondaryButtonClass} onClick={() => beginReview(row)}>Review</button> : <span className="text-xs text-slate-500">No action</span>}</td></tr>)}</tbody></table>}</div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} isDark={isDark} onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} /></div>
  </section>;
}
