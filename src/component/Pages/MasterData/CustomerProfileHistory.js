import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';

export default function CustomerProfileHistory({ api, customerKey, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.history(customerKey, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch(() => { if (!controller.signal.aborted) setError('Profile history could not be loaded. Check access and retry.'); });
    return () => controller.abort();
  }, [api, customerKey, page, limit, refresh]);
  const theme = isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900';
  const button = 'border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20';
  return <section className={`flex flex-col h-full min-h-0 p-4 gap-3 ${theme}`} aria-label="Customer profile history">
    <header className="shrink-0 flex flex-wrap justify-between gap-3">
      <div><h1 className="text-xl font-bold">Customer profile history</h1><p className="text-sm">Contact and identity revisions only. No balance merging or financial changes.</p></div>
      <button type="button" className={button} onClick={() => setRefresh(n => n + 1)}>Refresh history</button>
      <button type="button" className={button} onClick={onClose}>Back to customers</button>
    </header>
    <div className="flex-1 min-h-0 overflow-auto space-y-3">
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">Loading history…</p> : !result.items.length ? <p>No profile revisions on this page.</p> : result.items.map(item => <article key={item.version} className="border rounded p-3 space-y-2">
        <h2 className="font-semibold">Version {item.version} — {item.name}</h2>
        <p className="text-sm">{item.kind} · {new Date(item.created_at).toLocaleString()} · Staff reference {item.created_by}</p>
        <p className="whitespace-pre-wrap break-words">{item.reason}</p>
        <ul className="break-words">{item.contacts.map((contact, index) => <li key={index}>{contact.kind}: {contact.value} {contact.label} {contact.primary ? '(Primary)' : ''}</li>)}</ul>
      </article>)}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} isDark={isDark}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} /></div>
  </section>;
}
