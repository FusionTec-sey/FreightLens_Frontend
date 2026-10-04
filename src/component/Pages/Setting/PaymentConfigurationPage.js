import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { paymentConfigurationApi, paymentConfigurationError } from '../../../services/paymentConfigurationApi';
import {
  EmptyState, LoadingState, RegisterHeader, cardClass, inputClass,
  messageClass, pageClass, primaryButtonClass, secondaryButtonClass,
  selectClass, tableClass, tdClass, thClass, trClass,
} from '../../UI/UXComponent/RegisterShell';

const key = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
const initialMethod = () => ({ code: '', label: '', kind: 'CASH', is_enabled: true, reason: '' });
const initialMapping = () => ({ branch_id: '', method_key: '', account_ref: '', label: '', is_enabled: true, reason: '' });

export default function PaymentConfigurationPage() {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canView = isSuperAdmin || (hasModule?.('SALES') && permissions.includes('View_Financials'));
  const canManage = isSuperAdmin || permissions.includes('Manage_Financials');
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!canView) return <p role="alert">Financial configuration access is required.</p>;
  return <PaymentWorkspace key={`${activeOrg}:${token}`} token={token} orgId={activeOrg} canManage={canManage} />;
}

function PaymentWorkspace({ token, orgId, canManage }) {
  const api = useMemo(() => paymentConfigurationApi(token, orgId), [token, orgId]);
  const [tab, setTab] = useState('methods');
  const [page, setPage] = useState(1);
  const [branchPage, setBranchPage] = useState(1);
  const [methodPage, setMethodPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState(null);
  const [methods, setMethods] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [checking, setChecking] = useState(false);
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setData(null); setError('');
    (tab === 'methods' ? api.methods(page, controller.signal)
      : api.mappings(page, filterBranch, controller.signal))
      .then(value => { if (live) setData(value); })
      .catch(failure => { if (live && failure?.code !== 'ERR_CANCELED') setError(paymentConfigurationError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [api, tab, page, filterBranch, refresh]);

  useEffect(() => {
    const controller = new AbortController(); let live = true;
    api.branches(branchPage, controller.signal).then(value => { if (live) setBranches(value); })
      .catch(failure => { if (live && failure?.code !== 'ERR_CANCELED') setError(paymentConfigurationError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [api, branchPage, refresh]);

  useEffect(() => {
    const controller = new AbortController(); let live = true;
    api.methods(methodPage, controller.signal).then(value => { if (live) setMethods(value); })
      .catch(failure => { if (live && failure?.code !== 'ERR_CANCELED') setError(paymentConfigurationError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [api, methodPage, refresh]);

  const open = row => {
    setForm(tab === 'methods' ? (row ? { ...row, reason: '' } : initialMethod())
      : (row ? { ...row, reason: '' } : initialMapping()));
    setPending(null); setSaveError(''); setSaved(null); setLookup(null);
  };
  const change = (field, value) => { setForm(current => ({ ...current, [field]: value })); setPending(null); setSaveError(''); };
  const valid = form && form.reason.trim() && form.label.trim() && (tab === 'methods'
    ? /^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(form.code)
    : form.branch_id && form.method_key && /^[A-Z0-9][A-Z0-9_.:-]{0,63}$/.test(form.account_ref));
  const save = async () => {
    if (saving) return;
    if (!valid) { setSaveError('Complete the required fields and reason.'); return; }
    const intent = pending || { identity: form.method_key && tab === 'mappings' ? (form.mapping_key || key())
      : (form.method_key || key()), operation_key: key() };
    setPending(intent); setSaveError(''); setSaving(true);
    const body = tab === 'methods' ? {
      operation_key: intent.operation_key, expected_version: form.version || 0, code: form.code,
      config: { label: form.label, kind: form.kind, is_enabled: form.is_enabled }, reason: form.reason,
    } : {
      operation_key: intent.operation_key, expected_version: form.version || 0,
      branch_id: Number(form.branch_id), method_key: form.method_key,
      config: { account_ref: form.account_ref, label: form.label, is_enabled: form.is_enabled },
      reason: form.reason,
    };
    try {
      const result = tab === 'methods' ? await api.saveMethod(intent.identity, body)
        : await api.saveMapping(intent.identity, body);
      setSaved(result); setForm(null); setPending(null); setRefresh(n => n + 1);
    } catch (failure) { setSaveError(paymentConfigurationError(failure)); }
    finally { setSaving(false); }
  };
  const inspect = async () => {
    if (!form?.branch_id || !form?.method_key) return;
    setChecking(true); setLookup(null);
    try { setLookup(await api.lookup(form.branch_id, form.method_key)); }
    catch (failure) { setLookup({ status: 'ERROR', reason: paymentConfigurationError(failure) }); }
    finally { setChecking(false); }
  };
  const switchTab = next => { setTab(next); setPage(1); setForm(null); setPending(null); setSaved(null); };
  return <section className={pageClass}>
    <RegisterHeader title="Payment configuration" description="Versioned methods and exact selling-branch receiving accounts. Configuration does not accept or post money."
      actions={<><button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
        {canManage && <button type="button" className={primaryButtonClass} onClick={() => open(null)}>New {tab === 'methods' ? 'method' : 'mapping'}</button>}</>} />
    <div className="shrink-0 flex gap-2">
      {['methods', 'mappings'].map(value => <button type="button" key={value} onClick={() => switchTab(value)}
        aria-current={tab === value ? 'page' : undefined} className={tab === value ? primaryButtonClass : secondaryButtonClass}>{value === 'methods' ? 'Methods' : 'Branch accounts'}</button>)}
    </div>
    {saved && <p role="status" className={messageClass('success')}>Version {saved.version} saved{saved.replayed ? ' from the original operation' : ''}. No financial transaction was created.</p>}
    {error && <div className={messageClass('error')}><p role="alert">{error}</p><button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Retry</button></div>}
    {tab === 'mappings' && <div className="shrink-0 flex items-center gap-2">
      <label htmlFor="branch-filter">Selling branch</label><select id="branch-filter" className={selectClass} value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setPage(1); }}>
        <option value="">All branches</option>{(branches?.items || []).map(b => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
      </select><button type="button" disabled={branchPage <= 1} onClick={() => setBranchPage(n => n - 1)}>Previous branches</button>
      <button type="button" disabled={!branches || branchPage >= branches.pages} onClick={() => setBranchPage(n => n + 1)}>More branches</button>
    </div>}
    <div className={`${cardClass} flex-1 min-h-0 overflow-auto`}>
      {!data && !error ? <LoadingState label="Loading payment configuration…" /> : null}
      {data?.items?.length === 0 ? <EmptyState title="No configuration yet" hint="Create a method, then map an account for each selling branch that accepts it." /> : null}
      {data?.items?.length > 0 && <table className={tableClass}><thead><tr>
        {(tab === 'methods' ? ['Code', 'Label', 'Kind', 'Version', 'State', ''] : ['Branch', 'Method', 'Account reference', 'Label', 'Version', 'State', '']).map((h, i) => <th key={i} className={thClass}>{h}</th>)}
      </tr></thead><tbody>{data.items.map(row => <tr key={row.method_key || row.mapping_key} className={trClass}>
        {tab === 'methods' ? <><td className={tdClass}>{row.code}</td><td className={tdClass}>{row.label}</td><td className={tdClass}>{row.kind}</td></>
          : <><td className={tdClass}>{branches?.items?.find(b => b.id === row.branch_id)?.code || row.branch_id}</td><td className={tdClass}>{methods?.items?.find(m => m.method_key === row.method_key)?.code || row.method_key}</td><td className={tdClass}>{row.account_ref}</td><td className={tdClass}>{row.label}</td></>}
        <td className={tdClass}>{row.version}</td><td className={tdClass}>{row.is_enabled ? 'Enabled' : 'Disabled'}</td>
        <td className={tdClass}>{canManage && <button type="button" className={secondaryButtonClass} onClick={() => open(row)}>Edit</button>}</td>
      </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0 flex items-center justify-between text-sm"><span>Page {page} of {data?.pages || 1} · {data?.total || 0} records</span>
      <span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Previous</button>
      <button type="button" disabled={!data || page >= data.pages} onClick={() => setPage(n => n + 1)}>Next</button></span></div>
    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label={tab === 'methods' ? 'Payment method' : 'Receiving account mapping'}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
        <div className="shrink-0 border-b p-4 dark:border-slate-700"><h2 className="text-xl font-bold">{form.version ? 'Revise' : 'New'} {tab === 'methods' ? 'payment method' : 'branch receiving account'}</h2></div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {tab === 'methods' ? <>
            <label>Code<input className={inputClass} value={form.code} disabled={!!form.version} onChange={e => change('code', e.target.value.toUpperCase())} maxLength={32} /></label>
            <label>Method type<select className={selectClass} value={form.kind} disabled={!!form.version} onChange={e => change('kind', e.target.value)}><option value="CASH">Cash</option><option value="CARD">Externally confirmed card</option></select></label>
          </> : <>
            <label>Account selling branch<select className={selectClass} value={form.branch_id} disabled={!!form.version} onChange={e => change('branch_id', e.target.value)}><option value="">Select branch</option>{form.branch_id && !(branches?.items || []).some(b => String(b.id) === String(form.branch_id)) && <option value={form.branch_id}>Branch {form.branch_id}</option>}{(branches?.items || []).map(b => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}</select></label>
            <label>Payment method<select className={selectClass} value={form.method_key} disabled={!!form.version} onChange={e => change('method_key', e.target.value)}><option value="">Select method</option>{form.method_key && !(methods?.items || []).some(m => m.method_key === form.method_key) && <option value={form.method_key}>{form.method_key}</option>}{(methods?.items || []).map(m => <option key={m.method_key} value={m.method_key}>{m.code} · {m.label}</option>)}</select>
              <span className="flex gap-2"><button type="button" disabled={methodPage <= 1} onClick={() => setMethodPage(n => n - 1)}>Previous methods</button><button type="button" disabled={!methods || methodPage >= methods.pages} onClick={() => setMethodPage(n => n + 1)}>More methods</button></span></label>
            <label>Opaque accounting reference<input className={inputClass} value={form.account_ref} onChange={e => change('account_ref', e.target.value.toUpperCase())} maxLength={64} placeholder="BANK-CLEARING.SCR" /></label>
          </>}
          <label>Display label<input className={inputClass} value={form.label} onChange={e => change('label', e.target.value)} maxLength={120} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_enabled} onChange={e => change('is_enabled', e.target.checked)} />Enabled</label>
          <label className="md:col-span-2">Reason<input className={inputClass} value={form.reason} onChange={e => change('reason', e.target.value)} maxLength={500} /></label>
          {tab === 'mappings' && <div className="md:col-span-2"><button type="button" className={secondaryButtonClass} disabled={checking || !form.branch_id || !form.method_key} onClick={inspect}>Check exact mapping</button>
            {lookup && <p role="status">{lookup.status === 'READY' ? `Ready: ${lookup.account_ref} (v${lookup.mapping_version})` : `Blocked: ${lookup.reason}`}</p>}</div>}
          {saveError && <p role="alert" className="md:col-span-2 text-red-600 dark:text-red-300">{saveError}</p>}
        </div>
        <div className="shrink-0 flex justify-end gap-2 border-t p-4 dark:border-slate-700"><button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => setForm(null)}>Close</button><button type="button" className={primaryButtonClass} disabled={!valid || saving} onClick={save}>{saving ? 'Saving…' : 'Save configuration'}</button></div>
      </div>
    </div>}
  </section>;
}
