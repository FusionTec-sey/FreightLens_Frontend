import React, { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Percent, Store, Tag, Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { salesPricingApi, pricingError } from '../../../services/salesPricingApi';
import { salesDraftsApi } from '../../../services/salesDraftsApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import {
  Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass,
  hintClass, inputClass, messageClass, pageClass, primaryButtonClass,
  secondaryButtonClass, selectClass, tableClass, tdClass, thClass, trClass,
} from '../../UI/UXComponent/RegisterShell';
import DraftSourcePicker from './DraftSourcePicker';
import CustomersPage from '../MasterData/CustomersPage';

export const PRICING_TABS = [
  { id: 'tax', label: 'Tax rules', icon: Percent },
  { id: 'prices', label: 'Store prices', icon: Store },
  { id: 'assignments', label: 'Product tax', icon: Tag },
  { id: 'agreements', label: 'Customer prices', icon: Users, customer: true },
];

const newKey = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
const localTime = value => value ? new Date(value).toISOString().slice(0, 16) : '';
const isoTime = value => value ? new Date(value).toISOString() : null;

export default function SalesPricingPage() {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const canView = isSuperAdmin || (hasModule?.('SALES')
    && permissions.includes('View_Product') && permissions.includes('View_Financials'));
  const canManage = isSuperAdmin || permissions.includes('Manage_Financials');
  const canViewCustomers = isSuperAdmin || (permissions.includes('View_Customer')
    && permissions.includes('View_Personal_Data'));
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!canView) return <p role="alert">Product and financial pricing access required.</p>;
  return <PricingRegister key={`${activeOrg}:${token}`} token={token} orgId={activeOrg}
    canManage={canManage} canViewCustomers={canViewCustomers} />;
}

