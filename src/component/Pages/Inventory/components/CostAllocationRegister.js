import React, { useEffect, useMemo, useState } from 'react';
import PaginationToolbar from '../../../UI/UXComponent/PaginationToolbar';
import { locationError } from '../../../../services/inventoryLocationsApi';
import PolicyReviewRequest from './PolicyReviewRequest';
import ManagerCases from './ManagerCases';
import CostChargeEvidence from './CostChargeEvidence';

export default function CostAllocationRegister({ api, pool, panel, button, isDark, onClose, userId, canManage = false, canViewEvidence = false }) {
  const [evidence, setEvidence] = useState(false);
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null), [result, setResult] = useState(null), [error, setError] = useState('');
  const [cases, setCases] = useState(false), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const reviewApi = useMemo(() => ({
    requestReclassificationReview: (key, body, signal) => api.requestCostAllocationReview(pool.id, key, body, signal),
    managerCases: (page, limit, signal, view) => api.costAllocationCases(pool.id, selected, page, limit, signal, view),
    reviewPolicyCase: (key, body, signal) => api.reviewCostAllocation(pool.id, selected, key, body, signal),
  }), [api, pool.id, selected]);
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError('');
    const request = selected ? api.costAllocation(pool.id, selected, controller.signal) : api.costAllocations(pool.id, page, limit, controller.signal);
    request.then(({ data }) => { if (!controller.signal.aborted) setResult({ api, poolId: pool.id, selected, page, limit, reload, data }); })
      .catch(err => { if (!controller.signal.aborted) setError(locationError(err).message); });
    return () => controller.abort();
  }, [api, pool.id, page, limit, selected, reload]);
  const data = result?.api === api && result.poolId === pool.id && result.selected === selected && result.page === page && result.limit === limit && result.reload === reload ? result.data : null;
  if (cases && selected) return <ManagerCases key={selected} api={reviewApi} userId={userId} costAllocation canReview={canManage} onClose={() => setCases(false)} />;
  if (evidence && selected && data && canViewEvidence) return <CostChargeEvidence key={selected} api={api} pool={pool} proposal={data} userId={userId} canManage={canManage} panel={panel} button={button} isDark={isDark} onClose={() => setEvidence(false)} />;
  return <section aria-label="Saved cost proposals" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">Saved cost proposals</h1><p>{pool.code} · Historical declarations, not posted charges. Review decisions are shown separately.</p></div>
      <div className="flex gap-2"><button type="button" disabled={busy} className={button} onClick={selected ? () => { if (dirty) setDiscard(true); else setSelected(null); } : onClose}>{selected ? 'Back to proposals' : 'Back to valuations'}</button><button type="button" disabled={busy || dirty} className={button} onClick={() => setReload(n => n + 1)}>Refresh cost proposals</button></div></header>
    {discard && <div role="alert">Discard the unsaved review request?<button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className={button} onClick={() => { setDiscard(false); setDirty(false); setSelected(null); }}>Discard review request</button></div>}
    <div className="flex-1 min-h-0 overflow-auto border rounded-lg">{error ? <p role="alert" className="p-3">{error}</p> : !data ? <p role="status" className="p-3">Loading cost proposals…</p> : selected ? <article className="p-3 space-y-3"><h2>{data.charge_reference}</h2><p>{data.reason}</p><p>Declared SCR {data.total_scr} · {data.basis} · {data.status}</p>
      <table className="w-full text-sm text-left"><thead><tr><th>Product / stock</th><th>Original basis</th><th>Allocated SCR</th></tr></thead><tbody>{data.snapshot.lines.map(line => <tr key={line.valuation_id} className="border-t"><td className="p-3">{line.product_name} · #{line.balance_id}</td><td className="p-3 font-mono">{line.basis_value}</td><td className="p-3 font-mono">{line.allocated_scr}</td></tr>)}</tbody></table>
      {canManage && <PolicyReviewRequest key={selected} api={reviewApi} proposalKey={selected} version={1} costAllocation disabled={discard} panel={panel} button={button} onBusyChange={setBusy} onDirtyChange={setDirty} />}
      <button type="button" className={button} disabled={busy || dirty || discard} onClick={() => setCases(true)}>View allocation reviews</button>
      {canViewEvidence && <button type="button" className={button} disabled={busy || dirty || discard} onClick={() => setEvidence(true)}>Invoice and FX evidence</button>}
      </article> : !data.items.length ? <p className="p-3">No saved cost proposals in this pool.</p> :
      <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr>{['Reference', 'Total SCR', 'Basis', 'Status', 'Action'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map(row => <tr key={row.proposal_key} className="border-t"><td className="p-3">{row.charge_reference}</td><td className="p-3 font-mono">{row.total_scr}</td><td className="p-3">{row.basis}</td><td className="p-3">{row.status}</td><td className="p-3"><button type="button" className={button} onClick={() => setSelected(row.proposal_key)}>View cost proposal</button></td></tr>)}</tbody></table>}</div>
    {!selected && <footer className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={data?.pages || 1} totalCount={data?.total || 0} onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} isDark={isDark} /></footer>}
  </section>;
}
