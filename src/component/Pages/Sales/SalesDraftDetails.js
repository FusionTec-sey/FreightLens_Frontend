import React, { useState } from 'react';
import { Badge, secondaryButtonClass, primaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import SalesProductImage from './SalesProductImage';
import SalesDraftHistory from './SalesDraftHistory';
import SalesDraftSummary from './SalesDraftSummary';

// Read-only document inspection. Only explicit action buttons invoke workflows.
export default function SalesDraftDetails({ draft, api, onClose, onEdit, onAllocate, onOtherStore, onReservations }) {
  const [panel, setPanel] = useState('items');
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
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-xs text-slate-500 dark:text-slate-400">Draft reference</dt><dd className="break-all font-mono">{draft.document_key}</dd></div>
        <div><dt className="text-xs text-slate-500 dark:text-slate-400">Customer — saved profile v{draft.expected_customer_version}</dt>
          <dd>{draft.customer_name || 'Customer name unavailable'}</dd>
          <dd className="break-all font-mono text-xs">{draft.customer_key}</dd></div>
        <div><dt className="text-xs text-slate-500 dark:text-slate-400">Selling branch</dt><dd>{draft.branch_id}</dd></div>
      </dl>
      <section aria-label="Document status" className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
        <p>Payment: not recorded by this draft.</p>
        <p>Collection: not authorised by this draft.</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reservations are shown per item and do not prove payment or handover.</p>
      </section>
      <h3 className="font-semibold">Items</h3>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">{draft.lines.map(line => <li key={line.line_key} className="py-3">
        <div className="flex flex-wrap justify-between gap-2">
          <SalesProductImage source={line} />
          <div className="min-w-0"><p className="font-medium break-words">{line.product_name || `Product ${line.product_id}`}</p><p className="font-mono text-xs text-slate-500 dark:text-slate-400">{line.sku || 'No SKU'}</p></div>
          <p className="font-semibold">{line.quantity} {line.unit}</p>
        </div>
        <p className="mt-2 text-sm">Reserved: {line.reserved_quantity || '0'} {line.base_unit}</p>
        <details className="mt-1 text-xs text-slate-500 dark:text-slate-400"><summary className="cursor-pointer py-2">Unit and policy details</summary>
          Base quantity {line.base_quantity} {line.base_unit} · Policy v{line.expected_policy_version}
        </details>
      </li>)}</ul>
      <SalesDraftSummary />
    </div>}
    <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
      {onEdit && <button type="button" className={primaryButtonClass} onClick={onEdit}>Edit draft</button>}
      {onReservations && <button type="button" className={secondaryButtonClass} onClick={onReservations}>Reserved stock</button>}
      {onAllocate && <button type="button" className={secondaryButtonClass} onClick={onAllocate}>Allocate same-store stock</button>}
      {onOtherStore && <button type="button" className={secondaryButtonClass} onClick={onOtherStore}>Request other-store stock</button>}
    </footer>
  </section>;
}
