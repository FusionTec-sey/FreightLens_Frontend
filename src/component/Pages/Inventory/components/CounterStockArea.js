import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import PaginationToolbar from '../../../UI/UXComponent/PaginationToolbar';
import { locationError } from '../../../../services/inventoryLocationsApi';

export default function CounterStockArea({ api, branch, counter, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [view, setView] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const request = new AbortController(); setView(null); setError('');
    api.counterStockArea(branch.id, counter.counter_key, counter.version, page, limit, request.signal)
      .then(({ data }) => { if (!request.signal.aborted) setView({ api, branchId: branch.id, key: counter.counter_key, version: counter.version, page, limit, data }); })
      .catch(issue => { if (!request.signal.aborted) setError(locationError(issue).message); });
    return () => request.abort();
  }, [api, branch.id, counter.counter_key, counter.version, page, limit, reload]);
  const data = view?.api === api && view.branchId === branch.id && view.key === counter.counter_key && view.version === counter.version && view.page === page && view.limit === limit ? view.data : null;
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const button = 'px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20';
  return <section aria-label="Preferred picking area" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">{counter.config.name} — preferred picking area</h1>
      <p className="text-sm">Optional preference and active descendants only. This is not stock availability, a staff assignment or a reservation. Salespeople may sell any eligible product in their authorised store.</p></div>
      <div className="flex gap-2"><button type="button" className={button} onClick={onClose}>Back to counters</button>
        <button type="button" className={button} onClick={() => { setView(null); setError(''); setReload(value => value + 1); }}>Refresh area</button></div></header>
    {error && <p role="alert">{error} Return to counters and refresh them if configuration changed.</p>}
    {data && <p className="shrink-0">{data.root ? `Root: ${data.root.name} (${data.root.code}).` : 'No preferred picking area — eligible store-wide stock may be used.'} Counter revision {data.counter_version}.{!data.counter_enabled && ' Counter disabled.'} Prefer this area, then compatible stock elsewhere in the same store. Other stores or separate warehouses require explicit selection and applicable approval.</p>}
    <div className="flex-1 min-h-0 overflow-auto border rounded-lg">
      {error ? <p className="p-4">Stock area unavailable.</p> : !data ? <p role="status" className="p-4">Loading stock area…</p> : !data.items.length ? <p className="p-4">No locations on this page.</p> :
        <table className="w-full text-left text-sm"><thead className={`sticky top-0 ${panel}`}><tr>{['Code', 'Name', 'Type'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
          <tbody>{data.items.map(row => <tr className="border-t" key={row.id}><td className="p-3">{row.code}</td><td className="p-3">{row.name}</td><td className="p-3">{row.kind}</td></tr>)}</tbody></table>}
    </div><footer className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={data?.pages || 1} totalCount={data?.total || 0}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></footer>
  </section>;
}
