import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { salesDraftsApi } from '../../../services/salesDraftsApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import SalesDraftEditor from './SalesDraftEditor';
import ManagerCases from '../Inventory/components/ManagerCases';
import DraftReservations from './DraftReservations';
import LocalSalesDrafts from './LocalSalesDrafts';

export default function SalesDraftsPage() {
  const { token, selectedOrgId, orgId, user, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const allowed = isSuperAdmin || (hasModule?.('SALES') &&
    ['View_SalesDraft', 'View_Product', 'View_Customer', 'View_Personal_Data'].every(p => permissions.includes(p)));
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!allowed) return <p role="alert">Sales draft, product and customer access required.</p>;
  return <DraftRegister key={`${activeOrg}:${user?.id}:${token}`} token={token} orgId={activeOrg}
    canManage={isSuperAdmin || permissions.includes('Manage_SalesDraft')} userId={user?.id}
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

function DraftRegister({ token, orgId, canManage, canOpenReviews, canReview, canRequestRelease, canOpenDeadlines, canReviewDeadline, canRequestDeadline, canScheduleDeadline, canOpenReallocations, canReviewReallocation, canRequestReallocation, userId }) {
  const { isDark } = useTheme();
  const api = useMemo(() => salesDraftsApi(token, orgId), [token, orgId]);
  const [deadlineReviews, setDeadlineReviews] = useState(false);
  const [reallocationReviews, setReallocationReviews] = useState(false);
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
  const [reviews, setReviews] = useState(false);
  const [holds, setHolds] = useState(null);
  const [localDrafts, setLocalDrafts] = useState(false);
  const [dueInbox, setDueInbox] = useState(false);
  const request = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    request.current?.abort(); request.current = null;
    setSelected(null); setDetailError(''); setLoadingDetail(false); setResult(null); setError('');
    api.list(page, limit, controller.signal).then(({ data }) => { if (live) setResult(data); })
      .catch(() => { if (live) setError('Drafts could not be loaded. Check access and refresh to retry.'); });
    return () => { live = false; controller.abort(); request.current?.abort(); };
  }, [api, page, limit, refresh]);
  async function open(row) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setSelected(null); setDetailError(''); setLoadingDetail(true);
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
  const theme = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const canOpenDue = canOpenDeadlines && (canReviewDeadline || canScheduleDeadline);
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
  return <section className={`h-full min-h-0 flex flex-col p-4 gap-3 ${theme}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3">
      <div><h1 className="text-xl font-bold">Sales drafts</h1><p className="text-sm">Draft demand only — no confirmed sale, payment, reservation or collection entitlement.</p></div>
      <button type="button" className="border rounded px-4 py-2 hover:bg-indigo-500/20" onClick={() => setRefresh(n => n + 1)}>Refresh</button>
      {canManage && <button type="button" disabled={loadingDetail} className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-40" onClick={() => setEditing('NEW')}>New draft</button>}
      {canManage && <button type="button" className="border rounded px-3 py-2" onClick={() => setLocalDrafts(true)}>Local drafts</button>}
      {canOpenReviews && <button type="button" className="border rounded px-3 py-2" onClick={() => setReviews(true)}>Reservation reviews</button>}
      {canOpenReallocations && <button type="button" className="border rounded px-3 py-2" onClick={() => setReallocationReviews(true)}>Reallocation reviews</button>}
      {canOpenDeadlines && <button type="button" className="border rounded px-3 py-2" onClick={() => setDeadlineReviews(true)}>Follow-up reviews</button>}
      {canOpenDue && <button type="button" className="border rounded px-3 py-2" onClick={() => setDueInbox(true)}>Overdue follow-up</button>}
    </header>
    {saved && <section className="shrink-0 flex flex-wrap gap-3 items-center"><p role="status">Draft version {saved.version} saved. No stock or money posted.</p><button type="button" className="border rounded p-2" onClick={() => open(saved)}>Open saved draft</button><button type="button" className="border rounded p-2" onClick={() => setSaved(null)}>Dismiss result</button></section>}
    <div className="flex-1 min-h-0 overflow-auto border rounded-xl">
      {loadingDetail && <p role="status" className="p-3">Opening draft…</p>}
      {detailError && <p role="alert" className="p-3">{detailError}</p>}
      {selected && <section aria-label="Sales draft details" className="p-4 border-b space-y-2">
        <h2 className="font-semibold">Draft version {selected.version}</h2>
        <p className="text-xs break-all">Reference: {selected.document_key}</p>
        <p className="text-xs break-all">Customer reference: {selected.customer_key} · Branch {selected.branch_id}</p>
        <ul>{selected.lines.map(line => <li className="border-b py-2" key={line.line_key}>
          {line.product_name || `Product ${line.product_id}`} {line.sku}: {line.quantity} {line.unit} · Base quantity {line.base_quantity} {line.base_unit} · Policy v{line.expected_policy_version}
          <span className="block text-xs">Reserved: {line.reserved_quantity || '0'} {line.base_unit}. Reservation is separate from payment and physical collection.</span>
        </li>)}</ul>
        <button type="button" className="border rounded px-3 py-2" onClick={() => setSelected(null)}>Close details</button>
        {(canOpenReviews || canOpenDeadlines || canOpenReallocations) && <button type="button" className="border rounded px-3 py-2 ml-2" onClick={() => setHolds(selected)}>Reserved stock</button>}
        {canManage && <button type="button" className="border rounded px-3 py-2 ml-2" onClick={() => setEditing(selected)}>Edit draft</button>}
      </section>}
      {error ? <p role="alert" className="p-4">{error}</p> : !result ? <p role="status" className="p-4">Loading drafts…</p> : !result.items.length ? <p className="p-4">No saved sales drafts in this company.</p> :
        <table className="w-full text-sm"><thead className={`sticky top-0 ${theme}`}><tr>{['Draft reference', 'Version', 'Branch', 'Status', 'Action'].map(label => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
          <tbody>{result.items.map(row => <tr className="border-t" key={row.document_key}>
            <td className="p-3 font-mono break-all">{row.document_key}</td><td className="p-3">{row.version}</td><td className="p-3">{row.branch_id}</td><td className="p-3">Draft</td>
            <td className="p-3"><button type="button" disabled={loadingDetail} className="border rounded px-3 py-2 hover:bg-indigo-500/20 disabled:opacity-40" onClick={() => open(row)}>View</button></td>
          </tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}
