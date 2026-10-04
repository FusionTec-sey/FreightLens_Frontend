import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { salesDraftsApi } from '../../../services/salesDraftsApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import SalesDraftEditor from './SalesDraftEditor';
import ManagerCases from '../Inventory/components/ManagerCases';
import DraftReservations from './DraftReservations';
import LocalSalesDrafts from './LocalSalesDrafts';
import DraftSourcePicker from './DraftSourcePicker';
import LocalDraftReserveForm from './LocalDraftReserveForm';
import PrintableDocument from '../../UI/UXComponent/PrintableDocument';
import { FileText, Inbox } from 'lucide-react';
import { Badge, EmptyState, LoadingState, RegisterHeader, cardClass, fieldLabelClass, hintClass, messageClass, pageClass, panelClass, primaryButtonClass, referenceClass, rowActionClass, secondaryButtonClass, tableClass, tdClass, thClass, trClass } from '../../UI/UXComponent/RegisterShell';

export default function SalesDraftsPage({ view = 'DRAFTS' }) {
  const { token, selectedOrgId, orgId, orgName, user, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const allowed = isSuperAdmin || (hasModule?.('SALES') &&
    ['View_SalesDraft', 'View_Product', 'View_Customer', 'View_Personal_Data'].every(p => permissions.includes(p)));
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!allowed) return <p role="alert">Sales draft, product and customer access required.</p>;
  return <DraftRegister key={`${activeOrg}:${user?.id}:${token}:${view}`} view={view} token={token} orgId={activeOrg} orgName={orgName}
    canManage={isSuperAdmin || permissions.includes('Manage_SalesDraft')} userId={user?.id}
    canReserve={isSuperAdmin || permissions.includes('Reserve_SalesDraft')}
    canOpenReviews={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_ReservationRelease', 'Review_ReservationRelease'].some(p => permissions.includes(p)))}
    canReview={isSuperAdmin || permissions.includes('Review_ReservationRelease')}
    canRequestRelease={isSuperAdmin || permissions.includes('Request_ReservationRelease')}
    canOpenReallocations={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_ReservationReallocation', 'Review_ReservationReallocation'].some(p => permissions.includes(p)))}
    canReviewReallocation={isSuperAdmin || permissions.includes('Review_ReservationReallocation')}
    canRequestReallocation={isSuperAdmin || permissions.includes('Request_ReservationReallocation')}
    canOpenDeadlines={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_ReservationDeadline', 'Review_ReservationDeadline', 'Schedule_ReservationReview'].some(p => permissions.includes(p)))}
    canReviewDeadline={isSuperAdmin || permissions.includes('Review_ReservationDeadline')}
    canRequestDeadline={isSuperAdmin || permissions.includes('Request_ReservationDeadline')}
    canScheduleDeadline={isSuperAdmin || permissions.includes('Schedule_ReservationReview')} />;
}

function DraftRegister({ view = 'DRAFTS', token, orgId, orgName, canManage, canReserve, canOpenReviews, canReview, canRequestRelease, canOpenDeadlines, canReviewDeadline, canRequestDeadline, canScheduleDeadline, canOpenReallocations, canReviewReallocation, canRequestReallocation, userId }) {
  const { isDark } = useTheme();
  const api = useMemo(() => salesDraftsApi(token, orgId), [token, orgId]);
  // The POS sidebar owns navigation: each entry mounts this workspace on its own
  // route, so the register no longer carries a row of navigation buttons.
  const [deadlineReviews, setDeadlineReviews] = useState(view === 'DEADLINE_REVIEWS');
  const [reallocationReviews, setReallocationReviews] = useState(view === 'REALLOCATION_REVIEWS');
  const reviewApi = useMemo(() => ({
    managerCases: async (...args) => { const response = await (reallocationReviews ? api.reallocationCases : deadlineReviews ? api.deadlineCases : api.releaseCases)(...args); return { ...response, data: {
      ...response.data, items: response.data.items.map(row => ({ ...row, product_name: `Reservation ${row.reservation_key}` })),
    } }; },
    reviewPolicyCase: (...args) => (reallocationReviews ? api.reviewReallocation : deadlineReviews ? api.reviewDeadline : api.reviewRelease)(...args),
    scheduleDeadline: (...args) => api.scheduleDeadline(...args),
  }), [api, deadlineReviews, reallocationReviews]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(null);
  const [reviews, setReviews] = useState(view === 'RELEASE_REVIEWS');
  const [holds, setHolds] = useState(null);
  const [localDrafts, setLocalDrafts] = useState(view === 'LOCAL_DRAFTS');
  const [dueInbox, setDueInbox] = useState(view === 'OVERDUE');
  const [printing, setPrinting] = useState(false);
  // The register row already carries display labels, so printing needs no extra
  // personal-data request beyond the list this screen is already entitled to.
  const [summary, setSummary] = useState(null);
  const printCustomer = summary ? { name: summary.customer_name, kind: null, contacts: [] } : null;
  const printBranch = summary?.branch_name;
  const [pickingCounter, setPickingCounter] = useState(false);
  const [areaPreview, setAreaPreview] = useState(null);
  const [areaError, setAreaError] = useState('');
  const [areaLoading, setAreaLoading] = useState(false);
  const [reserveLine, setReserveLine] = useState(null);
  const request = useRef(null);
  const areaRequest = useRef(null);
  const counterLoad = useMemo(() => (pageNumber, pageSize, signal) =>
    api.counters(selected?.branch_id, pageNumber, pageSize, signal), [api, selected?.branch_id]);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    request.current?.abort(); request.current = null; areaRequest.current?.abort();
    setSelected(null); setDetailError(''); setLoadingDetail(false); setResult(null); setError('');
    api.list(page, limit, controller.signal).then(({ data }) => { if (live) setResult(data); })
      .catch(() => { if (live) setError('Drafts could not be loaded. Check access and refresh to retry.'); });
    return () => { live = false; controller.abort(); request.current?.abort(); areaRequest.current?.abort(); };
  }, [api, page, limit, refresh]);
  async function open(row) {
    request.current?.abort();
    areaRequest.current?.abort(); setAreaPreview(null); setAreaError(''); setAreaLoading(false); setReserveLine(null);
    const controller = new AbortController(); request.current = controller;
    setSelected(null); setDetailError(''); setLoadingDetail(true); setPrinting(false); setSummary(row);
    try {
      const { data } = await api.read(row.document_key, controller.signal);
      if (controller.signal.aborted) return;
      if (data.document_key !== row.document_key) throw new Error('Mismatched draft');
      setSelected(data);
      return true;
    } catch {
      if (!controller.signal.aborted) setDetailError('Draft could not be opened. Refresh and try again.');
    } finally { if (!controller.signal.aborted) setLoadingDetail(false); }
  }
  async function previewCounter(counter) {
    setPickingCounter(false); areaRequest.current?.abort(); setAreaPreview(null); setAreaError(''); setAreaLoading(true);
    const controller = new AbortController(); areaRequest.current = controller;
    try {
      const { data } = await api.workAreaPreview(selected.document_key, counter.counter_key, controller.signal);
      if (!controller.signal.aborted) {
        if (data.document_key !== selected.document_key || data.draft_version !== selected.version) throw new Error('Draft changed');
        setAreaPreview(data);
      }
    } catch { if (!controller.signal.aborted) setAreaError('Work area stock could not be previewed. Refresh the draft or choose another counter.'); }
    finally { if (!controller.signal.aborted) setAreaLoading(false); }
  }
  const canOpenDue = canOpenDeadlines && (canReviewDeadline || canScheduleDeadline);
  if (printing && selected) return <PrintableDocument documentType="Sales draft" onClose={() => setPrinting(false)}
    company={{ name: orgName || 'Company', subtitle: 'Counter sales — draft demand record' }}
    reference={selected.document_key} issuedLabel="Printed" title={`Draft revision ${selected.version}`}
    parties={[
      { label: 'Customer', name: printCustomer?.name || 'Customer on file',
        lines: [printCustomer?.kind, ...(printCustomer?.contacts || []).map(contact => `${contact.kind}: ${contact.value}`)] },
      { label: 'Selling store', name: printBranch || `Store ${selected.branch_id}`,
        lines: ['Collection and payment are handled separately.'] },
    ]}
    meta={[
      { label: 'Draft revision', value: `v${selected.version}` },
      { label: 'Status', value: 'Draft demand' },
      { label: 'Lines', value: String(selected.lines.length) },
    ]}
    columns={[
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'ordered', label: 'Ordered', align: 'right' },
      { key: 'base', label: 'Base quantity', align: 'right' },
      { key: 'reserved', label: 'Reserved', align: 'right' },
    ]}
    rows={selected.lines.map(line => ({
      key: line.line_key,
      product: line.product_name || `Product ${line.product_id}`,
      sku: line.sku || '—',
      ordered: `${line.quantity} ${line.unit}`,
      base: `${line.base_quantity} ${line.base_unit}`,
      reserved: `${line.reserved_quantity || '0'} ${line.base_unit}`,
    }))}
    notes={[
      'This document records draft customer demand only. It is not an invoice, receipt, quotation or proof of payment, and it does not entitle the holder to collect goods.',
      'Reserved quantities are stock holds subject to reviewed release and follow-up dates. Prices, taxes and payment are not part of this document.',
      'Quantities are shown in the unit entered and in the reviewed base unit of each product.',
    ]} />;
  if (pickingCounter && selected) return <DraftSourcePicker title="Select counter" load={counterLoad} onSelect={previewCounter} onClose={() => setPickingCounter(false)} />;
  if (reallocationReviews && canOpenReallocations) return <ManagerCases api={reviewApi} userId={userId} canReview={canReviewReallocation} reservationReallocation standalone onClose={() => setReallocationReviews(false)} />;
  if (dueInbox && canOpenDue) return <DraftReservations api={api} dueInbox canRequest={canRequestRelease} canRequestDeadline={canRequestDeadline} canRequestReallocation={canRequestReallocation}
    onClose={() => setDueInbox(false)} onOpenDraft={async row => { if (!await open(row)) throw new Error('Draft not accessible'); setDueInbox(false); }} />;
  if (holds && (canOpenReviews || canOpenDeadlines || canOpenReallocations)) return <DraftReservations api={api} draft={holds} canRequest={canRequestRelease} canRequestDeadline={canRequestDeadline} canRequestReallocation={canRequestReallocation} onClose={() => { setHolds(null); open(holds); }} />;
  if (deadlineReviews && canOpenDeadlines) return <ManagerCases api={reviewApi} userId={userId} canReview={canReviewDeadline} canActivate={canScheduleDeadline} reservationDeadline standalone onClose={() => setDeadlineReviews(false)} />;
  if (reviews && canOpenReviews) return <ManagerCases api={reviewApi} userId={userId} canReview={canReview}
    reservationRelease standalone onClose={() => setReviews(false)} />;
  if (localDrafts && canManage) return <LocalSalesDrafts orgId={orgId} userId={userId} onClose={() => setLocalDrafts(false)} onRecover={recovery => { setLocalDrafts(false); setEditing({ recovery }); }} />;
  if (editing && canManage) return <SalesDraftEditor api={api} orgId={orgId} userId={userId} recovery={editing.recovery} initial={editing === 'NEW' || editing.recovery ? null : editing}
    onClose={() => setEditing(null)} onSaved={receipt => { setSaved(receipt); setEditing(null); setRefresh(n => n + 1); }} />;
  return <section className={pageClass}>
    <RegisterHeader icon={FileText} title="Sales drafts" count={result?.total}
      description="Draft demand only — no confirmed sale, payment, reservation or collection entitlement."
      actions={<>
        <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
        {canManage && <button type="button" disabled={loadingDetail} className={primaryButtonClass} onClick={() => setEditing('NEW')}>New draft</button>}
      </>} />
    {saved && <section className={messageClass('success')}><p role="status">Draft version {saved.version} saved. No stock or money posted.</p><button type="button" className={secondaryButtonClass} onClick={() => open(saved)}>Open saved draft</button><button type="button" className={secondaryButtonClass} onClick={() => setSaved(null)}>Dismiss result</button></section>}
    <div className={cardClass}>
      {loadingDetail && <div role="status"><LoadingState label="Opening draft…" /></div>}
      {detailError && <p role="alert" className="p-3">{detailError}</p>}
      {selected && <section aria-label="Sales draft details" className={`${panelClass} m-3 space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold">Draft version {selected.version}</h2><Badge>Draft</Badge></div>
            <span className={referenceClass} title={selected.document_key}>{selected.document_key}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && <button type="button" className={secondaryButtonClass} onClick={() => setEditing(selected)}>Edit draft</button>}
            {(canOpenReviews || canOpenDeadlines || canOpenReallocations) && <button type="button" className={secondaryButtonClass} onClick={() => setHolds(selected)}>Reserved stock</button>}
            <button type="button" className={secondaryButtonClass} onClick={() => setPickingCounter(true)}>Preview work area stock</button>
            <button type="button" className={secondaryButtonClass} onClick={() => setPrinting(true)}>Print draft</button>
            <button type="button" className={secondaryButtonClass} onClick={() => setSelected(null)}>Close details</button>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className={fieldLabelClass}>Customer reference</dt><dd className="break-all text-xs font-semibold">{selected.customer_key}</dd></div>
          <div><dt className={fieldLabelClass}>Selling store</dt><dd className="text-xs font-semibold">Store {selected.branch_id}</dd></div>
        </dl>
        <ul className="space-y-2">{selected.lines.map(line => <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700" key={line.line_key}>
          <p className="text-sm font-semibold">{line.product_name || `Product ${line.product_id}`} {line.sku}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span><span className="text-slate-500 dark:text-slate-400">Ordered </span>{line.quantity} {line.unit}</span>
            <span>Base quantity {line.base_quantity} {line.base_unit}</span>
            <span className="text-slate-500 dark:text-slate-400">Policy v{line.expected_policy_version}</span>
            <Badge tone={Number(line.reserved_quantity) > 0 ? 'indigo' : 'slate'}>Reserved: {line.reserved_quantity || '0'} {line.base_unit}</Badge>
          </div>
        </li>)}</ul>
        <p className={hintClass}>Reservation is separate from payment and physical collection.</p>
        {areaLoading && <div role="status"><LoadingState label="Loading work area stock…" /></div>}
        {areaError && <p role="alert" className={messageClass('error')}>{areaError}</p>}
        {areaPreview && <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{areaPreview.work_area_name}</h3><Badge tone="slate">Counter settings v{areaPreview.counter_version}</Badge></div>
          <p className={hintClass}>Suggestions use untracked stock in this area. Tracked stock needs explicit batch or serial review. Policy, authority and current stock are checked again before any hold.</p>
          {!areaPreview.reservation_ready && <p className={messageClass('muted')}>Local reservation is waiting for configured stock runtime authority. The preview is still available.</p>}
          {areaPreview.incomplete && <p className={messageClass('muted')}>This preview reached its balance limit. More local stock may exist; the shortfall may be overstated.</p>}
          <ul className="space-y-2">{areaPreview.lines.map(line => <li key={line.line_key} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{selected.lines.find(item => item.line_key === line.line_key)?.product_name || `Product ${line.product_id}`}</strong>
              {Number(line.shortfall) > 0 ? <Badge tone="rose">Shortfall {line.shortfall} {line.base_unit}</Badge> : <Badge tone="indigo">Covered in this area</Badge>}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><dt className={fieldLabelClass}>Remaining demand</dt><dd className="text-xs font-semibold">{line.remaining_demand} {line.base_unit}</dd></div>
              <div><dt className={fieldLabelClass}>Untracked local stock</dt><dd className="text-xs font-semibold">{line.local_unreserved}</dd></div>
              <div><dt className={fieldLabelClass}>Provisional coverage</dt><dd className="text-xs font-semibold">{line.provisional_coverage}</dd></div>
              <div><dt className={fieldLabelClass}>Shortfall</dt><dd className="text-xs font-semibold">{line.shortfall}</dd></div>
            </dl>
            {Number(line.tracked_for_review) > 0 && <p className="mt-1"><Badge tone="amber">Tracked stock for review: {line.tracked_for_review} {line.base_unit}</Badge></p>}
            {!!line.suggestions?.length && <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">{line.suggestions.map(item => <li key={item.balance_id} className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.location_name}</span>{item.quantity} {line.base_unit}<span className="text-slate-400">balance {item.balance_id}, v{item.balance_version}</span></li>)}</ul>}
            {canReserve && areaPreview.reservation_ready && !areaPreview.incomplete && Number(line.remaining_demand) > 0 && line.suggestions?.length === 1 && Number(line.suggestions[0].quantity) === Number(line.remaining_demand) &&
              <button type="button" className={rowActionClass} onClick={() => setReserveLine({ line, suggestion: line.suggestions[0] })}>Reserve suggested stock</button>}
          </li>)}</ul>
          {reserveLine && <LocalDraftReserveForm api={api} draft={selected} preview={areaPreview} line={reserveLine.line} suggestion={reserveLine.suggestion}
            onClose={() => setReserveLine(null)} onReserved={() => open(selected)} />}
        </div>}
      </section>}
      {error ? <p role="alert" className="p-4">{error}</p> : !result ? <LoadingState label="Loading drafts…" /> : !result.items.length ? <EmptyState icon={Inbox} title="No saved sales drafts in this company." hint="Start a draft to capture counter demand. A draft never reserves stock or takes payment on its own." /> :
        <table className={tableClass}><thead><tr>{['Customer', 'Store', 'Items', 'Updated', 'Status', ''].map((label, index) => <th key={label || index} className={index === 2 ? `${thClass} text-right` : thClass}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr className={`${trClass} cursor-pointer`} key={row.document_key} title="Open this draft" onClick={() => { if (!loadingDetail) open(row); }}>
            <td className={tdClass}>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{row.customer_name || 'Customer on file'}</span>
              <span className={referenceClass} title={row.document_key}>{row.document_key}</span>
            </td>
            <td className={tdClass}>{row.branch_name || `Store ${row.branch_id}`}</td>
            <td className={`${tdClass} text-right tabular-nums`}>{row.line_count || 0}</td>
            <td className={tdClass}>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}<span className="block text-xs text-slate-500 dark:text-slate-400">Revision {row.version}</span></td>
            <td className={tdClass}><Badge>Draft</Badge></td>
            <td className={`${tdClass} text-right`}><button type="button" disabled={loadingDetail} className={rowActionClass} onClick={event => { event.stopPropagation(); open(row); }}>View</button></td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}
