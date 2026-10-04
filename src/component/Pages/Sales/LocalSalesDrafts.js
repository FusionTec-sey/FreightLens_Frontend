import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { listRecovery, readRecovery, recoveryScope } from '../../../services/salesDraftRecovery';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import { HardDriveDownload } from 'lucide-react';
import { Badge, EmptyState, RegisterHeader, cardClass, fieldLabelClass, pageClass, rowActionClass, secondaryButtonClass, selectClass, tableClass, tdClass, thClass, toolbarClass, trClass } from '../../UI/UXComponent/RegisterShell';

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
  return <section className={pageClass}>
    <RegisterHeader icon={HardDriveDownload} title="Local drafts" count={filtered.length}
      description="Only this company and signed-in user on this browser. Clearing browser storage removes recovery. Nothing is submitted automatically." />
    <div className={toolbarClass}><button className={secondaryButtonClass} onClick={onClose}>Back to sales drafts</button><button className={secondaryButtonClass} onClick={() => { setRefresh(n => n + 1); setPage(1); }}>Refresh local drafts</button>
      <label className="flex items-center gap-2"><span className={fieldLabelClass}>Selling store</span><select className={selectClass} value={branch} onChange={e => { setBranch(e.target.value); setPage(1); }}><option value="">All locally saved stores</option>{[...new Set(rows.map(row => row.snapshot.draft.branch_id || 'unassigned'))].map(id => <option key={id} value={id}>{id === 'unassigned' ? 'Not selected yet' : `Store ${id}`}</option>)}</select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className={cardClass}><table className={tableClass}><thead><tr>{['Reference', 'Store', 'Saved locally', 'State', 'Action'].map(label => <th className={thClass} key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice((page-1)*limit, page*limit).map(row => <tr key={row.key} className={trClass}>
      <td className={`${tdClass} break-all font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300`} title={row.key}>{row.key}</td><td className={tdClass}>{row.snapshot.draft.branch_id ? `Store ${row.snapshot.draft.branch_id}` : 'Not selected'}</td><td className={tdClass}>{new Date(row.updated_at).toLocaleString()}</td><td className={tdClass}>{row.snapshot.pending ? <Badge tone="amber">Save unconfirmed — exact retry required</Badge> : row.snapshot.conflict ? <Badge tone="rose">Conflict — review required</Badge> : <Badge tone="slate">Unsaved edits</Badge>}</td><td className={tdClass}><button className={rowActionClass} onClick={() => recover(row)}>Recover draft</button></td>
    </tr>)}</tbody></table>{!error && !filtered.length && <EmptyState icon={HardDriveDownload} title="No local drafts for this selection." hint="Unsaved counter work is kept on this browser only, for this company and user." />}</div>
    <footer className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={Math.max(1, Math.ceil(filtered.length/limit))} totalCount={filtered.length} onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></footer>
  </section>;
}
