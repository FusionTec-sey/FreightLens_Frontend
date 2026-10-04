import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { listRecovery, readRecovery, recoveryScope } from '../../../services/salesDraftRecovery';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';

export default function LocalSalesDrafts({ orgId, userId, onRecover, onClose }) {
  const { isDark } = useTheme();
  const [rows, setRows] = useState([]), [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0), [branch, setBranch] = useState(''), [page, setPage] = useState(1), [limit, setLimit] = useState(25);
  useEffect(() => {
    try { setRows(listRecovery(recoveryScope(orgId, userId))); setError(''); }
    catch (failure) { setRows([]); setError(failure.message || 'Local recovery could not be read.'); }
  }, [orgId, userId, refresh]);
  function recover(row) {
    try {
      const current = readRecovery(recoveryScope(orgId, userId), row.key);
      if (!current || current.revision !== row.revision) throw new Error('This recovery changed in another tab. Refresh before opening.');
      onRecover(current);
    } catch (failure) { setError(failure.message || 'Recovery could not be opened.'); }
  }
  const filtered = rows.filter(row => !branch || String(row.snapshot.draft.branch_id || 'unassigned') === branch);
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  return <section className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0"><h1 className="text-xl font-bold">Local drafts</h1><p>Only this company and signed-in user on this browser. Clearing browser storage removes recovery. Nothing is submitted automatically.</p></header>
    <div className="shrink-0 flex gap-3"><button className="border rounded p-2" onClick={onClose}>Back to sales drafts</button><button className="border rounded p-2" onClick={() => { setRefresh(n => n + 1); setPage(1); }}>Refresh local drafts</button>
      <label>Selling store <select className={`border rounded p-2 ${panel}`} value={branch} onChange={e => { setBranch(e.target.value); setPage(1); }}><option value="">All locally saved stores</option>{[...new Set(rows.map(row => row.snapshot.draft.branch_id || 'unassigned'))].map(id => <option key={id} value={id}>{id === 'unassigned' ? 'Not selected yet' : `Store ${id}`}</option>)}</select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="flex-1 min-h-0 overflow-auto"><table className="w-full text-sm"><thead className={`sticky top-0 ${panel}`}><tr>{['Reference', 'Store', 'Saved locally', 'State', 'Action'].map(label => <th className="p-2 text-left" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice((page-1)*limit, page*limit).map(row => <tr key={row.key} className="border-t">
      <td className="p-2 break-all">{row.key}{row.snapshot.source_reference && <span className="block text-xs text-slate-500 dark:text-slate-400">Local copy of {row.snapshot.source_reference.document_key} v{row.snapshot.source_reference.version}</span>}</td><td className="p-2">{row.snapshot.draft.branch_id || 'Not selected'}</td><td className="p-2">{new Date(row.updated_at).toLocaleString()}</td><td className="p-2">{row.snapshot.pending ? 'Save unconfirmed — exact retry required' : row.snapshot.conflict ? 'Conflict — review required' : 'Unsaved edits'}</td><td className="p-2"><button type="button" className="border rounded p-2" onClick={() => recover(row)}>Recover draft</button></td>
    </tr>)}</tbody></table>{!error && !filtered.length && <p>No local drafts for this selection.</p>}</div>
    <footer className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={Math.max(1, Math.ceil(filtered.length/limit))} totalCount={filtered.length} onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></footer>
  </section>;
}
