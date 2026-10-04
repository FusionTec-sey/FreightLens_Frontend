import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ClipboardCheck, Plus } from 'lucide-react';
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
import BlindCountSheet from './BlindCountSheet';

const STATE_TONE = {
  ASSIGNED: 'slate', IN_PROGRESS: 'indigo', SUBMITTED: 'amber',
  REVIEWED: 'emerald', CANCELLED: 'rose',
};

export default function CountSessionsPage({ mine = false }) {
  const { token, selectedOrgId, orgId, user, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canEnter = isSuperAdmin || permissions.includes('Enter_CountResult');
  const canAssign = isSuperAdmin || permissions.includes('Assign_CountSession');
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!hasModule?.('INVENTORY') && !isSuperAdmin) return <p role="alert">Inventory module access required.</p>;
  if (!canEnter && !canAssign) return <p role="alert">Count session access required.</p>;
  return <SessionBoard key={`${activeOrg}:${token}:${mine}`} token={token} orgId={activeOrg}
    mine={mine} canAssign={canAssign} canEnter={canEnter} userId={user?.id} />;
}

function SessionBoard({ token, orgId, mine, canAssign, canEnter, userId }) {
  const { isDark } = useTheme();
  const api = useMemo(() => countsApi(token, orgId), [token, orgId]);
  const { payloadFor } = useOperationIntent();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false), [counting, setCounting] = useState(null);
  const [recount, setRecount] = useState(null), [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.sessions(page, limit, controller.signal, mine)
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Count rounds could not be loaded. Refresh to retry.'); });
    return () => controller.abort();
  }, [api, page, limit, refresh, mine]);

  const openRecount = useCallback(async row => {
    if (busy || !recount?.assignee_id || !recount?.reason.trim()) {
      setError('Choose a counter and give a reason for the recount.'); return;
    }
    setBusy(true); setError('');
    try {
      await api.recount(row.session_key, payloadFor(['count.recount', row.session_key], {
        assignee_id: Number(recount.assignee_id), reason: recount.reason.trim(),
      }));
      toast.success('Recount round opened. Earlier rounds are unchanged.');
      setRecount(null); setRefresh(n => n + 1);
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The recount could not be opened.');
    } finally { setBusy(false); }
  }, [api, busy, payloadFor, recount]);

  if (counting) return <BlindCountSheet api={api} session={counting}
    onClose={() => setCounting(null)}
    onSubmitted={() => { setCounting(null); setRefresh(n => n + 1); }} />;
  if (assigning) return <AssignForm api={api} onClose={() => setAssigning(false)}
    onSaved={() => { setAssigning(false); setRefresh(n => n + 1); }} />;

  return <section className={pageClass}>
    <RegisterHeader icon={ClipboardCheck} title={mine ? 'My count rounds' : 'Count rounds'} count={result?.total}
      description="A round is counted blind: the sheet never shows expected stock, earlier rounds or values."
      actions={<>
        <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
        {canAssign && !mine && <button type="button" className={primaryButtonClass} onClick={() => setAssigning(true)}><Plus size={15} aria-hidden="true" />Assign round</button>}
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    {recount && <section className={`${panelClass} space-y-3`} aria-label="Open a recount round">
      <h2 className="text-sm font-bold">Recount · {recount.row.location_name || `Location ${recount.row.location_id}`}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={fieldLabelClass}>Counter user id</span>
          <input className={`block w-full ${inputClass}`} inputMode="numeric" value={recount.assignee_id}
            onChange={event => setRecount({ ...recount, assignee_id: event.target.value })} /></label>
        <label><span className={fieldLabelClass}>Reason</span>
          <input className={`block w-full ${inputClass}`} maxLength={1000} value={recount.reason}
            onChange={event => setRecount({ ...recount, reason: event.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => openRecount(recount.row)}>Open recount round</button>
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setRecount(null)}>Cancel</button>
      </div>
      <p className={hintClass}>A recount is a new immutable round. Nothing already counted is edited or deleted.</p>
    </section>}
    <div className={cardClass}>
      {!result && !error ? <LoadingState label="Loading count rounds…" />
        : result && !result.items.length ? <EmptyState icon={ClipboardCheck}
            title={mine ? 'No count rounds assigned to you.' : 'No count rounds yet.'}
            hint="Activate a plan, then assign a location to a counter to open the first round." />
        : result && <table className={tableClass}>
          <thead><tr>{['Location', 'Plan', 'Counter', 'Round', 'Progress', 'State', ''].map((label, index) => <th key={label || index} className={index === 4 ? `${thClass} text-right` : thClass}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr key={row.session_key} className={trClass}>
            <td className={tdClass}><span className="block text-sm font-semibold">{row.location_name || `Location ${row.location_id}`}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Branch {row.branch_id}</span></td>
            <td className={tdClass}>{row.plan_code || '—'}</td>
            <td className={tdClass}>{row.assignee_name || `User ${row.assignee_id}`}</td>
            <td className={`${tdClass} tabular-nums`}>{row.round}</td>
            <td className={`${tdClass} text-right tabular-nums`}>{row.entered_lines}/{row.expected_lines}</td>
            <td className={tdClass}><Badge tone={STATE_TONE[row.state] || 'slate'}>{row.state.replace('_', ' ')}</Badge></td>
            <td className={`${tdClass} text-right`}><div className="flex flex-wrap justify-end gap-1">
              {canEnter && row.assignee_id === userId && ['ASSIGNED', 'IN_PROGRESS'].includes(row.state) &&
                <button type="button" className={rowActionClass} onClick={() => setCounting(row)}>Count</button>}
              {canAssign && ['SUBMITTED', 'REVIEWED'].includes(row.state) &&
                <button type="button" className={rowActionClass} onClick={() => setRecount({ row, assignee_id: String(row.assignee_id), reason: '' })}>Recount</button>}
            </div></td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1}
      totalCount={result?.total || 0} onPageChange={setPage}
      onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}

function AssignForm({ api, onClose, onSaved }) {
  const { payloadFor } = useOperationIntent();
  const [plans, setPlans] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ plan_key: '', location_id: '', assignee_id: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.plans(1, 100, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setPlans((data.items || []).filter(plan => plan.state === 'ACTIVE')); })
      .catch(() => { if (!controller.signal.aborted) setError('Active plans could not be loaded.'); });
    return () => controller.abort();
  }, [api]);

  useEffect(() => {
    const plan = plans.find(item => item.plan_key === form.plan_key);
    if (!plan) { setLocations([]); return undefined; }
    const controller = new AbortController();
    api.locations(plan.branch_id, 1, 100, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setLocations(data.items || []); })
      .catch(() => { if (!controller.signal.aborted) setLocations([]); });
    return () => controller.abort();
  }, [api, form.plan_key, plans]);

  async function save() {
    if (busy) return;
    if (!form.plan_key || !form.location_id || !form.assignee_id) {
      setError('Choose an active plan, a location in its scope and a counter.'); return;
    }
    setBusy(true); setError('');
    try {
      await api.assignSession(payloadFor(['count.session.assign', form.plan_key, form.location_id], {
        plan_key: form.plan_key, location_id: Number(form.location_id), assignee_id: Number(form.assignee_id),
      }));
      toast.success('Count round assigned.');
      onSaved();
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The round could not be assigned.');
    } finally { setBusy(false); }
  }

  return <section className={pageClass} aria-label="Assign count round form">
    <RegisterHeader icon={ClipboardCheck} title="Assign a count round"
      description="One open round per location. The counter sees only what to count, never what is expected."
      actions={<>
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={save}>{busy ? 'Assigning…' : 'Assign round'}</button>
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    <div className={`${panelClass} grid gap-3 md:grid-cols-3`}>
      <label><span className={fieldLabelClass}>Active plan</span>
        <select className={`block w-full ${selectClass}`} value={form.plan_key}
          onChange={event => setForm({ ...form, plan_key: event.target.value, location_id: '' })}>
          <option value="">Select a plan</option>
          {plans.map(plan => <option key={plan.plan_key} value={plan.plan_key}>{plan.code} · {plan.name}</option>)}
        </select></label>
      <label><span className={fieldLabelClass}>Location</span>
        <select className={`block w-full ${selectClass}`} value={form.location_id}
          onChange={event => setForm({ ...form, location_id: event.target.value })}>
          <option value="">Select a location</option>
          {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select></label>
      <label><span className={fieldLabelClass}>Counter user id</span>
        <input className={`block w-full ${inputClass}`} inputMode="numeric" value={form.assignee_id}
          onChange={event => setForm({ ...form, assignee_id: event.target.value })} /></label>
      <p className={`${hintClass} md:col-span-3`}>The location must already be in the plan's scope, and the counter must belong to this company.</p>
    </div>
  </section>;
}