function PricingRegister({ token, orgId, canManage, canViewCustomers }) {
  const { isDark } = useTheme();
  const api = useMemo(() => salesPricingApi(token, orgId), [token, orgId]);
  const sourceApi = useMemo(() => salesDraftsApi(token, orgId), [token, orgId]);
  const tabs = useMemo(() => PRICING_TABS.filter(tab => !tab.customer || canViewCustomers), [canViewCustomers]);
  const [tab, setTab] = useState('tax');
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(25);
  const [refresh, setRefresh] = useState(0); const [result, setResult] = useState(null);
  const [error, setError] = useState(''); const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(null);
  const loaders = useMemo(() => ({
    tax: api.taxRules,
    prices: api.branchPrices,
    assignments: api.productTaxAssignments,
    agreements: api.customerAgreements,
  }), [api]);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setResult(null); setError(''); setEditing(null);
    loaders[tab](page, limit, controller.signal).then(({ data }) => { if (live) setResult(data); })
      .catch(failure => { if (live) setError(pricingError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [loaders, tab, page, limit, refresh]);
  const changeTab = next => { setResult(null); setError(''); setTab(next); setPage(1); setSaved(null); };
  const current = tabs.find(item => item.id === tab) || tabs[0];
  if (editing) return <PricingEditor type={tab} initial={editing === 'NEW' ? null : editing}
    api={api} sourceApi={sourceApi} canViewCustomers={canViewCustomers}
    onClose={() => setEditing(null)} onSaved={record => {
      setSaved(record); setEditing(null); setPage(1); setRefresh(value => value + 1);
    }} />;
  return <section className={pageClass}>
    <RegisterHeader icon={BadgeDollarSign} title="Pricing & tax" count={result?.total}
      description="Tax-inclusive SCR configuration. Prices are versioned by selling store, product and unit; saving here does not post a sale."
      actions={<><button type="button" className={secondaryButtonClass} onClick={() => setRefresh(value => value + 1)}>Refresh</button>
        {canManage && <button type="button" className={primaryButtonClass} onClick={() => setEditing('NEW')}>New {current.label.replace(/s$/, '').toLowerCase()}</button>}</>} />
    <nav className="shrink-0 flex gap-2 overflow-x-auto pb-1" aria-label="Pricing configuration">
      {tabs.map(item => <button key={item.id} type="button" onClick={() => changeTab(item.id)}
        aria-current={tab === item.id ? 'page' : undefined}
        className={`${tab === item.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700'} inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold`}>
        <item.icon size={16} aria-hidden="true" />{item.label}</button>)}
    </nav>
    {saved && <div className={messageClass('success')}><p role="status">Version {saved.version} saved. Existing drafts and financial records were not rewritten.</p>
      <button type="button" className={secondaryButtonClass} onClick={() => setSaved(null)}>Dismiss result</button></div>}
    {error && <div className={messageClass('error')}><p role="alert">{error}</p>
      <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
    <div className={cardClass}>
      {!result && !error ? <LoadingState label={`Loading ${current.label.toLowerCase()}…`} />
        : result && !result.items.length ? <EmptyState icon={current.icon} title={`No ${current.label.toLowerCase()} configured`} hint="Create the first reviewed configuration when the business value is known." />
        : result && <PricingTable type={tab} rows={result.items} canManage={canManage} onEdit={setEditing} />}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1}
      totalCount={result?.total || 0} isDark={isDark} onPageChange={setPage}
      onPageSizeChange={size => { setLimit(size); setPage(1); }} /></div>
  </section>;
}

function PricingTable({ type, rows, canManage, onEdit }) {
  const headers = {
    tax: ['Code', 'Rule', 'Treatment', 'Rate', 'Status', 'Action'],
    prices: ['Store', 'Product', 'Unit', 'Tax-inclusive price', 'Floor', 'Status', 'Action'],
    assignments: ['Product', 'Tax rule', 'Status', 'Action'],
    agreements: ['Customer', 'Store / product', 'Unit', 'Agreed price', 'Validity', 'Status', 'Action'],
  }[type];
  return <table className={tableClass}><thead><tr>{headers.map(label => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
    <tbody>{rows.map(row => <PricingRow key={recordKey(type, row)} type={type} row={row} canManage={canManage} onEdit={onEdit} />)}</tbody></table>;
}

function recordKey(type, row) {
  return row[{ tax: 'tax_rule_key', prices: 'price_key', assignments: 'assignment_key', agreements: 'agreement_key' }[type]];
}
function StateBadge({ enabled }) { return <Badge tone={enabled ? 'emerald' : 'slate'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>; }
function PricingRow({ type, row, canManage, onEdit }) {
  const action = <td key="action" className={tdClass}>{canManage
    ? <button type="button" className={secondaryButtonClass} onClick={() => onEdit(row)}>Edit v{row.version}</button>
    : <span className={hintClass}>Read only</span>}</td>;
  if (type === 'tax') return <tr className={trClass}><td className={tdClass}><b>{row.code}</b><span className="block text-xs">v{row.version}</span></td>
    <td className={tdClass}>{row.name}</td><td className={tdClass}>{row.treatment.replace('_', ' ')}</td><td className={tdClass}>{row.rate}</td><td className={tdClass}><StateBadge enabled={row.is_enabled} /></td>{action}</tr>;
  if (type === 'prices') return <tr className={trClass}><td className={tdClass}>Store {row.branch_id}</td><td className={tdClass}>Product {row.product_id}</td><td className={tdClass}>{row.unit}</td>
    <td className={tdClass}>SCR {row.gross_unit_scr}</td><td className={tdClass}>{row.floor_gross_unit_scr ? `SCR ${row.floor_gross_unit_scr}` : 'Not set'}</td><td className={tdClass}><StateBadge enabled={row.is_enabled} /></td>{action}</tr>;
  if (type === 'assignments') return <tr className={trClass}><td className={tdClass}>Product {row.product_id}<span className="block text-xs">v{row.version}</span></td>
    <td className={`${tdClass} font-mono text-xs`}>{row.tax_rule_key}</td><td className={tdClass}><StateBadge enabled={row.is_enabled} /></td>{action}</tr>;
  return <tr className={trClass}><td className={`${tdClass} font-mono text-xs`}>{row.customer_key}</td><td className={tdClass}>Store {row.branch_id}<span className="block text-xs">Product {row.product_id}</span></td>
    <td className={tdClass}>{row.unit}</td><td className={tdClass}>SCR {row.gross_unit_scr}<span className="block text-xs">{row.terms_reference}</span></td>
    <td className={tdClass}>{new Date(row.valid_from).toLocaleString()}<span className="block text-xs">{row.valid_until ? `to ${new Date(row.valid_until).toLocaleString()}` : 'No end date'}</span></td>
    <td className={tdClass}><StateBadge enabled={row.is_enabled} /></td>{action}</tr>;
}

function baseForm(type, row) {
  if (type === 'tax') return { key: row?.tax_rule_key || newKey(), operation_key: newKey(), expected_version: row?.version || 0,
    code: row?.code || '', name: row?.name || '', treatment: row?.treatment || 'STANDARD', rate: row?.rate || '0.15', enabled: row?.is_enabled ?? true, reason: '' };
  if (type === 'prices') return { key: row?.price_key || newKey(), operation_key: newKey(), expected_version: row?.version || 0,
    branch: row ? { id: row.branch_id, name: `Store ${row.branch_id}` } : null, product: row ? { id: row.product_id, name: `Product ${row.product_id}` } : null,
    unit: row?.unit || 'EACH', gross: row?.gross_unit_scr || '', floor: row?.floor_gross_unit_scr || '', enabled: row?.is_enabled ?? true, reason: '' };
  if (type === 'assignments') return { key: row?.assignment_key || newKey(), operation_key: newKey(), expected_version: row?.version || 0,
    product: row ? { id: row.product_id, name: `Product ${row.product_id}` } : null, tax_rule_key: row?.tax_rule_key || '', enabled: row?.is_enabled ?? true, reason: '' };
  return { key: row?.agreement_key || newKey(), operation_key: newKey(), expected_version: row?.version || 0,
    customer: row ? { customerKey: row.customer_key, profile: { name: `Customer ${row.customer_key}` } } : null,
    branch: row ? { id: row.branch_id, name: `Store ${row.branch_id}` } : null, product: row ? { id: row.product_id, name: `Product ${row.product_id}` } : null,
    unit: row?.unit || 'EACH', gross: row?.gross_unit_scr || '', valid_from: localTime(row?.valid_from || new Date()), valid_until: localTime(row?.valid_until),
    terms: row?.terms_reference || '', enabled: row?.is_enabled ?? true, reason: '' };
}

function PricingEditor({ type, initial, api, sourceApi, canViewCustomers, onClose, onSaved }) {
  const [form, setForm] = useState(() => baseForm(type, initial));
  const [picker, setPicker] = useState(null); const [taxRules, setTaxRules] = useState(null);
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));
  useEffect(() => {
    if (type !== 'assignments') return undefined;
    const controller = new AbortController();
    api.taxRules(1, 100, controller.signal).then(({ data }) => setTaxRules(data.items)).catch(failure => setError(pricingError(failure)));
    return () => controller.abort();
  }, [api, type]);
  const save = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      let body; let call;
      if (type === 'tax') { body = { operation_key: form.operation_key, expected_version: form.expected_version, code: form.code,
        config: { name: form.name, treatment: form.treatment, rate: form.treatment === 'STANDARD' ? form.rate : '0', is_enabled: form.enabled }, reason: form.reason }; call = api.saveTaxRule; }
      if (type === 'prices') { body = { operation_key: form.operation_key, expected_version: form.expected_version, branch_id: form.branch?.id,
        product_id: form.product?.id, unit: form.unit, config: { gross_unit_scr: form.gross, floor_gross_unit_scr: form.floor || null, is_enabled: form.enabled }, reason: form.reason }; call = api.saveBranchPrice; }
      if (type === 'assignments') { body = { operation_key: form.operation_key, expected_version: form.expected_version,
        product_id: form.product?.id, tax_rule_key: form.tax_rule_key, is_enabled: form.enabled, reason: form.reason }; call = api.saveProductTaxAssignment; }
      if (type === 'agreements') { body = { operation_key: form.operation_key, expected_version: form.expected_version,
        customer_key: form.customer?.customerKey, branch_id: form.branch?.id, product_id: form.product?.id, unit: form.unit,
        config: { gross_unit_scr: form.gross, valid_from: isoTime(form.valid_from), valid_until: isoTime(form.valid_until), terms_reference: form.terms, is_enabled: form.enabled }, reason: form.reason }; call = api.saveCustomerAgreement; }
      const { data } = await call(form.key, body); onSaved(data);
    } catch (failure) { setError(pricingError(failure)); }
    finally { setSaving(false); }
  };
  const choose = (name, value) => { set(name, value); setPicker(null); };
  if (picker === 'branch') return <DraftSourcePicker title="Select selling store" load={sourceApi.branches} onClose={() => setPicker(null)} onSelect={value => choose('branch', value)} />;
  if (picker === 'product') return <DraftSourcePicker title="Select product" products load={sourceApi.products} onClose={() => setPicker(null)} onSelect={value => choose('product', value)} />;
  if (picker === 'customer' && canViewCustomers) return <div className={pageClass}><button type="button" className={secondaryButtonClass} onClick={() => setPicker(null)}>Back to agreement</button>
    <div className="min-h-0 flex-1"><CustomersPage onSelect={value => choose('customer', value)} /></div></div>;
  const title = `${initial ? 'Update' : 'New'} ${{ tax: 'tax rule', prices: 'store price', assignments: 'product tax assignment', agreements: 'customer price agreement' }[type]}`;
  return <section className={`${pageClass} overflow-auto`}><RegisterHeader icon={BadgeDollarSign} title={title}
    description={`Version ${form.expected_version}. A confirmed save creates the next immutable revision.`}
    actions={<button type="button" className={secondaryButtonClass} disabled={saving} onClick={onClose}>Back to pricing</button>} />
    {error && <div className={messageClass('error')}><p role="alert">{error}</p></div>}
    <form onSubmit={save} className="mx-auto grid w-full max-w-4xl gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
      {type === 'tax' && <>
        <Field label="Code"><input className={`${inputClass} w-full`} required pattern="[A-Z0-9][A-Z0-9_-]{0,31}" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} /></Field>
        <Field label="Name"><input className={`${inputClass} w-full`} required maxLength="120" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Treatment"><select className={`${selectClass} w-full`} value={form.treatment} onChange={e => set('treatment', e.target.value)}><option value="STANDARD">Standard rated</option><option value="ZERO_RATED">Zero rated</option><option value="EXEMPT">Exempt</option></select></Field>
        <Field label="Rate as decimal" hint="For example, 0.15 represents 15%. Zero-rated and exempt rules save as 0."><input className={`${inputClass} w-full`} required disabled={form.treatment !== 'STANDARD'} inputMode="decimal" value={form.treatment === 'STANDARD' ? form.rate : '0'} onChange={e => set('rate', e.target.value)} /></Field>
      </>}
      {(type === 'prices' || type === 'agreements') && <Choice label="Selling store" value={form.branch?.name} disabled={Boolean(initial)} onClick={() => setPicker('branch')} />}
      {(type === 'prices' || type === 'assignments' || type === 'agreements') && <Choice label="Product" value={form.product?.name} disabled={Boolean(initial)} onClick={() => setPicker('product')} />}
      {(type === 'prices' || type === 'agreements') && <Field label="Selling unit"><input className={`${inputClass} w-full`} required maxLength="50" disabled={Boolean(initial)} value={form.unit} onChange={e => set('unit', e.target.value)} /></Field>}
      {(type === 'prices' || type === 'agreements') && <Field label="Tax-inclusive unit price (SCR)"><input className={`${inputClass} w-full`} required inputMode="decimal" value={form.gross} onChange={e => set('gross', e.target.value)} /></Field>}
      {type === 'prices' && <Field label="Approval floor (SCR)" hint="Optional. A lower eligible customer price is flagged for approval."><input className={`${inputClass} w-full`} inputMode="decimal" value={form.floor} onChange={e => set('floor', e.target.value)} /></Field>}
      {type === 'assignments' && <Field label="Tax rule"><select className={`${selectClass} w-full`} required value={form.tax_rule_key} onChange={e => set('tax_rule_key', e.target.value)}><option value="">Select a tax rule</option>{taxRules?.map(rule => <option key={rule.tax_rule_key} value={rule.tax_rule_key}>{rule.code} · {rule.name} · {rule.rate}</option>)}</select></Field>}
      {type === 'agreements' && <><Choice label="Customer" value={form.customer?.profile?.name} disabled={Boolean(initial)} onClick={() => setPicker('customer')} />
        <Field label="Valid from"><input className={`${inputClass} w-full`} required type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} /></Field>
        <Field label="Valid until" hint="Leave blank when the agreement has no fixed end."><input className={`${inputClass} w-full`} type="datetime-local" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} /></Field>
        <Field label="Agreed terms reference"><input className={`${inputClass} w-full`} required maxLength="200" value={form.terms} onChange={e => set('terms', e.target.value)} /></Field></>}
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold"><input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />Enabled for new pricing previews</label>
      <Field label="Reason for this revision" wide hint="Required for the audit history."><textarea className={`${inputClass} min-h-[88px] w-full`} required maxLength="500" value={form.reason} onChange={e => set('reason', e.target.value)} /></Field>
      <div className="md:col-span-2 flex flex-wrap justify-end gap-2"><button type="button" className={secondaryButtonClass} disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? 'Saving…' : 'Save next version'}</button></div>
    </form>
  </section>;
}

function Field({ label, hint, wide, children }) { return <label className={`${fieldLabelClass} ${wide ? 'md:col-span-2' : ''}`}>{label}{children}{hint && <span className={`${hintClass} mt-1 block font-normal`}>{hint}</span>}</label>; }
function Choice({ label, value, disabled, onClick }) { return <Field label={label}><button type="button" disabled={disabled} className={`${secondaryButtonClass} mt-1 w-full justify-between`} onClick={onClick}>{value || `Choose ${label.toLowerCase()}`}<span aria-hidden="true">›</span></button></Field>; }
