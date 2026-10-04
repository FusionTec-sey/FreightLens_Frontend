import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { customersApi } from '../../../services/customersApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import CustomerCreateForm from './CustomerCreateForm';
import CustomerProfileHistory from './CustomerProfileHistory';
import CustomerDuplicateRequest from './CustomerDuplicateRequest';
import ManagerCases from '../Inventory/components/ManagerCases';

// Optional selection mode reuses this register; consumers must revalidate the
// returned company/key/version when saving their own authoritative document.
export default function CustomersPage({ onSelect }) {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, userId } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canView = isSuperAdmin || ['View_Customer', 'View_Personal_Data'].every(p => permissions.includes(p));
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!canView) return <p role="alert">Customer and personal-data access required.</p>;
  // Remount before rendering data after identity/company changes; no PII browser storage.
  return <CustomerRegister key={`${activeOrg}:${userId}:${token}`} token={token} orgId={activeOrg}
    userId={userId} canRequestDuplicate={!onSelect && (isSuperAdmin || permissions.includes('Request_CustomerDuplicate'))}
    canReviewDuplicate={!onSelect && (isSuperAdmin || permissions.includes('Review_CustomerDuplicate'))}
    canCreate={isSuperAdmin || permissions.includes('Manage_Customer')} onSelect={onSelect} />;
}

