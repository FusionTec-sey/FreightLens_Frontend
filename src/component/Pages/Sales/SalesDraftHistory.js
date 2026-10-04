import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import { secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import SalesDraftRevision from './SalesDraftRevision';

export default function SalesDraftHistory({ api, documentKey }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.history(documentKey, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Draft history could not be loaded. Check access and retry.');
    });
    return () => controller.abort();
  }, [api, documentKey, page, limit, refresh]);
  if (selectedVersion !== null) return <SalesDraftRevision key={`${documentKey}:${selectedVersion}`} api={api}
    documentKey={documentKey} version={selectedVersion} onClose={() => setSelectedVersion(null)} />;
  return <section aria-label="Sales draft revision history" className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
      <p className="text-xs">Saved draft revisions only. This is not payment, reservation or handover history.</p>
      <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh history</button>
    </div>
    <div className="min-h-0 flex-1 overflow-auto px-4">
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">Loading draft history…</p> : !result.items.length ? <p>No revisions on this page.</p> :
        <ol className="divide-y divide-slate-200 dark:divide-slate-700">{result.items.map(row => <li key={row.version} className="space-y-1 py-3 text-sm">
          <h3 className="font-semibold">Version {row.version} · Draft saved</h3>
          <p><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time> · Staff reference {row.created_by}</p>
          <p>{row.customer_name || 'Customer name unavailable'} · Customer profile v{row.customer_version}</p>
          <p className="break-all font-mono text-xs">{row.customer_key}</p>
          <p>Branch {row.branch_id}</p>
          <button type="button" className={secondaryButtonClass} onClick={() => setSelectedVersion(row.version)}>Inspect version {row.version}</button>
        </li>)}</ol>}
    </div>
    <div className="shrink-0 px-3 pb-3"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} isDark={isDark}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} /></div>
  </section>;
}
