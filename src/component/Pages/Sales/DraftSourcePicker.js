import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import SalesProductImage from './SalesProductImage';

// Shared paginated chooser for existing branches/products. Never loads a whole catalogue.
export default function DraftSourcePicker({ title, load, onSelect, onClose, products = false, embedded = false, disabled = false }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(25);
  const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0); const [result, setResult] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setResult(null); setError('');
    load(page, limit, controller.signal, search).then(({ data }) => { if (live) setResult(data); })
      .catch(() => { if (live) setError('Choices could not be loaded. Retry or clear search to browse.'); });
    return () => { live = false; controller.abort(); };
  }, [load, page, limit, search, refresh]);
  const theme = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  return <section className={`h-full w-full min-h-0 min-w-0 flex flex-col gap-3 p-3 ${theme}`} aria-label={title}>
    <header className="shrink-0 flex flex-wrap gap-3 items-center"><h2 className="font-semibold">{title}</h2>
      {!embedded && <button type="button" className="border rounded p-2" onClick={onClose}>Back to draft</button>}
      <button type="button" className="border rounded p-2" onClick={() => setRefresh(n => n + 1)}>Retry</button></header>
    {products && <form className="shrink-0 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setPage(1); setRefresh(n => n + 1); }}>
      <label>Product name or SKU<input className={`border rounded p-2 ml-2 ${theme}`} value={query} maxLength={160} onChange={e => setQuery(e.target.value)} /></label>
      <button type="submit" className="border rounded p-2">Search</button>
      <button type="button" className="border rounded p-2" onClick={() => { setQuery(''); setSearch(''); setPage(1); }}>Clear search</button>
    </form>}
    <div className="flex-1 min-h-0 overflow-auto border rounded">
      {error ? <p role="alert" className="p-3">{error}</p> : !result ? <p role="status" className="p-3">Loading choices…</p> : !result.items.length ? <p className="p-3">No eligible records found.</p> :
        <ul className={embedded && products ? 'grid grid-cols-1 gap-2 p-2 xl:grid-cols-2' : ''}>{result.items.map(row => <li key={row.id} className={`p-3 flex flex-wrap items-center justify-between gap-3 ${embedded ? 'rounded-xl border' : 'border-b'}`}>
          {products && <SalesProductImage source={row} />}
          <div className="min-w-0 flex-1 break-words">{row.name} <span className="text-xs">{row.sku || row.code}</span>{products && !row.policy_version && <p className="text-xs">Reviewed inventory policy required before selection.</p>}</div>
          <button type="button" className="min-h-[44px] border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40" disabled={disabled || (products && !row.policy_version)} onClick={() => { if (!disabled) onSelect(row); }}>Select {row.name}</button>
        </li>)}</ul>}
    </div>
    <PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} onPageChange={setPage}
      onPageSizeChange={size => { setLimit(size); setPage(1); }} isDark={isDark} />
  </section>;
}
