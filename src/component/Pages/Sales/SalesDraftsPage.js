import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { salesDraftsApi } from '../../../services/salesDraftsApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import SalesDraftEditor from './SalesDraftEditor';
import SalesDraftDetails from './SalesDraftDetails';
import SalesDraftRows from './SalesDraftRows';
import './salesWorkspace.css';
import DraftSourcePicker from './DraftSourcePicker';
import ManagerCases from '../Inventory/components/ManagerCases';
import DraftReservations from './DraftReservations';
import LocalSalesDrafts from './LocalSalesDrafts';
import OtherStoreRequest from './OtherStoreRequest';
import DraftAllocation from './DraftAllocation';
import { inventoryLocationsApi } from '../../../services/inventoryLocationsApi';
import { useNavigate } from 'react-router-dom';
import { SALES_DRAFTS_ROUTE } from '../../../utils/salesRoutes';
import { FileText } from 'lucide-react';
import { RegisterHeader, pageClass, cardClass, primaryButtonClass, secondaryButtonClass, Badge } from '../../UI/UXComponent/RegisterShell';
import PriceFloorCases from './PriceFloorCases';

export default function SalesDraftsPage({ view = 'DRAFTS' }) {
  const { token, selectedOrgId, orgId, userId, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const pricingReview = view === 'PRICE_FLOOR_REVIEWS';
  const allowed = isSuperAdmin || (hasModule?.('SALES') && (pricingReview
    ? ['View_SalesDraft', 'View_Product', 'View_Financials'].every(p => permissions.includes(p))
    : ['View_SalesDraft', 'View_Product', 'View_Customer', 'View_Personal_Data'].every(p => permissions.includes(p))));
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  if (!allowed) return <p role="alert">Sales draft, product and customer access required.</p>;
  if (!userId) return <p role="alert">Authenticated user identity unavailable. Refresh access or sign in again before opening sales drafts.</p>;
  return <DraftRegister key={`${activeOrg}:${userId}:${token}:${view}`} view={view} token={token} orgId={activeOrg}
    canManage={isSuperAdmin || permissions.includes('Manage_SalesDraft')} userId={userId}
    canAllocate={isSuperAdmin || (hasModule?.('INVENTORY') && permissions.includes('Allocate_SalesDraftStock'))}
    canOpenReviews={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_ReservationRelease', 'Review_ReservationRelease', 'Execute_ReservationRelease'].some(p => permissions.includes(p)))}
    canExecuteRelease={isSuperAdmin || permissions.includes('Execute_ReservationRelease')}
    canReview={isSuperAdmin || permissions.includes('Review_ReservationRelease')}
    canRequestRelease={isSuperAdmin || permissions.includes('Request_ReservationRelease')}
    canOpenReallocations={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_ReservationReallocation', 'Review_ReservationReallocation', 'Execute_ReservationReallocation'].some(p => permissions.includes(p)))}
    canExecuteReallocation={isSuperAdmin || permissions.includes('Execute_ReservationReallocation')}
    canReviewReallocation={isSuperAdmin || permissions.includes('Review_ReservationReallocation')}
    canOpenOtherStore={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_OtherStoreFulfilment', 'Review_OtherStoreFulfilment', 'Execute_OtherStoreFulfilment'].some(p => permissions.includes(p)))}
    canExecuteOtherStore={isSuperAdmin || permissions.includes('Execute_OtherStoreFulfilment')}
    canReviewOtherStore={isSuperAdmin || permissions.includes('Review_OtherStoreFulfilment')}
    canRequestOtherStore={isSuperAdmin || permissions.includes('Request_OtherStoreFulfilment')}
    canRequestReallocation={isSuperAdmin || permissions.includes('Request_ReservationReallocation')}
    canOpenDeadlines={isSuperAdmin || (hasModule?.('INVENTORY') && ['Request_ReservationDeadline', 'Review_ReservationDeadline', 'Schedule_ReservationReview'].some(p => permissions.includes(p)))}
    canReviewDeadline={isSuperAdmin || permissions.includes('Review_ReservationDeadline')}
    canRequestDeadline={isSuperAdmin || permissions.includes('Request_ReservationDeadline')}
    canScheduleDeadline={isSuperAdmin || permissions.includes('Schedule_ReservationReview')}
    canRequestFloor={isSuperAdmin || permissions.includes('Request_PriceFloorException')}
    canReviewFloor={isSuperAdmin || permissions.includes('Review_PriceFloorException')} />;
}

function DraftRegister({ view, token, orgId, canManage, canOpenReviews, canReview, canExecuteRelease, canRequestRelease, canOpenDeadlines, canReviewDeadline, canRequestDeadline, canScheduleDeadline, canOpenReallocations, canReviewReallocation, canExecuteReallocation, canRequestReallocation, canOpenOtherStore, canReviewOtherStore, canExecuteOtherStore, canRequestOtherStore, canAllocate, canRequestFloor, canReviewFloor, userId }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { hasModule, isSuperAdmin } = useAuth();
  const api = useMemo(() => salesDraftsApi(token, orgId), [token, orgId]);
  const inventoryApi = useMemo(() => inventoryLocationsApi(token, orgId), [token, orgId]);
  const [otherStoreRequest, setOtherStoreRequest] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [deadlineReviews, setDeadlineReviews] = useState(view === 'DEADLINE_REVIEWS');
  const [reallocationReviews, setReallocationReviews] = useState(view === 'REALLOCATION_REVIEWS');
  const [otherStoreReviews, setOtherStoreReviews] = useState(view === 'OTHER_STORE_REVIEWS');
  const otherStoreApi = useMemo(() => ({
    managerCases: async (...args) => { const response = await api.otherStoreCases(...args); return { ...response, data: {
      ...response.data, items: response.data.items.map(row => ({ ...row, product_name: `Product ${row.product_id} · Store ${row.fulfilment_branch_id}` })),
    } }; },
    reviewPolicyCase: (...args) => api.reviewOtherStore(...args),
    otherStoreExecutionContext: (...args) => api.otherStoreExecutionContext(...args),
    executeOtherStore: (...args) => api.executeOtherStore(...args),
  }), [api]);
  const reviewApi = useMemo(() => ({
    managerCases: async (...args) => { const response = await (reallocationReviews ? api.reallocationCases : deadlineReviews ? api.deadlineCases : api.releaseCases)(...args); return { ...response, data: {
      ...response.data, items: response.data.items.map(row => ({ ...row, product_name: `Reservation ${row.reservation_key}` })),
    } }; },
    reviewPolicyCase: (...args) => (reallocationReviews ? api.reviewReallocation : deadlineReviews ? api.reviewDeadline : api.reviewRelease)(...args),
    scheduleDeadline: (...args) => api.scheduleDeadline(...args),
    executeRelease: (...args) => api.executeRelease(...args),
    reallocationExecutionContext: (...args) => api.reallocationExecutionContext(...args),
    executeReallocation: (...args) => api.executeReallocation(...args),
  }), [api, deadlineReviews, reallocationReviews]);
  const [page, setPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [choosingBranch, setChoosingBranch] = useState(false);
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
  useEffect(() => {
    if (view !== 'DRAFTS' && !reviews && !deadlineReviews && !reallocationReviews && !otherStoreReviews && !localDrafts && !dueInbox && !editing && !selected && !loadingDetail) navigate(SALES_DRAFTS_ROUTE, { replace: true });
  }, [view, reviews, deadlineReviews, reallocationReviews, otherStoreReviews, localDrafts, dueInbox, editing, selected, loadingDetail, navigate]);
  const request = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    request.current?.abort(); request.current = null;
    setSelected(null); setDetailError(''); setLoadingDetail(false); setResult(null); setError('');
    api.list(page, limit, controller.signal, { branch_id: branchFilter?.id, ...(search ? { search } : {}) }).then(({ data }) => { if (live) setResult(data); })
      .catch(failure => { if (live) setError(search && failure.response?.status === 503
        ? 'Sales search is unavailable or out of date. Retry, or clear search to browse saved drafts.'
        : 'Drafts could not be loaded. Check access and refresh to retry.'); });
    return () => { live = false; controller.abort(); request.current?.abort(); };
  }, [api, page, limit, refresh, branchFilter, search]);
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
  const viewAllowed = { DRAFTS: true, LOCAL_DRAFTS: canManage, OVERDUE: canOpenDue, RELEASE_REVIEWS: canOpenReviews,
    DEADLINE_REVIEWS: canOpenDeadlines, REALLOCATION_REVIEWS: canOpenReallocations, OTHER_STORE_REVIEWS: canOpenOtherStore,
    PRICE_FLOOR_REVIEWS: canRequestFloor || canReviewFloor }[view];
  if (!viewAllowed) return <p role="alert" className="p-4">Access to this sales workspace is required.</p>;
  if (view === 'PRICE_FLOOR_REVIEWS') return <PriceFloorCases api={api} userId={userId} canReview={canReviewFloor} />;
  if (choosingBranch) return <DraftSourcePicker title="Filter by selling store" load={api.branches}
    onClose={() => setChoosingBranch(false)} onSelect={choice => { setBranchFilter(choice); setPage(1); setChoosingBranch(false); }} />;
  if (allocation && canAllocate) return <DraftAllocation api={api} inventoryApi={inventoryApi} draft={allocation} onClose={() => { setAllocation(null); open(allocation); }} />;
  if (otherStoreRequest && canOpenOtherStore && canRequestOtherStore) return <OtherStoreRequest api={api} inventoryApi={inventoryApi} draft={otherStoreRequest} onClose={() => setOtherStoreRequest(null)} />;
  if (otherStoreReviews && canOpenOtherStore) return <ManagerCases api={otherStoreApi} userId={userId} canReview={canReviewOtherStore} canActivate={canExecuteOtherStore} otherStore standalone onClose={() => setOtherStoreReviews(false)} />;
  if (reallocationReviews && canOpenReallocations) return <ManagerCases api={reviewApi} userId={userId} canReview={canReviewReallocation} canActivate={canExecuteReallocation} reservationReallocation standalone onClose={() => setReallocationReviews(false)} />;
  if (dueInbox && canOpenDue) return <DraftReservations api={api} dueInbox canRequest={canRequestRelease} canRequestDeadline={canRequestDeadline} canRequestReallocation={canRequestReallocation}
    onClose={() => setDueInbox(false)} onOpenDraft={async row => { if (!await open(row)) throw new Error('Draft not accessible'); setDueInbox(false); }} />;
  if (holds && (canOpenReviews || canOpenDeadlines || canOpenReallocations)) return <DraftReservations api={api} draft={holds} canRequest={canRequestRelease} canRequestDeadline={canRequestDeadline} canRequestReallocation={canRequestReallocation} onClose={() => { setHolds(null); open(holds); }} />;
  if (deadlineReviews && canOpenDeadlines) return <ManagerCases api={reviewApi} userId={userId} canReview={canReviewDeadline} canActivate={canScheduleDeadline} reservationDeadline standalone onClose={() => setDeadlineReviews(false)} />;
  if (reviews && canOpenReviews) return <ManagerCases api={reviewApi} userId={userId} canReview={canReview}
    reservationRelease canActivate={canExecuteRelease} standalone onClose={() => setReviews(false)} />;
  if (localDrafts && canManage) return <LocalSalesDrafts orgId={orgId} userId={userId} onClose={() => setLocalDrafts(false)} onRecover={recovery => { setLocalDrafts(false); setEditing({ recovery }); }} />;
  if (editing && canManage) return <div className={`sales-workspace sales-editor-host ${theme}`}>
    <aside className="sales-editor-register" aria-label="Saved drafts beside editor">
      <div className="p-3 border-b"><h2 className="font-semibold">Sales drafts</h2><p className="text-xs mt-2">Finish or close this draft before opening another.</p></div>
      <div className="overflow-auto min-h-0 flex-1"><SalesDraftRows rows={result?.items || []} compact selectedKey={editing.document_key} loading onOpen={open} theme={theme} /></div>
    </aside>
    <div className="sales-editor-main"><SalesDraftEditor api={api} inventoryApi={isSuperAdmin || hasModule?.('INVENTORY') ? inventoryApi : undefined} orgId={orgId} userId={userId} recovery={editing.recovery} initial={editing === 'NEW' || editing.recovery ? null : editing}
      onClose={() => setEditing(null)} onSaved={receipt => { setSaved(receipt); setEditing(null); setRefresh(n => n + 1); }} /></div>
  </div>;
  return <section className={`sales-workspace ${pageClass}`}>
    <RegisterHeader icon={FileText} title="Sales drafts" description="Draft demand only. Allocation, payment and collection remain separate." actions={<>
      <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
      {canManage && <button type="button" disabled={loadingDetail} className={primaryButtonClass} onClick={() => setEditing('NEW')}>New draft</button>}
    </>} />
    <div className="shrink-0 flex flex-wrap items-center gap-2" aria-label="Sales register filters">
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); setRefresh(n => n + 1); }}>
        <label className="text-xs">Search drafts<input value={searchInput} maxLength={160}
          onChange={event => setSearchInput(event.target.value)} placeholder="Customer name or draft reference"
          className={`block min-h-[44px] rounded-lg border p-2 text-sm ${theme}`} /></label>
        <button type="submit" className={secondaryButtonClass}>Search</button>
        {(search || searchInput) && <button type="button" className={secondaryButtonClass} onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>Clear search</button>}
      </form>
      <Badge tone="amber">Drafts</Badge>
      <button type="button" className={secondaryButtonClass} onClick={() => setChoosingBranch(true)}>
        {branchFilter ? `Store: ${branchFilter.name}` : 'All selling stores'}
      </button>
      {branchFilter && <button type="button" className={secondaryButtonClass} onClick={() => { setBranchFilter(null); setPage(1); }}>Clear store filter</button>}
    </div>
    {saved && <section className="shrink-0 flex flex-wrap gap-3 items-center"><p role="status">Draft version {saved.version} saved. No stock or money posted.{saved.search_indexed === false && ' Search update pending; browse or open the saved draft directly.'}</p><button type="button" className="border rounded p-2" onClick={() => open(saved)}>Open saved draft</button><button type="button" className="border rounded p-2" onClick={() => setSaved(null)}>Dismiss result</button></section>}
    <div className="flex min-h-0 min-w-0 flex-1 gap-3">
    <div className={`${selected ? 'hidden lg:flex sales-register-sidebar lg:flex-none' : 'flex flex-1'} min-h-0 min-w-0 flex-col gap-3`}>
    <div className={cardClass}>
      {loadingDetail && <p role="status" className="p-3">Opening draft…</p>}
      {detailError && <p role="alert" className="p-3">{detailError}</p>}
      {error ? <p role="alert" className="p-4">{error}</p> : !result ? <p role="status" className="p-4">Loading drafts…</p> : !result.items.length ? <p className="p-4">{search ? 'No matching sales drafts. Recently saved drafts may await search indexing.' : 'No saved sales drafts in this company.'}</p> :
        <SalesDraftRows rows={result.items} selectedKey={selected?.document_key} loading={loadingDetail} onOpen={open} theme={theme} />}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={result?.pages || 1} totalCount={result?.total || 0}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
    </div>
    {selected && <SalesDraftDetails key={selected.document_key} draft={selected} api={api} onClose={() => setSelected(null)}
      onEdit={canManage ? () => setEditing(selected) : undefined}
      onAllocate={canAllocate ? () => setAllocation(selected) : undefined}
      onOtherStore={canOpenOtherStore && canRequestOtherStore ? () => setOtherStoreRequest(selected) : undefined}
      canRequestFloor={canRequestFloor}
      canPreparePricing={canManage}
      onReservations={canOpenReviews || canOpenDeadlines || canOpenReallocations ? () => setHolds(selected) : undefined} />}
    </div>
  </section>;
}
