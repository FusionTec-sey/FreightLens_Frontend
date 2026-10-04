import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipboardList, Plus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { countsApi } from '../../../services/countsApi';
import useOperationIntent from '../../../hooks/useOperationIntent';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import {
  Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass, hintClass,
  inputClass, messageClass, pageClass, panelClass, primaryButtonClass, rowActionClass,
  secondaryButtonClass, selectClass, tableClass, tdClass, thClass, trClass,
} from '../../UI/UXComponent/RegisterShell';
import CountScopeEditor from './CountScopeEditor';

const STATE_TONE = { DRAFT: 'slate', ACTIVE: 'emerald', CLOSED: 'amber' };

export default function CountPlansPage() {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canView = isSuperAdmin || permissions.includes('View_CountPlan');
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!hasModule?.('INVENTORY') && !isSuperAdmin) return <p role="alert">Inventory module access required.</p>;
  if (!canView) return <p role="alert">Count plan access required.</p>;
  return <PlanRegister key={`${activeOrg}:${token}`} token={token} orgId={activeOrg}
    canManage={isSuperAdmin || permissions.includes('Manage_CountPlan')} />;
}

function PlanRegister({ token, orgId, canManage }) {
  const { isDark } = useTheme();
  const api = useMemo(() => countsApi(token, orgId), [token, orgId]);
  const { payloadFor } = useOperationIntent();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const [creating, setCreating] = useState(false), [scoping, setScoping] = useState(null);
  const [coverage, setCoverage] = useState(null), [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.plans(page, limit, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Count plans could not be loaded. Refresh to retry.'); });
    return () => controller.abort();
  }, [api, page, limit, refresh]);

  const activate = useCallback(async row => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api.activatePlan(row.plan_key, payloadFor(['count.plan.activate', row.plan_key], { expected_state: 'DRAFT' }));
      toast.success('Plan activated. Counting rounds can now be assigned.');
      setRefresh(n => n + 1);
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The plan could not be activated. Refresh and try again.');
    } finally { setBusy(false); }
  }, [api, busy, payloadFor]);

  const showCoverage = useCallback(async row => {
    setCoverage({ plan: row, rows: null }); setError('');
    try {
      const { data } = await api.coverage(row.plan_key);
      setCoverage({ plan: row, rows: data });
    } catch { setError('Coverage could not be loaded.'); setCoverage(null); }
  }, [api]);

  if (scoping) return <CountScopeEditor api={api} plan={scoping}
    onClose={() => setScoping(null)}
    onSaved={() => { setScoping(null); setRefresh(n => n + 1); }} />;
  if (creating) return <PlanForm api={api} onClose={() => setCreating(false)}
    onSaved={() => { setCreating(false); setRefresh(n => n + 1); }} />;

  return <section className={pageClass}>
    <RegisterHeader icon={ClipboardList} title="Count plans" count={result?.total}
      description="Annual cycle-count programmes. A count record never adjusts, freezes or values stock."
      actions={<>
        <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
        {canManage && <button type="button" className={primaryButtonClass} onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" />New plan</button>}
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    {coverage && <section className={`${panelClass} space-y-2`} aria-label="Plan coverage">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Coverage · {coverage.plan.code}</h2>
        <button type="button" className={secondaryButtonClass} onClick={() => setCoverage(null)}>Close coverage</button>
      </div>
      {!coverage.rows ? <LoadingState label="Loading coverage…" /> : !coverage.rows.length
        ? <p className={hintClass}>No scope lines in this plan yet.</p>
        : <table className={tableClass}><thead><tr>{['Location', 'In scope', 'Counted', 'Outstanding', 'Next due'].map(label => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
          <tbody>{coverage.rows.map(row => <tr key={row.location_id} className={trClass}>
            <td className={tdClass}>{row.location_name || `Location ${row.location_id}`}</td>
            <td className={`${tdClass} tabular-nums`}>{row.scope_lines}</td>
            <td className={`${tdClass} tabular-nums`}>{row.counted_lines}</td>
            <td className={`${tdClass} tabular-nums`}>{row.outstanding_lines}</td>
            <td className={tdClass}>{row.next_due_on || '—'}</td>
          </tr>)}</tbody></table>}
    </section>}
    <div className={cardClass}>
      {!result && !error ? <LoadingState label="Loading count plans…" />
        : result && !result.items.length ? <EmptyState icon={ClipboardList} title="No count plans in this company."
            hint="Create a plan, add the products and locations it covers, then activate it to assign counters." />
        : result && <table className={tableClass}>
          <thead><tr>{['Plan', 'Branch', 'Year', 'Scope', 'State', ''].map((label, index) => <th key={label || index} className={thClass}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr key={row.plan_key} className={trClass}>
            <td className={tdClass}><span className="block text-sm font-semibold">{row.name}</span><span className="text-xs text-slate-500 dark:text-slate-400">{row.code}</span></td>
            <td className={tdClass}>{row.branch_name || `Branch ${row.branch_id}`}</td>
            <td className={`${tdClass} tabular-nums`}>{row.year}</td>
            <td className={`${tdClass} tabular-nums`}>{row.scope_lines}</td>
            <td className={tdClass}><Badge tone={STATE_TONE[row.state] || 'slate'}>{row.state}</Badge></td>
            <td className={`${tdClass} text-right`}><div className="flex flex-wrap justify-end gap-1">
              <button type="button" className={rowActionClass} onClick={() => showCoverage(row)}>Coverage</button>
              {canManage && row.state === 'DRAFT' && <button type="button" className={rowActionClass} onClick={() => setScoping(row)}>Edit scope</button>}
              {canManage && row.state === 'DRAFT' && <button type="button" disabled={busy || !row.scope_lines} className={rowActionClass} onClick={() => activate(row)}>Activate</button>}
            </div></td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1}
      totalCount={result?.total || 0} onPageChange={setPage}
      onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}

function PlanForm({ api, onClose, onSaved }) {
  const { payloadFor } = useOperationIntent();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ branch_id: '', code: '', name: '', year: String(new Date().getFullYear()) });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.branches(1, 100, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setBranches(data.items || []); })
      .catch(() => { if (!controller.signal.aborted) setError('Branches could not be loaded.'); });
    return () => controller.abort();
  }, [api]);

  async function save() {
    if (busy) return;
    if (!form.branch_id || !form.code.trim() || !form.name.trim()) {
      setError('Choose a branch and enter a code and name.'); return;
    }
    setBusy(true); setError('');
    try {
      await api.createPlan(payloadFor(['count.plan.create', form.code], {
        branch_id: Number(form.branch_id), code: form.code.trim().toUpperCase(),
        name: form.name.trim(), year: Number(form.year),
      }));
      toast.success('Count plan created as a draft.');
      onSaved();
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The plan could not be saved. Your entries are retained.');
    } finally { setBusy(false); }
  }

  return <section className={pageClass} aria-label="New count plan form">
    <RegisterHeader icon={ClipboardList} title="New count plan"
      description="A draft plan counts nothing until its scope is added and it is activated."
      actions={<>
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Create plan'}</button>
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    <div className={`${panelClass} grid gap-3 md:grid-cols-2`}>
      <label><span className={fieldLabelClass}>Branch</span>
        <select className={`block w-full ${selectClass}`} value={form.branch_id} onChange={event => setForm({ ...form, branch_id: event.target.value })}>
          <option value="">Select a branch</option>
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select></label>
      <label><span className={fieldLabelClass}>Plan code</span>
        <input className={`block w-full ${inputClass}`} maxLength={32} value={form.code}
          onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="ANNUAL-2026" /></label>
      <label><span className={fieldLabelClass}>Plan name</span>
        <input className={`block w-full ${inputClass}`} maxLength={160} value={form.name}
          onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label><span className={fieldLabelClass}>Year</span>
        <input className={`block w-full ${inputClass}`} inputMode="numeric" maxLength={4} value={form.year}
          onChange={event => setForm({ ...form, year: event.target.value })} /></label>
      <p className={`${hintClass} md:col-span-2`}>Codes are uppercase and unique per branch. The plan can be edited while it is a draft.</p>
    </div>
  </section>;
}
