import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { customersApi } from '../../../services/customersApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import CustomerCreateForm from './CustomerCreateForm';
import { Users } from 'lucide-react';
import { Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass, hintClass, inputClass, messageClass, pageClass, panelClass, primaryButtonClass, rowActionClass, secondaryButtonClass, tableClass, tdClass, thClass, toolbarClass, trClass } from '../../UI/UXComponent/RegisterShell';

// Optional selection mode reuses this register; consumers must revalidate the
// returned company/key/version when saving their own authoritative document.
export default function CustomersPage({ onSelect }) {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, user } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canView = isSuperAdmin || ['View_Customer', 'View_Personal_Data'].every(p => permissions.includes(p));
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!canView) return <p role="alert">Customer and personal-data access required.</p>;
  // Remount before rendering data after identity/company changes; no PII browser storage.
  return <CustomerRegister key={`${activeOrg}:${user?.id}:${token}`} token={token} orgId={activeOrg}
    canCreate={isSuperAdmin || permissions.includes('Manage_Customer')} onSelect={onSelect} />;
}

function CustomerRegister({ token, orgId, canCreate, onSelect }) {
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
  if (creating && canCreate) return <CustomerCreateForm api={api} orgId={orgId} onClose={() => setCreating(false)}
    onSaved={receipt => { setSaved(receipt); setCreating(false); setSearch(''); setSearchInput(''); setPage(1); setRefresh(n => n + 1); }} />;
  return <section className={pageClass}>
    <RegisterHeader icon={Users} title="Customers" count={result?.total}
      description="Company customer identities. Balances, credit and profile editing are not enabled."
      actions={<>
        <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
        {canCreate && <button type="button" disabled={selecting} className={primaryButtonClass} onClick={() => setCreating(true)}>New customer</button>}
      </>} />
    {saved && <section aria-label="Customer save result" className={messageClass('success')}>
      <p role="status">Customer saved. {saved.search_indexed ? 'Search indexing confirmed.' : 'Search indexing unconfirmed; the saved customer can still be opened directly.'}</p>
      <button type="button" disabled={selecting} className={secondaryButtonClass} onClick={() => selectCustomer(saved, true)}>Open saved customer</button>
      <button type="button" className={secondaryButtonClass} onClick={() => setSaved(null)}>Dismiss result</button>
    </section>}
    <form className={toolbarClass} onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); setRefresh(n => n + 1); }}>
      <label className="flex items-center gap-2"><span className={fieldLabelClass}>Search customers</span><input className={inputClass} maxLength={160} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Name, phone or email" /></label>
      <button type="submit" className={secondaryButtonClass}>Search</button>
      <button type="button" className={secondaryButtonClass} onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>Clear search</button>
      {search && <p className={hintClass}>Search may lag recent saves; narrow your query if results are limited.</p>}
    </form>
    {selectionError && <p role="alert">{selectionError}</p>}
    {selecting && <p role="status">Verifying customer selection…</p>}
    <div className={cardClass}>
      {selected && <section aria-label="Customer details" className={`${panelClass} m-3 space-y-3`}>
        <div><h2 className="text-sm font-bold">{selected.name}</h2><p className={`${hintClass} break-all`}>Customer reference: {selected.customer_key} · Version {selected.version}</p></div>
        <ul className="space-y-1 text-sm">{selected.contacts.map((c, i) => <li key={i} className="flex flex-wrap items-center gap-2"><Badge tone="slate">{c.kind}</Badge>{c.value} {c.label} {c.primary ? '(Primary)' : ''}</li>)}</ul>
        <button type="button" className={secondaryButtonClass} onClick={() => setSelected(null)}>Close details</button>
      </section>}
      {error ? <p role="alert" className="p-4">{error}</p> : !result ? <LoadingState label="Loading customers…" /> : !result.items.length ? <EmptyState icon={Users} title="No customers in this company." hint="Create a customer to start a counter sale, or clear the search to browse every record." /> :
        <table className={tableClass}><thead><tr>{['Name', 'Type', 'Primary contact', 'Action'].map(label => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(customer => <tr key={customer.customer_key} className={trClass}>
            <td className={tdClass}>{customer.name}</td><td className={tdClass}><Badge tone="indigo">{customer.kind}</Badge></td><td className={tdClass}>{customer.contacts.find(c => c.primary)?.value}</td>
            <td className={tdClass}><button type="button" disabled={selecting} className={rowActionClass} onClick={() => selectCustomer(customer, true)} aria-label={`View ${customer.name}`}>View</button>
              {onSelect && <button type="button" disabled={selecting} className={rowActionClass} onClick={() => selectCustomer(customer)} aria-label={`Select ${customer.name}`}>Select</button>}</td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0} isDark={isDark}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} /></div>
  </section>;
}
