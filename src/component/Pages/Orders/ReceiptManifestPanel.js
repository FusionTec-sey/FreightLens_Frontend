import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { receiptManifestsApi } from '../../../services/receiptManifestsApi';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import { secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import useOperationIntent from '../../../hooks/useOperationIntent';
import ReceiptManifestEditor from './ReceiptManifestEditor';
import ReceiptCostReviewControls from './ReceiptCostReviewControls';

export default function ReceiptManifestPanel({ receipt, receiptId = receipt?.id, isDark = false }) {
  const { token, selectedOrgId, orgId, userId, permissions = [], isSuperAdmin, hasModule } = useAuth();
  const company = selectedOrgId || orgId;
  const allowed = isSuperAdmin || (hasModule?.('INVENTORY') && hasModule?.('ORDERS') &&
    ['View_Product', 'View_GoodsReceipt'].every(p => permissions.includes(p)));
  if (!allowed) return null;
  if (!token || !company) return <p role="alert">Select a company and sign in to inspect physical manifests.</p>;
  return <ManifestBrowser key={`${company}:${token}:${receiptId}`} token={token} orgId={company} receiptId={receiptId} isDark={isDark}
    receipt={receipt} canCreate={isSuperAdmin || permissions.includes('Verify_Receipt')}
    userId={userId} canRequest={isSuperAdmin || permissions.includes('Request_InventoryReview')}
    canReview={isSuperAdmin || permissions.includes('Review_InventoryPolicy')}
    canRequestCost={isSuperAdmin || permissions.includes('Request_ReceiptCostReview')}
    canReviewCost={isSuperAdmin || permissions.includes('Review_ReceiptCostReview')} />;
}

export function ManifestBrowser({ token, orgId, receiptId, receipt, suppliedApi, suppliedInventoryApi, isDark = false,
  userId, canCreate = false, canRequest = false, canReview = false, canRequestCost = false, canReviewCost = false }) {
  const api = useMemo(() => suppliedApi || receiptManifestsApi(token, orgId), [suppliedApi, token, orgId]);
  const [open, setOpen] = useState(false), [page, setPage] = useState(1), [limit, setLimit] = useState(10);
  const [refresh, setRefresh] = useState(0), [rows, setRows] = useState([]), [total, setTotal] = useState(0), [pages, setPages] = useState(1);
  const [key, setKey] = useState(null), [detail, setDetail] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [reviewDirty, setReviewDirty] = useState(false), [reviewBusy, setReviewBusy] = useState(false);
  const [editing, setEditing] = useState(false), [editorDirty, setEditorDirty] = useState(false), [editorBusy, setEditorBusy] = useState(false);
  const [costDirty, setCostDirty] = useState(false), [costBusy, setCostBusy] = useState(false);
  const protectedWork = reviewDirty || reviewBusy || editorDirty || editorBusy || costDirty || costBusy;
  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setBusy(true); setError(''); setRows([]); setDetail(null);
    const request = key ? api.read(key, controller.signal) : api.list(receiptId, page, limit, controller.signal);
    request.then(({ data }) => {
      if (controller.signal.aborted) return;
      if (key) {
        if (data.manifest_key !== key || data.receipt_id !== receiptId || data.historical_snapshot !== true || data.physical_posting_enabled !== false) throw new Error('Unexpected manifest response. Retry from the receipt.');
        setDetail(data);
      } else {
        if (!Array.isArray(data.items) || data.items.some(row => row.receipt_id !== receiptId)) throw new Error('Unexpected receipt manifest list.');
        setRows(data.items); setTotal(data.total); setPages(data.pages);
      }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.response?.data?.detail || failure.message || 'Manifest read failed.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [api, receiptId, page, limit, refresh, key, open]);
  return <section aria-label="Physical receipt manifests" className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
    <button type="button" disabled={open && protectedWork} className={secondaryButtonClass} onClick={() => setOpen(value => !value)}>{open ? 'Hide physical manifests' : 'Inspect physical manifests'}</button>
    {open && <>
      <p className="text-sm">Saved classifications only—not stock receipts, approvals or valuation. Purchasing receipt totals remain separate.</p>
      {protectedWork && <p role="status">Finish or discard the current classification or review entry before leaving.</p>}
      <div className="flex flex-wrap gap-2">{key && <button type="button" disabled={protectedWork} className={secondaryButtonClass} onClick={() => setKey(null)}>Back to manifests</button>}
        <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => setRefresh(value => value + 1)}>Refresh manifests</button></div>
      {canCreate && receipt && !editing && <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>Classify received stock</button>}
      {editing && <ReceiptManifestEditor receipt={receipt} token={token} orgId={orgId} api={api} suppliedInventoryApi={suppliedInventoryApi}
        isDark={isDark} onDirtyChange={setEditorDirty} onBusyChange={setEditorBusy}
        onSaved={() => { setRefresh(value => value + 1); }} onClose={() => setEditing(false)} />}
      {busy && <p role="status">Loading physical manifests…</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !key && <>
        {!rows.length && <p>No saved physical manifests on this page.</p>}
        <ul className="space-y-2">{rows.map(row => <li key={row.manifest_key} className="rounded border p-3 text-sm">
          <p>Product {row.product_id} · Receipt line {row.receipt_item_id}</p>
          <p>Branch {row.branch_id} · Location {row.location_id} · Saved—not posted</p>
          <button type="button" className={`${secondaryButtonClass} max-w-full break-all whitespace-normal`} onClick={() => setKey(row.manifest_key)}>Inspect {row.manifest_key}</button>
        </li>)}</ul>
        <div className="overflow-x-auto"><PaginationToolbar isDark={isDark} page={page} pageSize={limit} totalPages={pages} totalCount={total} onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} /></div>
      </>}
      {!busy && !error && detail && <div className="space-y-2 text-sm">
        <p className="break-all font-mono">{detail.manifest_key}</p><p>{detail.manifest.reason}</p>
        <p>Historical policy v{detail.source.policy_version} · {detail.source.policy.tracking}</p>
        <dl>{Object.entries(detail.quantities).map(([name, value]) => <div key={name} className="flex justify-between gap-2"><dt>{name}</dt><dd>{value} {detail.source.base_unit}</dd></div>)}</dl>
        <p>{detail.condition_review_required ? 'Condition review required by this saved source.' : 'No condition discrepancy recorded in this snapshot.'} This is not a current approval status.</p>
        {(detail.manifest.batches || []).map(batch => <p key={batch.identity.batch_key}>Batch {batch.identity.code} · {batch.on_hand} on hand · {batch.damaged} damaged · {batch.quarantined} quarantined</p>)}
        {(detail.manifest.serials?.items || []).map(serial => <p key={serial.serial_key}>{serial.serial_number} · {serial.condition}</p>)}
        {(canRequest || canReview) && <ManifestReviewControls api={api} manifestKey={detail.manifest_key} userId={userId}
          canRequest={canRequest} canReview={canReview} isDark={isDark} onDirtyChange={setReviewDirty} onBusyChange={setReviewBusy} />}
        {(canRequestCost || canReviewCost) && <ReceiptCostReviewControls api={api} manifestKey={detail.manifest_key} userId={userId}
          canRequest={canRequestCost} canReview={canReviewCost} isDark={isDark} onDirtyChange={setCostDirty} onBusyChange={setCostBusy} />}
      </div>}
    </>}
  </section>;
}

export function ManifestReviewControls({ api, manifestKey, userId, canRequest, canReview, isDark, onDirtyChange, onBusyChange }) {
  const [view, setView] = useState(canReview ? 'NEEDS_MY_REVIEW' : 'MY_REQUESTS');
  const [page, setPage] = useState(1), [rows, setRows] = useState([]), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [reason, setReason] = useState(''), [decision, setDecision] = useState(null), [decisionReason, setDecisionReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0), [saved, setSaved] = useState('');
  const requestIntent = useOperationIntent(), decisionIntent = useOperationIntent();
  const action = useRef(null);
  const dirty = Boolean(reason.trim() || decision || decisionReason.trim());
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { action.current?.abort(); onBusyChange?.(false); onDirtyChange?.(false); }, [onBusyChange, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setRows([]);
    api.cases(manifestKey, page, 10, view, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.items) || data.items.some(row => row.manifest_key !== manifestKey)) throw new Error('Unexpected review-case response.');
      setRows(data.items); setPages(data.pages); setTotal(data.total);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.response?.data?.detail || failure.message || 'Review cases could not be loaded.'); });
    return () => controller.abort();
  }, [api, manifestKey, page, view, refresh]);
  async function submitRequest() {
    if (busy || !canRequest || !reason.trim()) return;
    action.current?.abort(); action.current = new AbortController();
    setBusy(true); setError(''); setSaved('');
    try {
      const payload = requestIntent.payloadFor(['receipt-manifest-review', manifestKey], { reason: reason.trim() });
      const { data } = await api.requestReview(manifestKey, payload, action.current.signal);
      if (!action.current.signal.aborted) { setSaved(`Review requested: ${data.case_key}`); setReason(''); setRefresh(value => value + 1); }
    } catch (failure) { if (!action.current.signal.aborted) setError(failure.response?.data?.detail || failure.message || 'Review request failed.'); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  async function submitDecision() {
    if (busy || !canReview || !decision || !decisionReason.trim()) return;
    action.current?.abort(); action.current = new AbortController();
    setBusy(true); setError(''); setSaved('');
    try {
      const payload = decisionIntent.payloadFor(['receipt-manifest-decision', manifestKey, decision.case_key], {
        expected_version: 1, outcome: decision.outcome, reason: decisionReason.trim(),
      });
      const { data } = await api.review(manifestKey, decision.case_key, payload, action.current.signal);
      if (!action.current.signal.aborted) { setSaved(`Classification ${data.status.toLowerCase()}. No stock or value was posted.`);
        setDecision(null); setDecisionReason(''); setRefresh(value => value + 1); }
    } catch (failure) { if (!action.current.signal.aborted) setError(failure.response?.data?.detail || failure.message || 'Review decision failed.'); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  return <section aria-label="Receipt classification review" className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
    <div><h3 className="font-semibold">Classification review</h3><p>Review binds this saved manifest. Approval does not receive stock, post cost or permit collection.</p></div>
    <div className="flex flex-wrap gap-2">
      {canReview && <button type="button" className={secondaryButtonClass} aria-pressed={view === 'NEEDS_MY_REVIEW'} onClick={() => { setView('NEEDS_MY_REVIEW'); setPage(1); }}>Needs my review</button>}
      <button type="button" className={secondaryButtonClass} aria-pressed={view === 'MY_REQUESTS'} onClick={() => { setView('MY_REQUESTS'); setPage(1); }}>My requests</button>
      <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => setRefresh(value => value + 1)}>Refresh review cases</button>
    </div>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">{saved}</p>}
    {canRequest && <div className="space-y-2"><label className="block">Review request reason<textarea value={reason} disabled={busy} maxLength={1000} onChange={event => setReason(event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
      <button type="button" disabled={busy || !reason.trim()} className={secondaryButtonClass} onClick={submitRequest}>{busy ? 'Working…' : 'Request classification review'}</button></div>}
    {!rows.length && !error && <p>No classification review cases in this view.</p>}
    <ul className="space-y-2">{rows.map(row => <li key={row.case_key} className="rounded border p-2">
      <p>{row.status} · Requested by staff {row.requestor_id}</p><p>{row.reason}</p>
      {canReview && row.status === 'REQUESTED' && row.requestor_id !== userId && <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => setDecision({ case_key: row.case_key, outcome: 'APPROVED' })}>Approve classification</button>
        <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => setDecision({ case_key: row.case_key, outcome: 'REJECTED' })}>Reject classification</button>
      </div>}
    </li>)}</ul>
    {decision && <div className="space-y-2 rounded border p-2"><p>{decision.outcome === 'APPROVED' ? 'Approve' : 'Reject'} this exact saved classification?</p>
      <label className="block">Decision reason<textarea value={decisionReason} disabled={busy} maxLength={1000} onChange={event => setDecisionReason(event.target.value)} className="block w-full rounded border p-2 dark:bg-slate-900" /></label>
      <button type="button" disabled={busy || !decisionReason.trim()} className={secondaryButtonClass} onClick={submitDecision}>Confirm {decision.outcome.toLowerCase()}</button>
      <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => { setDecision(null); setDecisionReason(''); }}>Cancel decision</button></div>}
    {dirty && <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => { setReason(''); setDecision(null); setDecisionReason(''); }}>Discard review entry</button>}
    <PaginationToolbar isDark={isDark} page={page} pageSize={10} totalPages={pages} totalCount={total} onPageChange={setPage} />
  </section>;
}
