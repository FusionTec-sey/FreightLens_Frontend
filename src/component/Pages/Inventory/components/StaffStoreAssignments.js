import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import PaginationToolbar from '../../../UI/UXComponent/PaginationToolbar';
import DraftSourcePicker from '../../Sales/DraftSourcePicker';
import useOperationIntent from '../../../../hooks/useOperationIntent';
import { locationError } from '../../../../services/inventoryLocationsApi';

export default function StaffStoreAssignments({ api, branch, canManage, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [form, setForm] = useState(null), [choosing, setChoosing] = useState(false), [discard, setDiscard] = useState(false);
  const [pending, setPending] = useState(null), [saving, setSaving] = useState(false), [conflict, setConflict] = useState(false);
  const { payloadFor, clear } = useOperationIntent();
  const lifetime = useRef(null), busy = useRef(false);
  useEffect(() => { const request = new AbortController(); lifetime.current = request; return () => request.abort(); }, [api, branch.id]);
  useEffect(() => {
    const request = new AbortController(); setData(null); setError('');
    api.staffAssignments(branch.id, page, limit, request.signal).then(({ data: value }) => {
      if (!request.signal.aborted) setData(value);
    }).catch(issue => { if (!request.signal.aborted) setError(locationError(issue).message); });
    return () => request.abort();
  }, [api, branch.id, page, limit, refresh]);
  const loadCounters = useMemo(() => (p, size, signal) => api.counters(branch.id, p, size, signal)
    .then(({ data: value }) => ({ data: { ...value, items: value.items.map(row => ({ ...row, name: row.config.name })) } })), [api, branch.id]);
  const edit = row => {
    if (!canManage) return;
    clear(); setPending(null); setConflict(false); setError(''); setSuccess('');
    setForm({ user_id: row.user_id, username: row.username, version: row.version, previousStore: row.branch_name,
      config: { branch_id: branch.id, counter_id: row.config?.branch_id === branch.id ? row.config.counter_id : null, is_enabled: row.config?.branch_id === branch.id ? row.config.is_enabled : false } });
  };
  const save = async event => {
    event.preventDefault(); if (busy.current || !canManage || conflict) return;
    busy.current = true; setSaving(true); setError('');
    const request = lifetime.current;
    try {
      const body = pending || payloadFor(['staff-store', branch.id, form.user_id], { expected_version: form.version, config: form.config });
      setPending(body);
      const response = await api.saveStaffAssignment(branch.id, form.user_id, body, request.signal);
      if (request.signal.aborted) return;
      if (response.data.user_id !== form.user_id || response.data.version !== body.expected_version + 1 ||
          response.data.config.branch_id !== branch.id) throw new Error('Unconfirmed assignment response');
      setSuccess(`Assignment saved for ${form.username}. Operational permissions and release gates still apply.`);
      setPending(null); setForm(null); clear(); setRefresh(value => value + 1);
    } catch (issue) {
      if (!request.signal.aborted) {
        setError(locationError(issue).message);
        if (issue.response?.status === 409) { setConflict(true); setPending(null); }
        else if ([400, 403, 404, 422].includes(issue.response?.status)) setPending(null);
      }
    } finally { busy.current = false; if (!request.signal.aborted) setSaving(false); }
  };
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const button = 'px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 disabled:opacity-40';
  if (choosing) return <DraftSourcePicker title="Choose usual counter (optional)" load={loadCounters} onClose={() => setChoosing(false)}
    onSelect={row => { setChoosing(false); if (row.branch_id !== branch.id) { setError('Choose a counter in this store.'); return; }
      setForm({ ...form, counterName: row.name, config: { ...form.config, counter_id: row.id } }); }} />;
  return <section aria-label="Staff working stores" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">{branch.name} — staff working stores</h1>
      <p className="text-sm">One current working store per staff member in this company. The usual counter is optional; staff can sell all eligible products in their assigned store.</p></div>
      {!form && <button type="button" className={button} onClick={onClose}>Back to locations</button>}</header>
    {success && <div role="status">{success} <button type="button" className={button} onClick={() => setSuccess('')}>Dismiss</button></div>}
    {error && <p role="alert">{error}</p>}
    {form ? <form onSubmit={save} className="flex-1 min-h-0 flex flex-col gap-3">
      <fieldset disabled={saving || !!pending || conflict} className="flex-1 min-h-0 overflow-auto space-y-3">
        <p>Staff: {form.username}. Current store: {form.previousStore || 'Unassigned'}. Saving assigns the current configuration to {branch.name}.</p>
        <p>Usual counter: {form.counterName || (form.config.counter_id ? `Counter #${form.config.counter_id}` : 'None — store-wide picking without a counter preference')}.</p>
        <button type="button" className={button} onClick={() => setChoosing(true)}>Choose usual counter</button>
        {form.config.counter_id && <button type="button" className={button} onClick={() => setForm({ ...form, counterName: '', config: { ...form.config, counter_id: null } })}>Clear usual counter</button>}
        <label className="block"><input type="checkbox" checked={form.config.is_enabled} onChange={event => setForm({ ...form, config: { ...form.config, is_enabled: event.target.checked } })} /> Enable working-store assignment</label>
        <p>This does not enable checkout, grant roles or move existing stock/reservations. A different store requires a new authorised assignment.</p>
      </fieldset>
      {pending && !saving && <p role="status">Save outcome unconfirmed. Retry the identical request before editing or leaving.</p>}
      {conflict && <p>Assignment changed. Close this edit and refresh before reviewing again.</p>}
      <footer className="shrink-0 flex gap-2"><button type="submit" className={button} disabled={saving || conflict}>{saving ? 'Saving…' : pending ? 'Retry identical save' : 'Save assignment'}</button>
        <button type="button" className={button} disabled={saving || !!pending} onClick={() => setDiscard(true)}>Cancel edit</button></footer>
      {discard && <div role="dialog" aria-label="Discard assignment edit" className={`shrink-0 border rounded-lg p-3 ${panel}`}><p>Discard this assignment edit?</p>
        <button type="button" className={button} onClick={() => { setForm(null); setDiscard(false); setError(''); setRefresh(value => value + 1); }}>Discard edit</button>
        <button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button></div>}
    </form> : <><div className="shrink-0"><button type="button" className={button} onClick={() => setRefresh(value => value + 1)}>Refresh assignments</button></div>
      <div className="flex-1 min-h-0 overflow-auto border rounded-lg">{!data ? <p>{error ? 'Assignments unavailable.' : 'Loading assignments…'}</p> : !data.items.length ? <p>No eligible staff in this company.</p> :
        <table className="w-full text-left text-sm"><thead className={`sticky top-0 ${panel}`}><tr>{['Staff', 'Current store', 'Status', 'Revision', 'Actions'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
          <tbody>{data.items.map(row => <tr key={row.user_id} className="border-t"><td className="p-3">{row.username}</td><td className="p-3">{row.branch_name || 'Unassigned'}</td><td className="p-3">{row.config?.is_enabled ? 'Enabled' : 'Disabled / unassigned'}</td><td className="p-3">{row.version}</td><td className="p-3">{canManage && <button type="button" className={button} onClick={() => edit(row)}>Edit assignment<span className="sr-only"> {row.username}</span></button>}</td></tr>)}</tbody></table>}</div>
      <PaginationToolbar page={page} pageSize={limit} totalPages={data?.pages || 1} totalCount={data?.total || 0} onPageChange={setPage}
        onPageSizeChange={value => { setPage(1); setLimit(value); }} isDark={isDark} /></>}
  </section>;
}