function CustomerRegister({ token, orgId, canCreate, onSelect, userId, canRequestDuplicate, canReviewDuplicate }) {
  const { isDark } = useTheme();
  const api = useMemo(() => customersApi(token, orgId), [token, orgId]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [historyKey, setHistoryKey] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState(null);
  const [duplicateReceipt, setDuplicateReceipt] = useState(null);
  const [saved, setSaved] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const selectionRequest = useRef(null);
  useEffect(() => () => selectionRequest.current?.abort(), []);
  async function selectCustomer(customer, inspect = false) {
    if (selectionRequest.current && !selectionRequest.current.signal.aborted) return;
    const controller = new AbortController();
    selectionRequest.current = controller;
    setSelecting(true); setSelectionError(''); setSelected(null);
    try {
      const { data } = await api.read(customer.customer_key, controller.signal);
      if (controller.signal.aborted) return;
      if (data.customer_key !== customer.customer_key || data.version !== customer.version) {
        throw new Error('Customer changed');
      }
      if (inspect) setSelected(data);
      else onSelect({ orgId, customerKey: data.customer_key, version: data.version, profile: data });
    } catch {
      if (!controller.signal.aborted) setSelectionError('Customer selection could not be verified. Refresh and try again.');
    } finally {
      if (!controller.signal.aborted) setSelecting(false);
      if (selectionRequest.current === controller) selectionRequest.current = null;
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    selectionRequest.current?.abort(); selectionRequest.current = null;
    setSelecting(false); setSelectionError('');
    setResult(null); setError(''); setSelected(null);
    api.list(page, limit, controller.signal, search).then(({ data }) => { if (live) setResult(data); })
      .catch(() => { if (live) setError('Customers could not be loaded. Check your access or refresh to retry.'); });
    return () => { live = false; controller.abort(); };
  }, [api, page, limit, refresh, search]);
  const theme = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  if ((creating || editing) && canCreate) return <CustomerCreateForm key={editing?.customer_key || 'create'} api={api} orgId={orgId} initial={editing} onClose={() => { setCreating(false); setEditing(null); setRefresh(n => n + 1); }}
    onSaved={receipt => { setSaved(receipt); setCreating(false); setEditing(null); setSearch(''); setSearchInput(''); setPage(1); setRefresh(n => n + 1); }} />;
  if (historyKey) return <CustomerProfileHistory key={historyKey} api={api} customerKey={historyKey} onClose={() => setHistoryKey(null)} />;
  if (duplicateMode === 'request' && canRequestDuplicate) return <CustomerDuplicateRequest api={api} orgId={orgId}
    renderPicker={select => <CustomersPage onSelect={select} />} onClose={() => setDuplicateMode(null)}
    onSaved={receipt => { setDuplicateReceipt(receipt); setDuplicateMode(null); }} />;
  if (duplicateMode === 'reviews' && (canRequestDuplicate || canReviewDuplicate)) return <ManagerCases api={api} userId={userId}
    customerDuplicate standalone canReview={canReviewDuplicate} onClose={() => setDuplicateMode(null)} />;
  return <section className={`flex flex-col h-full min-h-0 p-4 gap-3 ${theme}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3">
      <div><h1 className="text-xl font-bold">Customers</h1><p className="text-sm">Company customer profiles and contact history. Balances and credit are not enabled.</p></div>
      <button type="button" className="border rounded px-4 py-2 hover:bg-indigo-500/20" onClick={() => setRefresh(n => n + 1)}>Refresh</button>
      {canCreate && <button type="button" disabled={selecting} className="rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-40" onClick={() => setCreating(true)}>New customer</button>}
      {canRequestDuplicate && <button type="button" className="border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20" onClick={() => setDuplicateMode('request')}>Request duplicate review</button>}
      {(canRequestDuplicate || canReviewDuplicate) && <button type="button" className="border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20" onClick={() => setDuplicateMode('reviews')}>Duplicate reviews</button>}
    </header>
    {duplicateReceipt && <section className="shrink-0 border rounded p-3 space-y-2" role="status"><p>Duplicate assessment requested. No customer records or balances were merged.</p><p className="text-xs break-all">Case: {duplicateReceipt.case_key}</p><button type="button" className="border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20" onClick={() => setDuplicateReceipt(null)}>Dismiss review request result</button></section>}
    {saved && <section aria-label="Customer save result" className="shrink-0 border rounded p-3 flex flex-wrap gap-3 items-center">
      <p role="status">Customer saved. {saved.search_indexed ? 'Search indexing confirmed.' : 'Search indexing unconfirmed; the saved customer can still be opened directly.'}</p>
      <button type="button" disabled={selecting} className="border rounded px-3 py-2 disabled:opacity-40" onClick={() => selectCustomer(saved, true)}>Open saved customer</button>
      <button type="button" className="border rounded px-3 py-2" onClick={() => setSaved(null)}>Dismiss result</button>
    </section>}
    <form className="shrink-0 flex flex-wrap gap-2 items-center" onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); setRefresh(n => n + 1); }}>
      <label>Search customers<input className={`border rounded p-2 ml-2 ${theme}`} maxLength={160} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Name, phone or email" /></label>
      <button type="submit" className="border rounded px-3 py-2">Search</button>
      <button type="button" className="border rounded px-3 py-2" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>Clear search</button>
      {search && <p className="text-xs">Search may lag recent saves; narrow your query if results are limited.</p>}
    </form>
    {selectionError && <p role="alert">{selectionError}</p>}
    {selecting && <p role="status">Verifying customer selection…</p>}
    <div className="flex-1 min-h-0 overflow-auto border rounded-xl">
      {selected && <section aria-label="Customer details" className="border-b p-4 space-y-2">
        <h2 className="font-semibold">{selected.name}</h2><p className="break-all text-xs">Customer reference: {selected.customer_key} · Version {selected.version}</p>
        <ul>{selected.contacts.map((c, i) => <li key={i}>{c.kind}: {c.value} {c.label} {c.primary ? '(Primary)' : ''}</li>)}</ul>
        {canCreate && <button type="button" className="border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20" onClick={() => setEditing(selected)}>Edit profile</button>}
        <button type="button" className="border rounded px-3 py-2 cursor-pointer hover:bg-indigo-500/20" onClick={() => setHistoryKey(selected.customer_key)}>Profile history</button>
        <button type="button" className="border rounded px-3 py-2" onClick={() => setSelected(null)}>Close details</button>
      </section>}
      {error ? <p role="alert" className="p-4">{error}</p> : !result ? <p role="status" className="p-4">Loading customers…</p> : !result.items.length ? <p className="p-4">No customers in this company.</p> :
        <table className="w-full text-sm"><thead className={`sticky top-0 ${theme}`}><tr>{['Name', 'Type', 'Primary contact', 'Action'].map(label => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
          <tbody>{result.items.map(customer => <tr key={customer.customer_key} className="border-t">
            <td className="p-3">{customer.name}</td><td className="p-3">{customer.kind}</td><td className="p-3">{customer.contacts.find(c => c.primary)?.value}</td>
            <td className="p-3"><button type="button" disabled={selecting} className="border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40" onClick={() => selectCustomer(customer, true)} aria-label={`View ${customer.name}`}>View</button>
              {onSelect && <button type="button" disabled={selecting} className="border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40" onClick={() => selectCustomer(customer)} aria-label={`Select ${customer.name}`}>Select</button>}</td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} isDark={isDark}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} /></div>
  </section>;
}
