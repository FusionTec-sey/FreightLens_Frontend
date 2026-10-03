import React, { useEffect, useState } from 'react';
import PaginationToolbar from '../../../UI/UXComponent/PaginationToolbar';
import { locationError } from '../../../../services/inventoryLocationsApi';

// One bounded picker reused for existing suppliers and existing order documents.
export default function EvidenceChoice({ title, load, onSelect, onClose, panel, button, isDark }) {
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError('');
    load(page, limit, controller.signal).then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
      .catch(err => { if (!controller.signal.aborted) setError(locationError(err).message); });
    return () => controller.abort();
  }, [load, page, limit, reload]);
  return <section aria-label={title} className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="flex flex-wrap justify-between gap-2"><h2>{title}</h2><button className={button} onClick={onClose}>Back to evidence</button></header>
    {error && <div role="alert">{error}<button className={button} onClick={() => setReload(n => n + 1)}>Retry choices</button></div>}
    <div className="flex-1 min-h-0 overflow-auto">{!result ? !error && <p role="status">Loading choices…</p> : !result.items.length ? <p>No eligible records. Add documents or suppliers through their existing workspace.</p> :
      <ul>{result.items.map(row => <li key={row.id} className="border-b p-2 flex flex-wrap justify-between gap-2"><span className="break-all">{row.label}{row.doc_type && ` · ${row.doc_type}`}</span><button className={button} onClick={() => onSelect(row)}>Select {row.label}</button></li>)}</ul>}</div>
    <PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} isDark={isDark} />
  </section>;
}
