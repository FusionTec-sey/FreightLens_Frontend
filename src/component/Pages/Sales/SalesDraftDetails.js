import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, secondaryButtonClass, primaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import SalesProductImage from './SalesProductImage';
import SalesDraftHistory from './SalesDraftHistory';
import SalesDraftSummary from './SalesDraftSummary';
import SalesCheckoutPanel from './SalesCheckoutPanel';
import SalesReturnPanel from './SalesReturnPanel';
import SalesCollectionPanel from './SalesCollectionPanel';
import SalesInvoicePrintPanel from './SalesInvoicePrintPanel';

// Read-only document inspection. Only explicit action buttons invoke workflows.
const operationKey = () => window.crypto?.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

export default function SalesDraftDetails({ draft, api, orgId, userId, onClose, onEdit, onCopy, onAllocate, onOtherStore, onReservations, canRequestFloor = false, canPreparePricing = false, canPostSale = false, canRecordCard = false, canCollect = false, canPrint = false, canResolvePrint = false, canRequestReturn = false, canReviewReturn = false, canProcessReturn = false, canRequestCondition = false }) {
  const [panel, setPanel] = useState('items');
  const [pricing, setPricing] = useState(null);
  const [pricingError, setPricingError] = useState('');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingRefresh, setPricingRefresh] = useState(0);
  const [floorRequest, setFloorRequest] = useState(null);
  const [floorResult, setFloorResult] = useState(null);
  const [preparedPricing, setPreparedPricing] = useState(null);
  const [preparedPricingError, setPreparedPricingError] = useState('');
  const [prepareRequest, setPrepareRequest] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [returnInvoiceError, setReturnInvoiceError] = useState('');
  const [returnInvoiceLoading, setReturnInvoiceLoading] = useState(false);
  const [postedSaleView, setPostedSaleView] = useState(null);
  const [postedSaleLoading, setPostedSaleLoading] = useState(false);
  const [postedSaleError, setPostedSaleError] = useState('');
  const postedSaleRequest = useRef(null);
  useEffect(() => () => postedSaleRequest.current?.abort(), []);
  useEffect(() => {
    if (!api?.pricingPreview) return undefined;
    const controller = new AbortController(); let live = true;
    setPricing(null); setPricingError(''); setPricingLoading(true);
    api.pricingPreview(draft.document_key, controller.signal).then(({ data }) => {
      if (!live) return;
      if (String(data.document_key) !== String(draft.document_key) || data.draft_version !== draft.version) throw new Error('Pricing preview does not match this draft revision.');
      setPricing(data);
    }).catch(failure => {
      if (!live || controller.signal.aborted) return;
      setPricingError(failure.response?.data?.detail || failure.message || 'Pricing preview is unavailable.');
    }).finally(() => { if (live) setPricingLoading(false); });
    return () => { live = false; controller.abort(); };
  }, [api, draft.document_key, draft.version, pricingRefresh]);
  useEffect(() => {
    if (!api?.latestPricingSnapshot) return undefined;
    const controller = new AbortController(); let live = true;
    setPreparedPricing(null); setPreparedPricingError(''); setPrepareRequest(null);
    api.latestPricingSnapshot(draft.document_key, draft.version, controller.signal)
      .then(({ data }) => { if (live) setPreparedPricing(data); })
      .catch(failure => {
        if (!live || controller.signal.aborted || failure.response?.status === 404) return;
        setPreparedPricingError(failure.response?.data?.detail || 'Prepared pricing could not be loaded.');
      });
    return () => { live = false; controller.abort(); };
  }, [api, draft.document_key, draft.version]);
  const pricingByLine = useMemo(() => new Map((pricing?.lines || []).map(line => [String(line.line_key), line])), [pricing]);
  async function requestFloor(event) {
    event.preventDefault();
    setFloorRequest(current => ({ ...current, saving: true, error: '' }));
    try {
      const { data } = await api.requestFloorCase({ operation_key: floorRequest.operation_key,
        document_key: draft.document_key, expected_draft_version: draft.version,
        reason: floorRequest.reason });
      setFloorResult(data); setFloorRequest(null);
    } catch (failure) {
      setFloorRequest(current => ({ ...current, saving: false,
        error: failure.response?.data?.detail || 'The review request could not be confirmed. Keep it open and retry.' }));
    }
  }
  async function prepareExactPricing(event) {
    event.preventDefault();
    setPrepareRequest(current => ({ ...current, saving: true, error: '' }));
    try {
      const { data } = await api.preparePricingSnapshot(draft.document_key, {
        operation_key: prepareRequest.operation_key,
        expected_draft_version: draft.version,
        floor_case_key: pricing.requires_floor_approval ? prepareRequest.floor_case_key.trim() : null,
      });
      setPreparedPricing(data); setPrepareRequest(null); setPreparedPricingError('');
    } catch (failure) {
      setPrepareRequest(current => ({ ...current, saving: false,
        error: failure.response?.data?.detail || 'Exact pricing could not be prepared. Keep this form open and retry.' }));
    }
  }
  const openReturns = async () => {
    if (returnInvoiceLoading) return;
    setReturnInvoiceLoading(true); setReturnInvoiceError('');
    try {
      const { data } = await api.postedInvoice(draft.document_key, draft.version);
      if (String(data.document_key) !== String(draft.document_key) || data.draft_version !== draft.version) throw new Error('Posted invoice does not match this sale revision.');
      setReturnInvoice(data);
    } catch (failure) {
      const value = failure.response?.data?.detail;
      setReturnInvoiceError(typeof value === 'string' ? value : value?.message || failure.message || 'Posted invoice could not be opened for returns.');
    } finally { setReturnInvoiceLoading(false); }
  };
  const openPostedSale = async kind => {
    if (postedSaleLoading) return;
    postedSaleRequest.current?.abort();
    const request = new AbortController(); postedSaleRequest.current = request;
    setPostedSaleLoading(true); setPostedSaleError('');
    try {
      const { data: reference } = await api.postedInvoiceReference(draft.document_key, draft.version, request.signal);
      if (String(reference.document_key) !== String(draft.document_key) || reference.draft_version !== draft.version || !reference.invoice_key) {
        throw new Error('Posted invoice reference does not match this sale revision.');
      }
      const { data: invoice } = await api.readInvoice(reference.invoice_key, request.signal);
      if (String(invoice.invoice_key) !== String(reference.invoice_key) || String(invoice.document_key) !== String(draft.document_key) || invoice.draft_version !== draft.version) {
        throw new Error('Posted invoice does not match this sale revision.');
      }
      if (!request.signal.aborted) setPostedSaleView({ kind, invoice });
    } catch (failure) {
      if (!request.signal.aborted) {
        const detail = failure.response?.data?.detail;
        setPostedSaleError(failure.response?.status === 404
          ? 'No posted invoice exists for this draft revision.'
          : typeof detail === 'string' ? detail : detail?.message || failure.message || 'Posted invoice could not be opened.');
      }
    } finally { if (!request.signal.aborted) setPostedSaleLoading(false); }
  };
  if (postedSaleView?.kind === 'collection') return <SalesCollectionPanel api={api} invoice={postedSaleView.invoice}
    customerName={draft.customer_name || 'Customer'} onClose={() => setPostedSaleView(null)} />;
  if (postedSaleView?.kind === 'print') return <SalesInvoicePrintPanel api={api} invoice={postedSaleView.invoice}
    canResolve={canResolvePrint} onClose={() => setPostedSaleView(null)} />;
  if (returnInvoice) return <SalesReturnPanel api={api} invoice={returnInvoice} orgId={orgId} userId={userId}
    canRequest={canRequestReturn} canReview={canReviewReturn} canProcess={canProcessReturn}
    canRequestCondition={canRequestCondition}
    onClose={() => setReturnInvoice(null)} />;
  if (checkout && preparedPricing) return <SalesCheckoutPanel api={api} draft={draft}
    pricing={preparedPricing} orgId={orgId} userId={userId} canRecordCard={canRecordCard} canCollect={canCollect}
    canPrint={canPrint} canResolvePrint={canResolvePrint}
    canRequestReturn={canRequestReturn} canReviewReturn={canReviewReturn} canProcessReturn={canProcessReturn}
    canRequestCondition={canRequestCondition}
    onClose={() => setCheckout(false)} />;
  return <section aria-label="Sales draft details" className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 className="text-lg font-semibold">Draft version {draft.version}</h2><Badge tone="amber">Draft — not an invoice</Badge></div>
      <button type="button" className={secondaryButtonClass} onClick={onClose}>Close details</button>
    </header>
    {api && <nav aria-label="Draft detail views" className="shrink-0 flex gap-2 border-b border-slate-200 p-3 dark:border-slate-700">
      <button type="button" aria-pressed={panel === 'items'} className={secondaryButtonClass} onClick={() => setPanel('items')}>Items</button>
      <button type="button" aria-pressed={panel === 'history'} className={secondaryButtonClass} onClick={() => setPanel('history')}>Revision history</button>
    </nav>}
    {panel === 'history' && api ? <SalesDraftHistory key={draft.document_key} api={api} documentKey={draft.document_key} /> :
    <div className="min-h-0 flex-1 overflow-auto p-4 space-y-4">
      <dl aria-label="Draft identity" className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-800">
        <div><dt className="text-xs text-slate-500 dark:text-slate-400">Customer — saved profile v{draft.expected_customer_version}</dt>
          <dd className="font-semibold">{draft.customer_name || 'Customer name unavailable'}</dd>
          <dd className="break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">{draft.customer_key}</dd></div>
        <div><dt className="text-xs text-slate-500 dark:text-slate-400">Selling branch — current label</dt><dd>{draft.branch_name || `Branch ${draft.branch_id}`}</dd>
          {draft.branch_name && <dd className="text-xs text-slate-500 dark:text-slate-400">Branch reference {draft.branch_id}</dd>}</div>
        <div><dt className="text-xs text-slate-500 dark:text-slate-400">This revision saved by</dt><dd>{draft.created_by ? `Staff reference ${draft.created_by}` : 'Staff reference unavailable'}</dd></div>
        <div><dt className="text-xs text-slate-500 dark:text-slate-400">Saved at</dt><dd>{draft.created_at ? <time dateTime={draft.created_at}>{new Date(draft.created_at).toLocaleString()}</time> : 'Save time unavailable'}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-slate-500 dark:text-slate-400">Exact draft reference</dt><dd className="break-all font-mono text-xs">{draft.document_key}</dd></div>
        {draft.source_reference && <div className="sm:col-span-2"><dt className="text-xs text-slate-500 dark:text-slate-400">Copied from — server-confirmed source</dt><dd className="break-all font-mono text-xs">{draft.source_reference.document_key} v{draft.source_reference.version}</dd></div>}
      </dl>
      <section aria-label="Document status" className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Demand</p><p className="font-medium">Draft v{draft.version}</p></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Reservations</p><p className="font-medium">Per line below</p></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Payment</p><p className="font-medium">Not recorded</p></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Collection</p><p className="font-medium">Not authorised</p></div>
        <p className="col-span-2 text-xs text-slate-500 dark:text-slate-400 lg:col-span-4">Reservations do not prove payment or handover.</p>
      </section>
      <h3 className="font-semibold">Items</h3>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">{draft.lines.map(line => { const priced = pricingByLine.get(String(line.line_key)); return <li key={line.line_key} className="py-3">
        <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3">
          <SalesProductImage source={line} />
          <div className="min-w-0"><p className="font-medium break-words">{line.product_name || `Product ${line.product_id}`}</p><p className="font-mono text-xs text-slate-500 dark:text-slate-400">{line.sku || 'No SKU'}</p></div>
          <p className="whitespace-nowrap font-semibold">{line.quantity} {line.unit}</p>
        </div>
        <p className="mt-2 text-sm">Reserved: {line.reserved_quantity || '0'} {line.base_unit}</p>
        {priced && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p><span className="text-slate-500 dark:text-slate-400">Unit price</span> <strong>SCR {priced.gross_unit_scr}</strong> <span className="text-xs">({priced.selected_source === 'CUSTOMER_AGREEMENT' ? 'customer agreement' : 'store price'})</span></p>
          <p className="font-semibold">Line total SCR {priced.gross_scr}</p>
          <p className="basis-full text-xs text-slate-500 dark:text-slate-400">{priced.tax_treatment.replaceAll('_', ' ')} · {priced.tax_code} v{priced.tax_version} · included tax SCR {priced.tax_scr}{priced.requires_floor_approval ? ' · approval required' : ''}</p>
        </div>}
        <details className="mt-1 text-xs text-slate-500 dark:text-slate-400"><summary className="cursor-pointer py-2">Unit and policy details</summary>
          Base quantity {line.base_quantity} {line.base_unit} · Policy v{line.expected_policy_version}
        </details>
      </li>; })}</ul>
      <SalesDraftSummary pricing={pricing} loading={pricingLoading} error={pricingError} onRetry={api?.pricingPreview ? () => setPricingRefresh(value => value + 1) : undefined} />
      {preparedPricing && <section className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"><p role="status" className="font-semibold">Exact pricing prepared for draft v{preparedPricing.draft_version}</p><p>SCR {preparedPricing.gross_total_scr} · fingerprint <span className="break-all font-mono text-xs">{preparedPricing.pricing_fingerprint}</span></p><p className="mt-1 text-xs">This is an immutable future posting input. No invoice, payment, stock movement or collection authority was created.</p></section>}
      {preparedPricingError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{preparedPricingError}</p>}
      {returnInvoiceError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{returnInvoiceError}</p>}
      {postedSaleError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{postedSaleError}</p>}
      {floorResult && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><p role="status">Price-floor review requested. No sale, payment or stock movement was posted.</p><p className="mt-1 break-all font-mono text-xs">Case {floorResult.case_key}</p><button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setFloorResult(null)}>Dismiss result</button></section>}
      {floorRequest && <form onSubmit={requestFloor} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30"><label className="block text-xs font-semibold">Reason for manager review<textarea autoFocus required maxLength="1000" className="mt-1 block min-h-[80px] w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={floorRequest.reason} onChange={e => setFloorRequest(current => ({ ...current, reason: e.target.value }))} /></label>{floorRequest.error && <p role="alert" className="mt-2 text-rose-700 dark:text-rose-300">{floorRequest.error}</p>}<div className="mt-2 flex gap-2"><button type="submit" disabled={floorRequest.saving} className={primaryButtonClass}>{floorRequest.saving ? 'Requesting…' : 'Request exact review'}</button><button type="button" disabled={floorRequest.saving} className={secondaryButtonClass} onClick={() => setFloorRequest(null)}>Cancel</button></div></form>}
      {prepareRequest && <form onSubmit={prepareExactPricing} className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/30"><h3 className="font-semibold">Prepare immutable pricing</h3>{pricing?.requires_floor_approval && <label className="mt-2 block text-xs font-semibold">Approved price-floor case<input autoFocus required className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={prepareRequest.floor_case_key} onChange={e => setPrepareRequest(current => ({ ...current, floor_case_key: e.target.value }))} placeholder="Paste the approved case UUID" /></label>}<p className="mt-2 text-xs">Preparation freezes these exact price and tax versions for future posting. It does not post the sale or consume an approval.</p>{prepareRequest.error && <p role="alert" className="mt-2 text-rose-700 dark:text-rose-300">{prepareRequest.error}</p>}<div className="mt-2 flex gap-2"><button type="submit" disabled={prepareRequest.saving} className={primaryButtonClass}>{prepareRequest.saving ? 'Preparing…' : 'Prepare exact pricing'}</button><button type="button" disabled={prepareRequest.saving} className={secondaryButtonClass} onClick={() => setPrepareRequest(null)}>Cancel</button></div></form>}
    </div>}
    {panel === 'items' && <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
      {onEdit && <button type="button" className={primaryButtonClass} onClick={onEdit}>Edit draft</button>}
      {onCopy && <button type="button" className={secondaryButtonClass} onClick={onCopy}>Copy into new draft</button>}
      {onReservations && <button type="button" className={secondaryButtonClass} onClick={onReservations}>Reserved stock</button>}
      {onAllocate && <button type="button" className={secondaryButtonClass} onClick={onAllocate}>Allocate same-store stock</button>}
      {onOtherStore && <button type="button" className={secondaryButtonClass} onClick={onOtherStore}>Request other-store stock</button>}
      {canRequestFloor && pricing?.requires_floor_approval && !floorRequest && !floorResult && <button type="button" className={secondaryButtonClass} onClick={() => setFloorRequest({ operation_key: operationKey(), reason: '', saving: false, error: '' })}>Request price-floor review</button>}
      {canPreparePricing && pricing && !preparedPricing && !prepareRequest && <button type="button" className={secondaryButtonClass} onClick={() => setPrepareRequest({ operation_key: operationKey(), floor_case_key: floorResult?.case_key || '', saving: false, error: '' })}>Prepare exact pricing</button>}
      {canPostSale && preparedPricing && <button type="button" className={primaryButtonClass} onClick={() => setCheckout(true)}>Continue to payment</button>}
      {canCollect && <button type="button" disabled={postedSaleLoading} className={secondaryButtonClass} onClick={() => openPostedSale('collection')}>{postedSaleLoading ? 'Opening posted invoice…' : 'Open collection'}</button>}
      {canPrint && <button type="button" disabled={postedSaleLoading} className={secondaryButtonClass} onClick={() => openPostedSale('print')}>{postedSaleLoading ? 'Opening posted invoice…' : 'Invoice & printing'}</button>}
      {(canRequestReturn || canReviewReturn || canProcessReturn || canRequestCondition) && <button type="button" disabled={returnInvoiceLoading} className={secondaryButtonClass} onClick={openReturns}>{returnInvoiceLoading ? 'Opening returns…' : 'Returns & credit notes'}</button>}
    </footer>}
  </section>;
}
