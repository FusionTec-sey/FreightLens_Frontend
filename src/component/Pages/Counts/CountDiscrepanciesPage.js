import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Scale } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { countsApi } from '../../../services/countsApi';
import useOperationIntent from '../../../hooks/useOperationIntent';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import {
  Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass,
  hintClass, messageClass, pageClass, panelClass, primaryButtonClass, rowActionClass,
  secondaryButtonClass, selectClass, tableClass, tdClass, textareaClass, thClass, trClass,
} from '../../UI/UXComponent/RegisterShell';

const OUTCOMES = [
  ['ACCEPTED', 'Accept the counted figure'],
  ['RECOUNT_REQUIRED', 'Require a recount'],
  ['REJECTED', 'Reject the count'],
];

export default function CountDiscrepanciesPage() {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canView = isSuperAdmin || permissions.includes('View_CountDiscrepancy');
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!hasModule?.('INVENTORY') && !isSuperAdmin) return <p role="alert">Inventory module access required.</p>;
  if (!canView) return <p role="alert">Count discrepancy access required.</p>;
  return <DiscrepancyRegister key={`${activeOrg}:${token}`} token={token} orgId={activeOrg}
    canReview={isSuperAdmin || permissions.includes('Review_CountDiscrepancy')} />;
}

function DiscrepancyRegister({ token, orgId, canReview }) {
  const { isDark } = useTheme();
  const api = useMemo(() => countsApi(token, orgId), [token, orgId]);
  const { payloadFor } = useOperationIntent();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const [selected, setSelected] = useState(null), [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState('ACCEPTED'), [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.discrepancies(page, limit, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Discrepancies could not be loaded. Refresh to retry.'); });
    return () => controller.abort();
  }, [api, page, limit, refresh]);

  function reset() {
    setSelected(null); setReason(''); setOutcome('ACCEPTED'); setError('');
  }

  async function requestReview() {
    if (busy || !reason.trim()) { setError('Give a reason for the review request.'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.requestReview(selected.id, payloadFor(['count.discrepancy.request', selected.id], {
        expected_counted_base: selected.counted_base, reason: reason.trim(),
      }));
      toast.success('Review requested. Another authorised reviewer must decide it.');
      setSelected({ ...selected, case_key: data.case_key, state: 'PROVISIONAL' });
      setReason('');
      setRefresh(n => n + 1);
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The review could not be requested.');
    } finally { setBusy(false); }
  }

  async function decide() {
    if (busy || !reason.trim() || !selected?.case_key) {
      setError('A requested review and a decision reason are required.'); return;
    }
    setBusy(true); setError('');
    try {
      await api.decide(selected.id, payloadFor(['count.discrepancy.decide', selected.id], {
        case_key: selected.case_key, expected_version: 1, outcome, reason: reason.trim(),
      }));
      toast.success('Decision recorded. No stock was adjusted.');
      reset(); setRefresh(n => n + 1);
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The decision could not be recorded.');
    } finally { setBusy(false); }
  }

  return <section className={pageClass}>
    <RegisterHeader icon={Scale} title="Count discrepancies" count={result?.total}
      description="Provisional differences captured at submission. Deciding one records a judgement; it adjusts no stock."
      actions={<button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}

    {selected && <section className={`${panelClass} space-y-3`} aria-label="Count discrepancy review">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{selected.product_name || `Product ${selected.product_id}`} · round {selected.round}</h2>
        <Badge tone={selected.state === 'REVIEWED' ? 'emerald' : 'amber'}>{selected.state}</Badge>
      </div>
      <dl className="grid gap-3 sm:grid-cols-4">
        {[['Counted', `${selected.counted_base} ${selected.base_unit}`],
          ['Expected at submission', `${selected.expected_base} ${selected.base_unit}`],
          ['Difference', `${selected.difference_base} ${selected.base_unit}`],
          ['Location', selected.location_name || `Location ${selected.location_id}`]].map(([label, value]) => (
          <div key={label}><dt className={fieldLabelClass}>{label}</dt><dd className="text-xs font-semibold">{value}</dd></div>
        ))}
      </dl>
      <p className={hintClass}>The expected figure is a snapshot from submission time. Stock may have moved since, which is why this difference is provisional and not a reconciliation.</p>
      {selected.state === 'REVIEWED'
        ? <p className={messageClass('success')}>Already decided: {selected.outcome}. Counted history and this decision are immutable.</p>
        : <>
          <label className="block"><span className={fieldLabelClass}>{selected.case_key ? 'Decision reason' : 'Reason for review'}</span>
            <textarea className={textareaClass} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
          {selected.case_key && canReview && <label className="block"><span className={fieldLabelClass}>Outcome</span>
            <select className={selectClass} value={outcome} onChange={event => setOutcome(event.target.value)}>
              {OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>}
          <div className="flex flex-wrap gap-2">
            {!selected.case_key && <button type="button" className={primaryButtonClass} disabled={busy} onClick={requestReview}>Request review</button>}
            {selected.case_key && canReview && <button type="button" className={primaryButtonClass} disabled={busy} onClick={decide}>Record decision</button>}
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={reset}>Close</button>
          </div>
          {selected.case_key && !canReview && <p className={messageClass('muted')}>A review has been requested. A different authorised reviewer must decide it.</p>}
          {selected.case_key && canReview && <p className={hintClass}>A requester cannot decide their own case; the server refuses it.</p>}
        </>}
    </section>}

    <div className={cardClass}>
      {!result && !error ? <LoadingState label="Loading discrepancies…" />
        : result && !result.items.length ? <EmptyState icon={Scale} title="No count discrepancies recorded."
            hint="Differences appear here once a counter submits a round." />
        : result && <table className={tableClass}>
          <thead><tr>{['Product', 'Location', 'Counted', 'Expected', 'Difference', 'State', ''].map((label, index) => <th key={label || index} className={[2, 3, 4].includes(index) ? `${thClass} text-right` : thClass}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr key={row.id} className={trClass}>
            <td className={tdClass}><span className="block text-sm font-semibold">{row.product_name || `Product ${row.product_id}`}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{row.sku} · round {row.round}</span></td>
            <td className={tdClass}>{row.location_name || `Location ${row.location_id}`}</td>
            <td className={`${tdClass} text-right tabular-nums`}>{row.counted_base}</td>
            <td className={`${tdClass} text-right tabular-nums`}>{row.expected_base}</td>
            <td className={`${tdClass} text-right tabular-nums font-semibold`}>
              {Number(row.difference_base) === 0 ? <span>0</span>
                : <Badge tone={Number(row.difference_base) < 0 ? 'rose' : 'amber'}>{row.difference_base} {row.base_unit}</Badge>}</td>
            <td className={tdClass}><Badge tone={row.state === 'REVIEWED' ? 'emerald' : 'slate'}>{row.state}</Badge>{row.outcome && <span className="ml-1 text-xs">{row.outcome}</span>}</td>
            <td className={`${tdClass} text-right`}><button type="button" className={rowActionClass}
              onClick={() => { setSelected(row); setReason(''); setError(''); }}>Open</button></td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1}
      totalCount={result?.total || 0} onPageChange={setPage}
      onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}
