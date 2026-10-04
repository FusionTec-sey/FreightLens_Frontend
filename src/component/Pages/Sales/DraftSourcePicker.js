import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import { PackageSearch } from 'lucide-react';
import { Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass, inputClass, pageClass, rowActionClass, secondaryButtonClass, toolbarClass } from '../../UI/UXComponent/RegisterShell';

// Shared paginated chooser for existing branches/products. Never loads a whole catalogue.
export default function DraftSourcePicker({ title, load, onSelect, onClose, products = false }) {
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
  return <section className={pageClass} aria-label={title}>
    <RegisterHeader icon={PackageSearch} title={title} count={result?.total}
      actions={<>
        <button type="button" className={secondaryButtonClass} onClick={onClose}>Back to draft</button>
        <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Retry</button>
      </>} />
    {products && <form className={toolbarClass} onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setPage(1); setRefresh(n => n + 1); }}>
      <label className="flex items-center gap-2"><span className={fieldLabelClass}>Product name or SKU</span><input className={inputClass} value={query} maxLength={160} onChange={e => setQuery(e.target.value)} /></label>
      <button type="submit" className={secondaryButtonClass}>Search</button>
      <button type="button" className={secondaryButtonClass} onClick={() => { setQuery(''); setSearch(''); setPage(1); }}>Clear search</button>
    </form>}
    <div className={cardClass}>
      {error ? <p role="alert" className="p-3">{error}</p> : !result ? <LoadingState label="Loading choices…" /> : !result.items.length ? <EmptyState icon={PackageSearch} title="No eligible records found." hint="Clear the search to browse, or choose a record with a reviewed inventory policy." /> :
        <ul>{result.items.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-slate-800/70">
          <div><span className="text-sm font-semibold">{row.name}</span> <span className="text-xs text-slate-500">{row.sku || row.code}</span>{products && !row.policy_version && <p className="mt-1"><Badge tone="amber">Reviewed inventory policy required before selection.</Badge></p>}</div>
          <button type="button" className={rowActionClass} disabled={products && !row.policy_version} onClick={() => onSelect(row)}>Select {row.name}</button>
        </li>)}</ul>}
    </div>
    <PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} onPageChange={setPage}
      onPageSizeChange={size => { setLimit(size); setPage(1); }} isDark={isDark} />
  </section>;
}
